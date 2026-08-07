// Laufzeit-Konfiguration aus public/config.js (window.appConfig).
// Die Datei enthält DEFAULT_*-Platzhalter, die nur ersetzt werden, wenn ein
// Deployment sie per Entrypoint austauscht — unersetzte Platzhalter zählen als "nicht gesetzt".
export function appConfigValue(key, envValue, fallback = undefined) {
  const raw = window.appConfig?.[key];
  if (raw && !String(raw).startsWith('DEFAULT_')) return raw;
  if (envValue !== undefined && envValue !== null && envValue !== '') return envValue;
  return fallback;
}
