import React, { useState, useEffect } from 'react';
import Modal from './Modal';

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
    <Modal 
    isOpen={isOpen} 
    onClose={onClose} 
    title={readOnly ? "Mitfahrer:in Details" : "Mitfahrer:in hinzufügen/bearbeiten"}
    >
    <div className="card-container-highlight space-y-6">
    <form onSubmit={handleSubmit} className="space-y-4">
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
    <label className="form-label">
    Richtung
    </label>
    <select
    value={richtung}
    onChange={(e) => setRichtung(e.target.value)}
    className="form-select"
    disabled={readOnly}
    >
    <option value="hin">Hin</option>
    <option value="rueck">Rück</option>
    <option value="hin_rueck">Hin & Rück</option>
    </select>
    </div>
    
    {!readOnly && (
      <div className="flex flex-row gap-2">
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
    )}
    </form>
    </div>
    </Modal>
  );
}

export default MitfahrerModal;