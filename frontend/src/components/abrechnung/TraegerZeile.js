import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from '../fahrten/zeitraumUtils';
import { formatDatumKurz } from './abrechnungUtils';

// Eine Trägerzeile einer Monatsabrechnung (Spec „Abrechnung mobil"):
// Statuspunkt + Wort (StatusBadge dot), Name 16px, Untertitel 13px
// „{Status} [am {Datum}] · {km} km", Betrag Mono 14px rechts.
// Aktionen je nach Status als Textlinks (direkt + Undo-Toast, kein Modal):
//   Erfasst     → „Einreichen" (Export + Status)
//   Eingereicht → „Als erstattet markieren" · „Datum ändern"
//   Erstattet   → „Zurücksetzen" · „Datum ändern"
// Wird auch in der aufgeklappten Detail-Zeile der Desktop-Matrix genutzt:
// variante="zelle" rendert ohne Namen (der Spaltenkopf trägt ihn) und
// vertikal gestapelt, damit die Zelle unter ihrer Matrix-Spalte steht.
function TraegerZeile({ month, kategorie, aktionen, variante }) {
  const { name, betrag, km, status, statusData } = kategorie;
  const zelle = variante === 'zelle';
  const datum = status === 'erhalten'
    ? statusData?.erhalten_am
    : status === 'eingereicht'
      ? statusData?.eingereicht_am
      : null;

  return (
    <div className={`abr-traeger-row${zelle ? ' abr-traeger-zelle' : ''}`}>
      <div className="abr-traeger-main">
        {!zelle && <div className="abr-traeger-name">{name}</div>}
        {zelle && (
          <span className={`abr-traeger-betrag num${status === 'erhalten' ? ' abr-betrag-erstattet' : ''}`}>
            {formatBetrag(betrag)} €
          </span>
        )}
        <div className="abr-traeger-sub">
          <StatusBadge status={status} variant="dot" />
          {datum && <span className="num">am {formatDatumKurz(datum)}</span>}
          {km != null && km > 0 && (
            <span className="num">· {rundeKilometer(km)} km</span>
          )}
        </div>
        <div className="abr-traeger-aktionen">
          {status === 'offen' && (
            <button
              type="button"
              className="abr-link"
              onClick={() => aktionen.einreichen(month, [kategorie])}
            >
              Einreichen
            </button>
          )}
          {status === 'eingereicht' && (
            <button
              type="button"
              className="abr-link"
              onClick={() => aktionen.alsErstattetMarkieren(month, kategorie)}
            >
              Als erstattet markieren
            </button>
          )}
          {status === 'erhalten' && (
            <button
              type="button"
              className="abr-link"
              onClick={() => aktionen.zuruecksetzen(month, kategorie)}
            >
              Zurücksetzen
            </button>
          )}
          {status !== 'offen' && (
            <button
              type="button"
              className="abr-link abr-link-leise"
              onClick={() => aktionen.datumAendern(month, kategorie)}
            >
              Datum ändern
            </button>
          )}
        </div>
      </div>
      {!zelle && (
        <span className={`abr-traeger-betrag num${status === 'erhalten' ? ' abr-betrag-erstattet' : ''}`}>
          {formatBetrag(betrag)} €
        </span>
      )}
    </div>
  );
}

export default TraegerZeile;
