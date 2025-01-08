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
  const inputClasses = "w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-400";
  const buttonClasses = "bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition-colors duration-200 text-sm";
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
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Fahrt hinzufügen</h2>
    <form onSubmit={handleSubmit} className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <div>
    <input
    type="date"
    name="datum"
    value={formData.datum}
    onChange={handleChange}
    className={inputClasses}
    required
    />
    </div>
    
    <div className="space-y-2">
    <div className="flex items-center space-x-2">
    <input
    type="checkbox"
    checked={useEinmaligenVonOrt}
    onChange={(e) => setUseEinmaligenVonOrt(e.target.checked)}
    className="text-blue-600"
    />
    <span className="text-sm text-gray-600">Einmaliger Von-Ort</span>
    </div>
    {useEinmaligenVonOrt ? (
      <input
      type="text"
      name="einmaligerVonOrt"
      value={formData.einmaligerVonOrt}
      onChange={handleChange}
      placeholder="Von (einmalig)"
      className={inputClasses}
      required
      />
    ) : (
      <select
      name="vonOrtId"
      value={formData.vonOrtId}
      onChange={handleChange}
      className={inputClasses}
      required
      >
      <option value="">Von</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    <div className="space-y-2">
    <div className="flex items-center space-x-2">
    <input
    type="checkbox"
    checked={useEinmaligenNachOrt}
    onChange={(e) => setUseEinmaligenNachOrt(e.target.checked)}
    className="text-blue-600"
    />
    <span className="text-sm text-gray-600">Einmaliger Nach-Ort</span>
    </div>
    {useEinmaligenNachOrt ? (
      <input
      type="text"
      name="einmaligerNachOrt"
      value={formData.einmaligerNachOrt}
      onChange={handleChange}
      placeholder="Nach (einmalig)"
      className={inputClasses}
      required
      />
    ) : (
      <select
      name="nachOrtId"
      value={formData.nachOrtId}
      onChange={handleChange}
      className={inputClasses}
      required
      >
      <option value="">Nach</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    <div className="space-y-2">
    <div className="flex flex-wrap gap-3">
    <label className="flex items-center space-x-2 text-sm text-gray-600">
    <input
    type="checkbox"
    name="autosplit"
    checked={formData.autosplit}
    onChange={handleChange}
    disabled={useEinmaligenVonOrt || useEinmaligenNachOrt}
    className="text-blue-600"
    />
    <span>via Dienstort</span>
    </label>
    <label className="flex items-center space-x-2 text-sm text-gray-600">
    <input
    type="checkbox"
    checked={addRueckfahrt}
    onChange={(e) => setAddRueckfahrt(e.target.checked)}
    className="text-blue-600"
    />
    <span>Rückfahrt</span>
    </label>
    </div>
    </div>
    </div>
    
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <input
    type="text"
    name="anlass"
    value={formData.anlass}
    onChange={handleChange}
    placeholder="Anlass"
    className={inputClasses}
    required
    />
    <input
    type="number"
    name="manuelleKilometer"
    value={formData.manuelleKilometer}
    onChange={handleManuelleKilometerChange}
    onFocus={handleKilometerFocus}
    placeholder="km"
    className={inputClasses}
    required={useEinmaligenVonOrt || useEinmaligenNachOrt}
    disabled={formData.autosplit || (isKilometerLocked && !useEinmaligenVonOrt && !useEinmaligenNachOrt)}
    />
    <select
    name="abrechnung"
    value={formData.abrechnung}
    onChange={handleChange}
    className={inputClasses}
    disabled={formData.autosplit}
    >
    <option value="Kirchenkreis">Kirchenkreis</option>
    <option value="Gemeinde">Gemeinde</option>
    <option value="Autosplit">Autosplit</option>
    </select>
    <button
    type="button"
    onClick={() => setShowMitfahrerModal(true)}
    className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 transition-colors duration-200 text-sm"
    >
    + Mitfahrer:in
    </button>
    </div>
    
    {kalkulierteStrecke !== null && (
      <div className="bg-blue-50 p-4 rounded-lg space-y-1">
      <div className="font-medium text-sm text-blue-700">
      Kalkulierte Strecke: {kalkulierteStrecke} km
      </div>
      {formData.autosplit && (
        <div className="text-sm text-blue-600">
        Via Dienstort: Kirchenkreis: {autosplitInfo.kirchenkreis} km | Gemeinde: {autosplitInfo.gemeinde} km
        </div>
      )}
      </div>
    )}
    
    <div className="flex flex-wrap gap-2 mt-2">
    {mitfahrer.map((person, index) => (
      <span
      key={index}
      className="inline-flex items-center bg-blue-100 rounded-full px-3 py-1 text-sm text-blue-700 cursor-pointer hover:bg-blue-200"
      onClick={() => handleEditMitfahrer(index)}
      >
      <span className="mr-1">👤 {person.name}</span>
      <button
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteMitfahrer(index);
      }}
      className="ml-1 text-red-500 hover:text-red-700"
      >
      ×
      </button>
      </span>
    ))}
    </div>
    
    <div className="flex justify-end mt-4">
    <button type="submit" className={buttonClasses}>
    Fahrt hinzufügen
    </button>
    </div>
    </form>
    
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
    
    {showKilometerWarning && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
      <p className="text-gray-700 mb-4">
      Es existiert bereits eine berechnete Strecke. Möchten Sie wirklich manuell Kilometer eintragen?
      </p>
      <div className="flex justify-end space-x-3">
      <button 
      onClick={unlockKilometerField} 
      className={`${buttonClasses} bg-blue-100 text-blue-700 hover:bg-blue-200`}
      >
      Ja
      </button>
      <button 
      onClick={() => {
        setShowKilometerWarning(false);
        setFormData(prev => ({ ...prev, manuelleKilometer: kalkulierteStrecke.toString() }));
      }} 
      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors duration-200 text-sm"
      >
      Nein
      </button>
      </div>
      </div>
      </div>
    )}
    </div>
  );
}

export default FahrtForm;