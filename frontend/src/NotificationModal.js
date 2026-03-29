import React from 'react';

function NotificationModal({ isOpen, onClose, title, message, onConfirm, showCancel = false, confirmLabel, onSecondAction, secondLabel, onThirdAction, thirdLabel }) {
  if (!isOpen) return null;

  const hasMultipleActions = onSecondAction || onThirdAction;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="card-container p-6 rounded-lg shadow-lg max-w-sm mx-4" onClick={e => e.stopPropagation()}>
    {title && <h3 className="text-lg font-medium text-value mb-2">{title}</h3>}
    <p className="mb-4 text-label">{message}</p>
    <div className="flex flex-wrap gap-2">
    {hasMultipleActions ? (
      <>
        <button
        onClick={() => { onConfirm?.(); onClose(); }}
        className="btn-primary flex-1"
        >
        {confirmLabel || 'OK'}
        </button>
        {onSecondAction && (
          <button
          onClick={() => { onSecondAction(); onClose(); }}
          className="btn-secondary flex-1"
          >
          {secondLabel || 'Option 2'}
          </button>
        )}
        {onThirdAction && (
          <button
          onClick={() => { onThirdAction(); onClose(); }}
          className="btn-secondary flex-1"
          >
          {thirdLabel || 'Option 3'}
          </button>
        )}
        <button
        onClick={onClose}
        className="w-full text-sm text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-400 transition-colors py-2"
        >
        Abbrechen
        </button>
      </>
    ) : (
      <>
        <button
        onClick={() => { onConfirm?.(); onClose(); }}
        className="btn-primary w-full"
        >
        {confirmLabel || 'OK'}
        </button>
        {showCancel && (
          <button
          onClick={onClose}
          className="w-full text-sm text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-400 transition-colors py-2"
          >
          Abbrechen
          </button>
        )}
      </>
    )}
    </div>
    </div>
    </div>
  );
}

export default NotificationModal;
