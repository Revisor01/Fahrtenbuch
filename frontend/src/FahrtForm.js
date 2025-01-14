import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './App';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import axios from 'axios';

function FahrtForm() {
  const { orte, addFahrt, fetchMonthlyData, showNotification } = useContext(AppContext);
  const [showAutosplitInfo, setShowAutosplitInfo] = useState(false);
  const [mitfahrer, setMitfahrer] = useState([]);
  const [showMitfahrerModal, setShowMitfahrerModal] = useState(false);
  const [editingMitfahrerIndex, setEditingMitfahrerIndex] = useState(null);
  const [showRueckfahrtInfo, setShowRueckfahrtInfo] = useState(false);
  const [showKilometerWarning, setShowKilometerWarning] = useState(false);
  const [isKilometerLocked, setIsKilometerLocked] = useState(false);
  const [formData, setFormData] = useState({
    datum: '',
    vonOrtId: '',
    nachOrtId: '',
    einmaligerVonOrt: '',
    einmaligerNachOrt: '',
    anlass: '',
    manuelleKilometer: '',
    autosplit: false,
    abrechnung: 'Gemeinde'
  });
  const [kalkulierteStrecke, setKalkulierteStrecke] = useState(null);
  const [autosplitInfo, setAutosplitInfo] = useState({ kirchenkreis: 0, gemeinde: 0 });
  const [addRueckfahrt, setAddRueckfahrt] = useState(false);
  const [useEinmaligenVonOrt, setUseEinmaligenVonOrt] = useState(false);
  const [useEinmaligenNachOrt, setUseEinmaligenNachOrt] = useState(false);

  const API_BASE_URL = '/api';

  useEffect(() => {
    if (formData.vonOrtId && formData.nachOrtId && !useEinmaligenVonOrt && !useEinmaligenNachOrt) {
      fetchKalkulierteStrecke(formData.vonOrtId, formData.nachOrtId, formData.autosplit);
    } else {
      setKalkulierteStrecke(null);
      setAutosplitInfo({ kirchenkreis: 0, gemeinde: 0 });
    }
  }, [formData.vonOrtId, formData.nachOrtId, formData.autosplit, useEinmaligenVonOrt, useEinmaligenNachOrt]);
  
  useEffect(() => {
    if (kalkulierteStrecke !== null) {
      setFormData(prev => ({ ...prev, manuelleKilometer: kalkulierteStrecke.toString() }));
      setIsKilometerLocked(true);
    }
  }, [kalkulierteStrecke]);
  
  const handleManuelleKilometerChange = (e) => {
    setFormData(prev => ({ ...prev, manuelleKilometer: e.target.value }));
    setIsKilometerLocked(false);
  };
  
  const unlockKilometerField = () => {
    setIsKilometerLocked(false);
    setShowKilometerWarning(false);
  };
  
  const fetchKalkulierteStrecke = async (vonOrtId, nachOrtId, isAutosplit) => {
    try {
      if (isAutosplit) {
        const response = await axios.get(`${API_BASE_URL}/distanzen/autosplit`, {
          params: { vonOrtId, nachOrtId }
        });
        setKalkulierteStrecke(response.data.gesamt);
        setAutosplitInfo({
          kirchenkreis: response.data.kirchenkreis,
          gemeinde: response.data.gemeinde
        });
      } else {
        const response = await axios.get(`${API_BASE_URL}/distanzen/between`, {
          params: { vonOrtId, nachOrtId }
        });
        setKalkulierteStrecke(response.data.distanz);
        setAutosplitInfo({ kirchenkreis: 0, gemeinde: 0 });
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der kalkulierten Strecke:', error);
      setKalkulierteStrecke(null);
      setAutosplitInfo({ kirchenkreis: 0, gemeinde: 0 });
    }
  };
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === 'autosplit') {
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        abrechnung: checked ? 'Autosplit' : 'Gemeinde'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };
  
  const handleKilometerFocus = () => {
    if (kalkulierteStrecke !== null && !formData.autosplit) {
      setShowKilometerWarning(true);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if ((useEinmaligenVonOrt || useEinmaligenNachOrt) && !formData.manuelleKilometer) {
      alert('Bitte geben Sie die Kilometer manuell ein, wenn Sie einen einmaligen Ort verwenden.');
      return;
    }
    
    const fahrtData = {
      datum: formData.datum,
      vonOrtId: useEinmaligenVonOrt ? null : parseInt(formData.vonOrtId),
      nachOrtId: useEinmaligenNachOrt ? null : parseInt(formData.nachOrtId),
      einmaligerVonOrt: useEinmaligenVonOrt ? formData.einmaligerVonOrt : null,
      einmaligerNachOrt: useEinmaligenNachOrt ? formData.einmaligerNachOrt : null,
      anlass: formData.anlass,
      kilometer: formData.manuelleKilometer ? parseFloat(formData.manuelleKilometer) : kalkulierteStrecke,
      autosplit: formData.autosplit,
      abrechnung: formData.abrechnung,
      mitfahrer: mitfahrer.filter(m => m.richtung === 'hin' || m.richtung === 'hin_rueck')
    };
    
    try {
      await addFahrt(fahrtData);
      
      if (addRueckfahrt) {
        const rueckfahrtData = {
          ...fahrtData,
          vonOrtId: fahrtData.nachOrtId,
          nachOrtId: fahrtData.vonOrtId,
          einmaligerVonOrt: fahrtData.einmaligerNachOrt,
          einmaligerNachOrt: fahrtData.einmaligerVonOrt,
          anlass: `Rückfahrt: ${fahrtData.anlass}`,
          mitfahrer: mitfahrer.filter(m => m.richtung === 'rueck' || m.richtung === 'hin_rueck')
        };
        await addFahrt(rueckfahrtData);
      }
      
      // Reset form data and states
      setFormData({
        datum: '',
        vonOrtId: '',
        nachOrtId: '',
        einmaligerVonOrt: '',
        einmaligerNachOrt: '',
        anlass: '',
        manuelleKilometer: '',
        autosplit: false,
        abrechnung: 'Gemeinde'
      });
      setUseEinmaligenVonOrt(false);
      setUseEinmaligenNachOrt(false);
      setKalkulierteStrecke(null);
      setAutosplitInfo({ kirchenkreis: 0, gemeinde: 0 });
      setAddRueckfahrt(false);
      fetchMonthlyData();
      setMitfahrer([]);
      showNotification("Erfolg", "Die neue Fahrt wurde erfolgreich hinzugefügt.");
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Fahrt:', error);
      showNotification("Fehler", "Beim Hinzufügen der Fahrt ist ein Fehler aufgetreten.");
    }
  };
  
  const handleAddMitfahrer = (newMitfahrer) => {
    if (editingMitfahrerIndex !== null) {
      const updatedMitfahrer = [...mitfahrer];
      updatedMitfahrer[editingMitfahrerIndex] = newMitfahrer;
      setMitfahrer(updatedMitfahrer);
      setEditingMitfahrerIndex(null);
    } else {
      setMitfahrer([...mitfahrer, newMitfahrer]);
    }
    setShowMitfahrerModal(false);
  };
  
  const handleEditMitfahrer = (index) => {
    setEditingMitfahrerIndex(index);
    setShowMitfahrerModal(true);
  };
  
  const handleDeleteMitfahrer = (index) => {
    const updatedMitfahrer = mitfahrer.filter((_, i) => i !== index);
    setMitfahrer(updatedMitfahrer);
  };

  return (
    <div className="table-container">
    <div className="bg-primary-25 p-6">
    <form onSubmit={handleSubmit} className="space-y-6">
    {/* Erste Zeile: Basis-Informationen */}
    <div className="flex flex-wrap gap-4">
    <div className="w-full sm:w-32">  {/* Datum: feste Breite auf Desktop */}
    <label className="block mb-1 text-xs text-primary-600">Datum</label>
    <input
    type="date"
    name="datum"
    value={formData.datum}
    onChange={handleChange}
    className="form-input w-full h-8"
    required
    />
    </div>
    
    <div className="w-full sm:flex-1">  {/* Anlass: füllt restliche Breite */}
    <label className="block mb-1 text-xs text-primary-600">Anlass der Fahrt</label>
    <input
    type="text"
    name="anlass"
    value={formData.anlass}
    onChange={handleChange}
    placeholder="z.B. Dienstbesprechung, Hausbesuch..."
    className="form-input w-full h-8"
    required
    />
    </div>
    </div>
    
    {/* Zweite Zeile: Orte + KM + Abrechnung */}
    <div className="flex flex-wrap gap-4">
    <div className="w-full sm:flex-1 min-w-[240px]">
    <div className="flex justify-between mb-1">
    <label className="text-xs text-primary-600">Startort</label>
    <label className="flex items-center cursor-pointer">
    <input
    type="checkbox"
    checked={useEinmaligenVonOrt}
    onChange={(e) => setUseEinmaligenVonOrt(e.target.checked)}
    className="mr-2 text-primary-500"
    />
    <span className="text-xs text-primary-600">Einmaliger Ort</span>
    </label>
    </div>
    {useEinmaligenVonOrt ? (
      <input
      type="text"
      name="einmaligerVonOrt"
      value={formData.einmaligerVonOrt}
      onChange={handleChange}
      placeholder="Adresse eingeben"
      className="form-input w-full h-8"
      required
      />
    ) : (
      <select
      name="vonOrtId"
      value={formData.vonOrtId}
      onChange={handleChange}
      className="form-select w-full h-8"
      required
      >
      <option value="">Ort auswählen</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    <div className="w-full sm:flex-1 min-w-[240px]">
    <div className="flex justify-between mb-1">
    <label className="text-xs text-primary-600">Zielort</label>
    <label className="flex items-center cursor-pointer">
    <input
    type="checkbox"
    checked={useEinmaligenNachOrt}
    onChange={(e) => setUseEinmaligenNachOrt(e.target.checked)}
    className="mr-2 text-primary-500"
    />
    <span className="text-xs text-primary-600">Einmaliger Ort</span>
    </label>
    </div>
    {useEinmaligenNachOrt ? (
      <input
      type="text"
      name="einmaligerNachOrt"
      value={formData.einmaligerNachOrt}
      onChange={handleChange}
      placeholder="Adresse eingeben"
      className="form-input w-full h-8"
      required
      />
    ) : (
      <select
      name="nachOrtId"
      value={formData.nachOrtId}
      onChange={handleChange}
      className="form-select w-full h-8"
      required
      >
      <option value="">Ort auswählen</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    <div className="flex gap-4">
    <div className="w-1/2">
    <label className="block mb-1 text-xs text-primary-600">Kilometer</label>
    <input
    type="number"
    name="manuelleKilometer"
    value={formData.manuelleKilometer}
    onChange={handleManuelleKilometerChange}
    onFocus={handleKilometerFocus}
    placeholder="km"
    className="form-input w-full h-8"
    required={useEinmaligenVonOrt || useEinmaligenNachOrt}
    disabled={formData.autosplit || (isKilometerLocked && !useEinmaligenVonOrt && !useEinmaligenNachOrt)}
    step="1"
    />
    </div>
    <div className="w-1/2">
    <label className="block mb-1 text-xs text-primary-600">Abrechnung</label>
    <select
    name="abrechnung"
    value={formData.abrechnung}
    onChange={handleChange}
    className="form-select w-full h-8"
    disabled={formData.autosplit}
    >
    <option value="Kirchenkreis">Kirchenkreis</option>
    <option value="Gemeinde">Gemeinde</option>
    <option value="Autosplit">Autosplit</option>
    </select>
    </div>
    </div>
    
    {/* Dritte Zeile: Checkboxen und Buttons */}
    <div className="flex flex-wrap items-center gap-4">
    <label className="flex items-center">
    <input
    type="checkbox"
    name="autosplit"
    checked={formData.autosplit}
    onChange={handleChange}
    className="mr-2 text-primary-500"
    disabled={useEinmaligenVonOrt || useEinmaligenNachOrt}
    />
    <span className="text-xs text-primary-600">via Dienstort</span>
    </label>
    
    <label className="flex items-center">
    <input
    type="checkbox"
    checked={addRueckfahrt}
    onChange={(e) => setAddRueckfahrt(e.target.checked)}
    className="mr-2 text-primary-500"
    />
    <span className="text-xs text-primary-600">Rückfahrt anlegen</span>
    </label>
    
    <div className="flex gap-2 ml-auto">
    <button
    type="button"
    onClick={() => setShowMitfahrerModal(true)}
    className="bg-secondary-400 text-white px-4 h-8 rounded hover:bg-secondary-500 transition-colors duration-200 text-sm shadow-sm whitespace-nowrap"
    >
    Mitfahrer:in
    </button>
    <button 
    type="submit" 
    className="bg-primary-500 text-white px-4 h-8 rounded hover:bg-primary-600 transition-colors duration-200 text-sm shadow-sm whitespace-nowrap"
    >
    Speichern
    </button>
    </div>
    </div>
    
    {/* Mitfahrer Liste */}
    {mitfahrer.length > 0 && (
      <div className="flex flex-wrap gap-2">
      {mitfahrer.map((person, index) => (
        <span
        key={index}
        className="inline-flex items-center bg-primary-100 rounded px-2 h-6 text-sm text-primary-700"
        >
        {person.name}
        <button
        onClick={(e) => {
          e.preventDefault();
          handleDeleteMitfahrer(index);
        }}
        className="ml-2 text-secondary-500 hover:text-secondary-600"
        >
        ×
        </button>
        </span>
      ))}
      </div>
    )}
    
    {/* Kalkulierte Strecke */}
    {kalkulierteStrecke !== null && (
      <div className="text-sm text-primary-900">
      <span className="font-medium">Kalkulierte Strecke: {kalkulierteStrecke} km</span>
      {formData.autosplit && (
        <span className="ml-2">(Kirchenkreis: {autosplitInfo.kirchenkreis} km | Gemeinde: {autosplitInfo.gemeinde} km)</span>
      )}
      </div>
    )}
    </form>
    </div>
    </div>
    
    {/* Kilometer-Warnung Modal */}
    {showKilometerWarning && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
      <p className="text-primary-900">
      Es existiert bereits eine berechnete Strecke. Möchten Sie wirklich manuell Kilometer eintragen?
      </p>
      <div className="mt-4 flex justify-end gap-3">
      <button 
      onClick={unlockKilometerField}
      className="bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 transition-colors duration-200"
      >
      Ja
      </button>
      <button 
      onClick={() => {
        setShowKilometerWarning(false);
        setFormData(prev => ({ ...prev, manuelleKilometer: kalkulierteStrecke.toString() }));
      }}
      className="bg-primary-100 text-primary-700 px-4 py-2 rounded hover:bg-primary-200 transition-colors duration-200"
      >
      Nein
      </button>
      </div>
      </div>
      </div>
    )}
    
    {/* Mitfahrer Modal */}
    {showMitfahrerModal && (
      <MitfahrerModal
      isOpen={showMitfahrerModal}
      onClose={() => {
        setShowMitfahrerModal(false);
        setEditingMitfahrerIndex(null);
      }}
      onSave={handleAddMitfahrer}
      initialData={editingMitfahrerIndex !== null ? mitfahrer[editingMitfahrerIndex] : null}
      />
    )}
    </div>
  );
}

export default FahrtForm;