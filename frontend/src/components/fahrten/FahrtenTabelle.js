import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from './zeitraumUtils';

// Desktop-Fahrtenliste als Tabelle; „Wiederholen“ nur bei gespeicherten Orten.

const datumLang = (datum) => {
  const d = new Date(datum);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function FahrtenTabelle({ fahrten, statusFuer, traegerNameFuer, onOeffnen }) {
  // Strich auf der aktuellen Zeile, die Gegenfahrt nur hinterlegt.
  const [aktiveId, setAktiveId] = React.useState(null);
  const [paarId, setPaarId] = React.useState(null);

  const merkeZeile = (fahrt) => {
    setAktiveId(fahrt.id);
    setPaarId(fahrt.partner_fahrt_id || null);
  };
  const vergissZeile = () => {
    setAktiveId(null);
    setPaarId(null);
  };

  return (
    <div className="fl-tablecard">
      <div className="fl-tablescroll">
        <div className="fl-tablehead">
          <div>Datum</div>
          <div>Anlass · Route</div>
          <div>Träger</div>
          <div className="fl-th-num">km</div>
          <div className="fl-th-num">Betrag</div>
          <div className="fl-th-num">Status</div>
        </div>
        {fahrten.map((fahrt) => {
          const von = fahrt.von_ort_name || fahrt.einmaliger_von_ort || '—';
          const nach = fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';
          const mitfahrer = fahrt.mitfahrer || [];
          // Ohne Server-ID nicht antippbar.
          const gesperrt = !!fahrt._optimistisch;
          return (
            <button
              key={fahrt.id}
              type="button"
              className={`fl-tablerow${gesperrt ? '' : ' fl-tablerow-tap'}${
                aktiveId === fahrt.id ? ' fl-zeile-aktiv' : ''
              }${paarId === fahrt.id ? ' fl-zeile-paar' : ''}`}
              onClick={() => onOeffnen(fahrt)}
              disabled={gesperrt}
              onMouseEnter={() => merkeZeile(fahrt)}
              onMouseLeave={vergissZeile}
              onFocus={() => merkeZeile(fahrt)}
              onBlur={vergissZeile}
              aria-label={`Fahrt ${von} nach ${nach} am ${datumLang(fahrt.datum)} — Aktionen öffnen`}
            >
              <span className="fl-td-datum num">{datumLang(fahrt.datum)}</span>
              <span className="fl-td-haupt">
                <span className="fl-td-anlass">{fahrt.anlass || '—'}</span>
                <span
                  className="fl-td-route"
                  title={
                    mitfahrer.length > 0
                      ? `Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}`
                      : undefined
                  }
                >
                  {von} → {nach}
                  {fahrt.partner_fahrt_id && (
                    <span
                      className="fl-paar-hinweis"
                      title="Gehört zu einer Hin- und Rückfahrt"
                    >
                      <span aria-hidden="true">⇄</span>
                      <span className="sr-only">Teil einer Hin- und Rückfahrt</span>
                    </span>
                  )}
                  {mitfahrer.length > 0 && (
                    <span className="fl-mf-hinweis fl-mf-hinweis-leise">
                      <span className="fl-mf-punkt" aria-hidden="true" />
                      {mitfahrer.length} Mitfahrer:in{mitfahrer.length > 1 ? 'nen' : ''}
                    </span>
                  )}
                </span>
              </span>
              <span className="fl-td-traeger">{traegerNameFuer(fahrt)}</span>
              <span className="fl-td-zahl num">{rundeKilometer(fahrt.kilometer)}</span>
              <span className="fl-td-zahl">
                <span className="num">{formatBetrag(fahrt.erstattung)} €</span>
                {fahrt.mitfahrerErstattung > 0 && (
                  <span className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
                    +{formatBetrag(fahrt.mitfahrerErstattung)} €
                  </span>
                )}
              </span>
              {/* Spalte bleibt (sonst verrutscht das Raster), zeigt aber nur
                  den abweichenden Status — „Erfasst" ist der Normalfall und
                  steht schon im Monatskopf (Simon 16.08.). */}
              <span className="fl-td-status">
                {statusFuer(fahrt) !== 'offen' && (
                  <StatusBadge status={statusFuer(fahrt)} variant="dot" />
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FahrtenTabelle;
