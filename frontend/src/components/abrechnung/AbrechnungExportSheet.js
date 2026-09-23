import React, { useContext, useMemo, useState } from 'react';
import { FileArchive, FileDown, FileSpreadsheet } from 'lucide-react';
import Sheet from '../ui/Sheet';
import Spinner from '../ui/Spinner';
import { AppContext } from '../../contexts/AppContext';
import { useFahrtenExport } from '../fahrten/useFahrtenExport';
import { formatBetrag } from '../fahrten/zeitraumUtils';
import { monatKategorien, monatLabel } from './abrechnungUtils';

// Export-Sheet der Abrechnung (Phase R6) — je Träger Excel / PDF / Beide,
// gleiche Zeilenform wie das Export-Sheet der Fahrtenliste.
// Zwei Betriebsarten:
//   monat gesetzt  → fester Einzelmonat (Download-Button einer Monatskarte)
//   monat null     → Zeitraum-Export mit Von-/Bis-Wahl über alle Monate
//                    mit Daten
//
// Statuswechsel: Beim Einzelmonat passiert keiner — der läuft über
// „Einreichen". Beim Zeitraum (Von ≠ Bis) setzt dagegen das Backend selbst
// jeden Monat auf „eingereicht" (setzeZeitraumStatus in
// backend/utils/excelExport.js). Deshalb steht darüber ein Hinweis; die
// frühere pauschale Zusage „ohne Statuswechsel" war dort falsch.
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

  // Welcher Knopf gerade wartet: "<traeger>:<format>" oder null.
  const [laeuft, setLaeuft] = useState(null);

  // Auf den Export warten statt sofort schliessen — Begruendung wie im
  // Export-Sheet der Fahrtenliste: Der PDF-Export braucht gemessene ~4,3 s,
  // und ohne Rueckmeldung wirkte der Knopf tot.
  const starte = async (fn, key, format) => {
    if (!gueltig || laeuft) return;
    setLaeuft(`${key}:${format}`);
    try {
      const ok = await fn(key, { von: vonEff, bis: bisEff, erfolg: 'einfach' });
      if (ok) onClose();
    } finally {
      setLaeuft(null);
    }
  };

  const wartet = (key, format) => laeuft === `${key}:${format}`;

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={monat ? `Export ${monatLabel(monat)}` : 'Mehrere Monate abrechnen'}
    >
      {/* Der Hinweis muss zwischen Einzelmonat und Zeitraum unterscheiden:
          Ein Zeitraum-Export (Von ≠ Bis) setzt serverseitig JEDEN Monat des
          Zeitraums auf „eingereicht" (setzeZeitraumStatus in
          backend/utils/excelExport.js). Hier stand frueher pauschal „Export
          ohne Statuswechsel" — fuer den Zeitraum war das schlicht falsch, und
          wer ihn nutzte, reichte ein, ohne es zu wissen. */}
      <p className="fl-export-sub">
        {monat || vonEff === bisEff
          ? 'Export ohne Statuswechsel — die Fahrten bleiben, wie sie sind.'
          : 'Export über einen frei wählbaren Zeitraum.'}
      </p>

      {!monat && vonEff !== bisEff && gueltig && (
        <p className="abr-export-warnung">
          Alle Monate des Zeitraums werden dabei als eingereicht markiert.
        </p>
      )}

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
                onClick={() => starte(exportExcel, key, 'excel')}
                disabled={!!laeuft}
              >
                {wartet(key, 'excel') ? <Spinner /> : <FileSpreadsheet size={16} />}
                {wartet(key, 'excel') ? 'Erstellt …' : 'Excel'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportPdf, key, 'pdf')}
                disabled={!!laeuft}
              >
                {wartet(key, 'pdf') ? <Spinner /> : <FileDown size={16} />}
                {wartet(key, 'pdf') ? 'Erstellt …' : 'PDF'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportBeides, key, 'beides')}
                disabled={!!laeuft}
              >
                {wartet(key, 'beides') ? <Spinner /> : <FileArchive size={16} />}
                {wartet(key, 'beides') ? 'Erstellt …' : 'Beide'}
              </button>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}

export default AbrechnungExportSheet;
