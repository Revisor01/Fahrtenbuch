import React from 'react';

// Leerer Zustand nach Design-Spec (Redesign 2026):
// gestrichelter Rahmen --line-strong, --r-btn, 28/20px Padding, zentriert,
// Icon-Fläche 44px --brand-soft, Titel 16px/600, Satz 14px --text-2,
// Primärbutton 48px. Text konkret, nie „Keine Daten vorhanden".
//
// Props: icon (ReactNode), title, text, actionLabel, onAction

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
