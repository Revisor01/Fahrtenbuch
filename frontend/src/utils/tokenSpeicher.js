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

// Zeitgrenze fuer jeden Zugriff auf den Systemspeicher.
//
// Ein Fehler laesst sich fangen — ein Aufruf, der gar nicht zurueckkehrt,
// nicht. Genau das kam auf dem Geraet vor: Die Anmeldung blieb an
// `await schreibeWert(...)` stehen, ohne Fehlermeldung, und der Knopf tat
// scheinbar nichts. Lieber ohne gespeicherte Anmeldung weiterarbeiten als
// eine App, die stehenbleibt.
// Kurz gehalten: Der Schluesselbund antwortet normalerweise in Millisekunden.
// Die Grenze ist nur eine Absicherung gegen ein blockierendes Plugin, kein
// eingeplanter Wartewert — laenger hiesse, dass der Start sichtbar haengt.
const ZUGRIFF_TIMEOUT_MS = 800;

function mitZeitgrenze(promise, was) {
  return Promise.race([
    promise,
    new Promise((_, ablehnen) =>
      setTimeout(() => ablehnen(new Error(`Systemspeicher antwortet nicht (${was})`)), ZUGRIFF_TIMEOUT_MS)
    ),
  ]);
}

// Bewusst getItem/setItem/removeItem statt get/set: diese Varianten arbeiten
// mit reinen Strings, waehrend get()/set() zusaetzlich JSON serialisieren.
// So bleibt der gespeicherte Wert Zeichen fuer Zeichen derselbe wie im Web.
async function leseNativ(schluessel) {
  const speicher = await mitZeitgrenze(ladeSicherenSpeicher(), 'laden');
  return mitZeitgrenze(speicher.getItem(schluessel), 'lesen');
}

async function schreibeNativ(schluessel, wert) {
  const speicher = await mitZeitgrenze(ladeSicherenSpeicher(), 'laden');
  await mitZeitgrenze(speicher.setItem(schluessel, wert), 'schreiben');
}

async function loescheNativ(schluessel) {
  const speicher = await mitZeitgrenze(ladeSicherenSpeicher(), 'laden');
  await mitZeitgrenze(speicher.removeItem(schluessel), 'loeschen');
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
    const wert = await leseNativ(schluessel);
    // Nichts im Systemspeicher? Dann im Ausweichspeicher nachsehen: Dort
    // liegt der Wert, wenn beim Anmelden der Systemspeicher nicht erreichbar
    // war. Sonst muesste man sich bei jedem Start neu anmelden.
    return wert !== null ? wert : leseWeb(schluessel);
  } catch (error) {
    console.error('Anmeldedaten aus dem sicheren Speicher nicht lesbar:', error);
    return leseWeb(schluessel);
  }
}

export async function schreibeWert(schluessel, wert) {
  if (!IST_NATIVE) {
    schreibeWeb(schluessel, wert);
    return;
  }
  // Zuerst in den schnellen Speicher, dann in den Systemspeicher nachziehen.
  //
  // Der Systemspeicher antwortet asynchron und darf bis zu einigen Sekunden
  // brauchen. Wurde erst dort geschrieben, war der Wert in dieser Zeit
  // nirgends abgelegt — geht die App waehrenddessen in den Hintergrund oder
  // wechselt die Ansicht, ging die Anmeldung verloren und man musste sich
  // beim naechsten Start neu anmelden.
  //
  // Diese Reihenfolge macht den Wert sofort dauerhaft. Der unverschluesselte
  // Zwischenstand besteht nur, bis der Systemspeicher bestaetigt — danach
  // wird er geloescht.
  schreibeWeb(schluessel, wert);
  try {
    await schreibeNativ(schluessel, wert);
    loescheWeb(schluessel);
  } catch (error) {
    // Der Wert bleibt im Ausweichspeicher liegen: schlechter geschuetzt, aber
    // vorhanden. Eine App, bei der man sich staendig neu anmelden muss, ist
    // unbrauchbar.
    console.error('Sicherer Speicher nicht erreichbar, Anmeldung bleibt im Ausweichspeicher:', error);
  }
}

export async function loescheWert(schluessel) {
  if (!IST_NATIVE) {
    loescheWeb(schluessel);
    return;
  }
  // Immer beide Orte leeren: Beim Abmelden darf nirgends ein Token
  // zurueckbleiben — auch nicht im Ausweichspeicher, falls dort zuletzt
  // geschrieben wurde.
  loescheWeb(schluessel);
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
