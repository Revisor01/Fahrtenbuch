import React, { useState, useEffect } from 'react';
import Sheet from './components/ui/Sheet';

function MitfahrerModal({ isOpen, onClose, onSave, initialData, readOnly = false }) {
  const [name, setName] = useState(initialData?.name || '');
  const [arbeitsstaette, setArbeitsstaette] = useState(initialData?.arbeitsstaette || '');
  const [richtung, setRichtung] = useState(initialData?.richtung || 'hin');
  
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setArbeitsstaette(initialData.arbeitsstaette || '');
      setRichtung(initialData.richtung || 'hin');
    }
  }, [isOpen, initialData]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!readOnly) {
      onSave({ 
        ...initialData,
        name,
        arbeitsstaette,
        richtung
      });
    }
    onClose();
  };
  
  return (
    <Sheet
    isOpen={isOpen}
    onClose={onClose}
    title={readOnly ? 'Mitfahrer:in' : (initialData ? 'Mitfahrer:in bearbeiten' : 'Mitfahrer:in hinzufügen')}
    >
    <form onSubmit={handleSubmit} className="set-sheet-form">
    <div>
    <label className="form-label">
    Name
    </label>
    <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="form-input"
    required
    readOnly={readOnly}
    />
    </div>
    
    <div>
    <label className="form-label">
    Arbeitsstätte
    </label>
    <input
    type="text"
    value={arbeitsstaette}
    onChange={(e) => setArbeitsstaette(e.target.value)}
    className="form-input"
    required
    readOnly={readOnly}
    />
    </div>
    
    <div>
    <label className="form-label" htmlFor="mitfahrer-richtung">
    Mitgefahren
    </label>
    <select
    id="mitfahrer-richtung"
    value={richtung}
    onChange={(e) => setRichtung(e.target.value)}
    className="form-select"
    disabled={readOnly}
    >
    <option value="hin">Nur die Hinfahrt</option>
    <option value="rueck">Nur die Rückfahrt</option>
    <option value="hin_rueck">Hin- und Rückfahrt</option>
    </select>
    </div>
    
    {!readOnly && (
      <div className="set-sheet-buttons">
      <button type="button" onClick={onClose} className="btn-secondary">
      Abbrechen
      </button>
      <button type="submit" className="btn-primary">
      Speichern
      </button>
      </div>
    )}
    </form>
    </Sheet>
  );
}

export default MitfahrerModal;