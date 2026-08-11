export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Semantische Namen — zeigen auf die Tokens in src/tokens.css
        brand: {
          DEFAULT: 'var(--brand)',
          strong: 'var(--brand-strong)',
          soft: 'var(--brand-soft)',
        },
        'on-brand': 'var(--on-brand)',
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
          text: 'var(--accent-text)',
          line: 'var(--accent-line)',
        },
        ok: {
          DEFAULT: 'var(--ok)',
          soft: 'var(--ok-soft)',
          line: 'var(--ok-line)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          soft: 'var(--danger-soft)',
        },
        surface: {
          DEFAULT: 'var(--surface)',
          '2': 'var(--surface-2)',
          '3': 'var(--surface-3)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        bg: 'var(--bg)',
        text: {
          DEFAULT: 'var(--text)',
          '2': 'var(--text-2)',
          '3': 'var(--text-3)',
        },
        /* ÜBERGANGS-ALIAS — entfernen nach Screen-Phasen
           (alte primary-/secondary-Skalen, gemappt auf die neuen
           Tokens via Alias-Variablen in src/tokens.css) */
        primary: {
          25: 'var(--primary-25)',
          50: 'var(--primary-50)',
          100: 'var(--primary-100)',
          200: 'var(--primary-200)',
          300: 'var(--primary-300)',
          400: 'var(--primary-400)',
          500: 'var(--primary-500)',
          600: 'var(--primary-600)',
          700: 'var(--primary-700)',
          800: 'var(--primary-800)',
          900: 'var(--primary-900)',
          950: 'var(--primary-950)',
        },
        secondary: {
          25: 'var(--secondary-25)',
          50: 'var(--secondary-50)',
          100: 'var(--secondary-100)',
          200: 'var(--secondary-200)',
          300: 'var(--secondary-300)',
          400: 'var(--secondary-400)',
          500: 'var(--secondary-500)',
          600: 'var(--secondary-600)',
          700: 'var(--secondary-700)',
          800: 'var(--secondary-800)',
          900: 'var(--secondary-900)',
          950: 'var(--secondary-950)',
        },
      },
      borderRadius: {
        card: 'var(--r-card)',
        btn: 'var(--r-btn)',
        pill: 'var(--r-pill)',
        'card-lg': 'var(--r-card)', /* ÜBERGANGS-ALIAS — entfernen nach Screen-Phasen */
      },
      boxShadow: {
        card: 'var(--shadow)',
        'card-hover': 'var(--shadow)', /* ÜBERGANGS-ALIAS — entfernen nach Screen-Phasen */
        'card-elevated': 'var(--shadow)', /* ÜBERGANGS-ALIAS — entfernen nach Screen-Phasen */
      },
      /* ÜBERGANGS-ALIAS — entfernen nach Screen-Phasen (bg-card, border-card …) */
      backgroundColor: {
        card: 'var(--surface)',
        'card-highlight': 'var(--surface-2)',
      },
      borderColor: {
        card: 'var(--line)',
      },
      /* ÜBERGANGS-ALIAS — entfernen nach Screen-Phasen (p-card, gap-section …) */
      spacing: {
        'card': '1.25rem',
        'card-sm': '1rem',
        'card-lg': '1.75rem',
        'section': '1.25rem',
      },
      height: {
        control: 'var(--control-h)',
        field: 'var(--field-h)',
      },
      minWidth: {
        tap: 'var(--tap-min)',
      },
      minHeight: {
        tap: 'var(--tap-min)',
      },
    },
  },
  plugins: [],
}
