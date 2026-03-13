import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pool from './db.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
   Workout History
───────────────────────────────────────────── */

// GET /api/history  – all entries, newest first
app.get('/api/history', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM workout_history ORDER BY logged_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/history', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// POST /api/history  – save one entry permanently
app.post('/api/history', async (req, res) => {
  const { exercise_name, category, sets, reps, weight, note } = req.body;
  if (!exercise_name || !sets || !reps) {
    return res.status(400).json({ error: 'exercise_name, sets, and reps are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO workout_history (exercise_name, category, sets, reps, weight, note)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [exercise_name, category || 'Other', Number(sets), Number(reps), weight || null, note || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/history', err);
    res.status(500).json({ error: 'Failed to save history entry' });
  }
});

/* ─────────────────────────────────────────────
   Workout Splits
───────────────────────────────────────────── */

// GET /api/splits  – list all splits with their days
app.get('/api/splits', async (_req, res) => {
  try {
    const { rows: splits } = await pool.query(
      'SELECT * FROM workout_splits ORDER BY created_at ASC'
    );
    // Attach days to each split
    const { rows: days } = await pool.query(
      'SELECT * FROM split_days ORDER BY split_id, day_name'
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
app.post('/api/splits', async (req, res) => {
  const { name, days } = req.body; // days: [{ day_name, day_type, exercises }]
  if (!name) return res.status(400).json({ error: 'name is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      'INSERT INTO workout_splits (name) VALUES ($1) RETURNING *',
      [name]
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
app.put('/api/splits/:id', async (req, res) => {
  const { id } = req.params;
  const { name, days } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (name) {
      await client.query('UPDATE workout_splits SET name = $1 WHERE id = $2', [name, id]);
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
app.delete('/api/splits/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM workout_splits WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/splits/:id', err);
    res.status(500).json({ error: 'Failed to delete split' });
  }
});

// PUT /api/splits/:id/activate  – make one split the active split
app.put('/api/splits/:id/activate', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE workout_splits SET is_active = FALSE');
    await client.query('UPDATE workout_splits SET is_active = TRUE WHERE id = $1', [id]);
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
