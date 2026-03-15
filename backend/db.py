import os
import psycopg2
from psycopg2 import pool as pg_pool
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set")

_pool = pg_pool.ThreadedConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=DATABASE_URL,
)


def get_conn():
    """Borrow a connection from the pool."""
    return _pool.getconn()


def put_conn(conn):
    """Return a connection to the pool."""
    _pool.putconn(conn)
