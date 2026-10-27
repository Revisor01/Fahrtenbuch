// Ueber window.Capacitor statt Import, weil das Modul auch im Web-Bundle laeuft.
export function istNativeApp() {
  if (typeof window === 'undefined') return false;
  return window.Capacitor?.isNativePlatform?.() === true;
}

// Unbekannte Plattform gilt als 'web'.
export function getPlattform() {
  if (!istNativeApp()) return 'web';
  const plattform = window.Capacitor?.getPlatform?.();
  return plattform === 'ios' || plattform === 'android' ? plattform : 'web';
}

export const PLATTFORM = getPlattform();
export const IST_NATIVE = PLATTFORM !== 'web';
