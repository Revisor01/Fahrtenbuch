const db = require('../config/database');

// Rückfall ohne Satz in der DB, damit kein Formular mit 0 € entsteht.
const FALLBACK_SATZ = 0.30;

/** Zum Stichtag gültiger Satz eines Trägers: neuester bis Stichtag, sonst ältester, sonst FALLBACK_SATZ. */
async function getErstattungssatzFuerTraeger(traegerId, userId, stichtag) {
  const [rows] = await db.execute(
    `SELECT eb.betrag, eb.gueltig_ab
     FROM erstattungsbetraege eb
     JOIN abrechnungstraeger at ON eb.abrechnungstraeger_id = at.id
     WHERE at.id = ? AND at.user_id = ?
     ORDER BY eb.gueltig_ab DESC`,
    [traegerId, userId]
  );

  if (rows.length === 0) {
    return FALLBACK_SATZ;
  }

  const stichtagDate = new Date(stichtag);
  let passenderSatz = rows.find(satz => new Date(satz.gueltig_ab) <= stichtagDate);

  if (!passenderSatz) {
    // Kein Satz gilt vor dem Stichtag → ältesten Satz nehmen
    passenderSatz = rows[rows.length - 1];
  }

  // DB liefert DECIMAL ggf. als String
  const betrag = parseFloat(passenderSatz.betrag);
  return Number.isFinite(betrag) ? betrag : FALLBACK_SATZ;
}

/** Alle Sätze eines Trägers absteigend nach Gültigkeit. */
async function ladeSaetzeFuerTraeger(traegerId, userId) {
  const [rows] = await db.execute(
    `SELECT eb.betrag, eb.gueltig_ab
     FROM erstattungsbetraege eb
     JOIN abrechnungstraeger at ON eb.abrechnungstraeger_id = at.id
     WHERE at.id = ? AND at.user_id = ?
     ORDER BY eb.gueltig_ab DESC`,
    [traegerId, userId]
  );
  return rows;
}

/** Satz an einem Fahrtdatum, gleiche Kette ohne erneute Abfrage. */
function satzAmDatum(saetze, datum) {
  if (!saetze || saetze.length === 0) return FALLBACK_SATZ;
  const d = new Date(datum);
  let treffer = saetze.find((s) => new Date(s.gueltig_ab) <= d);
  if (!treffer) treffer = saetze[saetze.length - 1];
  const betrag = parseFloat(treffer.betrag);
  return Number.isFinite(betrag) ? betrag : FALLBACK_SATZ;
}

/** Erstattung je Fahrt mit dem Satz ihres Datums; `gemischt`, wenn mehrere Sätze griffen. */
function berechneErstattung(fahrten, saetze) {
  let summe = 0;
  let kmGesamt = 0;
  const verwendet = new Set();

  for (const f of fahrten) {
    const km = typeof f.kilometer === 'number' ? f.kilometer : parseFloat(f.kilometer);
    if (!Number.isFinite(km)) continue;
    const satz = satzAmDatum(saetze, f.datum);
    verwendet.add(satz);
    summe += km * satz;
    kmGesamt += km;
  }

  const betrag = Math.round(summe * 100) / 100;
  const liste = [...verwendet].sort((a, b) => a - b);
  return {
    betrag,
    saetze: liste,
    gemischt: liste.length > 1,
    // Rechnerischer Mischsatz, damit die Formularzeile zum Betrag passt
    effektivSatz: kmGesamt > 0 ? betrag / kmGesamt : (liste[0] ?? FALLBACK_SATZ),
  };
}

// ── Gemeinsame Basis der Reports: je Fahrt Mitfahrer dieser Fahrt mal deren Kilometer ──

/** Alle Sätze eines Nutzers je Träger-ID und 'mitfahrer', absteigend. */
async function ladeErstattungssaetze(userId) {
  const [saetze] = await db.execute(`
    SELECT
      at.id,
      eb.betrag,
      eb.gueltig_ab
    FROM abrechnungstraeger at
    INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
    WHERE at.user_id = ?
      AND at.active = true
    UNION
    SELECT
      'mitfahrer' as id,
      betrag,
      gueltig_ab
    FROM mitfahrer_erstattung
    WHERE user_id = ?
    ORDER BY gueltig_ab DESC
  `, [userId, userId]);

  const proTraeger = {};
  saetze.forEach(satz => {
    if (!proTraeger[satz.id]) {
      proTraeger[satz.id] = [];
    }
    proTraeger[satz.id].push(satz);
  });
  return proTraeger;
}

/** Satz am Fahrtdatum, sonst ältester, ohne Satz 0, weil „kein Träger“ in Reports ein echter Nullfall ist. */
function findeSatz(saetzeProTraeger, id, datum) {
  const saetze = saetzeProTraeger[id];
  if (!saetze || saetze.length === 0) return 0;

  const passend = saetze.find(satz => new Date(satz.gueltig_ab) <= new Date(datum));
  const gewaehlt = passend || saetze[saetze.length - 1];
  // DB liefert DECIMAL als String — ohne Number() verkettet += statt zu addieren
  const betrag = parseFloat(gewaehlt?.betrag);
  return Number.isFinite(betrag) ? betrag : 0;
}

/** Erstattung der Fahrt selbst. */
function berechneFahrtErstattung(saetzeProTraeger, abrechnung, kilometer, datum) {
  const km = parseFloat(kilometer);
  if (!Number.isFinite(km)) return 0;
  return km * findeSatz(saetzeProTraeger, abrechnung, datum);
}

/** Mitfahrer-Erstattung einer einzelnen Fahrt. */
function berechneMitfahrerErstattung(saetzeProTraeger, anzahl, kilometer, datum) {
  if (!anzahl || anzahl <= 0) return 0;
  const km = parseFloat(kilometer);
  if (!Number.isFinite(km)) return 0;
  return anzahl * findeSatz(saetzeProTraeger, 'mitfahrer', datum) * km;
}

module.exports = {
  getErstattungssatzFuerTraeger,
  ladeSaetzeFuerTraeger,
  satzAmDatum,
  berechneErstattung,
  FALLBACK_SATZ,
  ladeErstattungssaetze,
  findeSatz,
  berechneFahrtErstattung,
  berechneMitfahrerErstattung,
};
