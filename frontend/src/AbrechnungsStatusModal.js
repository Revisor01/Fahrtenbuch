import React, { useState, useContext } from 'react';
import Modal from './Modal';
import './index.css';
import { AppContext } from './App';

function AbrechnungsStatusModal({ isOpen, onClose, onSubmit, traegerId, aktion }) {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  const { abrechnungstraeger } = useContext(AppContext);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedDate);
    onClose();
  };
  
  // Bestimme den Anzeigenamen des Abrechnungsträgers
  const displayName = traegerId === 'mitfahrer' 
  ? 'Mitfahrer:innen' 
  : abrechnungstraeger.find(t => t.id === parseInt(traegerId))?.name || 'Unbekannt';
  
  // Text je nach Aktion
  const getActionText = () => {
    if (aktion === 'eingereicht') {
      return `Wählen Sie das Datum aus, an dem die Fahrtkosten für ${displayName} eingereicht wurden.`;
    }
    if (aktion === 'erhalten') {
      return `Wählen Sie das Datum aus, an dem die Fahrtkosten für ${displayName} erhalten wurden.`;
    }
    return 'Wählen Sie das entsprechende Datum aus.';
  };
  
  return (
    <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={`${displayName} als ${aktion} markieren`}
    preventOutsideClick={true}
    >
    <div className="card-container space-y-6">
    <p className="text-sm">
    {getActionText()}
    </p>
    
    <form onSubmit={handleSubmit} className="space-y-6">
    <div>
    <label className="block text-sm font-medium">
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
    </form>
    </div>
    </Modal>
  );
}

export default AbrechnungsStatusModal;