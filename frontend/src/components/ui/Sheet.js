import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { overlayAnmelden } from '../../utils/overlayStack';
import { tastaturAbonnieren, tastaturHoehe } from '../../utils/tastatur';

// Bottom-Sheet nach Design-Spec (Redesign 2026):
// - mobil: --surface, border-radius 28px 28px 0 0, Griff 44×5px --line-strong,
//   Overlay rgba(8,32,31,.42), Schatten 0 -8px 40px -12px, Einblenden 300ms
// - Desktop (≥768px): dieselbe Komponente als zentriertes Modal-Panel
//   (max-width, --r-card)
// - A11y: Fokus fangen, Esc schließt, aria-modal, Fokus-Rückgabe auf Auslöser
// - prefers-reduced-motion: Einblenden ohne Transform (globale Regel + CSS)

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Luft zwischen dem fokussierten Feld und dem Rand des Scrollbereichs, wenn
// das Feld in den sichtbaren Ausschnitt geholt wird. Ohne diesen Abstand
// klebt das Feld exakt an der Tastaturkante — ein darunter liegender
// Fehlertext oder Autocomplete-Vorschlag bliebe verdeckt.
const FOKUS_ABSTAND = 12;

// Ab hier gilt ein Zug nach unten als Schliessen statt als Zurueckfedern.
// 96px entspricht etwa der Griffzone plus Titelzeile — kurz genug, dass die
// Geste nicht anstrengend wird, lang genug, dass ein Verrutschen beim Tippen
// das Sheet nicht versehentlich schliesst.
const SCHLIESS_SCHWELLE = 96;

// Schneller Wisch schliesst auch bei kurzem Weg: unter dieser Geschwindigkeit
// (Pixel pro Millisekunde) zaehlt allein die Strecke.
const SCHLIESS_TEMPO = 0.5;

// Eigener Stapel der offenen Sheets fuer die Esc-Taste.
//
// Warum nicht ein Listener je Sheet: Jeder Sheet haengte frueher seinen
// eigenen keydown-Listener an document. e.stopPropagation() bremst aber nur
// die Weitergabe an ANDERE Knoten — Listener auf demselben Ziel (document)
// laufen trotzdem alle. Esc schloss dadurch gestapelte Sheets gleichzeitig:
// Wer aus dem Erfassungsflow heraus den Mitfahrer-Dialog offen hatte, verlor
// mit einem Tastendruck auch die halb erfasste Fahrt.
//
// Jetzt gibt es genau EINEN globalen Esc-Handler. Er schliesst nur den
// obersten Eintrag — dieselbe LIFO-Regel, die der Android-Zurueck-Button
// ueber utils/overlayStack schon nutzt.
const escStapel = [];

const escBehandeln = (e) => {
  if (e.key !== 'Escape') return;
  const oben = escStapel[escStapel.length - 1];
  if (!oben) return;
  e.stopPropagation();
  oben.schliessen();
};

// Meldet ein Sheet am Esc-Stapel an und gibt die Abmeldefunktion zurueck.
// `schliessen` ist ein Ref-Halter, damit ein neuer onClose-Callback den
// Eintrag nicht austauschen muss.
function escAnmelden(refHalter) {
  const eintrag = { schliessen: () => refHalter.current?.() };
  escStapel.push(eintrag);
  if (escStapel.length === 1) {
    document.addEventListener('keydown', escBehandeln);
  }
  return () => {
    const index = escStapel.indexOf(eintrag);
    if (index !== -1) escStapel.splice(index, 1);
    if (escStapel.length === 0) {
      document.removeEventListener('keydown', escBehandeln);
    }
  };
}

function Sheet({ isOpen, onClose, title, ariaLabel, wide = false, children }) {
  const panelRef = useRef(null);
  const koerperRef = useRef(null);
  const triggerRef = useRef(null);

  // Aktueller Zugweg in Pixeln. Nur waehrend der Geste gesetzt; null heisst
  // "keine Geste aktiv" und laesst die CSS-Animation unangetastet.
  const [zugY, setZugY] = useState(null);
  const gesteRef = useRef(null);

  // onClose ueber ein Ref halten: Viele Aufrufer geben den Callback inline mit
  // ({() => setX(null)}) und erzeugen bei jedem Render eine neue Funktion.
  // Haengt ein Effekt daran, laeuft er staendig neu. Genau das setzte den
  // Fokus zurueck aufs Panel und scrollte den Inhalt mitten im Tippen auf 0.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const schliessen = useCallback(() => onCloseRef.current?.(), []);

  // Am globalen Overlay-Stapel anmelden, damit der Android-Zurueck-Button das
  // oberste offene Sheet schliesst statt die App zu verlassen. Zusammen mit
  // dem Esc-Stapel: beide gelten LIFO und schliessen nur das oberste Overlay.
  useEffect(() => {
    if (!isOpen) return undefined;
    const abOverlay = overlayAnmelden(schliessen);
    const abEsc = escAnmelden(onCloseRef);
    return () => {
      abEsc();
      abOverlay();
    };
  }, [isOpen, schliessen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    // Auslöser merken, um den Fokus beim Schließen zurückzugeben
    triggerRef.current = document.activeElement;

    // Fokus auf das Panel selbst, nicht auf das erste bedienbare Element:
    // Steht dort ein Button am Ende (wie in den Neuigkeiten), scrollte der
    // Browser das Sheet beim Oeffnen sofort ganz nach unten. Tab springt von
    // hier aus weiterhin ins erste Element, Esc schliesst.
    const panel = panelRef.current;
    panel?.focus();
    // Der Scrollbereich ist seit der Kopf/Koerper-Trennung der Koerper, nicht
    // mehr das Panel selbst.
    koerperRef.current?.scrollTo?.(0, 0);

    // Nur noch Tab: Esc laeuft ueber den Stapel oben, damit ein Tastendruck
    // genau ein Sheet schliesst.
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab' || !panel) return;

      // Fokus im Sheet fangen
      const focusables = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR))
        .filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      // Fokus-Rückgabe auf den Auslöser
      if (triggerRef.current && typeof triggerRef.current.focus === 'function') {
        triggerRef.current.focus();
      }
    };
    // Bewusst nur [isOpen]: Fokus setzen und nach oben scrollen darf genau
    // einmal beim Oeffnen passieren, nicht bei jedem neuen onClose-Callback.
  }, [isOpen]);

  // ---------- Fokussiertes Feld sichtbar halten ----------
  // Die Tastaturhoehe schrumpft das Sheet zwar (--tastatur in index.css), aber
  // niemand holte das Feld in den verbleibenden Ausschnitt: Steht es weiter
  // unten im Formular, liegt es nach dem Schrumpfen ausserhalb von
  // .sheet-koerper — der Nutzer sah seine eigene Eingabe nicht (TestFlight 19).
  //
  // Zwei Ausloeser, weil es zwei Faelle gibt:
  //   1. Tastatur faehrt hoch -> Geometrie aendert sich, Fokus steht schon.
  //   2. Tastatur ist offen, der Nutzer springt ins naechste Feld -> Geometrie
  //      bleibt, der Fokus wandert.
  useEffect(() => {
    if (!isOpen) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    let frame = null;

    const sichtbarMachen = () => {
      const koerper = koerperRef.current;
      const ziel = document.activeElement;
      if (!koerper || !ziel || !koerper.contains(ziel)) return;

      const rahmen = koerper.getBoundingClientRect();
      const feld = ziel.getBoundingClientRect();

      // scrollIntoView haetten wir auch nehmen koennen, aber es scrollt in
      // WKWebView zusaetzlich den aeusseren Viewport mit und schiebt dabei das
      // ganze Sheet aus dem Bild. Deshalb von Hand und ausschliesslich auf dem
      // Koerper: Nur was wirklich ueber- oder untersteht, wird ausgeglichen.
      const untenDrueber = feld.bottom - (rahmen.bottom - FOKUS_ABSTAND);
      const obenDrueber = rahmen.top + FOKUS_ABSTAND - feld.top;

      if (untenDrueber > 0) {
        koerper.scrollTop += untenDrueber;
      } else if (obenDrueber > 0) {
        koerper.scrollTop -= obenDrueber;
      }
    };

    // Erst nach dem naechsten Bild rechnen: Beim Hochfahren der Tastatur ist
    // --tastatur zwar gesetzt, die neue max-height des Panels aber noch nicht
    // umgebrochen. Ohne die Verzoegerung scrollt es gegen die alte Geometrie.
    // Der zweite Anlauf per Timeout faengt die Animation der Tastatur ab, die
    // laenger laeuft als ein Frame.
    // Nicht auf feste Zeitpunkte verlassen: Wann keyboardWillShow feuert und
    // wie lange iOS die Tastatur einblendet, ist nicht zugesichert. Statt
    // einmal nach einem Frame und einmal nach 320ms zu rechnen, wird so lange
    // nachgefuehrt, wie sich die Geometrie noch bewegt — und danach noch kurz
    // weiter, damit auch ein spaeter Nachschlag von iOS aufgefangen wird.
    // Ausgleich nach jeder Hoehenaenderung — ereignisgesteuert statt nach
    // festen Zeitpunkten.
    //
    // Zeitsteuerung war hier zweimal falsch: Ein fester Zeitpunkt (320ms)
    // verfehlt eine langsamer einfahrende Tastatur, und "warten, bis die
    // Hoehe still steht" bricht sofort ab, weil beim Aufruf noch gar nichts
    // in Bewegung ist. Der ResizeObserver meldet dagegen genau dann, wenn
    // sich die Hoehe des Koerpers tatsaechlich geaendert hat — egal wie
    // lange iOS dafuer braucht.
    const nachrechnen = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        sichtbarMachen();
      });
    };

    const beiFokus = (e) => {
      // Nur Eingaben: Ein fokussierter Knopf (etwa nach dem Oeffnen das Panel
      // selbst) soll den Inhalt nicht verschieben.
      const ziel = e.target;
      if (!ziel || !ziel.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      nachrechnen();
    };

    panel.addEventListener('focusin', beiFokus);
    // Auch waehrend des Tippens nachfuehren: Die Tastatur aendert ihre Hoehe,
    // wenn die Vorschlagsleiste erscheint oder auf Emoji umgeschaltet wird.
    // Ohne das rutscht das Feld mitten im Schreiben wieder darunter.
    panel.addEventListener('input', beiFokus);

    // Der eigentliche Ausloeser: Sobald die Tastatur die Hoehe des
    // Scrollbereichs veraendert, wird nachgerechnet. Das greift bei jeder
    // Einblendgeschwindigkeit und auch dann, wenn iOS die Hoehe in mehreren
    // Stufen meldet.
    let beobachter = null;
    if (typeof ResizeObserver !== 'undefined' && koerperRef.current) {
      beobachter = new ResizeObserver(() => {
        // Nur nachfuehren, solange wirklich in einem Feld getippt wird.
        const ziel = document.activeElement;
        if (ziel && koerperRef.current?.contains(ziel)) nachrechnen();
      });
      beobachter.observe(koerperRef.current);
    }

    // Hoehenaenderung der Tastatur. Im Browser meldet sich hier nie jemand —
    // dort bleibt --tastatur 0px und der visuelle Viewport regelt es selbst.
    const abTastatur = tastaturAbonnieren((hoehe) => {
      if (hoehe > 0) nachrechnen();
    });

    // Sheet wurde bei bereits offener Tastatur geoeffnet (etwa ein gestapeltes
    // Sheet aus einem Formular heraus): Dann kommt kein keyboardWillShow mehr.
    if (tastaturHoehe() > 0) nachrechnen();

    return () => {
      panel.removeEventListener('focusin', beiFokus);
      panel.removeEventListener('input', beiFokus);
      beobachter?.disconnect();
      abTastatur();
      if (frame) cancelAnimationFrame(frame);

    };
    // Wie beim Effekt darueber bewusst nur [isOpen]: Der Handler greift ueber
    // Refs auf Panel und Koerper zu und muss nicht bei jedem Render neu haengen.
  }, [isOpen]);

  // ---------- Wischen zum Schliessen ----------
  // Warum von Hand statt per Bibliothek: Es geht um genau eine Achse und eine
  // einzige Bedingung (Inhalt steht oben). Touch-Events reichen dafuer, und
  // das Sheet bleibt ohne zusaetzliche Abhaengigkeit.

  // Ziehen darf nur schliessen, wenn der Inhalt bereits ganz oben steht —
  // sonst kaempft die Geste mit dem Scrollen des Sheet-Inhalts. Am Griff und
  // an der Titelzeile (ausserhalb des Scrollbereichs) gilt das immer.
  const darfZiehen = (ziel) => {
    const koerper = koerperRef.current;
    if (!koerper) return true;
    if (!koerper.contains(ziel)) return true;
    return koerper.scrollTop <= 0;
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const beruehrung = e.touches[0];
    if (!darfZiehen(e.target)) return;
    gesteRef.current = {
      startY: beruehrung.clientY,
      startZeit: Date.now(),
      // Erst ab der ersten echten Bewegung nach unten uebernehmen — sonst
      // verschluckt das Sheet Tipp-Ereignisse auf Schaltflaechen im Kopf.
      aktiv: false,
    };
  };

  const handleTouchMove = (e) => {
    const geste = gesteRef.current;
    if (!geste) return;
    const abstand = e.touches[0].clientY - geste.startY;

    if (!geste.aktiv) {
      // Nach oben gewischt: Die Geste gehoert dem Inhalt, nicht dem Sheet.
      if (abstand <= 0) {
        gesteRef.current = null;
        return;
      }
      if (abstand < 6) return;
      geste.aktiv = true;
    }

    // Waehrend des Ziehens darf der Inhalt nicht mitscrollen.
    if (e.cancelable) e.preventDefault();
    // Nie nach oben ueber die Ruhelage hinaus.
    setZugY(Math.max(0, abstand));
  };

  const handleTouchEnd = () => {
    const geste = gesteRef.current;
    gesteRef.current = null;
    if (!geste || !geste.aktiv) {
      setZugY(null);
      return;
    }
    const weg = zugY || 0;
    const tempo = weg / Math.max(1, Date.now() - geste.startZeit);
    if (weg > SCHLIESS_SCHWELLE || tempo > SCHLIESS_TEMPO) {
      schliessen();
    }
    // Zurueck auf null: Das Sheet federt ueber die CSS-Transition in die
    // Ruhelage. Beim Schliessen verschwindet es ohnehin.
    setZugY(null);
  };

  if (!isOpen) return null;

  // Per Portal direkt an den <body>: Bisher rendete das Sheet dort, wo die
  // aufrufende Komponente steht — also INNERHALB der App-Shell und damit im
  // selben Stapelkontext wie die Navigationsleiste. Deren Flaeche lag dadurch
  // mobil ueber dem unteren Rand des Sheets, der Inhalt war dort nicht
  // erreichbar. Am body gibt es diesen Konflikt nicht.
  return createPortal(
    <div className={`sheet-root${wide ? ' sheet-root-wide' : ''}`}>
      <div className="sheet-overlay" onClick={schliessen} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`sheet-panel${wide ? ' sheet-panel-wide' : ''}${
          zugY !== null ? ' sheet-panel-zieht' : ''
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        tabIndex={-1}
        style={zugY ? { transform: `translateY(${zugY}px)` } : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Kopf bleibt stehen: Griff und Titel duerfen nie wegscrollen —
            sonst ist bei langen Inhalten die Schliess-Geste nicht erreichbar. */}
        <div className="sheet-kopf">
          <div className="sheet-handle" aria-hidden="true" />
          {title && <h2 className="sheet-title">{title}</h2>}
        </div>
        {/* Nur der Inhalt scrollt — dadurch bleibt das Sheet immer so hoch wie
            der Bildschirm erlaubt, egal wie lang das Formular ist. */}
        <div className="sheet-koerper" ref={koerperRef}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Sheet;
