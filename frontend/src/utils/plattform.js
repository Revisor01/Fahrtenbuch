// Erkennung der nativen Huelle (Capacitor) fuer Code, der sich im Browser
// anders verhalten muss als in der App.
//
// Bewusst ueber `window.Capacitor` statt ueber einen Import von
// '@capacitor/core': dieses Modul wird auch aus dem Web-Bundle geladen, wo die
// native Bruecke nie existiert. Optional-Chaining haelt den Aufruf sicher,
// falls `window.Capacitor` fehlt oder die Bruecke noch nicht geladen ist.
export function istNativeApp() {
  if (typeof window === 'undefined') return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

// 'ios' | 'android' | 'web' — 'web' auch dann, wenn die Bruecke eine
// unbekannte Plattform meldet: unbekannt heisst hier "wie der Browser", damit
// nie eine halbe Plattformvariante greift.
export function getPlattform() {
  if (!istNativeApp()) return 'web';
  const plattform = window.Capacitor?.getPlatform?.();
  return plattform === 'ios' || plattform === 'android' ? plattform : 'web';
}

// Einmal beim Start ausgewertet: die Plattform wechselt zur Laufzeit nicht,
// und so bleibt der Web-Pfad ein einziger konstanter Vergleich.
export const PLATTFORM = getPlattform();
export const IST_NATIVE = PLATTFORM !== 'web';
