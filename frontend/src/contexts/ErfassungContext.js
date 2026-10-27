import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ErfassungsFlow from '../components/erfassung/ErfassungsFlow';
import { AppContext } from './AppContext';

// Einstieg in den Erfassungsflow: useErfassung().open(prefill?) mit { vonOrtId, nachOrtId, anlass, abrechnung, datum, kilometer, mitRueckfahrt }; mit nachOrtId direkt Schritt 2.

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

  // Beim Abmelden schließen, der Flow wird hier gerendert und überlebt sonst den Wechsel zur Anmeldemaske.
  const { isLoggedIn } = useContext(AppContext) || {};
  useEffect(() => {
    if (!isLoggedIn) close();
  }, [isLoggedIn, close]);

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
