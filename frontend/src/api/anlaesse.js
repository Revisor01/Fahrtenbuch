import axios from 'axios';
import { API_BASE_URL } from './client';

// Gespeicherte Anlaesse (user-scoped Stammdaten). Die Endpunkte sind neu —
// solange eine Instanz sie noch nicht kennt, darf die Erfassung nicht
// stehenbleiben: dann bleibt die Liste leer und Anlaesse laufen wie bisher
// als Freitext.

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
    console.error('Fehler beim Abrufen der Anlässe:', error);
    return [];
  }
}

// POST ist idempotent: ein bereits vorhandener Name liefert den bestehenden
// Eintrag zurueck statt eines Fehlers.
export async function legeAnlassAn(name) {
  const response = await axios.post(`${API_BASE_URL}/anlaesse`, { name });
  return Array.isArray(response.data) ? response.data[0] : response.data?.data ?? response.data;
}
