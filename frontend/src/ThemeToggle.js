import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './ThemeContext';

const OPTIONS = [
  { id: 'light', label: 'Hell', Icon: Sun },
  { id: 'dark', label: 'Dunkel', Icon: Moon },
  { id: 'system', label: 'System', Icon: Monitor },
];

export default function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      className="flex items-center gap-1 p-1 rounded-btn bg-surface-2"
      role="group"
      aria-label="Darstellung"
    >
      {OPTIONS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => setMode(id)}
          title={label}
          aria-pressed={mode === id}
          className={`flex items-center justify-center h-9 w-9 rounded-btn transition-colors duration-150 ${
            mode === id
              ? 'bg-surface text-brand shadow-card'
              : 'text-text-2 hover:bg-surface-3'
          }`}
        >
          <Icon size={17} />
        </button>
      ))}
    </div>
  );
}
