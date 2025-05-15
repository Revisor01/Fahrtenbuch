import React, { useState, useEffect, createContext, useContext, useMemo } from 'react';
import axios from 'axios';
import './index.css';
import './darkMode.css';
import ProfileModal from './ProfileModal';
import LandingPage from './LandingPage';
import FahrtForm from './FahrtForm';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import Modal from './Modal'; 
import { HelpCircle, Settings, MapPin, Ruler, Users, UserCircle, LogOut, AlertCircle, Circle, CheckCircle2, Info, Bell } from 'lucide-react';
import NotificationModal from './NotificationModal';
import InfoModal from './components/InfoModal';
import AbrechnungsStatusModal from './AbrechnungsStatusModal';
import UserManagement from './UserManagement';
import VerifyEmail from './VerifyEmail';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import SetPassword from './SetPassword';
import { ThemeProvider } from './ThemeContext';
import ThemeToggle from './ThemeToggle';
import NewFeaturesModal from './components/NewFeaturesModal';

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
  
  const [abrechnungsStatusModal, setAbrechnungsStatusModal] = useState({
    open: false,
    traegerId: null,
    aktion: null,
    jahr: null,
    monat: null
  });
  
  const refreshAllData = async (callback) => {
    try {
      const [fahrtenRes, monthlyDataRes, orteRes, distanzenRes, abrechnungstraegerRes, abrechnungstraegerFullRes] = await Promise.all([
        fetchFahrten(),
        fetchMonthlyData(),
        fetchOrte(),
        fetchDistanzen(),
        axios.get('/api/abrechnungstraeger/simple'),
        axios.get('/api/abrechnungstraeger')
      ]);
      
      // Hier die tatsächlichen Daten setzen
      if (fahrtenRes) setFahrten(fahrtenRes);
      if (monthlyDataRes) setMonthlyData(monthlyDataRes);
      if (orteRes) setOrte(orteRes);
      if (distanzenRes) setDistanzen(distanzenRes);
      if (abrechnungstraegerRes?.data) {
        setAbrechnungstraeger(abrechnungstraegerRes.data.data);
      }
      
      // Führe den optionalen Callback mit den vollständigen Daten aus
      if (callback && typeof callback === 'function') {
        if (abrechnungstraegerFullRes?.data) {
          callback(abrechnungstraegerFullRes.data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Daten:', error);
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
    setupAxiosInterceptors();
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
        await refreshAllData(); // Hier hinzufügen
        return response.data;
      }
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Fahrt:', error);
      throw error;
    }
  };
  
  const updateFahrt = async (id, updatedFahrt) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/fahrten/${id}`, updatedFahrt);
      if (response.status === 200) {
        await fetchFahrten();
        await refreshAllData(); // Hier hinzufügen
        return response.data;
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Fahrt:', error);
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
  
  const handleAbrechnungsStatus = async (jahr, monat, traegerId, aktion, datum) => {
    try {
      await updateAbrechnungsStatus(jahr, monat, traegerId, aktion, datum);
      await fetchMonthlyData();
      await fetchFahrten();
      showNotification("Erfolg", "Abrechnungsstatus wurde aktualisiert");
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      showNotification("Fehler", "Status konnte nicht aktualisiert werden");
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
      
      // Rückwärts gehen (24 Monate)
      for (let i = 1; i <= 24; i++) {
        const pastDate = new Date(currentYear, currentMonth - i, 1);
        months.push(pastDate);
      }
      
      // API-Calls vorbereiten
      for (const date of months) {
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        promises.push(axios.get(`/api/fahrten/report/${year}/${month}`));
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
          erstattungen: response.data.summary.erstattungen || {},
          abrechnungsStatus: response.data.summary.abrechnungsStatus || {},
          totalErstattung: response.data.summary.gesamtErstattung || 0
        };
      })
      // Nur Monate mit Erstattungen behalten
      .filter(month => {
        const hasErstattungen = Object.values(month.erstattungen).some(betrag => betrag > 0);
        return hasErstattungen;
      })
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
      await axios.put(`${API_BASE_URL}/orte/${id}`, ort);
      fetchOrte();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Ortes:', error);
    }
  };
  
  const updateDistanz = async (id, distanz) => {
    try {
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
      await fetchFahrten();
      await refreshAllData(); // Hier hinzufügen
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
      setMonthlyData,
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
      refreshAllData,
      abrechnungsStatusModal,
      setAbrechnungsStatusModal,
      handleAbrechnungsStatus,
      abrechnungstraeger,
      setAbrechnungstraeger
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
    <AbrechnungsStatusModal 
    isOpen={abrechnungsStatusModal.open && abrechnungsStatusModal.aktion !== 'reset'} 
    onClose={() => setAbrechnungsStatusModal({})}
    onSubmit={(date) => handleAbrechnungsStatus(
      abrechnungsStatusModal.jahr, 
      abrechnungsStatusModal.monat,
      abrechnungsStatusModal.traegerId, 
      abrechnungsStatusModal.aktion,
      date
    )}
    traegerId={abrechnungsStatusModal.traegerId}
    aktion={abrechnungsStatusModal.aktion}
    />
    
    <Modal
    isOpen={abrechnungsStatusModal.open && abrechnungsStatusModal.aktion === 'reset'}
    onClose={() => setAbrechnungsStatusModal({})}
    title="Status zurücksetzen"
    >
    <div className="card-container-highlight">
    <p className="text-value text-sm mb-6">
    Möchten Sie den Status wirklich zurücksetzen?
    </p>
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => setAbrechnungsStatusModal({})}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button
    type="button"
    onClick={() => {
      handleAbrechnungsStatus(
        abrechnungsStatusModal.jahr,
        abrechnungsStatusModal.monat,
        abrechnungsStatusModal.traegerId,
        'reset'
      );
      setAbrechnungsStatusModal({});
    }}
    className="btn-primary w-full"
    >
    Zurücksetzen
    </button>
    </div>
    </div>
    </Modal>
    </AppContext.Provider>
  );
}

function FahrtenListe() {
  const { fahrten, selectedMonth, setSelectedMonth, fetchFahrten, deleteFahrt, updateFahrt, orte, fetchMonthlyData, showNotification, summary, setFahrten, refreshAllData, abrechnungstraeger, setAbrechnungstraeger, abrechnungsStatusModal, handleAbrechnungsStatus, setAbrechnungsStatusModal } = useContext(AppContext);
  const [expandedFahrten, setExpandedFahrten] = useState({});
  const [isMitfahrerModalOpen, setIsMitfahrerModalOpen] = useState(false);
  const [viewingMitfahrer, setViewingMitfahrer] = useState(null);
  const [editingMitfahrer, setEditingMitfahrer] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthName, setSelectedMonthName] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [editingFahrt, setEditingFahrt] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'datum', direction: 'descending' });
  const [rückfahrtDialog, setRückfahrtDialog] = useState({
    isOpen: false,
    aktuellefahrt: null,
    ergänzendeFahrt: null,
    updatedData: null,
    istRückfahrt: false
  });
  
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
      
    } catch (error) {
      console.error('Fehler beim Exportieren nach Excel:', error);
      if (error.response) {
        console.error('Server-Antwort:', error.response.status, error.response.data);
      }
      alert('Fehler beim Exportieren nach Excel. Bitte versuchen Sie es später erneut und prüfen Sie die Konsole für weitere Details.');
    }
  };
  
  const findErgänzendeFahrt = (aktuellefahrt) => {
    // Bestimmen, ob aktuelle Fahrt eine Hinfahrt oder Rückfahrt ist
    const istRückfahrt = aktuellefahrt.anlass?.toLowerCase().includes('rückfahrt');
    
    console.log("DEBUGGING findErgänzendeFahrt für:", {
      id: aktuellefahrt.id,
      anlass: aktuellefahrt.anlass,
      istRückfahrt,
      von_ort_id: aktuellefahrt.von_ort_id,
      nach_ort_id: aktuellefahrt.nach_ort_id,
      einmaliger_von_ort: aktuellefahrt.einmaliger_von_ort,
      einmaliger_nach_ort: aktuellefahrt.einmaliger_nach_ort
    });
    
    // Durchsuche alle Fahrten mit detailliertem Logging
    for (const f of fahrten) {
      // Ignoriere die aktuelle Fahrt
      if (f.id === aktuellefahrt.id) continue;
      
      // Die Dates müssen gleich sein
      if (f.datum !== aktuellefahrt.datum) continue;
      
      const matchResult = {
        fahrtId: f.id,
        gleicherTag: true,
        orteUmgekehrt: false,
        anlassPassend: false
      };
      
      // Orte müssen umgekehrt sein (bei gespeicherten Orten IDs vergleichen)
      let orteUmgekehrt = false;
      if (aktuellefahrt.von_ort_id && aktuellefahrt.nach_ort_id) {
        orteUmgekehrt = (parseInt(f.von_ort_id) === parseInt(aktuellefahrt.nach_ort_id) && 
          parseInt(f.nach_ort_id) === parseInt(aktuellefahrt.von_ort_id));
        matchResult.orteUmgekehrt = orteUmgekehrt;
        matchResult.orteDetails = {
          aktuelleVonId: parseInt(aktuellefahrt.von_ort_id),
          aktuelleNachId: parseInt(aktuellefahrt.nach_ort_id),
          fVonId: parseInt(f.von_ort_id),
          fNachId: parseInt(f.nach_ort_id)
        };
      }
      // Bei einmaligen Orten die Texte vergleichen
      else if (aktuellefahrt.einmaliger_von_ort && aktuellefahrt.einmaliger_nach_ort) {
        orteUmgekehrt = (f.einmaliger_von_ort === aktuellefahrt.einmaliger_nach_ort && 
          f.einmaliger_nach_ort === aktuellefahrt.einmaliger_von_ort);
        matchResult.orteUmgekehrt = orteUmgekehrt;
        matchResult.orteDetails = {
          aktuelleVonOrt: aktuellefahrt.einmaliger_von_ort,
          aktuelleNachOrt: aktuellefahrt.einmaliger_nach_ort,
          fVonOrt: f.einmaliger_von_ort,
          fNachOrt: f.einmaliger_nach_ort
        };
      }
      
      if (!orteUmgekehrt) continue;
      
      // Anlass prüfen
      let anlassPassend = false;
      const fAnlass = f.anlass?.toLowerCase() || '';
      
      if (istRückfahrt) {
        // Dies ist eine Rückfahrt, suche die Hinfahrt (ohne "Rückfahrt" im Anlass)
        anlassPassend = !fAnlass.includes('rückfahrt');
      } else {
        // Dies ist eine Hinfahrt, suche die Rückfahrt (mit "Rückfahrt" im Anlass)
        anlassPassend = fAnlass.includes('rückfahrt') && 
        fAnlass.includes(aktuellefahrt.anlass.toLowerCase());
      }
      
      matchResult.anlassPassend = anlassPassend;
      matchResult.anlassDetails = {
        aktuellefahrtAnlass: aktuellefahrt.anlass.toLowerCase(),
        fAnlass: fAnlass,
        aktuelleIstRückfahrt: istRückfahrt
      };
      
      console.log("DEBUGGING Prüfergebnis:", matchResult);
      
      if (orteUmgekehrt && anlassPassend) {
        console.log("DEBUGGING Passende Fahrt gefunden:", f);
        return f;
      }
    }
    
    console.log("DEBUGGING Keine passende Fahrt gefunden");
    return null;
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
      
      const updatedFahrt = {
        datum: editingFahrt.datum,
        vonOrtId: editingFahrt.vonOrtTyp === 'gespeichert' ? parseInt(editingFahrt.von_ort_id) : null,
        nachOrtId: editingFahrt.nachOrtTyp === 'gespeichert' ? parseInt(editingFahrt.nach_ort_id) : null,
        einmaligerVonOrt: editingFahrt.vonOrtTyp === 'einmalig' ? editingFahrt.einmaliger_von_ort : null,
        einmaligerNachOrt: editingFahrt.nachOrtTyp === 'einmalig' ? editingFahrt.einmaliger_nach_ort : null,
        anlass: editingFahrt.anlass,
        kilometer: kilometer.toFixed(2),
        abrechnung: parseInt(editingFahrt.abrechnung)
      };
      
      // Prüfen, ob es eine zugehörige Fahrt gibt (egal ob Hin- oder Rückfahrt)
      const ergänzendeFahrt = findErgänzendeFahrt(editingFahrt);
      
      if (ergänzendeFahrt) {
        console.log("Dialog wird geöffnet mit:", {
          aktuellefahrt: editingFahrt,
          ergänzendeFahrt,
          updatedFahrt,
          istRückfahrt: editingFahrt.anlass.toLowerCase().includes('rückfahrt')
        });
        
        // Dialog mit der erkannten Fahrt anzeigen
        setRückfahrtDialog({
          isOpen: true,
          aktuellefahrt: editingFahrt,
          ergänzendeFahrt: ergänzendeFahrt,
          updatedData: updatedFahrt,  // hier verwenden wir die korrekte Variable
          istRückfahrt: editingFahrt.anlass.toLowerCase().includes('rückfahrt')
        });
        setEditingFahrt(null);
        return; // Die Funktion hier beenden, der Rest erfolgt über den Dialog
      }
      
      // Normale Verarbeitung, wenn keine ergänzende Fahrt gefunden wurde
      await updateFahrt(editingFahrt.id, updatedFahrt);
      setEditingFahrt(null);
      showNotification("Erfolg", "Die Fahrt wurde erfolgreich aktualisiert.");
      await fetchFahrten();
    } catch (error) {
      showNotification("Fehler", "Beim Aktualisieren der Fahrt ist ein Fehler aufgetreten.");
      console.error("Fehler beim Aktualisieren:", error);
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
    
    // Ist das aktuelle Monats-Summary
    const erstattungen = summary.erstattungen || {};
    
    // Erst sortierte Abrechnungsträger
    abrechnungstraeger.forEach(traeger => {
      const betrag = erstattungen[traeger.id];
      if (betrag > 0) {
        kategorien.push([
          traeger.id.toString(),
          traeger.name,
          betrag // Hier direkt den Betrag verwenden, nicht data.original/ausstehend
        ]);
      }
    });
    
    // Dann Mitfahrer am Ende
    const mitfahrerBetrag = erstattungen['mitfahrer'];
    if (mitfahrerBetrag > 0) {
      kategorien.push(['mitfahrer', 'Mitfahrer:innen', mitfahrerBetrag]);
    }
    
    return kategorien;
  };
  
  const allCategories = () => {
    // Sammle alle einzigartigen Kategorien
    const categories = new Set([
      ...Object.keys(summary.erstattungen || {}),
      ...Object.keys(summary.mitfahrerErstattungen || {})
    ]);
    return categories.size; // Gibt die tatsächliche Anzahl der Kategorien zurück
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
      <div className={`grid grid-cols-1 gap-4 ${
        allCategories() === 1 
        ? 'sm:grid-cols-1'
        : allCategories() === 2 
        ? 'sm:grid-cols-2' 
        : allCategories() === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'
      }`}>
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
            onClick={() => setAbrechnungsStatusModal({ 
              open: true, 
              traegerId: key,
              aktion: 'reset', 
              jahr: selectedYear,
              monat: selectedMonth.split('-')[1]
            })}
            >
            <CheckCircle2 size={14} />
            <span>Erhalten am: {new Date(summary.abrechnungsStatus[key].erhalten_am).toLocaleDateString()}</span>
            </span>
          ) : summary.abrechnungsStatus?.[key]?.eingereicht_am ? (
            <span 
            className="status-badge-secondary cursor-pointer"
            onClick={() => setAbrechnungsStatusModal({ 
              open: true, 
              traegerId: key,
              aktion: 'erhalten', 
              jahr: selectedYear,
              monat: selectedMonth.split('-')[1]
            })}
            >
            <Circle size={14} />
            <span>Eingereicht am: {new Date(summary.abrechnungsStatus[key].eingereicht_am).toLocaleDateString()}</span>
            </span>
          ) : (
            <span 
            className="status-badge-secondary cursor-pointer"
            onClick={() => setAbrechnungsStatusModal({ 
              open: true, 
              traegerId: key,
              aktion: 'eingereicht', 
              jahr: selectedYear,
              monat: selectedMonth.split('-')[1]
            })}
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
      <div className="card-container col-span-full">
      <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-label">Gesamt</span>
      <span className="font-medium text-value">
      {Object.entries(summary.erstattungen || {}).reduce((sum, [id, betrag]) => {
        const received = summary.abrechnungsStatus?.[id]?.erhalten_am;
        return sum + (received ? 0 : Number(betrag || 0));
      }, 0).toFixed(2)} €
      </span>
      </div>
      {Object.entries(summary.erstattungen || {}).some(([id, betrag]) => 
        summary.abrechnungsStatus?.[id]?.erhalten_am
      ) && (
        <div className="text-muted text-xs text-right">
        Ursprünglich: {Object.values(summary.erstattungen || {}).reduce((sum, betrag) => 
          sum + Number(betrag || 0), 0
        ).toFixed(2)} €
        </div>
      )}
      </div>
      </div>
      
      {/* Export Buttons */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
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
          await refreshAllData(); // Hier hinzufügen
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
      await refreshAllData(); // Hier hinzufügen
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
    Träger {sortConfig.key === 'abrechnung' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header">Mit*</th>
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
    {sortedFahrten.map((fahrt) => {
      const traeger = abrechnungstraeger?.find(at => at.id === parseInt(fahrt.abrechnung));
      const abrechnungstraegerName = traeger ? traeger.name : 'Unbekannt';
      
      return (
        <div key={fahrt.id} className="mobile-card">
        {editingFahrt?.id === fahrt.id ? (
          // Edit Mode
          <div className="space-y-4">
          <div>
          <label className="form-label">Datum</label>
          <input
          type="date"
          value={editingFahrt.datum}
          onChange={(e) => handleEditChange('datum', e.target.value)}
          className="form-input w-full"
          />
          </div>
          
          {/* Von-Ort */}
          <div>
          <label className="checkbox-label mb-2">
          <input
          type="checkbox"
          checked={editingFahrt.vonOrtTyp === 'einmalig'}
          onChange={(e) => handleEditChange('vonOrtTyp', e.target.checked ? 'einmalig' : 'gespeichert')}
          className="checkbox-input"
          />
          <span className="text-xs text-label">Einmaliger Von-Ort</span>
          </label>
          {editingFahrt.vonOrtTyp === 'einmalig' ? (
            <input
            type="text"
            value={editingFahrt.einmaliger_von_ort || ''}
            onChange={(e) => handleEditChange('einmaliger_von_ort', e.target.value)}
            className="form-input w-full"
            placeholder="Von (einmalig)"
            />
          ) : (
            <select
            value={editingFahrt.von_ort_id || ''}
            onChange={(e) => handleEditChange('von_ort_id', e.target.value)}
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
          onChange={(e) => handleEditChange('nachOrtTyp', e.target.checked ? 'einmalig' : 'gespeichert')}
          className="checkbox-input"
          />
          <span className="text-xs text-label">Einmaliger Nach-Ort</span>
          </label>
          {editingFahrt.nachOrtTyp === 'einmalig' ? (
            <input
            type="text"
            value={editingFahrt.einmaliger_nach_ort || ''}
            onChange={(e) => handleEditChange('einmaliger_nach_ort', e.target.value)}
            className="form-input w-full"
            placeholder="Nach (einmalig)"
            />
          ) : (
            <select
            value={editingFahrt.nach_ort_id || ''}
            onChange={(e) => handleEditChange('nach_ort_id', e.target.value)}
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
          onChange={(e) => handleEditChange('anlass', e.target.value)}
          className="form-input w-full"
          />
          </div>
          
          {/* Kilometer */}
          <div>
          <label className="form-label">Kilometer</label>
          <input
          type="number"
          value={editingFahrt.kilometer}
          onChange={(e) => handleEditChange('kilometer', e.target.value)}
          className="form-input w-full"
          />
          </div>
          
          {/* Abrechnung */}
          <div>
          <label className="form-label">Abrechnung</label>
          <select
          value={editingFahrt.abrechnung}
          onChange={(e) => handleEditChange('abrechnung', e.target.value)}
          className="form-select w-full"
          >
          {abrechnungstraeger?.map(traeger => (
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
          {abrechnungstraegerName}
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
      );
    })}
    </div>
    
    {/* Modals */}
    <Modal
    isOpen={rückfahrtDialog.isOpen}
    onClose={() => setRückfahrtDialog({ isOpen: false })}
    title={rückfahrtDialog.istRückfahrt ? "Hinfahrt erkannt" : "Rückfahrt erkannt"}
    >
    <div className="space-y-4">
    <p className="text-sm text-value">
    {rückfahrtDialog.istRückfahrt 
      ? "Es wurde eine zugehörige Hinfahrt erkannt." 
      : "Es wurde eine zugehörige Rückfahrt erkannt."} 
    Möchten Sie die Änderungen auch auf diese Fahrt anwenden?
    </p>
    
    {/* Details der erkannten Fahrt anzeigen */}
    {rückfahrtDialog.ergänzendeFahrt && (
      <div className="bg-primary-25 dark:bg-primary-900/30 p-4 rounded-lg">
      <h4 className="text-sm font-medium text-value mb-2">Erkannte Fahrt:</h4>
      <div className="text-xs space-y-1">
      <div className="flex justify-between">
      <span className="text-label">Datum:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt && new Date(rückfahrtDialog.ergänzendeFahrt.datum).toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Von:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.von_ort_name || rückfahrtDialog.ergänzendeFahrt?.einmaliger_von_ort}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Nach:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.nach_ort_name || rückfahrtDialog.ergänzendeFahrt?.einmaliger_nach_ort}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Anlass:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.anlass}</span>
      </div>
      </div>
      </div>
    )}
    
    {/* Rest des Dialogs... */}
    
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => {
      // Nur aktuelle Fahrt aktualisieren
      if (rückfahrtDialog.aktuellefahrt && rückfahrtDialog.updatedData) {
        updateFahrt(rückfahrtDialog.aktuellefahrt.id, rückfahrtDialog.updatedData)
        .then(() => {
          fetchFahrten();
          showNotification("Erfolg", "Die Fahrt wurde erfolgreich aktualisiert.");
          setRückfahrtDialog({ isOpen: false });
        })
        .catch(error => {
          console.error('Fehler:', error);
          showNotification("Fehler", "Es ist ein Fehler aufgetreten.");
          setRückfahrtDialog({ isOpen: false });
        });
      }
    }}
    className="btn-secondary w-full"
    >
    Nur {rückfahrtDialog.istRückfahrt ? "Rückfahrt" : "Hinfahrt"} aktualisieren
    </button>
    <button
    type="button"
    onClick={async () => {
      try {
        if (!rückfahrtDialog.aktuellefahrt || !rückfahrtDialog.ergänzendeFahrt || !rückfahrtDialog.updatedData) {
          throw new Error("Ungültige Daten");
        }
        
        // Aktuelle Fahrt aktualisieren
        await updateFahrt(rückfahrtDialog.aktuellefahrt.id, rückfahrtDialog.updatedData);
        
        // Ergänzende Fahrt anpassen
        let ergänzendesFahrtUpdate;
        
        if (rückfahrtDialog.istRückfahrt) {
          // Bei Bearbeitung einer Rückfahrt - Update für die Hinfahrt
          ergänzendesFahrtUpdate = {
            ...rückfahrtDialog.updatedData,
            vonOrtId: rückfahrtDialog.updatedData.nachOrtId,
            nachOrtId: rückfahrtDialog.updatedData.vonOrtId,
            einmaligerVonOrt: rückfahrtDialog.updatedData.einmaligerNachOrt,
            einmaligerNachOrt: rückfahrtDialog.updatedData.einmaligerVonOrt,
            anlass: rückfahrtDialog.ergänzendeFahrt.anlass
          };
        } else {
          // Bei Bearbeitung einer Hinfahrt - Update für die Rückfahrt
          ergänzendesFahrtUpdate = {
            ...rückfahrtDialog.updatedData,
            vonOrtId: rückfahrtDialog.updatedData.nachOrtId,
            nachOrtId: rückfahrtDialog.updatedData.vonOrtId,
            einmaligerVonOrt: rückfahrtDialog.updatedData.einmaligerNachOrt,
            einmaligerNachOrt: rückfahrtDialog.updatedData.einmaligerVonOrt,
            anlass: rückfahrtDialog.ergänzendeFahrt.anlass
          };
        }
        
        await updateFahrt(rückfahrtDialog.ergänzendeFahrt.id, ergänzendesFahrtUpdate);
        
        showNotification("Erfolg", "Beide Fahrten wurden erfolgreich aktualisiert.");
        await fetchFahrten();
        setRückfahrtDialog({ isOpen: false });
      } catch (error) {
        console.error('Fehler:', error);
        showNotification("Fehler", "Es ist ein Fehler aufgetreten.");
        setRückfahrtDialog({ isOpen: false });
      }
    }}
    className="btn-primary w-full"
    >
    Beide Fahrten aktualisieren
    </button>
    </div>
    </div>
    </Modal>
    
    
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
  const { monthlyData, fetchMonthlyData, updateAbrechnungsStatus, abrechnungstraeger, abrechnungsStatusModal, setAbrechnungsStatusModal, handleAbrechnungsStatus , summary, showNotification } = useContext(AppContext);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [hideCompleted, setHideCompleted] = useState(true);
  const [filteredData, setFilteredData] = useState([]);
  const currentYear = new Date().getFullYear().toString();
    
  const getMonthName = (month) => {
    return new Date(2000, month - 1, 1).toLocaleString('de-DE', { month: 'long' });
  };
  
  const calculateYearTotal = () => {
    const totals = filteredData.reduce((total, month) => {
      Object.entries(month.erstattungen || {}).forEach(([traegerId, betrag]) => {
        if (!total[traegerId]) {
          total[traegerId] = {
            original: 0,
            ausstehend: 0 
          };
        }
        
        total[traegerId].original += Number(betrag || 0);
        
        if (!month.abrechnungsStatus?.[traegerId]?.erhalten_am) {
          total[traegerId].ausstehend += Number(betrag || 0);
        }
      });
      
      return total;
    }, {});
    
    const relevantKeys = Object.keys(totals).filter(key => key !== 'gesamt');
    totals.gesamt = {
      original: relevantKeys.reduce((sum, key) => sum + (totals[key].original || 0), 0),
      ausstehend: relevantKeys.reduce((sum, key) => sum + (totals[key].ausstehend || 0), 0)
    };
    
    return totals;
  };
  
  const getKategorienMitErstattung = () => {
    const kategorien = [];
    
    // Jahres-Summen aus dem yearTotal berechnen
    const yearTotals = calculateYearTotal();
    
    // Abrechnungsträger Cards
    abrechnungstraeger.forEach(traeger => {
      const data = yearTotals[traeger.id];
      if (data && (data.original > 0 || data.ausstehend > 0)) {
        kategorien.push([
          traeger.id.toString(),
          traeger.name,
          data  // Hier übergeben wir das komplette Objekt mit original/ausstehend
        ]);
      }
    });
    
    // Mitfahrer Card
    const mitfahrerData = yearTotals['mitfahrer'];
    if (mitfahrerData && (mitfahrerData.original > 0 || mitfahrerData.ausstehend > 0)) {
      kategorien.push(['mitfahrer', 'Mitfahrer:innen', mitfahrerData]);
    }
    
    return kategorien;
  };
  
  const allCategories = () => {
    // Sammle alle einzigartigen Kategorien
    const categories = new Set([
      ...Object.keys(summary.erstattungen || {}),
      ...Object.keys(summary.mitfahrerErstattungen || {})
    ]);
    return categories.size; // Gibt die tatsächliche Anzahl der Kategorien zurück
  };
  
  // MonthlyOverview - nur diese useEffects
  useEffect(() => {
    fetchMonthlyData(); // Dieser holt die Daten für alle relevanten Monate
  }, []);  // Nur einmal beim Mount
  
  useEffect(() => {
    const filtered = monthlyData.filter(month => {
      if (selectedYear !== 'all' && month.year.toString() !== selectedYear) {
        return false;
      }
      
      if (hideCompleted) {
        const allCompleted = Object.entries(month.erstattungen || {}).every(([id, betrag]) => {
          return betrag === 0 || month.abrechnungsStatus?.[id]?.erhalten_am;
        });
        
        const mitfahrerCompleted = !month.erstattungen?.mitfahrer || 
        month.abrechnungsStatus?.mitfahrer?.erhalten_am;
        
        if (allCompleted && mitfahrerCompleted) {
          return false;
        }
      }
      return true;
    });
    setFilteredData(filtered);
  }, [monthlyData, hideCompleted, selectedYear]);
  
  const renderBetrag = (betrag, isReceived) => {
    return (
      <span className={isReceived ? "text-muted" : "text-value"}>
      {Number(betrag || 0).toFixed(2)} €
      </span>
    );
  };
  
  const QuickActions = ({ filteredData, handleAbrechnungsStatus, abrechnungstraeger }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const actions = [
      {
        label: 'Alle als eingereicht markieren',
        action: async () => {
          const today = new Date().toISOString().split('T')[0];
          try {
            for (const month of filteredData) {
              // Für jeden Abrechnungsträger
              for (const traeger of abrechnungstraeger) {
                if (month.erstattungen?.[traeger.id] > 0 && 
                  !month.abrechnungsStatus?.[traeger.id]?.eingereicht_am) {
                    await handleAbrechnungsStatus(
                      month.year, 
                      month.monatNr, 
                      traeger.id, 
                      'eingereicht', 
                      today
                    );
                  }
              }
              // Für Mitfahrer
              if (month.erstattungen?.mitfahrer > 0 && 
                !month.abrechnungsStatus?.mitfahrer?.eingereicht_am) {
                  await handleAbrechnungsStatus(
                    month.year,
                    month.monatNr,
                    'mitfahrer',
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
              // Für jeden Abrechnungsträger
              for (const traeger of abrechnungstraeger) {
                if (month.abrechnungsStatus?.[traeger.id]?.eingereicht_am && 
                  !month.abrechnungsStatus?.[traeger.id]?.erhalten_am) {
                    await handleAbrechnungsStatus(
                      month.year,
                      month.monatNr,
                      traeger.id,
                      'erhalten',
                      today
                    );
                  }
              }
              // Für Mitfahrer
              if (month.abrechnungsStatus?.mitfahrer?.eingereicht_am && 
                !month.abrechnungsStatus?.mitfahrer?.erhalten_am) {
                  await handleAbrechnungsStatus(
                    month.year,
                    month.monatNr,
                    'mitfahrer',
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
  
  const renderStatusCell = (month, traegerId) => {
    const status = month.abrechnungsStatus?.[traegerId];
    const betrag = traegerId === 'mitfahrer' 
    ? month.erstattungen?.mitfahrer || 0
    : month.erstattungen?.[traegerId] || 0;
    
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
    
    // Wenn erhalten
    if (status?.erhalten_am) {
      return (
        <div className="flex items-center justify-between">
        <span 
        className="status-badge-primary cursor-pointer"
        onClick={() => {
          showNotification(
            "Status zurücksetzen",
            "Möchten Sie den Status wirklich zurücksetzen?",
            () => handleAbrechnungsStatus(
              month.year,
              month.monatNr,
              traegerId,
              'reset'
            ),
            true // showCancel
          );
        }}
        >
        <CheckCircle2 size={14} />
        <span>Erhalten am: {new Date(status.erhalten_am).toLocaleDateString()}</span>
        </span>
        </div>
      );
    }
    
    // Wenn eingereicht aber nicht erhalten
    if (status?.eingereicht_am) {
      return (
        <div className="flex items-center justify-between">
        <span 
        className="status-badge-secondary cursor-pointer"
        onClick={() => setAbrechnungsStatusModal({ 
          open: true, 
          traegerId,
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
    
    // Wenn noch nicht eingereicht
    return betrag > 0 ? (
      <div className="flex items-center justify-between">
      <span 
      className="status-badge-secondary cursor-pointer"
      onClick={() => setAbrechnungsStatusModal({ 
        open: true, 
        traegerId,
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
    <div className="card-container-highlight mb-4">
    <div className="space-y-6 mb-4">
    {/* Header mit Navigation */}
    <div className="flex flex-col gap-4">
    {/* Erste Zeile */}
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
    {/* Titel und Aktuelles Jahr - immer in einer Zeile */}
    <div className="flex justify-between items-center">
    <h2 className="text-lg font-medium text-value">Jahresübersicht</h2>
    {selectedYear !== currentYear && (
      <button onClick={() => setSelectedYear(currentYear)} className="sm:hidden btn-secondary">
      Aktuelles Jahr
      </button>
    )}
    </div>
    
    {/* Checkbox und Select - nur auf Desktop hier */}
    <div className="hidden sm:flex items-center gap-4 ml-auto">
    <label className="checkbox-label">
    {selectedYear !== currentYear && (
      <button onClick={() => setSelectedYear(currentYear)} className="btn-secondary">
      Aktuelles Jahr
      </button>
    )}
    <input
    type="checkbox"
    id="hideCompleted"
    checked={hideCompleted}
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="checkbox-input h-3 w-3"
    />
    <span className="text-xs text-label">Abgeschlossene</span>
    </label>
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
    
    {/* Zweite Zeile - nur Mobile */}
    <div className="flex sm:hidden items-center justify-end gap-4">
    <label className="checkbox-label">
    <input
    type="checkbox"
    id="hideCompleted"
    checked={hideCompleted}
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="checkbox-input h-3 w-3"
    />
    <span className="text-xs text-label">Abgeschlossene</span>
    </label>
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
    
    {/* Dritte Zeile - Quick Actions nur auf Mobile */}
    <div className="">
    <QuickActions 
    filteredData={filteredData}
    handleAbrechnungsStatus={handleAbrechnungsStatus}
    abrechnungstraeger={abrechnungstraeger}
    className="w-full text-center"
    />
    </div>
    </div>
    </div>
    
    {/* Cards Grid - wie in der Monatsübersicht */}
    <div className={`grid grid-cols-1 mb-4 ${
      getKategorienMitErstattung().length === 1 
      ? 'sm:grid-cols-1 gap-y-4'
      : getKategorienMitErstattung().length === 2 
      ? 'sm:grid-cols-2 gap-4'
      : getKategorienMitErstattung().length === 3
      ? 'sm:grid-cols-3 gap-4'
      : 'sm:grid-cols-2 lg:grid-cols-4 gap-4'
    }`}>
    {getKategorienMitErstattung().map(([key, displayName, data]) => (
      <div key={key} className="card-container">
      <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-label">{displayName}</span>
      <span className="text-value font-medium">
      {(data.ausstehend || 0).toFixed(2)} €
      </span>
      </div>
      {data.original !== data.ausstehend && (
        <div className="text-right text-muted text-xs">
        Ursprünglich: {(data.original || 0).toFixed(2)} €
        </div>
      )}
      </div>
    ))}
    
    {/* Gesamt Card */}
    {yearTotal.gesamt && yearTotal.gesamt.original > 0 && (
      <div className="card-container col-span-1 sm:col-span-2 lg:col-span-full">
      <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-label">Gesamt</span>
      <span className="text-value font-medium">
      {(yearTotal.gesamt?.ausstehend || 0).toFixed(2)} €
      </span>
      </div>
      {yearTotal.gesamt?.original !== yearTotal.gesamt?.ausstehend && (
        <div className="text-right text-muted text-xs">
        Ursprünglich: {(yearTotal.gesamt?.original || 0).toFixed(2)} €
        </div>
      )}
      </div>
    )}
    </div>
    </div>
    {/* Desktop View - neue Card-basierte Ansicht */}
    <div className="hidden sm:block space-y-4">
    {filteredData.map((month) => {
      
      const originalGesamt = Object.values(month.erstattungen || {}).reduce((sum, betrag) => 
        sum + Number(betrag || 0), 0
      );
      
      const gesamtAusstehend = Object.entries(month.erstattungen || {}).reduce((sum, [id, betrag]) => {
        const received = month.abrechnungsStatus?.[id]?.erhalten_am;
        return sum + (received ? 0 : Number(betrag || 0));
      }, 0);
      
      return (
        <div key={month.yearMonth} className="card-container">
        {/* Header mit Monat und Gesamtsumme */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-primary-100 dark:border-primary-700">
        <h3 className="text-lg font-medium text-value">
        {month.monthName} {month.year}
        </h3>
        <div className="text-right">
        <div className="text-value font-medium">
        {gesamtAusstehend.toFixed(2)} €
        </div>
        {gesamtAusstehend !== originalGesamt && (
          <div className="text-xs text-muted">
          Ursprünglich: {originalGesamt.toFixed(2)} €
          </div>
        )}
        </div>
        </div>
        
        {/* Grid für Abrechnungsträger */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {abrechnungstraeger
          .filter(traeger => {
            // Nur anzeigen wenn ein Betrag > 0 existiert
            const betrag = month.erstattungen?.[traeger.id] || 0;
            return betrag > 0;
          })
          .map(traeger => (
            <div key={traeger.id} className="card-container">
            <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-value">{traeger.name}</span>
            <span className={month.abrechnungsStatus?.[traeger.id]?.erhalten_am ? "text-muted" : "text-value"}>
            {Number(month.erstattungen?.[traeger.id] || 0).toFixed(2)} €
            </span>
            </div>
            <div className="mt-2">
            {renderStatusCell(month, traeger.id)}
            </div>
            </div>
          ))}
        
        {/* Mitfahrer Card wenn vorhanden */}
        {month.erstattungen?.mitfahrer > 0 && (
          <div className="bg-primary-25 dark:bg-primary-900/30 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-value">Mitfahrer:innen</span>
          <span className={month.abrechnungsStatus?.mitfahrer?.erhalten_am ? "text-muted" : "text-value"}>
          {Number(month.erstattungen?.mitfahrer || 0).toFixed(2)} €
          </span>
          </div>
          <div className="mt-2">
          {renderStatusCell(month, 'mitfahrer')}
          </div>
          </div>
        )}
        </div>
        </div>
      );
    })}
    </div>
    
    {/* Mobile View */}
    <div className="sm:hidden space-y-4">
    {filteredData.map((month) => {
      const gesamtAusstehend = Object.entries(month.erstattungen || {}).reduce((sum, [id, betrag]) => {
        const received = month.abrechnungsStatus?.[id]?.erhalten_am;
        return sum + (received ? 0 : Number(betrag || 0));
      }, 0);
      
      const originalGesamt = Object.values(month.erstattungen || {}).reduce((sum, betrag) => 
        sum + Number(betrag || 0), 0
      );
      
      return (
        <div key={month.yearMonth} className="mobile-card">
        <div className="mobile-card-header mb-4">
        <div className="flex justify-between items-center w-full">
        <div className="mobile-card-title">
        {month.monthName} {month.year}
        </div>
        <div className="text-value font-medium">
        {gesamtAusstehend.toFixed(2)} €
        </div>
        </div>
        </div>
        
        {gesamtAusstehend !== originalGesamt && (
          <div className="text-muted text-xs text-right mb-4">
          Ursprünglich: {originalGesamt.toFixed(2)} €
          </div>
        )}
        
        <div className="space-y-4">
        {abrechnungstraeger
          .filter(traeger => {
            const betrag = month.erstattungen?.[traeger.id] || 0;
            return betrag > 0;
          })
          .map(traeger => (
            <div key={traeger.id} className="pt-4">
            <div className="flex justify-between items-start mb-2">
            <span className="text-label text-sm">{traeger.name}</span>
            <span className={month.abrechnungsStatus?.[traeger.id]?.erhalten_am ? "text-muted" : "text-value"}>
            {Number(month.erstattungen?.[traeger.id] || 0).toFixed(2)} €
            </span>
            </div>
            <div className="mt-2">
            {renderStatusCell(month, traeger.id)}
            </div>
            </div>
          ))}
        
        {/* Mitfahrer */}
        {month.erstattungen?.mitfahrer > 0 && (
          <div className="pt-4">
          <div className="flex justify-between items-start">
          <span className="text-label text-sm">Mitfahrer</span>
          <span className={month.abrechnungsStatus?.mitfahrer?.erhalten_am ? "text-muted" : "text-value"}>
          {Number(month.erstattungen?.mitfahrer || 0).toFixed(2)} €
          </span>
          </div>
          <div className="mt-2">
          {renderStatusCell(month, 'mitfahrer')}
          </div>
          </div>
        )}
        </div>
        </div>
      );
    })}
    </div>
    <AbrechnungsStatusModal 
    isOpen={abrechnungsStatusModal.open && abrechnungsStatusModal.aktion !== 'reset'} 
    onClose={() => setAbrechnungsStatusModal({})}
    onSubmit={(date) => handleAbrechnungsStatus(
      abrechnungsStatusModal.jahr, 
      abrechnungsStatusModal.monat,
      abrechnungsStatusModal.traegerId, 
      abrechnungsStatusModal.aktion,
      date
    )}
    traegerId={abrechnungsStatusModal.traegerId}
    aktion={abrechnungsStatusModal.aktion}
    />
    </div>
  );
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, showNotification } = useContext(AppContext);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    username: '',
    email: '',
    registrationCode: ''
  });
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (error) {
      alert('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
    }
  };
  
  const validateEmail = (email) => {
    const allowedEmailDomains = window.appConfig?.allowedEmailDomains || process.env.REACT_APP_ALLOWED_EMAIL_DOMAINS;
    if (!allowedEmailDomains) return true;
    
    const domain = email.split('@')[1];
    const allowedDomainsArray = allowedEmailDomains.split(',');
    return allowedDomainsArray.includes(domain);
  };
  
  const handleRegistration = async (e) => {
    e.preventDefault();
    
    // Email-Domain prüfen
    if (!validateEmail(registrationData.email)) {
      showNotification('Fehler', 'Diese Email-Domain ist nicht für die Registrierung zugelassen');
      return;
    }
    
    try {
      const response = await axios.post('/api/auth/register', registrationData);
      showNotification('Erfolg', response.data.message);
      setShowRegistration(false);
    } catch (error) {
      showNotification('Fehler', error.response?.data?.message || 'Registrierung fehlgeschlagen');
    }
  };
  
  const appTitle = window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch Kirchenkreis Dithmarschen";
  const allowRegistration = window.appConfig?.allowRegistration === 'true' || process.env.REACT_APP_ALLOW_REGISTRATION === 'true';
  const allowedEmailDomains = window.appConfig?.allowedEmailDomains || process.env.REACT_APP_ALLOWED_EMAIL_DOMAINS;
  const registrationCode = window.appConfig?.registrationCode || process.env.REACT_APP_REGISTRATION_CODE;
  const apiUrl = process.env.REACT_APP_API_URL || '/api'; //Direkt und fest definiert!

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="card-container-highlight m-6 w-full max-w-md">
    <h1 className="text-lg font-medium text-value text-center mb-6">
    {appTitle}
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
    <div className="flex gap-2 pb-6">
    <button
    type="button"
    onClick={() => setShowForgotPassword(true)}
    className="btn-secondary w-full"
    >
    Passwort vergessen?
    </button>

    {allowRegistration && (
      <button
      type="button"
      onClick={() => setShowRegistration(true)}
      className="btn-secondary w-full"
      >
      Registrieren
      </button>
    )}
    </div>
    <Link to="/help" className="btn-primary w-full items-center flex justify-center">
    Hilfe & Tutorials
    </Link>
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
    
    <Modal
    isOpen={showRegistration}
    onClose={() => setShowRegistration(false)}
    title="Registrierung"
    >
    <div className="card-container-highlight">
    <form onSubmit={handleRegistration} className="space-y-4">
    <div>
    <label className="form-label">Benutzername</label>
    <input
    type="text"
    value={registrationData.username}
    onChange={(e) => setRegistrationData({ ...registrationData, username: e.target.value })}
    className="form-input"
    required
    />
    </div>
    <div>
    <label className="form-label">E-Mail</label>
    <input
    type="email"
    value={registrationData.email}
    onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
    className="form-input"
    required
    />
    </div>
    {allowedEmailDomains && (
      <div className="text-xs text-muted mt-1">
      Erlaubte Domains: {allowedEmailDomains}
      </div>
    )}
    {registrationCode && (
      <div>
      <label className="form-label">Registrierungscode</label>
      <input
      type="text"
      value={registrationData.registrationCode}
      onChange={(e) => setRegistrationData({ ...registrationData, registrationCode: e.target.value })}
      className="form-input"
      required
      />
      </div>
    )}
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => setShowRegistration(false)}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button type="submit" className="btn-primary w-full">
    Registrieren
    </button>
    </div>
    </form>
    </div>
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
    <Route path="/help" element={<LandingPage />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/*" element={<AppContent />} />
    </Routes>
    </AppProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isLoggedIn, gesamtKirchenkreis, gesamtGemeinde, logout, isProfileModalOpen, setIsProfileModalOpen, user } = useContext(AppContext);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNewFeaturesModal, setShowNewFeaturesModal] = useState(false);
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
  
  if (!isLoggedIn) {
    return <LoginPage />;
  }
    
  return (
    <div className="container mx-auto p-4">
    <div className="mb-8"> 
    {/* Header Section */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
    <h1 className="text-lg font-medium text-value">
    {window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch"}
    </h1>
    
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
    {/* Admin-Button und Einstellungen in einer eigenen Zeile auf Mobil */}
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
      
      {/* Theme, Info, Hilfe und Logout in einer zweiten Zeile auf Mobil */}
      <div className="flex justify-between w-full sm:gap-4">
<div className="flex gap-2">
  <ThemeToggle />
  <button
    onClick={() => setShowNewFeaturesModal(true)}
    className="btn-primary flex items-center justify-center relative"
    title="Neue Funktionen"
  >
    <Bell size={16} />
    <div className="absolute -top-1 -right-1 bg-secondary-500 rounded-full w-3 h-3"></div>
  </button>
  <button
    onClick={() => setShowInfoModal(true)}
    className="btn-primary flex items-center justify-center"
    title="Info"
  >
    <Info size={16} />
  </button>
  <Link
    to="/help"
    className="btn-primary flex items-center justify-center gap-2"
  >
    <HelpCircle size={16} />
    <span className="hidden sm:inline">Hilfe</span>
  </Link>
</div>
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
    
    {/* Hauptinhalt */}
    <div className="space-y-6">
      <FahrtForm />
      <FahrtenListe />
      <MonthlyOverview />
    </div>
    
    {/* Modals */}

<NewFeaturesModal 
  isOpen={showNewFeaturesModal} 
  onClose={() => setShowNewFeaturesModal(false)} 
/>

    <InfoModal 
      isOpen={showInfoModal} 
      onClose={() => setShowInfoModal(false)} 
    />

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
  
  </div>
);
}

export default App;