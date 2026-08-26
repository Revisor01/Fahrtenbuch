import React, { useRef } from 'react';

// Lokales Datum, nicht UTC: toISOString() liefert zwischen Mitternacht und
// 2 Uhr (Sommerzeit) noch den Vortag.
export const heute = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export function formatDatumZeile(datum) {
  const d = new Date(`${datum}T00:00:00`);
  if (Number.isNaN(d.getTime())) return datum;
  const label = d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return datum === heute() ? `heute, ${label}` : label;
}

// Touch-Geraete oeffnen den nativen Picker bei einem Tap irgendwo auf das
// Feld. Auf dem Desktop tut ein unsichtbares Feld das nicht: Chrome und
// Firefox oeffnen den Kalender nur ueber das Icon, und das ist bei
// opacity: 0 nicht zu treffen. Darum dort ein sichtbares Feld.
const istTouch =
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches ?? false);

// Ein-Tap-Datumswahl auf Touch: das native Datumsfeld liegt unsichtbar
// ueber dem Knopf. Vorher brauchte es zwei Taps.
function DatumsFeld({
  datum,
  setDatum,
  required = false,
  platzhalter = 'Datum wählen',
  format = formatDatumZeile,
}) {
  const feldRef = useRef(null);

  const handleChange = (e) => {
    if (e.target.value) setDatum(e.target.value);
  };

  if (!istTouch) {
    return (
      <input
        ref={feldRef}
        type="date"
        className="erf-von-btn datum-feld"
        value={datum}
        onChange={handleChange}
        onClick={() => {
          // Klick irgendwo im Feld oeffnet den Kalender, nicht nur das Icon
          try {
            feldRef.current?.showPicker?.();
          } catch {
            // showPicker wirft, wenn der Klick nicht als Nutzergeste zaehlt —
            // dann bleibt die Tastatureingabe, das Feld ist ja sichtbar.
          }
        }}
        aria-label="Datum ändern"
        required={required}
      />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="erf-von-btn" tabIndex={-1} aria-hidden="true">
        {datum ? format(datum) : platzhalter}
      </button>
      <input
        type="date"
        value={datum}
        onChange={handleChange}
        aria-label="Datum ändern"
        required={required}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          border: 0,
          padding: 0,
          margin: 0,
          background: 'transparent',
          cursor: 'pointer',
          zIndex: 1,
        }}
      />
    </div>
  );
}

export default DatumsFeld;
