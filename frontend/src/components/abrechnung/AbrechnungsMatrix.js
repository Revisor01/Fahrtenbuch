import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import TraegerZeile from './TraegerZeile';
import { formatBetrag, rundeKilometer } from '../fahrten/zeitraumUtils';
import { monatSumme, monatLabel } from './abrechnungUtils';

// Desktop-Abrechnung (Spec Screen 6): Matrix Monat × Abrechnungsträger.
// Spalten 150px / 1fr je Träger / 118px Summe / 130px Aktion; Trägerzellen
// Statuspunkt + Wort (StatusBadge dot), kein Vorgang → „—". Aktion:
// „Einreichen →" bei fälligen, „Details" sonst, „läuft" beim laufenden
// Monat. Ab fünf Trägern scrollt die Matrix horizontal, die Monatsspalte
// klebt. „Details" klappt die Zeile inline auf (Trägerzeilen + Aktionen,
// gleiche Bausteine wie mobil).
function AbrechnungsMatrix({ rows, spalten, expandedMonths, onToggle, aktionen, onExport }) {
  const gridStyle = {
    gridTemplateColumns: `160px repeat(${spalten.length}, minmax(150px, 1fr)) 118px 140px`,
  };

  const statusZelle = (row, key) => {
    const kategorie = row.kategorien.find((k) => k.key === key);
    if (!kategorie) return <span className="abr-td-leer" aria-label="kein Vorgang">—</span>;
    return <StatusBadge status={kategorie.status} variant="dot" />;
  };

  const aktionsZelle = (row, expanded) => {
    if (row.laufend) {
      return <span className="abr-td-laeuft">läuft</span>;
    }
    if (row.faellig) {
      return (
        <button
          type="button"
          className="abr-link"
          onClick={(e) => {
            e.stopPropagation();
            aktionen.einreichen(row.month, row.kategorien);
          }}
        >
          Einreichen →
        </button>
      );
    }
    return (
      <button
        type="button"
        className="abr-link"
        aria-expanded={expanded}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(row.month.yearMonth);
        }}
      >
        {expanded ? 'Schließen' : 'Details'}
      </button>
    );
  };

  return (
    <div className="abr-matrix-card">
      <div className="abr-matrix-scroll">
        <div className="abr-matrix-head" style={gridStyle}>
          <div className="abr-td-monat">Monat</div>
          {spalten.map((s) => (
            <div key={s.key}>{s.name}</div>
          ))}
          <div className="abr-td-summe-head">Summe</div>
          <div aria-hidden="true" />
        </div>

        {rows.map((row) => {
          const expanded = expandedMonths.has(row.month.yearMonth);
          return (
            <React.Fragment key={row.month.yearMonth}>
              <div
                className="abr-matrix-row"
                style={gridStyle}
                role="button"
                tabIndex={0}
                aria-expanded={expanded}
                aria-label={`${monatLabel(row.month)} — Details ${expanded ? 'schließen' : 'anzeigen'}`}
                onClick={() => onToggle(row.month.yearMonth)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(row.month.yearMonth);
                  }
                }}
              >
                <div className="abr-td-monat">
                  <div className="abr-td-monat-name">{monatLabel(row.month)}</div>
                  <div className="abr-td-monat-km num">
                    {rundeKilometer(row.month.totalKm)} km
                  </div>
                </div>
                {spalten.map((s) => (
                  <div key={s.key} className="abr-td-status">
                    {statusZelle(row, s.key)}
                  </div>
                ))}
                <div className="abr-td-summe num">
                  {formatBetrag(monatSumme(row.kategorien))} €
                </div>
                <div className="abr-td-aktion">{aktionsZelle(row, expanded)}</div>
              </div>

              {expanded && (
                row.kategorien.length === 0 ? (
                  <div className="abr-matrix-detail-leerzeile">
                    <p className="abr-matrix-detail-leer">Keine Erstattungen in diesem Monat.</p>
                  </div>
                ) : (
                  // Detail im selben Raster wie die Matrix: jede Trägerzelle
                  // steht direkt unter ihrer Spalte.
                  <div className="abr-matrix-detail" style={gridStyle}>
                    <div className="abr-detail-monatzelle">
                      <button
                        type="button"
                        className="abr-link abr-link-leise"
                        onClick={() => onExport(row.month)}
                      >
                        Export ohne
                        <br />
                        Statuswechsel
                      </button>
                    </div>
                    {spalten.map((s) => {
                      const kategorie = row.kategorien.find((k) => k.key === s.key);
                      return (
                        <div key={s.key} className="abr-detail-zelle">
                          {kategorie ? (
                            <TraegerZeile
                              month={row.month}
                              kategorie={kategorie}
                              aktionen={aktionen}
                              variante="zelle"
                            />
                          ) : (
                            <span className="abr-td-leer" aria-hidden="true">—</span>
                          )}
                        </div>
                      );
                    })}
                    <div aria-hidden="true" />
                    <div aria-hidden="true" />
                  </div>
                )
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default AbrechnungsMatrix;
