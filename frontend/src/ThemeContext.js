import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return JSON.parse(saved);
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [activeTheme, setActiveTheme] = useState(() => {
    return localStorage.getItem('theme') || 'classic';
  });

  // Dark Mode Handler
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(isDark));
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Theme Handler
  useEffect(() => {
    localStorage.setItem('theme', activeTheme);
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [activeTheme]);

  const toggleDarkMode = () => setIsDark(prev => !prev);
  const setTheme = (theme) => setActiveTheme(theme);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDarkMode, activeTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);