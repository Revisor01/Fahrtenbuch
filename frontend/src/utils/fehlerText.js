// Verständliche Fehlermeldung aus einer Axios-Anfrage, bevorzugt die des Backends.
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

  // Zeitgrenze erreicht: Server erreichbar, aber zu langsam, kein Verbindungsproblem.
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'Der Server antwortet nicht. Bitte erneut versuchen.';
  }

  // Netzwerkfehler: keine Antwort erhalten
  if (error?.request && !error?.response) {
    return 'Keine Verbindung zum Server. Bitte Internetverbindung prüfen.';
  }

  return fallback;
}
