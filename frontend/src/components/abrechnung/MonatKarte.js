import React from 'react';
import { Download } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import TraegerZeile from './TraegerZeile';
import { formatBetrag } from '../fahrten/zeitraumUtils';
import { monatsStatus, monatSumme, formatDatumKurz, monatLabel } from './abrechnungUtils';

// Monatskarte der mobilen Abrechnung (Spec „Abrechnung mobil"):
// - fälliger Monat: aufgeklappt, Rand 1,5px --accent-line, Kopf --accent-soft
//   mit „Fällig — noch nicht eingereicht", Fortschrittsleiste im Kopf,
//   Trägerzeilen, Fußzeile „Einreichen" (48px) + Download 48×48
//   (Export ohne Statuswechsel)
// - übrige Monate: eingeklappt (--surface) mit Statuspunkt + „Eingereicht
//   am {Datum}" / „Erstattet am {Datum}"; erstattete opacity .72;
//   Antippen klappt Trägerzeilen + Aktionen auf
// - laufender Monat: sichtbar, aber nicht fällig — „Läuft · noch nicht fällig"

// Statuszeile der eingeklappten Karte
function KarteStatuszeile({ laufend, status, kategorien }) {
  if (laufend) {
    return <span className="abr-karte-laeuft">Läuft · noch nicht fällig</span>;
  }
  // Datum des Monatsstatus: der späteste Träger bestimmt, wann der Monat
  // komplett eingereicht/erstattet war
  const feld = status === 'erhalten' ? 'erhalten_am' : 'eingereicht_am';
  const daten = kategorien
    .map((k) => k.statusData?.[feld])
    .filter(Boolean)
    .sort();
  const datum = daten[daten.length - 1];
  return (
    <span className="abr-karte-statuszeile">
      <StatusBadge status={status} variant="dot" />
      {datum && <span className="num">am {formatDatumKurz(datum)}</span>}
    </span>
  );
}

function MonatKarte({ row, expanded, onToggle, aktionen, onExport }) {
  const { month, kategorien, faellig, laufend } = row;
  const status = monatsStatus(kategorien);
  const summe = monatSumme(kategorien);
  const istOffen = faellig || expanded;
  const erstattet = !laufend && status === 'erhalten';
  // Einreichen steht ueberall, wo noch etwas offen ist — nicht nur bei
  // faelligen Monaten. Im laufenden Monat und in bereits teilweise
  // eingereichten gab es unten nur „Exportieren", also einen Download ohne
  // Statuswechsel; wer den Monat abschliessen wollte, musste jede
  // Traegerzeile einzeln antippen (Simon 23.08.).
  const offeneAnzahl = kategorien.filter((k) => k.status === 'offen').length;

  // Kopfinhalt: Titel, Summe und Fortschrittsleiste
  const kopfInhalt = (
    <>
      <div className="abr-karte-kopfzeile">
        <div className="abr-karte-kopftext">
          <div className="abr-karte-monat">{monatLabel(month)}</div>
          {faellig ? (
            <div className="abr-karte-faellig-text">Fällig — noch nicht eingereicht</div>
          ) : (
            <KarteStatuszeile laufend={laufend} status={status} kategorien={kategorien} />
          )}
        </div>
        <div className="abr-karte-summe num">{formatBetrag(summe)} €</div>
      </div>
      {/* Immer sichtbar, nicht nur aufgeklappt (Simon 16.08.): Der Fortschritt
          ist die Kernaussage der Karte — wer durch die Monate scrollt, will
          ihn sehen, ohne jeden einzeln zu oeffnen. */}
      <StatusBadge status={status} variant="progress" className="abr-karte-progress" />
    </>
  );

  return (
    <div
      className={`abr-karte${faellig ? ' abr-karte-faellig' : ''}${erstattet ? ' abr-karte-erstattet' : ''}`}
    >
      {faellig ? (
        // Fällige Monate sind immer aufgeklappt (Spec) — Kopf nicht antippbar
        <div className="abr-karte-kopf abr-karte-kopf-faellig">{kopfInhalt}</div>
      ) : (
        <button
          type="button"
          className="abr-karte-kopf abr-karte-kopf-btn"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          {kopfInhalt}
        </button>
      )}

      {istOffen && (
        <>
          <div className="abr-karte-zeilen">
            {kategorien.map((kategorie) => (
              <TraegerZeile
                key={kategorie.key}
                month={month}
                kategorie={kategorie}
                aktionen={aktionen}
              />
            ))}
          </div>
          {faellig ? (
            <div className="abr-karte-fuss">
              {/* „Alle einreichen", sobald mehr als ein Traeger offen ist: Der
                  Knopf hiess wie der in jeder Traegerzeile darueber, obwohl er
                  den ganzen Monat einreicht (Simon 17.08.). */}
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => aktionen.einreichen(month, kategorien)}
              >
                {offeneAnzahl > 1 ? 'Alle einreichen' : 'Einreichen'}
              </button>
              <button
                type="button"
                className="abr-download-btn"
                title="Exportieren ohne Statuswechsel"
                aria-label={`${monatLabel(month)} exportieren, ohne den Status zu ändern`}
                onClick={() => onExport(month)}
              >
                <Download size={18} />
              </button>
            </div>
          ) : (
            <div
              className={`abr-karte-fuss${offeneAnzahl === 0 ? ' abr-karte-fuss-leise' : ''}`}
            >
              {offeneAnzahl > 0 ? (
                <>
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    onClick={() => aktionen.einreichen(month, kategorien)}
                  >
                    {offeneAnzahl > 1 ? 'Alle einreichen' : 'Einreichen'}
                  </button>
                  <button
                    type="button"
                    className="abr-download-btn"
                    title="Exportieren ohne Statuswechsel"
                    aria-label={`${monatLabel(month)} exportieren, ohne den Status zu ändern`}
                    onClick={() => onExport(month)}
                  >
                    <Download size={18} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="abr-link"
                  onClick={() => onExport(month)}
                >
                  Exportieren
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default MonatKarte;
