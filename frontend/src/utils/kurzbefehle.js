// Kurzbefehle (langes Tippen auf das App-Symbol).
//
// Gegenstueck zu ios/App/App/Kurzbefehle.swift. Die native Seite schreibt den
// getippten Typ direkt in die WebView — als `window.__kurzbefehl` und als
// Ereignis `kurzbefehl`. Bewusst KEIN Capacitor-Plugin: Capacitor 8
// registriert nur Plugins aus dem generierten SPM-Paket, eine eigene Klasse im
// App-Target wird nie geladen. Genau daran scheiterte Build 17 (Simon 17.08.).
//
// Zwei Wege, beide noetig:
//   - Kaltstart: iOS meldet den Kurzbefehl, bevor React zuhoert. Der Wert
//     liegt dann in `window.__kurzbefehl` und wird abgeholt.
//   - Laufende App: das Ereignis feuert sofort.
//
// Die Web-App kennt beides nicht — dort passiert schlicht nie etwas.
import { PLATTFORM } from './plattform';

export const KURZBEFEHL_ERFASSEN = 'de.godsapp.fahrtenbuch.erfassen';
export const KURZBEFEHL_WIEDERHOLEN = 'de.godsapp.fahrtenbuch.wiederholen';

// Bislang nur iOS: Android-Kurzbefehle brauchen eigene XML-Ressourcen und
// einen Intent-Weg — das kommt mit dem ersten Android-Durchlauf.
const VERFUEGBAR = PLATTFORM === 'ios';

// Holt einen beim Start hinterlegten Kurzbefehl ab und raeumt ihn weg.
// Liefert den Typ oder null.
export function offenenKurzbefehlAbholen() {
  if (!VERFUEGBAR || typeof window === 'undefined') return null;
  const typ = window.__kurzbefehl || null;
  if (typ) delete window.__kurzbefehl;
  return typ;
}

// Meldet einen Listener an und liefert die Abmeldefunktion.
export function aufKurzbefehlHoeren(handler) {
  if (!VERFUEGBAR || typeof window === 'undefined') return () => {};

  const beiEreignis = (e) => {
    const typ = e.detail || window.__kurzbefehl;
    if (!typ) return;
    // Aufraeumen, damit derselbe Kurzbefehl nicht spaeter noch einmal aus dem
    // Puffer geholt wird.
    delete window.__kurzbefehl;
    handler(typ);
  };

  window.addEventListener('kurzbefehl', beiEreignis);
  return () => window.removeEventListener('kurzbefehl', beiEreignis);
}
