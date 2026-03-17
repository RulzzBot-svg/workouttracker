import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rateLimit from 'express-rate-limit';
import pool from './db.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'dev-only-secret-change-me';

app.use(cors());
app.use(express.json());

// Apply rate limiting to all API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests – please try again later.' },
});
app.use('/api/', apiLimiter);

function createToken(userId) {
  return jwt.sign({ sub: userId }, SECRET_KEY, { algorithm: 'HS256', expiresIn: '7d' });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = auth.slice(7);
    const payload = jwt.verify(token, SECRET_KEY, { algorithms: ['HS256'] });
    req.userId = Number(payload.sub);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/* ─────────────────────────────────────────────
   Run schema migrations on startup
───────────────────────────────────────────── */
async function migrate() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

/* ─────────────────────────────────────────────
   Health check
───────────────────────────────────────────── */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

/* ─────────────────────────────────────────────
   Auth
───────────────────────────────────────────── */

app.post('/api/auth/register', async (req, res) => {
  const username = (req.body?.username || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [username, email, passwordHash]
    );

    const user = rows[0];
    const token = createToken(user.id);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username or email already in use' });
    }
    console.error('POST /api/auth/register', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const loginVal = (req.body?.email || req.body?.username || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!loginVal || !password) {
    return res.status(400).json({ error: 'email/username and password are required' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, username, email, password_hash, created_at
       FROM users
       WHERE LOWER(email) = $1 OR LOWER(username) = $1
       LIMIT 1`,
      [loginVal]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = createToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    console.error('POST /api/auth/login', err);
    return res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(rows[0]);
  } catch (err) {
    console.error('GET /api/auth/me', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/* ─────────────────────────────────────────────
   Workout History
───────────────────────────────────────────── */

// GET /api/history  – all entries, newest first
app.get('/api/history', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM workout_history WHERE user_id = $1 ORDER BY logged_at DESC',
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/history', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/history  – save one entry permanently
app.post('/api/history', requireAuth, async (req, res) => {
  const { exercise_name, category, sets, reps, weight, note } = req.body;
  if (!exercise_name || !sets || !reps) {
    return res.status(400).json({ error: 'exercise_name, sets, and reps are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO workout_history (user_id, exercise_name, category, sets, reps, weight, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.userId,
        exercise_name,
        category || 'Other',
        Number(sets),
        Number(reps),
        weight || null,
        note || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/history', err);
    res.status(500).json({ error: 'Failed to save history entry' });
  }
});

/* ─────────────────────────────────────────────
   Exercise Catalog
───────────────────────────────────────────── */

// GET /api/exercises  – full exercise catalog, optionally filtered by category
app.get('/api/exercises', async (req, res) => {
  const { category } = req.query;
  try {
    const { rows } = category
      ? await pool.query(
          'SELECT id, name, category FROM exercises WHERE category = $1 ORDER BY name',
          [category]
        )
      : await pool.query('SELECT id, name, category FROM exercises ORDER BY category, name');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/exercises', err);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});



// GET /api/splits  – list all splits with their days
app.get('/api/splits', requireAuth, async (req, res) => {
  try {
    const { rows: splits } = await pool.query(
      'SELECT * FROM workout_splits WHERE user_id = $1 ORDER BY created_at ASC',
      [req.userId]
    );

    if (splits.length === 0) {
      return res.json([]);
    }

    // Attach days to each split
    const splitIds = splits.map((s) => s.id);
    const { rows: days } = await pool.query(
      'SELECT * FROM split_days WHERE split_id = ANY($1::int[]) ORDER BY split_id, day_name',
      [splitIds]
    );
    const daysBySplit = {};
    days.forEach((d) => {
      if (!daysBySplit[d.split_id]) daysBySplit[d.split_id] = [];
      daysBySplit[d.split_id].push(d);
    });
    const result = splits.map((s) => ({
      ...s,
      days: daysBySplit[s.id] || [],
    }));
    res.json(result);
  } catch (err) {
    console.error('GET /api/splits', err);
    res.status(500).json({ error: 'Failed to fetch splits' });
  }
});

// POST /api/splits  – create a new split
app.post('/api/splits', requireAuth, async (req, res) => {
  const { name, days } = req.body; // days: [{ day_name, day_type, exercises }]
  if (!name) return res.status(400).json({ error: 'name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'INSERT INTO workout_splits (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.userId, name]
    );
    const split = rows[0];

    if (Array.isArray(days) && days.length > 0) {
      for (const d of days) {
        await client.query(
          `INSERT INTO split_days (split_id, day_name, day_type, exercises)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (split_id, day_name) DO UPDATE
             SET day_type = EXCLUDED.day_type, exercises = EXCLUDED.exercises`,
          [split.id, d.day_name, d.day_type || 'Workout', JSON.stringify(d.exercises || [])]
        );
      }
    }

    await client.query('COMMIT');

    // Return full split with days
    const { rows: savedDays } = await pool.query(
      'SELECT * FROM split_days WHERE split_id = $1',
      [split.id]
    );
    res.status(201).json({ ...split, days: savedDays });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/splits', err);
    res.status(500).json({ error: 'Failed to create split' });
  } finally {
    client.release();
  }
});

// PUT /api/splits/:id  – update split name and days
app.put('/api/splits/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, days } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (name) {
      const update = await client.query(
        'UPDATE workout_splits SET name = $1 WHERE id = $2 AND user_id = $3',
        [name, id, req.userId]
      );
      if (update.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Split not found' });
      }
    } else {
      const ownerCheck = await client.query(
        'SELECT id FROM workout_splits WHERE id = $1 AND user_id = $2',
        [id, req.userId]
      );
      if (ownerCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Split not found' });
      }
    }

    if (Array.isArray(days)) {
      // Delete old days then re-insert
      await client.query('DELETE FROM split_days WHERE split_id = $1', [id]);
      for (const d of days) {
        await client.query(
          `INSERT INTO split_days (split_id, day_name, day_type, exercises)
           VALUES ($1, $2, $3, $4)`,
          [id, d.day_name, d.day_type || 'Workout', JSON.stringify(d.exercises || [])]
        );
      }
    }

    await client.query('COMMIT');

    const { rows } = await pool.query('SELECT * FROM workout_splits WHERE id = $1', [id]);
    const { rows: savedDays } = await pool.query('SELECT * FROM split_days WHERE split_id = $1', [id]);
    res.json({ ...rows[0], days: savedDays });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/splits/:id', err);
    res.status(500).json({ error: 'Failed to update split' });
  } finally {
    client.release();
  }
});

// DELETE /api/splits/:id
app.delete('/api/splits/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM workout_splits WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Split not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/splits/:id', err);
    res.status(500).json({ error: 'Failed to delete split' });
  }
});

// PUT /api/splits/:id/activate  – make one split the active split
app.put('/api/splits/:id/activate', requireAuth, async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE workout_splits SET is_active = FALSE WHERE user_id = $1', [req.userId]);
    const result = await client.query('UPDATE workout_splits SET is_active = TRUE WHERE id = $1 AND user_id = $2', [id, req.userId]);
    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Split not found' });
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('PUT /api/splits/:id/activate', err);
    res.status(500).json({ error: 'Failed to activate split' });
  } finally {
    client.release();
  }
});

/* ─────────────────────────────────────────────
   Start server
───────────────────────────────────────────── */
migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
