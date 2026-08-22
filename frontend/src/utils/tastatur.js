// Tastaturhoehe als CSS-Variable `--tastatur`.
//
// In der App verdeckte die Tastatur Eingabefelder in Sheets (Simon 17.08.):
// Das Sheet bemisst sich an `100dvh`, und iOS meldet in einer WKWebView
// weiterhin die volle Viewport-Hoehe, waehrend die Tastatur davor liegt. Die
// Felder rutschen damit unter die Tastatur, ohne dass CSS etwas davon merkt.
//
// `@capacitor/keyboard` war installiert, wurde aber nirgends genutzt. Es
// liefert die tatsaechliche Hoehe; die traegt diese Datei als Variable in den
// Wurzelknoten, damit Sheets ihre Hoehe und ihren Innenabstand daran
// ausrichten koennen.
//
// Im Browser passiert nichts: Dort regelt der visuelle Viewport das selbst,
// und die Variable bleibt 0px.
import { IST_NATIVE } from './plattform';

let abmelden = null;

// Zuletzt gemeldete Hoehe. Ein Sheet, das mitten in offener Tastatur geoeffnet
// wird, kann so sofort erkennen, dass Platz fehlt — ohne auf ein weiteres
// Ereignis warten zu muessen, das nie kommt.
let aktuelleHoehe = 0;

// Wer auf Hoehenaenderungen reagieren muss (Sheets scrollen das fokussierte
// Feld in den sichtbaren Bereich), meldet sich hier an. Bewusst ein eigener
// Verteiler statt eines DOM-Ereignisses: So bleibt der Vertrag im Modul
// sichtbar, und die Abmeldung ist an den Aufrufer gebunden.
const zuhoerer = new Set();

function melden(hoehe) {
  aktuelleHoehe = hoehe;
  zuhoerer.forEach((fn) => {
    try {
      fn(hoehe);
    } catch {
      // Ein fehlerhafter Zuhoerer darf die anderen nicht mitreissen.
    }
  });
}

// Aktuelle Tastaturhoehe in Pixeln (0, wenn zu oder im Browser).
export function tastaturHoehe() {
  return aktuelleHoehe;
}

// Meldet einen Rueckruf an, der bei jeder Hoehenaenderung laeuft — inklusive
// des Schliessens (dann mit 0). Gibt die Abmeldefunktion zurueck.
export function tastaturAbonnieren(rueckruf) {
  if (typeof rueckruf !== 'function') return () => {};
  zuhoerer.add(rueckruf);
  return () => zuhoerer.delete(rueckruf);
}

export function tastaturBeobachten() {
  if (!IST_NATIVE || typeof window === 'undefined') return () => {};
  if (abmelden) return abmelden;

  const setze = (hoehe) => {
    const gerundet = Math.round(hoehe);
    document.documentElement.style.setProperty('--tastatur', `${gerundet}px`);
    // Zusaetzlich ein Kennzeichen am <html>: Mehrere Stellen halten einen
    // Mindestsockel frei, damit der Inhalt bei einem offenen Dialog nicht
    // unter der Leiste sitzt (dann meldet das Plugin ihre Hoehe als 0px).
    // Bei offener Tastatur ist die Leiste ebenfalls weg, der Sockel aber
    // schlicht falsch — er stuende als leerer Streifen zwischen Eingabefeld
    // und Tastatur. Ueber das Kennzeichen laesst sich beides unterscheiden.
    document.documentElement.toggleAttribute('data-tastatur', gerundet > 0);
    melden(gerundet);
  };

  const handles = [];
  let abgebrochen = false;

  import('@capacitor/keyboard')
    .then(({ Keyboard }) => {
      if (abgebrochen) return undefined;
      return Promise.all([
        // `willShow` statt `didShow`: Das Sheet soll sich mit der Tastatur
        // bewegen, nicht erst danach springen.
        Keyboard.addListener('keyboardWillShow', (info) => setze(info?.keyboardHeight || 0)),
        Keyboard.addListener('keyboardWillHide', () => setze(0)),
      ]).then((h) => {
        if (abgebrochen) h.forEach((x) => x.remove());
        else handles.push(...h);
      });
    })
    .catch(() => {
      // Ohne Plugin bleibt die Variable 0px — dann verhaelt sich die App wie
      // bisher, statt gar nicht zu starten.
    });

  abmelden = () => {
    abgebrochen = true;
    handles.forEach((h) => h.remove());
    setze(0);
    abmelden = null;
  };

  return abmelden;
}
