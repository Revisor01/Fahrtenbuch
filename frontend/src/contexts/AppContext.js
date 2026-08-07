import React, { useState, useEffect, createContext, useContext, useMemo, useRef } from 'react';
import axios from 'axios';
import StatusDatumSheet from '../components/abrechnung/StatusDatumSheet';
import { useToast } from '../components/ui/Toast';

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
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedVonMonth, setSelectedVonMonth] = useState(''); // '' = Einzelmonat-Modus
  const [gesamtKirchenkreis, setGesamtKirchenkreis] = useState(0);
  const [gesamtGemeinde, setGesamtGemeinde] = useState(0);
  const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
  const [summary, setSummary] = useState({});
  const isLoggingOut = useRef(false);
  const toast = useToast();

  const [favoriten, setFavoriten] = useState([]);

  const [abrechnungsStatusModal, setAbrechnungsStatusModal] = useState({
    open: false,
    traegerId: null,
    aktion: null,
    jahr: null,
    monat: null
  });

  const fetchFavoriten = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/favoriten`);
      setFavoriten(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Favoriten:', error);
      setFavoriten([]);
    }
  };

  const addFavorit = async (data) => {
    try {
      await axios.post(`${API_BASE_URL}/favoriten`, data);
      await fetchFavoriten();
    } catch (error) {
      console.error('Fehler beim Hinzufügen des Favoriten:', error);
      throw error;
    }
  };

  const deleteFavorit = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/favoriten/${id}`);
      await fetchFavoriten();
    } catch (error) {
      console.error('Fehler beim Löschen des Favoriten:', error);
      throw error;
    }
  };

  const executeFavorit = async (id, mitRueckfahrt = false) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/favoriten/${id}/execute`, { mitRueckfahrt });
      await refreshAllData();
      return response.data;
    } catch (error) {
      console.error('Fehler beim Ausführen des Favoriten:', error);
      throw error;
    }
  };

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
      // Favoriten separat laden (kein Fehler wenn Endpoint nicht verfügbar)
      fetchFavoriten().catch(() => {});

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

  // Brücke für Bestandscode: reine Erfolgs-/Fehler-/Hinweismeldungen laufen
  // als Toast. Bestätigungs-Flows wurden auf direkte Ausführung + Toast mit
  // „Rückgängig" umgebaut — kein Modal für Bestätigungen (Design-Spec).
  const showNotification = (title, message) => {
    if (title === 'Fehler') {
      toast.error(message);
    } else {
      toast.success(message);
    }
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
          if (!isLoggingOut.current) {
            isLoggingOut.current = true;
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshAllData();
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
    isLoggingOut.current = false;
  };

  const fetchOrte = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/orte`);
      setOrte(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen der Orte:', error);
    }
  };

  // silent = true: kein eigener Toast (für Mehrfach-Updates in Schleifen)
  // refresh = false: keine Fetches — der Aufrufer lädt am Ende selbst nach
  // (fetchMonthlyData feuert ~28 Requests; in Schleifen wäre das ein Sturm)
  const updateAbrechnungsStatus = async (jahr, monat, typ, aktion, datum, silent = false, refresh = true) => {
    try {
      await axios.post(`${API_BASE_URL}/fahrten/abrechnungsstatus`, {
        jahr,
        monat,
        typ,
        aktion,
        datum
      });
      if (refresh) {
        await fetchFahrten();
        await fetchMonthlyData();
      }
      if (!silent) toast.success('Abrechnungsstatus wurde aktualisiert.');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Abrechnungsstatus:', error);
      if (!silent) {
        // Backend-Meldung durchreichen (z. B. „muss erst eingereicht werden")
        toast.error(error.response?.data?.message || 'Status konnte nicht aktualisiert werden.');
      }
      throw error;
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
      const [bisYear, bisMonth] = selectedMonth.split('-');

      let response;
      if (selectedVonMonth && selectedVonMonth !== selectedMonth) {
        // Zeitraum-Modus: Von != Bis und Von != '---'
        const [vonYear, vonMonth] = selectedVonMonth.split('-');
        response = await axios.get(`${API_BASE_URL}/fahrten/report-range/${vonYear}/${vonMonth}/${bisYear}/${bisMonth}`);
      } else {
        // Einzelmonat-Modus: Von = '---' oder Von = Bis
        response = await axios.get(`${API_BASE_URL}/fahrten/report/${bisYear}/${bisMonth}`);
      }

      setFahrten(response.data.fahrten.map(fahrt => ({
        ...fahrt,
        mitfahrer: fahrt.mitfahrer || []
      })));
      setSummary(response.data.summary);
    } catch (error) {
      console.error('Fehler beim Abrufen der Fahrten:', error);
      setFahrten([]);
      setSummary({});
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

  const handleAbrechnungsStatus = async (jahr, monat, traegerId, aktion, datum, singleMonth = false) => {
    try {
      // Bei aktiver Range UND nicht singleMonth: Status für jeden Monat im Zeitraum setzen
      if (!singleMonth && selectedVonMonth && selectedVonMonth !== selectedMonth) {
        const [vonYear, vonMonth] = selectedVonMonth.split('-');
        const [bisYear, bisMonth] = selectedMonth.split('-');
        let current = new Date(parseInt(vonYear), parseInt(vonMonth) - 1);
        const end = new Date(parseInt(bisYear), parseInt(bisMonth) - 1);
        while (current <= end) {
          const y = current.getFullYear().toString();
          const m = (current.getMonth() + 1).toString().padStart(2, '0');
          await updateAbrechnungsStatus(y, m, traegerId, aktion, datum, true);
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        await updateAbrechnungsStatus(jahr, monat, traegerId, aktion, datum, true);
      }
      await fetchMonthlyData();
      await fetchFahrten();
      // Aussagekräftige Meldung je Aktion (statt „wurde aktualisiert")
      const meldung = {
        eingereicht: 'Als eingereicht markiert.',
        erhalten: 'Als erstattet markiert.',
        reset: 'Status zurückgesetzt — wieder „Erfasst".',
      }[aktion] || 'Abrechnungsstatus wurde aktualisiert.';
      toast.success(meldung);
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Status:', error);
      toast.error(error.response?.data?.message || 'Status konnte nicht aktualisiert werden.');
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
          totalErstattung: response.data.summary.gesamtErstattung || 0,
          totalKm: (response.data.fahrten || []).reduce((sum, f) => sum + (parseFloat(f.kilometer) || 0), 0),
          // km je Abrechnungsträger (für die Trägerzeilen der Abrechnung)
          kmProTraeger: (response.data.fahrten || []).reduce((acc, f) => {
            if (f.abrechnung != null) {
              const key = f.abrechnung.toString();
              acc[key] = (acc[key] || 0) + (parseFloat(f.kilometer) || 0);
            }
            return acc;
          }, {}),
          fahrtenCount: (response.data.fahrten || []).length
        };
      })
      // Nur Monate mit Fahrten oder Erstattungen behalten
      .filter(month => {
        const hasErstattungen = Object.values(month.erstattungen).some(betrag => betrag > 0);
        return hasErstattungen || month.fahrtenCount > 0;
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
      updateAbrechnungsStatus,
      // Kein Bestätigungs-Modal mehr aktiv — konstante Rückgabe für
      // Bestandskonsumenten (Modal.js)
      hasActiveNotification: false,
      showNotification,
      setFahrten,
      refreshAllData,
      abrechnungsStatusModal,
      setAbrechnungsStatusModal,
      handleAbrechnungsStatus,
      abrechnungstraeger,
      setAbrechnungstraeger,
      selectedVonMonth,
      setSelectedVonMonth,
      favoriten,
      fetchFavoriten,
      addFavorit,
      deleteFavorit,
      executeFavorit
    }}>
    {children}
    {/* Einziger Mount des Status-Datums-Dialogs (Nachfolger des
        AbrechnungsStatusModal) — jede Aktion läuft singleMonth-korrekt */}
    <StatusDatumSheet
    isOpen={abrechnungsStatusModal.open && abrechnungsStatusModal.aktion !== 'reset'}
    onClose={() => setAbrechnungsStatusModal({})}
    onSubmit={(date) => handleAbrechnungsStatus(
      abrechnungsStatusModal.jahr,
      abrechnungsStatusModal.monat,
      abrechnungsStatusModal.traegerId,
      abrechnungsStatusModal.aktion,
      date,
      abrechnungsStatusModal.singleMonth || false
    )}
    traegerId={abrechnungsStatusModal.traegerId}
    aktion={abrechnungsStatusModal.aktion}
    monat={abrechnungsStatusModal.monat}
    jahr={abrechnungsStatusModal.jahr}
    abrechnungstraeger={abrechnungstraeger}
    />
    </AppContext.Provider>
  );
}

export default AppProvider;
