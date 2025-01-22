import { Moon, Sun, Palette } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { useState } from 'react';

export default function ThemeToggle() {
  const { isDark, toggleDarkMode, activeTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { id: 'classic', name: 'Classic' },
    { id: 'monochrome', name: 'Monochrome' },
    { id: 'slate', name: 'Slate' },
    { id: 'sunset', name: 'Sunset' },
    { id: 'mint', name: 'Mint' }
  ];

  return (
    <div className="relative flex gap-2">
      <button
        onClick={toggleDarkMode}
        className="btn-primary flex items-center justify-center gap-1 whitespace-nowrap"
        title={isDark ? 'Light Mode' : 'Dark Mode'}
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn-primary flex items-center justify-center gap-1 whitespace-nowrap"
          title="Farbthema ändern"
        >
          <Palette size={16} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-primary-100 dark:border-primary-800 z-50">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  setTheme(theme.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/50 
                  ${activeTheme === theme.id ? 'bg-primary-100 dark:bg-primary-800' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary-500" />
                  {theme.name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}