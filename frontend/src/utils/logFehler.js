// Fehler protokollieren, ohne Zugangsdaten mitzuschreiben.
//
// `console.error('…', error)` mit einem AxiosError schreibt das ganze Objekt
// ins Log — darin stecken `config.headers.Authorization` (das Bearer-Token)
// und `config.data` (bei der Anmeldung Benutzername und Passwort im
// Klartext). Im Browser bleibt das in der Entwicklerkonsole; in der App
// landet es im Gerätelog, das sich über Console.app oder `adb logcat` von
// außen mitlesen lässt.
//
// Hier bleibt nur, was beim Suchen eines Fehlers wirklich hilft: Statuscode,
// Pfad, Methode und die Meldung.
export default function logFehler(kontext, error) {
  // Kein Axios-Fehler (TypeError, eigener throw): unverändert durchreichen,
  // da steckt nichts Vertrauliches drin und der Stapel ist wertvoll.
  if (!error?.isAxiosError && !error?.config) {
    console.error(kontext, error);
    return;
  }

  console.error(kontext, {
    status: error.response?.status ?? null,
    url: error.config?.url ?? null,
    methode: error.config?.method ?? null,
    // Die Meldung des Servers, nicht die des Fehlerobjekts: Sie ist für uns
    // gedacht und enthält keine Anmeldedaten.
    meldung: error.response?.data?.message ?? error.message ?? null,
    code: error.code ?? null,
  });
}
