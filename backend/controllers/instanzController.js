const { instanzenSchema } = require('../schemas/instanzSchemas');

// Öffentliches Instanz-Verzeichnis für die Apps, aus der Umgebung und bewusst ohne Datenbank.

// Rückfall ohne INSTANZEN, weil bestehende Installationen die Variable nicht setzen.
const STANDARD_INSTANZEN = [
  {
    id: 'dithmarschen',
    name: 'Kirchenkreis Dithmarschen',
    apiUrl: 'https://kkd-fahrtenbuch.de',
  },
];

// Einmal beim Start, damit eine kaputte Variable gleich im Log steht.
let instanzenCache = null;

function ladeInstanzen() {
  const roh = process.env.INSTANZEN;

  if (!roh || roh.trim() === '') {
    return STANDARD_INSTANZEN;
  }

  let geparst;
  try {
    geparst = JSON.parse(roh);
  } catch (error) {
    console.error('INSTANZEN ist kein gueltiges JSON, nutze Standardliste:', error.message);
    return STANDARD_INSTANZEN;
  }

  const ergebnis = instanzenSchema.safeParse(geparst);
  if (!ergebnis.success) {
    const issues = ergebnis.error.issues || ergebnis.error.errors || [];
    console.error(
      'INSTANZEN ist inhaltlich ungueltig, nutze Standardliste:',
      issues.map((e) => `${Array.isArray(e.path) ? e.path.join('.') : e.path}: ${e.message}`).join('; ')
    );
    return STANDARD_INSTANZEN;
  }

  // Doppelte IDs waeren in der App nicht unterscheidbar
  const ids = new Set();
  const doppelte = ergebnis.data.filter((instanz) => {
    if (ids.has(instanz.id)) return true;
    ids.add(instanz.id);
    return false;
  });
  if (doppelte.length > 0) {
    console.error('INSTANZEN enthaelt doppelte IDs, nutze Standardliste:', doppelte.map((i) => i.id).join(', '));
    return STANDARD_INSTANZEN;
  }

  return ergebnis.data;
}

function getInstanzen() {
  if (instanzenCache === null) {
    instanzenCache = ladeInstanzen();
  }
  return instanzenCache;
}

exports.getAllInstanzen = async (req, res) => {
  try {
    // Nur die drei öffentlichen Felder, auch wenn das Schema strict ist.
    const instanzen = getInstanzen().map(({ id, name, apiUrl }) => ({ id, name, apiUrl }));

    // Kurzer öffentlicher Cache, nichts Nutzerbezogenes.
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ instanzen });
  } catch (error) {
    console.error('Fehler beim Abrufen der Instanzen:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Instanzen' });
  }
};

// Nur fuer Tests / Neuladen nach Konfigurationswechsel
exports.getInstanzen = getInstanzen;
exports.STANDARD_INSTANZEN = STANDARD_INSTANZEN;
