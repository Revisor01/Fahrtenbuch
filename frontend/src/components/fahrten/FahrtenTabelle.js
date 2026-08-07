import React from 'react';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
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

function FahrtenTabelle({ fahrten, statusFuer, traegerNameFuer, onEdit, onDelete, onWiederholen }) {
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
          const kannWiederholen = !!(fahrt.von_ort_id && fahrt.nach_ort_id);
          return (
            <div key={fahrt.id} className="fl-tablerow">
              <div className="fl-td-datum num">{datumLang(fahrt.datum)}</div>
              <div className="fl-td-haupt">
                <div className="fl-td-anlass">{fahrt.anlass || '—'}</div>
                <div
                  className="fl-td-route"
                  title={
                    mitfahrer.length > 0
                      ? `Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}`
                      : undefined
                  }
                >
                  {von} → {nach}
                  {mitfahrer.length > 0 &&
                    ` · ${mitfahrer.length} Mitfahrer:in${mitfahrer.length > 1 ? 'nen' : ''}`}
                </div>
              </div>
              <div className="fl-td-traeger">{traegerNameFuer(fahrt)}</div>
              <div className="fl-td-zahl num">{rundeKilometer(fahrt.kilometer)}</div>
              <div className="fl-td-zahl">
                <span className="num">{formatBetrag(fahrt.erstattung)} €</span>
                {fahrt.mitfahrerErstattung > 0 && (
                  <div className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
                    +{formatBetrag(fahrt.mitfahrerErstattung)} € MF
                  </div>
                )}
              </div>
              <div className="fl-td-status">
                <StatusBadge status={statusFuer(fahrt)} variant="dot" />
              </div>
              <div className="fl-td-aktionen">
                {kannWiederholen && (
                  <button
                    type="button"
                    className="fl-aktion-btn"
                    title="Nochmal erfassen"
                    aria-label={`Fahrt ${von} nach ${nach} nochmal erfassen`}
                    onClick={() => onWiederholen(fahrt)}
                  >
                    <RotateCcw size={15} />
                  </button>
                )}
                <button
                  type="button"
                  className="fl-aktion-btn"
                  title="Bearbeiten"
                  aria-label={`Fahrt ${von} nach ${nach} bearbeiten`}
                  onClick={() => onEdit(fahrt)}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="fl-aktion-btn fl-aktion-btn-danger"
                  title="Löschen"
                  aria-label={`Fahrt ${von} nach ${nach} löschen`}
                  onClick={() => onDelete(fahrt)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FahrtenTabelle;
