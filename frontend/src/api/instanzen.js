// Instanz-Verzeichnis fuer die native App.
//
// Bootstrap-Problem: Solange keine Instanz gewaehlt ist, hat die App keine
// API-Basis — sie kann die Liste also nicht ueber den normalen axios-Client
// holen. Die Adresse des Verzeichnisses muss deshalb fest im Bundle stehen.
// Sie ist ueber VITE_INSTANZ_VERZEICHNIS beim Bauen setzbar (siehe README),
// damit ein anderer Traeger sein eigenes Verzeichnis hinterlegen kann.
//
// Eigene Subdomain mit statischer Datei, kein Backend (seit 18.08.2026): Bis
// dahin zeigte die Adresse auf kkd-fahrtenbuch.de, also auf die Instanz eines
// einzelnen Kirchenkreises. War dessen Backend aus, fand die App gar keinen
// Kirchenkreis mehr — auch nicht die anderen. Fuer eine Liste von 110 Byte
// muss keine Anwendung laufen.
//
// Ein spaeterer Wechsel dieser Adresse braucht ein App-Update, weil sie im
// Bundle liegt. Deshalb bewusst neutral gewaehlt und nicht an eine Instanz
// gebunden.
const VERZEICHNIS_URL = (
  import.meta.env.VITE_INSTANZ_VERZEICHNIS || 'https://verzeichnis.kkd-fahrtenbuch.de'
).replace(/\/+$/, '');

// Notfall-Liste, falls das Verzeichnis nicht erreichbar ist (kein Netz beim
// ersten Start, Wartung, DNS). Ohne sie waere die App in genau der Situation
// tot, in der Nutzende sie zum ersten Mal oeffnen.
export const FALLBACK_INSTANZEN = [
  {
    id: 'dithmarschen',
    name: 'Kirchenkreis Dithmarschen',
    apiUrl: 'https://kkd-fahrtenbuch.de',
  },
];

// Nur die drei Felder uebernehmen, die das Verzeichnis zusagt — und apiUrl
// auf http(s) begrenzen: Die Antwort kommt aus dem Netz und landet direkt in
// axios.defaults.baseURL, ein anderes Schema hat dort nichts zu suchen.
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

// Liefert immer eine nutzbare Liste. `quelle` sagt dem Aufrufer, ob die Liste
// frisch vom Verzeichnis kam oder aus dem Bundle stammt — die Auswahl blendet
// im Fallback einen Hinweis ein.
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
    console.error('Instanz-Verzeichnis nicht erreichbar, nutze Fallback-Liste:', error);
    return { instanzen: FALLBACK_INSTANZEN, quelle: 'fallback' };
  }
}
