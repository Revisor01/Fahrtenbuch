import React from 'react';

// Leerer Zustand mit konkretem Text, nie „Keine Daten vorhanden“. Props: icon, title, text, actionLabel, onAction

function EmptyState({ icon, title, text, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {text && <p className="empty-state-text">{text}</p>}
      {actionLabel && onAction && (
        <button type="button" className="btn-primary mt-2" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default EmptyState;
