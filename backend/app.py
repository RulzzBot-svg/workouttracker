import os
import json
from functools import wraps

import bcrypt
import jwt
import psycopg2.extras
from dotenv import load_dotenv
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from db import get_conn, put_conn

load_dotenv()

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is not set")

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per 15 minutes"],
    storage_uri="memory://",
)

# ─────────────────────────────────────────────
# DB helper
# ─────────────────────────────────────────────

def with_db(fn):
    """Decorator: opens a DB connection for the request and ensures it is
    returned to the pool when the request finishes."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        conn = get_conn()
        try:
            g.conn = conn
            return fn(*args, **kwargs)
        finally:
            put_conn(conn)
    return wrapper


def run_schema():
    """Apply schema migrations (idempotent CREATE TABLE IF NOT EXISTS)."""
    schema_path = os.path.join(os.path.dirname(__file__), "..", "server", "schema.sql")
    with open(schema_path) as f:
        sql = f.read()
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    finally:
        put_conn(conn)


# ─────────────────────────────────────────────
# JWT helpers
# ─────────────────────────────────────────────

def create_token(user_id: int) -> str:
    return jwt.encode({"sub": user_id}, SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])


def require_auth(fn):
    """Decorator: validates Bearer token and stores user_id in g.user_id."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        try:
            payload = decode_token(auth.split(" ", 1)[1])
            g.user_id = payload["sub"]
        except jwt.PyJWTError:
            return jsonify({"error": "Invalid or expired token"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

@app.get("/api/health")
def health():
    return jsonify({"ok": True})


# ─────────────────────────────────────────────
# Auth – Register / Login
# ─────────────────────────────────────────────

@app.post("/api/auth/register")
@limiter.limit("10 per minute")
@with_db
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "username, email and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    try:
        with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO users (username, email, password_hash)
                   VALUES (%s, %s, %s) RETURNING id, username, email, created_at""",
                (username, email, pw_hash),
            )
            user = cur.fetchone()
        g.conn.commit()
    except psycopg2.errors.UniqueViolation:
        g.conn.rollback()
        return jsonify({"error": "Username or email already in use"}), 409

    token = create_token(user["id"])
    return jsonify({"token": token, "user": dict(user)}), 201


@app.post("/api/auth/login")
@limiter.limit("20 per minute")
@with_db
def login():
    data = request.get_json(silent=True) or {}
    login_val = (data.get("email") or data.get("username") or "").strip().lower()
    password = data.get("password") or ""

    if not login_val or not password:
        return jsonify({"error": "email/username and password are required"}), 400

    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM users WHERE LOWER(email) = %s OR LOWER(username) = %s",
            (login_val, login_val),
        )
        user = cur.fetchone()

    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(user["id"])
    return jsonify({
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "created_at": str(user["created_at"]),
        },
    })


@app.get("/api/auth/me")
@require_auth
@with_db
def me():
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, username, email, created_at FROM users WHERE id = %s",
            (g.user_id,),
        )
        user = cur.fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(dict(user))


# ─────────────────────────────────────────────
# Workout History
# ─────────────────────────────────────────────

@app.get("/api/history")
@require_auth
@with_db
def get_history():
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM workout_history WHERE user_id = %s ORDER BY logged_at DESC",
            (g.user_id,),
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@app.post("/api/history")
@require_auth
@with_db
def create_history():
    data = request.get_json(silent=True) or {}
    exercise_name = (data.get("exercise_name") or "").strip()
    sets = data.get("sets")
    reps = data.get("reps")

    if not exercise_name or sets is None or reps is None:
        return jsonify({"error": "exercise_name, sets and reps are required"}), 400

    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """INSERT INTO workout_history (user_id, exercise_name, category, sets, reps, weight, note)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING *""",
            (
                g.user_id,
                exercise_name,
                data.get("category") or "Other",
                int(sets),
                int(reps),
                data.get("weight"),
                data.get("note"),
            ),
        )
        row = cur.fetchone()
    g.conn.commit()
    return jsonify(dict(row)), 201


# ─────────────────────────────────────────────
# Workout Splits
# ─────────────────────────────────────────────

def _attach_days(conn, splits):
    """Given a list of split dicts, attach their days in one query."""
    if not splits:
        return splits
    split_ids = [s["id"] for s in splits]
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM split_days WHERE split_id = ANY(%s) ORDER BY split_id, day_name",
            (split_ids,),
        )
        days = cur.fetchall()
    by_split = {}
    for d in days:
        by_split.setdefault(d["split_id"], []).append(dict(d))
    return [{**s, "days": by_split.get(s["id"], [])} for s in splits]


@app.get("/api/splits")
@require_auth
@with_db
def get_splits():
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM workout_splits WHERE user_id = %s ORDER BY created_at ASC",
            (g.user_id,),
        )
        splits = [dict(r) for r in cur.fetchall()]
    return jsonify(_attach_days(g.conn, splits))


@app.post("/api/splits")
@require_auth
@with_db
def create_split():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    days = data.get("days") or []

    if not name:
        return jsonify({"error": "name is required"}), 400

    try:
        with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO workout_splits (user_id, name) VALUES (%s, %s) RETURNING *",
                (g.user_id, name),
            )
            split = dict(cur.fetchone())

            for d in days:
                cur.execute(
                    """INSERT INTO split_days (split_id, day_name, day_type, exercises)
                       VALUES (%s, %s, %s, %s)
                       ON CONFLICT (split_id, day_name) DO UPDATE
                         SET day_type = EXCLUDED.day_type,
                             exercises = EXCLUDED.exercises""",
                    (split["id"], d["day_name"], d.get("day_type", "Workout"),
                     json.dumps(d.get("exercises", []))),
                )
        g.conn.commit()
    except Exception as exc:
        g.conn.rollback()
        app.logger.error("POST /api/splits: %s", exc)
        return jsonify({"error": "Failed to create split"}), 500

    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT * FROM split_days WHERE split_id = %s", (split["id"],))
        saved_days = [dict(r) for r in cur.fetchall()]
    return jsonify({**split, "days": saved_days}), 201


@app.put("/api/splits/<int:split_id>")
@require_auth
@with_db
def update_split(split_id):
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    days = data.get("days")

    try:
        with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if name:
                cur.execute(
                    "UPDATE workout_splits SET name = %s WHERE id = %s AND user_id = %s",
                    (name, split_id, g.user_id),
                )
            if days is not None:
                cur.execute("DELETE FROM split_days WHERE split_id = %s", (split_id,))
                for d in days:
                    cur.execute(
                        """INSERT INTO split_days (split_id, day_name, day_type, exercises)
                           VALUES (%s, %s, %s, %s)""",
                        (split_id, d["day_name"], d.get("day_type", "Workout"),
                         json.dumps(d.get("exercises", []))),
                    )
        g.conn.commit()
    except Exception as exc:
        g.conn.rollback()
        app.logger.error("PUT /api/splits/%s: %s", split_id, exc)
        return jsonify({"error": "Failed to update split"}), 500

    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT * FROM workout_splits WHERE id = %s AND user_id = %s",
            (split_id, g.user_id),
        )
        split = dict(cur.fetchone() or {})
        cur.execute("SELECT * FROM split_days WHERE split_id = %s", (split_id,))
        saved_days = [dict(r) for r in cur.fetchall()]
    return jsonify({**split, "days": saved_days})


@app.delete("/api/splits/<int:split_id>")
@require_auth
@with_db
def delete_split(split_id):
    with g.conn.cursor() as cur:
        cur.execute(
            "DELETE FROM workout_splits WHERE id = %s AND user_id = %s",
            (split_id, g.user_id),
        )
    g.conn.commit()
    return jsonify({"ok": True})


@app.put("/api/splits/<int:split_id>/activate")
@require_auth
@with_db
def activate_split(split_id):
    try:
        with g.conn.cursor() as cur:
            cur.execute(
                "UPDATE workout_splits SET is_active = FALSE WHERE user_id = %s",
                (g.user_id,),
            )
            cur.execute(
                "UPDATE workout_splits SET is_active = TRUE WHERE id = %s AND user_id = %s",
                (split_id, g.user_id),
            )
        g.conn.commit()
    except Exception as exc:
        g.conn.rollback()
        app.logger.error("PUT /api/splits/%s/activate: %s", split_id, exc)
        return jsonify({"error": "Failed to activate split"}), 500
    return jsonify({"ok": True})


# ─────────────────────────────────────────────
# Boot
# ─────────────────────────────────────────────

if __name__ == "__main__":
    run_schema()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
