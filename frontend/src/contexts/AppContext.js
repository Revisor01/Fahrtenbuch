import React, { useState, useEffect, createContext, useRef } from 'react';
import fehlerText from '../utils/fehlerText';
import logFehler from '../utils/logFehler';
import axios from 'axios';
import { aktuellerMonat } from '../utils/datum';
import StatusDatumSheet from '../components/abrechnung/StatusDatumSheet';
import { useToast } from '../components/ui/Toast';
import { API_BASE_URL } from '../api/client';
import { ladeAnlaesse, legeAnlassAn } from '../api/anlaesse';
import {
  SCHLUESSEL_TOKEN,
  SCHLUESSEL_USER,
  SCHLUESSEL_INSTANZ,
  leseWert,
  schreibeWert,
  loescheWert,
  loescheAnmeldung,
  leseAnmeldungFuer,
  migriereAusLocalStorage
} from '../utils/tokenSpeicher';
import { getApiBaseUrl } from '../api/client';

// axios normalisiert Header-Namen auf Kleinbuchstaben.
const ERNEUERUNGS_HEADER = 'x-token-erneuert';

export const AppContext = createContext();

function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Ladefehler unterscheiden, sonst sieht ein Netzfehler wie ein leerer Monat aus und Fahrten werden doppelt erfasst.
  const [fahrtenFehler, setFahrtenFehler] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // Bis die Anmeldung gelesen ist, nichts entscheiden, sonst blitzt die Anmeldemaske.
  const [anmeldungGeladen, setAnmeldungGeladen] = useState(false);
  const [orte, setOrte] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [distanzen, setDistanzen] = useState([]);
  const [fahrten, setFahrten] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(aktuellerMonat());
  const [selectedVonMonth, setSelectedVonMonth] = useState(''); // '' = Einzelmonat-Modus
  const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
  const [summary, setSummary] = useState({});
  const isLoggingOut = useRef(false);
  // Nummer je Fahrten-Abruf, damit eine ältere Antwort nicht die Fahrten eines anderen Monats zeigt.
  const fahrtenAbrufNr = useRef(0);
  // Nach dem Abmelden darf eine späte /users/me-Antwort nichts zurückschreiben.
  const sitzungsZaehler = useRef(0);

  // Nach Abmeldung oder Kirchenkreiswechsel darf keine Antwort mehr etwas setzen.
  const sitzungVorbei = (sitzung) => sitzung !== sitzungsZaehler.current;
  const toast = useToast();

  const [favoriten, setFavoriten] = useState([]);
  // Leer, solange die Instanz den Endpunkt nicht kennt.
  const [anlaesse, setAnlaesse] = useState([]);

  const [abrechnungsStatusModal, setAbrechnungsStatusModal] = useState({
    open: false,
    traegerId: null,
    aktion: null,
    jahr: null,
    monat: null
  });

  const fetchFavoriten = async () => {
    const sitzung = sitzungsZaehler.current;
    try {
      const response = await axios.get(`${API_BASE_URL}/favoriten`);
      if (sitzungVorbei(sitzung)) return;
      setFavoriten(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      logFehler('Fehler beim Abrufen der Favoriten:', error);
      if (sitzungVorbei(sitzung)) return;
      setFavoriten([]);
    }
  };

  const addFavorit = async (data) => {
    try {
      await axios.post(`${API_BASE_URL}/favoriten`, data);
      await fetchFavoriten();
    } catch (error) {
      logFehler('Fehler beim Hinzufügen des Favoriten:', error);
      throw error;
    }
  };

  const deleteFavorit = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/favoriten/${id}`);
      await fetchFavoriten();
    } catch (error) {
      logFehler('Fehler beim Löschen des Favoriten:', error);
      throw error;
    }
  };

  const executeFavorit = async (id, mitRueckfahrt = false) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/favoriten/${id}/execute`, { mitRueckfahrt });
      await refreshAllData();
      return response.data;
    } catch (error) {
      logFehler('Fehler beim Ausführen des Favoriten:', error);
      throw error;
    }
  };

  const fetchAnlaesse = async () => {
    const sitzung = sitzungsZaehler.current;
    const daten = await ladeAnlaesse();
    if (sitzungVorbei(sitzung)) return [];
    setAnlaesse(daten);
    return daten;
  };

  // POST ist idempotent; Fehler gehen nach oben, damit der Aufrufer zurücknehmen kann.
  const addAnlass = async (name) => {
    const angelegt = await legeAnlassAn(name);
    await fetchAnlaesse();
    return angelegt;
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
      // Anlässe ebenso: fehlt der Endpunkt, bleibt die Liste leer
      fetchAnlaesse().catch(() => {});

      // Nur fetchMonthlyData liefert Daten zurück.
      if (Array.isArray(fahrtenRes)) setFahrten(fahrtenRes);
      if (Array.isArray(monthlyDataRes)) setMonthlyData(monthlyDataRes);
      if (Array.isArray(orteRes)) setOrte(orteRes);
      if (Array.isArray(distanzenRes)) setDistanzen(distanzenRes);
      if (abrechnungstraegerRes?.data) {
        setAbrechnungstraeger(
          Array.isArray(abrechnungstraegerRes.data.data)
            ? abrechnungstraegerRes.data.data
            : []
        );
      }

      // Führe den optionalen Callback mit den vollständigen Daten aus
      if (callback && typeof callback === 'function') {
        if (abrechnungstraegerFullRes?.data) {
          callback(abrechnungstraegerFullRes.data);
        }
      }
    } catch (error) {
      logFehler('Fehler beim Aktualisieren der Daten:', error);
    }
  };

  // Brücke für Bestandscode: Meldungen laufen als Toast.
  const showNotification = (title, message) => {
    if (title === 'Fehler') {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  const fetchCurrentUser = async () => {
    const sitzung = sitzungsZaehler.current;
    try {
      const response = await axios.get('/api/users/me');
      // Zwischenzeitlich abgemeldet: Antwort verwerfen.
      if (sitzung !== sitzungsZaehler.current) return;
      const userData = response.data;
      setUser(userData);
      // Ohne await, das Merken darf die Anmeldung nicht aufhalten.
      schreibeWert(SCHLUESSEL_USER, JSON.stringify(userData));
    } catch (error) {
      logFehler('Error fetching user data:', error);
      // Nur bei derselben Sitzung abmelden.
      if (sitzung === sitzungsZaehler.current) logout();
    }
  };

  // Gespeicherte Anmeldung einmal beim Start lesen.
  useEffect(() => {
    // Notbremse, falls der Systemspeicher nie antwortet; erst nach dessen eigenen Zeitgrenzen (3 × 800 ms), sonst blitzt die Anmeldemaske.
    let speicherHatGeantwortet = false;
    const notbremse = setTimeout(() => {
      // Nicht feuern, wenn der Speicher gerade zurückkehrt.
      if (speicherHatGeantwortet) return;
      console.error('Anmeldedaten nicht rechtzeitig lesbar — weiter zur Anmeldung.');
      setAnmeldungGeladen(true);
    }, 4000);

    (async () => {
      try {
      // localStorage-Bestand in den sicheren Speicher übernehmen, nur nativ.
      await migriereAusLocalStorage();

      // Nur eine Anmeldung der gewählten Instanz übernehmen (SCHLUESSEL_INSTANZ in utils/tokenSpeicher.js).
      const anmeldung = await leseAnmeldungFuer(getApiBaseUrl());
      if (anmeldung.verworfen) {
        console.warn('Gespeicherte Anmeldung gehoerte zu einem anderen Kirchenkreis und wurde verworfen.');
      }
      const gespeicherterToken = anmeldung.token;
      const gespeicherterUser = anmeldung.user ? JSON.stringify(anmeldung.user) : null;
      // Ab hier darf die Notbremse nicht mehr greifen.
      speicherHatGeantwortet = true;

      let userDaten = null;
      // Ein korrupter Eintrag darf den Start nicht verhindern.
      try {
        userDaten = gespeicherterUser ? JSON.parse(gespeicherterUser) : null;
      } catch (error) {
        logFehler('Gespeicherte Nutzerdaten unlesbar, werden verworfen:', error);
        await loescheWert(SCHLUESSEL_USER);
      }

      // Kein vorzeitiges return, sonst hängt die App im Strict Mode im Ladezustand.
      if (gespeicherterToken) {
        // Direkt mitsetzen, sonst blitzt einen Render lang die Anmeldemaske.
        axios.defaults.headers.common['Authorization'] = `Bearer ${gespeicherterToken}`;
        setToken(gespeicherterToken);
        setIsLoggedIn(true);
      }
      if (userDaten) setUser(userDaten);
      } catch (error) {
        // Ein Lesefehler führt zur Anmeldemaske, nicht zum Hängen.
        logFehler('Anmeldedaten konnten nicht gelesen werden:', error);
      } finally {
        clearTimeout(notbremse);
        setAnmeldungGeladen(true);
      }
    })();

    return () => clearTimeout(notbremse);
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLoggedIn(true);
      // User-Daten laden wenn noch nicht vorhanden
      if (!user) {
        fetchCurrentUser();
      }
    }
    // Nur auf Token-Wechsel reagieren, sonst lädt es sich im Kreis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Interceptor einmal registrieren, sonst stapelt jeder Login einen weiteren.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => {
        // Gleitende Sitzung: frisches Token aus dem Antwort-Header übernehmen.
        const erneuert = response.headers?.[ERNEUERUNGS_HEADER];
        if (erneuert) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${erneuert}`;
          setToken(erneuert);
          schreibeWert(SCHLUESSEL_TOKEN, erneuert);
          schreibeWert(SCHLUESSEL_INSTANZ, String(getApiBaseUrl() || ''));
        }
        return response;
      },
      (error) => {
        if (error.response && error.response.status === 401) {
          if (!isLoggingOut.current) {
            isLoggingOut.current = true;
            logout({ grund: 'abgelaufen' });
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      refreshAllData();
    }
    // refreshAllData ist bei jedem Render neu und löste eine Endlosschleife aus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token } = response.data;
      // Neue Sitzung, ältere Aufrufe dürfen nichts mehr schreiben.
      sitzungsZaehler.current += 1;
      // Hier statt in logout(): siehe Begruendung dort.
      isLoggingOut.current = false;
      setToken(token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Ohne await, sonst hinge die Anmeldung an einem stockenden Systemspeicher.
      schreibeWert(SCHLUESSEL_TOKEN, token);
      // Instanz zur Anmeldung merken, damit das Token nie an einen fremden Server geht.
      schreibeWert(SCHLUESSEL_INSTANZ, String(getApiBaseUrl() || ''));
      // Ohne await, der token-Effekt lädt die Nutzerdaten ohnehin.
      fetchCurrentUser();
      setIsLoggedIn(true);
    } catch (error) {
      // Nur der Status, error.config.data enthält Benutzername und Passwort.
      console.error('Anmeldung fehlgeschlagen:', error.response?.status || error.code || 'Netzfehler');
      throw error;
    }
  };

  // Wirkt synchron, weil 401-Interceptor und Kirchenkreiswechsel ohne await rufen; grund 'abgelaufen' für den erzwungenen Logout.
  const logout = ({ grund } = {}) => {
    sitzungsZaehler.current += 1;
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    // isLoggingOut erst beim nächsten Login zurücksetzen, sonst kämen 35 Toasts; offene Sheets der Provider schließen.
    setAbrechnungsStatusModal({ open: false });
    // Sonst schickt der nächste Request noch das alte Token.
    delete axios.defaults.headers.common['Authorization'];

    // Alle Daten leeren, sonst sieht man nach einem Wechsel die Daten des anderen Kirchenkreises.
    setOrte([]);
    setFahrten([]);
    setMonthlyData([]);
    setDistanzen([]);
    setAbrechnungstraeger([]);
    setSummary({});
    setFavoriten([]);
    setAnlaesse([]);

    loescheAnmeldung().catch((error) => {
      logFehler('Abmeldedaten konnten nicht entfernt werden:', error);
    });

    // Den erzwungenen Logout erklären.
    if (grund === 'abgelaufen') {
      toast.error('Die Sitzung ist abgelaufen. Bitte erneut anmelden.');
    }
  };

  const fetchOrte = async () => {
    const sitzung = sitzungsZaehler.current;
    try {
      const response = await axios.get(`${API_BASE_URL}/orte`);
      if (sitzungVorbei(sitzung)) return;
      setOrte(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      logFehler('Fehler beim Abrufen der Orte:', error);
    }
  };

  // silent: kein eigener Toast, refresh = false: der Aufrufer lädt am Ende selbst nach.
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
      logFehler('Fehler beim Aktualisieren des Abrechnungsstatus:', error);
      if (!silent) {
        // Backend-Meldung durchreichen (z. B. „muss erst eingereicht werden")
        toast.error(error.response?.data?.message || 'Status konnte nicht aktualisiert werden.');
      }
      throw error;
    }
  };

  const fetchDistanzen = async () => {
    const sitzung = sitzungsZaehler.current;
    try {
      const response = await axios.get(`${API_BASE_URL}/distanzen`);
      if (sitzungVorbei(sitzung)) return;
      setDistanzen(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      logFehler('Fehler beim Abrufen der Distanzen:', error);
      if (sitzungVorbei(sitzung)) return;
      setDistanzen([]);
    }
  };

  const fetchFahrten = async () => {
    const sitzung = sitzungsZaehler.current;
    const abruf = ++fahrtenAbrufNr.current;
    // Veraltet = inzwischen wurde ein neuerer Abruf gestartet.
    const ueberholt = () => abruf !== fahrtenAbrufNr.current;
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

      // Bei Fehlern fehlen fahrten/summary im Body.
      const geladeneFahrten = Array.isArray(response?.data?.fahrten)
        ? response.data.fahrten
        : [];
      if (sitzungVorbei(sitzung) || ueberholt()) return;
      setFahrten(geladeneFahrten.map(fahrt => ({
        ...fahrt,
        mitfahrer: fahrt.mitfahrer || []
      })));
      setSummary(response?.data?.summary || {});
      setFahrtenFehler(null);
    } catch (error) {
      logFehler('Fehler beim Abrufen der Fahrten:', error);
      // Auch Fehler verwerfen, wenn ein neuerer Abruf läuft.
      if (sitzungVorbei(sitzung) || ueberholt()) return;
      setFahrten([]);
      setSummary({});
      // Bei 401 meldet der Interceptor schon.
      if (error?.response?.status !== 401) {
        setFahrtenFehler(fehlerText(error, 'Die Fahrten konnten nicht geladen werden.'));
        toast.error(fehlerText(error, 'Die Fahrten konnten nicht geladen werden.'));
      }
    }
  };

  const addOrt = async (ort) => {
    try {
      await axios.post(`${API_BASE_URL}/orte`, ort);
      await fetchOrte();
    } catch (error) {
      logFehler('Fehler beim Hinzufügen des Ortes:', error);
      throw error;
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
        mitfahrer: fahrt.mitfahrer || [],
        // Gegenfahrt eines Hin-und-Rueck-Paares (nur bei „Rückfahrt hinzufügen")
        partnerFahrtId: fahrt.partnerFahrtId || null
      };

      const response = await axios.post(`${API_BASE_URL}/fahrten`, cleanedFahrt);
      if (response.status === 201) {
        await fetchFahrten();
        await refreshAllData(); // Hier hinzufügen
        return response.data;
      }
    } catch (error) {
      logFehler('Fehler beim Hinzufügen der Fahrt:', error);
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
      logFehler('Fehler beim Aktualisieren der Fahrt:', error);
      throw error;
    }
  };

  const addDistanz = async (distanz) => {
    try {
      await axios.post(`${API_BASE_URL}/distanzen`, distanz);
      await fetchDistanzen();
    } catch (error) {
      logFehler('Fehler beim Hinzufügen der Distanz:', error);
      throw error;
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
          // refresh=false in der Schleife, einmal danach aktualisiert.
          await updateAbrechnungsStatus(y, m, traegerId, aktion, datum, true, false);
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        await updateAbrechnungsStatus(jahr, monat, traegerId, aktion, datum, true, false);
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
      logFehler('Fehler beim Aktualisieren des Status:', error);
      toast.error(error.response?.data?.message || 'Status konnte nicht aktualisiert werden.');
    }
  };

  const fetchMonthlyData = async () => {
    const sitzung = sitzungsZaehler.current;
    try {
      // Ein Abruf über /api/fahrten/monthly-summary statt 28 Monatsberichte.
      const response = await axios.get(`${API_BASE_URL}/fahrten/monthly-summary`);
      if (sitzungVorbei(sitzung)) return [];

      const roh = Array.isArray(response?.data) ? response.data : [];
      const data = roh
        .map((eintrag) => {
          // yearMonth ist "2026-08" — daraus Jahr, Monatsnummer und Name.
          const [jahr, monat] = String(eintrag.yearMonth || '').split('-');
          const datum = new Date(Number(jahr), Number(monat) - 1, 1);
          return {
            yearMonth: eintrag.yearMonth,
            monthName: datum.toLocaleString('default', { month: 'long' }),
            year: Number(jahr),
            monatNr: Number(monat),
            // Die Sammel-Route liefert { kilometer, erstattung }, Dashboard und Abrechnung rechnen mit der Zahl.
            erstattungen: Object.fromEntries(
              Object.entries(eintrag.erstattungen || {})
                .map(([schluessel, wert]) => [
                  schluessel,
                  Number(wert?.erstattung ?? wert) || 0,
                ])
            ),
            // Ergänzt kmProTraeger, falls die Route es nicht liefert.
            kilometerJeTraeger: Object.fromEntries(
              Object.entries(eintrag.erstattungen || {})
                .map(([schluessel, wert]) => [
                  schluessel,
                  Number(wert?.kilometer ?? 0) || 0,
                ])
            ),
            abrechnungsStatus: eintrag.abrechnungsStatus || {},
            totalErstattung: eintrag.gesamtErstattung || 0,
            totalKm: eintrag.totalKm || 0,
            kmProTraeger: eintrag.kmProTraeger || {},
            fahrtenCount: eintrag.fahrtenCount || 0,
          };
        })
        // Nur Monate mit Fahrten oder Erstattungen behalten — wie bisher.
        .filter((month) => {
          const hatErstattungen = Object.values(month.erstattungen).some((betrag) => betrag > 0);
          return hatErstattungen || month.fahrtenCount > 0;
        })
        // Nach Datum sortieren (neueste zuerst)
        .sort((a, b) => new Date(b.year, b.monatNr - 1) - new Date(a.year, a.monatNr - 1));

      setMonthlyData(data);
      return data;
    } catch (error) {
      // 404 heißt noch keine Fahrten, kein Fehler.
      if (error?.response?.status === 404) {
        if (sitzungVorbei(sitzung)) return [];
        setMonthlyData([]);
        return [];
      }
      logFehler('Fehler beim Abrufen der monatlichen Übersicht:', error);
      // Leere Liste, ein undefined ließe die Oberfläche abstürzen.
      if (sitzungVorbei(sitzung)) return [];
      setMonthlyData([]);
      return [];
    }
  };

  const updateOrt = async (id, ort) => {
    try {
      await axios.put(`${API_BASE_URL}/orte/${id}`, ort);
      await fetchOrte();
    } catch (error) {
      logFehler('Fehler beim Aktualisieren des Ortes:', error);
      throw error;
    }
  };

  const updateDistanz = async (id, distanz) => {
    try {
      await axios.put(`${API_BASE_URL}/distanzen/${id}`, {
        vonOrtId: distanz.von_ort_id,
        nachOrtId: distanz.nach_ort_id,
        distanz: distanz.distanz
      });
      await fetchDistanzen();
    } catch (error) {
      logFehler('Fehler beim Aktualisieren der Distanz:', error);
      throw error;
    }
  };

  const deleteFahrt = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/fahrten/${id}`);
      await fetchFahrten();
      await refreshAllData(); // Hier hinzufügen
    } catch (error) {
      logFehler('Fehler beim Löschen der Fahrt:', error);
      throw error;
    }
  };

  const deleteOrt = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/orte/${id}`);
      await fetchOrte();
    } catch (error) {
      logFehler('Fehler beim Löschen des Ortes:', error);
      throw error;
    }
  };

  const deleteDistanz = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/distanzen/${id}`);
      await fetchDistanzen();
    } catch (error) {
      logFehler('Fehler beim Löschen der Distanz:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider value={{
      isLoggedIn,
      fahrtenFehler,
      fetchCurrentUser,
      anmeldungGeladen,
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
      // Konstante Rückgabe für Bestandscode (Modal.js).
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
      anlaesse,
      fetchAnlaesse,
      addAnlass,
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
