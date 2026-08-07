import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import ErfassungsFlow from '../components/erfassung/ErfassungsFlow';

// Zentraler Einstieg in den zweistufigen Erfassungsflow (Redesign 2026).
// Alle „Neue Fahrt"-Einstiege der App (Dashboard-Button, später FAB und
// „Wiederholen") öffnen den Flow über useErfassung().open(prefill?).
//
// prefill (alles optional):
//   { vonOrtId, nachOrtId, anlass, abrechnung, datum, kilometer, mitRueckfahrt }
// Mit nachOrtId startet der Flow direkt in Schritt 2 („Wiederholen"-Fall).

const ErfassungContext = createContext(null);

export function ErfassungProvider({ children }) {
  const [state, setState] = useState({ offen: false, prefill: null, instanz: 0 });

  const open = useCallback((prefill = null) => {
    // instanz als key → der Flow startet bei jedem Öffnen mit frischem Zustand
    setState((s) => ({ offen: true, prefill, instanz: s.instanz + 1 }));
  }, []);

  const close = useCallback(() => {
    setState((s) => ({ ...s, offen: false }));
  }, []);

  const value = useMemo(() => ({ open, close, isOpen: state.offen }), [open, close, state.offen]);

  return (
    <ErfassungContext.Provider value={value}>
      {children}
      {state.offen && (
        <ErfassungsFlow
          key={state.instanz}
          isOpen={state.offen}
          prefill={state.prefill}
          onClose={close}
        />
      )}
    </ErfassungContext.Provider>
  );
}

export function useErfassung() {
  const ctx = useContext(ErfassungContext);
  if (!ctx) {
    throw new Error('useErfassung muss innerhalb von <ErfassungProvider> verwendet werden');
  }
  return ctx;
}
