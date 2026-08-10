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

module.exports = {
  getErstattungssatzFuerTraeger,
  ladeSaetzeFuerTraeger,
  satzAmDatum,
  berechneErstattung,
  FALLBACK_SATZ,
};
