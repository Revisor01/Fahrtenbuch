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
    <div className="table-container">
    <div className="bg-primary-25 p-6 rounded-lg space-y-6">
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="block text-sm font-medium text-primary-600">
    Datum
    </label>
    <input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    className="form-input"
    max={new Date().toISOString().split('T')[0]}
    required
    />
    </div>
    
    <div className="border-primary-200 pt-4 flex justify-end gap-2">
    <button
    type="button"
    onClick={onClose}
    className="btn-secondary"
    >
    Abbrechen
    </button>
    <button
    type="submit"
    className="btn-primary"
    >
    Speichern
    </button>
    </div>
    </form>
    </div>
    </div>
    </Modal>
  );
}

export default AbrechnungsStatusModal;