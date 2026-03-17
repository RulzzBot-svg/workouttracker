"""
seed.py – Populate the database with schema + seed data.

Usage (from the repo root):
    python backend/seed.py               # run schema migrations then seed data
    python backend/seed.py --schema-only # only run schema migrations

Requires DATABASE_URL in the environment (or a .env file at the project root).
"""

import os
import sys
import argparse
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

HERE = Path(__file__).resolve().parent
REPO_ROOT = HERE.parent

# Load .env from predictable locations so the script works from any cwd.
load_dotenv(REPO_ROOT / ".env")
load_dotenv(HERE / ".env")

SCHEMA_PATH = REPO_ROOT / "server" / "schema.sql"
SEED_PATH = REPO_ROOT / "server" / "seed.sql"


def run_file(label: str, path: str, conn) -> None:
    print(f"Running {label}…")
    with open(path, encoding="utf-8") as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print(f"✅  {label} complete.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run schema migrations and optional seed data.")
    parser.add_argument("--schema-only", action="store_true", help="Run schema only, skip seed data")
    parser.add_argument(
        "--database-url",
        dest="database_url",
        default=None,
        help="Optional PostgreSQL URL override (defaults to DATABASE_URL env var)",
    )
    args = parser.parse_args()

    database_url = args.database_url or os.environ.get("DATABASE_URL")
    if not database_url:
        print("❌  DATABASE_URL environment variable is not set.")
        print(f"Checked for .env at: {REPO_ROOT / '.env'} and {HERE / '.env'}")
        sys.exit(1)

    if "@host/" in database_url or "user:password@" in database_url:
        print("❌  DATABASE_URL still contains the template value.")
        print("Set DATABASE_URL in .env to your Neon connection string, then rerun seed.py.")
        sys.exit(1)

    conn = psycopg2.connect(database_url)
    try:
        run_file("schema migrations", SCHEMA_PATH, conn)
        if not args.schema_only:
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
