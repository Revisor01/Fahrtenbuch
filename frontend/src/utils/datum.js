// Datumshelfer, die die LOKALE Zeit verwenden.
//
// `new Date().toISOString()` rechnet nach UTC. In deutscher Sommerzeit liefert
// das zwischen Mitternacht und 2 Uhr noch den Vortag — eine spätabends erfasste
// Fahrt bekäme also ein falsches Datum, und am Monatsersten wäre kurzzeitig der
// Vormonat als „aktuell" ausgewählt.

/** Heutiges Datum als `YYYY-MM-DD` (lokal). */
export function heuteISO() {
  return alsISODatum(new Date());
}

/** Beliebiges Datum als `YYYY-MM-DD` (lokal). */
export function alsISODatum(datum) {
  const d = datum instanceof Date ? datum : new Date(datum);
  if (Number.isNaN(d.getTime())) return '';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Aktueller Monat als `YYYY-MM` (lokal). */
export function aktuellerMonat() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
