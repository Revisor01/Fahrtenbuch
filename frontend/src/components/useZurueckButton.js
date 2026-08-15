import { useEffect, useRef } from 'react';
import { PLATTFORM } from '../utils/plattform';
import { oberstesOverlaySchliessen } from '../utils/overlayStack';

// Android-Zurueck-Button.
//
// ACHTUNG: Sobald ein backButton-Listener registriert ist, ist das
// Standardverhalten der WebView vollstaendig deaktiviert — jeder Schritt muss
// hier von Hand nachgebaut werden, sonst reagiert die Taste gar nicht mehr.
//
// Reihenfolge (bewusst so, weil ein Nutzer immer die zuletzt geoeffnete Ebene
// zurueckerwartet):
//   1. offenes Sheet/Modal schliessen (LIFO)
//   2. Router-History zurueck (Hilfe-Seite etc.)
//   3. auf den Start-Tab wechseln
//   4. App beenden — nur wenn schon auf dem Start-Tab und ohne History
function useZurueckButton({ startTab, activeTab, onNavigate }) {
  // Ref statt Abhaengigkeit: der Listener wird sonst bei jedem Tab-Wechsel
  // ab- und neu angemeldet, und in dem Moment dazwischen faellt die Taste auf
  // das (deaktivierte) Standardverhalten zurueck.
  const stand = useRef({ startTab, activeTab, onNavigate });
  stand.current = { startTab, activeTab, onNavigate };

  useEffect(() => {
    if (PLATTFORM !== 'android') return undefined;

    let abmelden = null;
    let abgebrochen = false;

    import('@capacitor/app')
      .then(({ App: CapApp }) => {
        if (abgebrochen) return;
        return CapApp.addListener('backButton', () => {
          if (oberstesOverlaySchliessen()) return;

          const { startTab: start, activeTab: aktiv, onNavigate: navigiere } = stand.current;

          // Die App-Shell liegt auf '/', Unterseiten (Hilfe u. a.) darueber.
          // Bewusst ohne history.length-Pruefung: der Wert schrumpft in einer
          // WebView nie und waere damit keine verlaessliche Aussage darueber,
          // ob es noch etwas zurueckzugehen gibt.
          if (window.location.pathname !== '/') {
            window.history.back();
            return;
          }

          if (aktiv !== start) {
            navigiere(start);
            return;
          }

          CapApp.exitApp();
        }).then((handle) => {
          if (abgebrochen) handle.remove();
          else abmelden = () => handle.remove();
        });
      })
      .catch(() => {
        // Ohne Plugin bleibt schlicht das Standardverhalten der WebView aktiv.
      });

    return () => {
      abgebrochen = true;
      if (abmelden) abmelden();
    };
  }, []);
}

export default useZurueckButton;
