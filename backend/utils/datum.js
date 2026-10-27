// Datumshelfer in lokaler Zeit, toISOString() liefert nachts noch den Vortag.

/** Heutiges Datum als `YYYY-MM-DD` (lokal). */
function heuteISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

module.exports = { heuteISO };
