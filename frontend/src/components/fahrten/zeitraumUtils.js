// Gemeinsame Helfer der Fahrtenliste (Phase R5): Zeitraum-Monate,
// Kategorien mit Erstattung, Zahlformatierung.

// Alle Monats-Keys ("YYYY-MM") von `von` bis `bis` (inklusive).
export function monateImZeitraum(von, bis) {
  if (!von || !bis) return [];
  const [vonY, vonM] = von.split('-').map(Number);
  const [bisY, bisM] = bis.split('-').map(Number);
  const monate = [];
  let y = vonY;
  let m = vonM;
  while (y < bisY || (y === bisY && m <= bisM)) {
    monate.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return monate;
}

// Offene Monate eines Trägers im Zeitraum (weder eingereicht noch erstattet).
// traegerStatus = summary.abrechnungsStatus[traegerId] im Zeitraum-Modus:
// { "YYYY-MM": { eingereicht_am, erhalten_am } }
export function offeneMonateImZeitraum(traegerStatus, von, bis) {
  return monateImZeitraum(von, bis).filter((monthKey) => {
    const statusData = traegerStatus?.[monthKey];
    return !statusData?.eingereicht_am && !statusData?.erhalten_am;
  });
}

// Kategorien mit Erstattung > 0: sortierte Träger zuerst,
// Mitfahrer:innen am Ende. → [{ key, name, betrag }]
export function kategorienMitErstattung(summary, abrechnungstraeger) {
  const erstattungen = summary?.erstattungen || {};
  const kategorien = [];
  (abrechnungstraeger || []).forEach((traeger) => {
    const betrag = erstattungen[traeger.id];
    if (betrag > 0) {
      kategorien.push({ key: traeger.id.toString(), name: traeger.name, betrag });
    }
  });
  if (erstattungen.mitfahrer > 0) {
    kategorien.push({ key: 'mitfahrer', name: 'Mitfahrer:innen', betrag: erstattungen.mitfahrer });
  }
  return kategorien;
}

// Betrag deutsch formatiert („148,32")
export function formatBetrag(value) {
  return Number(value || 0).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Kaufmännisch auf ganze Kilometer runden (Bestandslogik der Liste)
export function rundeKilometer(value) {
  const numValue = Number(value ?? 0);
  return numValue % 1 < 0.5 ? Math.floor(numValue) : Math.ceil(numValue);
}
