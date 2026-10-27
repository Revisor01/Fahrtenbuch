import { apiUrl } from './client';
import { setServerKonfig } from '../utils/appConfig';
import logFehler from '../utils/logFehler';

// Öffentliche Konfiguration der Instanz, nur in der App gebraucht.

// Ein hängender Aufruf darf die Anmeldung nicht blockieren.
const KONFIG_TIMEOUT_MS = 2500;

// Als Zeichenkette 'true' wie in config.js, sonst fällt die Registrierung still weg.
function normalisiere(daten) {
  const werte = {};
  if (typeof daten.appTitle === 'string') werte.appTitle = daten.appTitle;
  if (daten.allowRegistration !== undefined) {
    werte.allowRegistration = daten.allowRegistration === true || daten.allowRegistration === 'true' ? 'true' : 'false';
  }
  if (typeof daten.allowedEmailDomains === 'string') {
    werte.allowedEmailDomains = daten.allowedEmailDomains;
  }
  // Boolesch, weil 'false' als Zeichenkette wahr wäre.
  if (daten.registrationCodeRequired !== undefined) {
    werte.registrationCodeRequired =
      daten.registrationCodeRequired === true || daten.registrationCodeRequired === 'true';
  }
  return werte;
}

// fetch ohne die Interceptoren, mit AbortController, weil ältere WebViews AbortSignal.timeout nicht kennen.
export async function ladeServerKonfig() {
  const abbruch = new AbortController();
  const wecker = setTimeout(() => abbruch.abort(), KONFIG_TIMEOUT_MS);
  try {
    const antwort = await fetch(apiUrl('/api/konfig'), {
      headers: { Accept: 'application/json' },
      signal: abbruch.signal,
    });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);

    const daten = await antwort.json();
    if (!daten || typeof daten !== 'object') throw new Error('Antwort ohne Konfiguration');

    const werte = normalisiere(daten);
    setServerKonfig(werte);
    return werte;
  } catch (error) {
    // Ohne /api/konfig oder Netz gelten die Werte aus dem Bundle.
    logFehler('Konfiguration der Instanz nicht abrufbar:', error);
    return null;
  } finally {
    clearTimeout(wecker);
  }
}
