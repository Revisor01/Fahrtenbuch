// Zentrales Wording-Mapping des Statussystems (Redesign 2026).
// Die Datenbankwerte bleiben unverändert — nur die Anzeige ändert sich:
//   offen       → „Erfasst"
//   eingereicht → „Eingereicht"
//   erhalten    → „Erstattet"

export const STATUS_LABELS = {
  offen: 'Erfasst',
  eingereicht: 'Eingereicht',
  erhalten: 'Erstattet',
};

// Feste Reihenfolge der drei Stationen (u. a. für die Fortschrittsleiste)
export const STATUS_ORDER = ['offen', 'eingereicht', 'erhalten'];

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// Leitet den Status aus einem Abrechnungsstatus-Objekt der API ab
// ({ eingereicht_am, erhalten_am } — beide optional).
export function statusFromAbrechnung(statusObj) {
  if (statusObj?.erhalten_am) return 'erhalten';
  if (statusObj?.eingereicht_am) return 'eingereicht';
  return 'offen';
}
