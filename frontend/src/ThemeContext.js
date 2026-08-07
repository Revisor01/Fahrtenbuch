import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

// Eigener Schlüssel für die neue Drei-Wert-Logik
const STORAGE_KEY = 'fahrtenbuch-mode';

// theme-color für die Browser-Chrome-Leiste (PWA)
const THEME_COLOR_LIGHT = '#0F5257';
const THEME_COLOR_DARK = '#071214';

const VALID_MODES = ['light', 'dark', 'system'];

function readInitialMode() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (VALID_MODES.includes(saved)) return saved;

  // Migration alter Einstellungen: 'darkMode' (bool) + 'theme'
  // (neun Farbthemes). Die Farbthemes entfallen ersatzlos;
  // eine explizite Hell/Dunkel-Wahl bleibt erhalten.
  const legacyDark = localStorage.getItem('darkMode');
  localStorage.removeItem('darkMode');
  localStorage.removeItem('theme');
  if (legacyDark === 'true') return 'dark';
  if (legacyDark === 'false') return 'light';
  return 'system';
}

function getSystemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(readInitialMode);
  const [systemDark, setSystemDark] = useState(getSystemPrefersDark);

  // Systemeinstellung live verfolgen
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    // Safari < 14
    mq.addListener(handler);
    return () => mq.removeListener(handler);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemDark);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    const root = document.documentElement;
    // Altlast der Farbthemes entfernen — tokens.css bedient .dark
    root.removeAttribute('data-theme');
    root.classList.toggle('dark', isDark);

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? THEME_COLOR_DARK : THEME_COLOR_LIGHT);
    }
  }, [isDark]);

  const setMode = (next) => {
    if (VALID_MODES.includes(next)) setModeState(next);
  };

  // toggleDarkMode bleibt für Bestandsaufrufer erhalten:
  // schaltet explizit zwischen hell und dunkel um
  const toggleDarkMode = () => setModeState(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, setMode, isDark, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
