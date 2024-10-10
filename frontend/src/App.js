import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import axios from 'axios';
import './index.css';
import './App.css';
import ProfileModal from './ProfileModal';
import FahrtForm from './FahrtForm';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import Modal from './Modal'; 
import FahrtenbuchHilfe from './FahrtenbuchHilfe';

const API_BASE_URL = '/api';

export const AppContext = createContext();

function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [orte, setOrte] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [distanzen, setDistanzen] = useState([]);
  const [fahrten, setFahrten] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [gesamtKirchenkreis, setGesamtKirchenkreis] = useState(0);
  const [gesamtGemeinde, setGesamtGemeinde] = useState(0);
  
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLoggedIn(true);
      setupAxiosInterceptors();
    }
  }, [token]);
  
  const setupAxiosInterceptors = () => {
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          console.log('Unauthorized, logging out...');
          logout();
        }
        return Promise.reject(error);
      }
    );
  };
  
  useEffect(() => {
    if (isLoggedIn) {
      fetchOrte();
      fetchDistanzen();
      fetchFahrten();
    }
  }, [isLoggedIn]);
  
  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { username, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login fehlgeschlagen:', error);
      throw error;
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsLoggedIn(false);
    delete axios.defaults.headers.common['Authorization'];
  };
  
  const fetchOrte = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orte`);
      setOrte(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Orte:', error);
    }
  };
  
  const fetchDistanzen = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distanzen`);
      setDistanzen(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Distanzen:', error);
      setDistanzen([]);
    }
  };
  
  const fetchFahrten = async () => {
    try {
      const [year, month] = selectedMonth.split('-');
      const response = await axios.get(`${API_BASE_URL}/fahrten/report/${year}/${month}`);
      setFahrten(response.data.fahrten.map(fahrt => ({
        ...fahrt,
        mitfahrer: fahrt.mitfahrer || [] // Stellen Sie sicher, dass mitfahrer immer ein Array ist push
      })));
      setGesamtKirchenkreis(response.data.summary.kirchenkreisErstattung || 0);
      setGesamtGemeinde(response.data.summary.gemeindeErstattung || 0);
    } catch (error) {
      console.error('Fehler beim Abrufen der Fahrten:', error);
      setFahrten([]);
      setGesamtKirchenkreis(0);
      setGesamtGemeinde(0);
    }
  };
  
  const addOrt = async (ort) => {
    try {
      await axios.post(`${API_BASE_URL}/orte`, ort);
      fetchOrte();
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Ortes:', error);
    }
  };
  
  const addFahrt = async (fahrt, retries = 3) => {
    try {
      console.log('Sending fahrt data:', fahrt);
      const response = await axios.post(`${API_BASE_URL}/fahrten`, fahrt);
      if (response.status === 201) {
        fetchFahrten();
        fetchMonthlyData();
      } else {
        console.error('Unerwarteter Statuscode beim Hinzufügen der Fahrt:', response.status);
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Fahrt:', error);
      if (error.response) {
        console.error('Fehlerdetails:', error.response.data);
      }
      if (retries > 0 && error.response && error.response.data.code === 'ER_LOCK_DEADLOCK') {
        console.log(`Wiederhole Hinzufügen der Fahrt. Verbleibende Versuche: ${retries - 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return addFahrt(fahrt, retries - 1);
      }
      throw error;
    }
  };
  
  const updateFahrt = async (id, updatedFahrt) => {
    try {
      await axios.put(`${API_BASE_URL}/fahrten/${id}`, updatedFahrt);
      fetchFahrten();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Fahrt:', error);
    }
  };
  
  const addDistanz = async (distanz) => {
    try {
      await axios.post(`${API_BASE_URL}/distanzen`, distanz);
      fetchDistanzen();
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Distanz:', error);
    }
  };
  
  const fetchMonthlyData = async () => {
    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();
      const promises = [];
      
      for (let i = 0; i < 24; i++) {
        const date = new Date(currentYear, currentMonth - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        promises.push(axios.get(`${API_BASE_URL}/fahrten/report/${year}/${month}`));
      }
      
      const responses = await Promise.all(promises);
      const data = responses
      .map((response, index) => {
        const date = new Date(currentYear, currentMonth - index, 1);
        return {
          yearMonth: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
          monthName: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          kirchenkreisErstattung: response.data.summary.kirchenkreisErstattung,
          gemeindeErstattung: response.data.summary.gemeindeErstattung,
          mitfahrerErstattung: response.data.summary.mitfahrerErstattung || 0 // Fügen Sie dies hinzu
        };
      })
      .filter(month => month.kirchenkreisErstattung > 0 || month.gemeindeErstattung > 0 || month.mitfahrerErstattung > 0);
      
      setMonthlyData(data);
    } catch (error) {
      console.error('Fehler beim Abrufen der monatlichen Übersicht:', error);
    }
  };
  
  const updateOrt = async (id, ort) => {
    try {
      console.log('Sending update request for Ort:', id, ort); // Überprüfen, was gesendet wird
      await axios.put(`${API_BASE_URL}/orte/${id}`, ort);
      fetchOrte();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Ortes:', error);
    }
  };
  
  const updateDistanz = async (id, distanz) => {
    try {
      console.log('Sending update request for Distanz:', id, distanz);
      await axios.put(`${API_BASE_URL}/distanzen/${id}`, {
        vonOrtId: distanz.von_ort_id,
        nachOrtId: distanz.nach_ort_id,
        distanz: distanz.distanz
      });
      fetchDistanzen();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Distanz:', error);
    }
  };
  
  const deleteFahrt = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/fahrten/${id}`);
      fetchFahrten();
    } catch (error) {
      console.error('Fehler beim Löschen der Fahrt:', error);
    }
  };
  
  const deleteOrt = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/orte/${id}`);
      fetchOrte();
    } catch (error) {
      console.error('Fehler beim Löschen des Ortes:', error);
      throw error;
    }
  };
  
  const deleteDistanz = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/distanzen/${id}`);
      fetchDistanzen();
    } catch (error) {
      console.error('Fehler beim Löschen der Distanz:', error);
    }
  };
  
  return (
    <AppContext.Provider value={{ 
      isLoggedIn, login, logout, token, updateFahrt, orte, distanzen, fahrten, selectedMonth, gesamtKirchenkreis, gesamtGemeinde,
      setSelectedMonth, addOrt, addFahrt, addDistanz, updateOrt, updateDistanz, 
      fetchFahrten, deleteFahrt, deleteDistanz, deleteOrt, monthlyData, fetchMonthlyData,
      setIsProfileModalOpen, isProfileModalOpen
    }}>
    {children}
    </AppContext.Provider>
  );
}

function OrtForm() {
  const { orte, addOrt } = useContext(AppContext);
  const [name, setName] = useState('');
  const [adresse, setAdresse] = useState('');
  const [istWohnort, setIstWohnort] = useState(false);
  const [istDienstort, setIstDienstort] = useState(false);
  const [istKirchspiel, setIstKirchspiel] = useState(false);
  
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
  };
  const sortedOrte = orte.sort((a, b) => a.name.localeCompare(b.name));
  
  return (
    <div>
    <h2 className="text-lg font-semibold mb-2">Neuen Ort hinzufügen</h2>
    <form onSubmit={handleSubmit} className="flex items-center bg-gray-100 p-4 rounded-lg">
    <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Name"
    className="w-1/4 p-2 border rounded mr-2 text-sm"
    required
    />
    <input
    type="text"
    value={adresse}
    onChange={(e) => setAdresse(e.target.value)}
    placeholder="Adresse"
    className="w-1/2 p-2 border rounded mr-2 text-sm"
    required
    />
    {!hasWohnort && (
      <label className="flex items-center mr-2">
      <input
      type="checkbox"
      checked={istWohnort}
      onChange={(e) => setIstWohnort(e.target.checked)}
      className="mr-2"
      />
      Wohnort
      </label>
    )}
    {!hasDienstort && (
      <label className="flex items-center mr-2">
      <input
      type="checkbox"
      checked={istDienstort}
      onChange={(e) => setIstDienstort(e.target.checked)}
      className="mr-2"
      />
      Dienstort
      </label>
    )}
    <label className="flex items-center mr-2">
    <input
    type="checkbox"
    checked={istKirchspiel}
    onChange={(e) => setIstKirchspiel(e.target.checked)}
    className="mr-2"
    />
    Kirchspiel
    </label>
    <button type="submit" className="bg-blue-500 text-white px-4 py-2 text-sm rounded ml-auto">
    Hinzufügen
    </button>
    </form>
    </div>
  );
}
function DistanzForm() {
  const { orte, addDistanz, distanzen } = useContext(AppContext);
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
  };
  
  const sortedOrte = orte.sort((a, b) => a.name.localeCompare(b.name));
  
  return (
    <div>
    <h2 className="text-lg font-semibold mb-2">Neue Distanz hinzufügen</h2>
    <form onSubmit={handleSubmit} className="flex items-center bg-gray-100 p-4 rounded-lg">
    <select
    value={vonOrtId}
    onChange={(e) => setVonOrtId(e.target.value)}
    className="w-1/3 p-2 border rounded mr-2 text-sm"
    required
    >
    <option value="">Von Ort auswählen</option>
    {renderOrteOptions(orte)}
    </select>
    <select
    value={nachOrtId}
    onChange={(e) => setNachOrtId(e.target.value)}
    className="w-1/3 p-2 border rounded mr-2 text-sm"
    required
    >
    <option value="">Nach Ort auswählen</option>
    {renderOrteOptions(orte)}
    </select>
    <input
    type="number"
    value={distanz}
    onChange={(e) => setDistanz(e.target.value)}
    placeholder="Distanz in km"
    className="w-32 p-2 border rounded mr-2 text-sm"
    required
    />
    <button type="submit" className="bg-blue-500 text-white px-4 py-2 text-sm rounded ml-auto">
    {existingDistanz ? 'Aktualisieren' : 'Hinzufügen'}
    </button>
    </form>
    </div>
  );
}

function FahrtenListe() {
  const { fahrten, selectedMonth, setSelectedMonth, fetchFahrten, deleteFahrt, updateFahrt, orte, fetchMonthlyData  } = useContext(AppContext);
  const [expandedFahrten, setExpandedFahrten] = useState({});
  const [isMitfahrerModalOpen, setIsMitfahrerModalOpen] = useState(false);
  const [viewingMitfahrer, setViewingMitfahrer] = useState(null);
  const [editingMitfahrer, setEditingMitfahrer] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthName, setSelectedMonthName] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [editingFahrt, setEditingFahrt] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'datum', direction: 'descending' });
  
  useEffect(() => {
    fetchFahrten();
  }, [selectedMonth]);
  
  useEffect(() => {
    if (fahrten.length > 0) {
      setSortConfig({ key: 'datum', direction: 'descending' });
    }
  }, [fahrten]);

  const handleMonthChange = (e) => {
    const monthIndex = e.target.value;
    const date = new Date(selectedYear, monthIndex);
    setSelectedMonthName(date.toLocaleString('default', { month: 'long' }));
    setSelectedMonth(`${selectedYear}-${(parseInt(monthIndex) + 1).toString().padStart(2, '0')}`);
  };
  
  const handleYearChange = (e) => {
    const year = e.target.value;
    setSelectedYear(year);
    setSelectedMonth(`${year}-${selectedMonth.split('-')[1]}`);
  };
  
  const toggleFahrtDetails = (id) => {
    setExpandedFahrten(prev => ({...prev, [id]: !prev[id]}));
  };
  
  const getDistance = async (vonOrtId, nachOrtId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distanzen/between`, {
        params: { vonOrtId, nachOrtId }
      });
      return response.data.distanz;
    } catch (error) {
      console.error('Fehler beim Abrufen der Distanz:', error);
      return null;
    }
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Fahrt löschen möchten?')) {
      try {
        await deleteFahrt(id);
        fetchFahrten();
        fetchMonthlyData();
      } catch (error) {
        console.error('Fehler beim Löschen der Fahrt:', error);
      }
    }
  };
  
  const handleEditChange = async (field, value) => {
    const updatedFahrt = { ...editingFahrt, [field]: value };
    
    if (field === 'von_ort_id' || field === 'nach_ort_id') {
      const distance = await getDistance(updatedFahrt.von_ort_id, updatedFahrt.nach_ort_id);
      if (distance !== null) {
        updatedFahrt.kilometer = distance;
      }
    }
    
    setEditingFahrt(updatedFahrt);
  };
  
  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };
  
  const getOrtTyp = (fahrt, isVon) => {
    if (isVon) {
      return fahrt.von_ort_id ? 'gespeichert' : 'einmalig';
    } else {
      return fahrt.nach_ort_id ? 'gespeichert' : 'einmalig';
    }
  };
  
  const handleEdit = (fahrt) => {
    setEditingFahrt({
      ...fahrt,
      datum: formatDateForInput(fahrt.datum),
      vonOrtTyp: getOrtTyp(fahrt, true),
      nachOrtTyp: getOrtTyp(fahrt, false)
    });
  };
  
  const handleExportToExcel = async (type, year, month) => {
    try {
      // Stellen Sie sicher, dass der Monat im Format "MM" ist
      const formattedMonth = month.padStart(2, '0');
      const response = await axios.get(`/api/fahrten/export/${type}/${year}/${formattedMonth}`, {
        responseType: 'blob'
      });
      
      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="?(.+)"?/i);
      let filename = filenameMatch ? filenameMatch[1] : `fahrtenabrechnung_${type}_${year}_${month}`;
      
      // Überprüfen Sie den Content-Type
      if (contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        filename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      } else if (contentType === 'application/zip') {
        filename = filename.endsWith('.zip') ? filename : `${filename}.zip`;
      } else {
        console.error('Unerwarteter Content-Type:', contentType);
        throw new Error('Unerwarteter Dateityp vom Server erhalten');
      }
      
      console.log('Received file:', { contentType, filename, size: response.data.size });
      
      const blob = new Blob([response.data], { type: contentType });
      
      if (blob.size === 22) {
        console.error('Erhaltene Datei ist möglicherweise leer oder fehlerhaft');
        throw new Error('Die heruntergeladene Datei scheint leer oder fehlerhaft zu sein');
      }
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('File download initiated');
    } catch (error) {
      console.error('Fehler beim Exportieren nach Excel:', error);
      if (error.response) {
        console.error('Server-Antwort:', error.response.status, error.response.data);
      }
      alert('Fehler beim Exportieren nach Excel. Bitte versuchen Sie es später erneut und prüfen Sie die Konsole für weitere Details.');
    }
  };
  
  const handleSave = async () => {
    try {
      const updatedFahrt = {
        datum: editingFahrt.datum,
        vonOrtId: editingFahrt.vonOrtTyp === 'gespeichert' ? editingFahrt.von_ort_id : null,
        nachOrtId: editingFahrt.nachOrtTyp === 'gespeichert' ? editingFahrt.nach_ort_id : null,
        einmaligerVonOrt: editingFahrt.vonOrtTyp === 'einmalig' ? editingFahrt.einmaliger_von_ort : null,
        einmaligerNachOrt: editingFahrt.nachOrtTyp === 'einmalig' ? editingFahrt.einmaliger_nach_ort : null,
        anlass: editingFahrt.anlass,
        kilometer: editingFahrt.kilometer,
        abrechnung: editingFahrt.abrechnung,
        autosplit: editingFahrt.autosplit
      };
      console.log('Saving updated Fahrt:', updatedFahrt);
      await updateFahrt(editingFahrt.id, updatedFahrt);
      setEditingFahrt(null);
      fetchFahrten();
      fetchMonthlyData();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Fahrt:', error);
    }
  };

  const handleViewMitfahrer = (mitfahrer, event) => {
    event.stopPropagation(); // Verhindert das Bubbling zum Bearbeitungs-Handler
    setViewingMitfahrer(mitfahrer);
  };
  
  const getMonthSummary = () => {
    let kirchenkreisSum = 0;
    let gemeindeSum = 0;
    let mitfahrerSum = 0;
    
    fahrten.forEach((fahrt) => {
      if (fahrt.autosplit) {
        kirchenkreisSum += (fahrt.kirchenkreisKm || 0) * 0.3;
        gemeindeSum += (fahrt.gemeindeKm || 0) * 0.3;
      } else if (fahrt.abrechnung === 'Kirchenkreis') {
        kirchenkreisSum += (fahrt.kilometer || 0) * 0.3;
      } else if (fahrt.abrechnung === 'Gemeinde') {
        gemeindeSum += (fahrt.kilometer || 0) * 0.3;
      }
      if (fahrt.mitfahrer && fahrt.mitfahrer.length > 0) {
        mitfahrerSum += fahrt.mitfahrer.length * 0.05 * fahrt.kilometer;
      }
    });
    
    return {
      kirchenkreis: kirchenkreisSum.toFixed(2),
      gemeinde: gemeindeSum.toFixed(2),
      mitfahrer: mitfahrerSum.toFixed(2),
      gesamt: (kirchenkreisSum + gemeindeSum + mitfahrerSum).toFixed(2)
    };
  };
  
  const summary = getMonthSummary();
  
  const roundKilometers = (value) => {
    return value % 1 < 0.5 ? Math.floor(value) : Math.ceil(value);
  };
  
  const exportToCSV = (type) => {
    const csvContent = [
      ['Datum', 'Von Adresse', 'Nach Adresse', 'Anlass', 'Kilometer', 'Abrechnung'],
      ...fahrten.flatMap(fahrt => {
        if (fahrt.autosplit) {
          return fahrt.details
          .filter(detail => type === 'all' || detail.abrechnung.toLowerCase() === type)
          .map(detail => [
            new Date(fahrt.datum).toLocaleDateString(),
            detail.von_ort_adresse || detail.von_ort_name,
            detail.nach_ort_adresse || detail.nach_ort_name,
            fahrt.anlass,
            roundKilometers(detail.kilometer),
            detail.abrechnung
          ]);
        } else if (type === 'all' || fahrt.abrechnung.toLowerCase() === type) {
          return [[
            new Date(fahrt.datum).toLocaleDateString(),
            fahrt.einmaliger_von_ort || fahrt.von_ort_adresse || fahrt.von_ort_name,
            fahrt.einmaliger_nach_ort || fahrt.nach_ort_adresse || fahrt.nach_ort_name,
            fahrt.anlass,
            roundKilometers(fahrt.kilometer),
            fahrt.abrechnung
          ]];
        }
        return [];
      })
    ].map(row => row.join(';')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `fahrten_${type}_${selectedMonth}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const sortedFahrten = React.useMemo(() => {
    let sortableFahrten = [...fahrten];
    if (sortConfig.key !== null) {
      sortableFahrten.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableFahrten;
  }, [fahrten, sortConfig]);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const formatValue = (value) => value === 0 ? null : value;
  
  const handleEditMitfahrer = (fahrtId, mitfahrer) => {
    setEditingMitfahrer({ fahrtId, ...mitfahrer });
  };
  
  const handleAddMitfahrer = (fahrtId) => {
    const fahrt = fahrten.find(f => f.id === fahrtId);
    const isHinfahrt = !fahrt.anlass.toLowerCase().includes('rückfahrt');
    const suggestedRichtung = isHinfahrt ? 'hin' : 'rueck';
    setEditingMitfahrer({ fahrtId, isNew: true, richtung: suggestedRichtung });
    setIsMitfahrerModalOpen(true);
  };
  
  const handleDeleteMitfahrer = async (fahrtId, mitfahrerId) => {
    if (window.confirm('Möchten Sie diesen Mitfahrer wirklich löschen?')) {
      try {
        await axios.delete(`${API_BASE_URL}/fahrten/${fahrtId}/mitfahrer/${mitfahrerId}`);
        fetchFahrten();
      } catch (error) {
        console.error('Fehler beim Löschen des Mitfahrers:', error);
      }
    }
  };
  
  const handleSaveMitfahrer = async (updatedMitfahrer) => {
    try {
      if (updatedMitfahrer.isNew) {
        await axios.post(`${API_BASE_URL}/fahrten/${updatedMitfahrer.fahrtId}/mitfahrer`, updatedMitfahrer);
      } else {
        await axios.put(`${API_BASE_URL}/fahrten/${updatedMitfahrer.fahrtId}/mitfahrer/${updatedMitfahrer.id}`, updatedMitfahrer);
      }
      setEditingMitfahrer(null);
      setIsMitfahrerModalOpen(false);
      fetchFahrten();
    } catch (error) {
      console.error('Fehler beim Speichern des Mitfahrers:', error);
    }
  };
  
  const renderMitfahrer = (fahrt) => {
    if (!fahrt.mitfahrer || fahrt.mitfahrer.length === 0) {
      return <span className="text-gray-400"></span>;
    }
    
    const isHinfahrt = !fahrt.anlass.toLowerCase().includes('rückfahrt');
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
      {fahrt.mitfahrer.map((person, index) => {
        const shouldDisplay = 
        (isHinfahrt && (person.richtung === 'hin' || person.richtung === 'hin_rueck')) ||
        (!isHinfahrt && (person.richtung === 'rueck' || person.richtung === 'hin_rueck'));
        
        if (!shouldDisplay) return null;
        
        return (
          <span
          key={index}
          className="cursor-pointer bg-blue-100 rounded-full px-2 py-1 text-sm font-semibold text-blue-700"
          onClick={(event) => handleViewMitfahrer(person, event)}
          >
          👤 {person.name}
          </span>
        );
      })}
      </div>
    );
  };

  
  const renderFahrtRow = (fahrt, detail = null) => (
    <tr key={detail ? `${fahrt.id}-${detail.id}` : fahrt.id} className={
      detail ? "bg-gray-50" : 
      (fahrt.autosplit ? "bg-yellow-50" : 
        (fahrt.einmaliger_von_ort || fahrt.einmaliger_nach_ort ? "bg-green-50" : ""))
    }>
    <td className="border px-2 py-1 text-sm">
    {editingFahrt?.id === fahrt.id ? (
      <input
      type="date"
      value={editingFahrt.datum}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, datum: e.target.value })}
      className="w-full p-1 border rounded"
      />
    ) : (
      new Date(fahrt.datum).toLocaleDateString()
    )}
    </td>
    <td className="border px-2 py-1">
    {editingFahrt?.id === fahrt.id ? (
      <div>
      <label className="flex items-center mb-1 cursor-pointer">
      <input
      type="checkbox"
      checked={editingFahrt.vonOrtTyp === 'einmalig'}
      onChange={(e) => setEditingFahrt({
        ...editingFahrt,
        vonOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
        von_ort_id: e.target.checked ? null : editingFahrt.von_ort_id,
        einmaliger_von_ort: e.target.checked ? editingFahrt.einmaliger_von_ort : null
      })}
      className="mr-2"
      />
      <span className="text-sm">Einmaliger Von-Ort</span>
      </label>
      {editingFahrt.vonOrtTyp === 'gespeichert' ? (
        <select
        value={editingFahrt.von_ort_id || ''}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, von_ort_id: e.target.value })}
        className="w-full p-1 border rounded"
        >
        <option value="">Bitte wählen</option>
        {renderOrteOptions(orte)}
        </select>
      ) : (
        <input
        type="text"
        value={editingFahrt.einmaliger_von_ort || ''}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_von_ort: e.target.value })}
        className="w-full p-1 border rounded"
        placeholder="Von (einmalig)"
        />
      )}
      </div>
    ) : (
      <div>
      <div className="text-sm">{detail ? detail.von_ort_name : (fahrt.von_ort_name || fahrt.einmaliger_von_ort)}</div>
      <div className="text-xs text-gray-500">{detail ? detail.von_ort_adresse : fahrt.von_ort_adresse}</div>
      </div>
    )}
    </td>
    <td className="border px-2 py-1">
    {editingFahrt?.id === fahrt.id ? (
      <div>
      
      <label className="flex items-center mb-1 cursor-pointer">
      <input
      type="checkbox"
      checked={editingFahrt.nachOrtTyp === 'einmalig'}
      onChange={(e) => setEditingFahrt({
        ...editingFahrt,
        nachOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
        nach_ort_id: e.target.checked ? null : editingFahrt.nach_ort_id,
        einmaliger_nach_ort: e.target.checked ? editingFahrt.einmaliger_nach_ort : null
      })}
      className="mr-2"
      />
      <span className="text-sm">Einmaliger Nach-Ort</span>
      </label>
      {editingFahrt.nachOrtTyp === 'gespeichert' ? (
        <select
        value={editingFahrt.nach_ort_id || ''}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, nach_ort_id: e.target.value })}
        className="w-full p-1 border rounded"
        >
        <option value="">Bitte wählen</option>
        {renderOrteOptions(orte)}
        </select>
      ) : (
        <input
        type="text"
        value={editingFahrt.einmaliger_nach_ort || ''}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_nach_ort: e.target.value })}
        className="w-full p-1 border rounded"
        placeholder="Nach (einmalig)"
        />
      )}
      </div>
    ) : (
      <div>
      <div className="text-sm">{detail ? detail.nach_ort_name : (fahrt.nach_ort_name || fahrt.einmaliger_nach_ort)}</div>
      <div className="text-xs text-gray-500">{detail ? detail.nach_ort_adresse : fahrt.nach_ort_adresse}</div>
      </div>
    )}
    </td>
    <td className="border px-2 py-1 text-sm">
    {editingFahrt?.id === fahrt.id ? (
      <input
      type="text"
      value={editingFahrt.anlass}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, anlass: e.target.value })}
      className="w-full p-1 border rounded"
      />
    ) : (
      fahrt.anlass
    )}
    </td>
    <td className="border px-2 py-1 text-sm text-right">
    {editingFahrt?.id === fahrt.id ? (
      <input
      type="number"
      value={editingFahrt.kilometer}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, kilometer: parseFloat(e.target.value) })}
      className="w-full p-1 border rounded"
      />
    ) : (
      `${formatValue(roundKilometers(detail ? detail.kilometer : fahrt.kilometer))} km`
    )}
    </td>
    <td className="border px-2 py-1 text-sm">
    {editingFahrt?.id === fahrt.id ? (
      <select
      value={editingFahrt.abrechnung}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, abrechnung: e.target.value })}
      className="w-full p-1 border rounded"
      >
      <option value="Kirchenkreis">Kirchenkreis</option>
      <option value="Gemeinde">Gemeinde</option>
      <option value="Autosplit">Autosplit</option>
      </select>
    ) : (
      detail ? detail.abrechnung : fahrt.abrechnung
    )}
    </td>
    <td className="border px-2 py-1 text-sm w-48 align-top">
    {editingFahrt?.id === fahrt.id ? (
      <div className="mitfahrer-container">
      {fahrt.mitfahrer && fahrt.mitfahrer.map((person, index) => (
        <div key={index} className="mitfahrer-item">
        <span
        className="cursor-pointer bg-blue-100 rounded-full px-2 py-1 text-sm font-semibold text-blue-700"
        onClick={() => handleEditMitfahrer(fahrt.id, person)}
        title={`${person.arbeitsstaette} - ${person.richtung}`}
        >
        👤 {person.name}
        <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteMitfahrer(fahrt.id, person.id);
        }}
        className="ml-1 text-red-500 hover:text-red-700"
        >
        ❌
        </button>
        </span>
        </div>
      ))}
      <button
      onClick={() => handleAddMitfahrer(fahrt.id)}
      className="mt-1 bg-green-500 text-white px-2 py-1 rounded text-xs add-mitfahrer-button"
      >
      +
      </button>
      </div>
    ) : (
      renderMitfahrer(fahrt)
    )}
    </td>
    <td className="border px-2 py-1 text-sm">
    {!detail && (
      <div className="flex space-x-1">
      {editingFahrt?.id === fahrt.id ? (
        <>
        <button onClick={handleSave} className="bg-green-500 text-white px-2 py-1 rounded text-xs">Speichern</button>
        <button onClick={() => setEditingFahrt(null)} className="bg-gray-500 text-white px-2 py-1 rounded text-xs">Abbrechen</button>
        </>
      ) : (
        <>
        {!fahrt.autosplit && (
          <button onClick={() => handleEdit(fahrt)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Bearbeiten</button>
        )}
        <button onClick={() => handleDelete(fahrt.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">Löschen</button>
        {fahrt.autosplit ? (
          <button onClick={() => toggleFahrtDetails(fahrt.id)} className="bg-yellow-500 text-white px-2 py-1 rounded text-xs">
          {expandedFahrten[fahrt.id] ? 'Einklappen' : 'Ausklappen'}
          </button>
        ) : null}
        </>
      )}
      </div>
    )}
    </td>
    </tr>
  );
  
  return (
    <div className="mb-4">
    <div className="flex justify-between items-center mb-2">
    <h2 className="text-lg font-semibold">Fahrten</h2>
    <div className="flex items-center space-x-2">
    <select
    value={new Date(`${selectedMonth}-01`).getMonth().toString()}
    onChange={handleMonthChange}
    className="p-1 border rounded text-sm"
    >
    {[...Array(12)].map((_, i) => (
      <option key={i} value={i}>
      {new Date(0, i).toLocaleString('default', { month: 'long' })}
      </option>
    ))}
    </select>
    <select
    value={selectedYear}
    onChange={handleYearChange}
    className="p-1 border rounded text-sm"
    >
    {[...Array(10)].map((_, i) => {
      const year = new Date().getFullYear() - 5 + i;
      return <option key={year} value={year}>{year}</option>;
    })}
    </select>
    </div>
    </div>
    <div className="mb-2 p-2 bg-gray-100 rounded text-sm flex justify-between items-center">
    <div>
    <p><strong>{selectedMonthName} {selectedYear}</strong></p>
    <p>Kirchenkreis: {summary.kirchenkreis} € | Gemeinde: {summary.gemeinde} € | Mitfahrer: {summary.mitfahrer} € | Gesamt: {summary.gesamt} €</p>
    </div>
    <div className="flex space-x-2">
//  <button onClick={() => exportToCSV('kirchenkreis')} className="bg-green-500 text-white px-2 py-1 rounded text-xs">
//  Export Kirchenkreis CSV
//  </button>
//  <button onClick={() => exportToCSV('gemeinde')} className="bg-green-500 text-white px-2 py-1 rounded text-xs">
//  Export Gemeinde CSV
//  </button>
    <button onClick={() => handleExportToExcel('kirchenkreis', selectedYear, selectedMonth)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
    Export Kirchenkreis
    </button>
    <button onClick={() => handleExportToExcel('gemeinde', selectedYear, selectedMonth)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
    Export Gemeinde
    </button>
    </div>
    </div>
    <table className="w-full border-collapse text-left fahrten-table">
    <thead>
    <tr className="bg-gray-200">
    <th className="border px-2 py-1 text-sm font-medium cursor-pointer datum-col" onClick={() => requestSort('datum')}>Datum {sortConfig.key === 'datum' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
    <th className="border px-2 py-1 text-sm font-medium cursor-pointer ort-col" onClick={() => requestSort('von_ort_name')}>Von {sortConfig.key === 'von_ort_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
    <th className="border px-2 py-1 text-sm font-medium cursor-pointer ort-col" onClick={() => requestSort('nach_ort_name')}>Nach {sortConfig.key === 'nach_ort_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
    <th className="border px-2 py-1 text-sm font-medium cursor-pointer anlass-col" onClick={() => requestSort('anlass')}>Anlass {sortConfig.key === 'anlass' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
    <th className="border px-2 py-1 text-sm font-medium cursor-pointer kilometer-col" onClick={() => requestSort('kilometer')}>Kilometer {sortConfig.key === 'kilometer' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
    <th className="border px-2 py-1 text-sm font-medium cursor-pointer abrechnung-col" onClick={() => requestSort('abrechnung')}>Abrechnung {sortConfig.key === 'abrechnung' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}</th>
    <th className="border px-2 py-1 text-sm font-medium mitfahrer-col">Mitfahrer:innen</th>
    <th className="border px-2 py-1 text-sm font-medium aktionen-col">Aktionen</th>
    </tr>
    </thead>
    <tbody>
    {sortedFahrten.map((fahrt) => (
      <React.Fragment key={fahrt.id}>
      {renderFahrtRow(fahrt)}
      {fahrt.autosplit ? (
        expandedFahrten[fahrt.id] && fahrt.details.map(detail => renderFahrtRow(fahrt, detail))
      ) : null}
      </React.Fragment>
    ))}
    </tbody>
    </table>
    <MitfahrerModal
    isOpen={!!viewingMitfahrer}
    onClose={() => setViewingMitfahrer(null)}
    initialData={viewingMitfahrer}
    readOnly={true}
    />
    
    <MitfahrerModal
    isOpen={!!editingMitfahrer}
    onClose={() => setEditingMitfahrer(null)}
    onSave={handleSaveMitfahrer}
    initialData={editingMitfahrer}
    readOnly={false}
    />
    </div>
  );
}

function MonthlyOverview() {
  const { monthlyData, fetchMonthlyData } = useContext(AppContext);
  
  useEffect(() => {
    fetchMonthlyData();
  }, []);
  
  const calculateYearTotal = () => {
    return monthlyData.reduce((total, month) => {
      total.kirchenkreis += month.kirchenkreisErstattung;
      total.gemeinde += month.gemeindeErstattung;
      total.mitfahrer += month.mitfahrerErstattung || 0; // Fügen Sie dies hinzu
      return total;
    }, { kirchenkreis: 0, gemeinde: 0, mitfahrer: 0 });
  };

  
  const yearTotal = calculateYearTotal();
  
  return (
    <div>
    <h2 className="text-lg font-semibold mb-2">Monatliche Übersicht</h2>
    <table className="w-full border-collapse text-left">
    <thead>
    <tr className="bg-gray-200">
    <th className="border px-2 py-1 text-sm font-medium w-1/5">Monat</th>
    <th className="border px-2 py-1 text-sm font-medium w-1/5">Kirchenkreis</th>
    <th className="border px-2 py-1 text-sm font-medium w-1/5">Gemeinde</th>
    <th className="border px-2 py-1 text-sm font-medium w-1/5">Mitfahrer:innen</th>
    <th className="border px-2 py-1 text-sm font-medium w-1/5">Gesamt</th>
    </tr>
    </thead>
    <tbody>
    {monthlyData.map((month) => (
      <tr key={month.yearMonth}>
      <td className="border px-2 py-1 text-sm">{`${month.monthName} ${month.year}`}</td>
      <td className="border px-2 py-1 text-sm">{month.kirchenkreisErstattung.toFixed(2)} €</td>
      <td className="border px-2 py-1 text-sm">{month.gemeindeErstattung.toFixed(2)} €</td>
      <td className="border px-2 py-1 text-sm">{month.mitfahrerErstattung.toFixed(2)} €</td>
      <td className="border px-2 py-1 text-sm">{(month.kirchenkreisErstattung + month.gemeindeErstattung + month.mitfahrerErstattung).toFixed(2)} €</td>
      </tr>
    ))}
    <tr className="font-bold bg-gray-100">
    <td className="border px-2 py-1 text-sm">Jahresgesamt</td>
    <td className="border px-2 py-1 text-sm">{yearTotal.kirchenkreis.toFixed(2)} €</td>
    <td className="border px-2 py-1 text-sm">{yearTotal.gemeinde.toFixed(2)} €</td>
    <td className="border px-2 py-1 text-sm">{yearTotal.mitfahrer.toFixed(2)} €</td>
    <td className="border px-2 py-1 text-sm">{(yearTotal.kirchenkreis + yearTotal.gemeinde + yearTotal.mitfahrer).toFixed(2)} €</td>
    </tr>
    </tbody>
    </table>
    </div>
  );
}

function OrteListe() {
  const { orte, updateOrt, deleteOrt } = useContext(AppContext);
  const [editingOrt, setEditingOrt] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const handleEdit = (ort) => {
    setEditingOrt({ ...ort });
  };
  
  const handleSave = () => {
    const updatedOrt = {
      ...editingOrt,
      ist_wohnort: editingOrt.ist_wohnort !== undefined ? editingOrt.ist_wohnort : false,  // Sicherstellen, dass boolean-Werte gesetzt sind
      ist_dienstort: editingOrt.ist_dienstort !== undefined ? editingOrt.ist_dienstort : false,
      ist_kirchspiel: editingOrt.ist_kirchspiel !== undefined ? editingOrt.ist_kirchspiel : false
    };
    updateOrt(editingOrt.id, updatedOrt);
    setEditingOrt(null);
  };
  
  
  
  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Ort löschen möchten?')) {
      try {
        await deleteOrt(id);
      } catch (error) {
        console.error('Fehler beim Löschen des Ortes:', error);
        alert('Dieser Ort kann nicht gelöscht werden, da er in Fahrten verwendet wird.');
      }
    }
  };
  
  const sortedOrte = React.useMemo(() => {
    let sortableOrte = [...orte];
    if (sortConfig.key !== null) {
      sortableOrte.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableOrte;
  }, [orte, sortConfig]);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  return (
    <div className="mb-4">
    <h2 className="text-lg font-semibold mb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
    Orte {isCollapsed ? '▼' : '▲'}
    </h2>
    {!isCollapsed && (
      <table className="w-full border-collapse text-left">
      <thead>
      <tr className="bg-gray-200">
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('name')}>Name</th>
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('adresse')}>Adresse</th>
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('ist_wohnort')}>Wohnort</th>
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('ist_dienstort')}>Dienstort</th>
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('ist_kirchspiel')}>Kirchspiel</th>
      <th className="border px-2 py-1 text-sm font-medium w-48">Aktion</th>
      </tr>
      </thead>
      <tbody>
      {sortedOrte.map((ort) => (
        <tr key={ort.id}>
        <td className="border p-2 text-sm">
        {editingOrt?.id === ort.id ? (
          <input
          value={editingOrt.name}
          onChange={(e) => setEditingOrt({ ...editingOrt, name: e.target.value })}
          className="w-full p-1 border rounded"
          />
        ) : (
          ort.name
        )}
        </td>
        <td className="border p-2 text-sm">
        {editingOrt?.id === ort.id ? (
          <input
          value={editingOrt.adresse}
          onChange={(e) => setEditingOrt({ ...editingOrt, adresse: e.target.value })}
          className="w-full p-1 border rounded"
          />
        ) : (
          ort.adresse
        )}
        </td>
        <td className="border p-2 text-sm">
        {editingOrt?.id === ort.id ? (
          <input
          type="checkbox"
          checked={editingOrt.ist_wohnort || false} // <-- Hier sicherstellen, dass false gesetzt wird
          onChange={(e) => setEditingOrt({ ...editingOrt, ist_wohnort: e.target.checked })}
          />
        ) : (
          ort.ist_wohnort ? 'Ja' : 'Nein'
        )}
        </td>
        <td className="border p-2 text-sm">
        {editingOrt?.id === ort.id ? (
          <input
          type="checkbox"
          checked={editingOrt.ist_dienstort || false} // <-- Hier sicherstellen, dass false gesetzt wird
          onChange={(e) => setEditingOrt({ ...editingOrt, ist_dienstort: e.target.checked })}
          />
        ) : (
          ort.ist_dienstort ? 'Ja' : 'Nein'
        )}
        </td>
        <td className="border p-2 text-sm">
        {editingOrt?.id === ort.id ? (
          <input
          type="checkbox"
          checked={editingOrt.ist_kirchspiel || false} // <-- Hier sicherstellen, dass false gesetzt wird
          onChange={(e) => setEditingOrt({ ...editingOrt, ist_kirchspiel: e.target.checked })}
          />
        ) : (
          ort.ist_kirchspiel ? 'Ja' : 'Nein'
        )}
        </td>
        <td className="border px-2 py-1 text-sm w-48">
        {editingOrt?.id === ort.id ? (
          <button onClick={handleSave} className="bg-green-500 text-white px-2 py-1 rounded text-xs mr-1">Speichern</button>
        ) : (
          <>
          <button onClick={() => handleEdit(ort)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs mr-1">Bearbeiten</button>
          <button onClick={() => handleDelete(ort.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">Löschen</button>
          </>
        )}
        </td>
        </tr>
      ))}
      </tbody>
      </table>
    )}
    </div>
  );
}

function DistanzenListe() {
  const { distanzen, orte, updateDistanz, deleteDistanz } = useContext(AppContext);
  const [editingDistanz, setEditingDistanz] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'von_ort_id', direction: 'ascending' });
  
  const handleEdit = (distanz) => {
    setEditingDistanz({ ...distanz });
  };
  
  const handleSave = () => {
    updateDistanz(editingDistanz.id, editingDistanz);
    setEditingDistanz(null);
  };
  
  const getOrtName = (id) => {
    const ort = orte.find(o => o.id === id);
    return ort ? ort.name : 'Unbekannt';
  };
  
  const handleDelete = async (id) => {
    if (window.confirm('Sind Sie sicher, dass Sie diese Distanz löschen möchten?')) {
      await deleteDistanz(id);
    }
  };
  
  const sortedDistanzen = useMemo(() => {
    let sortableDistanzen = [...distanzen];
    if (sortConfig.key !== null) {
      sortableDistanzen.sort((a, b) => {
        if (sortConfig.key === 'von_ort_id' || sortConfig.key === 'nach_ort_id') {
          const ortA = orte.find(o => o.id === a[sortConfig.key]);
          const ortB = orte.find(o => o.id === b[sortConfig.key]);
          return sortConfig.direction === 'ascending' 
          ? ortA.name.localeCompare(ortB.name)
          : ortB.name.localeCompare(ortA.name);
        } else {
          if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        }
      });
    }
    return sortableDistanzen;
  }, [distanzen, sortConfig, orte]);
  
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  return (
    <div className="mb-4">
    <h2 className="text-lg font-semibold mb-2 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
    Distanzen {isCollapsed ? '▼' : '▲'}
    </h2>
    {!isCollapsed && (
      <table className="w-full border-collapse text-left">
      <thead>
      <tr className="bg-gray-200">
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('von_ort_id')}>Von</th>
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('nach_ort_id')}>Nach</th>
      <th className="border px-2 py-1 text-sm font-medium cursor-pointer" onClick={() => requestSort('distanz')}>Distanz (km)</th>
      <th className="border px-2 py-1 text-sm font-medium w-48">Aktion</th>
      </tr>
      </thead>
      <tbody>
      {sortedDistanzen.map((distanz) => (
        <tr key={distanz.id}>
        <td className="border p-2 text-sm">{getOrtName(distanz.von_ort_id)}</td>
        <td className="border p-2 text-sm">{getOrtName(distanz.nach_ort_id)}</td>
        <td className="border p-2 text-sm">
        {editingDistanz?.id === distanz.id ? (
          <input
          type="number"
          value={editingDistanz.distanz}
          onChange={(e) => setEditingDistanz({ ...editingDistanz, distanz: parseInt(e.target.value) })}
          className="w-full p-1 border rounded"
          />
        ) : (
          distanz.distanz
        )}
        </td>
        <td className="border px-2 py-1 text-sm w-48">
        {editingDistanz?.id === distanz.id ? (
          <button onClick={handleSave} className="bg-green-500 text-white px-2 py-1 rounded text-xs mr-1">Speichern</button>
        ) : (
          <>
          <button onClick={() => handleEdit(distanz)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs mr-1">Bearbeiten</button>
          <button onClick={() => handleDelete(distanz.id)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">Löschen</button>
          </>
        )}
        </td>
        </tr>
      ))}
      </tbody>
      </table>
    )}
    </div>
  );
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AppContext);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (error) {
      alert('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
    }
  };
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
    <div className="px-4 sm:px-8 py-6 mt-4 text-left bg-white shadow-lg w-full max-w-md">
    <h3 className="text-2xl font-bold text-center">Fahrtenbuch</h3>
    <form onSubmit={handleSubmit}>
    <div className="mt-4">
    <div>
    <label className="block" htmlFor="username">Benutzername</label>
    <input
    type="text"
    placeholder="Benutzername"
    className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    required
    />
    </div>
    <div className="mt-4">
    <label className="block" htmlFor="password">Passwort</label>
    <input
    type="password"
    placeholder="Passwort"
    className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    required
    />
    </div>
    <div className="flex items-baseline justify-between">
    <button type="submit" className="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900">Login</button>
    </div>
    </div>
    </form>
    </div>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
  }, []);
  
  return (
    <AppProvider>
    <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { isLoggedIn, gesamtKirchenkreis, gesamtGemeinde, logout, isProfileModalOpen, setIsProfileModalOpen } = useContext(AppContext);
  const [showOrteModal, setShowOrteModal] = useState(false);
  const [showDistanzenModal, setShowDistanzenModal] = useState(false);
  
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.exp * 1000 < Date.now()) {
          console.log('Token expired, logging out...');
          logout();
        }
      }
    };
    
    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [logout]);
  
  if (!isLoggedIn) {
    return <LoginPage />;
  }
  
  return (
    <div className="container mx-auto p-4">
    <div className="flex flex-col-mobile justify-between items-center mb-8">
    <h1 className="text-3xl font-bold mb-4 sm:mb-0">Fahrtenabrechnung</h1>
    <div className="flex space-x-2">
    <button
    onClick={() => setShowOrteModal(true)}
    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
    >
    Orte
    </button>
    <button
    onClick={() => setShowDistanzenModal(true)}
    className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
    >
    Distanzen
    </button>
    <button
    onClick={() => setIsProfileModalOpen(true)}
    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full-mobile"
    >
    Profil
    </button>
    <button 
    onClick={logout} 
    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full-mobile"
    >
    Logout
    </button>
    </div>
    
    <FahrtenbuchHilfe />
    </div>
    <div className="grid grid-cols-1 gap-4 mb-8">
    <FahrtForm />
    </div>
    <FahrtenListe />
    <MonthlyOverview />
    
    <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
    
    <Modal isOpen={showOrteModal} onClose={() => setShowOrteModal(false)} title="Orte" wide={true}>
    <OrtForm />
    <OrteListe />
    </Modal>
    
    <Modal isOpen={showDistanzenModal} onClose={() => setShowDistanzenModal(false)} title="Distanzen" wide={true}>
    <DistanzForm />
    <DistanzenListe />
    </Modal>
    </div>
  );
}

export default App;
  
  