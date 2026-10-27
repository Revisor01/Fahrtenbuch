import React from 'react';
import Sheet from './Sheet';

// Ein Tipp auf eine Listenzeile öffnet dieses Sheet: oben die Daten, darunter Aktionen mit großer Trefferfläche. aktionen: [{ id, label, icon, onClick, variant?: 'gefahr', hinweis? }], zeilen: [{ label, wert }]
function AktionsSheet({ isOpen, onClose, titel, untertitel, zeilen = [], aktionen = [] }) {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} ariaLabel={titel}>
      <div className="aktions-kopf">
        <h2 className="aktions-titel">{titel}</h2>
        {untertitel && <p className="aktions-untertitel">{untertitel}</p>}
      </div>

      {zeilen.length > 0 && (
        <dl className="aktions-daten">
          {zeilen.map(({ label, wert }) => (
            <div key={label} className="aktions-daten-zeile">
              <dt>{label}</dt>
              <dd>{wert}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="aktions-liste">
        {aktionen.map(({ id, label, icon: Icon, onClick, variant, hinweis }) => (
          <button
            key={id}
            type="button"
            className={`aktions-knopf${variant === 'gefahr' ? ' is-gefahr' : ''}`}
            onClick={() => {
              onClose();
              onClick();
            }}
          >
            {Icon && <Icon size={18} strokeWidth={2} aria-hidden="true" />}
            <span className="aktions-knopf-text">
              <span className="aktions-knopf-label">{label}</span>
              {hinweis && <span className="aktions-knopf-hinweis">{hinweis}</span>}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

export default AktionsSheet;
