import React from 'react';
import Modal from './Modal';

function NotificationModal({ isOpen, onClose, title, message, onConfirm, showCancel = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="compact">
    <div className="bg-primary-25 p-6 rounded-lg space-y-6">
    <p className="text-primary-900">{message}</p>
    <div className="flex gap-4">
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
      onConfirm();
      onClose();
    }}
    className="btn-primary w-full"
    >
    OK
    </button>
    </div>
    </div>
    </Modal>
  );
}

export default NotificationModal;