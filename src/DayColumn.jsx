import { CATEGORY_COLORS } from './constants';
import './DailySplit.css';

export default function DayColumn({ day, type, exercises, onToggleType, onRemoveExercise }) {
  return (
    <div className="dc-container">
      <div className="dc-header">
        <div className="dc-title-row">
          <h3 className="dc-day-name">{day}</h3>
          <span className={`dc-type-badge ${type === 'Rest' ? 'dc-rest' : 'dc-workout'}`}>
            {type === 'Rest' ? '😴 Rest Day' : '💪 Workout'}
          </span>
        </div>
        <button className="dc-toggle-btn" onClick={onToggleType}>
          {type === 'Rest' ? 'Switch to Workout' : 'Switch to Rest Day'}
        </button>
      </div>

      {type === 'Rest' ? (
        <div className="dc-rest-message">
          <span className="dc-rest-icon">🛌</span>
          <p className="dc-rest-title">Recovery / Off Day</p>
          <p className="dc-rest-subtitle">Rest up — your muscles grow while you recover!</p>
        </div>
      ) : (
        <div className="dc-exercises">
          {exercises.length === 0 ? (
            <div className="dc-empty">
              <span className="dc-empty-icon">🔍</span>
              <p>Search for exercises above to build your plan.</p>
            </div>
          ) : (
            <ul className="dc-exercise-list">
              {exercises.map((ex) => {
                const colors = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.Other;
                return (
                  <li
                    key={ex.id}
                    className="dc-exercise-item"
                    style={{ borderLeft: `3px solid ${colors.badge}` }}
                  >
                    <span className="dc-exercise-name">{ex.name}</span>
                    <span
                      className="dc-exercise-cat"
                      style={{
                        background: colors.bg,
                        color: colors.badge,
                        border: `1px solid ${colors.border}`,
                      }}
                    >
                      {ex.category}
                    </span>
                    <button
                      className="dc-remove-btn"
                      onClick={() => onRemoveExercise(ex.id)}
                      aria-label={`Remove ${ex.name}`}
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
