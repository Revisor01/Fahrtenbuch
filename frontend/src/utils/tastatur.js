// Tastaturhoehe als --tastatur, weil die WKWebView die volle Viewport-Hoehe weitermeldet.
import { IST_NATIVE } from './plattform';

let abmelden = null;

let aktuelleHoehe = 0;

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

// Rueckruf bei jeder Hoehenaenderung (beim Schliessen 0); liefert die Abmeldung.
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
    // Unterscheidet offene Tastatur vom Dialog, sonst bliebe der Sockel als leerer Streifen.
    document.documentElement.toggleAttribute('data-tastatur', gerundet > 0);
    melden(gerundet);
  };

  const handles = [];
  let abgebrochen = false;

  import('@capacitor/keyboard')
    .then(({ Keyboard }) => {
      if (abgebrochen) return undefined;
      return Promise.all([
        // `willShow`, damit das Sheet mitlaeuft statt nachzuspringen.
        Keyboard.addListener('keyboardWillShow', (info) => setze(info?.keyboardHeight || 0)),
        Keyboard.addListener('keyboardWillHide', () => setze(0)),
      ]).then((h) => {
        if (abgebrochen) h.forEach((x) => x.remove());
        else handles.push(...h);
      });
    })
    .catch(() => {
      // Ohne Plugin bleibt die Variable 0px.
    });

  abmelden = () => {
    abgebrochen = true;
    handles.forEach((h) => h.remove());
    setze(0);
    abmelden = null;
  };

  return abmelden;
}
