import React, { useEffect } from 'react';
import { splashAusblenden } from '../utils/splash';

// Zeigt Zeichen und Namen, waehrend die gespeicherte Anmeldung gelesen wird.
//
// Loest den nativen Startbildschirm ab, sobald diese Flaeche wirklich steht.
// Frueher auszublenden hiesse, beide nacheinander zu sehen: Der native traegt
// nur das Zeichen, dieser zusaetzlich den Namen. So bleibt es ein einziger
// Startbildschirm, bei dem lediglich der Text erscheint.
function Startbildschirm() {
  useEffect(() => {
    splashAusblenden();
  }, []);

  return (
    <div className="startbildschirm" role="status" aria-live="polite">
      <div className="startbildschirm-inhalt">
        <span className="startbildschirm-logo" aria-hidden="true">
          <svg viewBox="0 0 512 512" width="88" height="88">
            <path
              d="M159.2,158.3c54-53.4,141-53,194.5.9,53.4,54,53,141-.9,194.5-54,53.4-141,53-194.5-.9-25.7-25.9-40-61-39.8-97.4"
              fill="none"
              stroke="currentColor"
              strokeWidth="45"
            />
            <circle cx="126.8" cy="202.2" r="26" fill="var(--accent)" />
          </svg>
        </span>
        <span className="startbildschirm-name">Fahrtenbuch</span>
        <span className="startbildschirm-text">Dienstfahrten erfassen und abrechnen</span>
      </div>
    </div>
  );
}

export default Startbildschirm;
