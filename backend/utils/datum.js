// Datumshelfer, die die LOKALE Zeit verwenden.
//
// `new Date().toISOString()` rechnet nach UTC. In deutscher Sommerzeit liefert
// das zwischen Mitternacht und 2 Uhr noch den Vortag — ein nachts gesetzter
// Erstattungssatz oder Einreichungsvermerk bekäme also das falsche Datum.

/** Heutiges Datum als `YYYY-MM-DD` (lokal). */
function heuteISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

module.exports = { heuteISO };
