import { useState, useMemo, useEffect } from 'react';
import './WorkoutLog.css';

const storageGet = (key, fallback) => {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
};

const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

const CATEGORIES = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

const CATEGORY_COLORS = {
  Chest:     { bg: '#fde8e8', border: '#f9b8b8', badge: '#e05a5a' },
  Back:      { bg: '#e8f0fd', border: '#b8cef9', badge: '#4a7ce0' },
  Legs:      { bg: '#e8fde8', border: '#b8f9b8', badge: '#3daa3d' },
  Shoulders: { bg: '#fdf4e8', border: '#f9ddb8', badge: '#d97a2e' },
  Arms:      { bg: '#f4e8fd', border: '#d8b8f9', badge: '#8c3de0' },
  Core:      { bg: '#e8fdf4', border: '#b8f9d8', badge: '#2eb88a' },
  Cardio:    { bg: '#fef9e8', border: '#f9edb8', badge: '#c9a520' },
  Other:     { bg: '#f3f3f3', border: '#d4d4d4', badge: '#777777' },
};

const today = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SPLIT_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const WORKOUT_SPLIT = {
  Monday: {
    label: 'Upper – Chest Focus',
    exercises: [
      { id: 'mon-1', name: 'Flat Bench Press',            sets: 3, reps: '10–12', category: 'Chest' },
      { id: 'mon-2', name: 'Incline DB Press',            sets: 3, reps: '10–12', category: 'Chest' },
      { id: 'mon-3', name: 'Lat Pull-downs',              sets: 3, reps: '10–12', category: 'Back' },
      { id: 'mon-4', name: 'Shoulder Press (DB or Bar)',  sets: 3, reps: '10–12', category: 'Shoulders' },
      { id: 'mon-5', name: 'Lateral Raises',              sets: 4, reps: '15–20', category: 'Shoulders' },
      { id: 'mon-6', name: 'Tricep Pushdowns',            sets: 2, reps: '12–15', category: 'Arms' },
      { id: 'mon-7', name: 'Hammer Curls',                sets: 2, reps: '12–15', category: 'Arms' },
    ],
  },
  Tuesday: {
    label: 'Lower – Quadriceps Focus',
    exercises: [
      { id: 'tue-1', name: 'Back Squats or Leg Press',    sets: 3, reps: '10–12', category: 'Legs' },
      { id: 'tue-2', name: 'Leg Extensions',              sets: 3, reps: '12–15', category: 'Legs' },
      { id: 'tue-3', name: 'Hamstring Curls',             sets: 3, reps: '12–15', category: 'Legs' },
      { id: 'tue-4', name: 'Calf Raises',                 sets: 4, reps: '15',    category: 'Legs' },
      { id: 'tue-5', name: 'Hanging Leg Raises',          sets: 3, reps: 'Failure', category: 'Core' },
    ],
  },
  Wednesday: {
    label: 'Upper – Back Focus',
    exercises: [
      { id: 'wed-1', name: 'Weighted Pull-ups',           sets: 3, reps: '10–12', category: 'Back' },
      { id: 'wed-2', name: 'Barbell / Seated Cable Rows', sets: 3, reps: '10–12', category: 'Back' },
      { id: 'wed-3', name: 'Chest Flyes (Cable/Machine)', sets: 3, reps: '12–15', category: 'Chest' },
      { id: 'wed-4', name: 'Lateral Raises',              sets: 4, reps: '15–20', category: 'Shoulders' },
      { id: 'wed-5', name: 'Face Pulls',                  sets: 3, reps: '15',    category: 'Shoulders' },
      { id: 'wed-6', name: 'Strict Bicep Curls',          sets: 2, reps: '10–12', category: 'Arms' },
      { id: 'wed-7', name: 'Skull Crushers',              sets: 2, reps: '10–12', category: 'Arms' },
    ],
  },
  Thursday: {
    label: 'Lower – Hamstring / Glute Focus',
    exercises: [
      { id: 'thu-1', name: 'Romanian Deadlifts (RDLs)',   sets: 3, reps: '10–12', category: 'Legs' },
      { id: 'thu-2', name: 'Walking Lunges',              sets: 3, reps: '12 / leg', category: 'Legs' },
      { id: 'thu-3', name: 'Leg Press (Feet High)',       sets: 3, reps: '12–15', category: 'Legs' },
      { id: 'thu-4', name: 'Calf Raises',                 sets: 4, reps: '15',    category: 'Legs' },
      { id: 'thu-5', name: 'Plank / Core Circuit',        sets: 3, reps: 'rounds', category: 'Core' },
    ],
  },
  Friday: {
    label: 'Upper – Arm & Shoulder Volume',
    exercises: [
      { id: 'fri-1', name: 'Dips (Chest / Tricep)',       sets: 3, reps: 'Failure', category: 'Arms' },
      { id: 'fri-2', name: 'Lateral Raises',              sets: 5, reps: '15–20', category: 'Shoulders' },
      { id: 'fri-3', name: 'Strict Barbell Curls',        sets: 3, reps: '8–10',  category: 'Arms' },
      { id: 'fri-4', name: 'Skull Crushers',              sets: 3, reps: '10–12', category: 'Arms' },
      { id: 'fri-5', name: 'Hammer Curls',                sets: 3, reps: '12',    category: 'Arms' },
      { id: 'fri-6', name: 'Tricep Overhead Extension',   sets: 3, reps: '12–15', category: 'Arms' },
      { id: 'fri-7', name: 'Reverse Curls',               sets: 2, reps: '15',    category: 'Arms' },
    ],
  },
};

export default function WorkoutLog() {
  const [entries, setEntries] = useState(() => storageGet('wl-entries', []));
  const [exercise, setExercise] = useState('');
  const [category, setCategory] = useState('Chest');
  const [sets, setSets]   = useState('');
  const [reps, setReps]   = useState('');
  const [weight, setWeight] = useState('');
  const [note, setNote]   = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('log');

  // Split state
  const todayName = DAYS[new Date().getDay()];
  const defaultDay = SPLIT_DAYS.includes(todayName) ? todayName : 'Monday';
  const [viewDay, setViewDay] = useState(defaultDay);
  const [checked, setChecked] = useState(() => storageGet('wl-checked', {}));

  useEffect(() => { storageSet('wl-entries', entries); }, [entries]);
  useEffect(() => { storageSet('wl-checked', checked); }, [checked]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const toggleCheck = (id) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const prefillForm = (ex) => {
    setExercise(ex.name);
    setCategory(ex.category);
    setSets(String(ex.sets));
    // For rep ranges like "10–12" use the lower bound; non-numeric values (e.g. "Failure") leave reps empty
    const firstNum = parseInt(ex.reps);
    setReps(isNaN(firstNum) ? '' : String(firstNum));
    document.querySelector('.wl-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const addEntry = (e) => {
    e.preventDefault();
    if (!exercise.trim() || !sets || !reps) return;

    const newEntry = {
      id: Date.now(),
      name: exercise.trim(),
      category,
      sets: Number(sets),
      reps: Number(reps),
      weight: weight ? Number(weight) : null,
      note: note.trim(),
      timestamp: Date.now(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setExercise('');
    setSets('');
    setReps('');
    setWeight('');
    setNote('');
    showToast(`✅ ${newEntry.name} logged!`);
  };

  const removeEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    showToast('🗑️ Entry removed');
  };

  const filtered = useMemo(
    () => (filterCat === 'All' ? entries : entries.filter((e) => e.category === filterCat)),
    [entries, filterCat]
  );

  const totalVolume = useMemo(
    () =>
      entries.reduce((sum, e) => sum + (e.weight ? e.sets * e.reps * e.weight : 0), 0),
    [entries]
  );

  const totalSets = useMemo(() => entries.reduce((sum, e) => sum + e.sets, 0), [entries]);

  const categoryCounts = useMemo(() => {
    const map = {};
    entries.forEach((e) => { map[e.category] = (map[e.category] || 0) + 1; });
    return map;
  }, [entries]);

  const fmtDate = (ts) =>
    new Date(ts).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

  const historyByDate = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const date = fmtDate(entry.timestamp);
      if (!map[date]) map[date] = [];
      map[date].push(entry);
    });
    // Sort dates newest-first: convert MM/DD/YYYY to YYYYMMDD number for comparison
    const dateKey = (d) => {
      const [m, day, y] = d.split('/');
      return Number(`${y}${m}${day}`);
    };
    return Object.entries(map).sort((a, b) => dateKey(b[0]) - dateKey(a[0]));
  }, [entries]);

  return (
    <div className="wl-page">
      {toast && <div className="wl-toast">{toast}</div>}

      {/* ── Header ── */}
      <header className="wl-header">
        <div className="wl-header-icon">💪</div>
        <div>
          <h1 className="wl-title">Gains Inventory</h1>
          <p className="wl-subtitle">{today()}</p>
        </div>
      </header>

      {activeTab === 'log' && (
        <>
          {/* ── Stats Bar ── */}
          <div className="wl-stats">
            <div className="wl-stat">
              <span className="wl-stat-val">{entries.length}</span>
              <span className="wl-stat-lbl">Exercises</span>
            </div>
            <div className="wl-stat-divider" />
            <div className="wl-stat">
              <span className="wl-stat-val">{totalSets}</span>
              <span className="wl-stat-lbl">Total Sets</span>
            </div>
            <div className="wl-stat-divider" />
            <div className="wl-stat">
              <span className="wl-stat-val">
                {totalVolume > 0 ? `${totalVolume.toLocaleString()} lbs` : '—'}
              </span>
              <span className="wl-stat-lbl">Total Volume</span>
            </div>
          </div>

          {/* ── Workout Split ── */}
          <section className="wl-card wl-split-card">
            <div className="wl-split-header">
              <h2 className="wl-section-title wl-split-title">
                📅 {viewDay}&apos;s Plan
              </h2>
              <span className="wl-split-label">{WORKOUT_SPLIT[viewDay].label}</span>
            </div>

            <div className="wl-day-tabs">
              {SPLIT_DAYS.map((day) => (
                <button
                  key={day}
                  className={`wl-day-tab${viewDay === day ? ' active' : ''}${day === todayName ? ' today' : ''}`}
                  onClick={() => setViewDay(day)}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            <ul className="wl-split-list">
              {WORKOUT_SPLIT[viewDay].exercises.map((ex) => {
                const colors = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.Other;
                const done = !!checked[ex.id];
                return (
                  <li
                    key={ex.id}
                    className={`wl-split-item${done ? ' done' : ''}`}
                    style={{ borderLeft: `3px solid ${colors.badge}` }}
                  >
                    <label className="wl-split-check">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleCheck(ex.id)}
                      />
                      <span className="wl-split-name">{ex.name}</span>
                    </label>
                    <span className="wl-split-meta">
                      {ex.sets} × {ex.reps}
                    </span>
                    <button
                      className="wl-split-add"
                      onClick={() => prefillForm(ex)}
                      title="Pre-fill log form"
                      aria-label={`Pre-fill form with ${ex.name}`}
                    >
                      ＋
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="wl-split-progress">
              {(() => {
                const total = WORKOUT_SPLIT[viewDay].exercises.length;
                const done = WORKOUT_SPLIT[viewDay].exercises.filter((ex) => checked[ex.id]).length;
                return (
                  <>
                    <div
                      className="wl-split-bar"
                      style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                    />
                    <span className="wl-split-progress-text">{done} / {total} done</span>
                  </>
                );
              })()}
            </div>
          </section>

          {/* ── Log Form ── */}
          <section className="wl-card">
            <h2 className="wl-section-title">➕ Log Exercise</h2>
            <form onSubmit={addEntry} className="wl-form">
              <div className="wl-form-row">
                <input
                  className="wl-input wl-input-flex"
                  placeholder="Exercise name (e.g. Lat Raise)"
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  required
                />
                <select
                  className="wl-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="wl-form-row wl-form-row-3">
                <label className="wl-label-group">
                  <span>Sets</span>
                  <input
                    type="number"
                    min="1"
                    className="wl-input"
                    placeholder="4"
                    value={sets}
                    onChange={(e) => setSets(e.target.value)}
                    required
                  />
                </label>
                <label className="wl-label-group">
                  <span>Reps</span>
                  <input
                    type="number"
                    min="1"
                    className="wl-input"
                    placeholder="12"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    required
                  />
                </label>
                <label className="wl-label-group">
                  <span>Weight (lbs)</span>
                  <input
                    type="number"
                    min="0"
                    step="2.5"
                    className="wl-input"
                    placeholder="optional"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </label>
              </div>

              <input
                className="wl-input"
                placeholder="Note (optional, e.g. felt strong today)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />

              <button type="submit" className="wl-btn-primary">
                Log Set 🚀
              </button>
            </form>
          </section>

          {/* ── Category Filter ── */}
          {entries.length > 0 && (
            <div className="wl-filter-row">
              <button
                className={`wl-filter-btn ${filterCat === 'All' ? 'active' : ''}`}
                onClick={() => setFilterCat('All')}
              >
                All ({entries.length})
              </button>
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <button
                  key={cat}
                  className={`wl-filter-btn ${filterCat === cat ? 'active' : ''}`}
                  style={filterCat === cat ? { background: CATEGORY_COLORS[cat]?.bg, borderColor: CATEGORY_COLORS[cat]?.border } : {}}
                  onClick={() => setFilterCat(cat)}
                >
                  {cat} ({count})
                </button>
              ))}
            </div>
          )}

          {/* ── Entry List ── */}
          <section className="wl-card">
            <h2 className="wl-section-title">📋 Today&apos;s Progress</h2>
            {filtered.length === 0 ? (
              <div className="wl-empty">
                <span className="wl-empty-icon">🏋️</span>
                <p>{entries.length === 0 ? 'No lifts logged yet. Get to it!' : `No ${filterCat} exercises logged yet.`}</p>
              </div>
            ) : (
              <ul className="wl-list">
                {filtered.map((item) => {
                  const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
                  return (
                    <li
                      key={item.id}
                      className="wl-entry"
                      style={{ background: colors.bg, borderLeft: `4px solid ${colors.badge}` }}
                    >
                      <div className="wl-entry-main">
                        <div className="wl-entry-top">
                          <strong className="wl-entry-name">{item.name}</strong>
                          <span
                            className="wl-badge"
                            style={{ background: colors.badge }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <div className="wl-entry-stats">
                          <span>🔢 {item.sets} sets × {item.reps} reps</span>
                          {item.weight && (
                            <span>⚖️ {item.weight} lbs
                              {' '}<span className="wl-volume">({(item.sets * item.reps * item.weight).toLocaleString()} lbs vol)</span>
                            </span>
                          )}
                        </div>
                        {item.note && <p className="wl-entry-note">💬 {item.note}</p>}
                      </div>
                      <button
                        className="wl-delete-btn"
                        onClick={() => removeEntry(item.id)}
                        aria-label={`Remove ${item.name}`}
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === 'history' && (
        <section className="wl-card wl-history-card">
          <h2 className="wl-section-title">🗓️ Exercise History</h2>
          {historyByDate.length === 0 ? (
            <div className="wl-empty">
              <span className="wl-empty-icon">📭</span>
              <p>No history yet. Log some exercises to get started!</p>
            </div>
          ) : (
            historyByDate.map(([date, dayEntries]) => (
              <div key={date} className="wl-history-group">
                <div className="wl-history-date">{date}</div>
                <ul className="wl-list">
                  {dayEntries.map((item) => {
                    const colors = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.Other;
                    return (
                      <li
                        key={item.id}
                        className="wl-entry"
                        style={{ background: colors.bg, borderLeft: `4px solid ${colors.badge}` }}
                      >
                        <div className="wl-entry-main">
                          <div className="wl-entry-top">
                            <strong className="wl-entry-name">{item.name}</strong>
                            <span className="wl-badge" style={{ background: colors.badge }}>
                              {item.category}
                            </span>
                          </div>
                          <div className="wl-entry-stats">
                            <span>🔢 {item.sets} sets × {item.reps} reps</span>
                            {item.weight && (
                              <span>⚖️ {item.weight} lbs
                                {' '}<span className="wl-volume">({(item.sets * item.reps * item.weight).toLocaleString()} lbs vol)</span>
                              </span>
                            )}
                          </div>
                          {item.note && <p className="wl-entry-note">💬 {item.note}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="wl-footer">
        <p>Target: 165 lbs · Goal: Progressive Overload 🎯</p>
      </footer>

      {/* ── Bottom Tab Bar ── */}
      <nav className="wl-bottom-nav">
        <button
          className={`wl-nav-btn${activeTab === 'log' ? ' active' : ''}`}
          onClick={() => setActiveTab('log')}
        >
          <span className="wl-nav-icon">📋</span>
          <span className="wl-nav-label">Log</span>
        </button>
        <button
          className={`wl-nav-btn${activeTab === 'history' ? ' active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <span className="wl-nav-icon">🗓️</span>
          <span className="wl-nav-label">History</span>
        </button>
      </nav>
    </div>
  );
}
