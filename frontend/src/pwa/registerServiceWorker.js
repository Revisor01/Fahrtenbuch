// Registrierung des Service Workers.
//
// Bewusst von Hand statt ueber die Auto-Injection des Plugins: die App wird
// zusaetzlich in eine Capacitor-Huelle gepackt. Dort laeuft das Bundle lokal
// (capacitor://, ionic://, file://) — ein Service Worker bringt dort keinen
// Nutzen und kann Requests der nativen Bruecke stoeren. Deshalb registrieren
// wir nur, wenn wir sicher in einem echten Browser ueber http(s) laufen.

let registrierungLaeuft = false;

function istNativeHuelle() {
  if (typeof window === 'undefined') return true;
  // Capacitor setzt window.Capacitor, sobald die native Bruecke aktiv ist.
  if (window.Capacitor?.isNativePlatform?.()) return true;
  // Fallback ueber das Protokoll, falls die Bruecke noch nicht geladen ist.
  const protokoll = window.location.protocol;
  return protokoll === 'capacitor:' || protokoll === 'ionic:' || protokoll === 'file:';
}

// onUpdateAvailable: wird aufgerufen, sobald eine neue Version bereitliegt.
// Bekommt eine Funktion, die das Update uebernimmt und neu laedt.
// onOffline / onOnline: Zustandswechsel der Netzverbindung.
export async function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (registrierungLaeuft) return null;
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (istNativeHuelle()) return null;

  registrierungLaeuft = true;

  try {
    // Dynamisch importiert, damit das virtuelle Modul nicht in Umgebungen
    // aufgeloest werden muss, in denen der SW gar nicht zum Zug kommt.
    const { registerSW } = await import('virtual:pwa-register');

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // registerType 'prompt': der wartende Worker uebernimmt erst, wenn
        // Nutzer:innen zustimmen. Kein stiller Reload mitten in einer Eingabe.
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
