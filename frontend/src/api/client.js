import axios from 'axios';
import { appConfigValue } from '../utils/appConfig';

// Basis-URL der Instanz, leer heißt gleicher Host; die App setzt die ihres Kirchenkreises.
const STORAGE_KEY = 'apiBaseUrl';

// Ohne Slash am Ende, der Prefix '/api' steht an den Aufrufstellen.
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

// Zeitgrenze für jede Anfrage, 20 s, weil PDF-Exporte länger brauchen können.
axios.defaults.timeout = 20000;

export function getApiBaseUrl() {
  return apiBaseUrl;
}

// `persistieren: false` setzt nur auf Probe.
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

// Absolute URL für Fälle außerhalb von axios.
export function apiUrl(pfad = '') {
  const rest = pfad.startsWith('/') ? pfad : `/${pfad}`;
  return `${apiBaseUrl}${rest}`;
}

// Relativ, damit er sich mit axios.defaults.baseURL kombiniert.
export const API_BASE_URL = '/api';
