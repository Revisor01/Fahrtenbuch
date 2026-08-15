import { useEffect, useRef } from 'react';
import { useToast } from './ui/Toast';
import { registerServiceWorker } from '../pwa/registerServiceWorker';

// Verbindet den Service Worker mit dem bestehenden Toast-System:
// - neue Version verfuegbar -> Toast mit Aktion „Neu laden"
// - Verbindung weg / wieder da -> kurzer Hinweis
//
// Rendert nichts. Haengt bewusst innerhalb des ToastProviders.
function PwaUpdater() {
  const toast = useToast();
  // Refs, damit der Effekt nur einmal laeuft und trotzdem die aktuelle
  // Toast-Instanz nutzt (StrictMode montiert Effekte im Dev doppelt).
  const toastRef = useRef(toast);
  toastRef.current = toast;
  const registriert = useRef(false);

  useEffect(() => {
    if (registriert.current) return;
    registriert.current = true;

    registerServiceWorker({
      onUpdateAvailable: (uebernehmen) => {
        toastRef.current.success('Eine neue Version ist verfügbar.', {
          actionLabel: 'Neu laden',
          onAction: () => uebernehmen(),
        });
      },
    });
  }, []);

  useEffect(() => {
    // Der Offline-Hinweis ist wichtiger als die Abrechnungsdaten selbst:
    // die App zeigt bewusst keine gecachten Fahrten, deshalb muss klar sein,
    // warum gerade nichts laedt.
    const beiOffline = () => {
      toastRef.current.error('Keine Verbindung. Daten werden nicht aktualisiert.');
    };
    const beiOnline = () => {
      toastRef.current.success('Verbindung wieder da.');
    };

    window.addEventListener('offline', beiOffline);
    window.addEventListener('online', beiOnline);
    return () => {
      window.removeEventListener('offline', beiOffline);
      window.removeEventListener('online', beiOnline);
    };
  }, []);

  return null;
}

export default PwaUpdater;
