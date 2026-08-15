import { IST_NATIVE } from './plattform';

// Speicher fuer die Anmeldedaten (Token und Nutzerdaten).
//
// Im Browser bleibt es exakt bei localStorage — dasselbe Verhalten wie bisher,
// nur hinter einer async-Fassade. In der App liegen die Werte stattdessen im
// Systemspeicher (iOS Keychain / Android Keystore), wo sie verschluesselt sind
// und nicht mit dem WebView-Speicher geloescht oder ausgelesen werden koennen.
//
// Alle Funktionen sind async, weil der native Speicher nur asynchron
// erreichbar ist. Der Web-Pfad loest sofort auf und erzeugt daher keinen
// zusaetzlichen Frame Verzoegerung ueber ein Promise-Tick hinaus.

// Nur diese Schluessel gehoeren in den sicheren Speicher. Einstellungen wie die
// API-Basis-URL oder das Theme sind keine Geheimnisse und bleiben bewusst in
// localStorage — sie werden auch vor der Anmeldung gebraucht.
export const SCHLUESSEL_TOKEN = 'token';
export const SCHLUESSEL_USER = 'user';

// Das Plugin wird erst beim ersten nativen Zugriff geladen. Ein statischer
// Import wuerde @capacitor/core samt Plugin-Registry fest ins Web-Bundle
// ziehen, wo davon nichts gebraucht wird.
let sicherModulPromise = null;

async function ladeSicherenSpeicher() {
  if (!sicherModulPromise) {
    sicherModulPromise = import('@aparajita/capacitor-secure-storage').then(
      (modul) => modul.SecureStorage
    );
  }
  return sicherModulPromise;
}

// Bewusst getItem/setItem/removeItem statt get/set: diese Varianten arbeiten
// mit reinen Strings, waehrend get()/set() zusaetzlich JSON serialisieren.
// So bleibt der gespeicherte Wert Zeichen fuer Zeichen derselbe wie im Web.
async function leseNativ(schluessel) {
  const speicher = await ladeSicherenSpeicher();
  return speicher.getItem(schluessel);
}

async function schreibeNativ(schluessel, wert) {
  const speicher = await ladeSicherenSpeicher();
  await speicher.setItem(schluessel, wert);
}

async function loescheNativ(schluessel) {
  const speicher = await ladeSicherenSpeicher();
  await speicher.removeItem(schluessel);
}

// Ein gesperrter Storage (privater Modus, Storage-Quota) darf den App-Start
// nicht verhindern — ohne Wert landet der Nutzer auf der Anmeldung.
function leseWeb(schluessel) {
  try {
    return localStorage.getItem(schluessel);
  } catch (error) {
    console.error('Anmeldedaten nicht lesbar:', error);
    return null;
  }
}

function schreibeWeb(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, wert);
  } catch (error) {
    console.error('Anmeldedaten konnten nicht gespeichert werden:', error);
  }
}

function loescheWeb(schluessel) {
  try {
    localStorage.removeItem(schluessel);
  } catch (error) {
    console.error('Anmeldedaten konnten nicht entfernt werden:', error);
  }
}

export async function leseWert(schluessel) {
  if (!IST_NATIVE) return leseWeb(schluessel);
  try {
    return await leseNativ(schluessel);
  } catch (error) {
    // Ein defekter Eintrag im Systemspeicher darf die App nicht blockieren:
    // ohne Wert landet der Nutzer auf der Anmeldung statt auf einer weissen
    // Seite.
    console.error('Anmeldedaten aus dem sicheren Speicher nicht lesbar:', error);
    return null;
  }
}

export async function schreibeWert(schluessel, wert) {
  if (!IST_NATIVE) {
    schreibeWeb(schluessel, wert);
    return;
  }
  try {
    await schreibeNativ(schluessel, wert);
  } catch (error) {
    console.error('Anmeldedaten konnten nicht sicher gespeichert werden:', error);
  }
}

export async function loescheWert(schluessel) {
  if (!IST_NATIVE) {
    loescheWeb(schluessel);
    return;
  }
  try {
    await loescheNativ(schluessel);
  } catch (error) {
    console.error('Anmeldedaten konnten nicht entfernt werden:', error);
  }
}

// Uebernimmt Token und Nutzerdaten aus localStorage in den sicheren Speicher.
//
// Noetig fuer alle, die die App bereits vor dieser Version genutzt haben: ihre
// Anmeldung liegt im WebView-localStorage. Ohne Migration muessten sie sich neu
// anmelden — und der unsichere Wert bliebe zusaetzlich liegen. Deshalb wird
// erst uebernommen und danach zwingend aus localStorage geloescht, damit die
// Daten am unsicheren Ort nicht doppelt bestehen bleiben.
//
// Im Web ein No-Op: dort IST localStorage der Speicher.
export async function migriereAusLocalStorage() {
  if (!IST_NATIVE) return;

  for (const schluessel of [SCHLUESSEL_TOKEN, SCHLUESSEL_USER]) {
    let alterWert = null;
    try {
      alterWert = localStorage.getItem(schluessel);
    } catch (error) {
      console.error('Alte Anmeldedaten nicht lesbar:', error);
      continue;
    }
    if (alterWert === null) continue;

    try {
      // Nur uebernehmen, wenn im sicheren Speicher noch nichts liegt: ein dort
      // bereits vorhandener Wert ist der neuere und darf nicht ueberschrieben
      // werden.
      const vorhanden = await leseNativ(schluessel);
      if (vorhanden === null) {
        await schreibeNativ(schluessel, alterWert);
      }
      // Erst nach erfolgreicher Uebernahme entfernen — schlaegt der sichere
      // Speicher fehl, bleibt der alte Wert lieber liegen als verloren zu gehen.
      localStorage.removeItem(schluessel);
    } catch (error) {
      console.error('Anmeldedaten konnten nicht uebernommen werden:', error);
    }
  }
}
