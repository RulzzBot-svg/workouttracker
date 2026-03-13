import { useState, useMemo, useEffect } from 'react';
import { DAYS_OF_WEEK, EXERCISE_LIST, CATEGORY_COLORS } from './constants';
import DayColumn from './DayColumn';
import { getSplits, createSplit, updateSplit, deleteSplit, activateSplit } from './api';
import './DailySplit.css';

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

const DEFAULT_WEEKLY_SPLIT = {
  Monday:    { type: 'Workout', exercises: [] },
  Tuesday:   { type: 'Workout', exercises: [] },
  Wednesday: { type: 'Workout', exercises: [] },
  Thursday:  { type: 'Workout', exercises: [] },
  Friday:    { type: 'Workout', exercises: [] },
  Saturday:  { type: 'Rest',    exercises: [] },
  Sunday:    { type: 'Rest',    exercises: [] },
};

// Returns today's name matching DAYS_OF_WEEK (Monday-first order)
const todayDayName = () => DAYS_OF_WEEK[(new Date().getDay() + 6) % 7];

// Convert DB split days array → weeklySplit map { Monday: { type, exercises }, ... }
const daysArrayToMap = (days) => {
  const map = { ...DEFAULT_WEEKLY_SPLIT };
  days.forEach((d) => {
    map[d.day_name] = {
      type: d.day_type,
      exercises: Array.isArray(d.exercises) ? d.exercises : [],
    };
  });
  return map;
};

// Convert weeklySplit map → array for API
const mapToDaysArray = (map) =>
  DAYS_OF_WEEK.map((day) => ({
    day_name: day,
    day_type: map[day]?.type ?? 'Workout',
    exercises: map[day]?.exercises ?? [],
  }));

export default function DailySplit({ onSplitSaved }) {
  // ── DB splits ──
  const [splits, setSplits] = useState([]);
  const [selectedSplitId, setSelectedSplitId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // ── Local draft split being edited ──
  const [weeklySplit, setWeeklySplit] = useState(
    () => storageGet('wl-weekly-split', DEFAULT_WEEKLY_SPLIT)
  );
  const [splitName, setSplitName] = useState('My Split');

  // ── UI state ──
  const [activeDay, setActiveDay] = useState(todayDayName);
  const [search, setSearch] = useState('');

  // Persist draft to localStorage
  useEffect(() => { storageSet('wl-weekly-split', weeklySplit); }, [weeklySplit]);

  const todayName = todayDayName();

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  // ── Load splits from DB on mount (inline to avoid stale-closure lint issues) ──
  useEffect(() => {
    let live = true;
    getSplits()
      .then((data) => {
        if (!live) return;
        setSplits(data);
        const active = data.find((s) => s.is_active) || data[0];
        if (active) {
          setSelectedSplitId(active.id);
          setSplitName(active.name);
          setWeeklySplit(daysArrayToMap(active.days));
        }
        setLoading(false);
      })
      .catch(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  // ── Refresh splits list (called after save/delete; keeps current selection) ──
  const refreshSplitsList = () => {
    getSplits()
      .then((data) => setSplits(data))
      .catch(() => {});
  };

  // ── Switch between saved splits ──
  const handleSelectSplit = (id) => {
    const split = splits.find((s) => s.id === Number(id));
    if (!split) return;
    setSelectedSplitId(split.id);
    setSplitName(split.name);
    setWeeklySplit(daysArrayToMap(split.days));
  };

  // ── Start a new (unsaved) split ──
  const handleNewSplit = () => {
    setSelectedSplitId(null);
    setSplitName('My Split');
    setWeeklySplit({ ...DEFAULT_WEEKLY_SPLIT });
  };

  // ── Save current split to DB ──
  const handleSave = async () => {
    if (!splitName.trim()) { showStatus('⚠️ Please give your split a name.'); return; }
    setSaving(true);
    try {
      const days = mapToDaysArray(weeklySplit);
      let saved;
      if (selectedSplitId) {
        saved = await updateSplit(selectedSplitId, { name: splitName.trim(), days });
      } else {
        saved = await createSplit({ name: splitName.trim(), days });
        setSelectedSplitId(saved.id);
      }
      // Activate on save
      await activateSplit(saved.id);
      showStatus('✅ Split saved!');
      refreshSplitsList();
      if (onSplitSaved) onSplitSaved();
    } catch {
      showStatus('❌ Could not save split – check server connection.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete the current split ──
  const handleDelete = async () => {
    if (!selectedSplitId) return;
    if (!window.confirm('Delete this split?')) return;
    try {
      await deleteSplit(selectedSplitId);
      setSelectedSplitId(null);
      setSplitName('My Split');
      setWeeklySplit({ ...DEFAULT_WEEKLY_SPLIT });
      showStatus('🗑️ Split deleted.');
      refreshSplitsList();
      if (onSplitSaved) onSplitSaved();
    } catch {
      showStatus('❌ Could not delete split.');
    }
  };

  // ── Local split editing ──
  const toggleDayType = (day) => {
    setWeeklySplit((prev) => ({
      ...prev,
      [day]: { ...prev[day], type: prev[day].type === 'Rest' ? 'Workout' : 'Rest' },
    }));
  };

  const addExercise = (day, exercise) => {
    setWeeklySplit((prev) => {
      const dayData = prev[day];
      if (dayData.exercises.some((ex) => ex.name === exercise.name)) return prev;
      return {
        ...prev,
        [day]: {
          ...dayData,
          exercises: [
            ...dayData.exercises,
            { ...exercise, id: `${day}-${exercise.name}-${Date.now()}` },
          ],
        },
      };
    });
  };

  const removeExercise = (day, exerciseId) => {
    setWeeklySplit((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        exercises: prev[day].exercises.filter((ex) => ex.id !== exerciseId),
      },
    }));
  };

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return EXERCISE_LIST.filter((ex) => ex.name.toLowerCase().includes(q)).slice(0, 8);
  }, [search]);

  const activeDayData = weeklySplit[activeDay] || DEFAULT_WEEKLY_SPLIT[activeDay];

  return (
    <div className="ds-container">
      {/* ── Split Selector + Controls ── */}
      <div className="ds-split-controls wl-card">
        <div className="ds-split-top">
          <div className="ds-split-name-row">
            <input
              className="wl-input ds-split-name-input"
              placeholder="Split name (e.g. PPL, Bro Split…)"
              value={splitName}
              onChange={(e) => setSplitName(e.target.value)}
              aria-label="Split name"
            />
          </div>
          <div className="ds-split-btn-row">
            {splits.length > 0 && (
              <select
                className="wl-select ds-split-picker"
                value={selectedSplitId ?? ''}
                onChange={(e) => handleSelectSplit(e.target.value)}
                aria-label="Switch saved split"
              >
                <option value="" disabled>Switch split…</option>
                {splits.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.is_active ? ' ★' : ''}
                  </option>
                ))}
              </select>
            )}
            <button className="wl-btn-secondary ds-new-btn" onClick={handleNewSplit}>
              ＋ New
            </button>
            <button
              className="wl-btn-primary ds-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : '💾 Save Split'}
            </button>
            {selectedSplitId && (
              <button className="wl-btn-danger ds-delete-btn" onClick={handleDelete}>
                🗑️
              </button>
            )}
          </div>
        </div>
        {statusMsg && <p className="ds-status-msg">{statusMsg}</p>}
        {loading && <p className="ds-status-msg">Loading splits…</p>}
      </div>

      {/* ── Day Tabs ── */}
      <div className="ds-day-tabs">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day}
            className={`ds-day-tab${activeDay === day ? ' active' : ''}${day === todayName ? ' today' : ''}`}
            onClick={() => setActiveDay(day)}
          >
            {day.slice(0, 3)}
          </button>
        ))}
      </div>

      {/* ── Exercise Search (only for workout days) ── */}
      {activeDayData.type === 'Workout' && (
        <div className="ds-search-section wl-card">
          <h2 className="wl-section-title">🔍 Search &amp; Add Exercises</h2>
          <div className="ds-search-wrap">
            <span className="ds-search-icon">🔍</span>
            <input
              className="ds-search-input wl-input"
              placeholder="e.g. Bench Press, Squat, Lateral Raises…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="ds-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {searchResults.length > 0 && (
            <ul className="ds-search-results">
              {searchResults.map((ex) => {
                const colors = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.Other;
                const alreadyAdded = activeDayData.exercises.some((e) => e.name === ex.name);
                return (
                  <li key={ex.name} className="ds-search-item">
                    <span className="ds-search-name">{ex.name}</span>
                    <span
                      className="ds-search-cat"
                      style={{
                        background: colors.bg,
                        color: colors.badge,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {ex.category}
                    </span>
                    <button
                      className={`ds-search-add${alreadyAdded ? ' ds-search-add-done' : ''}`}
                      onClick={() => { addExercise(activeDay, ex); setSearch(''); }}
                      disabled={alreadyAdded}
                      title={alreadyAdded ? 'Already in plan' : `Add ${ex.name} to ${activeDay}`}
                      aria-label={`Add ${ex.name} to ${activeDay}`}
                    >
                      {alreadyAdded ? '✓ Added' : '+ Add'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {search.trim() && searchResults.length === 0 && (
            <p className="ds-no-results">No exercises found for &quot;{search}&quot;</p>
          )}
        </div>
      )}

      {/* ── DayColumn ── */}
      <DayColumn
        day={activeDay}
        type={activeDayData.type}
        exercises={activeDayData.exercises}
        onToggleType={() => toggleDayType(activeDay)}
        onRemoveExercise={(id) => removeExercise(activeDay, id)}
      />
    </div>
  );
}
