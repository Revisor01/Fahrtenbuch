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
    <p className="text-sm text-primary-600">
    {aktion === 'eingereicht' 
      ? `Wählen Sie das Datum aus, an dem die Fahrtkosten für ${typ} eingereicht wurden.`
      : aktion === 'erhalten'
      ? `Wählen Sie das Datum aus, an dem die Fahrtkosten für ${typ} erhalten wurden.`
      : 'Wählen Sie das entsprechende Datum aus.'
    }
    </p>
    
    <form onSubmit={handleSubmit} className="space-y-6">
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
    
    <div className="w-full">
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={onClose}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button
    type="submit"
    className="btn-primary w-full"
    >
    Speichern
    </button>
    </div>
    </div>
    </form>
    </div>
    </div>
    </Modal>
  );
}

export default AbrechnungsStatusModal;