import { useCallback, useEffect, useRef, useState } from 'react';

// Sortieren per Ziehen — fuer Maus, Finger und Stift mit einer Implementierung.
//
// Warum nicht HTML5-Drag & Drop (draggable + dragstart/drop)?
// Mobile Safari feuert diese Events schlicht nicht; ein Wisch scrollt
// stattdessen die Seite. Das Sortieren war auf dem iPhone damit tot.
// Pointer-Events decken alle drei Eingabearten ab und funktionieren
// ueberall dort, wo die App laeuft.
//
// Der Hook liefert nur Props und Zustand — das Markup bleibt bei den
// Bereichen. Das ist Absicht: die Orte-Liste rendert dieselbe Reihenfolge
// zweimal (Desktop-Tabelle und mobile Liste) und speist beide aus einem
// gemeinsamen Ziehzustand.
//
// Aufruf:
//   const sortieren = useSortierbareListe({ anzahl, onReorder, deaktiviert });
//   <div {...sortieren.zeilenProps(index)} className={...sortieren.zeilenKlasse(index)}>
//     <button className="set-grip" {...sortieren.griffProps(index, label)} />
//
// `onReorder(von, nach)` wird genau einmal pro Zug ausgeloest, erst beim
// Loslassen. Das Speichern (PUT auf /sort) liegt beim Aufrufer.

export default function useSortierbareListe({ anzahl, onReorder, deaktiviert = false }) {
  // Index der gezogenen Zeile und Index der Position, an der sie landen wuerde
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  // Laufender Zug: alles, was die Move-Handler brauchen, ohne Re-Render
  const zug = useRef(null);
  // Registrierte Zeilen-Elemente je Index — daraus lesen wir beim Ziehen die
  // Rechtecke, um zu bestimmen, ueber welcher Zeile der Zeiger steht.
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

  // Sicherheitsnetz: bricht der Zug ab, weil die Komponente verschwindet,
  // bleibt sonst der Zustand haengen.
  useEffect(() => () => { zug.current = null; }, []);

  // Merkt sich die DOM-Elemente einer Zeile. Je Index koennen mehrere
  // Elemente registriert sein: die Orte rendern dieselbe Reihenfolge zweimal
  // (Desktop-Tabelle und mobile Liste), von denen immer nur eine sichtbar
  // ist. Beim Aushaengen raeumen wir den Eintrag wieder weg.
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

  // Ueber welcher Zeile steht der Zeiger gerade? Wir vergleichen gegen die
  // Mitte jeder Zeile: solange der Zeiger die Mitte der Nachbarzeile nicht
  // ueberschritten hat, bleibt die Vorschau stehen. Das verhindert das
  // Flackern, das entsteht, wenn schon der erste Pixel Ueberlappung zaehlt.
  const zielIndexFinden = useCallback((clientY, startIndex) => {
    let ziel = startIndex;
    zeilenRefs.current.forEach((menge, index) => {
      if (index >= anzahlRef.current) return;
      menge.forEach((element) => {
        const rect = element.getBoundingClientRect();
        // Die unsichtbare Variante (display:none) liefert lauter Nullen und
        // faellt damit von selbst raus.
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

    // Wichtig fuer iOS: verhindert, dass der Wisch als Seiten-Scroll oder
    // als Textauswahl endet. Zusammen mit `touch-action: none` am Griff
    // gehoert die Geste damit uns.
    e.preventDefault();

    const griff = e.currentTarget;
    try {
      // Ab hier landen alle Pointer-Events bei diesem Griff — auch wenn der
      // Finger die Zeile laengst verlassen hat.
      griff.setPointerCapture(e.pointerId);
    } catch (fehler) {
      // Aeltere Engines ohne Capture: der Zug laeuft trotzdem, nur weniger
      // robust am Rand des Fensters.
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

  // Tastatur bleibt gleichwertig: Pfeil hoch/runter auf dem fokussierten
  // Griff verschiebt die Zeile um eine Position.
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

  // Zusatzklassen fuer die Zeile — die vorhandenen Klassen aus index.css.
  // `is-dragover` markiert die Einfuegestelle, nie die gezogene Zeile selbst.
  const zeilenKlasse = useCallback((index) => {
    if (dragIndex === null) return '';
    if (dragIndex === index) return ' is-dragging';
    if (overIndex !== index) return '';
    // Kommt die Zeile von oben, rutscht sie unter das Ziel — dann gehoert
    // die Linie an die Unterkante.
    return dragIndex < index ? ' is-dragover is-dragover-unten' : ' is-dragover';
  }, [dragIndex, overIndex]);

  // Props fuer den Griff. `label` wandert in title/aria-label, damit jede
  // Zeile ansagbar bleibt.
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
