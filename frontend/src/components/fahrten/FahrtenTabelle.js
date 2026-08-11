import React from 'react';
import { ChevronRight } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from './zeitraumUtils';

// Fahrtenliste desktop (≥ 768px) als Tabelle nach dem Tabellen-Muster von
// Dashboard Desktop (Spec Screen 5): Kopf 8/22px auf --bg, 11px/700
// uppercase; Zeilen 13/22px mit Trennlinie und Hover --surface-2; Zahlen
// Mono rechtsbündig; Status als Punkt + Wort. Der Prototyp zeigt keine
// eigene Desktop-Fahrtenliste — die Spalten Datum / Anlass·Route / Träger /
// km / Betrag / Status sind aus dem Muster abgeleitet, plus Aktionen
// (Icon-Buttons 36px wie in den Einstellungs-Tabellen der Spec).
//
// „Wiederholen" öffnet den Erfassungsflow mit Prefill (Schritt 2) und
// erscheint nur bei Fahrten mit gespeicherten Orten — einmalige Adressen
// kennt der Schnell-Flow nicht.

const datumLang = (datum) => {
  const d = new Date(datum);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function FahrtenTabelle({ fahrten, statusFuer, traegerNameFuer, onOeffnen }) {
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
          <div className="fl-th-num">
            <span className="sr-only">Aktionen</span>
          </div>
        </div>
        {fahrten.map((fahrt) => {
          const von = fahrt.von_ort_name || fahrt.einmaliger_von_ort || '—';
          const nach = fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';
          const mitfahrer = fahrt.mitfahrer || [];
          return (
            <button
              key={fahrt.id}
              type="button"
              className="fl-tablerow fl-tablerow-tap"
              onClick={() => onOeffnen(fahrt)}
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
              <span className="fl-td-status">
                <StatusBadge status={statusFuer(fahrt)} variant="dot" />
              </span>
              <span className="fl-td-aktionen">
                <ChevronRight size={16} className="fl-card-chevron" aria-hidden="true" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FahrtenTabelle;
