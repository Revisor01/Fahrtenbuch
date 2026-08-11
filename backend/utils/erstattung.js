const db = require('../config/database');

// Fallback, falls für einen Träger gar kein Erstattungssatz in der DB existiert
// (bisheriges hartkodiertes Verhalten — kein Formular mit 0 € produzieren).
const FALLBACK_SATZ = 0.30;

/**
 * Ermittelt den zum Stichtag gültigen Erstattungssatz (€/km) eines Abrechnungsträgers.
 * Gleiche Fallback-Logik wie fahrtController.getMonthlyReport:
 * - neuester Satz mit gueltig_ab <= stichtag
 * - wenn keiner passt: der älteste vorhandene Satz
 * - wenn gar kein Satz existiert: FALLBACK_SATZ (0,30 €)
 *
 * @param {number|string} traegerId - ID des Abrechnungsträgers
 * @param {number} userId - User-ID (Ownership-Scoping)
 * @param {Date|string} stichtag - letzter Tag des Abrechnungszeitraums
 * @returns {Promise<number>} Erstattungssatz als Number
 */
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

/**
 * Lädt alle Erstattungssätze eines Trägers, absteigend nach Gültigkeitsdatum.
 * Für die Abrechnung pro Fahrtdatum (statt einem Satz für den ganzen Zeitraum).
 */
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

/**
 * Satz, der an einem bestimmten Fahrtdatum galt — gleiche Fallback-Kette wie
 * getErstattungssatzFuerTraeger, nur ohne erneute DB-Abfrage pro Fahrt.
 */
function satzAmDatum(saetze, datum) {
  if (!saetze || saetze.length === 0) return FALLBACK_SATZ;
  const d = new Date(datum);
  let treffer = saetze.find((s) => new Date(s.gueltig_ab) <= d);
  if (!treffer) treffer = saetze[saetze.length - 1];
  const betrag = parseFloat(treffer.betrag);
  return Number.isFinite(betrag) ? betrag : FALLBACK_SATZ;
}

/**
 * Erstattung über alle Fahrten, jede mit dem an ihrem Datum gültigen Satz.
 * Gibt zusätzlich zurück, ob im Zeitraum überhaupt mehrere Sätze griffen —
 * dann kann das Formular nicht mit einer einzigen "km x Satz"-Zeile auskommen.
 *
 * @returns {{betrag:number, saetze:number[], gemischt:boolean, effektivSatz:number}}
 */
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

// ---------------------------------------------------------------------------
// Gemeinsame Basis fuer die vier Report-Funktionen in fahrtController.
//
// Vorher rechnete jede von ihnen selbst, zwei davon falsch: Monats- und
// Jahresuebersicht multiplizierten die Mitfahrer-Anzahl eines ganzen Zeitraums
// mit dessen Kilometersumme. An echten Daten ergab das bis zum 40-fachen des
// richtigen Betrags (ein Nutzer, 2025-04: 29,20 € statt 0,70 €).
// Richtig ist immer: je Fahrt die Mitfahrer dieser Fahrt mal deren Kilometer.
//
// Anders als getErstattungssatzFuerTraeger (Export, ein Traeger je Aufruf)
// laedt ladeErstattungssaetze alle Saetze eines Nutzers auf einmal — inklusive
// des Mitfahrer-Satzes unter dem Schluessel 'mitfahrer'.
// ---------------------------------------------------------------------------

/**
 * Alle Erstattungssaetze eines Nutzers, gruppiert nach Traeger-ID.
 * Rueckgabe: { traegerId: [{ betrag, gueltig_ab }], mitfahrer: [...] },
 * je Gruppe absteigend nach gueltig_ab.
 */
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

/**
 * Der zum Fahrtdatum passende Satz: der juengste, der am Datum schon galt.
 * Fallback auf den aeltesten Satz, damit Fahrten vor dem ersten gueltig_ab
 * nicht mit 0 € erscheinen. Kein Satz vorhanden -> 0 (nicht FALLBACK_SATZ:
 * in den Reports ist "kein Traeger" ein echter Nullfall, kein fehlendes
 * Formular).
 */
function findeSatz(saetzeProTraeger, id, datum) {
  const saetze = saetzeProTraeger[id];
  if (!saetze || saetze.length === 0) return 0;

  const passend = saetze.find(satz => new Date(satz.gueltig_ab) <= new Date(datum));
  const gewaehlt = passend || saetze[saetze.length - 1];
  // DB liefert DECIMAL als String — ohne Number() verkettet += statt zu addieren
  const betrag = parseFloat(gewaehlt?.betrag);
  return Number.isFinite(betrag) ? betrag : 0;
}

/**
 * Erstattung der Fahrt selbst (Traegersatz mal Kilometer).
 */
function berechneFahrtErstattung(saetzeProTraeger, abrechnung, kilometer, datum) {
  const km = parseFloat(kilometer);
  if (!Number.isFinite(km)) return 0;
  return km * findeSatz(saetzeProTraeger, abrechnung, datum);
}

/**
 * Mitfahrer-Erstattung einer EINZELNEN Fahrt.
 * anzahl = Mitfahrer dieser Fahrt, kilometer = Kilometer dieser Fahrt.
 */
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
