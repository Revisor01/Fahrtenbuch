import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './App';
import { renderOrteOptions } from './utils';
import axios from 'axios';

function FahrtForm() {
  const { orte, addFahrt, fetchMonthlyData } = useContext(AppContext);
  const [showAutosplitInfo, setShowAutosplitInfo] = useState(false);
  const [showRueckfahrtInfo, setShowRueckfahrtInfo] = useState(false);
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
    const dienstort = orte.find(ort => ort.ist_dienstort);
    if (dienstort) {
      setFormData(prev => ({ ...prev, vonOrtId: dienstort.id.toString() }));
    }
  }, [orte]);

  useEffect(() => {
    if (formData.vonOrtId && formData.nachOrtId && !useEinmaligenVonOrt && !useEinmaligenNachOrt) {
      fetchKalkulierteStrecke(formData.vonOrtId, formData.nachOrtId, formData.autosplit);
    } else {
      setKalkulierteStrecke(null);
      setAutosplitInfo({ kirchenkreis: 0, gemeinde: 0 });
    }
  }, [formData.vonOrtId, formData.nachOrtId, formData.autosplit, useEinmaligenVonOrt, useEinmaligenNachOrt]);

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
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'autosplit') {
      setFormData(prev => ({
        ...prev,
        abrechnung: checked ? 'Autosplit' : 'Gemeinde'
      }));
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
      abrechnung: formData.abrechnung
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
          anlass: `Rückfahrt: ${fahrtData.anlass}`
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
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Fahrt(en):', error);
      alert('Fehler beim Hinzufügen der Fahrt. Bitte versuchen Sie es erneut.');
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
    <h2 className="text-lg font-semibold mb-4">Fahrt hinzufügen</h2>
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center space-x-2 bg-gray-100 p-2 rounded-lg">
    <input
    type="date"
    name="datum"
    value={formData.datum}
    onChange={handleChange}
    className="w-32 p-1 border rounded text-sm"
    required
    />
    <div className="w-40">
    <div className="flex items-center mb-1">
    <input
    type="checkbox"
    checked={useEinmaligenVonOrt}
    onChange={(e) => setUseEinmaligenVonOrt(e.target.checked)}
    className="mr-2"
    />
    <span className="text-sm">Einmaliger Von-Ort</span>
    </div>
    {useEinmaligenVonOrt ? (
      <input
      type="text"
      name="einmaligerVonOrt"
      value={formData.einmaligerVonOrt}
      onChange={handleChange}
      placeholder="Von (einmalig)"
      className="w-full p-1 border rounded text-sm"
      required
      />
    ) : (
      <select
      name="vonOrtId"
      value={formData.vonOrtId}
      onChange={handleChange}
      className="w-full p-1 border rounded text-sm"
      required
      >
      <option value="">Von</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    <div className="w-40">
    <div className="flex items-center mb-1">
    <input
    type="checkbox"
    checked={useEinmaligenNachOrt}
    onChange={(e) => setUseEinmaligenNachOrt(e.target.checked)}
    className="mr-2"
    />
    <span className="text-sm">Einmaliger Nach-Ort</span>
    </div>
    {useEinmaligenNachOrt ? (
      <input
      type="text"
      name="einmaligerNachOrt"
      value={formData.einmaligerNachOrt}
      onChange={handleChange}
      placeholder="Nach (einmalig)"
      className="w-full p-1 border rounded text-sm"
      required
      />
    ) : (
      <select
      name="nachOrtId"
      value={formData.nachOrtId}
      onChange={handleChange}
      className="w-full p-1 border rounded text-sm"
      required
      >
      <option value="">Nach</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
    </button>
    {showRueckfahrtInfo && (
      <div className="absolute z-10 w-64 p-2 mt-1 text-sm bg-white rounded-lg shadow-lg">
      Bei Aktivierung wird automatisch eine Rückfahrt mit umgekehrter Strecke hinzugefügt.
      </div>
    )}
    </div>
    </div>
    <input
    type="text"
    name="anlass"
    value={formData.anlass}
    onChange={handleChange}
    placeholder="Anlass"
    className="w-40 p-1 border rounded text-sm"
    required
    />
    <div className="w-20 relative">
    <input
    type="number"
    name="manuelleKilometer"
    value={formData.manuelleKilometer}
    onChange={handleChange}
    placeholder="km"
    className="w-full p-1 border rounded text-sm"
    required={useEinmaligenVonOrt || useEinmaligenNachOrt}
    />
    {kalkulierteStrecke !== null && !(useEinmaligenVonOrt || useEinmaligenNachOrt) && (
      <span className="absolute right-0 bottom-0 text-xs text-gray-500 pr-2 pb-1">
      Kalk: {kalkulierteStrecke} km
      </span>
    )}
    </div>
    {!formData.autosplit && (
      <select
      name="abrechnung"
      value={formData.abrechnung}
      onChange={handleChange}
      className="w-32 p-1 border rounded text-sm"
      required={!formData.autosplit}
      >
      <option value="">Abrechnung</option>
      <option value="Kirchenkreis">Kirchenkreis</option>
      <option value="Gemeinde">Gemeinde</option>
      </select>
    )}
    <div className="flex-grow"></div>
    <button type="submit" className="bg-blue-500 text-white px-2 py-1 rounded text-sm">Hinzufügen</button>
    </form>
    {kalkulierteStrecke !== null && (
      <div className="mt-2 bg-gray-200 p-2 rounded">
      <p className="text-sm font-semibold">Kalkulierte Strecke: {kalkulierteStrecke} km</p>
      {formData.autosplit && (
        <div className="text-sm">
        <p>Kirchenkreis: {autosplitInfo.kirchenkreis} km</p>
        <p>Gemeinde: {autosplitInfo.gemeinde} km</p>
        </div>
      )}
      </div>
    )}
    </div>
  );
}

export default FahrtForm;