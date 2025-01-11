import React from 'react';
import Modal from './Modal';

function NotificationModal({ isOpen, onClose, message, onConfirm, showCancel = false }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4" onClick={e => e.stopPropagation()}>
    <p className="mb-4 text-primary-900">{message}</p>
    <div className="flex gap-2">
    {showCancel && (
      <button
      onClick={onClose}
      className="btn-secondary w-full"
      >
      Abbrechen
      </button>
    )}
    <button
    onClick={() => {
      onConfirm?.();
      onClose();
    }}
    className="btn-primary w-full"
    >
    OK
    </button>
    </div>
    </div>
    </div>
  );
}

export default NotificationModal;