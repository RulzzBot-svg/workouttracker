import { useState, useMemo, useEffect } from 'react';
import { DAYS_OF_WEEK, EXERCISE_LIST, CATEGORY_COLORS } from './constants';
import DayColumn from './DayColumn';
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

export default function DailySplit() {
  const [weeklySplit, setWeeklySplit] = useState(
    () => storageGet('wl-weekly-split', DEFAULT_WEEKLY_SPLIT)
  );
  const [activeDay, setActiveDay] = useState(todayDayName);
  const [search, setSearch] = useState('');

  useEffect(() => { storageSet('wl-weekly-split', weeklySplit); }, [weeklySplit]);

  const todayName = todayDayName();

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
