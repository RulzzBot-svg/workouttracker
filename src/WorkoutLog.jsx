import { useState, useMemo } from 'react';
import './WorkoutLog.css';

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

export default function WorkoutLog() {
  const [entries, setEntries] = useState([]);
  const [exercise, setExercise] = useState('');
  const [category, setCategory] = useState('Chest');
  const [sets, setSets]   = useState('');
  const [reps, setReps]   = useState('');
  const [weight, setWeight] = useState('');
  const [note, setNote]   = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
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

      {/* ── Footer ── */}
      <footer className="wl-footer">
        <p>Target: 165 lbs · Goal: Progressive Overload 🎯</p>
      </footer>
    </div>
  );
}
