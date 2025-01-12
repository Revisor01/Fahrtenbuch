import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import axios from 'axios';
import './index.css';
import ProfileModal from './ProfileModal';
import FahrtForm from './FahrtForm';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import Modal from './Modal'; 
import FahrtenbuchHilfe from './FahrtenbuchHilfe';
import NotificationModal from './NotificationModal';
import AbrechnungsStatusModal from './AbrechnungsStatusModal';
import UserManagement from './UserManagement';
import VerifyEmail from './VerifyEmail';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import SetPassword from './SetPassword';

const API_BASE_URL = '/api';

export const AppContext = createContext();

function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [orte, setOrte] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [distanzen, setDistanzen] = useState([]);
  const [fahrten, setFahrten] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [gesamtKirchenkreis, setGesamtKirchenkreis] = useState(0);
  const [gesamtGemeinde, setGesamtGemeinde] = useState(0);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, showCancel: false });
  const [summary, setSummary] = useState({});
  
  const showNotification = (title, message, onConfirm = () => {}, showCancel = false) => {
    setNotification({ isOpen: true, title, message, onConfirm, showCancel });
  };
  
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };
  
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLoggedIn(true);
      // User-Daten laden wenn noch nicht vorhanden
      if (!user) {
        fetchCurrentUser();
      }
    }
  }, [token]);
  
  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/users/me');
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout();
    }
  };
  
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
      const response = await axios.post('/api/auth/login', { username, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      await fetchCurrentUser(); // User-Daten direkt nach Login laden
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
  };
  
  const fetchOrte = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orte`);
      setOrte(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Orte:', error);
    }
  };
  
  const updateAbrechnungsStatus = async (jahr, monat, typ, aktion, datum) => {
    try {
      await axios.post(`${API_BASE_URL}/fahrten/abrechnungsstatus`, {
        jahr,
        monat,
        typ,
        aktion,
        datum
      });
      await fetchFahrten();
      await fetchMonthlyData();
      showNotification("Erfolg", "Abrechnungsstatus wurde aktualisiert");
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Abrechnungsstatus:', error);
      showNotification("Fehler", "Status konnte nicht aktualisiert werden");
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
        mitfahrer: fahrt.mitfahrer || []
      })));
      setSummary(response.data.summary);  // Diese Zeile hinzufügen
    } catch (error) {
      console.error('Fehler beim Abrufen der Fahrten:', error);
      setFahrten([]);
      setSummary({});  // Diese Zeile hinzufügen
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
          monatNr: date.getMonth() + 1,  // Hier fügen wir monatNr explizit hinzu
          kirchenkreisErstattung: response.data.summary.kirchenkreisErstattung,
          gemeindeErstattung: response.data.summary.gemeindeErstattung,
          mitfahrerErstattung: response.data.summary.mitfahrerErstattung || 0,
          abrechnungsStatus: response.data.summary.abrechnungsStatus
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
      isLoggedIn, login, logout, token, updateFahrt, user, setUser, orte, distanzen, fahrten, selectedMonth, gesamtKirchenkreis, gesamtGemeinde,
      setSelectedMonth, addOrt, addFahrt, addDistanz, updateOrt, updateDistanz, 
      fetchFahrten, deleteFahrt, deleteDistanz, deleteOrt, monthlyData, fetchMonthlyData, summary, setSummary,
      setIsProfileModalOpen, isProfileModalOpen, updateAbrechnungsStatus, showNotification, closeNotification, setFahrten
    }}>
    {children}
    <NotificationModal
    isOpen={notification.isOpen}
    onClose={closeNotification}
    title={notification.title}
    message={notification.message}
    onConfirm={notification.onConfirm}
    showCancel={notification.showCancel}
    />
    </AppContext.Provider>
  );
}

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
    <div className="mb-4">
    <div className="table-container">
    <div className="bg-primary-25 p-6">
    <form onSubmit={handleSubmit}>
    {/* Alle Eingabefelder in einer Zeile auf Desktop */}
    <div className="flex flex-col sm:flex-row gap-4">
    <div className="w-full sm:w-1/4">
    <input
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    placeholder="Name des Ortes"
    className="form-input w-full h-8"
    required
    />
    </div>
    <div className="w-full sm:w-2/5">
    <input
    type="text"
    value={adresse}
    onChange={(e) => setAdresse(e.target.value)}
    placeholder="Vollständige Adresse"
    className="form-input w-full h-8"
    required
    />
    </div>
    <div className="w-full sm:w-1/5">
    <select
    value={ortTyp} // Das müsste als State definiert sein
    onChange={(e) => {
      const value = e.target.value;
      setOrtTyp(value);
      setIstWohnort(value === 'wohnort');
      setIstDienstort(value === 'dienstort');
      setIstKirchspiel(value === 'kirchspiel');
    }}
    className="form-select w-full h-8"
    >
    <option value="">Art des Ortes</option>
    {!hasWohnort && <option value="wohnort">Wohnort</option>}
    {!hasDienstort && <option value="dienstort">Dienstort</option>}
    <option value="kirchspiel">Kirchspiel</option>
    <option value="none">Sonstiger Ort</option>
    </select>
    </div>
    <div className="w-full sm:w-auto sm:self-end">
    <button 
    type="submit" 
    className="w-full sm:w-auto bg-primary-500 text-white px-4 h-8 rounded hover:bg-primary-600 transition-colors duration-200 text-sm shadow-sm whitespace-nowrap"
    >
    Hinzufügen
    </button>
    </div>
    </div>
    </form>
    </div>
    </div>
    </div>
  );
}
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
    <div className="table-container">
    <div className="bg-primary-25 p-6">
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
    <div className="w-full sm:flex-1">
    <select
    value={vonOrtId}
    onChange={(e) => setVonOrtId(e.target.value)}
    className="form-select w-full h-8"
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
    className="form-select w-full h-8"
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
    className="form-input w-full h-8"
    required
    />
    </div>
    
    <button 
    type="submit" 
    className="bg-primary-500 text-white px-6 h-8 rounded-md hover:bg-primary-600 transition-colors duration-200 text-sm whitespace-nowrap shadow-sm"
    >
    {existingDistanz ? 'Aktualisieren' : 'Hinzufügen'}
    </button>
    </form>
    
    {existingDistanz && (
      <div className="mt-4 text-sm text-primary-600">
      Bestehende Distanz wird aktualisiert
      </div>
    )}
    </div>
    </div>
    </div>
  );
}

function FahrtenListe() {
  const { fahrten, selectedMonth, setSelectedMonth, fetchFahrten, deleteFahrt, updateFahrt, orte, fetchMonthlyData, showNotification, summary, setFahrten } = useContext(AppContext);
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
    showNotification(
      "Fahrt löschen",
      "Sind Sie sicher, dass Sie diese Fahrt löschen möchten?",
      async () => {
        try {
          await deleteFahrt(id);
          fetchFahrten();
          fetchMonthlyData();
          showNotification("Erfolg", "Die Fahrt wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen der Fahrt:', error);
          showNotification("Fehler", "Beim Löschen der Fahrt ist ein Fehler aufgetreten.");
        }
      },
      true // showCancel
    );
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
      const updatedFahrten = fahrten.map(f => 
        f.id === editingFahrt.id ? { ...f, ...updatedFahrt } : f);
      
      setFahrten(updatedFahrten);
      await updateFahrt(editingFahrt.id, updatedFahrt);
      
      setEditingFahrt(null);
      fetchFahrten();
      fetchMonthlyData();
      showNotification("Erfolg", "Die Fahrt wurde erfolgreich aktualisiert.");
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Fahrt:', error);
      showNotification("Fehler", "Beim Aktualisieren der Fahrt ist ein Fehler aufgetreten.");
    }
  };
  
  const handleViewMitfahrer = (mitfahrer, event) => {
    event.stopPropagation(); // Verhindert das Bubbling zum Bearbeitungs-Handler
    setViewingMitfahrer(mitfahrer);
  };
  
  const resetToCurrentMonth = () => {
    const date = new Date();
    setSelectedYear(date.getFullYear().toString());
    setSelectedMonthName(date.toLocaleString('default', { month: 'long' }));
    setSelectedMonth(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
  };
  
  const renderAbrechnungsStatus = (summary) => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const kkReceived = summary.abrechnungsStatus?.kirchenkreis?.erhalten_am;
    const gemReceived = summary.abrechnungsStatus?.gemeinde?.erhalten_am;
    
    const currentTotal = (
      (!kkReceived ? Number(summary.kirchenkreisErstattung || 0) : 0) +
      (!gemReceived ? Number(summary.gemeindeErstattung || 0) : 0) +
      (!kkReceived ? Number(summary.mitfahrerErstattung || 0) : 0)
    ).toFixed(2);
    
    const originalTotal = (
      Number(summary.kirchenkreisErstattung || 0) +
      Number(summary.gemeindeErstattung || 0) +
      Number(summary.mitfahrerErstattung || 0)
    ).toFixed(2);
    
    const renderStatusIcon = (status) => {
      if (status?.erhalten_am) {
        return <span className="text-green-500">✓</span>;
      }
      if (status?.eingereicht_am) {
        return <span className="text-yellow-500">○</span>;
      }
      return null;
    };
    
    return (
      <div className="table-container mb-4">
      <div className="bg-primary-25 p-6 space-y-6">
      {/* Header mit Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h2 className="text-lg font-semibold text-primary-900">Fahrten</h2>
      
      <div className="flex flex-wrap items-center gap-2">
      {selectedMonth !== currentMonth && (
        <button onClick={resetToCurrentMonth} className="btn-secondary">
        Aktueller Monat
        </button>
      )}
      <select
      value={new Date(`${selectedMonth}-01`).getMonth().toString()}
      onChange={handleMonthChange}
      className="form-select w-36">
      {[...Array(12)].map((_, i) => (
        <option key={i} value={i}>
        {new Date(0, i).toLocaleString("default", { month: "long" })}
        </option>
      ))}
      </select>
      <select
      value={selectedYear}
      onChange={handleYearChange}
      className="form-select w-24">
      {[...Array(6)].map((_, i) => {
        const year = 2024 + i;
        return (
          <option key={year} value={year}>
          {year}
          </option>
        );
      })}
      </select>
      </div>
      </div>
      
      {/* Zusammenfassung Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-primary-600">Kirchenkreis</span>
      {summary.abrechnungsStatus?.kirchenkreis?.erhalten_am ? (
        <span className="text-primary-600 text-xs">● Erhalten</span>
      ) : summary.abrechnungsStatus?.kirchenkreis?.eingereicht_am ? (
        <span className="text-secondary-600 text-xs">○ Eingereicht</span>
      ) : null}
      </div>
      <div
      className={'text-lg font-semibold ${summary.abrechnungsStatus?.kirchenkreis?.erhalten_am ? "text-gray-400" : "text-primary-900"}'}>
      {Number(summary.kirchenkreisErstattung || 0).toFixed(2)} €
      </div>
      {summary.abrechnungsStatus?.kirchenkreis?.eingereicht_am && (
        <div className="text-xs text-primary-600 mt-2">
        Eingereicht:{" "}
        {new Date(
          summary.abrechnungsStatus.kirchenkreis.eingereicht_am,
        ).toLocaleDateString()}
        </div>
      )}
      {summary.abrechnungsStatus?.kirchenkreis?.erhalten_am && (
        <div className="text-xs text-primary-600">
        Erhalten:{" "}
        {new Date(
          summary.abrechnungsStatus.kirchenkreis.erhalten_am,
        ).toLocaleDateString()}
        </div>
      )}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-primary-600">Gemeinde</span>
      {summary.abrechnungsStatus?.gemeinde?.erhalten_am ? (
        <span className="text-primary-600 text-xs">● Erhalten</span>
      ) : summary.abrechnungsStatus?.gemeinde?.eingereicht_am ? (
        <span className="text-secondary-600 text-xs">○ Eingereicht</span>
      ) : null}
      </div>
      <div
      className={'text-lg font-semibold ${summary.abrechnungsStatus?.gemeinde?.erhalten_am ? "text-gray-400" : "text-primary-900"}'}>
      {Number(summary.gemeindeErstattung || 0).toFixed(2)} €
      </div>
      {summary.abrechnungsStatus?.gemeinde?.eingereicht_am && (
        <div className="text-xs text-primary-600 mt-2">
        Eingereicht:{" "}
        {new Date(
          summary.abrechnungsStatus.gemeinde.eingereicht_am,
        ).toLocaleDateString()}
        </div>
      )}
      {summary.abrechnungsStatus?.gemeinde?.erhalten_am && (
        <div className="text-xs text-primary-600">
        Erhalten:{" "}
        {new Date(
          summary.abrechnungsStatus.gemeinde.erhalten_am,
        ).toLocaleDateString()}
        </div>
      )}
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-primary-600">Mitfahrer</span>
      </div>
      <div
      className={'text-lg font-semibold ${summary.abrechnungsStatus?.kirchenkreis?.erhalten_am ? "text-gray-400" : "text-primary-900"}'}>
      {Number(summary.mitfahrerErstattung || 0).toFixed(2)} €
      </div>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-primary-600">Gesamt</span>
      </div>
      <div className="text-lg font-semibold text-primary-900">
      {currentTotal} €
      {(kkReceived || gemReceived) && currentTotal !== originalTotal && (
        <span className="text-sm text-gray-400 ml-2">
        ({originalTotal} €)
        </span>
      )}
      </div>
      </div>
      </div>
      
      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2">
      <button
      onClick={() =>
        handleExportToExcel(
          "kirchenkreis",
          selectedYear,
          selectedMonth.split("-")[1],
        )
      }
      className="btn-primary">
      Export Kirchenkreis / Mitfaher:innen
      </button>
      <button
      onClick={() =>
        handleExportToExcel(
          "gemeinde",
          selectedYear,
          selectedMonth.split("-")[1],
        )
      }
      className="btn-primary">
      Export Gemeinde
      </button>
      </div>
      </div>
      </div>
    );
    
  };
  
  const roundKilometers = (value) => {
    console.log("roundKilometers input:", value);
    const numValue = Number(value ?? 0);
    return numValue % 1 < 0.5 ? Math.floor(numValue) : Math.ceil(numValue);
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
  
  const formatValue = (value) => {
    console.log("formatValue input:", value);
    return value == null ? "" : value;
  };
  
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
    showNotification(
      "Mitfahrer löschen",
      "Sind Sie sicher, dass Sie diesen Mitfahrer löschen möchten?",
      async () => {
        try {
          await axios.delete(`${API_BASE_URL}/fahrten/${fahrtId}/mitfahrer/${mitfahrerId}`);
          fetchFahrten();
          showNotification("Erfolg", "Der Mitfahrer wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen des Mitfahrers:', error);
          showNotification("Fehler", "Beim Löschen des Mitfahrers ist ein Fehler aufgetreten.");
        }
      },
      true // showCancel
    );
  };
  
  const handleSaveMitfahrer = async (updatedMitfahrer) => {
    try {
      console.log('Saving Mitfahrer:', updatedMitfahrer);  // Debugging
      if (!updatedMitfahrer.fahrtId) {
        throw new Error('Fahrt ID ist nicht definiert');
      }
      if (updatedMitfahrer.isNew) {
        await axios.post(`${API_BASE_URL}/fahrten/${updatedMitfahrer.fahrtId}/mitfahrer`, updatedMitfahrer);
      } else {
        if (!updatedMitfahrer.id) {
          throw new Error('Mitfahrer ID ist nicht definiert');
        }
        await axios.put(`${API_BASE_URL}/fahrten/${updatedMitfahrer.fahrtId}/mitfahrer/${updatedMitfahrer.id}`, updatedMitfahrer);
      }
      setEditingMitfahrer(null);
      fetchFahrten();
    } catch (error) {
      console.error('Fehler beim Speichern des Mitfahrers:', error);
      showNotification("Fehler", `Fehler beim Speichern des Mitfahrers: ${error.message}`);
    }
  };
  
  const renderMitfahrer = (fahrt) => {
    if (!fahrt.mitfahrer || fahrt.mitfahrer.length === 0) {
      return null;
    }
    
    const isHinfahrt = !fahrt.anlass.toLowerCase().includes('rückfahrt');
    
    return (
      <div className="flex flex-wrap gap-1">
      {fahrt.mitfahrer.map((person, index) => {
        const shouldDisplay = 
        (isHinfahrt && (person.richtung === 'hin' || person.richtung === 'hin_rueck')) ||
        (!isHinfahrt && (person.richtung === 'rueck' || person.richtung === 'hin_rueck'));
        
        if (!shouldDisplay) return null;
        
        return (
          <span
          key={index}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-50 text-primary-700 cursor-pointer"
          onClick={(event) => handleViewMitfahrer(person, event)}
          >
          {person.name}
          </span>
        );
      })}
      </div>
    );
  };
  
  const renderFahrtRow = (fahrt, detail = null) => (
    <tr 
    key={detail ? `${fahrt.id}-${detail.id}` : fahrt.id} 
    className={`${
      detail ? "bg-primary-50" : 
      (fahrt.autosplit ? "bg-primary-25" : "")
      } hover:bg-primary-25 transition-colors duration-150`}
    >
    <td className="table-cell">
    {editingFahrt?.id === fahrt.id ? (
      <input
      type="date"
      value={editingFahrt.datum}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, datum: e.target.value })}
      className="form-input"
      />
    ) : (
      new Date(fahrt.datum).toLocaleDateString()
    )}
    </td>
    <td className="table-cell">
    {editingFahrt?.id === fahrt.id ? (
      <div className="space-y-2">
      <label className="flex items-center cursor-pointer">
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
        className="form-select"
        >
        <option value="">Bitte wählen</option>
        {renderOrteOptions(orte)}
        </select>
      ) : (
        <input
        type="text"
        value={editingFahrt.einmaliger_von_ort || ''}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_von_ort: e.target.value })}
        className="form-input"
        placeholder="Von (einmalig)"
        />
      )}
      </div>
    ) : (
      <div>
      <div className="text-primary-900">{detail ? detail.von_ort_name : (fahrt.von_ort_name || fahrt.einmaliger_von_ort || "")}</div>
      <div className="text-xs text-primary-600">{detail ? detail.von_ort_adresse : fahrt.von_ort_adresse}</div>
      </div>
    )}
    </td>
    <td className="table-cell">
    {editingFahrt?.id === fahrt.id ? (
      <div className="space-y-2">
      <label className="flex items-center cursor-pointer">
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
        className="form-select"
        >
        <option value="">Bitte wählen</option>
        {renderOrteOptions(orte)}
        </select>
      ) : (
        <input
        type="text"
        value={editingFahrt.einmaliger_nach_ort || ''}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_nach_ort: e.target.value })}
        className="form-input"
        placeholder="Nach (einmalig)"
        />
      )}
      </div>
    ) : (
      <div>
      <div className="text-primary-900">{detail ? detail.nach_ort_name : (fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || "")}</div>
      <div className="text-xs text-primary-600">{detail ? detail.nach_ort_adresse : fahrt.nach_ort_adresse}</div>
      </div>
    )}
    </td>
    <td className="table-cell">
    {editingFahrt?.id === fahrt.id ? (
      <input
      type="text"
      value={editingFahrt.anlass}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, anlass: e.target.value })}
      className="form-input"
      />
    ) : (
      fahrt.anlass
    )}
    </td>
    <td className="table-cell text-right">
    {editingFahrt?.id === fahrt.id ? (
      <input
      type="number"
      value={editingFahrt.kilometer}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, kilometer: parseFloat(e.target.value) })}
      className="form-input"
      />
    ) : (
      `${formatValue(roundKilometers(detail ? detail.kilometer : fahrt.kilometer))} km`
    )}
    </td>
    <td className="table-cell">
    {editingFahrt?.id === fahrt.id ? (
      <select
      value={editingFahrt.abrechnung}
      onChange={(e) => setEditingFahrt({ ...editingFahrt, abrechnung: e.target.value })}
      className="form-select"
      >
      <option value="Kirchenkreis">Kirchenkreis</option>
      <option value="Gemeinde">Gemeinde</option>
      <option value="Autosplit">Autosplit</option>
      </select>
    ) : (
      detail ? detail.abrechnung : fahrt.abrechnung
    )}
    </td>
    <td className="table-cell">
    {editingFahrt?.id === fahrt.id ? (
      <div className="space-y-2">
      {fahrt.mitfahrer && fahrt.mitfahrer.map((person, index) => (
        <div key={index} className="flex items-center justify-between">
        <span
        className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-50 text-primary-700 cursor-pointer"
        onClick={() => handleEditMitfahrer(fahrt.id, person)}
        >
        {person.name}
        </span>
        <button
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteMitfahrer(fahrt.id, person.id);
        }}
        className="btn-secondary text-xs"
        >
        ×
        </button>
        </div>
      ))}
      <button
      onClick={() => handleAddMitfahrer(fahrt.id)}
      className="btn-primary text-xs w-full"
      >
      + Mitfahrer:in
      </button>
      </div>
    ) : (
      renderMitfahrer(fahrt)
    )}
    </td>
    <td className="table-cell text-right">
    {editingFahrt?.id === fahrt.id ? (
      <div className="flex justify-end gap-1">
      
      <button onClick={handleSave} className="btn-primary text-xs">Speichern</button>
      <button onClick={() => setEditingFahrt(null)} className="btn-secondary text-xs">Abbrechen</button>
      </div>
    ) : (
      <div className="flex justify-end gap-1">
      {!fahrt.autosplit && (
        <button onClick={() => handleEdit(fahrt)} className="btn-primary text-xs" title="Bearbeiten">
        ✎
        </button>
      )}
      <button onClick={() => handleDelete(fahrt.id)} className="btn-secondary text-xs" title="Löschen">
      ×
      </button>
      {fahrt.autosplit && expandedFahrten[fahrt.id] !== undefined && (
        <button 
        onClick={() => toggleFahrtDetails(fahrt.id)} 
        className="btn-primary text-xs"
        title={expandedFahrten[fahrt.id] ? 'Einklappen' : 'Ausklappen'}
        >
        {expandedFahrten[fahrt.id] ? '▼' : '▶'}
        </button>
      )}
      </div>
    )}
    </td>
    </tr>
  );
  
  // Haupt-Return für die Komponente
  return (
    <div>
    {renderAbrechnungsStatus(summary)}
    {/* Desktop View */}
    <div className="hidden md:block">
    <table className="w-full border-collapse border border-primary-100">
    <thead>
    <tr className="bg-primary-25 border-b border-primary-100">
    <th className="table-header" onClick={() => requestSort('datum')}>
    Datum {sortConfig.key === 'datum' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
    </th>
    <th className="table-header" onClick={() => requestSort('von_ort_name')}>
    Von {sortConfig.key === 'von_ort_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
    </th>
    <th className="table-header" onClick={() => requestSort('nach_ort_name')}>
    Nach {sortConfig.key === 'nach_ort_name' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
    </th>
    <th className="table-header" onClick={() => requestSort('anlass')}>
    Anlass {sortConfig.key === 'anlass' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
    </th>
    <th className="table-header text-right" onClick={() => requestSort('kilometer')}>
    km {sortConfig.key === 'kilometer' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
    </th>
    <th className="table-header" onClick={() => requestSort('abrechnung')}>
    Abrechnung {sortConfig.key === 'abrechnung' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
    </th>
    <th className="table-header">Mitfahrer:innen</th>
    <th className="table-header text-right">Aktionen</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50">
    {sortedFahrten.map((fahrt) => (
      <React.Fragment key={fahrt.id}>
      {renderFahrtRow(fahrt)}
      {fahrt.autosplit && expandedFahrten[fahrt.id] && fahrt.details.length > 0 && 
        fahrt.details.map((detail, idx) => renderFahrtRow(fahrt, detail, idx))}
      </React.Fragment>
    ))}
    </tbody>
    </table>
    </div>
    
    {/* Mobile View */}
    <div className="md:hidden space-y-4">
    {sortedFahrten.map((fahrt) => (
      <div key={fahrt.id}
      className={`bg-primary-25 p-4 rounded-lg border border-primary-100 ${
        fahrt.autosplit ? "bg-primary-25" : ""
      }`}>
      {editingFahrt?.id === fahrt.id ? (
        // Edit Mode
        <div className="space-y-4">
        <input
        type="date"
        value={editingFahrt.datum}
        onChange={(e) =>
          setEditingFahrt({ ...editingFahrt, datum: e.target.value })
        }
        className="form-input w-full"
        />
        
        <div>
        <label className="text-xs text-primary-600">Von</label>
        <select
        value={editingFahrt.von_ort_id || ''}
        onChange={(e) =>
          setEditingFahrt({ ...editingFahrt, von_ort_id: e.target.value })
        }
        className="form-select w-full mt-1"
        >
        <option value="">Bitte wählen</option>
        {renderOrteOptions(orte)}
        </select>
        </div>
        
        <div>
        <label className="text-xs text-primary-600">Nach</label>
        <select
        value={editingFahrt.nach_ort_id || ''}
        onChange={(e) =>
          setEditingFahrt({ ...editingFahrt, nach_ort_id: e.target.value })
        }
        className="form-select w-full mt-1"
        >
        <option value="">Bitte wählen</option>
        {renderOrteOptions(orte)}
        </select>
        </div>
        
        <div>
        <label className="text-xs text-primary-600">Anlass</label>
        <input
        type="text"
        value={editingFahrt.anlass}
        onChange={(e) =>
          setEditingFahrt({ ...editingFahrt, anlass: e.target.value })
        }
        className="form-input w-full mt-1"
        />
        </div>
        
        <div>
        <label className="text-xs text-primary-600">Kilometer</label>
        <input
        type="number"
        value={editingFahrt.kilometer}
        onChange={(e) =>
          setEditingFahrt({
            ...editingFahrt,
            kilometer: parseFloat(e.target.value),
          })
        }
        className="form-input w-full mt-1"
        />
        </div>
        
        <div>
        <label className="text-xs text-primary-600">Abrechnung</label>
        <select
        value={editingFahrt.abrechnung}
        onChange={(e) =>
          setEditingFahrt({ ...editingFahrt, abrechnung: e.target.value })
        }
        className="form-select w-full mt-1"
        >
        <option value="Kirchenkreis">Kirchenkreis</option>
        <option value="Gemeinde">Gemeinde</option>
        <option value="Autosplit">Autosplit</option>
        </select>
        </div>
        
        <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary flex-1">
        Speichern
        </button>
        <button onClick={() => setEditingFahrt(null)} className="btn-secondary flex-1">
        Abbrechen
        </button>
        </div>
        </div>
      ) : (
        // View Mode
        <div key={fahrt.id}
        className={`bg-white p-4 rounded-lg border border-primary-100 ${
          fahrt.autosplit ? "bg-primary-25" : ""
        }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
        <div>
        <div className="text-primary-900 font-medium">
        {new Date(fahrt.datum).toLocaleDateString()}
        </div>
        <div className="text-sm text-primary-600">
        {fahrt.autosplit ? "Via Dienstort" : fahrt.abrechnung}
        </div>
        </div>
        <div className="flex gap-1">
        {!fahrt.autosplit && (
          <button onClick={() => handleEdit(fahrt)} className="btn-primary text-xs">
          ✎
          </button>
        )}
        <button onClick={() => handleDelete(fahrt.id)} className="btn-secondary text-xs">
        ×
        </button>
        {fahrt.autosplit && (
          <button
          onClick={() => toggleFahrtDetails(fahrt.id)}
          className="btn-primary text-xs"
          >
          {expandedFahrten[fahrt.id] ? '▼' : '▶'}
          </button>
        )}
        </div>
        </div>
        
        <div className="space-y-4">
        {/* Route */}
        <div className="grid grid-cols-1 gap-2">
        <div>
        <div className="text-xs text-primary-600">Von</div>
        <div className="text-primary-900">
        {fahrt.von_ort_name || fahrt.einmaliger_von_ort || ""}
        </div>
        {fahrt.von_ort_adresse && (
          <div className="text-xs text-primary-600">
          {fahrt.von_ort_adresse}
          </div>
        )}
        </div>
        <div>
        <div className="text-xs text-primary-600">Nach</div>
        <div className="text-primary-900">
        {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || ""}
        </div>
        {fahrt.nach_ort_adresse && (
          <div className="text-xs text-primary-600">
          {fahrt.nach_ort_adresse}
          </div>
        )}
        </div>
        </div>
        
        {/* Anlass & Kilometer */}
        <div className="grid grid-cols-2 gap-4">
        <div>
        <div className="text-xs text-primary-600">Anlass</div>
        <div className="text-primary-900">{fahrt.anlass}</div>
        </div>
        <div>
        <div className="text-xs text-primary-600">Kilometer</div>
        <div className="text-primary-900">
        {formatValue(roundKilometers(fahrt.kilometer))} km
        </div>
        </div>
        </div>
        
        {/* Mitfahrer */}
        {fahrt.mitfahrer?.length > 0 && (
          <div>
          <div className="text-xs text-primary-600 mb-1">Mitfahrer:innen</div>
          {renderMitfahrer(fahrt)}
          </div>
        )}
        
        {/* Autosplit Details */}
        {fahrt.autosplit && expandedFahrten[fahrt.id] && (
          <div className="space-y-2">
          {fahrt.details.map((detail, idx) => (
            <div key={idx} className="bg-primary-50 p-2 rounded">
            <div className="text-xs text-primary-600">
            {detail.abrechnung}
            </div>
            <div className="text-sm">
            {detail.von_ort_name} → {detail.nach_ort_name}
            </div>
            <div className="text-sm">
            {formatValue(roundKilometers(detail.kilometer))} km
            </div>
            </div>
          ))}
          </div>
        )}
        </div>
        </div>
      )}
      </div>
    ))
    }
    
    
    {/* Modals */}
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
    </div>
  );
}
            
function MonthlyOverview() {
  const { monthlyData, fetchMonthlyData, updateAbrechnungsStatus } = React.useContext(AppContext);
  const [statusModal, setStatusModal] = useState({ open: false, typ: '', aktion: '', jahr: null, monat: null });
  const [selectedYear, setSelectedYear] = useState('all'); // 'all' für Gesamt
  const [hideCompleted, setHideCompleted] = useState(true); // Standard: abgeschlossene ausblenden

  useEffect(() => {
    fetchMonthlyData();
  }, []);
  
  const handleStatusUpdate = async (jahr, monat, typ, aktion, datum) => {
    try {
      await updateAbrechnungsStatus(jahr, monat, typ, aktion, datum);
      await fetchMonthlyData();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
    }
  };
  
  // Neue Hilfsfunktion zum Filtern der Daten
  const getFilteredData = () => {
    return monthlyData.filter(month => {
      // Jahr filtern
      if (selectedYear !== 'all' && month.year.toString() !== selectedYear) {
        return false;
      }
      
      // Abgeschlossene ausblenden wenn gewünscht
      if (hideCompleted) {
        const isCompleted = month.abrechnungsStatus?.kirchenkreis?.erhalten_am && 
        month.abrechnungsStatus?.gemeinde?.erhalten_am;
        if (isCompleted) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  const getStatusColor = (status) => {
    if (status?.erhalten_am) return 'bg-green-50';
    if (status?.eingereicht_am) return 'bg-yellow-50';
    return '';
  };
    
  const calculateYearTotal = () => {
    return getFilteredData().reduce((total, month) => {
      // Berechne immer die Originalbeträge
      total.originalKirchenkreis += Number(month.kirchenkreisErstattung || 0);
      total.originalGemeinde += Number(month.gemeindeErstattung || 0);
      total.originalMitfahrer += Number(month.mitfahrerErstattung || 0);
      
      // Für die aktuelle Summe nur nicht-erhaltene Beträge addieren
      if (!month.abrechnungsStatus?.kirchenkreis?.erhalten_am) {
        total.kirchenkreis += Number(month.kirchenkreisErstattung || 0);
        total.mitfahrer += Number(month.mitfahrerErstattung || 0);
      }
      if (!month.abrechnungsStatus?.gemeinde?.erhalten_am) {
        total.gemeinde += Number(month.gemeindeErstattung || 0);
      }
      
      // Berechne beide Gesamtsummen
      total.originalGesamt = total.originalKirchenkreis + total.originalGemeinde + total.originalMitfahrer;
      total.gesamt = total.kirchenkreis + total.gemeinde + total.mitfahrer;
      
      return total;
    }, {
      kirchenkreis: 0, gemeinde: 0, mitfahrer: 0, gesamt: 0,
      originalKirchenkreis: 0, originalGemeinde: 0, originalMitfahrer: 0, originalGesamt: 0
    });
  };
  
  const renderBetrag = (betrag, isReceived) => {
    return (
      <span className={isReceived ? "text-gray-400" : ""}>
      {Number(betrag || 0).toFixed(2)} €
      </span>
    );
  };
  
  const QuickActions = ({ filteredData, handleStatusUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const actions = [
      {
        label: 'Alle als eingereicht markieren',
        action: async () => {
          const today = new Date().toISOString().split('T')[0];
          try {
            for (const month of filteredData) {
              // Kirchenkreis
              if (month.kirchenkreisErstattung > 0 && 
                !month.abrechnungsStatus?.kirchenkreis?.eingereicht_am) {
                  await handleStatusUpdate(
                    month.year, 
                    month.monatNr, 
                    'Kirchenkreis', 
                    'eingereicht', 
                    today
                  );
                }
              // Gemeinde
              if (month.gemeindeErstattung > 0 && 
                !month.abrechnungsStatus?.gemeinde?.eingereicht_am) {
                  await handleStatusUpdate(
                    month.year, 
                    month.monatNr, 
                    'Gemeinde', 
                    'eingereicht', 
                    today
                  );
                }
            }
          } catch (error) {
            console.error('Fehler beim Massenupdate:', error);
          }
        }
      },
      {
        label: 'Alle eingereichten als erhalten markieren',
        action: async () => {
          const today = new Date().toISOString().split('T')[0];
          try {
            for (const month of filteredData) {
              // Kirchenkreis
              if (month.abrechnungsStatus?.kirchenkreis?.eingereicht_am && 
                !month.abrechnungsStatus?.kirchenkreis?.erhalten_am) {
                  await handleStatusUpdate(
                    month.year, 
                    month.monatNr, 
                    'Kirchenkreis', 
                    'erhalten', 
                    today
                  );
                }
              // Gemeinde
              if (month.abrechnungsStatus?.gemeinde?.eingereicht_am && 
                !month.abrechnungsStatus?.gemeinde?.erhalten_am) {
                  await handleStatusUpdate(
                    month.year, 
                    month.monatNr, 
                    'Gemeinde', 
                    'erhalten', 
                    today
                  );
                }
            }
          } catch (error) {
            console.error('Fehler beim Massenupdate:', error);
          }
        }
      }
    ];
    
    return (
      <div className="relative">
      <button
      onClick={() => setIsOpen(!isOpen)}
      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 flex items-center"
      >
      Schnellaktionen ▼
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg z-10">
        {actions.map((action, index) => (
          <button
          key={index}
          onClick={async () => {
            await action.action();
            setIsOpen(false);
          }}
          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
          {action.label}
          </button>
        ))}
        </div>
      )}
      </div>
    );
  };
  
  const renderStatusCell = (month, typ) => {
    const status = typ === 'Kirchenkreis' ? 
    month.abrechnungsStatus?.kirchenkreis : 
    month.abrechnungsStatus?.gemeinde;
    const betrag = typ === 'Kirchenkreis' ? 
    month.kirchenkreisErstattung : 
    month.gemeindeErstattung;
    
    if (status?.erhalten_am) {
      return (
        <div className="flex items-center space-x-2">
        <span className="text-green-500">✓</span>
        <span className="text-xs text-green-700">
        {new Date(status.erhalten_am).toLocaleDateString()}
        </span>
        <button
        onClick={() => handleStatusUpdate(month.year, month.monatNr, typ, 'reset')}
        className="ml-2 text-xs text-gray-400 hover:text-red-500"
        title="Zurücksetzen"
        >
        ×
        </button>
        </div>
      );
    }
    
    if (status?.eingereicht_am) {
      return (
        <div className="flex items-center space-x-2">
        <span className="text-yellow-500">○</span>
        <span className="text-xs text-yellow-700">
        {new Date(status.eingereicht_am).toLocaleDateString()}
        </span>
        <div className="space-x-1">
        <button
        onClick={() => setStatusModal({ 
          open: true, 
          typ, 
          aktion: 'erhalten', 
          jahr: month.year,
          monat: month.monatNr
        })}
        className="text-xs bg-green-100 text-green-700 px-2 rounded"
        >
        ✓
        </button>
        <button
        onClick={() => handleStatusUpdate(month.year, month.monatNr, typ, 'reset')}
        className="text-xs bg-red-100 text-red-700 px-2 rounded"
        >
        ×
        </button>
        </div>
        </div>
      );
    }
    
    return betrag > 0 ? (
      <button
      onClick={() => setStatusModal({ 
        open: true, 
        typ, 
        aktion: 'eingereicht', 
        jahr: month.year,
        monat: month.monatNr
      })}
      className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
      >
      <span>⟳</span>
      <span>Einreichen</span>
      </button>
    ) : null;
  };
  
  const yearTotal = calculateYearTotal();
  
  return (
    <div>
    <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-semibold">Monatliche Übersicht</h2>
    </div>
    
    <div className="mb-4 flex items-center justify-between bg-gray-100 p-3 rounded">
    <div className="flex items-center space-x-4">
    <div>
    <label className="mr-2">Jahr:</label>
    <select 
    value={selectedYear} 
    onChange={(e) => setSelectedYear(e.target.value)}
    className="p-1 border rounded"
    >
    <option value="all">Gesamt</option>
    {[...new Set(monthlyData.map(m => m.year))]
      .sort((a, b) => b - a)
      .map(year => (
        <option key={year} value={year}>{year}</option>
      ))
    }
    </select>
    </div>
    
    <div className="flex items-center">
    <input
    type="checkbox"
    id="hideCompleted"
    checked={hideCompleted}
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="mr-2"
    />
    <label htmlFor="hideCompleted">
    Abgeschlossene Monate ausblenden
    </label>
    </div>
    </div>
    
    <div className="flex items-center space-x-4">
    <div className="text-sm text-gray-600">
    {getFilteredData().length} von {monthlyData.length} Monaten angezeigt
    </div>
    <QuickActions filteredData={getFilteredData()} handleStatusUpdate={handleStatusUpdate} />
    </div>
    </div>
    
    <table className="w-full border-collapse text-left">
    <thead>
    <tr className="bg-gray-200">
    <th className="border px-2 py-1 text-sm font-medium w-32">Monat</th>
    <th className="border px-2 py-1 text-sm font-medium">Kirchenkreis</th>
    <th className="border px-2 py-1 text-sm font-medium">Status Kirchenkreis</th>
    <th className="border px-2 py-1 text-sm font-medium">Gemeinde</th>
    <th className="border px-2 py-1 text-sm font-medium">Status Gemeinde</th>
    <th className="border px-2 py-1 text-sm font-medium">Mitfahrer</th>
    <th className="border px-2 py-1 text-sm font-medium">Gesamt</th>
    </tr>
    </thead>
    <tbody>
    {getFilteredData().map((month) => {
      const kkStatus = month.abrechnungsStatus?.kirchenkreis;
      const gemStatus = month.abrechnungsStatus?.gemeinde;
      const rowColor = (kkStatus?.erhalten_am && gemStatus?.erhalten_am) ? 'bg-green-50' :
      (kkStatus?.eingereicht_am && gemStatus?.eingereicht_am) ? 'bg-yellow-50' : '';

      const kkReceived = month.abrechnungsStatus?.kirchenkreis?.erhalten_am;
      const gemReceived = month.abrechnungsStatus?.gemeinde?.erhalten_am;
      
      // Berechnung der ausstehenden Beträge
      const ausstehendKK = kkReceived ? 0 : Number(month.kirchenkreisErstattung || 0);
      const ausstehendGem = gemReceived ? 0 : Number(month.gemeindeErstattung || 0);
      const ausstehendMitf = kkReceived ? 0 : Number(month.mitfahrerErstattung || 0);
      const ausstehendGesamt = ausstehendKK + ausstehendGem + ausstehendMitf;
      
      // Originale Gesamtbeträge
      const originalGesamt = Number(month.kirchenkreisErstattung || 0) + 
      Number(month.gemeindeErstattung || 0) + 
      Number(month.mitfahrerErstattung || 0);
      
      return (
        <tr key={month.yearMonth}>
        <td className="border px-2 py-1 text-sm">{`${month.monthName} ${month.year}`}</td>
        <td className="border px-2 py-1 text-sm">
        {renderBetrag(month.kirchenkreisErstattung, kkReceived)}
        </td>
        <td className="border px-2 py-1">
        {renderStatusCell(month, 'Kirchenkreis')}
        </td>
        <td className="border px-2 py-1 text-sm">
        {renderBetrag(month.gemeindeErstattung, gemReceived)}
        </td>
        <td className="border px-2 py-1">
        {renderStatusCell(month, 'Gemeinde')}
        </td>
        <td className="border px-2 py-1 text-sm">
        {renderBetrag(month.mitfahrerErstattung, kkReceived)}
        </td>
        <td className="border px-2 py-1 text-sm">
        {ausstehendGesamt > 0 && (
          <span>{ausstehendGesamt.toFixed(2)} € </span>
        )}
        {(kkReceived || gemReceived) && (
          <span className="text-gray-400">
          ({originalGesamt.toFixed(2)} €)
          </span>
        )}
        </td>
        </tr>
      );
    })}
    <tr className="font-bold bg-gray-100">
    <td className="border px-2 py-1 text-sm">Jahresgesamt</td>
    <td className="border px-2 py-1 text-sm">
    {yearTotal.kirchenkreis.toFixed(2)} €
    {yearTotal.originalKirchenkreis !== yearTotal.kirchenkreis && (
      <span className="text-gray-400 ml-2">({yearTotal.originalKirchenkreis.toFixed(2)} €)</span>
    )}
    </td>
    <td className="border px-2 py-1"></td>
    <td className="border px-2 py-1 text-sm">
    {yearTotal.gemeinde.toFixed(2)} €
    {yearTotal.originalGemeinde !== yearTotal.gemeinde && (
      <span className="text-gray-400 ml-2">({yearTotal.originalGemeinde.toFixed(2)} €)</span>
    )}
    </td>
    <td className="border px-2 py-1"></td>
    <td className="border px-2 py-1 text-sm">
    {yearTotal.mitfahrer.toFixed(2)} €
    {yearTotal.originalMitfahrer !== yearTotal.mitfahrer && (
      <span className="text-gray-400 ml-2">({yearTotal.originalMitfahrer.toFixed(2)} €)</span>
    )}
    </td>
    <td className="border px-2 py-1 text-sm">
    {yearTotal.gesamt.toFixed(2)} €
    {yearTotal.originalGesamt !== yearTotal.gesamt && (
      <span className="text-gray-400 ml-2">({yearTotal.originalGesamt.toFixed(2)} €)</span>
    )}
    </td>
    </tr>
    </tbody>
    </table>
    
    <AbrechnungsStatusModal 
    isOpen={statusModal.open}
    onClose={() => setStatusModal({ open: false })}
    onSubmit={(datum) => {
      handleStatusUpdate(
        statusModal.jahr,
        statusModal.monat,
        statusModal.typ,
        statusModal.aktion,
        datum
      );
      setStatusModal({ open: false });
    }}
    typ={statusModal.typ}
    aktion={statusModal.aktion}
    />
    </div>
  );
}

function OrteListe() {
  const { orte, updateOrt, deleteOrt, showNotification } = useContext(AppContext);
  const [editingOrt, setEditingOrt] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const handleEdit = (ort) => {
    setEditingOrt({ ...ort });
  };
  
  const handleSave = () => {
    const updatedOrt = {
      ...editingOrt,
      ist_wohnort: editingOrt.ist_wohnort !== undefined ? editingOrt.ist_wohnort : false,
      ist_dienstort: editingOrt.ist_dienstort !== undefined ? editingOrt.ist_dienstort : false,
      ist_kirchspiel: editingOrt.ist_kirchspiel !== undefined ? editingOrt.ist_kirchspiel : false
    };
    updateOrt(editingOrt.id, updatedOrt);
    setEditingOrt(null);
    showNotification("Erfolg", "Der Ort wurde erfolgreich aktualisiert.");
  };
  
  
  
  const handleDelete = async (id) => {
    showNotification(
      "Ort löschen",
      "Sind Sie sicher, dass Sie diesen Ort löschen möchten?",
      async () => {
        try {
          await deleteOrt(id);
          showNotification("Erfolg", "Der Ort wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen des Ortes:', error);
          showNotification("Fehler", "Dieser Ort kann nicht gelöscht werden, da er in Fahrten verwendet wird.");
        }
      },
      true // showCancel
    );
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
  
  const getOrtStatus = (ort) => {
    if (ort.ist_wohnort) return 'wohnort';
    if (ort.ist_dienstort) return 'dienstort';
    if (ort.ist_kirchspiel) return 'kirchspiel';
    return '';
  };
  
  const getOrtStatusLabel = (ort) => {
    if (ort.ist_wohnort) return 'Wohnort';
    if (ort.ist_dienstort) return 'Dienstort';
    if (ort.ist_kirchspiel) return 'Kirchspiel';
    return 'Sonstiger Ort';
  };
  
  const handleStatusChange = (e) => {
    const value = e.target.value;
    setEditingOrt({
      ...editingOrt,
      ist_wohnort: value === 'wohnort',
      ist_dienstort: value === 'dienstort',
      ist_kirchspiel: value === 'kirchspiel'
    });
  };
  
  return (
    <div className="table-container">
    <div className="overflow-x-auto w-full">
    <table className="w-full">
    <thead>
    <tr className="bg-primary-25 border-b border-primary-100">
    <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider cursor-pointer"
    onClick={() => requestSort('name')}>
    Name
    </th>
    <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider cursor-pointer"
    onClick={() => requestSort('adresse')}>
    Adresse
    </th>
    <th className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">
    Status
    </th>
    <th className="px-4 py-3 text-right text-xs font-medium text-primary-600 uppercase tracking-wider">
    Aktionen
    </th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50">
    {sortedOrte.map((ort) => (
      <tr key={ort.id} className="hover:bg-primary-25 transition-colors duration-150">
      <td className="px-4 py-3 text-sm text-primary-900">
      {editingOrt?.id === ort.id ? (
        <input
        value={editingOrt.name}
        onChange={(e) => setEditingOrt({ ...editingOrt, name: e.target.value })}
        className="form-input w-full h-8"
        />
      ) : (
        <div className="flex flex-col">
        <span>{ort.name}</span>
        <span className="text-xs text-primary-500 sm:hidden">
        {ort.adresse}
        </span>
        </div>
      )}
      </td>
      <td className="hidden sm:table-cell px-4 py-3 text-sm text-primary-900">
      {editingOrt?.id === ort.id ? (
        <input
        value={editingOrt.adresse}
        onChange={(e) => setEditingOrt({ ...editingOrt, adresse: e.target.value })}
        className="form-input w-full h-8"
        />
      ) : (
        ort.adresse
      )}
      </td>
      <td className="px-4 py-3 text-sm text-primary-900">
      {editingOrt?.id === ort.id ? (
        <select
        value={getOrtStatus(editingOrt)}
        onChange={handleStatusChange}
        className="form-select w-full h-8"
        >
        <option value="">Sonstiger Ort</option>
        <option value="wohnort">Wohnort</option>
        <option value="dienstort">Dienstort</option>
        <option value="kirchspiel">Kirchspiel</option>
        </select>
      ) : (
        getOrtStatusLabel(ort)
      )}
      </td>
      <td className="px-4 py-3 text-sm">
      <div className="flex sm:flex-row flex-col gap-2 justify-end">
      {editingOrt?.id === ort.id ? (
        <button
        onClick={handleSave}
        className="bg-primary-500 text-white px-3 py-1 rounded hover:bg-primary-600 transition-colors duration-150 w-full sm:w-auto text-center"
        >
        ✓
        </button>
      ) : (
        <>
        <button
        onClick={() => handleEdit(ort)}
        className="bg-primary-500 text-white px-3 py-1 rounded hover:bg-primary-600 transition-colors duration-150 w-full sm:w-auto text-center"
        title="Bearbeiten"
        >
        ✎
        </button>
        <button
        onClick={() => handleDelete(ort.id)}
        className="bg-secondary-400 text-white px-3 py-1 rounded hover:bg-secondary-500 transition-colors duration-150 w-full sm:w-auto text-center"
        title="Löschen"
        >
        ×
        </button>
        </>
      )}
      </div>
      </td>
      </tr>
    ))}
    </tbody>
    </table>
    </div>
    </div>
  );
}

function DistanzenListe() {
  const { distanzen, orte, updateDistanz, deleteDistanz, showNotification } = useContext(AppContext);
  const [editingDistanz, setEditingDistanz] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'von_ort_id', direction: 'ascending' });
  
  const handleEdit = (distanz) => {
    setEditingDistanz({ ...distanz });
  };
  
  const handleSave = () => {
    updateDistanz(editingDistanz.id, editingDistanz);
    setEditingDistanz(null);
    showNotification("Erfolg", "Die Distanz wurde erfolgreich aktualisiert.");
  };
  
  const getOrtName = (id) => {
    const ort = orte.find(o => o.id === id);
    return ort ? ort.name : 'Unbekannt';
  };
  
  const handleDelete = async (id) => {
    showNotification(
      "Distanz löschen",
      "Sind Sie sicher, dass Sie diese Distanz löschen möchten?",
      async () => {
        try {
          await deleteDistanz(id);
          showNotification("Erfolg", "Die Distanz wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen der Distanz:', error);
          showNotification("Fehler", "Beim Löschen der Distanz ist ein Fehler aufgetreten.");
        }
      },
      true // showCancel
    );
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
    <div className="table-container">
    <div className="overflow-x-auto w-full">
    <table className="w-full">
    <thead>
    <tr className="bg-primary-25 border-b border-primary-100">
    <th
    className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider cursor-pointer"
    onClick={() => requestSort('von_ort_id')}
    >
    Von
    </th>
    <th
    className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider cursor-pointer"
    onClick={() => requestSort('nach_ort_id')}
    >
    Nach
    </th>
    {/* Distanz wird immer angezeigt, aber mit einem kleinen Trick*/}
    <th
    className="px-4 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider cursor-pointer"
    onClick={() => requestSort('distanz')}
    >
    <span className="sm:hidden">km</span>
    <span className="hidden sm:inline">Distanz (km)</span>
    </th>
    
    <th className="px-4 py-3 text-right text-xs font-medium text-primary-600 uppercase tracking-wider">
    Aktionen
    </th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50">
    {sortedDistanzen.map((distanz) => (
      <tr key={distanz.id} className="hover:bg-primary-25 transition-colors duration-150">
      <td className="px-4 py-3 text-sm text-primary-900">
      <div className="flex flex-col">
      <span>{getOrtName(distanz.von_ort_id)}</span>
      <span className="text-xs text-primary-500 sm:hidden">
      → {getOrtName(distanz.nach_ort_id)}
      </span>
      </div>
      </td>
      <td className="hidden sm:table-cell px-4 py-3 text-sm text-primary-900">
      {getOrtName(distanz.nach_ort_id)}
      </td>
      {/* Distanz wird jetzt immer angezeigt */}
      <td className="px-4 py-3 text-sm text-primary-900">
      {editingDistanz?.id === distanz.id ? (
        <input
        type="number"
        value={editingDistanz.distanz}
        onChange={(e) =>
          setEditingDistanz({
            ...editingDistanz,
            distanz: parseInt(e.target.value),
          })
        }
        className="form-input w-16"
        />
      ) : (
        `${distanz.distanz} km`
      )}
      </td>
      <td className="px-4 py-3 text-sm">
      <div className="flex sm:flex-row flex-col gap-2 justify-end">
      {editingDistanz?.id === distanz.id ? (
        <button
        onClick={handleSave}
        className="bg-primary-500 text-white px-3 py-1 rounded hover:bg-primary-600 transition-colors duration-150 w-full sm:w-auto text-center"
        >
        ✓
        </button>
      ) : (
        <>
        <button
        onClick={() => handleEdit(distanz)}
        className="bg-primary-500 text-white px-3 py-1 rounded hover:bg-primary-600 transition-colors duration-150 w-full sm:w-auto text-center"
        title="Bearbeiten"
        >
        ✎
        </button>
        <button
        onClick={() => handleDelete(distanz.id)}
        className="bg-secondary-400 text-white px-3 py-1 rounded hover:bg-secondary-500 transition-colors duration-150 w-full sm:w-auto text-center"
        title="Löschen"
        >
        ×
        </button>
        </>
      )}
      </div>
      </td>
      </tr>
    ))}
    </tbody>
    </table>
    </div>
    </div>
  );
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AppContext);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
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
    {/* Eingabefeld für Benutzername oder E-Mail */}
    <div className="mt-4">
    <div>
    <label className="block" htmlFor="username">
    Benutzername / E-Mail
    </label>
    <input
    type="text" // Wir verwenden immer text
    placeholder="Benutzername / E-Mail"
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
    <div className="flex flex-col items-baseline justify-between">
    <button
    type="submit"
    className="w-full px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900"
    >
    Login
    </button>
    <button
    type="button"
    onClick={() => setShowForgotPassword(true)}
    className="w-full text-center mt-4 text-blue-500 hover:text-blue-700"
    >
    Passwort vergessen?
    </button>
    </div>
    </div>
    </form>
    </div>
    
    {/* Passwort vergessen Modal */}
    <Modal
    isOpen={showForgotPassword}
    onClose={() => setShowForgotPassword(false)}
    title="Passwort zurücksetzen"
    >
    <ForgotPasswordForm onClose={() => setShowForgotPassword(false)} />
    </Modal>
    </div>
  );
}

function ForgotPasswordForm({ onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/reset-password/request', { email });
      setStatus({
        type: 'success',
        message: 'Wenn ein Account mit dieser E-Mail existiert, wurden Anweisungen zum Zurücksetzen des Passworts versendet.'
      });
      setTimeout(onClose, 3000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      });
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="block text-sm font-medium text-gray-700">
    E-Mail-Adresse
    </label>
    <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
    required
    />
    </div>
    
    {status && (
      <div className={`p-4 rounded ${
        status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
      {status.message}
      </div>
    )}
    
    <div className="flex justify-end space-x-2">
    <button
    type="button"
    onClick={onClose}
    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
    >
    Abbrechen
    </button>
    <button
    type="submit"
    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
    >
    Anweisungen senden
    </button>
    </div>
    </form>
  );
}

function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
  }, []);
  
  return (
    <BrowserRouter>
    <AppProvider>
    <Routes>
    <Route path="/" element={<AppContent />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    </Routes>
    </AppProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const { isLoggedIn, gesamtKirchenkreis, gesamtGemeinde, logout, isProfileModalOpen, setIsProfileModalOpen, user } = useContext(AppContext);
  const [showOrteModal, setShowOrteModal] = useState(false);
  const [showDistanzenModal, setShowDistanzenModal] = useState(false);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  
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
    {/* Header-Bereich mit Navigation */}
    <div className="mb-8">
    {/* Titel und Buttons in einer Flex-Box */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
    <h1 className="text-2xl font-semibold text-primary-900">Fahrtenabrechnung</h1>
    
    {/* Navigation */}
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
    {/* Primäre Aktionen - immer sichtbar */}
    <div className="flex gap-2 w-full sm:w-auto">
    <button
    onClick={() => setShowOrteModal(true)}
    className="btn-primary flex-1 sm:flex-initial"
    >
    Orte
    </button>
    <button
    onClick={() => setShowDistanzenModal(true)}
    className="btn-primary flex-1 sm:flex-initial"
    >
    Distanzen
    </button>
    </div>
    
    {/* Sekundäre Aktionen - gestapelt auf Mobile */}
    <div className="flex gap-2 w-full sm:w-auto">
    {user?.role === 'admin' && (
      <button
      onClick={() => setShowUserManagementModal(true)}
      className="btn-primary flex-1 sm:flex-initial"
      >
      Benutzerverwaltung
      </button>
    )}
    <button
    onClick={() => setIsProfileModalOpen(true)}
    className="btn-primary flex-1 sm:flex-initial"
    >
    Profil
    </button>
    <button 
    onClick={logout} 
    className="bg-secondary-400 text-white hover:bg-secondary-500 px-4 h-8 rounded transition-colors duration-200 text-sm shadow-sm flex-1 sm:flex-initial"
    >
    Logout
    </button>
    </div>
    </div>
    </div>
    
    {/* FahrtenbuchHilfe separat */}
    <div className="mt-4">
    <FahrtenbuchHilfe />
    </div>
    </div>
    
    {/* Hauptinhalt */}
    <div className="space-y-8">
    <FahrtForm />
    <FahrtenListe />
    <MonthlyOverview />
    </div>
    
    {/* Modals */}
    <ProfileModal 
    isOpen={isProfileModalOpen} 
    onClose={() => setIsProfileModalOpen(false)} 
    />
    
    <Modal 
    isOpen={showUserManagementModal} 
    onClose={() => setShowUserManagementModal(false)}
    title="Benutzerverwaltung"
    size="wide"
    >
    <UserManagement />
    </Modal>
    
    <Modal 
    isOpen={showOrteModal} 
    onClose={() => setShowOrteModal(false)} 
    title="Orte" 
    size="wide"
    >
    <OrtForm />
    <OrteListe />
    </Modal>
    
    <Modal 
    isOpen={showDistanzenModal} 
    onClose={() => setShowDistanzenModal(false)} 
    title="Distanzen" 
    size="wide"
    >
    <DistanzForm />
    <DistanzenListe />
    </Modal>
    </div>
  );
}

export default App;
  
  