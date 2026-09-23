import axios from 'axios';
import { appConfigValue } from '../utils/appConfig';

// Basis-URL der API-Instanz. Alle Aufrufe im Frontend nutzen relative Pfade
// ('/api/...'), die axios gegen diese Basis aufloest. Leer = gleicher Host wie
// das Frontend — genau das bisherige Verhalten der Web-App.
//
// Die App (Capacitor) laeuft dagegen von einem lokalen Bundle und hat keinen
// Backend-Host: sie muss die Instanz ihres Kirchenkreises hier setzen.
const STORAGE_KEY = 'apiBaseUrl';

// Der Prefix in '/api/...' bleibt an den Aufrufstellen stehen, deshalb darf die
// Basis keinen eigenen Pfad-Slash am Ende mitbringen.
function normalisiere(url) {
  if (!url) return '';
  return String(url).trim().replace(/\/+$/, '');
}

function ermittleStartwert() {
  // Reihenfolge: gemerkte Auswahl (App) vor Deployment-Vorgabe vor relativ.
  try {
    const gespeichert = normalisiere(localStorage.getItem(STORAGE_KEY));
    if (gespeichert) return gespeichert;
  } catch (error) {
    // Privater Modus / gesperrter Storage darf den App-Start nicht verhindern.
    console.error('API-Basis-URL nicht lesbar:', error);
  }
  return normalisiere(appConfigValue('apiBaseUrl', import.meta.env.VITE_API_BASE_URL, ''));
}

let apiBaseUrl = ermittleStartwert();
axios.defaults.baseURL = apiBaseUrl;

// Zeitgrenze fuer JEDE Anfrage. Ohne sie bleibt ein Request bei haengender
// Verbindung minutenlang offen: Das Erfassungs-Sheet steht auf „Speichert …",
// optimistisch angelegte Fahrten bleiben gesperrt in der Liste, und der
// Nutzer kann nur schliessen — und verliert die Eingabe.
//
// 20 s statt 15: Der PDF-Export braucht auf dem Server gemessene ~4,3 s, bei
// mehreren Traegern hintereinander mehr. Zu knapp gesetzt bricht die
// Zeitgrenze einen Export ab, der noch laeuft.
axios.defaults.timeout = 20000;

export function getApiBaseUrl() {
  return apiBaseUrl;
}

// Setzt die Instanz zur Laufzeit. `persistieren: false` erlaubt ein Setzen auf
// Probe (z. B. Erreichbarkeitspruefung vor der Uebernahme).
export function setApiBaseUrl(url, { persistieren = true } = {}) {
  apiBaseUrl = normalisiere(url);
  axios.defaults.baseURL = apiBaseUrl;

  if (persistieren) {
    try {
      if (apiBaseUrl) {
        localStorage.setItem(STORAGE_KEY, apiBaseUrl);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('API-Basis-URL konnte nicht gespeichert werden:', error);
    }
  }

  return apiBaseUrl;
}

// Absolute URL zu einem API-Pfad — fuer Faelle ausserhalb von axios
// (z. B. Downloads oder fetch).
export function apiUrl(pfad = '') {
  const rest = pfad.startsWith('/') ? pfad : `/${pfad}`;
  return `${apiBaseUrl}${rest}`;
}

// Der bisherige Pfad-Prefix. Bleibt relativ, damit er sich mit
// axios.defaults.baseURL kombiniert statt sie zu umgehen.
export const API_BASE_URL = '/api';
