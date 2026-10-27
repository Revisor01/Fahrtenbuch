// Kurzbefehle vom App-Symbol; iOS schreibt direkt in die WebView, weil Capacitor 8 eigene App-Target-Plugins nicht laedt.
import { PLATTFORM } from './plattform';

export const KURZBEFEHL_ERFASSEN = 'de.godsapp.fahrtenbuch.erfassen';
export const KURZBEFEHL_WIEDERHOLEN = 'de.godsapp.fahrtenbuch.wiederholen';

// iOS ueber Kurzbefehle.swift, Android ueber KurzbefehlePlugin.java, gleiche Typ-Kennungen.
const VERFUEGBAR = PLATTFORM === 'ios' || PLATTFORM === 'android';
const UEBER_PLUGIN = PLATTFORM === 'android';

// In { plugin } verpackt: Der Capacitor-Proxy beantwortet sonst auch `.then` nativ.
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
export function offenenKurzbefehlAbholen() {
  if (!VERFUEGBAR || typeof window === 'undefined') return null;
  const typ = window.__kurzbefehl || null;
  if (typ) delete window.__kurzbefehl;
  return typ;
}

// Android: Das Ereignis kann gefeuert haben, bevor ein Listener stand.
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
    // Sonst wird derselbe Kurzbefehl spaeter erneut abgeholt.
    delete window.__kurzbefehl;
    handler(typ);
  };

  window.addEventListener('kurzbefehl', beiEreignis);
  return () => window.removeEventListener('kurzbefehl', beiEreignis);
}
