import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { overlayAnmelden } from '../../utils/overlayStack';
import { tastaturAbonnieren, tastaturHoehe } from '../../utils/tastatur';
import { useToast } from './Toast';

// Bottom-Sheet, ab 768 px zentriertes Panel; fängt den Fokus, Esc schließt, respektiert reduzierte Bewegung.

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Abstand zur Tastaturkante, damit Fehlertext oder Vorschläge darunter sichtbar bleiben.
const FOKUS_ABSTAND = 12;

// Ab 96 px schließt ein Zug nach unten, weniger soll beim Tippen nichts auslösen.
const SCHLIESS_SCHWELLE = 96;

// Schneller Wisch schließt auch bei kurzem Weg.
const SCHLIESS_TEMPO = 0.5;

// Ein globaler Esc-Stapel, weil Listener auf document alle gleichzeitig liefen und gestapelte Sheets zusammen schlossen.
const escStapel = [];

const escBehandeln = (e) => {
  if (e.key !== 'Escape') return;
  const oben = escStapel[escStapel.length - 1];
  if (!oben) return;
  e.stopPropagation();
  oben.schliessen();
};

// Meldet ein Sheet am Esc-Stapel an; `schliessen` ist ein Ref-Halter.
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

function Sheet({ isOpen, onClose, title, ariaLabel, wide = false, schutz = false, onZurueck, children }) {
  const panelRef = useRef(null);
  const koerperRef = useRef(null);
  const triggerRef = useRef(null);

  // Zugweg in Pixeln, null heißt keine Geste.
  const [zugY, setZugY] = useState(null);
  const gesteRef = useRef(null);

  // onClose als Ref, weil inline-Callbacks sonst den Fokus-Effekt bei jedem Render auslösen.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // `schutz` prüft alle vier Schließwege an einer Stelle und fragt per Toast statt zweitem Overlay.
  const schutzRef = useRef(schutz);
  schutzRef.current = schutz;
  const toast = useToast();
  const verwerfenBestaetigt = useRef(false);

  // Gibt es eine Ebene darunter, geht Zurück dorthin statt zu schließen.
  const zurueckRef = useRef(onZurueck);
  zurueckRef.current = onZurueck;

  const schliessen = useCallback(() => {
    if (zurueckRef.current) {
      zurueckRef.current();
      return;
    }
    if (schutzRef.current && !verwerfenBestaetigt.current) {
      toast.error('Eingaben verwerfen?', {
        bleibt: true,
        actionLabel: 'Verwerfen',
        onAction: () => {
          verwerfenBestaetigt.current = true;
          onCloseRef.current?.();
        },
      });
      return;
    }
    onCloseRef.current?.();
  }, [toast]);

  // Beim erneuten Oeffnen wieder scharf stellen.
  useEffect(() => {
    if (isOpen) verwerfenBestaetigt.current = false;
  }, [isOpen]);

  // Halter fuer den Esc-Stapel, der einen Ref erwartet.
  const schliessenRef = useRef(schliessen);
  schliessenRef.current = schliessen;

  // Am Overlay-Stapel anmelden, damit Androids Zurück das oberste Sheet schließt.
  useEffect(() => {
    if (!isOpen) return undefined;
    const abOverlay = overlayAnmelden(schliessen);
    // Über schliessenRef, sonst umginge Esc die Schutzabfrage.
    const abEsc = escAnmelden(schliessenRef);
    return () => {
      abEsc();
      abOverlay();
    };
  }, [isOpen, schliessen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    // Auslöser merken, um den Fokus beim Schließen zurückzugeben
    triggerRef.current = document.activeElement;

    // Fokus aufs Panel, sonst scrollt ein Button am Ende das Sheet nach unten.
    const panel = panelRef.current;
    panel?.focus();
    // Gescrollt wird der Körper.
    koerperRef.current?.scrollTo?.(0, 0);

    // Nur Tab, Esc läuft über den Stapel.
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
    // Nur [isOpen], Fokus und Scroll genau einmal beim Öffnen.
  }, [isOpen]);

  // ---------- Fokussiertes Feld über der Tastatur halten: beim Hochfahren und beim Feldwechsel ----------
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

      // Von Hand statt scrollIntoView, das in WKWebView den äußeren Viewport mitschiebt.
      const untenDrueber = feld.bottom - (rahmen.bottom - FOKUS_ABSTAND);
      const obenDrueber = rahmen.top + FOKUS_ABSTAND - feld.top;

      if (untenDrueber > 0) {
        koerper.scrollTop += untenDrueber;
      } else if (obenDrueber > 0) {
        koerper.scrollTop -= obenDrueber;
      }
    };

    // Per ResizeObserver statt fester Zeitpunkte, weil iOS die Tastatur unterschiedlich lange einblendet.
    const nachrechnen = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = null;
        sichtbarMachen();
      });
    };

    const beiFokus = (e) => {
      // Nur Eingaben, ein fokussierter Knopf verschiebt nichts.
      const ziel = e.target;
      if (!ziel || !ziel.matches?.('input, textarea, select, [contenteditable="true"]')) return;
      nachrechnen();
    };

    panel.addEventListener('focusin', beiFokus);
    // Auch beim Tippen, die Tastaturhöhe ändert sich mit Vorschlagsleiste und Emoji.
    panel.addEventListener('input', beiFokus);

    let beobachter = null;
    if (typeof ResizeObserver !== 'undefined' && koerperRef.current) {
      beobachter = new ResizeObserver(() => {
        // Nur nachfuehren, solange wirklich in einem Feld getippt wird.
        const ziel = document.activeElement;
        if (ziel && koerperRef.current?.contains(ziel)) nachrechnen();
      });
      beobachter.observe(koerperRef.current);
    }

    // Im Browser bleibt --tastatur 0px.
    const abTastatur = tastaturAbonnieren((hoehe) => {
      if (hoehe > 0) nachrechnen();
    });

    // Bei schon offener Tastatur kommt kein keyboardWillShow mehr.
    if (tastaturHoehe() > 0) nachrechnen();

    return () => {
      panel.removeEventListener('focusin', beiFokus);
      panel.removeEventListener('input', beiFokus);
      beobachter?.disconnect();
      abTastatur();
      if (frame) cancelAnimationFrame(frame);

    };
    // Nur [isOpen], der Handler greift über Refs zu.
  }, [isOpen]);

  // ---------- Wischen zum Schließen, von Hand ohne Abhängigkeit ----------

  // Nur wenn der Inhalt oben steht, an Griff und Titelzeile immer.
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
      // Erst ab echter Bewegung, sonst gehen Tipps im Kopf verloren.
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
    // Die CSS-Transition federt zurück.
    setZugY(null);
  };

  if (!isOpen) return null;

  // Per Portal an den <body>, sonst lag die Navigationsleiste über dem unteren Rand.
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
