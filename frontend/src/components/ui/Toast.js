import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

// Toast-System nach Design-Spec (Redesign 2026):
// - Fläche --text, Text --bg (invertiert in beiden Modi)
// - links Statuskreis 22px (--ok bzw. --danger), Meldung 15px/600,
//   rechts Aktions-Button 16px/600 in --brand-strong
// - Einblenden translateY(12px)+opacity 300ms ease (Keyframe toast-in)
// - Standzeit 5 s; Toasts mit Aktion („Rückgängig") bleiben bis zum Klick
// - aria-live="polite"-Region, Aktion ist ein echter Button
//
// API: toast.success(msg, { undo: fn }) · toast.error(msg)
//      generisch: { actionLabel, onAction } für andere Aktionen als Rückgängig

const ToastContext = createContext(null);

let toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((variant, message, options = {}) => {
    const id = ++toastCounter;
    const onAction = options.undo || options.onAction || null;
    const actionLabel = options.undo ? 'Rückgängig' : options.actionLabel || null;
    setToasts((prev) => [...prev, { id, variant, message, actionLabel, onAction }]);
    // Standzeit 5 s; Toasts mit Aktion („Rückgängig") bekommen 8 s.
    // (Abweichung von der Spec „bis zum Klick": dauerhaft stehende Toasts
    // stapelten sich in der Praxis — User-Feedback vom 07.08.2026.)
    timers.current[id] = setTimeout(() => dismiss(id), onAction ? 8000 : 5000);
    return id;
  }, [dismiss]);

  const toast = useMemo(() => ({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    dismiss,
  }), [push, dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="toast"
            role="status"
            onClick={() => dismiss(t.id)}
          >
            <span
              className={`toast-status ${t.variant === 'error' ? 'toast-status-error' : 'toast-status-ok'}`}
              aria-hidden="true"
            >
              {t.variant === 'error' ? '!' : '✓'}
            </span>
            <span className="toast-message">{t.message}</span>
            {t.onAction && (
              <button
                type="button"
                className="toast-action"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(t.id);
                  t.onAction();
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast muss innerhalb von <ToastProvider> verwendet werden');
  }
  return ctx;
}
