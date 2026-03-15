"""
seed.py – Populate the database with schema + seed data.

Usage (from the repo root):
    python backend/seed.py               # run schema migrations then seed data
    python backend/seed.py --schema-only # only run schema migrations

Requires DATABASE_URL in the environment (or a .env file at the project root).
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("❌  DATABASE_URL environment variable is not set.")
    sys.exit(1)

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), "..", "server", "schema.sql")
SEED_PATH   = os.path.join(os.path.dirname(__file__), "..", "server", "seed.sql")

schema_only = "--schema-only" in sys.argv


def run_file(label: str, path: str, conn) -> None:
    print(f"Running {label}…")
    with open(path) as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print(f"✅  {label} complete.")


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        run_file("schema migrations", SCHEMA_PATH, conn)
        if not schema_only:
            run_file("seed data", SEED_PATH, conn)
        print("\n🎉  Database is ready.")
    except Exception as exc:
        conn.rollback()
        print(f"❌  Seed failed: {exc}")
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
