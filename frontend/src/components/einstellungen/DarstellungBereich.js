import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../ThemeContext';
import BereichKopf from './BereichKopf';

// „Darstellung" enthält genau drei Optionen: Hell / Dunkel / System.
// Keine Farbwahl (Spec Screen 7). Radio-Semantik, Auswahl trägt Form + Wort.
const OPTIONEN = [
  { id: 'light', titel: 'Hell', text: 'Immer das helle Design', Icon: Sun },
  { id: 'dark', titel: 'Dunkel', text: 'Immer das dunkle Design', Icon: Moon },
  { id: 'system', titel: 'System', text: 'Folgt der Einstellung deines Geräts', Icon: Monitor },
];

function DarstellungBereich() {
  const { mode, setMode } = useTheme();

  return (
    <div>
      <BereichKopf
        titel="Darstellung"
        satz="Hell, dunkel oder automatisch nach Systemeinstellung."
      />

      <div className="set-optionen" role="radiogroup" aria-label="Darstellung">
        {OPTIONEN.map(({ id, titel, text, Icon }) => {
          const aktiv = mode === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={aktiv}
              className={`set-option${aktiv ? ' is-active' : ''}`}
              onClick={() => setMode(id)}
            >
              <span className="set-option-icon" aria-hidden="true">
                <Icon size={19} />
              </span>
              <span className="set-option-main">
                <span className="set-option-titel">{titel}</span>
                <span className="set-option-text" style={{ display: 'block' }}>{text}</span>
              </span>
              <span className="set-option-radio" aria-hidden="true">
                {aktiv && <span className="set-option-radio-dot" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DarstellungBereich;
