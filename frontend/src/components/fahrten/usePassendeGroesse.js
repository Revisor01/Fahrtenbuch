import { useCallback, useEffect, useRef, useState } from 'react';

// Schrift so gross wie moeglich, so klein wie noetig.
//
// Die Zusammenfassung ueber der Fahrtenliste zeigt drei gleich breite Spalten.
// „14,95 €" passt dort in 20px, ein ganzer Jahreszeitraum („12.480 km",
// „4.368,00 €") nicht. Eine feste kleinere Groesse waere die schlechtere
// Loesung: Dann stuenden alle Monate klein da, nur damit der seltene Fall
// passt. Kuerzen mit „…" ist bei Betraegen keine Option — eine halbe Zahl ist
// schlimmer als eine kleine.
//
// Deshalb misst dieser Hook den tatsaechlichen Platzbedarf und verkleinert nur
// so weit, wie es dieser Wert verlangt (Simon 16.08.).
//
// CSS kann das nicht: `clamp()` skaliert am Viewport, nicht am Inhalt — eine
// lange Zahl auf einem breiten Geraet bekaeme dort faelschlich die volle
// Groesse.

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
      // Immer von der vollen Groesse aus messen, sonst schrumpft der Wert bei
      // jedem Durchlauf weiter und findet nie wieder zurueck.
      elemente.forEach((el) => { el.style.fontSize = `${max}px`; });

      // Der engste Wert bestimmt die Groesse aller drei — unterschiedlich
      // grosse Zahlen in einer Zeile laesen sich wie verschiedene Angaben.
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
