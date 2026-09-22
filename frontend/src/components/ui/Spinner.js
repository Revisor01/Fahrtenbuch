import React from 'react';

// Kleiner Ladekreis fuer Knoepfe und Zeilen.
//
// Kein Text, keine Prozentzahl: Der PDF-Export dauert gemessene ~4,3 s, und
// die Zeit steckt vollstaendig im Start von LibreOffice — unabhaengig davon,
// wie viele Fahrten drin sind (5 Zeilen: 4538 ms, 150 Zeilen: 4515 ms).
// Ein Balken mit Prozentwerten waere damit erfunden; er kann nur laufen,
// nicht fortschreiten.
//
// aria-hidden, weil die Beschriftung daneben („Erstellt …") die Lage bereits
// ansagt — sonst meldete die Sprachausgabe dasselbe zweimal.
function Spinner({ size = 16, className = '' }) {
  return (
    <svg
      className={`spinner${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default Spinner;
