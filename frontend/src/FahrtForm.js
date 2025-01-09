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
    <div className="p-4 bg-gray-100 rounded-lg">
    <h2 className="text-lg font-semibold mb-4">Fahrt hinzufügen</h2>
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-lg">
    {/* Datum */}
    <div className="w-full sm:w-auto flex-shrink-0">
    <input
    type="date"
    name="datum"
    value={formData.datum}
    onChange={handleChange}
    className="w-32 p-1 border rounded text-sm"
    required
    />
    </div>
    
    {/* Von-Ort Auswahl */}
    <div className="w-full sm:w-60 flex-grow input-container">
    <label className="flex items-center mb-1 cursor-pointer">
    <input
    type="checkbox"
    checked={useEinmaligenVonOrt}
    onChange={(e) => setUseEinmaligenVonOrt(e.target.checked)}
    className="mr-2"
    />
    <span className={`text-sm ${useEinmaligenVonOrt ? 'font-bold' : ''}`}>Einmaliger Von-Ort</span>
    </label>
    {useEinmaligenVonOrt ? (
      <input
      type="text"
      name="einmaligerVonOrt"
      value={formData.einmaligerVonOrt}
      onChange={handleChange}
      placeholder="Von (einmalig)"
      className="w-full p-1 border rounded text-sm h-8"
      required
      />
    ) : (
      <select
      name="vonOrtId"
      value={formData.vonOrtId}
      onChange={handleChange}
      className="w-full p-1 border rounded text-sm h-8"
      required
      >
      <option value="">Von</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    {/* Nach-Ort Auswahl */}
    <div className="w-full sm:w-60 flex-grow input-container">
    <label className="flex items-center mb-1 cursor-pointer">
    <input
    type="checkbox"
    checked={useEinmaligenNachOrt}
    onChange={(e) => setUseEinmaligenNachOrt(e.target.checked)}
    className="mr-2"
    />
    <span className={`text-sm ${useEinmaligenNachOrt ? 'font-bold' : ''}`}>Einmaliger Nach-Ort</span>
    </label>
    {useEinmaligenNachOrt ? (
      <input
      type="text"
      name="einmaligerNachOrt"
      value={formData.einmaligerNachOrt}
      onChange={handleChange}
      placeholder="Nach (einmalig)"
      className="w-full p-1 border rounded text-sm h-8"
      required
      />
    ) : (
      <select
      name="nachOrtId"
      value={formData.nachOrtId}
      onChange={handleChange}
      className="w-full p-1 border rounded text-sm h-8"
      required
      >
      <option value="">Nach</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    {/* Autosplit und Rückfahrt Checkboxen */}
    <div className="flex items-center space-x-2">
    <label className="flex items-center">
    <input
    type="checkbox"
    name="autosplit"
    checked={formData.autosplit}
    onChange={handleChange}
    className="mr-1"
    disabled={useEinmaligenVonOrt || useEinmaligenNachOrt}
    />
    <span className="text-sm">via Dienstort</span>
    </label>
    <div className="relative">
    <button
    type="button"
    className="text-blue-500 hover:text-blue-700"
    onClick={() => setShowAutosplitInfo(!showAutosplitInfo)}
    >
    <span className="material-icons align-middle">info</span>
    </button>
    {showAutosplitInfo && (
      <div className="absolute z-10 w-64 p-2 mt-1 text-sm bg-white rounded-lg shadow-lg">
      Bei Aktivierung wird die Fahrt über den Dienstort geleitet. Die Strecke zum Dienstort wird über den Kirchenkreis abgerechnet, die restliche Strecke über die Gemeinde.
      </div>
    )}
    </div>
    <label className="flex items-center">
    <input
    type="checkbox"
    checked={addRueckfahrt}
    onChange={(e) => setAddRueckfahrt(e.target.checked)}
    className="mr-1"
    />
    <span className="text-sm">Rückfahrt</span>
    </label>
    <div className="relative">
    <button
    type="button"
    className="text-blue-500 hover:text-blue-700"
    onClick={() => setShowRueckfahrtInfo(!showRueckfahrtInfo)}
    >
    <span className="material-icons align-middle">info</span>
    </button>
    {showRueckfahrtInfo && (
      <div className="absolute z-10 w-64 p-2 mt-1 text-sm bg-white rounded-lg shadow-lg">
      Bei Aktivierung wird automatisch eine Rückfahrt mit umgekehrter Strecke hinzugefügt.
      </div>
    )}
    </div>
    </div>
    
    {/* Anlass */}
    <div className="w-full sm:w-60 flex-grow">
    <input
    type="text"
    name="anlass"
    value={formData.anlass}
    onChange={handleChange}
    placeholder="Anlass"
    className="w-full p-1 border rounded text-sm"
    required
    />
    </div>
    
    {/* Manuelle Kilometer */}
    <div className="w-24 flex-shrink-0">
    <input
    type="number"
    name="manuelleKilometer"
    value={formData.manuelleKilometer}
    onChange={handleManuelleKilometerChange}
    onFocus={handleKilometerFocus}
    placeholder="km"
    className="w-full p-1 border rounded text-sm"
    required={useEinmaligenVonOrt || useEinmaligenNachOrt}
    disabled={formData.autosplit || (isKilometerLocked && !useEinmaligenVonOrt && !useEinmaligenNachOrt)}
    />
    </div>
    
    {/* Abrechnung */}
    <div className="w-32 flex-shrink-0">
    <select
    name="abrechnung"
    value={formData.abrechnung}
    onChange={handleChange}
    className="w-full p-1 border rounded text-sm"
    disabled={formData.autosplit}
    >
    <option value="Kirchenkreis">Kirchenkreis</option>
    <option value="Gemeinde">Gemeinde</option>
    <option value="Autosplit">Autosplit</option>
    </select>
    </div>
    
    {/* Mitfahrer Button */}
    <div className="w-auto">
    <button
    type="button"
    onClick={() => setShowMitfahrerModal(true)}
    className="bg-green-500 text-white px-2 py-1 rounded text-sm"
    >
    <span className="material-icons align-middle">person_add</span>
    Mitfahrer:in
    </button>
    </div>
    
    {/* Spacer und Submit Button */}
    <div className="flex-grow"></div>
    <div className="w-auto">
    <button type="submit" className="bg-blue-500 text-white px-2 py-1 rounded text-sm">
    <span className="material-icons align-middle">add</span> Hinzufügen
    </button>
    </div>
    
    
    {/* Mitfahrer Anzeige */}
    <div className="w-full">
    <div className="flex flex-wrap mt-2">
    {mitfahrer.map((person, index) => (
      <span
      key={index}
      className="mr-1 cursor-pointer bg-blue-100 rounded-full px-2 py-1 text-sm font-semibold text-blue-700 flex items-center"
      onClick={() => handleEditMitfahrer(index)}
      >
      <span className="material-icons align-middle">person</span>
      {person.name}
      <button
      onClick={(e) => {
        e.stopPropagation();
        handleDeleteMitfahrer(index);
      }}
      className="ml-1 text-red-500 hover:text-red-700"
      >
      <span className="material-icons align-middle">close</span>
      </button>
      </span>
    ))}
    </div>
    </div>
    
    </form>
    
    <div className="mt-4 h-16">
    {kalkulierteStrecke !== null ? (
      <>
      <div className="font-bold text-sm">Kalkulierte Strecke: {kalkulierteStrecke} km</div>
      {formData.autosplit && (
        <div className="text-sm mt-1">
        Via Dienstort: Kirchenkreis: {autosplitInfo.kirchenkreis} km | Gemeinde: {autosplitInfo.gemeinde} km
        </div>
      )}
      </>
    ) : (
      <div className="text-sm text-gray-500">Keine Strecke kalkuliert</div>
    )}
    </div>
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded">
      <p>Es existiert bereits eine berechnete Strecke. Möchten Sie wirklich manuell Kilometer eintragen?</p>
      <div className="mt-4 flex justify-end space-x-2">
      <button
      onClick={unlockKilometerField}
      className="px-4 py-2 bg-blue-500 text-white rounded"
      >
      Ja
      </button>
      <button
      onClick={() => {
        setShowKilometerWarning(false);
        setFormData(prev => ({ ...prev, manuelleKilometer: kalkulierteStrecke.toString() }));
      }}
      className="px-4 py-2 bg-gray-300 rounded"
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