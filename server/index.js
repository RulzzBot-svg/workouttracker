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

// Middleware: update last_seen for authenticated requests
app.use((req, res, next) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(auth.slice(7), SECRET_KEY, { algorithms: ['HS256'] });
    pool.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [Number(payload.sub)]).catch(() => {});
  } catch {
    // ignore
  }
  next();
});

/* ─────────────────────────────────────────────
   Streak helper
───────────────────────────────────────────── */

function computeStreak(logDates) {
  if (!logDates.length) return { current_streak: 0, longest_streak: 0 };

  const unique = [...new Set(logDates.map((d) => d.toISOString().slice(0, 10)))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);

  const daysDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000);

  let current = 0;
  if (Math.abs(daysDiff(today, unique[0])) < 3) {
    current = 1;
    for (let i = 1; i < unique.length; i++) {
      const gap = daysDiff(unique[i - 1], unique[i]);
      if (gap >= 3) break;
      current++;
    }
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const gap = daysDiff(unique[i - 1], unique[i]);
    if (gap >= 3) { longest = Math.max(longest, run); run = 1; }
    else run++;
  }
  longest = Math.max(longest, run);

  return { current_streak: current, longest_streak: longest };
}

/* ─────────────────────────────────────────────
   Profile routes
───────────────────────────────────────────── */

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at, u.last_seen,
              p.bio, p.height, p.weight, p.tags, p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [req.userId],
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const data = rows[0];
    const { rows: dateRows } = await pool.query(
      'SELECT DISTINCT logged_at::date FROM workout_history WHERE user_id = $1',
      [req.userId],
    );
    const { current_streak, longest_streak } = computeStreak(dateRows.map((r) => r.logged_at));
    data.current_streak = current_streak;
    data.longest_streak = longest_streak;
    if (!data.tags) data.tags = [];
    res.json(data);
  } catch (err) {
    console.error('GET /api/profile', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  const { bio, height, weight, tags, avatar_url } = req.body || {};
  try {
    await pool.query(
      `INSERT INTO user_profiles (user_id, bio, height, weight, tags, avatar_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET bio = COALESCE(EXCLUDED.bio, user_profiles.bio),
             height = COALESCE(EXCLUDED.height, user_profiles.height),
             weight = COALESCE(EXCLUDED.weight, user_profiles.weight),
             tags = COALESCE(EXCLUDED.tags, user_profiles.tags),
             avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
             updated_at = NOW()`,
      [req.userId, bio, height, weight, tags || [], avatar_url],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/profile', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/profile/:targetUserId', requireAuth, async (req, res) => {
  const targetUserId = Number(req.params.targetUserId);
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.last_seen,
              p.bio, p.height, p.weight, p.tags, p.avatar_url
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [targetUserId],
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    const data = rows[0];
    const { rows: dateRows } = await pool.query(
      'SELECT DISTINCT logged_at::date FROM workout_history WHERE user_id = $1',
      [targetUserId],
    );
    const { current_streak, longest_streak } = computeStreak(dateRows.map((r) => r.logged_at));
    data.current_streak = current_streak;
    data.longest_streak = longest_streak;
    if (!data.tags) data.tags = [];
    res.json(data);
  } catch (err) {
    console.error('GET /api/profile/:id', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/* ─────────────────────────────────────────────
   Streak route
───────────────────────────────────────────── */

app.get('/api/streak', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT DISTINCT logged_at::date FROM workout_history WHERE user_id = $1',
      [req.userId],
    );
    const result = computeStreak(rows.map((r) => r.logged_at));
    res.json(result);
  } catch (err) {
    console.error('GET /api/streak', err);
    res.status(500).json({ error: 'Failed to get streak' });
  }
});

/* ─────────────────────────────────────────────
   Friends routes
───────────────────────────────────────────── */

app.get('/api/users/search', requireAuth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q || q.length < 2) return res.json([]);
  try {
    const { rows } = await pool.query(
      `SELECT id, username, last_seen,
              (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS avatar_url
       FROM users u
       WHERE LOWER(username) LIKE $1 AND id != $2
       LIMIT 20`,
      [`%${q.toLowerCase()}%`, req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/users/search', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.get('/api/friends', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id AS friendship_id, f.status, f.created_at,
              f.requester_id, f.addressee_id,
              CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
              u.username AS friend_username, u.last_seen AS friend_last_seen,
              (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS friend_avatar_url
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
       WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status = 'accepted'`,
      [req.userId],
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/friends', err);
    res.status(500).json({ error: 'Failed to get friends' });
  }
});

app.get('/api/friends/requests', requireAuth, async (req, res) => {
  try {
    const { rows: incoming } = await pool.query(
      `SELECT f.id AS friendship_id, f.status, f.created_at, f.requester_id,
              u.username AS requester_username,
              (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS requester_avatar_url,
              'incoming' AS direction
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.addressee_id = $1 AND f.status = 'pending'`,
      [req.userId],
    );
    const { rows: outgoing } = await pool.query(
      `SELECT f.id AS friendship_id, f.status, f.created_at, f.addressee_id,
              u.username AS addressee_username,
              (SELECT avatar_url FROM user_profiles WHERE user_id = u.id) AS addressee_avatar_url,
              'outgoing' AS direction
       FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.requester_id = $1 AND f.status = 'pending'`,
      [req.userId],
    );
    res.json({ incoming, outgoing });
  } catch (err) {
    console.error('GET /api/friends/requests', err);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

app.post('/api/friends', requireAuth, async (req, res) => {
  const addresseeId = req.body?.user_id;
  if (!addresseeId) return res.status(400).json({ error: 'user_id is required' });
  if (Number(addresseeId) === req.userId) return res.status(400).json({ error: 'Cannot add yourself' });
  try {
    const { rows } = await pool.query(
      'INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2) RETURNING *',
      [req.userId, Number(addresseeId)],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Friend request already sent or friendship exists' });
    console.error('POST /api/friends', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

app.put('/api/friends/:id/accept', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE friendships SET status = 'accepted' WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [req.params.id, req.userId],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Request not found or already handled' });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/friends/:id/accept', err);
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

app.put('/api/friends/:id/decline', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE friendships SET status = 'declined' WHERE id = $1 AND addressee_id = $2 AND status = 'pending'`,
      [req.params.id, req.userId],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Request not found or already handled' });
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/friends/:id/decline', err);
    res.status(500).json({ error: 'Failed to decline request' });
  }
});

app.delete('/api/friends/:id', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM friendships WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)',
      [req.params.id, req.userId],
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Friendship not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/friends/:id', err);
    res.status(500).json({ error: 'Failed to remove friend' });
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
