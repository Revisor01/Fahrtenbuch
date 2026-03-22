import React from 'react';

function NotificationModal({ isOpen, onClose, title, message, onConfirm, showCancel = false, confirmLabel, onSecondAction, secondLabel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="card-container p-6 rounded-lg shadow-lg max-w-sm mx-4" onClick={e => e.stopPropagation()}>
    {title && <h3 className="text-lg font-medium text-value mb-2">{title}</h3>}
    <p className="mb-4 text-label">{message}</p>
    <div className="flex gap-2">
    {showCancel && !onSecondAction && (
      <button
      onClick={onClose}
      className="btn-secondary w-full"
      >
      Abbrechen
      </button>
    )}
    {onSecondAction ? (
      <>
        <button
        onClick={() => {
          onConfirm?.();
          onClose();
        }}
        className="btn-primary w-full"
        >
        {confirmLabel || 'OK'}
        </button>
        <button
        onClick={() => {
          onSecondAction();
          onClose();
        }}
        className="btn-primary w-full"
        >
        {secondLabel || 'Option 2'}
        </button>
        <button
        onClick={() => {
          onConfirm?.();
          onSecondAction?.();
          onClose();
        }}
        className="btn-primary w-full"
        >
        Beide
        </button>
        <button
        onClick={onClose}
        className="btn-secondary w-full"
        >
        Abbrechen
        </button>
      </>
    ) : (
      <button
      onClick={() => {
        onConfirm?.();
        onClose();
      }}
      className="btn-primary w-full"
      >
      {confirmLabel || 'OK'}
      </button>
    )}
    </div>
    </div>
    </div>
  );
}

export default NotificationModal;
