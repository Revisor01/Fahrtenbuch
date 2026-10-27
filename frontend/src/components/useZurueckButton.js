import { useEffect, useRef } from 'react';
import { PLATTFORM } from '../utils/plattform';
import { oberstesOverlaySchliessen } from '../utils/overlayStack';

// Androids Zurück: Sheet schließen, History zurück, Start-Tab, dann App beenden; mit Listener ist das Standardverhalten ganz aus.
function useZurueckButton({ startTab, activeTab, onNavigate }) {
  // Ref, sonst fällt die Taste beim Neuanmelden kurz auf das deaktivierte Standardverhalten.
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

          // Ohne history.length, der Wert schrumpft in einer WebView nie.
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
