import { IST_NATIVE } from './plattform';

// Anmeldedaten im Web in localStorage, in der App im Keychain/Keystore.

// API-Adresse und Theme sind keine Geheimnisse und bleiben in localStorage.
export const SCHLUESSEL_TOKEN = 'token';
export const SCHLUESSEL_USER = 'user';

// Bindet das Token an die Instanz, sonst ginge es nach einem Wechsel an einen fremden Server.
export const SCHLUESSEL_INSTANZ = 'tokenInstanz';

// Lazy, damit @capacitor/core nicht ins Web-Bundle wandert.
let sicherModulPromise = null;

// Immer in { plugin } verpackt: Der Proxy beantwortet auch `.then` nativ und haengt sonst jede Promise-Kette auf.
async function ladeSicherenSpeicher() {
  if (!sicherModulPromise) {
    sicherModulPromise = import('@aparajita/capacitor-secure-storage').then(
      (modul) => ({ plugin: modul.SecureStorage })
    );
  }
  return sicherModulPromise;
}

// Zeitgrenze, weil ein haengender Systemspeicher sonst die Anmeldung stumm blockiert.
const ZUGRIFF_TIMEOUT_MS = 800;

function mitZeitgrenze(promise, was) {
  return Promise.race([
    promise,
    new Promise((_, ablehnen) =>
      setTimeout(() => ablehnen(new Error(`Systemspeicher antwortet nicht (${was})`)), ZUGRIFF_TIMEOUT_MS)
    ),
  ]);
}

// getItem/setItem speichern reine Strings wie im Web; .plugin erst nach der Zeitgrenze auspacken.
async function leseNativ(schluessel) {
  const { plugin: speicher } = await mitZeitgrenze(ladeSicherenSpeicher(), 'laden');
  return mitZeitgrenze(speicher.getItem(schluessel), 'lesen');
}

async function schreibeNativ(schluessel, wert) {
  const { plugin: speicher } = await mitZeitgrenze(ladeSicherenSpeicher(), 'laden');
  await mitZeitgrenze(speicher.setItem(schluessel, wert), 'schreiben');
}

async function loescheNativ(schluessel) {
  const { plugin: speicher } = await mitZeitgrenze(ladeSicherenSpeicher(), 'laden');
  await mitZeitgrenze(speicher.removeItem(schluessel), 'loeschen');
}

// Gesperrter Storage darf den Start nicht verhindern.
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
    // Ausweichspeicher: dort liegt der Wert, wenn der Systemspeicher beim Anmelden nicht antwortete.
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
  // Erst schnell sichern, dann Systemspeicher; sonst geht die Anmeldung beim Wegwechseln verloren.
  schreibeWeb(schluessel, wert);
  try {
    await schreibeNativ(schluessel, wert);
    loescheWeb(schluessel);
  } catch (error) {
    // Lieber schwach geschuetzt als staendig neu anmelden.
    console.error('Sicherer Speicher nicht erreichbar, Anmeldung bleibt im Ausweichspeicher:', error);
  }
}

export async function loescheWert(schluessel) {
  if (!IST_NATIVE) {
    loescheWeb(schluessel);
    return;
  }
  // Beim Abmelden darf nirgends ein Token zurueckbleiben.
  loescheWeb(schluessel);
  try {
    await loescheNativ(schluessel);
  } catch (error) {
    console.error('Anmeldedaten konnten nicht entfernt werden:', error);
  }
}

// Uebernimmt alte Anmeldungen aus localStorage und loescht sie dort danach.
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
      // Ein vorhandener Wert im sicheren Speicher ist neuer.
      const vorhanden = await leseNativ(schluessel);
      if (vorhanden === null) {
        await schreibeNativ(schluessel, alterWert);
      }
      // Erst nach erfolgreicher Uebernahme entfernen.
      localStorage.removeItem(schluessel);
    } catch (error) {
      console.error('Anmeldedaten konnten nicht uebernommen werden:', error);
    }
  }
}

// Anmeldung nur fuer die aktuelle Instanz herausgeben, sonst loeschen.
export async function leseAnmeldungFuer(aktuelleInstanz) {
  let notiert = await leseWert(SCHLUESSEL_INSTANZ);
  const token = await leseWert(SCHLUESSEL_TOKEN);

  if (!token) return { token: null, user: null };

  // Nachruestung: Anmeldungen ohne Zuordnung gehoeren zur eingestellten Instanz, denn ein Wechsel meldet ab.
  if (notiert === null || notiert === undefined) {
    await schreibeWert(SCHLUESSEL_INSTANZ, String(aktuelleInstanz || ''));
    notiert = String(aktuelleInstanz || '');
  }

  // '' und undefined sind derselbe Web-Fall.
  const gleich = (a, b) =>
    String(a || '').replace(/\/+$/, '') === String(b || '').replace(/\/+$/, '');

  if (!gleich(notiert, aktuelleInstanz)) {
    await Promise.all([
      loescheWert(SCHLUESSEL_TOKEN),
      loescheWert(SCHLUESSEL_USER),
      loescheWert(SCHLUESSEL_INSTANZ),
    ]).catch(() => {});
    return { token: null, user: null, verworfen: true };
  }

  const rohUser = await leseWert(SCHLUESSEL_USER);
  let user = null;
  try {
    user = rohUser ? JSON.parse(rohUser) : null;
  } catch (error) {
    console.error('Gespeicherte Nutzerdaten unlesbar, werden verworfen:', error);
    await loescheWert(SCHLUESSEL_USER);
  }
  return { token, user };
}

// Anmeldung samt Zugehoerigkeit ablegen.
export async function schreibeAnmeldung(token, user, instanz) {
  await schreibeWert(SCHLUESSEL_TOKEN, token);
  await schreibeWert(SCHLUESSEL_INSTANZ, String(instanz || ''));
  if (user !== undefined) {
    await schreibeWert(SCHLUESSEL_USER, JSON.stringify(user));
  }
}

// Alles entfernen, was zu einer Anmeldung gehoert.
export async function loescheAnmeldung() {
  await Promise.all([
    loescheWert(SCHLUESSEL_TOKEN),
    loescheWert(SCHLUESSEL_USER),
    loescheWert(SCHLUESSEL_INSTANZ),
  ]);
}
