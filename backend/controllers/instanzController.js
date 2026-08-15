const { instanzenSchema } = require('../schemas/instanzSchemas');

// Oeffentliches Instanz-Verzeichnis fuer die mobilen Apps.
//
// Die App kennt beim ersten Start noch keinen Server: Nutzende waehlen zuerst
// ihren Kirchenkreis und melden sich dann gegen dessen Instanz an. Damit dafuer
// keine neue Version noetig ist, sobald ein Kirchenkreis dazukommt, kommt die
// Liste aus der Umgebung statt aus dem App-Bundle.
//
// Bewusst KEINE Datenbank: Das Verzeichnis ist ohne Anmeldung erreichbar und
// darf deshalb nichts enthalten, was mit Personendaten zu tun hat.

// Fallback, solange INSTANZEN nicht gesetzt ist. Ohne ihn liefe die App bei
// jeder bestehenden Installation ins Leere, denn Dithmarschen laeuft heute
// ohne diese Variable.
const STANDARD_INSTANZEN = [
  {
    id: 'dithmarschen',
    name: 'Kirchenkreis Dithmarschen',
    apiUrl: 'https://kkd-fahrtenbuch.de',
  },
];

// Einmal beim Start aufloesen statt bei jedem Request: die Konfiguration
// aendert sich nur beim Neustart des Containers, und eine kaputte Variable
// soll in den Logs auftauchen und nicht erst beim ersten Aufruf.
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
    // Explizit nur die drei oeffentlichen Felder herausgeben — auch wenn das
    // Schema bereits strict ist. Doppelte Absicherung, weil diese Antwort
    // ohne Anmeldung aus dem ganzen Internet abrufbar ist.
    const instanzen = getInstanzen().map(({ id, name, apiUrl }) => ({ id, name, apiUrl }));

    // Die Liste aendert sich selten; ein kurzer Cache entlastet den Endpunkt
    // gegen wiederholte Abrufe. `public`, weil nichts Nutzerbezogenes drinsteht.
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
