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

module.exports = { getErstattungssatzFuerTraeger, FALLBACK_SATZ };
