import React, { useState, useContext } from 'react';
import Modal from './Modal';
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
  : abrechnungstraeger.find(t => t.id === traegerId)?.name || 'Unbekannt';
  
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

  const handleAbbrechenClick = (e) => {
    e.stopPropagation(); // Hinzugefügt: Stoppt die Event Propagation
    onClose();
  };

  const handleSpeichernClick = (e) => {
    e.stopPropagation(); // Hinzugefügt: Stoppt die Event Propagation
    handleSubmit(e);
  };
  
  return (
    <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={`${displayName} als ${aktion} markieren`}
    >
    <div className="table-container">
    <div className="bg-primary-25 p-6 rounded-lg space-y-6">
    <p className="text-sm text-primary-600">
    {getActionText()}
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
    
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={handleAbbrechenClick} // Geändert
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button
    type="submit"
    onClick={handleSpeichernClick} // Geändert
    className="btn-primary w-full"
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