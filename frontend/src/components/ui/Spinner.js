import React from 'react';

// Ladekreis ohne Prozent, weil die Exportzeit am LibreOffice-Start hängt, nicht an der Menge; aria-hidden, die Beschriftung daneben sagt es an.
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
