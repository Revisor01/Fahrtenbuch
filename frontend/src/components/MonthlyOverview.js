import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Receipt } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import EmptyState from './ui/EmptyState';
import MonatKarte from './abrechnung/MonatKarte';
import AbrechnungsMatrix from './abrechnung/AbrechnungsMatrix';
import AbrechnungExportSheet from './abrechnung/AbrechnungExportSheet';
import { useEinreichen } from './abrechnung/useEinreichen';
import {
  aktuellerYearMonth,
  monatKategorien,
  monatLabel,
  istFaellig,
} from './abrechnung/abrechnungUtils';

// Abrechnung (Phase R6, Redesign 2026).
// Mobil (<768px): Monatskarten — fällige Monate aufgeklappt mit
// Fortschrittsleiste, Einreichen-Button und Download; übrige eingeklappt
// mit Statuspunkt + Datum, antippbar für Trägerzeilen + Aktionen.
// Ab 768px: Matrix Monat × Träger (Spec Screen 6) mit Kopf-Aktionen
// „Zeitraum-Export" und „{ältester fälliger Monat} einreichen".
function MonthlyOverview() {
  const { monthlyData, fetchMonthlyData, abrechnungstraeger } = useContext(AppContext);
  const currentYear = new Date().getFullYear().toString();
  const currentYM = aktuellerYearMonth();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  // Aufgeklappte nicht-fällige Monate (yearMonth-Keys); fällige sind immer offen
  const [expandedMonths, setExpandedMonths] = useState(() => new Set());
  // Export-Sheet: null | { monat: month|null } (monat null = Zeitraum-Export)
  const [exportSheet, setExportSheet] = useState(null);
  const aktionen = useEinreichen();

  useEffect(() => {
    fetchMonthlyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jahre = useMemo(
    () => [...new Set(monthlyData.map((m) => m.year))].sort((a, b) => b - a),
    [monthlyData]
  );

  // Zeilen des gewählten Jahres, mit abgeleiteten Kategorien/Fälligkeit
  const rows = useMemo(
    () =>
      monthlyData
        .filter((m) => selectedYear === 'all' || m.year.toString() === selectedYear)
        .map((m) => {
          const kategorien = monatKategorien(m, abrechnungstraeger);
          return {
            month: m,
            kategorien,
            faellig: istFaellig(m, kategorien, currentYM),
            laufend: m.yearMonth >= currentYM,
          };
        }),
    [monthlyData, selectedYear, abrechnungstraeger, currentYM]
  );

  // Fällige Monate über alle Jahre — konsistent zum Zähler der Navigation,
  // ältester zuerst (für den Kopf-Button und die Unterzeile)
  const alleFaelligen = useMemo(
    () =>
      monthlyData
        .map((m) => ({ month: m, kategorien: monatKategorien(m, abrechnungstraeger) }))
        .filter((r) => istFaellig(r.month, r.kategorien, currentYM))
        .sort((a, b) => a.month.yearMonth.localeCompare(b.month.yearMonth)),
    [monthlyData, abrechnungstraeger, currentYM]
  );

  const nFaellig = alleFaelligen.length;
  const unterzeileMobil =
    nFaellig === 0
      ? 'Alles eingereicht — nichts wartet auf dich'
      : nFaellig === 1
        ? '1 Monat wartet auf dich'
        : `${nFaellig} Monate warten auf dich`;
  const unterzeileDesktop =
    nFaellig === 0
      ? 'Alles eingereicht — nichts wartet auf dich.'
      : nFaellig === 1
        ? 'Ein Monat ist noch nicht eingereicht.'
        : `${nFaellig} Monate sind noch nicht eingereicht.`;

  // Ältester fälliger Monat (Kopf-Button); Jahr nur nennen, wenn es abweicht
  const aeltester = alleFaelligen[0] || null;
  const aeltesterLabel = aeltester
    ? aeltester.month.year.toString() === currentYear
      ? aeltester.month.monthName
      : monatLabel(aeltester.month)
    : null;

  // Spalten der Matrix: konfigurierte Träger, Mitfahrer:innen nur bei Bedarf
  const spalten = useMemo(() => {
    const liste = (abrechnungstraeger || []).map((t) => ({
      key: t.id.toString(),
      name: t.name,
    }));
    if (rows.some((r) => Number(r.month.erstattungen?.mitfahrer || 0) > 0)) {
      liste.push({ key: 'mitfahrer', name: 'Mitfahrer:innen' });
    }
    return liste;
  }, [abrechnungstraeger, rows]);

  const toggleMonth = (yearMonth) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(yearMonth)) {
        next.delete(yearMonth);
      } else {
        next.add(yearMonth);
      }
      return next;
    });
  };

  const jahrSelect = (
    <select
      value={selectedYear}
      onChange={(e) => setSelectedYear(e.target.value)}
      className="form-select abr-jahr"
      aria-label="Jahr wählen"
    >
      {!jahre.includes(Number(currentYear)) && (
        <option value={currentYear}>{currentYear}</option>
      )}
      {jahre.map((jahr) => (
        <option key={jahr} value={jahr.toString()}>{jahr}</option>
      ))}
      <option value="all">Alle Jahre</option>
    </select>
  );

  const leererZustand = (
    <EmptyState
      icon={<Receipt size={22} />}
      title={
        selectedYear === 'all'
          ? 'Noch keine Abrechnungen'
          : `Keine Abrechnungen in ${selectedYear}`
      }
      text="Sobald Fahrten mit Erstattung erfasst sind, erscheinen die Monate hier."
    />
  );

  return (
    <div className="abr-view">
      {/* ---------- Mobil: Monatskarten ---------- */}
      <div className="abr-mobile">
        <div className="abr-m-kopf">
          <div>
            <h1 className="abr-titel">Abrechnung</h1>
            <p className="abr-untertitel">{unterzeileMobil}</p>
          </div>
          {jahrSelect}
        </div>

        {rows.length === 0 ? (
          leererZustand
        ) : (
          <div className="abr-karten">
            {rows.map((row) => (
              <MonatKarte
                key={row.month.yearMonth}
                row={row}
                expanded={expandedMonths.has(row.month.yearMonth)}
                onToggle={() => toggleMonth(row.month.yearMonth)}
                aktionen={aktionen}
                onExport={(monat) => setExportSheet({ monat })}
              />
            ))}
          </div>
        )}
      </div>

      {/* ---------- Desktop (≥768px): Matrix Monat × Träger ---------- */}
      <div className="abr-desktop">
        <div className="abr-d-kopf">
          <div>
            <h1 className="abr-d-titel">
              Abrechnung {selectedYear === 'all' ? '— alle Jahre' : selectedYear}
            </h1>
            <p className="abr-d-untertitel">{unterzeileDesktop}</p>
          </div>
          <div className="abr-d-aktionen">
            {jahrSelect}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setExportSheet({ monat: null })}
            >
              Zeitraum-Export
            </button>
            {aeltester && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => aktionen.einreichen(aeltester.month, aeltester.kategorien)}
              >
                {aeltesterLabel} einreichen
              </button>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          leererZustand
        ) : (
          <AbrechnungsMatrix
            rows={rows}
            spalten={spalten}
            expandedMonths={expandedMonths}
            onToggle={toggleMonth}
            aktionen={aktionen}
            onExport={(monat) => setExportSheet({ monat })}
          />
        )}
      </div>

      <AbrechnungExportSheet
        isOpen={exportSheet !== null}
        onClose={() => setExportSheet(null)}
        monat={exportSheet?.monat || null}
      />
    </div>
  );
}

export default MonthlyOverview;
