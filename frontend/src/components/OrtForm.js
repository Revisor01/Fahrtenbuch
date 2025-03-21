import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { renderOrteOptions } from '../utils';

function OrtForm() {
  const { orte, addOrt, showNotification } = useContext(AppContext);
  const [name, setName] = useState('');
  const [adresse, setAdresse] = useState('');
  const [istWohnort, setIstWohnort] = useState(false);
  const [istDienstort, setIstDienstort] = useState(false);
  const [istKirchspiel, setIstKirchspiel] = useState(false);
  const [ortTyp, setOrtTyp] = useState('');
  const hasDienstort = orte.some(ort => ort.ist_dienstort);
  const hasWohnort = orte.some(ort => ort.ist_wohnort);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    addOrt({ name, adresse, istWohnort, istDienstort, istKirchspiel });
    setName('');
    setAdresse('');
    setIstWohnort(false);
    setIstDienstort(false);
    setIstKirchspiel(false);
    showNotification("Erfolg", "Der neue Ort wurde erfolgreich hinzugefügt.");
  };
  const sortedOrte = orte.sort((a, b) => a.name.localeCompare(b.name));
  
  return (
    <div className="space-y-6">
    <div className="card-container-highlight">
    <h3 className="text-lg font-medium text-value mb-4">Ort hinzufügen</h3>
    <p className="text-sm text-muted mb-6">
    Hier können Sie neue Orte für Ihre Fahrten anlegen. Für die Struktur der Orteauswahl ist es Hilfreich den Orten Label zuzuordnen: Dienstort, Heimatort, Kirchspiel. Diese werden im Auswahlfeld weiter oben angezeigt.
    </p>
    
    <form onSubmit={handleSubmit}>
    <div className="flex flex-col sm:flex-row gap-4">
    <div className="w-full sm:w-1/3">
    <label className="form-label">Name des Ortes</label>
    <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="form-input"
    placeholder="z.B. Meldorf"
    required
    />
    </div>
    <div className="w-full sm:w-1/3">
    <label className="form-label">Adresse</label>
    <input
    type="text"
    value={adresse}
    onChange={(e) => setAdresse(e.target.value)}
    className="form-input"
    placeholder="Vollständige Adresse"
    required
    />
    </div>
    <div className="w-full sm:w-1/4">
    <label className="form-label">Art des Ortes</label>
    <select
    value={ortTyp}
    onChange={(e) => {
      const value = e.target.value;
      setOrtTyp(value);
      setIstWohnort(value === 'wohnort');
      setIstDienstort(value === 'dienstort');
      setIstKirchspiel(value === 'kirchspiel');
    }}
    className="form-select"
    >
    <option value="">Bitte wählen</option>
    {!hasWohnort && <option value="wohnort">Wohnort</option>}
    <option value="dienstort">Dienstort</option>
    <option value="kirchspiel">Kirchspiel</option>
    <option value="none">Sonstiger Ort</option>
    </select>
    </div>
    <div className="flex items-end w-full sm:w-auto">
    <button type="submit" className="btn-primary w-full sm:w-auto">
    Hinzufügen
    </button>
    </div>
    </div>
    </form>
    </div>
    </div>
  );
}

export default OrtForm;