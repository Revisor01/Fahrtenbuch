import React from 'react';
import Modal from './Modal';

function NotificationModal({ isOpen, onClose, title, message, onConfirm, showCancel = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="mb-4">{message}</p>
      <div className="flex justify-end space-x-2">
        {showCancel && (
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          >
            Abbrechen
          </button>
        )}
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          OK
        </button>
      </div>
    </Modal>
  );
}

export default NotificationModal;