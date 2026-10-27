import axios from 'axios';
import { API_BASE_URL } from './client';
import logFehler from '../utils/logFehler';

// Kennt eine Instanz die Endpunkte noch nicht, bleibt die Liste leer und Anlässe laufen als Freitext.

// Backend-Felder: id, name, sort_order, nutzung_anzahl
export async function ladeAnlaesse() {
  try {
    const response = await axios.get(`${API_BASE_URL}/anlaesse`);
    // Manche Endpunkte antworten mit { data: [...] } — beide Formen annehmen
    const daten = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.data)
        ? response.data.data
        : [];
    return daten;
  } catch (error) {
    logFehler('Fehler beim Abrufen der Anlässe:', error);
    return [];
  }
}

// POST ist idempotent.
export async function legeAnlassAn(name) {
  const response = await axios.post(`${API_BASE_URL}/anlaesse`, { name });
  return Array.isArray(response.data) ? response.data[0] : response.data?.data ?? response.data;
}
