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

// Beide Plattformen, auf zwei Wegen:
//   iOS     — Kurzbefehle.swift schreibt direkt in die WebView (kein Plugin,
//             weil Capacitor 8 nur Plugins aus dem SPM-Paket laedt).
//   Android — KurzbefehlePlugin.java meldet ueber die Bruecke; dort greift
//             die Einschraenkung nicht.
// Die Typ-Kennungen sind auf beiden Seiten dieselben, deshalb sieht der
// Aufrufer keinen Unterschied.
const VERFUEGBAR = PLATTFORM === 'ios' || PLATTFORM === 'android';
const UEBER_PLUGIN = PLATTFORM === 'android';

// Plugin erst bei Bedarf laden. In { plugin } verpackt, weil ein
// Capacitor-Proxy jeden Zugriff als Bruecken-Aufruf beantwortet — auch
// `.then`, was die Kette sonst haengen laesst (siehe tokenSpeicher.js).
let pluginPromise = null;
async function ladePlugin() {
  if (!pluginPromise) {
    pluginPromise = import('@capacitor/core').then((m) => ({
      plugin: m.registerPlugin('Kurzbefehle'),
    }));
  }
  return (await pluginPromise).plugin;
}

// Holt einen beim Start hinterlegten Kurzbefehl ab und raeumt ihn weg.
// Liefert den Typ oder null.
export function offenenKurzbefehlAbholen() {
  if (!VERFUEGBAR || typeof window === 'undefined') return null;
  const typ = window.__kurzbefehl || null;
  if (typ) delete window.__kurzbefehl;
  return typ;
}

// Android: Das Ereignis kann gefeuert haben, bevor ein Listener stand.
// Liefert ein Promise, weil der Wert ueber die Bruecke kommt. Auf iOS
// erledigt das der synchrone Puffer oben.
export async function offenenKurzbefehlAbholenAsync() {
  if (!UEBER_PLUGIN) return offenenKurzbefehlAbholen();
  try {
    const plugin = await ladePlugin();
    const { typ } = await plugin.offenen();
    return typ || null;
  } catch (error) {
    // Ohne Kurzbefehl startet die App normal — kein Grund fuer eine Meldung.
    return null;
  }
}

// Meldet einen Listener an und liefert die Abmeldefunktion.
export function aufKurzbefehlHoeren(handler) {
  if (!VERFUEGBAR || typeof window === 'undefined') return () => {};

  if (UEBER_PLUGIN) {
    let handle = null;
    let abgemeldet = false;
    ladePlugin()
      .then((plugin) => plugin.addListener('kurzbefehl', (e) => handler(e?.typ)))
      .then((h) => {
        handle = h;
        if (abgemeldet) h.remove();
      })
      .catch(() => {});
    return () => {
      abgemeldet = true;
      try {
        handle?.remove?.();
      } catch (error) {
        /* schon weg */
      }
    };
  }

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
