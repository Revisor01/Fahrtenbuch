import React from 'react';

// Zeigt Logo und Namen, waehrend die gespeicherte Anmeldung gelesen wird.
//
// Sieht bewusst aus wie der native Startbildschirm, den App.js ausblendet,
// sobald die Oberflaeche steht: So ist der Uebergang unsichtbar statt ein
// Wechsel zwischen zwei verschiedenen Flaechen.
function Startbildschirm() {
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
