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

// Header, ueber den der Server ein erneuertes Token zurueckgibt. Axios
// normalisiert Header-Namen auf Kleinbuchstaben.
const ERNEUERUNGS_HEADER = 'x-token-erneuert';

export const AppContext = createContext();

function AppProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Merkt, dass das Laden der Fahrten fehlgeschlagen ist. Ohne diese
  // Unterscheidung sah ein Netzfehler wie „keine Fahrten in diesem Monat"
  // aus — der gefaehrlichste Fall in dieser App, weil die Nutzer:in die
  // Fahrten dann ein zweites Mal erfasst und doppelt abrechnet.
  const [fahrtenFehler, setFahrtenFehler] = useState(null);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  // Solange die gespeicherte Anmeldung noch nicht gelesen ist, darf die App
  // nichts entscheiden: der sichere Speicher der App antwortet nur asynchron,
  // und ohne diesen Zustand blitzte beim Start kurz die Anmeldung auf, obwohl
  // der Nutzer angemeldet ist.
  const [anmeldungGeladen, setAnmeldungGeladen] = useState(false);
  const [orte, setOrte] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [distanzen, setDistanzen] = useState([]);
  const [fahrten, setFahrten] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(aktuellerMonat());
  const [selectedVonMonth, setSelectedVonMonth] = useState(''); // '' = Einzelmonat-Modus
  // gesamtKirchenkreis/gesamtGemeinde entfernt: die Setter wurden nie
  // aufgerufen, die Werte blieben immer 0 und niemand las sie aus.
  const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
  const [summary, setSummary] = useState({});
  const isLoggingOut = useRef(false);
  // Laufende Nummer je Fahrten-Abruf. Der sitzungsZaehler daneben steigt nur
  // bei An- und Abmeldung und hilft hier nicht: Wer schnell zwischen Monaten
  // wechselt, loest zwei Abrufe derselben Sitzung aus. Antwortete der aeltere
  // spaeter, standen die Fahrten von Monat A unter der Ueberschrift von
  // Monat B — in einer Abrechnungs-App die falscheste Zahl an der
  // sichtbarsten Stelle.
  const fahrtenAbrufNr = useRef(0);
  // Zaehlt jede Abmeldung mit. Eine Antwort auf /users/me, die erst nach dem
  // Abmelden eintrifft, darf die geloeschten Nutzerdaten nicht zurueckschreiben
  // — beim Kirchenkreis-Wechsel waeren das sogar die Daten des alten Servers.
  const sitzungsZaehler = useRef(0);

  // Wurde seit dem Start dieser Anfrage abgemeldet oder der Kirchenkreis
  // gewechselt? Dann darf ihre Antwort nichts mehr setzen.
  //
  // Bisher prueften das nur die Nutzerdaten. Alle anderen Abrufe schrieben
  // blind — und behielten dabei Basis-URL und Header von A, weil axios die
  // Vorgaben beim Aufruf mischt, nicht beim Versand. Wer bei A eine Fahrt
  // anlegt (rund 30 Anfragen), sofort wechselt und sich bei B anmeldet, sah
  // danach A's Daten unter B's Anmeldung, bis zum naechsten Nachladen. Auf
  // Mobilfunk ist das kein Randfall.
  const sitzungVorbei = (sitzung) => sitzung !== sitzungsZaehler.current;
  const toast = useToast();

  const [favoriten, setFavoriten] = useState([]);
  // Gespeicherte Anlaesse (Stammdaten wie Orte/Traeger). Leer, solange die
  // Instanz den Endpunkt noch nicht kennt — Freitext bleibt davon unberuehrt.
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

  // Legt einen Anlass an und gibt ihn zurueck. Der POST ist idempotent — ein
  // bekannter Name liefert den vorhandenen Eintrag. Fehler werden nach oben
  // gereicht, damit der Aufrufer seine optimistische Anzeige zuruecknehmen kann.
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

      // fetchFahrten/fetchOrte/fetchDistanzen setzen ihren State selbst und
      // liefern nichts zurueck — die Zuweisungen hier greifen nur, wenn eine
      // Funktion tatsaechlich Daten liefert (aktuell fetchMonthlyData).
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

  const fetchCurrentUser = async () => {
    const sitzung = sitzungsZaehler.current;
    try {
      const response = await axios.get('/api/users/me');
      // Zwischenzeitlich abgemeldet: Antwort verwerfen, sonst kaeme der
      // abgemeldete Nutzer ueber diesen Weg wieder in den Speicher zurueck.
      if (sitzung !== sitzungsZaehler.current) return;
      const userData = response.data;
      setUser(userData);
      // Ohne await, aus demselben Grund wie beim Token: Das Merken fuer den
      // naechsten Start darf die laufende Anmeldung nicht aufhalten.
      schreibeWert(SCHLUESSEL_USER, JSON.stringify(userData));
    } catch (error) {
      logFehler('Error fetching user data:', error);
      // Nur abmelden, wenn die Sitzung noch dieselbe ist — sonst wuerde ein
      // spaeter eintreffender Fehler eine frisch begonnene Sitzung beenden.
      if (sitzung === sitzungsZaehler.current) logout();
    }
  };

  // Gespeicherte Anmeldung einmalig beim Start einlesen. Erst danach steht
  // fest, ob der Nutzer angemeldet ist — bis dahin rendert die App einen
  // Ladezustand statt der Anmeldemaske.
  useEffect(() => {
    // Notbremse: Antwortet der Systemspeicher gar nicht — etwa weil das
    // Geraet gesperrt ist oder das Plugin nicht laedt —, stuende die App
    // sonst dauerhaft im Ladezustand und man kaeme nie zur Anmeldung.
    // Lieber ohne gespeicherte Anmeldung weiter als gar nicht.
    // Sie darf erst greifen, wenn der Speicher seine eigenen Zeitgrenzen
    // ausgeschoepft hat (3 Zugriffe à 800ms = 2400ms), sonst feuert sie in
    // einen Start hinein, der gleich mit gueltigem Token zurueckkehrt: Die
    // Anmeldemaske erschien dann kurz und wurde sofort vom Dashboard
    // abgeloest — sichtbar als Blitzen (Simon 16.08.). Grosszuegiger Abstand
    // darauf; wer wirklich keinen Speicher hat, wartet lieber einen Moment
    // laenger als jemand angemeldetes die Maske zu sehen bekommt.
    let speicherHatGeantwortet = false;
    const notbremse = setTimeout(() => {
      // Nicht hineinfeuern, wenn der Speicher gerade zurueckkehrt: Sonst
      // stuende einen Moment „geladen, nicht angemeldet" — die Anmeldemaske
      // erschien kurz und wurde sofort vom Dashboard abgeloest.
      if (speicherHatGeantwortet) return;
      console.error('Anmeldedaten nicht rechtzeitig lesbar — weiter zur Anmeldung.');
      setAnmeldungGeladen(true);
    }, 4000);

    (async () => {
      try {
      // Vor dem ersten Lesen: Bestand aus localStorage in den sicheren
      // Speicher uebernehmen (nur nativ, im Web ein No-Op).
      await migriereAusLocalStorage();

      // Die Anmeldung nur uebernehmen, wenn sie zur aktuell gewaehlten
      // Instanz gehoert. Sonst wuerde das Token von Kirchenkreis A an Server
      // B gehen — siehe SCHLUESSEL_INSTANZ in utils/tokenSpeicher.js.
      const anmeldung = await leseAnmeldungFuer(getApiBaseUrl());
      if (anmeldung.verworfen) {
        console.warn('Gespeicherte Anmeldung gehoerte zu einem anderen Kirchenkreis und wurde verworfen.');
      }
      const gespeicherterToken = anmeldung.token;
      const gespeicherterUser = anmeldung.user ? JSON.stringify(anmeldung.user) : null;
      // Ab hier steht die Antwort fest — die Notbremse darf nicht mehr
      // dazwischenfunken.
      speicherHatGeantwortet = true;

      let userDaten = null;
      // Ein korrupter Eintrag darf den App-Start nicht verhindern: die
      // Exception aus JSON.parse fuehrte hier zur weissen Seite, und weil der
      // Wert liegen blieb, auch bei jedem weiteren Aufruf.
      try {
        userDaten = gespeicherterUser ? JSON.parse(gespeicherterUser) : null;
      } catch (error) {
        logFehler('Gespeicherte Nutzerdaten unlesbar, werden verworfen:', error);
        await loescheWert(SCHLUESSEL_USER);
      }

      // Kein vorzeitiges return bei `abgebrochen`: React ruft den Effekt im
      // Strict Mode zweimal auf und raeumt den ersten Durchlauf dazwischen ab.
      // Kehrte der erste hier zurueck, bliebe `anmeldungGeladen` in genau dem
      // Fall false, in dem der zweite Durchlauf noch laeuft — die App haenge
      // dann dauerhaft im Ladezustand. Im Web fiel das nie auf, weil
      // localStorage synchron antwortet; der Systemspeicher der App braucht
      // dagegen einen Moment und trifft dieses Zeitfenster.
      if (gespeicherterToken) {
        // Header und isLoggedIn hier direkt mitsetzen statt sie dem
        // token-Effekt zu ueberlassen: der laeuft erst einen Render spaeter,
        // und genau in diesem einen Render waere die Anmeldung schon "geladen",
        // der Nutzer aber noch "nicht angemeldet" — die Anmeldemaske blitzte
        // auf. Der token-Effekt bleibt fuer den Login-Weg zustaendig und setzt
        // hier nur denselben Wert noch einmal.
        axios.defaults.headers.common['Authorization'] = `Bearer ${gespeicherterToken}`;
        setToken(gespeicherterToken);
        setIsLoggedIn(true);
      }
      if (userDaten) setUser(userDaten);
      } catch (error) {
        // Ein Fehler beim Lesen darf nicht dazu fuehren, dass die App im
        // Ladezustand stehen bleibt. Ohne gespeicherte Anmeldung landet man
        // auf der Anmeldemaske — das ist der richtige Ausgang.
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
    // fetchCurrentUser/user bewusst nicht in den Abhaengigkeiten: der Effekt
    // soll nur auf einen Token-Wechsel reagieren, sonst laedt er sich im Kreis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Interceptor genau einmal registrieren und beim Unmount wieder entfernen.
  // Frueher lief das im token-Effekt: jeder Login stapelte einen weiteren
  // Interceptor auf den vorigen, ohne den alten je zu entfernen.
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (response) => {
        // Gleitende Sitzung: Der Server schickt bei Nutzung ein frisches
        // Token, sobald die halbe Laufzeit vorbei ist. Wer regelmaessig
        // arbeitet, muss sich damit nie neu anmelden.
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
    // refreshAllData wird bei jedem Render neu erzeugt - als Abhaengigkeit
    // wuerde es eine Endlosschleife ausloesen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token } = response.data;
      // Neue Sitzung: noch laufende Aufrufe der vorigen Anmeldung duerfen
      // weder ihre Nutzerdaten schreiben noch diese Anmeldung wieder beenden.
      sitzungsZaehler.current += 1;
      // Hier statt in logout(): siehe Begruendung dort.
      isLoggingOut.current = false;
      setToken(token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Ohne await: Das Speichern entscheidet nur darueber, ob die Anmeldung
      // den naechsten Start ueberdauert — fuer diese Sitzung ist der Token
      // bereits gesetzt. Wartete die Anmeldung darauf, bliebe sie bei einem
      // stockenden Systemspeicher haengen und der Knopf taete scheinbar nichts.
      schreibeWert(SCHLUESSEL_TOKEN, token);
      // Festhalten, zu welcher Instanz diese Anmeldung gehoert. Ohne die
      // Notiz wuerde sie beim naechsten Start als "fremd" verworfen — und
      // ohne die Pruefung ginge das Token bei einem Wechsel an den falschen
      // Server (siehe utils/tokenSpeicher.js).
      schreibeWert(SCHLUESSEL_INSTANZ, String(getApiBaseUrl() || ''));
      // Ohne await: Der Effekt auf `token` laedt die Nutzerdaten ohnehin.
      // Wurde hier zusaetzlich gewartet, lief die Anfrage doppelt und die
      // Anmeldung stand solange still — auf dem Geraet spuerbar als
      // sekundenlange Verzoegerung nach dem Antippen.
      fetchCurrentUser();
      setIsLoggedIn(true);
    } catch (error) {
      // Bewusst nur der Status: Ein AxiosError traegt error.config.data —
      // bei der Anmeldung also Benutzername UND Passwort im Klartext. In der
      // App landet console.error im Geraetelog (Console.app, adb logcat,
      // sysdiagnose), im Browser in der Konsole.
      console.error('Anmeldung fehlgeschlagen:', error.response?.status || error.code || 'Netzfehler');
      throw error;
    }
  };

  // Bleibt bewusst synchron in der Wirkung: der 401-Interceptor und der
  // Kirchenkreis-Wechsel rufen logout() ohne await auf, deshalb muss der State
  // sofort fallen. Das Loeschen im Speicher laeuft daneben — die App zeigt
  // schon die Anmeldung, waehrend der Systemspeicher aufraeumt.
  // grund: 'abgelaufen' fuer den erzwungenen Logout (Token abgelaufen oder
  // vom Server abgewiesen), sonst das bewusste Abmelden ueber den Knopf.
  const logout = ({ grund } = {}) => {
    sitzungsZaehler.current += 1;
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    // isLoggingOut wird hier BEWUSST nicht zurueckgesetzt, sondern erst beim
    // naechsten Login. logout() laeuft synchron durch; stuende die
    // Ruecksetzung hier, waere das Flag beim zweiten der ~35 parallelen
    // 401-Fehler schon wieder false und logout() liefe fuer jeden einzelnen
    // erneut. Ohne Meldung fiel das nicht auf (logout ist idempotent) — mit
    // der Meldung unten waeren es 35 Toasts uebereinander.
    // Ein offenes Erfassungs-Sheet oder Status-Fenster steht sonst nach dem
    // Zwangs-Logout ueber der Anmeldemaske: Beide werden von ihren Providern
    // gerendert, nicht von AppContent, und ueberleben dessen Wechsel.
    setAbrechnungsStatusModal({ open: false });
    // Der Header muss mit fallen, sonst schickt der naechste Request noch den
    // Token des abgemeldeten Kontos mit.
    delete axios.defaults.headers.common['Authorization'];

    // Alle geladenen Daten mit leeren. Bisher blieben sie stehen: Nach einem
    // Wechsel des Kirchenkreises zeigten Dashboard, Fahrtenliste und die
    // Erfassung so lange die Daten von A, bis B geantwortet hatte — und
    // dauerhaft, wenn B's Abruf scheiterte (die catch-Zweige setzen nichts
    // zurueck). Damit saehe man unter der Anmeldung von B die Fahrten,
    // Adressen und Traeger eines anderen Kirchenkreises.
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

    // Der erzwungene Logout kam bisher wortlos: Wer mitten im Formular sass,
    // stand ploetzlich vor der Anmeldung, ohne zu wissen warum.
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

      // Meldet der Endpunkt einen Fehler, fehlt fahrten/summary im Body —
      // ohne Absicherung warf .map einen TypeError
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
      // Auch den Fehler verwerfen, wenn ein neuerer Abruf laeuft: Sonst
      // leert der alte die Liste, die der neue gerade fuellt.
      if (sitzungVorbei(sitzung) || ueberholt()) return;
      setFahrten([]);
      setSummary({});
      // Bei 401 meldet der Interceptor bereits ab und zeigt seine eigene
      // Meldung — hier kaeme sonst ein zweiter Toast obendrauf.
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
          // refresh=false: Sonst laedt jeder Monat der Schleife Fahrten und
          // Monatsdaten neu — bei zwoelf Monaten 24 Abrufe, von denen 22
          // sofort veraltet sind. Aktualisiert wird einmal danach.
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
        // summary fehlt, wenn der Endpunkt einen Fehler meldet (etwa weil das
        // Konto nicht mehr existiert). Ohne Absicherung warf der Zugriff hier
        // einen TypeError und die ganze Oberflaeche blieb weiss.
        const summary = response?.data?.summary || {};
        return {
          yearMonth: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`,
          monthName: date.toLocaleString('default', { month: 'long' }),
          year: date.getFullYear(),
          monatNr: date.getMonth() + 1,
          erstattungen: summary.erstattungen || {},
          abrechnungsStatus: summary.abrechnungsStatus || {},
          totalErstattung: summary.gesamtErstattung || 0,
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

      if (sitzungVorbei(sitzung)) return [];
      setMonthlyData(data);
      return data;
    } catch (error) {
      logFehler('Fehler beim Abrufen der monatlichen Übersicht:', error);
      // Leere Liste statt des alten Standes: Komponenten iterieren darueber,
      // ein undefined liesse die Oberflaeche beim naechsten Rendern abstuerzen
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
