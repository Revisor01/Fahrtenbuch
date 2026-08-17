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

export function tastaturBeobachten() {
  if (!IST_NATIVE || typeof window === 'undefined') return () => {};
  if (abmelden) return abmelden;

  const setze = (hoehe) => {
    document.documentElement.style.setProperty('--tastatur', `${Math.round(hoehe)}px`);
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
