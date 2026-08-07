import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import StatusBadge from '../ui/StatusBadge';
import { statusFromAbrechnung, statusLabel } from '../../utils/statusLabels';
import {
  kategorienMitErstattung,
  monateImZeitraum,
  formatBetrag,
} from './zeitraumUtils';

// Erstattungen je Abrechnungsträger mit klickbarem Status — einheitlich
// über StatusBadge (Punkt + Wort, Spec „dichte Listen"), ersetzt die alte
// dreifach implementierte Chip-Logik.
//
// Einzelmonat: ein Status je Träger (+ Datum). Zeitraum: kompakte
// Chip-Zeile mit einem Chip je Monat. Klick schaltet zum nächsten Schritt:
// Erfasst → „eingereicht"-Modal, Eingereicht → „erhalten"-Modal,
// Erstattet → Status-Reset direkt (wie in der Monatsübersicht — der alte
// Reset-Klick über das Modal war wirkungslos, weil das Modal für „reset"
// nie öffnet). Alle Klicks setzen nur den Einzelmonat (singleMonth).

const monatKurz = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('de-DE', { month: 'short' });
};

function StatusUebersicht() {
  const {
    summary,
    abrechnungstraeger,
    selectedMonth,
    selectedVonMonth,
    setAbrechnungsStatusModal,
    handleAbrechnungsStatus,
  } = useContext(AppContext);

  const istZeitraum = !!(selectedVonMonth && selectedVonMonth !== selectedMonth);
  const kategorien = kategorienMitErstattung(summary, abrechnungstraeger);
  if (kategorien.length === 0) return null;

  const monate = istZeitraum ? monateImZeitraum(selectedVonMonth, selectedMonth) : [];

  const handleStatusClick = (traegerKey, jahr, monat, statusData) => {
    const status = statusFromAbrechnung(statusData);
    if (status === 'erhalten') {
      // Reset direkt, ohne Modal
      handleAbrechnungsStatus(jahr, monat, traegerKey, 'reset', null, true);
      return;
    }
    setAbrechnungsStatusModal({
      open: true,
      traegerId: traegerKey,
      aktion: status === 'offen' ? 'eingereicht' : 'erhalten',
      jahr,
      monat,
      singleMonth: true,
    });
  };

  const statusTitle = (statusData) => {
    if (statusData?.erhalten_am) {
      return `Erstattet am ${new Date(statusData.erhalten_am).toLocaleDateString('de-DE')} — Klick setzt den Status zurück`;
    }
    if (statusData?.eingereicht_am) {
      return `Eingereicht am ${new Date(statusData.eingereicht_am).toLocaleDateString('de-DE')} — als erstattet markieren`;
    }
    return 'Als eingereicht markieren';
  };

  // „Noch nicht erstattet": Summe aller Kategorien, die (im Zeitraum:
  // nicht in allen Monaten) noch nicht erstattet sind — Bestandslogik
  const nochOffen = Object.entries(summary.erstattungen || {}).reduce((sum, [id, betrag]) => {
    const st = summary.abrechnungsStatus?.[id];
    const istErhalten = istZeitraum
      ? st && Object.values(st).length > 0 && Object.values(st).every((s) => s?.erhalten_am)
      : st?.erhalten_am;
    return sum + (istErhalten ? 0 : Number(betrag || 0));
  }, 0);

  return (
    <div className="card-container fl-erst-card">
      <div className="fl-label">Erstattungen</div>

      {kategorien.map(({ key, name, betrag }) => {
        if (istZeitraum) {
          const traegerStatus = summary.abrechnungsStatus?.[key] || {};
          return (
            <div key={key} className="fl-erst-row fl-erst-row-block">
              <div className="fl-erst-top">
                <span className="fl-erst-name">{name}</span>
                <span className="fl-erst-betrag num">{formatBetrag(betrag)} €</span>
              </div>
              <div className="fl-chip-row">
                {monate.map((monthKey) => {
                  const statusData = traegerStatus[monthKey];
                  const [jahr, monat] = monthKey.split('-');
                  const status = statusFromAbrechnung(statusData);
                  return (
                    <button
                      key={monthKey}
                      type="button"
                      className="fl-monat-chip"
                      title={statusTitle(statusData)}
                      aria-label={`${name}, ${monatKurz(monthKey)} ${jahr}: ${statusLabel(status)}`}
                      onClick={() => handleStatusClick(key, jahr, monat, statusData)}
                    >
                      <span className="fl-monat-chip-label num">{monatKurz(monthKey)}</span>
                      <StatusBadge status={status} variant="dot" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }

        const statusData = summary.abrechnungsStatus?.[key];
        const status = statusFromAbrechnung(statusData);
        const datum = statusData?.erhalten_am || statusData?.eingereicht_am;
        const [jahr, monat] = selectedMonth.split('-');
        return (
          <div key={key} className="fl-erst-row">
            <div className="fl-erst-main">
              <span className="fl-erst-name">{name}</span>
              <button
                type="button"
                className="fl-status-btn"
                title={statusTitle(statusData)}
                onClick={() => handleStatusClick(key, jahr, monat, statusData)}
              >
                <StatusBadge status={status} variant="dot" />
                {datum && (
                  <span className="fl-status-datum num">
                    am {new Date(datum).toLocaleDateString('de-DE')}
                  </span>
                )}
              </button>
            </div>
            <span className="fl-erst-betrag num">{formatBetrag(betrag)} €</span>
          </div>
        );
      })}

      <div className="fl-erst-offen">
        <span>Noch nicht erstattet</span>
        <span className="num">{formatBetrag(nochOffen)} €</span>
      </div>
    </div>
  );
}

export default StatusUebersicht;
