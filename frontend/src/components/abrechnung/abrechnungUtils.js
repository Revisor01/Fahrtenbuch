
import { aktuellerMonat } from '../../utils/datum';// Gemeinsame Helfer der Abrechnung (Phase R6): Kategorien eines Monats,
// Monatsstatus (Minimum der Trägerstatus), Fälligkeit, Formatierung.

import { STATUS_ORDER, statusFromAbrechnung } from '../../utils/statusLabels';

// Aktueller Monat als "YYYY-MM" (konsistent zur Fällig-Logik der Navigation)
export function aktuellerYearMonth() {
  return aktuellerMonat();
}

// Kategorien eines Monats mit Erstattung > 0: konfigurierte Träger in
// App-Reihenfolge, Mitfahrer:innen am Ende.
// → [{ key, name, betrag, km, statusData, status }]
export function monatKategorien(month, abrechnungstraeger) {
  const kategorien = [];
  (abrechnungstraeger || []).forEach((traeger) => {
    const betrag = Number(month.erstattungen?.[traeger.id] || 0);
    if (betrag > 0) {
      const statusData = month.abrechnungsStatus?.[traeger.id];
      kategorien.push({
        key: traeger.id.toString(),
        name: traeger.name,
        betrag,
        km: month.kmProTraeger?.[traeger.id.toString()] ?? null,
        statusData,
        status: statusFromAbrechnung(statusData),
      });
    }
  });
  const mitfahrerBetrag = Number(month.erstattungen?.mitfahrer || 0);
  if (mitfahrerBetrag > 0) {
    const statusData = month.abrechnungsStatus?.mitfahrer;
    kategorien.push({
      key: 'mitfahrer',
      name: 'Mitfahrer:innen',
      betrag: mitfahrerBetrag,
      km: null, // Mitfahrer-Erstattung hat keine eigene km-Summe
      statusData,
      status: statusFromAbrechnung(statusData),
    });
  }
  return kategorien;
}

// Monatsstatus = Minimum der Trägerstatus (Spec „Statussystem")
export function monatsStatus(kategorien) {
  if (!kategorien || kategorien.length === 0) return 'offen';
  return kategorien.reduce((min, k) => {
    return STATUS_ORDER.indexOf(k.status) < STATUS_ORDER.indexOf(min) ? k.status : min;
  }, 'erhalten');
}

// Fällig: Monat vor dem laufenden, mindestens ein Träger noch „Erfasst"
export function istFaellig(month, kategorien, currentYM) {
  if (!month.yearMonth || month.yearMonth >= currentYM) return false;
  return kategorien.some((k) => k.status === 'offen');
}

// Gesamtsumme des Monats (alle Kategorien, unabhängig vom Status)
export function monatSumme(kategorien) {
  return kategorien.reduce((sum, k) => sum + k.betrag, 0);
}

// „12.07." — Tag.Monat wie im Prototyp (Jahr trägt der Kontext)
export function formatDatumKurz(datum) {
  if (!datum) return '';
  return new Date(datum).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });
}

// „Juli 2026" aus einem Monats-Objekt
export function monatLabel(month) {
  return `${month.monthName} ${month.year}`;
}
