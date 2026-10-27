// Anzeige der Status; die Datenbankwerte (offen, eingereicht, erhalten) bleiben.

export const STATUS_LABELS = {
  offen: 'Erfasst',
  eingereicht: 'Eingereicht',
  erhalten: 'Erstattet',
};

// Feste Reihenfolge der drei Stationen (u. a. für die Fortschrittsleiste)
export const STATUS_ORDER = ['offen', 'eingereicht', 'erhalten'];

// Feste Klassennamen, weil der CSS-Build nur wörtliche Namen sieht.
export const STATUS_KLASSEN = {
  offen: { badge: 'status-erfasst', dot: 'status-dot-offen' },
  eingereicht: { badge: 'status-eingereicht', dot: 'status-dot-eingereicht' },
  erhalten: { badge: 'status-erstattet', dot: 'status-dot-erhalten' },
};

export function statusKlassen(status) {
  return Object.prototype.hasOwnProperty.call(STATUS_KLASSEN, status) ? STATUS_KLASSEN[status] : STATUS_KLASSEN.offen;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// Status aus { eingereicht_am, erhalten_am } (beide optional).
export function statusFromAbrechnung(statusObj) {
  if (statusObj?.erhalten_am) return 'erhalten';
  if (statusObj?.eingereicht_am) return 'eingereicht';
  return 'offen';
}
