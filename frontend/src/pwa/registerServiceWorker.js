// Service Worker von Hand registriert, nur im echten Browser über http(s), weil er in der Capacitor-Hülle stören kann.

let registrierungLaeuft = false;

function istNativeHuelle() {
  if (typeof window === 'undefined') return true;
  // Capacitor setzt window.Capacitor, sobald die native Bruecke aktiv ist.
  if (window.Capacitor?.isNativePlatform?.()) return true;
  // Fallback ueber das Protokoll, falls die Bruecke noch nicht geladen ist.
  const protokoll = window.location.protocol;
  return protokoll === 'capacitor:' || protokoll === 'ionic:' || protokoll === 'file:';
}

// onUpdateAvailable(übernehmen), onOffline, onOnline.
export async function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (registrierungLaeuft) return null;
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (istNativeHuelle()) return null;

  registrierungLaeuft = true;

  try {
    // Dynamisch, damit das virtuelle Modul nur bei Bedarf aufgelöst wird.
    const { registerSW } = await import('virtual:pwa-register');

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // 'prompt', damit kein stiller Reload mitten in einer Eingabe passiert.
        onUpdateAvailable?.(() => updateSW(true));
      },
      onRegisterError(error) {
        console.error('Service Worker konnte nicht registriert werden:', error);
      },
    });

    return updateSW;
  } catch (error) {
    // Eine fehlgeschlagene SW-Registrierung darf die App nie blockieren.
    console.error('Service Worker konnte nicht geladen werden:', error);
    registrierungLaeuft = false;
    return null;
  }
}
