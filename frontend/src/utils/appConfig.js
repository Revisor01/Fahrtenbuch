// Laufzeit-Konfiguration aus public/config.js (window.appConfig).
// Die Datei enthält DEFAULT_*-Platzhalter, die nur ersetzt werden, wenn ein
// Deployment sie per Entrypoint austauscht — unersetzte Platzhalter zählen als "nicht gesetzt".

// Werte, die die App beim Start vom gewaehlten Server geholt hat (/api/konfig).
//
// Die App laeuft von einem lokalen Bundle: dort schreibt kein Entrypoint die
// config.js, es blieben also die Platzhalter stehen und zum Beispiel die
// Schaltflaeche zum Registrieren fehlte. Im Web bleibt dieses Objekt leer,
// weil dort niemand setServerKonfig aufruft — die Quelle bleibt config.js.
let serverKonfig = null;

export function setServerKonfig(werte) {
  serverKonfig = werte && typeof werte === 'object' ? werte : null;
}

export function appConfigValue(key, envValue, fallback = undefined) {
  // Vorrang fuer die Server-Antwort: sie kommt aus der Umgebung der Instanz und
  // ist damit aktueller als alles, was im Bundle liegt.
  const vomServer = serverKonfig?.[key];
  if (vomServer !== undefined && vomServer !== null && vomServer !== '') return vomServer;

  const raw = window.appConfig?.[key];
  if (raw && !String(raw).startsWith('DEFAULT_')) return raw;
  if (envValue !== undefined && envValue !== null && envValue !== '') return envValue;
  return fallback;
}
