import { useEffect, useRef } from 'react';
import { useToast } from './ui/Toast';
import { registerServiceWorker } from '../pwa/registerServiceWorker';

// Service Worker an die Toasts: neue Version, offline, wieder online; innerhalb des ToastProviders.
function PwaUpdater() {
  const toast = useToast();
  // Refs, damit der Effekt einmal läuft und die aktuelle Toast-Instanz nutzt.
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
    // Ohne gecachte Fahrten muss klar sein, warum nichts lädt.
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
