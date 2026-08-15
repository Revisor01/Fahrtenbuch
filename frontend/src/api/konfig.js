import { apiUrl } from './client';
import { setServerKonfig } from '../utils/appConfig';

// Holt die oeffentliche Konfiguration der gewaehlten Instanz (/api/konfig).
//
// Gebraucht wird das nur in der App: Im Web schreibt der Container-Entrypoint
// dieselben Werte in config.js, dort bleibt diese Datei ungenutzt.

// Ein haengender Aufruf darf die Anmeldung nicht blockieren — dieselbe
// Ueberlegung wie beim sicheren Speicher (utils/tokenSpeicher.js): Ein Fehler
// laesst sich fangen, ein Aufruf ohne Antwort nicht. Lieber mit den bisherigen
// Werten weiter als eine App, die auf dem Startbildschirm stehen bleibt.
const KONFIG_TIMEOUT_MS = 4000;

// Die Werte muessen exakt so aussehen wie die aus config.js, weil sie an
// denselben Stellen ausgewertet werden: dort steht 'true' als Zeichenkette.
// Ein boolesches true vom Server wuerde am Vergleich vorbeilaufen und die
// Registrierung stumm ausblenden.
function normalisiere(daten) {
  const werte = {};
  if (typeof daten.appTitle === 'string') werte.appTitle = daten.appTitle;
  if (daten.allowRegistration !== undefined) {
    werte.allowRegistration = daten.allowRegistration === true || daten.allowRegistration === 'true' ? 'true' : 'false';
  }
  if (typeof daten.allowedEmailDomains === 'string') {
    werte.allowedEmailDomains = daten.allowedEmailDomains;
  }
  // Hier bleibt der boolesche Wert: die Auswertung kennt beide Formen, und
  // 'false' als Zeichenkette waere wahr.
  if (daten.registrationCodeRequired !== undefined) {
    werte.registrationCodeRequired =
      daten.registrationCodeRequired === true || daten.registrationCodeRequired === 'true';
  }
  return werte;
}

// Bewusst fetch statt axios: Der Aufruf laeuft vor der Anmeldung und ohne die
// Interceptoren des angemeldeten Clients. Der AbortController deckt auch den
// Fall ab, dass der Server annimmt, aber nie antwortet — AbortSignal.timeout
// waere kuerzer, kennen aeltere WebViews aber nicht.
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
    // Aeltere Backends kennen /api/konfig nicht, und ohne Netz kommt gar nichts:
    // beides ist kein Grund zum Abbruch — dann gelten die Werte aus dem Bundle.
    console.error('Konfiguration der Instanz nicht abrufbar:', error);
    return null;
  } finally {
    clearTimeout(wecker);
  }
}
