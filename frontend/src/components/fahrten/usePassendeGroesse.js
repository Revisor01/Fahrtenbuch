import { useCallback, useEffect, useRef, useState } from 'react';

// Schrift so groß wie möglich, so klein wie nötig, gemessen am Inhalt, weil clamp() am Viewport skaliert.

export default function usePassendeGroesse(werte, { max = 20, min = 12 } = {}) {
  const refs = useRef([]);
  const [groesse, setGroesse] = useState(max);

  const setzeRef = useCallback((i) => (el) => {
    refs.current[i] = el;
  }, []);

  useEffect(() => {
    const elemente = refs.current.filter(Boolean);
    if (elemente.length === 0) return undefined;

    const messen = () => {
      // Immer von voller Größe messen, sonst schrumpft es weiter.
      elemente.forEach((el) => { el.style.fontSize = `${max}px`; });

      // Der engste Wert bestimmt alle drei.
      let faktor = 1;
      elemente.forEach((el) => {
        if (el.scrollWidth > el.clientWidth && el.scrollWidth > 0) {
          faktor = Math.min(faktor, el.clientWidth / el.scrollWidth);
        }
      });

      const passend = faktor < 1
        ? Math.max(min, Math.floor(max * faktor))
        : max;

      elemente.forEach((el) => { el.style.fontSize = ''; });
      setGroesse(passend);
    };

    messen();

    // Drehen, Fenstergroesse, Tab-Wechsel: die Spaltenbreite aendert sich mit.
    const beobachter = new ResizeObserver(messen);
    elemente.forEach((el) => beobachter.observe(el));
    return () => beobachter.disconnect();
  }, [werte, max, min]);

  return { setzeRef, groesse };
}
