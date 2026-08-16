import React, { useState } from 'react';
import StatusBadge from '../ui/StatusBadge';

// Kilometer-Balken ueber die Monate — eine Komponente fuer beide Ansichten.
//
// Mobil und Desktop hatten das Diagramm bis 16.08. je einmal nachgebaut, samt
// eigener Legende und eigener Farbliste. Jede Aenderung musste an zwei Stellen
// passieren, und genau daran liefen sie auseinander (Simon 16.08.).
//
// Bedienung: Am Rechner reicht Hover, auf dem Handy gibt es das nicht — dort
// oeffnet ein Tipp die Werte, ein zweiter schliesst sie wieder. Der Zustand
// liegt hier, damit immer nur ein Monat offen ist.

// Dieselben Farben, die das Statussystem ueberall sonst traegt (StatusBadge,
// Abrechnung): Sand fuer „Eingereicht", Gruen fuer „Erstattet", neutral fuer
// „Erfasst". Der Balken stand fuer „Erfasst" bis 16.08. in Petrol — der
// Markenfarbe — und behauptete damit eine andere Ordnung als die Abrechnung
// zwei Tabs weiter.
export const CHART_FARBEN = {
  erhalten: 'var(--ok)',
  eingereicht: 'var(--accent)',
  offen: 'var(--line-strong)',
};

function KilometerDiagramm({ chart, chartMax, formatKm, formatEuro, monatJahr, alsKachel = false }) {
  const [offen, setOffen] = useState(null);

  return (
    <>
      <div className={`dash-chart-bars${alsKachel ? ' dash-chart-bars-tile' : ''}`}>
        {chart.map((c) => (
          <button
            key={c.ym}
            type="button"
            className={`dash-chart-col${offen === c.ym ? ' is-offen' : ''}`}
            disabled={c.km === 0}
            onClick={() => setOffen((v) => (v === c.ym ? null : c.ym))}
            aria-label={`${monatJahr(c.ym)}: ${formatKm(c.km)} km, ${formatEuro(c.betrag)} €`}
            aria-expanded={c.km > 0 ? offen === c.ym : undefined}
          >
            <span
              className="dash-chart-bar"
              style={{
                height: `${Math.max(Math.round((c.km / chartMax) * 88), c.km > 0 ? 4 : 2)}px`,
                background: c.status ? CHART_FARBEN[c.status] : 'var(--line-strong)',
              }}
            />
            <span className="dash-chart-monat num">{c.initiale}</span>
            {c.km > 0 && (
              <span className="dash-chart-pop" role="tooltip">
                <span className="dash-chart-pop-titel">{monatJahr(c.ym)}</span>
                <span className="dash-chart-pop-zeile">
                  <span className="num">{formatKm(c.km)}</span> km · {c.fahrten} {c.fahrten === 1 ? 'Fahrt' : 'Fahrten'}
                </span>
                <span className="dash-chart-pop-zeile">
                  Erstattung <span className="num">{formatEuro(c.betrag - c.mitfahrer)} €</span>
                </span>
                {c.mitfahrer > 0 && (
                  <span className="dash-chart-pop-zeile">
                    Mitfahrer <span className="num">+{formatEuro(c.mitfahrer)} €</span>
                  </span>
                )}
                {c.status && (
                  <span className="dash-chart-pop-status">
                    <StatusBadge status={c.status} variant="dot" />
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="dash-chart-legende">
        <span><span className="dash-chart-swatch" style={{ background: CHART_FARBEN.erhalten }} />Erstattet</span>
        <span><span className="dash-chart-swatch" style={{ background: CHART_FARBEN.eingereicht }} />Eingereicht</span>
        <span><span className="dash-chart-swatch" style={{ background: CHART_FARBEN.offen }} />Erfasst</span>
      </div>
    </>
  );
}

export default KilometerDiagramm;
