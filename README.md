# Workout Tracker 💪

A full-stack, mobile-friendly workout logging app with user accounts, workout history, and custom split planner.

## Features

- **User authentication** — register / login with JWT-protected routes
- **Log exercises** with sets, reps, optional weight, and notes
- **7 muscle-group categories** (Chest, Back, Legs, Shoulders, Arms, Core, Cardio) — each colour-coded
- **Stats bar** — live totals for exercises, sets, and total volume (lbs)
- **Category filter** — view entries by muscle group
- **Workout Splits** — create, edit, activate, and delete named split plans
- **Delete entries** with one tap
- **Toast notifications** on add / remove
- **Pastel gradient design** that looks great on desktop and mobile

---

## Stack

| Layer    | Technology |
|----------|------------|
| Frontend | React 19 + Vite 8 |
| Backend  | Python 3.12 · Flask · Gunicorn |
| Database | PostgreSQL (tested with [Neon](https://neon.tech)) |
| Auth     | JWT (PyJWT + bcrypt) |
| Hosting  | [Render](https://render.com) |

---

## Local Development

### Prerequisites

- **Node.js ≥ 18** and **npm**
- **Python ≥ 3.10** and **pip**
- A **PostgreSQL** database (local or a free [Neon](https://neon.tech) project)

### 1 — Clone and install dependencies

```bash
git clone https://github.com/RulzzBot-svg/workouttracker.git
cd workouttracker

# JavaScript / frontend deps
npm install

# Python / backend deps
pip install -r backend/requirements.txt
```

### 2 — Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```dotenv
# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Strong random secret used to sign JWTs
# Generate one with: python3 -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=change-this-to-a-random-secret

# Set to 1 during development for verbose Flask error pages
FLASK_DEBUG=0
```

> **Neon tip:** copy the connection string from the Neon dashboard → your project → **Connection string**.  
> Keep `?sslmode=require` (add `&channel_binding=require` if your Neon project requires it).

### 3 — Start the backend (Flask)

```bash
python backend/app.py
# API is now listening on http://localhost:5000
```

The app will automatically create all required tables on first run.

### 4 — Start the frontend (Vite dev server)

In a second terminal:

```bash
npm run dev
# React app is now at http://localhost:5173
# All /api/* requests are proxied to http://localhost:5000
```

Open [http://localhost:5173](http://localhost:5173) and register an account to get started.

---

## Deploy to Render

The project ships with a `render.yaml` blueprint. You can either use **one-click Blueprint deploy** or set everything up manually by following the steps below.

### Step 1 — Set up a PostgreSQL database on Neon

1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. From the **Dashboard → Connection Details** panel, copy the **connection string**; it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Keep this string handy — you will paste it as `DATABASE_URL` in the next step.

---

### Step 2 — Deploy the backend (Web Service)

1. Log in to [render.com](https://render.com) and click **New → Web Service**.
2. Connect your GitHub account and select the **workouttracker** repository.
3. Fill in the service settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `workouttracker-api` (or any name you like) |
   | **Runtime** | `Python 3` |
   | **Build Command** | `pip install -r backend/requirements.txt` |
   | **Start Command** | `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT --workers 2` |
   | **Instance type** | Free (or higher) |

4. Scroll down to **Environment Variables** and add:

   | Key | Value / Note |
   |-----|-------------|
   | `DATABASE_URL` | Paste the Neon connection string from Step 1 |
   | `SECRET_KEY` | Click **Generate** (Render creates a secure random value automatically) |
   | `PYTHON_VERSION` | `3.12.3` (or latest `3.12.x`) |

5. Click **Create Web Service**.  
   Render installs dependencies, runs the start command, and exposes the service at a URL like `https://workouttracker-api.onrender.com`.

6. **Verify the backend is healthy:**
   ```
   curl https://workouttracker-api.onrender.com/api/health
   # → {"ok": true}
   ```

---

### Step 3 — Deploy the frontend (Static Site)

1. In Render, click **New → Static Site**.
2. Select the same **workouttracker** repository.
3. Fill in the site settings:

   | Setting | Value |
   |---------|-------|
   | **Name** | `workouttracker` (or any name you like) |
   | **Build Command** | `npm install && npm run build` |
   | **Publish Directory** | `dist` |

4. Add the following **Environment Variable** so the frontend knows where to send API calls:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | The URL from Step 2, e.g. `https://workouttracker-api.onrender.com` |

5. Add a **Rewrite Rule** so that every `/api/*` request is forwarded to the Flask backend instead of serving a static file:

   | Source | Destination | Action |
   |--------|-------------|--------|
   | `/api/*` | `https://workouttracker-api.onrender.com/api/:splat` | **Rewrite** |

   > In the Render dashboard this is under **Redirects / Rewrites → Add Rule**.

6. Click **Create Static Site**.  
   Render builds the Vite app and publishes the `dist` folder at a URL like `https://workouttracker.onrender.com`.

---

### Step 4 — Verify the full deployment

1. Open `https://workouttracker.onrender.com` in a browser.
2. Register a new account.
3. Log an exercise and confirm it appears in the history list.
4. Create a workout split and activate it.

If anything is not working, check **Render → your service → Logs** for error messages.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (e.g. from Neon). Must include `?sslmode=require`. |
| `SECRET_KEY` | ✅ | Random string used to sign & verify JWT tokens. Keep this secret. |
| `FLASK_DEBUG` | optional | Set to `1` to enable Flask debug mode locally. **Never set to `1` in production.** |
| `PORT` | set by Render | The port the server listens on. Render injects this automatically; defaults to `5000` locally. |
| `PYTHON_VERSION` | Render only | Pin the Python version on Render (e.g. `3.12.3`; use the latest available `3.12.x`). |
| `VITE_API_URL` | Static Site | Base URL of the backend service. Used by the Render rewrite rule. |

---

## Database Schema

The schema is applied automatically on every startup (idempotent `CREATE TABLE IF NOT EXISTS`):

| Table | Purpose |
|-------|---------|
| `users` | Registered accounts (username, email, bcrypt hash) |
| `workout_history` | Permanent exercise log entries per user |
| `workout_splits` | Named split plans per user |
| `split_days` | Days belonging to a split, with a JSONB exercise list |

---

## NPM Scripts

```bash
npm run dev        # Vite dev server (frontend only, port 5173)
npm run build      # Production build → dist/
npm run preview    # Serve the production build locally
npm run lint       # ESLint
```

---

## One-Click Blueprint Deploy (optional)

The `render.yaml` in the repository root defines the backend service.  
Click the button below to deploy it instantly to your Render account:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

> After deploying via Blueprint, follow **Step 3** above to also deploy the Static Site frontend.
