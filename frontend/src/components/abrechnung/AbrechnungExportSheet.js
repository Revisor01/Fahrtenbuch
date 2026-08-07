import React, { useContext, useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { AppContext } from '../../contexts/AppContext';
import { useFahrtenExport } from '../fahrten/useFahrtenExport';
import { formatBetrag } from '../fahrten/zeitraumUtils';
import { monatKategorien, monatLabel } from './abrechnungUtils';

// Export-Sheet der Abrechnung (Phase R6) — Export ohne Statuswechsel,
// je Träger Excel / PDF / Beide (ZIP), gleiche Zeilenform wie das
// Export-Sheet der Fahrtenliste. Zwei Betriebsarten:
//   monat gesetzt  → fester Einzelmonat (Download-Button einer Monatskarte)
//   monat null     → Zeitraum-Export mit Von-/Bis-Wahl über alle Monate
//                    mit Daten (Desktop-Kopf „Zeitraum-Export")
// Der Statuswechsel läuft bewusst nicht hier, sondern über „Einreichen".
function AbrechnungExportSheet({ isOpen, onClose, monat }) {
  const { monthlyData, abrechnungstraeger } = useContext(AppContext);
  const { exportExcel, exportPdf, exportBeides } = useFahrtenExport();

  // Monate mit Daten, neueste zuerst (für die Zeitraum-Auswahl)
  const monate = useMemo(
    () => [...monthlyData].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)),
    [monthlyData]
  );

  const neuester = monate[0]?.yearMonth || '';
  const [von, setVon] = useState(neuester);
  const [bis, setBis] = useState(neuester);

  // Zeitraum-Grenzen nachziehen, wenn das Sheet ohne festen Monat öffnet
  // und noch kein gültiger Wert gesetzt ist
  const vonEff = monat ? monat.yearMonth : (von || neuester);
  const bisEff = monat ? monat.yearMonth : (bis || neuester);
  const gueltig = !!vonEff && !!bisEff && vonEff <= bisEff;

  // Kategorien mit Erstattung im gewählten Bereich (Summen über die Monate)
  const kategorien = useMemo(() => {
    if (monat) return monatKategorien(monat, abrechnungstraeger);
    const imBereich = monthlyData.filter(
      (m) => m.yearMonth >= vonEff && m.yearMonth <= bisEff
    );
    const summen = {};
    imBereich.forEach((m) => {
      Object.entries(m.erstattungen || {}).forEach(([key, betrag]) => {
        summen[key] = (summen[key] || 0) + Number(betrag || 0);
      });
    });
    const liste = [];
    (abrechnungstraeger || []).forEach((t) => {
      const key = t.id.toString();
      if (summen[key] > 0) liste.push({ key, name: t.name, betrag: summen[key] });
    });
    if (summen.mitfahrer > 0) {
      liste.push({ key: 'mitfahrer', name: 'Mitfahrer:innen', betrag: summen.mitfahrer });
    }
    return liste;
  }, [monat, monthlyData, abrechnungstraeger, vonEff, bisEff]);

  const monatOption = (m) => `${m.monthName} ${m.year}`;

  const zeitraumLabel = monat
    ? monatLabel(monat)
    : vonEff === bisEff
      ? monatOption(monate.find((m) => m.yearMonth === vonEff) || {})
      : `${monatOption(monate.find((m) => m.yearMonth === vonEff) || {})} bis ${monatOption(monate.find((m) => m.yearMonth === bisEff) || {})}`;

  const starte = (fn, key) => {
    if (!gueltig) return;
    fn(key, { von: vonEff, bis: bisEff, erfolg: 'einfach' });
    onClose();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={monat ? `Export ${monatLabel(monat)}` : 'Zeitraum-Export'}
    >
      <p className="fl-export-sub">
        {monat
          ? 'Export ohne Statuswechsel — die Fahrten bleiben, wie sie sind.'
          : 'Export ohne Statuswechsel über einen frei wählbaren Zeitraum.'}
      </p>

      {!monat && (
        <div className="abr-export-zeitraum">
          <label className="fl-zeitraum-gruppe">
            <span className="fl-zeitraum-label">Von</span>
            <select
              className="form-select"
              value={vonEff}
              onChange={(e) => setVon(e.target.value)}
            >
              {monate.map((m) => (
                <option key={m.yearMonth} value={m.yearMonth}>{monatOption(m)}</option>
              ))}
            </select>
          </label>
          <label className="fl-zeitraum-gruppe">
            <span className="fl-zeitraum-label">Bis</span>
            <select
              className="form-select"
              value={bisEff}
              onChange={(e) => setBis(e.target.value)}
            >
              {monate.map((m) => (
                <option key={m.yearMonth} value={m.yearMonth}>{monatOption(m)}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {!gueltig ? (
        <p className="fl-export-leer">
          Der Von-Monat muss vor dem Bis-Monat liegen.
        </p>
      ) : kategorien.length === 0 ? (
        <p className="fl-export-leer">
          Für {zeitraumLabel} ist nichts zu exportieren — es gibt keine
          Erstattungen in diesem Zeitraum.
        </p>
      ) : (
        kategorien.map(({ key, name, betrag }) => (
          <div key={key} className="fl-export-row">
            <span className="fl-export-name">
              {name}
              <span className="abr-export-betrag num"> · {formatBetrag(betrag)} €</span>
            </span>
            <div className="fl-export-btns">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportExcel, key)}
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportPdf, key)}
              >
                <FileDown size={16} />
                PDF
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => starte(exportBeides, key)}
              >
                Beide (ZIP)
              </button>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}

export default AbrechnungExportSheet;
