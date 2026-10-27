// Fehler loggen ohne Authorization-Header und Anmeldedaten, die im AxiosError stecken.
export default function logFehler(kontext, error) {
  // Kein Axios-Fehler: nichts Vertrauliches drin, Stapel behalten.
  if (!error?.isAxiosError && !error?.config) {
    console.error(kontext, error);
    return;
  }

  console.error(kontext, {
    status: error.response?.status ?? null,
    url: error.config?.url ?? null,
    methode: error.config?.method ?? null,
    // Die Server-Meldung enthält keine Anmeldedaten.
    meldung: error.response?.data?.message ?? error.message ?? null,
    code: error.code ?? null,
  });
}
