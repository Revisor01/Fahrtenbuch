// Instanz-Verzeichnis der App; die Adresse steht im Bundle (VITE_INSTANZ_VERZEICHNIS), neutral gewählt, weil ein Wechsel ein App-Update braucht.
import logFehler from '../utils/logFehler';

const VERZEICHNIS_URL = (
  import.meta.env.VITE_INSTANZ_VERZEICHNIS || 'https://verzeichnis.kkd-fahrtenbuch.de'
).replace(/\/+$/, '');

// Notfall-Liste, sonst wäre die App beim ersten Start ohne Netz tot.
export const FALLBACK_INSTANZEN = [
  {
    id: 'dithmarschen',
    name: 'Kirchenkreis Dithmarschen',
    apiUrl: 'https://kkd-fahrtenbuch.de',
  },
];

// Nur die drei zugesagten Felder, apiUrl nur http(s), weil sie direkt in die baseURL geht.
function normalisiereInstanz(roh) {
  if (!roh || typeof roh !== 'object') return null;
  const { id, name, apiUrl } = roh;
  if (!id || !name || !apiUrl) return null;
  if (!/^https?:\/\//i.test(String(apiUrl))) return null;
  return {
    id: String(id),
    name: String(name),
    apiUrl: String(apiUrl).replace(/\/+$/, ''),
  };
}

// Immer eine nutzbare Liste; `quelle` sagt, ob sie aus dem Bundle kommt.
export async function ladeInstanzen({ signal } = {}) {
  try {
    const antwort = await fetch(`${VERZEICHNIS_URL}/api/instanzen`, {
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);

    const daten = await antwort.json();
    const liste = Array.isArray(daten?.instanzen) ? daten.instanzen : [];
    const gueltig = liste.map(normalisiereInstanz).filter(Boolean);
    if (gueltig.length === 0) throw new Error('Verzeichnis ohne gueltige Eintraege');

    return { instanzen: gueltig, quelle: 'verzeichnis' };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    logFehler('Instanz-Verzeichnis nicht erreichbar, nutze Fallback-Liste:', error);
    return { instanzen: FALLBACK_INSTANZEN, quelle: 'fallback' };
  }
}
