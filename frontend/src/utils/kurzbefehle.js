// Kurzbefehle (langes Tippen auf das App-Symbol).
//
// Gegenstueck zu ios/App/App/Kurzbefehle.swift. Zwei Wege fuehren herein, und
// beide werden gebraucht:
//   - Kaltstart: iOS meldet den Kurzbefehl, bevor die WebView zuhoert. Der
//     Typ liegt nativ gepuffert und wird mit letztenAbholen() geholt.
//   - Laufende App: der Listener feuert sofort.
//
// Die Web-App kennt das alles nicht — dort gibt es kein Capacitor und alle
// Funktionen hier sind wirkungslose Platzhalter.
import { PLATTFORM } from './plattform';

export const KURZBEFEHL_ERFASSEN = 'de.godsapp.fahrtenbuch.erfassen';
export const KURZBEFEHL_WIEDERHOLEN = 'de.godsapp.fahrtenbuch.wiederholen';

// Bislang nur iOS: Android-Kurzbefehle brauchen eigene XML-Ressourcen und
// einen Intent-Weg — das kommt mit dem ersten Android-Durchlauf, nicht hier.
const VERFUEGBAR = PLATTFORM === 'ios';

function plugin() {
  if (!VERFUEGBAR) return null;
  return window.Capacitor?.Plugins?.Kurzbefehle ?? null;
}

// Holt einen beim Start gepufferten Kurzbefehl ab und leert den Puffer.
// Liefert den Typ oder null.
export async function offenenKurzbefehlAbholen() {
  const p = plugin();
  if (!p) return null;
  try {
    const { typ } = await p.letztenAbholen();
    return typ || null;
  } catch (error) {
    // Ein fehlender Kurzbefehl darf den Start nie aufhalten — das ist eine
    // Bequemlichkeit, kein Bestandteil des Ablaufs.
    console.error('Kurzbefehl konnte nicht gelesen werden:', error);
    return null;
  }
}

// Meldet einen Listener an und liefert die Abmeldefunktion.
export function aufKurzbefehlHoeren(handler) {
  const p = plugin();
  if (!p) return () => {};

  let handle = null;
  let abgebrochen = false;

  Promise.resolve(p.addListener('kurzbefehl', ({ typ }) => {
    if (typ) handler(typ);
  }))
    .then((h) => {
      if (abgebrochen) h.remove();
      else handle = h;
    })
    .catch((error) => {
      console.error('Kurzbefehle konnten nicht abonniert werden:', error);
    });

  return () => {
    abgebrochen = true;
    if (handle) handle.remove();
  };
}
