import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { renderOrteOptions } from '../utils';

function DistanzForm() {
  const { orte, addDistanz, distanzen, showNotification } = useContext(AppContext);
  const [vonOrtId, setVonOrtId] = useState('');
  const [nachOrtId, setNachOrtId] = useState('');
  const [distanz, setDistanz] = useState('');
  const [existingDistanz, setExistingDistanz] = useState(null);
  
  useEffect(() => {
    if (vonOrtId && nachOrtId) {
      const existing = distanzen.find(d => 
        (d.von_ort_id === parseInt(vonOrtId) && d.nach_ort_id === parseInt(nachOrtId)) ||
        (d.von_ort_id === parseInt(nachOrtId) && d.nach_ort_id === parseInt(vonOrtId))
      );
      setExistingDistanz(existing);
      if (existing) {
        setDistanz(existing.distanz.toString());
      } else {
        setDistanz('');
      }
    } else {
      setExistingDistanz(null);
      setDistanz('');
    }
  }, [vonOrtId, nachOrtId, distanzen]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    addDistanz({ vonOrtId, nachOrtId, distanz: parseInt(distanz) });
    setVonOrtId('');
    setNachOrtId('');
    setDistanz('');
    setExistingDistanz(null);
    showNotification("Erfolg", "Die neue Distanz wurde erfolgreich hinzugefügt.");
  };
  
  const sortedOrte = orte.sort((a, b) => a.name.localeCompare(b.name));
  
  return (
    <div className="space-y-6">
    <div className="card-container-highlight">
    <h3 className="text-lg font-medium text-value mb-4">Distanz hinzufügen</h3>
    <p className="text-sm text-muted mb-6">
    Hier können Sie die Entfernungen zwischen zwei Orten festlegen. Die Distanzen werden automatisch 
    für beide Richtungen gespeichert und beim Anlegen neuer Fahrten verwendet.
    </p>
    
    <form onSubmit={handleSubmit}>
    <div className="flex flex-col sm:flex-row gap-4 w-full">
    <div className="w-full sm:w-1/3">
    <label className="form-label">Von</label>
    <select
    value={vonOrtId}
    onChange={(e) => setVonOrtId(e.target.value)}
    className="form-select"
    required
    >
    <option value="">Ort auswählen</option>
    {renderOrteOptions(orte)}
    </select>
    </div>
    
    <div className="w-full sm:w-1/3">
    <label className="form-label">Nach</label>
    <select
    value={nachOrtId}
    onChange={(e) => setNachOrtId(e.target.value)}
    className="form-select"
    required
    >
    <option value="">Ort auswählen</option>
    {renderOrteOptions(orte)}
    </select>
    </div>
    
    <div className="w-full sm:w-1/6">
    <label className="form-label">Kilometer</label>
    <input
    type="number"
    value={distanz}
    onChange={(e) => setDistanz(e.target.value)}
    placeholder="km"
    className="form-input"
    required
    />
    </div>
    
    <div className="flex items-end w-full sm:w-auto">
    <button type="submit" className="btn-primary w-full">
    {existingDistanz ? 'Aktualisieren' : 'Hinzufügen'}
    </button>
    </div>
    </div>
    </form>
    </div>
    </div>
  );
}

export default DistanzForm;