import os
import json
from datetime import date as _date, timedelta as _timedelta
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


@app.before_request
def refresh_last_seen():
    """Update last_seen for authenticated requests."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return
    try:
        payload = decode_token(auth.split(" ", 1)[1])
        user_id = payload["sub"]
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET last_seen = NOW() WHERE id = %s", (user_id,))
            conn.commit()
        finally:
            put_conn(conn)
    except Exception:
        pass


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
# Exercise Catalog
# ─────────────────────────────────────────────

@app.get("/api/exercises")
@with_db
def get_exercises():
    category = request.args.get("category", "").strip()
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        if category:
            cur.execute(
                "SELECT id, name, category FROM exercises WHERE category = %s ORDER BY name",
                (category,),
            )
        else:
            cur.execute(
                "SELECT id, name, category FROM exercises ORDER BY category, name"
            )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])




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


_STREAK_RESET_GAP = 3  # days without a log that resets the streak


def _compute_streak(log_dates):
    """
    log_dates: list of datetime.date objects (may have duplicates), any order.
    Returns: tuple[int, int] – (current_streak, longest_streak).
    A streak = count of active days (days with >=1 log).
    It resets when there's a gap of _STREAK_RESET_GAP+ days between consecutive active days.
    """
    if not log_dates:
        return 0, 0

    unique_days = sorted(set(log_dates), reverse=True)
    today = _date.today()

    if (today - unique_days[0]).days >= _STREAK_RESET_GAP:
        current = 0
    else:
        current = 1
        for i in range(1, len(unique_days)):
            gap = (unique_days[i - 1] - unique_days[i]).days
            if gap >= _STREAK_RESET_GAP:
                break
            current += 1

    longest = 1
    run = 1
    for i in range(1, len(unique_days)):
        gap = (unique_days[i - 1] - unique_days[i]).days
        if gap >= _STREAK_RESET_GAP:
            longest = max(longest, run)
            run = 1
        else:
            run += 1
    longest = max(longest, run)

    return current, longest


# ─────────────────────────────────────────────
# User Profiles
# ─────────────────────────────────────────────

@app.get("/api/profile")
@require_auth
@with_db
def get_profile():
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT u.id, u.username, u.email, u.created_at, u.last_seen,
                      p.bio, p.height, p.weight, p.tags, p.avatar_url
               FROM users u
               LEFT JOIN user_profiles p ON p.user_id = u.id
               WHERE u.id = %s""",
            (g.user_id,),
        )
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "User not found"}), 404
    data = dict(row)
    with g.conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT logged_at::date FROM workout_history WHERE user_id = %s",
            (g.user_id,),
        )
        dates = [r[0] for r in cur.fetchall()]
    current_streak, longest_streak = _compute_streak(dates)
    data["current_streak"] = current_streak
    data["longest_streak"] = longest_streak
    if data.get("tags") is None:
        data["tags"] = []
    return jsonify(data)


@app.put("/api/profile")
@require_auth
@with_db
def update_profile():
    data = request.get_json(silent=True) or {}
    bio = data.get("bio")
    height = data.get("height")
    weight = data.get("weight")
    tags = data.get("tags")
    avatar_url = data.get("avatar_url")

    with g.conn.cursor() as cur:
        cur.execute(
            """INSERT INTO user_profiles (user_id, bio, height, weight, tags, avatar_url, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())
               ON CONFLICT (user_id) DO UPDATE
                 SET bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
                     height = COALESCE(EXCLUDED.height, user_profiles.height),
                     weight = COALESCE(EXCLUDED.weight, user_profiles.weight),
                     tags = COALESCE(EXCLUDED.tags, user_profiles.tags),
                     avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
                     updated_at = NOW()""",
            (g.user_id, bio, height, weight, tags or [], avatar_url),
        )
    g.conn.commit()
    return jsonify({"ok": True})


@app.get("/api/profile/<int:target_user_id>")
@require_auth
@with_db
def get_user_profile(target_user_id):
    """Public profile for any user (friends can view)."""
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT u.id, u.username, u.last_seen,
                      p.bio, p.height, p.weight, p.tags, p.avatar_url
               FROM users u
               LEFT JOIN user_profiles p ON p.user_id = u.id
               WHERE u.id = %s""",
            (target_user_id,),
        )
        row = cur.fetchone()
    if not row:
        return jsonify({"error": "User not found"}), 404
    data = dict(row)
    with g.conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT logged_at::date FROM workout_history WHERE user_id = %s",
            (target_user_id,),
        )
        dates = [r[0] for r in cur.fetchall()]
    current_streak, longest_streak = _compute_streak(dates)
    data["current_streak"] = current_streak
    data["longest_streak"] = longest_streak
    if data.get("tags") is None:
        data["tags"] = []
    return jsonify(data)


# ─────────────────────────────────────────────
# Streak
# ─────────────────────────────────────────────

@app.get("/api/streak")
@require_auth
@with_db
def get_streak():
    with g.conn.cursor() as cur:
        cur.execute(
            "SELECT DISTINCT logged_at::date FROM workout_history WHERE user_id = %s",
            (g.user_id,),
        )
        dates = [r[0] for r in cur.fetchall()]
    current_streak, longest_streak = _compute_streak(dates)
    return jsonify({"current_streak": current_streak, "longest_streak": longest_streak})


# ─────────────────────────────────────────────
# Friends
# ─────────────────────────────────────────────

@app.get("/api/users/search")
@require_auth
@with_db
def search_users():
    q = (request.args.get("q") or "").strip()
    if not q or len(q) < 2:
        return jsonify([])
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT id, username, last_seen,
                      (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS avatar_url
               FROM users u
               WHERE LOWER(username) LIKE %s AND id != %s
               LIMIT 20""",
            (f"%{q.lower()}%", g.user_id),
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/friends")
@require_auth
@with_db
def get_friends():
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT f.id AS friendship_id, f.status, f.created_at,
                      f.requester_id, f.addressee_id,
                      CASE WHEN f.requester_id = %s THEN f.addressee_id ELSE f.requester_id END AS friend_id,
                      u.username AS friend_username, u.last_seen AS friend_last_seen,
                      (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS friend_avatar_url
               FROM friendships f
               JOIN users u ON u.id = CASE WHEN f.requester_id = %s THEN f.addressee_id ELSE f.requester_id END
               WHERE (f.requester_id = %s OR f.addressee_id = %s)
                 AND f.status = 'accepted'""",
            (g.user_id, g.user_id, g.user_id, g.user_id),
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@app.get("/api/friends/requests")
@require_auth
@with_db
def get_friend_requests():
    with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            """SELECT f.id AS friendship_id, f.status, f.created_at, f.requester_id,
                      u.username AS requester_username,
                      (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS requester_avatar_url,
                      'incoming' AS direction
               FROM friendships f
               JOIN users u ON u.id = f.requester_id
               WHERE f.addressee_id = %s AND f.status = 'pending'""",
            (g.user_id,),
        )
        incoming = [dict(r) for r in cur.fetchall()]
        cur.execute(
            """SELECT f.id AS friendship_id, f.status, f.created_at, f.addressee_id,
                      u.username AS addressee_username,
                      (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS addressee_avatar_url,
                      'outgoing' AS direction
               FROM friendships f
               JOIN users u ON u.id = f.addressee_id
               WHERE f.requester_id = %s AND f.status = 'pending'""",
            (g.user_id,),
        )
        outgoing = [dict(r) for r in cur.fetchall()]
    return jsonify({"incoming": incoming, "outgoing": outgoing})


@app.post("/api/friends")
@require_auth
@with_db
def send_friend_request():
    data = request.get_json(silent=True) or {}
    addressee_id = data.get("user_id")
    if not addressee_id:
        return jsonify({"error": "user_id is required"}), 400
    if int(addressee_id) == g.user_id:
        return jsonify({"error": "Cannot add yourself"}), 400

    try:
        with g.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """INSERT INTO friendships (requester_id, addressee_id)
                   VALUES (%s, %s) RETURNING *""",
                (g.user_id, int(addressee_id)),
            )
            row = dict(cur.fetchone())
        g.conn.commit()
    except psycopg2.errors.UniqueViolation:
        g.conn.rollback()
        return jsonify({"error": "Friend request already sent or friendship exists"}), 409
    except Exception as exc:
        g.conn.rollback()
        return jsonify({"error": str(exc)}), 500
    return jsonify(row), 201


@app.put("/api/friends/<int:friendship_id>/accept")
@require_auth
@with_db
def accept_friend_request(friendship_id):
    with g.conn.cursor() as cur:
        cur.execute(
            """UPDATE friendships SET status = 'accepted'
               WHERE id = %s AND addressee_id = %s AND status = 'pending'""",
            (friendship_id, g.user_id),
        )
        if cur.rowcount == 0:
            g.conn.rollback()
            return jsonify({"error": "Request not found or already handled"}), 404
    g.conn.commit()
    return jsonify({"ok": True})


@app.put("/api/friends/<int:friendship_id>/decline")
@require_auth
@with_db
def decline_friend_request(friendship_id):
    with g.conn.cursor() as cur:
        cur.execute(
            """UPDATE friendships SET status = 'declined'
               WHERE id = %s AND addressee_id = %s AND status = 'pending'""",
            (friendship_id, g.user_id),
        )
        if cur.rowcount == 0:
            g.conn.rollback()
            return jsonify({"error": "Request not found or already handled"}), 404
    g.conn.commit()
    return jsonify({"ok": True})


@app.delete("/api/friends/<int:friendship_id>")
@require_auth
@with_db
def remove_friend(friendship_id):
    with g.conn.cursor() as cur:
        cur.execute(
            """DELETE FROM friendships
               WHERE id = %s AND (requester_id = %s OR addressee_id = %s)""",
            (friendship_id, g.user_id, g.user_id),
        )
        if cur.rowcount == 0:
            g.conn.rollback()
            return jsonify({"error": "Friendship not found"}), 404
    g.conn.commit()
    return jsonify({"ok": True})


# ─────────────────────────────────────────────
# Boot
# ─────────────────────────────────────────────

# Run schema migrations on every startup (idempotent).
# This covers both `python app.py` and gunicorn launches.
run_schema()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG", "0") == "1")
