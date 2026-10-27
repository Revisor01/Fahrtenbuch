import { useCallback, useEffect, useRef, useState } from 'react';

// Sortieren per Pointer-Events, weil Mobile Safari kein HTML5-Drag & Drop auslöst; onReorder(von, nach) einmal beim Loslassen.

export default function useSortierbareListe({ anzahl, onReorder, deaktiviert = false }) {
  // Index der gezogenen Zeile und Index der Position, an der sie landen wuerde
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  // Laufender Zug: alles, was die Move-Handler brauchen, ohne Re-Render
  const zug = useRef(null);
  // Zeilen-Elemente je Index für die Rechtecke beim Ziehen.
  const zeilenRefs = useRef(new Map());

  // Frische Werte fuer die Handler, ohne sie neu zu binden
  const anzahlRef = useRef(anzahl);
  anzahlRef.current = anzahl;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;

  const aufraeumen = useCallback(() => {
    zug.current = null;
    setDragIndex(null);
    setOverIndex(null);
  }, []);

  // Sonst bleibt der Zustand hängen, wenn die Komponente verschwindet.
  useEffect(() => () => { zug.current = null; }, []);

  // Mehrere Elemente je Index, weil die Orte zweimal rendern.
  const zeileRef = useCallback((index) => (element) => {
    const map = zeilenRefs.current;
    if (element) {
      const menge = map.get(index) || new Set();
      menge.add(element);
      map.set(index, menge);
    } else {
      map.delete(index);
    }
  }, []);

  // Gegen die Zeilenmitte, sonst flackert die Vorschau.
  const zielIndexFinden = useCallback((clientY, startIndex) => {
    let ziel = startIndex;
    zeilenRefs.current.forEach((menge, index) => {
      if (index >= anzahlRef.current) return;
      menge.forEach((element) => {
        const rect = element.getBoundingClientRect();
        // Die unsichtbare Variante liefert Nullen und fällt raus.
        if (rect.height === 0) return;
        const mitte = rect.top + rect.height / 2;
        if (index < startIndex && clientY < mitte) {
          ziel = Math.min(ziel, index);
        } else if (index > startIndex && clientY > mitte) {
          ziel = Math.max(ziel, index);
        }
      });
    });
    return ziel;
  }, []);

  const handlePointerDown = useCallback((e, index) => {
    if (deaktiviert) return;
    // Nur die primaere Taste zieht; Rechtsklick und Zusatztasten nicht.
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    // Sonst wird der Wisch auf iOS zum Scrollen oder zur Textauswahl.
    e.preventDefault();

    const griff = e.currentTarget;
    try {
      // Alle Pointer-Events beim Griff, auch außerhalb der Zeile.
      griff.setPointerCapture(e.pointerId);
    } catch (fehler) {
      // Ohne Capture läuft der Zug trotzdem.
    }

    zug.current = { pointerId: e.pointerId, startIndex: index, griff };
    setDragIndex(index);
    setOverIndex(index);
  }, [deaktiviert]);

  const handlePointerMove = useCallback((e) => {
    const aktuell = zug.current;
    if (!aktuell || aktuell.pointerId !== e.pointerId) return;
    e.preventDefault();
    const ziel = zielIndexFinden(e.clientY, aktuell.startIndex);
    setOverIndex((vorher) => (vorher === ziel ? vorher : ziel));
  }, [zielIndexFinden]);

  const beenden = useCallback((e, abbrechen) => {
    const aktuell = zug.current;
    if (!aktuell || aktuell.pointerId !== e.pointerId) return;
    try {
      aktuell.griff.releasePointerCapture(e.pointerId);
    } catch (fehler) {
      // Capture war nie gesetzt oder ist schon weg — beides unkritisch.
    }
    const von = aktuell.startIndex;
    const nach = abbrechen ? von : zielIndexFinden(e.clientY, von);
    aufraeumen();
    if (!abbrechen && nach !== von) onReorderRef.current(von, nach);
  }, [aufraeumen, zielIndexFinden]);

  const handlePointerUp = useCallback((e) => beenden(e, false), [beenden]);
  const handlePointerCancel = useCallback((e) => beenden(e, true), [beenden]);

  // Pfeil hoch/runter verschiebt um eine Position.
  const handleKeyDown = useCallback((e, index) => {
    if (deaktiviert) return;
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      onReorderRef.current(index, index - 1);
    } else if (e.key === 'ArrowDown' && index < anzahlRef.current - 1) {
      e.preventDefault();
      onReorderRef.current(index, index + 1);
    }
  }, [deaktiviert]);

  // Props fuer die Zeile: nur die Referenz, damit wir ihr Rechteck kennen.
  const zeilenProps = useCallback((index) => ({ ref: zeileRef(index) }), [zeileRef]);

  // `is-dragover` markiert die Einfügestelle, nie die gezogene Zeile.
  const zeilenKlasse = useCallback((index) => {
    if (dragIndex === null) return '';
    if (dragIndex === index) return ' is-dragging';
    if (overIndex !== index) return '';
    // Von oben kommend gehört die Linie an die Unterkante.
    return dragIndex < index ? ' is-dragover is-dragover-unten' : ' is-dragover';
  }, [dragIndex, overIndex]);

  // `label` in title/aria-label, damit jede Zeile ansagbar bleibt.
  const griffProps = useCallback((index, label) => ({
    onPointerDown: (e) => handlePointerDown(e, index),
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
    onKeyDown: (e) => handleKeyDown(e, index),
    onContextMenu: (e) => e.preventDefault(), // langer Druck auf iOS
    disabled: deaktiviert,
    title: deaktiviert
      ? 'Suche leeren, um zu sortieren'
      : 'Ziehen zum Sortieren (Pfeiltasten: verschieben)',
    'aria-label': label,
  }), [handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel, handleKeyDown, deaktiviert]);

  return { zeilenProps, zeilenKlasse, griffProps, dragIndex, overIndex, istAmZiehen: dragIndex !== null };
}
