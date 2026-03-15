-- Users
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  username      VARCHAR(100) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Exercise catalog (canonical list of all exercises)
CREATE TABLE IF NOT EXISTS exercises (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  category    VARCHAR(100) NOT NULL DEFAULT 'Other',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workout History (permanent; never deleted when user removes from today's log)
CREATE TABLE IF NOT EXISTS workout_history (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  exercise_name VARCHAR(255) NOT NULL,
  category    VARCHAR(100) NOT NULL DEFAULT 'Other',
  sets        INTEGER NOT NULL,
  reps        INTEGER NOT NULL,
  weight      DECIMAL(10,2),
  note        TEXT,
  logged_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workout Splits (each row is a named split plan)
CREATE TABLE IF NOT EXISTS workout_splits (
  id          SERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL DEFAULT 'My Split',
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per (split × day); exercises stored as a JSON array
CREATE TABLE IF NOT EXISTS split_days (
  id          SERIAL PRIMARY KEY,
  split_id    INTEGER NOT NULL REFERENCES workout_splits(id) ON DELETE CASCADE,
  day_name    VARCHAR(20) NOT NULL,
  day_type    VARCHAR(20) NOT NULL DEFAULT 'Workout',
  exercises   JSONB NOT NULL DEFAULT '[]',
  UNIQUE (split_id, day_name)
);
