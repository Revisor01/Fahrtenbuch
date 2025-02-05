import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import axios from 'axios';
import './index.css';
import './darkMode.css';
import ProfileModal from './ProfileModal';
import FahrtForm from './FahrtForm';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import Modal from './Modal'; 
import { HelpCircle, Settings, MapPin, Ruler, Users, UserCircle, LogOut, AlertCircle, Circle, CheckCircle2 } from 'lucide-react';
import HilfeModal from './HilfeModal';
import NotificationModal from './NotificationModal';
import AbrechnungsStatusModal from './AbrechnungsStatusModal';
import UserManagement from './UserManagement';
import VerifyEmail from './VerifyEmail';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import SetPassword from './SetPassword';
import { ThemeProvider } from './ThemeContext';
import ThemeToggle from './ThemeToggle';

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
  const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
  const [notification, setNotification] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, showCancel: false });
  const [summary, setSummary] = useState({});
  
  const [hasActiveNotification, setHasActiveNotification] = useState(false);
  
  const refreshAllData = async () => {
    try {
      console.log('Starte refreshAllData...'); // Debug-Log
      const [fahrtenRes, monthlyDataRes, orteRes, distanzenRes, abrechnungstraegerRes] = await Promise.all([
        fetchFahrten(),
        fetchMonthlyData(),
        fetchOrte(),
        fetchDistanzen(),
        axios.get('/api/abrechnungstraeger/simple')  // Abrechnungsträger mit laden
      ]);
      
      // Setze den State für die Abrechnungsträger
      if (abrechnungstraegerRes.data) {
        console.log('Abrechnungsträger geladen:', abrechnungstraegerRes.data.data); // Debug-Log
        setAbrechnungstraeger(abrechnungstraegerRes.data.data);
        setSummary(prev => ({
          ...prev,
          abrechnungstraeger: abrechnungstraegerRes.data.data
        }));
      }
      console.log('refreshAllData abgeschlossen.'); // Debug-Log
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Daten:', error);
      showNotification('Fehler', 'Daten konnten nicht vollständig aktualisiert werden');
    }
  };
  
  const showNotification = (title, message, onConfirm = () => {}, showCancel = false) => {
    setHasActiveNotification(true);
    setNotification({ isOpen: true, title, message, onConfirm, showCancel });
  };
  
  const closeNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
    setHasActiveNotification(false);
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
  
  const fetchAbrechnungstraeger = async () => {
    try {
      const response = await axios.get('/api/abrechnungstraeger/simple');
      setAbrechnungstraeger(response.data.data);
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnungsträger:', error);
      showNotification('Fehler', 'Abrechnungsträger konnten nicht geladen werden');
    }
  };
  
  useEffect(() => {  // Initiales Laden beim Start
    fetchAbrechnungstraeger();
  }, []);
  
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
      const cleanedFahrt = {
        datum: fahrt.datum,
        vonOrtId: fahrt.vonOrtId || null,
        nachOrtId: fahrt.nachOrtId || null,
        einmaligerVonOrt: fahrt.einmaligerVonOrt || null,
        einmaligerNachOrt: fahrt.einmaligerNachOrt || null,
        anlass: fahrt.anlass || '',
        kilometer: parseFloat(fahrt.kilometer) || 0,
        abrechnung: parseInt(fahrt.abrechnung) || null,
        mitfahrer: fahrt.mitfahrer || []
      };
      
      const response = await axios.post(`${API_BASE_URL}/fahrten`, cleanedFahrt);
      if (response.status === 201) {
        await fetchFahrten();
        return response.data;
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Fahrt:', error);
      throw error;
    }
  };
  
  const updateFahrt = async (id, updatedFahrt) => {
    try {
      // Sicherstellen dass keine undefined-Werte gesendet werden
      const cleanedFahrt = {
        datum: updatedFahrt.datum,
        vonOrtId: updatedFahrt.vonOrtId || null,
        nachOrtId: updatedFahrt.nachOrtId || null,
        einmaligerVonOrt: updatedFahrt.einmaligerVonOrt || null,
        einmaligerNachOrt: updatedFahrt.einmaligerNachOrt || null,
        anlass: updatedFahrt.anlass || '',
        kilometer: parseFloat(updatedFahrt.kilometer) || 0,
        abrechnung: parseInt(updatedFahrt.abrechnung)
      };
      
      console.log('Sende Update-Daten:', cleanedFahrt); // Debug-Log
      
      const response = await axios.put(`${API_BASE_URL}/fahrten/${id}`, cleanedFahrt);
      
      if (response.status === 200) {
        await fetchFahrten();
        return response.data;
      } else {
        throw new Error('Unerwarteter Statuscode: ' + response.status);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Fahrt:', error);
      if (error.response) {
        console.error('Server-Fehler:', error.response.data);
      }
      throw error;
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
      const months = [];
      
      // 3 Monate nach vorne
      for (let i = 1; i <= 3; i++) {
        const futureDate = new Date(currentYear, currentMonth + i, 1);
        months.push(futureDate);
      }
      
      // Aktueller Monat
      months.push(new Date(currentYear, currentMonth, 1));
      
      // Rückwärts gehen (24 Monate sollten erstmal reichen, werden aber gefiltert)
      for (let i = 1; i <= 24; i++) {
        const pastDate = new Date(currentYear, currentMonth - i, 1);
        months.push(pastDate);
      }
      
      // Für jeden Monat API-Call vorbereiten
      for (const date of months) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        promises.push(axios.get(`${API_BASE_URL}/fahrten/report/${year}/${month}`));
      }
      
      const responses = await Promise.all(promises);
      const data = responses
      .map((response, index) => {
        const date = months[index];
        return {
          yearMonth: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
          monthName: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          monatNr: date.getMonth() + 1,
          kirchenkreisErstattung: response.data.summary.kirchenkreisErstattung,
          gemeindeErstattung: response.data.summary.gemeindeErstattung,
          mitfahrerErstattung: response.data.summary.mitfahrerErstattung || 0,
          abrechnungsStatus: response.data.summary.abrechnungsStatus
        };
      })
      // Nur Monate mit Daten behalten
      .filter(month => 
        month.kirchenkreisErstattung > 0 || 
        month.gemeindeErstattung > 0 || 
        month.mitfahrerErstattung > 0
      )
      // Nach Datum sortieren (neueste zuerst)
      .sort((a, b) => {
        const dateA = new Date(a.year, a.monatNr - 1);
        const dateB = new Date(b.year, b.monatNr - 1);
        return dateB - dateA;
      });
      
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
      isLoggedIn, 
      login, 
      logout, 
      token, 
      updateFahrt, 
      user, 
      setUser, 
      orte, 
      distanzen, 
      fahrten, 
      selectedMonth, 
      gesamtKirchenkreis, 
      gesamtGemeinde,
      setSelectedMonth, 
      addOrt, 
      addFahrt, 
      addDistanz, 
      updateOrt, 
      updateDistanz, 
      fetchFahrten, 
      deleteFahrt, 
      deleteDistanz, 
      deleteOrt, 
      monthlyData, 
      fetchMonthlyData, 
      summary, 
      setSummary,
      setIsProfileModalOpen, 
      isProfileModalOpen, 
      updateAbrechnungsStatus, 
      hasActiveNotification, 
      showNotification, 
      closeNotification, 
      setFahrten,
      refreshAllData // Hier hinzufügen
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

function FahrtenListe() {
  const { fahrten, selectedMonth, setSelectedMonth, fetchFahrten, deleteFahrt, updateFahrt, orte, fetchMonthlyData, showNotification, summary, setFahrten, refreshAllData } = useContext(AppContext);
  const [expandedFahrten, setExpandedFahrten] = useState({});
  const [isMitfahrerModalOpen, setIsMitfahrerModalOpen] = useState(false);
  const [viewingMitfahrer, setViewingMitfahrer] = useState(null);
  const [editingMitfahrer, setEditingMitfahrer] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthName, setSelectedMonthName] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [editingFahrt, setEditingFahrt] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'datum', direction: 'descending' });
  const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
  const [statusModal, setStatusModal] = useState({
    open: false,
    typ: null,
    aktion: null,
    jahr: null,
    monat: null
  });
  
  useEffect(() => {
    fetchFahrten();
  }, [selectedMonth]);
  
  useEffect(() => {
    if (fahrten.length > 0) {
      setSortConfig({ key: 'datum', direction: 'descending' });
    }
  }, [fahrten]);
  
  useEffect(() => {
    fetchFahrten();
  }, [selectedMonth]);
  
  useEffect(() => {
    const fetchAbrechnungstraeger = async () => {
      try {
        const response = await axios.get('/api/abrechnungstraeger/simple');
        setAbrechnungstraeger(response.data.data);
        console.log('Abrechnungsträger Daten:', response.data.data); // Hinzugefügt
      } catch (error) {
        console.error('Fehler beim Laden der Abrechnungsträger:', error);
        // Optional: Fehlerbenachrichtigung anzeigen
      }
    };
    fetchAbrechnungstraeger();
  }, []);
  
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
      nachOrtTyp: getOrtTyp(fahrt, false),
      abrechnung: fahrt.abrechnung,
      kilometer: fahrt.kilometer
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
      // Validierung
      if (!editingFahrt.anlass || !editingFahrt.datum || !editingFahrt.kilometer || !editingFahrt.abrechnung) {
        showNotification("Fehler", "Bitte füllen Sie alle erforderlichen Felder aus.");
        return;
      }
      
      const kilometer = parseFloat(editingFahrt.kilometer);
      if (isNaN(kilometer) || kilometer <= 0) {
        showNotification("Fehler", "Bitte geben Sie eine gültige Kilometerzahl ein.");
        return;
      }
      
      const abrechnung = parseInt(editingFahrt.abrechnung);
      if (isNaN(abrechnung)) {
        showNotification("Fehler", "Bitte wählen Sie einen Abrechnungsträger aus.");
        return;
      }
      
      // Formatierung des Kilometers
      const kilometerString = kilometer.toFixed(2); // Umwandlung in String mit 2 Dezimalstellen
      
      const updatedFahrt = {
        datum: editingFahrt.datum,
        vonOrtId: editingFahrt.vonOrtTyp === 'gespeichert' ? parseInt(editingFahrt.von_ort_id) : null,
        nachOrtId: editingFahrt.nachOrtTyp === 'gespeichert' ? parseInt(editingFahrt.nach_ort_id) : null,
        einmaligerVonOrt: editingFahrt.vonOrtTyp === 'einmalig' ? editingFahrt.einmaliger_von_ort : null,
        einmaligerNachOrt: editingFahrt.nachOrtTyp === 'einmalig' ? editingFahrt.einmaliger_nach_ort : null,
        anlass: editingFahrt.anlass,
        kilometer: kilometerString, // Verwende den formatierten String
        abrechnung: parseInt(editingFahrt.abrechnung)
      };
      
      console.log('Sende Fahrt-Update:', updatedFahrt);
      
      await updateFahrt(editingFahrt.id, updatedFahrt);
      setEditingFahrt(null);
      await refreshAllData(); // HIER IST refreshAllData WIEDER
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
  
  const getKategorienMitErstattung = () => {
    const kategorien = [];
    Object.entries(summary.erstattungen || {}).forEach(([key, value]) => {
      if (value > 0) {
        // Kategorie-Namen formatieren
        let displayName = key.charAt(0).toUpperCase() + key.slice(1);
        if (key === 'mitfahrer') {
          displayName = 'Mitfahrer:innen';
        } else {
          // Versuche, den Abrechnungsträgernamen anhand der ID zu finden
          const traeger = abrechnungstraeger.find(at => at.id === parseInt(key));
          displayName = traeger ? traeger.name : displayName;
        }
        
        kategorien.push([key, displayName, value]);
      }
    });
    return kategorien;
  };  
  const renderAbrechnungsStatus = (summary) => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const getAbrechnungTraegerName = (id) => {
      const traeger = abrechnungstraeger?.find(t => t.id === id);
      return traeger ? traeger.name : 'Unbekannt';
    }
    
    return (
      <div className="card-container-highlight mb-4">
      <div className="space-y-6">
      {/* Header mit Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="w-full flex justify-between items-center">
      <h2 className="text-lg font-medium text-value">Monatsübersicht</h2>
      {selectedMonth !== currentMonth && (
        <button onClick={resetToCurrentMonth} className="btn-secondary sm:hidden">
        Aktueller Monat
        </button>
      )}
      </div>
      
      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-end gap-3">
      <div className="flex items-center justify-end gap-2 w-full">
      {selectedMonth !== currentMonth && (
        <button onClick={resetToCurrentMonth} className="btn-secondary hidden sm:block">
        Aktueller Monat
        </button>
      )}
      <select
      value={new Date(`${selectedMonth}-01`).getMonth().toString()}
      onChange={handleMonthChange}
      className="form-select w-32">
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
      </div>
      
      {/* Cards Grid */}
      <div className={`card-grid grid-cols-${Math.min(getKategorienMitErstattung().length, 4)}`}>
      {getKategorienMitErstattung().map(([key, displayName, value]) => (
        <div key={key} className="card-container">
        <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-label">{displayName}</span>
        
        
        <span className={summary.abrechnungsStatus?.[key]?.erhalten_am ? "font-medium text-muted" : "font-medium text-value"}>
        {Number(value).toFixed(2)} €
        </span>
        </div>
        
        {value > 0 && (
          <div className="text-xs space-y-1">
          <div className="flex items-center justify-between">
          <span className="text-label">Status</span>
          {summary.abrechnungsStatus?.[key]?.erhalten_am ? (
            <span 
            className="status-badge-primary cursor-pointer"
            >
            <CheckCircle2 size={14} />
            <span>Erhalten am: {new Date(summary.abrechnungsStatus[key].erhalten_am).toLocaleDateString()}</span>
            </span>
          ) : summary.abrechnungsStatus?.[key]?.eingereicht_am ? (
            <span 
            className="status-badge-secondary cursor-pointer"
            >
            <Circle size={14} />
            <span>Eingereicht am: {new Date(summary.abrechnungsStatus[key].eingereicht_am).toLocaleDateString()}</span>
            </span>
          ) : (
            <span 
            className="status-badge-secondary"
            >
            <AlertCircle size={14} />
            <span>Nicht eingereicht</span>
            </span>
          )}
          </div>
          </div>
        )}
        </div>
      ))}
      
      {/* Gesamt Card */}
      <div className="card-container">
      <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-label">Gesamt</span>
      <span className="font-medium text-value">
      {Object.values(summary.erstattungen || {}).reduce((a, b) => a + b, 0).toFixed(2)} €
      </span>
      </div>
      </div>
      </div>
      
      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2">
      {getKategorienMitErstattung().map(([key, displayName]) => (
        <button
        key={key}
        onClick={() => handleExportToExcel(key.toLowerCase(), selectedYear, selectedMonth.split("-")[1])}
        className="btn-primary">
        Export {displayName}
        </button>
      ))}
      </div>
      </div>
      </div>
    );
  };
  
  const roundKilometers = (value) => {
    const numValue = Number(value ?? 0);
    return numValue % 1 < 0.5 ? Math.floor(numValue) : Math.ceil(numValue);
  };
  
  const exportToCSV = (type) => {
    const csvContent = [
      ['Datum', 'Von Adresse', 'Nach Adresse', 'Anlass', 'Kilometer', 'Abrechnung'],
      ...sortedFahrten.map(fahrt => {
        const abrechnungName = abrechnungstraeger.find(at => at.id === fahrt.abrechnung)?.name || 'Unbekannt';
        return [
          new Date(fahrt.datum).toLocaleDateString(),
          fahrt.einmaliger_von_ort || fahrt.von_ort_adresse || fahrt.von_ort_name,
          fahrt.einmaliger_nach_ort || fahrt.nach_ort_adresse || fahrt.nach_ort_name,
          fahrt.anlass,
          roundKilometers(fahrt.kilometer),
          abrechnungName
        ];
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
      <div className="flex flex-wrap gap-2">
      {fahrt.mitfahrer.map((person, index) => {
        const shouldDisplay = 
        (isHinfahrt && (person.richtung === 'hin' || person.richtung === 'hin_rueck')) ||
        (!isHinfahrt && (person.richtung === 'rueck' || person.richtung === 'hin_rueck'));
        
        if (!shouldDisplay) return null;
        
        return (
          <span
          key={index}
          className="status-badge-primary cursor-pointer"
          onClick={() => handleEditMitfahrer(fahrt.id, person)}
          >
          {person.name}
          <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteMitfahrer(fahrt.id, person.id);
          }}
          className="text-secondary-500 hover:text-secondary-600"
          >
          ×
          </button>
          </span>
        );
      })}
      </div>
    );
  };
  
  const renderFahrtRow = (fahrt, detail = null) => {
    // Finde den Namen des Abrechnungsträgers
    const traeger = abrechnungstraeger?.find(at => at.id === parseInt(fahrt.abrechnung));
    const abrechnungstraegerName = traeger ? traeger.name : 'Unbekannt';
    
    return (
      <tr key={fahrt.id} className="table-row">
      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <input
        type="date"
        value={editingFahrt.datum}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, datum: e.target.value })}
        className="form-input"
        />
      ) : (
        <span className="text-value">{new Date(fahrt.datum).toLocaleDateString()}</span>
      )}
      </td>
      
      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <div className="space-y-2">
        <label className="checkbox-label">
        <input
        type="checkbox"
        checked={editingFahrt.vonOrtTyp === 'einmalig'}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          vonOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
          von_ort_id: e.target.checked ? null : editingFahrt.von_ort_id,
          einmaliger_von_ort: e.target.checked ? editingFahrt.einmaliger_von_ort : null
        })}
        className="checkbox-input"
        />
        <span className="text-xs text-label">Einmaliger Von-Ort</span>
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
        <div className="table-address">
        <div className="table-address-main">
        {fahrt.von_ort_name || fahrt.einmaliger_von_ort || ""}
        </div>
        {fahrt.von_ort_adresse && (
          <div className="table-address-sub">
          {fahrt.von_ort_adresse}
          </div>
        )}
        </div>
      )}
      </td>
      
      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <div className="space-y-2">
        <label className="checkbox-label">
        <input
        type="checkbox"
        checked={editingFahrt.nachOrtTyp === 'einmalig'}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          nachOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
          nach_ort_id: e.target.checked ? null : editingFahrt.nach_ort_id,
          einmaliger_nach_ort: e.target.checked ? editingFahrt.einmaliger_nach_ort : null
        })}
        className="checkbox-input"
        />
        <span className="text-xs text-label">Einmaliger Nach-Ort</span>
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
        <div className="table-address">
        <div className="table-address-main">
        {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || ""}
        </div>
        {fahrt.nach_ort_adresse && (
          <div className="table-address-sub">
          {fahrt.nach_ort_adresse}
          </div>
        )}
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
        <span className="text-value">{fahrt.anlass}</span>
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
        <span className="text-value">
        {formatValue(roundKilometers(fahrt.kilometer))}
        </span>
      )}
      </td>
      
      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <select
        value={editingFahrt.abrechnung}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, abrechnung: e.target.value })}
        className="form-select"
        >
        {abrechnungstraeger?.map(traeger => (
          <option key={traeger.id} value={traeger.id}>
          {traeger.name}
          </option>
        ))}
        </select>
      ) : (
        <span className="text-value">
        {abrechnungstraegerName}
        </span>
      )}
      </td>
      
      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
        {fahrt.mitfahrer?.map((person, index) => (
          <span key={index} className="status-badge-primary">
          {person.name}
          <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteMitfahrer(fahrt.id, person.id);
          }}
          className="text-secondary-500 hover:text-secondary-600"
          >
          ×
          </button>
          </span>
        ))}
        </div>
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
      
      <td className="table-cell">
      <div className="flex gap-2 justify-end">
      {editingFahrt?.id === fahrt.id ? (
        <>
        <button 
        onClick={handleSave} 
        className="table-action-button-primary"
        title="Speichern"
        >
        ✓
        </button>
        <button 
        onClick={() => setEditingFahrt(null)} 
        className="table-action-button-secondary"
        title="Abbrechen"
        >
        ×
        </button>
        </>
      ) : (
        <>
        <button 
        onClick={() => handleEdit(fahrt)} 
        className="table-action-button-primary"
        title="Bearbeiten"
        >
        ✎
        </button>
        <button 
        onClick={() => handleDelete(fahrt.id)} 
        className="table-action-button-secondary"
        title="Löschen"
        >
        ×
        </button>
        </>
      )}
      </div>
      </td>
      </tr>
    );
  };
  
  return (
    <div>
    {renderAbrechnungsStatus(summary)}
    
    {/* Desktop View */}
    <div className="hidden md:block">
    <div className="table-container">
    <table className="w-full">
    <thead>
    <tr className="table-head-row">
    <th className="table-header" onClick={() => requestSort('datum')}>
    <div className="flex items-center gap-1">
    Datum {sortConfig.key === 'datum' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('von_ort_name')}>
    <div className="flex items-center gap-1">
    Von {sortConfig.key === 'von_ort_name' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('nach_ort_name')}>
    <div className="flex items-center gap-1">
    Nach {sortConfig.key === 'nach_ort_name' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('anlass')}>
    <div className="flex items-center gap-1">
    Anlass {sortConfig.key === 'anlass' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header text-right" onClick={() => requestSort('kilometer')}>
    <div className="flex items-center justify-end gap-1">
    km {sortConfig.key === 'kilometer' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('abrechnung')}>
    <div className="flex items-center gap-1">
    Abrechnung {sortConfig.key === 'abrechnung' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header">Mitfahrer:innen</th>
    <th className="table-header text-right">Aktionen</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50 dark:divide-primary-800">
    {sortedFahrten.map((fahrt) => (
      <React.Fragment key={fahrt.id}>
      {renderFahrtRow(fahrt)}
      </React.Fragment>
    ))}
    </tbody>
    </table>
    </div>
    </div>
    
    {/* Mobile View */}
    <div className="md:hidden space-y-4">
    {sortedFahrten.map((fahrt) => (
      <div key={fahrt.id} className="mobile-card">
      {editingFahrt?.id === fahrt.id ? (
        // Edit Mode
        <div className="space-y-4">
        <div>
        <label className="form-label">Datum</label>
        <input
        type="date"
        value={editingFahrt.datum}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, datum: e.target.value })}
        className="form-input w-full"
        />
        </div>
        
        {/* Von-Ort */}
        <div>
        <label className="checkbox-label mb-2">
        <input
        type="checkbox"
        checked={editingFahrt.vonOrtTyp === 'einmalig'}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          vonOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
          von_ort_id: e.target.checked ? null : editingFahrt.von_ort_id,
          einmaliger_von_ort: e.target.checked ? editingFahrt.einmaliger_von_ort : null
        })}
        className="checkbox-input"
        />
        <span className="text-xs text-label">Einmaliger Von-Ort</span>
        </label>
        {editingFahrt.vonOrtTyp === 'einmalig' ? (
          <input
          type="text"
          value={editingFahrt.einmaliger_von_ort || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_von_ort: e.target.value })}
          className="form-input w-full"
          placeholder="Von (einmalig)"
          />
        ) : (
          <select
          value={editingFahrt.von_ort_id || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, von_ort_id: e.target.value })}
          className="form-select w-full"
          >
          <option value="">Bitte wählen</option>
          {renderOrteOptions(orte)}
          </select>
        )}
        </div>
        
        {/* Nach-Ort */}
        <div>
        <label className="checkbox-label mb-2">
        <input
        type="checkbox"
        checked={editingFahrt.nachOrtTyp === 'einmalig'}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          nachOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
          nach_ort_id: e.target.checked ? null : editingFahrt.nach_ort_id,
          einmaliger_nach_ort: e.target.checked ? editingFahrt.einmaliger_nach_ort : null
        })}
        className="checkbox-input"
        />
        <span className="text-xs text-label">Einmaliger Nach-Ort</span>
        </label>
        {editingFahrt.nachOrtTyp === 'einmalig' ? (
          <input
          type="text"
          value={editingFahrt.einmaliger_nach_ort || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_nach_ort: e.target.value })}
          className="form-input w-full"
          placeholder="Nach (einmalig)"
          />
        ) : (
          <select
          value={editingFahrt.nach_ort_id || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, nach_ort_id: e.target.value })}
          className="form-select w-full"
          >
          <option value="">Bitte wählen</option>
          {renderOrteOptions(orte)}
          </select>
        )}
        </div>
        
        {/* Anlass */}
        <div>
        <label className="form-label">Anlass</label>
        <input
        type="text"
        value={editingFahrt.anlass}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, anlass: e.target.value })}
        className="form-input w-full"
        />
        </div>
        
        {/* Kilometer */}
        <div>
        <label className="form-label">Kilometer</label>
        <input
        type="number"
        value={editingFahrt.kilometer}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          kilometer: parseFloat(e.target.value),
        })}
        className="form-input w-full"
        />
        </div>
        
        {/* Abrechnung */}
        <div>
        <label className="form-label">Abrechnung</label>
        <select
        value={editingFahrt.abrechnung}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, abrechnung: e.target.value })}
        className="form-select w-full"
        >
        {abrechnungstraeger.map(traeger => (
          <option key={traeger.id} value={traeger.id}>
          {traeger.name}
          </option>
        ))}
        </select>
        </div>
        
        {/* Mitfahrer */}
        <div>
        <label className="form-label">Mitfahrer:innen</label>
        <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
        {fahrt.mitfahrer?.map((person, index) => (
          <span key={index} className="status-badge-primary">
          {person.name}
          <button
          onClick={(e) => {
            e.preventDefault();
            handleDeleteMitfahrer(fahrt.id, person.id);
          }}
          className="text-secondary-500 hover:text-secondary-600"
          >
          ×
          </button>
          </span>
        ))}
        </div>
        <button
        onClick={() => handleAddMitfahrer(fahrt.id)}
        className="btn-primary text-xs w-full"
        >
        + Mitfahrer:in
        </button>
        </div>
        </div>
        
        {/* Buttons */}
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
        <div>
        {/* Header */}
        <div className="mobile-card-header mb-4">
        <div>
        <div className="mobile-card-title">
        {new Date(fahrt.datum).toLocaleDateString()}
        </div>
        <div className="mobile-card-subtitle">
        {abrechnungstraeger.find(at => at.id === fahrt.abrechnung)?.name || 'Unbekannt'}
        </div>
        </div>
        <div className="mobile-action-buttons">
        <button
        onClick={() => handleEdit(fahrt)}
        className="mobile-icon-button-primary"
        >
        ✎
        </button>
        <button
        onClick={() => handleDelete(fahrt.id)}
        className="mobile-icon-button-secondary"
        >
        ×
        </button>
        </div>
        </div>
        
        <div className="space-y-4">
        {/* Route */}
        <div className="grid grid-cols-1 gap-2">
        <div>
        <div className="mobile-card-label">Von</div>
        <div className="mobile-card-content">
        {fahrt.von_ort_name || fahrt.einmaliger_von_ort || ""}
        </div>
        {fahrt.von_ort_adresse && (
          <div className="mobile-card-label">
          {fahrt.von_ort_adresse}
          </div>
        )}
        </div>
        <div>
        <div className="mobile-card-label">Nach</div>
        <div className="mobile-card-content">
        {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || ""}
        </div>
        {fahrt.nach_ort_adresse && (
          <div className="mobile-card-label">
          {fahrt.nach_ort_adresse}
          </div>
        )}
        </div>
        </div>
        
        {/* Anlass & Kilometer */}
        <div className="grid grid-cols-2 gap-4">
        <div>
        <div className="mobile-card-label">Anlass</div>
        <div className="mobile-card-content">{fahrt.anlass}</div>
        </div>
        <div>
        <div className="mobile-card-label">Kilometer</div>
        <div className="mobile-card-content">
        {formatValue(roundKilometers(fahrt.kilometer))} km
        </div>
        </div>
        </div>
        
        {/* Mitfahrer */}
        {fahrt.mitfahrer?.length > 0 && (
          <div>
          <div className="mobile-card-label mb-1">Mitfahrer:innen</div>
          {renderMitfahrer(fahrt)}
          </div>
        )}
        </div>
        </div>
      )}
      </div>
    ))}
    </div>
    
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
  );
  }

function MonthlyOverview() {
  const { monthlyData, fetchMonthlyData, updateAbrechnungsStatus } = React.useContext(AppContext);
  const [statusModal, setStatusModal] = useState({
    open: false,
    typ: null,
    aktion: null,
    jahr: null,
    monat: null
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString()); // Geändert von 'all'
  const [hideCompleted, setHideCompleted] = useState(true);
  
  // Diese Zeilen direkt darunter einfügen:
  const [filteredData, setFilteredData] = useState([]);
  
  useEffect(() => {
    console.log('hideCompleted changed:', hideCompleted); // Debug
    const filtered = monthlyData.filter(month => {
      if (selectedYear !== 'all' && month.year.toString() !== selectedYear) {
        return false;
      }
      
      if (hideCompleted) {
        const kkCompleted = month.kirchenkreisErstattung === 0 || 
        month.abrechnungsStatus?.kirchenkreis?.erhalten_am;
        const gemCompleted = month.gemeindeErstattung === 0 || 
        month.abrechnungsStatus?.gemeinde?.erhalten_am;
        if (kkCompleted && gemCompleted) {
          return false;
        }
      }
      return true;
    });
    setFilteredData(filtered);
  }, [monthlyData, hideCompleted, selectedYear]);
  
  // Neue Konstante hier einfügen
  const currentYear = new Date().getFullYear().toString();

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
  
  const getFilteredData = () => {
    return monthlyData.filter(month => {
      if (selectedYear !== 'all' && month.year.toString() !== selectedYear) {
        return false;
      }
      
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
    return filteredData.reduce((total, month) => {
      total.originalKirchenkreis += Number(month.kirchenkreisErstattung || 0);
      total.originalGemeinde += Number(month.gemeindeErstattung || 0);
      total.originalMitfahrer += Number(month.mitfahrerErstattung || 0);
      
      if (!month.abrechnungsStatus?.kirchenkreis?.erhalten_am) {
        total.kirchenkreis += Number(month.kirchenkreisErstattung || 0);
        total.mitfahrer += Number(month.mitfahrerErstattung || 0);
      }
      if (!month.abrechnungsStatus?.gemeinde?.erhalten_am) {
        total.gemeinde += Number(month.gemeindeErstattung || 0);
      }
      
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
      <span className={isReceived ? "text-muted" : "text-value"}>
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
      className="btn-primary w-full sm:w-auto flex items-center justify-between gap-2"
      >
      <span>Schnellaktionen</span>
      <span className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>
      ▼
      </span>
      </button>
      
      {isOpen && (
        <>
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-primary-100 dark:border-primary-700 z-50">

        {actions.map((action, index) => (
          <button
          key={index}
          onClick={async () => {
            await action.action();
            setIsOpen(false);
          }}
          className="w-full text-left px-4 py-2 text-sm text-value hover:bg-primary-25 dark:hover:bg-primary-900 transition-colors duration-150"
          >
          {action.label}
          </button>
        ))}
        </div>
        </>
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
    
    // Wenn Betrag 0 ist
    if (betrag === 0) {
      return (
        <div className="flex items-center justify-between">
        <span className="status-badge-secondary">
        <CheckCircle2 size={14} className="text-secondary-600 dark:text-secondary-400" />
        <span>Keine Abrechnung</span>
        </span>
        </div>
      );
    }
    
    if (status?.erhalten_am) {
      return (
        <div className="flex items-center justify-between">
        <span 
        className="status-badge-primary cursor-pointer"
        onClick={() => setStatusModal({ 
          open: true, 
          typ, 
          aktion: 'reset', 
          jahr: month.year,
          monat: month.monatNr
        })}
        >
        <CheckCircle2 size={14} />
        <span>Erhalten am: {new Date(status.erhalten_am).toLocaleDateString()}</span>
        </span>
        </div>
      );
    }
    
    if (status?.eingereicht_am) {
      return (
        <div className="flex items-center justify-between">
        <span 
        className="status-badge-secondary cursor-pointer"
        onClick={() => setStatusModal({ 
          open: true, 
          typ, 
          aktion: 'erhalten', 
          jahr: month.year,
          monat: month.monatNr
        })}
        >
        <Circle size={14} />
        <span>Eingereicht am: {new Date(status.eingereicht_am).toLocaleDateString()}</span>
        </span>
        </div>
      );
    }
    
    return betrag > 0 ? (
      <div className="flex items-center justify-between">
      <span 
      className="status-badge-secondary cursor-pointer"
      onClick={() => setStatusModal({ 
        open: true, 
        typ, 
        aktion: 'eingereicht', 
        jahr: month.year,
        monat: month.monatNr
      })}
      >
      <AlertCircle size={14} />
      <span>Nicht eingereicht</span>
      </span>
      </div>
    ) : null;
  };
  
  const yearTotal = calculateYearTotal();
  
  return (
    <div className="w-full max-w-full space-y-6">
    <div className="card-container-highlight">
    <div className="flex flex-col gap-4 mb-6">
    <div className="flex justify-between items-center">
    <h2 className="text-lg font-medium text-value">Jahresübersicht</h2>
    {selectedYear !== currentYear && selectedYear !== 'all' && (
      <button 
      onClick={() => setSelectedYear(currentYear)}
      className="btn-secondary text-xs sm:hidden"
      >
      Aktuelles Jahr
      </button>
    )}
    </div>
    
    <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="flex items-center gap-4 text-[11px]">
    <QuickActions 
    filteredData={filteredData}
    handleStatusUpdate={handleStatusUpdate}
    />
    <label className="checkbox-label">
    <input
    type="checkbox"
    id="hideCompleted"
    checked={hideCompleted}
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="checkbox-input h-3 w-3"
    />
    <span className="text-label">Abgeschlossene</span>
    </label>
    </div>
    
    <div className="flex items-center justify-end gap-3 text-[11px]">
    {selectedYear !== currentYear && selectedYear !== 'all' && (
      <button 
      onClick={() => setSelectedYear(currentYear)} className="btn-secondary hidden sm:block">
      Aktueller Jahr
      </button>
    )}
    <select 
    value={selectedYear} 
    onChange={(e) => setSelectedYear(e.target.value)}
    className="form-select w-24"
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
    </div>
    </div>
    
    <div className="card-grid">
    {/* Kirchenkreis Card */}
    <div className="card-container">
    <div className="flex justify-between items-center mb-2">
    <span className="text-label text-sm">Kirchenkreis</span>
    <span className="text-value font-medium">
    {yearTotal.kirchenkreis.toFixed(2)} €
    </span>
    </div>
    {yearTotal.originalKirchenkreis !== yearTotal.kirchenkreis && (
      <div className="text-muted text-xs">
      Ursprünglich: {yearTotal.originalKirchenkreis.toFixed(2)} €
      </div>
    )}
    </div>
    
    {/* Gemeinde Card */}
    <div className="card-container">
    <div className="flex justify-between items-center mb-2">
    <span className="text-label text-sm">Gemeinde</span>
    <span className="text-value font-medium">
    {yearTotal.gemeinde.toFixed(2)} €
    </span>
    </div>
    {yearTotal.originalGemeinde !== yearTotal.gemeinde && (
      <div className="text-muted text-xs">
      Ursprünglich: {yearTotal.originalGemeinde.toFixed(2)} €
      </div>
    )}
    </div>
    
    {/* Mitfahrer Card */}
    <div className="card-container">
    <div className="flex justify-between items-center mb-2">
    <span className="text-label text-sm">Mitfahrer:innen</span>
    <span className="text-value font-medium">
    {yearTotal.mitfahrer.toFixed(2)} €
    </span>
    </div>
    {yearTotal.originalMitfahrer !== yearTotal.mitfahrer && (
      <div className="text-muted text-xs">
      Ursprünglich: {yearTotal.originalMitfahrer.toFixed(2)} €
      </div>
    )}
    </div>
    
    {/* Gesamt Card */}
    <div className="card-container">
    <div className="flex justify-between items-center mb-2">
    <span className="text-label text-sm">Gesamt</span>
    <span className="text-value font-medium">
    {yearTotal.gesamt.toFixed(2)} €
    </span>
    </div>
    {yearTotal.originalGesamt !== yearTotal.gesamt && (
      <div className="text-muted text-xs">
      Ursprünglich: {yearTotal.originalGesamt.toFixed(2)} €
      </div>
    )}
    </div>
    </div>
    
    <div className="mt-6">
    </div>
    </div>
    
    {/* Desktop View */}
    <div className="hidden sm:block">
    <div className="table-container">
    <table className="w-full">
    <thead>
    <tr className="table-head-row">
    <th className="table-header">Monat</th>
    <th className="table-header text-right">Kirchenkreis</th>
    <th className="table-header-sm">Status</th>
    <th className="table-header text-right">Gemeinde</th>
    <th className="table-header-sm">Status</th>
    <th className="table-header text-right">Mitfahrer</th>
    <th className="table-header text-right">Gesamt</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50 dark:divide-primary-800">
    {filteredData.map((month) => {
      const kkReceived = month.abrechnungsStatus?.kirchenkreis?.erhalten_am;
      const gemReceived = month.abrechnungsStatus?.gemeinde?.erhalten_am;
      const ausstehendKK = kkReceived ? 0 : Number(month.kirchenkreisErstattung || 0);
      const ausstehendGem = gemReceived ? 0 : Number(month.gemeindeErstattung || 0);
      const ausstehendMitf = kkReceived ? 0 : Number(month.mitfahrerErstattung || 0);
      const ausstehendGesamt = ausstehendKK + ausstehendGem + ausstehendMitf;
      const originalGesamt = Number(month.kirchenkreisErstattung || 0) + 
      Number(month.gemeindeErstattung || 0) + 
      Number(month.mitfahrerErstattung || 0);
      
      return (
        <tr key={month.yearMonth} className="table-row">
        <td className="table-cell">
        <span className="text-value">{month.monthName} {month.year}</span>
        </td>
        <td className="table-cell text-right">
        {renderBetrag(month.kirchenkreisErstattung, kkReceived)}
        </td>
        <td className="table-cell">
        {renderStatusCell(month, 'Kirchenkreis')}
        </td>
        <td className="table-cell text-right">
        {renderBetrag(month.gemeindeErstattung, gemReceived)}
        </td>
        <td className="table-cell">
        {renderStatusCell(month, 'Gemeinde')}
        </td>
        <td className="table-cell text-right">
        {renderBetrag(month.mitfahrerErstattung, kkReceived)}
        </td>
        <td className="table-cell text-right">
        <div className="text-value font-medium">
        {ausstehendGesamt.toFixed(2)} €
        </div>
        {(kkReceived || gemReceived) && ausstehendGesamt !== originalGesamt && (
          <div className="text-muted text-xs">
          ({originalGesamt.toFixed(2)} €)
          </div>
        )}
        </td>
        </tr>
      );
    })}
    </tbody>
    </table>
    </div>
    </div>
    
    {/* Mobile View */}
    <div className="sm:hidden space-y-4">
    {filteredData.map((month) => {
      const kkReceived = month.abrechnungsStatus?.kirchenkreis?.erhalten_am;
      const gemReceived = month.abrechnungsStatus?.gemeinde?.erhalten_am;
      const ausstehendKK = kkReceived ? 0 : Number(month.kirchenkreisErstattung || 0);
      const ausstehendGem = gemReceived ? 0 : Number(month.gemeindeErstattung || 0);
      const ausstehendMitf = kkReceived ? 0 : Number(month.mitfahrerErstattung || 0);
      const ausstehendGesamt = ausstehendKK + ausstehendGem + ausstehendMitf;
      const originalGesamt = Number(month.kirchenkreisErstattung || 0) + 
      Number(month.gemeindeErstattung || 0) + 
      Number(month.mitfahrerErstattung || 0);
      
      return (
        <div key={month.yearMonth} className="mobile-card">
        <div className="mobile-card-header mb-4">
        <div className="flex justify-between items-center w-full">
        <div className="mobile-card-title">
        {month.monthName} {month.year}
        </div>
        <div className="text-value font-medium">
        {ausstehendGesamt.toFixed(2)} €
        </div>
        </div>
        </div>
        
        {(kkReceived || gemReceived) && ausstehendGesamt !== originalGesamt && (
          <div className="text-muted text-xs text-right mb-4">
          Ursprünglich: {originalGesamt.toFixed(2)} €
          </div>
        )}
        
        <div className="space-y-4">
        {/* Kirchenkreis */}
        <div className="pt-4">
        <div className="flex justify-between items-start mb-2">
        <span className="text-label text-sm">Kirchenkreis</span>
        <span className={kkReceived ? "text-muted" : "text-value"}>
        {Number(month.kirchenkreisErstattung || 0).toFixed(2)} €
        </span>
        </div>
        <div className="mt-2">
        {renderStatusCell(month, 'Kirchenkreis')}
        </div>
        </div>
        
        {/* Gemeinde */}
        <div className="pt-4">
        <div className="flex justify-between items-start mb-2">
        <span className="text-label text-sm">Gemeinde</span>
        <span className={gemReceived ? "text-muted" : "text-value"}>
        {Number(month.gemeindeErstattung || 0).toFixed(2)} €
        </span>
        </div>
        <div className="mt-2">
        {renderStatusCell(month, 'Gemeinde')}
        </div>
        </div>
        
        {/* Mitfahrer */}
        <div className="pt-4">
        <div className="flex justify-between items-start">
        <span className="text-label text-sm">Mitfahrer</span>
        <span className={kkReceived ? "text-muted" : "text-value"}>
        {Number(month.mitfahrerErstattung || 0).toFixed(2)} €
        </span>
        </div>
        </div>
        </div>
        </div>
      );
    })}
    </div>
    
    {/* Modals */}
    <AbrechnungsStatusModal 
    isOpen={statusModal.open && statusModal.aktion !== 'reset'} 
    onClose={() => setStatusModal({})}
    onSubmit={(date) => handleStatusUpdate(statusModal.jahr, statusModal.monat, statusModal.typ, statusModal.aktion, date)}
    typ={statusModal.typ}
    aktion={statusModal.aktion}
    />
    
    <Modal
    isOpen={statusModal.open && statusModal.aktion === 'reset'}
    onClose={() => setStatusModal({})}
    title="Status zurücksetzen"
    >
    <div className="card-container-highlight">
    <p className="text-value text-sm mb-6">
    Möchten Sie den Status wirklich zurücksetzen?
    </p>
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => setStatusModal({})}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button
    type="button"
    onClick={() => {
      handleStatusUpdate(statusModal.jahr, statusModal.monat, statusModal.typ, 'reset');
      setStatusModal({});
    }}
    className="btn-primary w-full"
    >
    Zurücksetzen
    </button>
    </div>
    </div>
    </Modal>
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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="card-container-highlight m-6 w-full max-w-md">
    <h1 className="text-lg font-medium text-value text-center mb-6">
    Fahrtenbuch Kirchenkreis Dithmarschen
    </h1>
    
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="form-label">
    Benutzername / E-Mail
    </label>
    <input
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    className="form-input"
    required
    />
    </div>
    
    <div>
    <label className="form-label">
    Passwort
    </label>
    <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="form-input"
    required
    />
    </div>
    
    <div className="flex flex-col gap-2">
    <button type="submit" className="btn-primary w-full">
    Login
    </button>
    <button
    type="button"
    onClick={() => setShowForgotPassword(true)}
    className="btn-secondary w-full"
    >
    Passwort vergessen?
    </button>
    </div>
    </form>
    </div>
    
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
    <div className="card-container-highlight">
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="form-label">
    E-Mail-Adresse
    </label>
    <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="form-input"
    required
    />
    </div>
    
    {status && (
      <div className={status.type === 'success' ? 'status-success' : 'status-error'}>
      {status.message}
      </div>
    )}
    
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={onClose}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button
    type="submit"
    className="btn-primary w-full"
    >
    Anweisungen senden
    </button>
    </div>
    </form>
    </div>
  );
}

function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
  }, []);
  
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

function AppContent() {
  const { isLoggedIn, gesamtKirchenkreis, gesamtGemeinde, logout, isProfileModalOpen, setIsProfileModalOpen, user } = useContext(AppContext);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // Token Check Effect
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
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, [logout]);
  
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem('hasSeenHelp') === 'true';
    if (!hasSeenHelp && isLoggedIn) {
      setShowHelpModal(true);
      localStorage.setItem('hasSeenHelp', 'true');
    }
  }, [isLoggedIn]);
  
  if (!isLoggedIn) {
    return <LoginPage />;
  }
  
  return (
    <div className="container mx-auto p-4">
    <div className="mb-8"> 
    {/* Header Section */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
    <h1 className="text-lg font-medium text-value">Fahrtenbuch Kirchenkreis Dithmarschen</h1>
    
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
    {/* Nur noch Einstellungen und Admin-Button */}
    <div className={`grid ${user?.role === 'admin' ? 'grid-cols-2' : 'grid-cols-1'} sm:flex gap-2 w-full`}>
    {user?.role === 'admin' && (
      <button
        onClick={() => setShowUserManagementModal(true)}
        className="btn-primary flex items-center justify-center gap-2"
      >
        <Users size={16} />
        <span>Benutzerverwaltung</span>
      </button>
    )}
    <button
      onClick={() => setIsProfileModalOpen(true)}
      className="btn-primary flex items-center justify-center gap-2"
    >
      <Settings size={16} />
      <span>Einstellungen</span>
    </button>
  </div>
          
          {/* Hilfe und Logout */}
          <div className="grid grid-cols-4 sm:flex gap-2 w-full sm:w-auto">
            <div className="flex gap-2">
              <ThemeToggle />
            </div>
            <div className="col-span-3 flex justify-end gap-2">
              <button
                onClick={() => setShowHelpModal(true)}
                className="btn-primary flex items-center justify-center gap-2"
              >
                <HelpCircle size={16} />
                <span>Hilfe</span>
              </button>
              <button 
                onClick={logout} 
                className="btn-secondary flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    {/* Hauptinhalt */}
    <div className="space-y-6">
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
    
    <HilfeModal 
      isOpen={showHelpModal}
      onClose={() => setShowHelpModal(false)}
    />
  </div>
);
}

export default App;