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

// Zu welcher Instanz die gespeicherte Anmeldung gehoert.
//
// Ohne diese Notiz war das Token an keinen Kirchenkreis gebunden: Es lag im
// Systemspeicher, die Server-Adresse daneben in localStorage, und nichts
// verband beides. Nach einem Wechsel schickte die App das Token von
// Kirchenkreis A an Server B — als Bearer-Token, zusammen mit rund 30
// weiteren Abrufen. B antwortet zwar 401, hat es dann aber in seinen
// Protokollen: ein bei A bis zu 14 Tage gueltiges Token liegt beim Betreiber
// eines fremden Kirchenkreises.
//
// Verschaerfend: Der iOS-Keychain ueberlebt das Loeschen der App. Wer sie
// entfernt, um sich vor der Weitergabe des Geraets "abzumelden", war nach
// einer Neuinstallation wieder angemeldet — localStorage ist dann leer, der
// Keychain nicht.
export const SCHLUESSEL_INSTANZ = 'tokenInstanz';

// Das Plugin wird erst beim ersten nativen Zugriff geladen. Ein statischer
// Import wuerde @capacitor/core samt Plugin-Registry fest ins Web-Bundle
// ziehen, wo davon nichts gebraucht wird.
let sicherModulPromise = null;

// Das Plugin steckt in { plugin }, statt direkt aufgeloest zu werden: Ein
// Capacitor-Proxy beantwortet JEDEN Zugriff als Bruecken-Aufruf, auch `.then`.
// Direkt aus einem Promise zurueckgegeben, hielte die Laufzeit ihn fuer ein
// Thenable und riefe `SecureStorage.then()` nativ auf. Auf Android gibt es die
// Methode nicht — jeder Zugriff lief damit in die Zeitgrenze unten und die
// Anmeldung liess sich nicht speichern ("Systemspeicher antwortet nicht").
// Das Plugin bleibt IMMER in { plugin } verpackt — auch als Rueckgabewert.
//
// registerPlugin liefert einen Proxy, der jeden Property-Zugriff als
// Bruecken-Aufruf beantwortet, `.then` eingeschlossen. Wird er zum
// Ergebniswert eines Promise, halten ihn Promise.resolve und Promise.race fuer
// ein Thenable, greifen auf `.then` zu und rufen `SecureStorage.then()` nativ
// auf. Die Methode gibt es nicht: der Aufruf kehrte nie zurueck, lief in die
// Zeitgrenze unten und die Anmeldung liess sich auf Android nicht speichern
// ("Systemspeicher antwortet nicht (laden)").
async function ladeSicherenSpeicher() {
  if (!sicherModulPromise) {
    sicherModulPromise = import('@aparajita/capacitor-secure-storage').then(
      (modul) => ({ plugin: modul.SecureStorage })
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
// .plugin wird erst NACH der Zeitgrenze ausgepackt — siehe Begruendung an
// ladeSicherenSpeicher(): der nackte Proxy darf durch keine Promise-Kette.
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

// Anmeldung nur herausgeben, wenn sie zur aktuell gewaehlten Instanz gehoert.
//
// Passt sie nicht — Kirchenkreis gewechselt, App neu installiert, Token aus
// einem Backup —, wird sie geloescht statt benutzt. Lieber eine Anmeldemaske
// als ein fremdes Token an einen fremden Server.
//
// `aktuelleInstanz` kommt als Parameter herein, damit dieses Modul nichts aus
// api/client importieren muss (das importiert seinerseits axios und wuerde
// den Startpfad unnoetig aufblaehen).
export async function leseAnmeldungFuer(aktuelleInstanz) {
  let notiert = await leseWert(SCHLUESSEL_INSTANZ);
  const token = await leseWert(SCHLUESSEL_TOKEN);

  if (!token) return { token: null, user: null };

  // Einmalige Nachruestung: Wer beim Update dieser Fassung angemeldet ist,
  // hat noch keine Zuordnung — sie wurde ja gerade erst eingefuehrt. Diese
  // Anmeldungen ohne Weiteres zu verwerfen, wuerde alle Nutzer:innen ohne
  // Not aussperren. Die aktuell eingestellte Instanz ist in diesem Moment
  // zwangslaeufig die richtige: Ein Wechsel meldet ab und loescht das Token,
  // ein Token kann also nur von der gerade eingestellten Instanz stammen.
  //
  // Danach greift die Pruefung normal: Jede spaeter geschriebene Anmeldung
  // traegt ihre Zuordnung, und eine fehlende bedeutet dann "fremd".
  if (notiert === null || notiert === undefined) {
    await schreibeWert(SCHLUESSEL_INSTANZ, String(aktuelleInstanz || ''));
    notiert = String(aktuelleInstanz || '');
  }

  // Vergleich ohne abschliessenden Schraegstrich: '' und undefined sind
  // dasselbe (Web-Fall, gleicher Host wie das Frontend).
  const gleich = (a, b) =>
    String(a || '').replace(/\/+$/, '') === String(b || '').replace(/\/+$/, '');

  if (!gleich(notiert, aktuelleInstanz)) {
    // Kein Sonderfall fuer "noch keine Notiz": Eine Anmeldung ohne Zuordnung
    // stammt aus einer aelteren Fassung oder aus einem fremden Zustand — in
    // beiden Faellen ist Neuanmelden der sichere Weg.
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
