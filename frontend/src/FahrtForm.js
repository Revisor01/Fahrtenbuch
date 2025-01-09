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
  
  // InfoButton Komponente
  const InfoButton = ({ onClick, tooltip, show }) => (
    <div className="relative">
    <button
    type="button"
    className="text-primary-400 hover:text-primary-500 transition-colors"
    onClick={onClick}
    >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
    </button>
    {show && (
      <div className="absolute z-10 w-64 p-3 mt-1 text-sm bg-white rounded-lg shadow-lg border border-primary-100 right-0">
      {tooltip}
      </div>
    )}
    </div>
  );
  
  // KilometerWarningModal Komponente
  const KilometerWarningModal = ({ show, onConfirm, onCancel }) => {
    if (!show) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md mx-4">
      <p className="text-primary-900">
      Es existiert bereits eine berechnete Strecke. Möchten Sie wirklich manuell Kilometer eintragen?
      </p>
      <div className="mt-4 flex justify-end gap-3">
      <button 
      onClick={onConfirm}
      className="bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 transition-colors duration-200"
      >
      Ja
      </button>
      <button 
      onClick={onCancel}
      className="bg-primary-100 text-primary-700 px-4 py-2 rounded hover:bg-primary-200 transition-colors duration-200"
      >
      Nein
      </button>
      </div>
      </div>
      </div>
    );
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <input
    type="date"
    name="datum"
    value={formData.datum}
    onChange={handleChange}
    className="form-input"
    required
    />
    <input
    type="text"
    name="anlass"
    value={formData.anlass}
    onChange={handleChange}
    placeholder="Anlass"
    className="form-input"
    required
    />
    <input
    type="number"
    name="manuelleKilometer"
    value={formData.manuelleKilometer}
    onChange={handleManuelleKilometerChange}
    onFocus={handleKilometerFocus}
    placeholder="km"
    className="form-input"
    required={useEinmaligenVonOrt || useEinmaligenNachOrt}
    disabled={formData.autosplit || (isKilometerLocked && !useEinmaligenVonOrt && !useEinmaligenNachOrt)}
    />
    <select
    name="abrechnung"
    value={formData.abrechnung}
    onChange={handleChange}
    className="form-select"
    disabled={formData.autosplit}
    >
    <option value="Kirchenkreis">Kirchenkreis</option>
    <option value="Gemeinde">Gemeinde</option>
    <option value="Autosplit">Autosplit</option>
    </select>
    </div>
    
    {/* Zweite Zeile: Ortsauswahl */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {/* Von-Ort */}
    <div className="space-y-2">
    <label className="flex items-center text-sm text-primary-900">
    <input
    type="checkbox"
    checked={useEinmaligenVonOrt}
    onChange={(e) => setUseEinmaligenVonOrt(e.target.checked)}
    className="mr-2 text-primary-500"
    />
    Einmaliger Von-Ort
    </label>
    {useEinmaligenVonOrt ? (
      <input
      type="text"
      name="einmaligerVonOrt"
      value={formData.einmaligerVonOrt}
      onChange={handleChange}
      placeholder="Von (einmalig)"
      className="form-input"
      required
      />
    ) : (
      <select
      name="vonOrtId"
      value={formData.vonOrtId}
      onChange={handleChange}
      className="form-select"
      required
      >
      <option value="">Von</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    {/* Nach-Ort */}
    <div className="space-y-2">
    <label className="flex items-center text-sm text-primary-900">
    <input
    type="checkbox"
    checked={useEinmaligenNachOrt}
    onChange={(e) => setUseEinmaligenNachOrt(e.target.checked)}
    className="mr-2 text-primary-500"
    />
    Einmaliger Nach-Ort
    </label>
    {useEinmaligenNachOrt ? (
      <input
      type="text"
      name="einmaligerNachOrt"
      value={formData.einmaligerNachOrt}
      onChange={handleChange}
      placeholder="Nach (einmalig)"
      className="form-input"
      required
      />
    ) : (
      <select
      name="nachOrtId"
      value={formData.nachOrtId}
      onChange={handleChange}
      className="form-select"
      required
      >
      <option value="">Nach</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    </div>
    
    {/* Dritte Zeile: Optionen */}
    <div className="flex flex-wrap gap-6 items-center">
    {/* Autosplit Option */}
    <div className="flex items-center gap-2">
    <label className="flex items-center">
    <input
    type="checkbox"
    name="autosplit"
    checked={formData.autosplit}
    onChange={handleChange}
    className="mr-2 text-primary-500"
    disabled={useEinmaligenVonOrt || useEinmaligenNachOrt}
    />
    <span className="text-sm text-primary-900">via Dienstort</span>
    </label>
    <InfoButton
    onClick={() => setShowAutosplitInfo(!showAutosplitInfo)}
    tooltip="Bei Aktivierung wird die Fahrt über den Dienstort geleitet. Die Strecke zum Dienstort wird über den Kirchenkreis abgerechnet, die restliche Strecke über die Gemeinde."
    show={showAutosplitInfo}
    />
    </div>
    
    {/* Rückfahrt Option */}
    <div className="flex items-center gap-2">
    <label className="flex items-center">
    <input
    type="checkbox"
    checked={addRueckfahrt}
    onChange={(e) => setAddRueckfahrt(e.target.checked)}
    className="mr-2 text-primary-500"
    />
    <span className="text-sm text-primary-900">Rückfahrt</span>
    </label>
    <InfoButton
    onClick={() => setShowRueckfahrtInfo(!showRueckfahrtInfo)}
    tooltip="Bei Aktivierung wird automatisch eine Rückfahrt mit umgekehrter Strecke hinzugefügt."
    show={showRueckfahrtInfo}
    />
    </div>
    </div>
    
    {/* Vierte Zeile: Mitfahrer und Aktionen */}
    <div className="space-y-4">
    <div className="flex flex-wrap gap-3">
    <button
    type="button"
    onClick={() => setShowMitfahrerModal(true)}
    className="bg-primary-400 text-white px-4 h-9 rounded hover:bg-primary-500 transition-colors duration-200 text-sm shadow-sm"
    >
    Mitfahrer:in hinzufügen
    </button>
    <button 
    type="submit" 
    className="bg-primary-500 text-white px-6 h-9 rounded hover:bg-primary-600 transition-colors duration-200 text-sm shadow-sm"
    >
    Fahrt hinzufügen
    </button>
    </div>
    
    {/* Mitfahrer Liste */}
    {mitfahrer.length > 0 && (
      <div className="flex flex-wrap gap-2">
      {mitfahrer.map((person, index) => (
        <span
        key={index}
        className="bg-primary-100 rounded-full px-3 py-1.5 text-sm font-medium text-primary-700 flex items-center gap-2"
        onClick={() => handleEditMitfahrer(index)}
        >
        <span className="cursor-pointer">👤 {person.name}</span>
        <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteMitfahrer(index);
        }}
        className="text-secondary-500 hover:text-secondary-600"
        >
        ×
        </button>
        </span>
      ))}
      </div>
    )}
    </div>
    
    {/* Fünfte Zeile: Berechnete Informationen */}
    {kalkulierteStrecke !== null && (
      <div className="p-4 bg-primary-50 rounded-lg text-primary-900">
      <div className="font-medium text-sm">
      Kalkulierte Strecke: {kalkulierteStrecke} km
      </div>
      {formData.autosplit && (
        <div className="text-sm mt-1">
        Via Dienstort: Kirchenkreis: {autosplitInfo.kirchenkreis} km | Gemeinde: {autosplitInfo.gemeinde} km
        </div>
      )}
      </div>
    )}
    </form>
    </div>
    
    {/* Modals */}
    <MitfahrerModal {...mitfahrerModalProps} />
    <KilometerWarningModal 
    show={showKilometerWarning}
    onConfirm={unlockKilometerField}
    onCancel={() => {
      setShowKilometerWarning(false);
      setFormData(prev => ({ ...prev, manuelleKilometer: kalkulierteStrecke.toString() }));
    }}
    />
    </div>
  );
}

export default FahrtForm;