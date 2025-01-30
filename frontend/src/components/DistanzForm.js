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
    <div className="mb-4">
    <div className="card-container-highlight">
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
    <div className="w-full sm:flex-1">
    <select
    value={vonOrtId}
    onChange={(e) => setVonOrtId(e.target.value)}
    className="form-select"
    required
    >
    <option value="">Von Ort auswählen</option>
    {renderOrteOptions(orte)}
    </select>
    </div>
    
    <div className="w-full sm:flex-1">
    <select
    value={nachOrtId}
    onChange={(e) => setNachOrtId(e.target.value)}
    className="form-select"
    required
    >
    <option value="">Nach Ort auswählen</option>
    {renderOrteOptions(orte)}
    </select>
    </div>
    
    <div className="w-full sm:w-36">
    <input
    type="number"
    value={distanz}
    onChange={(e) => setDistanz(e.target.value)}
    placeholder="km"
    className="form-input"
    required
    />
    </div>
    
    <button type="submit" className="btn-primary">
    {existingDistanz ? 'Aktualisieren' : 'Hinzufügen'}
    </button>
    </form>
    </div>
    </div>
  );
}

export default DistanzForm;