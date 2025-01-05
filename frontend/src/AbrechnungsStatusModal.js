// AbrechnungsStatusModal.js (diese Komponente fehlt noch)
import React, { useState } from 'react';
import Modal from './Modal';

function AbrechnungsStatusModal({ isOpen, onClose, onSubmit, typ, aktion }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedDate);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${typ} als ${aktion} markieren`}
    >
      <form onSubmit={handleSubmit} className="p-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Datum
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </label>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Speichern
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default AbrechnungsStatusModal;