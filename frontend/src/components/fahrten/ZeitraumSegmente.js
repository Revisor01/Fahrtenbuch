import React, { useContext, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';

// Segmented Control der Fahrtenliste (Design-Spec Screen 3):
// aktueller Monat / Vormonat / „Zeitraum". Die Segmente steuern die
// bestehende Zeitraum-Logik im AppContext (selectedMonth/selectedVonMonth);
// die Datenladung bleibt unverändert (Effect in FahrtenListe).
//
// „Zeitraum" klappt eine kompakte Von-/Bis-Monatswahl unter dem Control
// aus (kein Sheet — die Auswahl bleibt sichtbar, solange man sie braucht,
// und funktioniert mobil wie desktop identisch). Von „—" = einzelner Monat.

const ymOf = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const monatsName = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('de-DE', { month: 'long' });
};

const JAHRE = [...Array(6)].map((_, i) => 2024 + i);

function ZeitraumSegmente() {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedVonMonth,
    setSelectedVonMonth,
    monthlyData,
  } = useContext(AppContext);

  const heute = new Date();
  const aktuellYM = ymOf(heute);
  const vormonatYM = ymOf(new Date(heute.getFullYear(), heute.getMonth() - 1, 1));

  const istZeitraum = !!(selectedVonMonth && selectedVonMonth !== selectedMonth);
  const datenSegment = istZeitraum
    ? 'zeitraum'
    : selectedMonth === aktuellYM
      ? 'aktuell'
      : selectedMonth === vormonatYM
        ? 'vormonat'
        : 'zeitraum'; // frei gewählter Einzelmonat läuft übers Zeitraum-Panel

  const [panelOffen, setPanelOffen] = useState(datenSegment === 'zeitraum');
  const aktivesSegment = panelOffen ? 'zeitraum' : datenSegment;

  // Offene Monate (mind. ein Träger weder eingereicht noch erstattet)
  // für den Schnellfilter „Offene anzeigen"
  const offenerZeitraum = useMemo(() => {
    const offeneMonate = monthlyData
      .filter((md) =>
        !Object.entries(md.erstattungen || {}).every(([id]) => {
          const status = md.abrechnungsStatus?.[id];
          return status?.eingereicht_am || status?.erhalten_am;
        })
      )
      .map((md) => md.yearMonth)
      .sort();
    return offeneMonate.length > 0
      ? { von: offeneMonate[0], bis: offeneMonate[offeneMonate.length - 1] }
      : null;
  }, [monthlyData]);

  const waehleEinzelmonat = (ym) => {
    setSelectedMonth(ym);
    setSelectedVonMonth('');
    setPanelOffen(false);
  };

  const [bisJahr, bisMonat] = selectedMonth.split('-');
  const vonJahr = selectedVonMonth ? selectedVonMonth.split('-')[0] : bisJahr;

  const handleVonMonat = (e) => {
    if (e.target.value === '') {
      setSelectedVonMonth('');
    } else {
      const m = (parseInt(e.target.value) + 1).toString().padStart(2, '0');
      setSelectedVonMonth(`${vonJahr}-${m}`);
    }
  };

  const handleVonJahr = (e) => {
    const m = selectedVonMonth.split('-')[1];
    setSelectedVonMonth(`${e.target.value}-${m}`);
  };

  const handleBisMonat = (e) => {
    const m = (parseInt(e.target.value) + 1).toString().padStart(2, '0');
    setSelectedMonth(`${bisJahr}-${m}`);
  };

  const handleBisJahr = (e) => {
    setSelectedMonth(`${e.target.value}-${bisMonat}`);
  };

  return (
    <div>
      <div className="seg-control" role="group" aria-label="Zeitraum wählen">
        <button
          type="button"
          className={`seg-btn${aktivesSegment === 'aktuell' ? ' is-active' : ''}`}
          aria-pressed={aktivesSegment === 'aktuell'}
          onClick={() => waehleEinzelmonat(aktuellYM)}
        >
          {monatsName(aktuellYM)}
        </button>
        <button
          type="button"
          className={`seg-btn${aktivesSegment === 'vormonat' ? ' is-active' : ''}`}
          aria-pressed={aktivesSegment === 'vormonat'}
          onClick={() => waehleEinzelmonat(vormonatYM)}
        >
          {monatsName(vormonatYM)}
        </button>
        <button
          type="button"
          className={`seg-btn${aktivesSegment === 'zeitraum' ? ' is-active' : ''}`}
          aria-pressed={aktivesSegment === 'zeitraum'}
          aria-expanded={panelOffen}
          onClick={() => setPanelOffen((o) => !o)}
        >
          Zeitraum
        </button>
      </div>

      {panelOffen && (
        <div className="fl-zeitraum-panel">
          <div className="fl-zeitraum-gruppe">
            <span className="fl-zeitraum-label">Von</span>
            <select
              className="form-select"
              aria-label="Von-Monat"
              value={selectedVonMonth ? String(new Date(`${selectedVonMonth}-01`).getMonth()) : ''}
              onChange={handleVonMonat}
            >
              <option value="">—</option>
              {[...Array(12)].map((_, i) => (
                <option key={`von-${i}`} value={i}>
                  {new Date(0, i).toLocaleString('de-DE', { month: 'long' })}
                </option>
              ))}
            </select>
            {selectedVonMonth && (
              <select
                className="form-select"
                aria-label="Von-Jahr"
                value={vonJahr}
                onChange={handleVonJahr}
              >
                {JAHRE.map((jahr) => (
                  <option key={`von-jahr-${jahr}`} value={jahr}>{jahr}</option>
                ))}
              </select>
            )}
          </div>
          <div className="fl-zeitraum-gruppe">
            <span className="fl-zeitraum-label">Bis</span>
            <select
              className="form-select"
              aria-label="Bis-Monat"
              value={String(new Date(`${selectedMonth}-01`).getMonth())}
              onChange={handleBisMonat}
            >
              {[...Array(12)].map((_, i) => (
                <option key={`bis-${i}`} value={i}>
                  {new Date(0, i).toLocaleString('de-DE', { month: 'long' })}
                </option>
              ))}
            </select>
            <select
              className="form-select"
              aria-label="Bis-Jahr"
              value={bisJahr}
              onChange={handleBisJahr}
            >
              {JAHRE.map((jahr) => (
                <option key={`bis-jahr-${jahr}`} value={jahr}>{jahr}</option>
              ))}
            </select>
          </div>
          {offenerZeitraum && (
            <button
              type="button"
              className="fl-offene-btn"
              onClick={() => {
                setSelectedVonMonth(offenerZeitraum.von);
                setSelectedMonth(offenerZeitraum.bis);
              }}
            >
              <AlertCircle size={14} />
              Offene anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ZeitraumSegmente;
