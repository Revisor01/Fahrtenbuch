// Laufzeit-Konfiguration aus public/config.js; unersetzte DEFAULT_*-Platzhalter gelten als nicht gesetzt.

// In der App vom Server geholte Werte (/api/konfig), im Web leer.
let serverKonfig = null;

export function setServerKonfig(werte) {
  serverKonfig = werte && typeof werte === 'object' ? werte : null;
}

export function appConfigValue(key, envValue, fallback = undefined) {
  // Server-Antwort hat Vorrang vor dem Bundle.
  const vomServer = serverKonfig?.[key];
  if (vomServer !== undefined && vomServer !== null && vomServer !== '') return vomServer;

  const raw = window.appConfig?.[key];
  if (raw && !String(raw).startsWith('DEFAULT_')) return raw;
  if (envValue !== undefined && envValue !== null && envValue !== '') return envValue;
  return fallback;
}
