import React, { useEffect, useRef } from 'react';

// Bottom-Sheet nach Design-Spec (Redesign 2026):
// - mobil: --surface, border-radius 28px 28px 0 0, Griff 44×5px --line-strong,
//   Overlay rgba(8,32,31,.42), Schatten 0 -8px 40px -12px, Einblenden 300ms
// - Desktop (≥768px): dieselbe Komponente als zentriertes Modal-Panel
//   (max-width, --r-card)
// - A11y: Fokus fangen, Esc schließt, aria-modal, Fokus-Rückgabe auf Auslöser
// - prefers-reduced-motion: Einblenden ohne Transform (globale Regel + CSS)

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function Sheet({ isOpen, onClose, title, ariaLabel, children }) {
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    // Auslöser merken, um den Fokus beim Schließen zurückzugeben
    triggerRef.current = document.activeElement;

    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector(FOCUSABLE_SELECTOR);
    (firstFocusable || panel)?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="sheet-root">
      <div className="sheet-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="sheet-panel"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        tabIndex={-1}
      >
        <div className="sheet-handle" aria-hidden="true" />
        {title && <h2 className="sheet-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export default Sheet;
