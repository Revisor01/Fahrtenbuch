// Verständliche Fehlermeldung aus einer fehlgeschlagenen Axios-Anfrage.
//
// Das Backend liefert bei erwartbaren Fällen eine erklärende Meldung mit
// (z. B. „Ort kann nicht gelöscht werden, da noch Distanzen gepflegt sind").
// Die ist für Nutzende wertvoller als ein generisches „hat nicht geklappt" —
// aber nur, wenn sie auch angezeigt wird.
export default function fehlerText(error, fallback = 'Das hat nicht geklappt.') {
  const daten = error?.response?.data;

  if (typeof daten?.message === 'string' && daten.message.trim()) {
    return daten.message;
  }

  // Zod-Validierungsfehler kommen als Liste
  if (Array.isArray(daten?.errors) && daten.errors.length > 0) {
    const erster = daten.errors[0];
    if (typeof erster === 'string') return erster;
    if (typeof erster?.message === 'string') return erster.message;
  }

  // Netzwerkfehler: keine Antwort erhalten
  if (error?.request && !error?.response) {
    return 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen.';
  }

  return fallback;
}
