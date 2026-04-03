import React, { useState, useEffect, useContext } from 'react';
import { AlertCircle, Circle, CheckCircle2, CalendarDays } from 'lucide-react';
import AbrechnungsStatusModal from '../AbrechnungsStatusModal';
import { AppContext } from '../contexts/AppContext';


const DEFAULT_FARBE = '#6b7280';
const MITFAHRER_FARBE = '#6366f1';

// Erzeugt inline style fuer Card-Hintergrund mit niedriger Opacity
const getCardBg = (hexColor) => ({
  backgroundColor: `${hexColor || DEFAULT_FARBE}14`,
});

function MonthlyOverview() {
  const { monthlyData, fetchMonthlyData, updateAbrechnungsStatus, abrechnungstraeger, abrechnungsStatusModal, setAbrechnungsStatusModal, handleAbrechnungsStatus , summary, showNotification } = useContext(AppContext);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [hideCompleted, setHideCompleted] = useState(true);
  const [filteredData, setFilteredData] = useState([]);
  const currentYear = new Date().getFullYear().toString();

  const getMonthName = (month) => {
    return new Date(2000, month - 1, 1).toLocaleString('de-DE', { month: 'long' });
  };

  const calculateYearTotal = () => {
    const totals = filteredData.reduce((total, month) => {
      Object.entries(month.erstattungen || {}).forEach(([traegerId, betrag]) => {
        if (!total[traegerId]) {
          total[traegerId] = {
            original: 0,
            ausstehend: 0
          };
        }

        total[traegerId].original += Number(betrag || 0);

        if (!month.abrechnungsStatus?.[traegerId]?.erhalten_am) {
          total[traegerId].ausstehend += Number(betrag || 0);
        }
      });

      return total;
    }, {});

    const relevantKeys = Object.keys(totals).filter(key => key !== 'gesamt');
    totals.gesamt = {
      original: relevantKeys.reduce((sum, key) => sum + (totals[key].original || 0), 0),
      ausstehend: relevantKeys.reduce((sum, key) => sum + (totals[key].ausstehend || 0), 0)
    };

    return totals;
  };

  const getKategorienMitErstattung = () => {
    const kategorien = [];

    // Jahres-Summen aus dem yearTotal berechnen
    const yearTotals = calculateYearTotal();

    // Abrechnungsträger Cards
    abrechnungstraeger.forEach(traeger => {
      const data = yearTotals[traeger.id];
      if (data && (data.original > 0 || data.ausstehend > 0)) {
        kategorien.push([
          traeger.id.toString(),
          traeger.name,
          data  // Hier übergeben wir das komplette Objekt mit original/ausstehend
        ]);
      }
    });

    // Mitfahrer Card
    const mitfahrerData = yearTotals['mitfahrer'];
    if (mitfahrerData && (mitfahrerData.original > 0 || mitfahrerData.ausstehend > 0)) {
      kategorien.push(['mitfahrer', 'Mitfahrer:innen', mitfahrerData]);
    }

    return kategorien;
  };

  const allCategories = () => {
    // Sammle alle einzigartigen Kategorien
    const categories = new Set([
      ...Object.keys(summary.erstattungen || {}),
      ...Object.keys(summary.mitfahrerErstattungen || {})
    ]);
    return categories.size; // Gibt die tatsächliche Anzahl der Kategorien zurück
  };

  // MonthlyOverview - nur diese useEffects
  useEffect(() => {
    fetchMonthlyData(); // Dieser holt die Daten für alle relevanten Monate
  }, []);  // Nur einmal beim Mount

  useEffect(() => {
    const filtered = monthlyData.filter(month => {
      if (selectedYear !== 'all' && month.year.toString() !== selectedYear) {
        return false;
      }

      if (hideCompleted) {
        const allCompleted = Object.entries(month.erstattungen || {}).every(([id, betrag]) => {
          return betrag === 0 || month.abrechnungsStatus?.[id]?.erhalten_am;
        });

        const mitfahrerCompleted = !month.erstattungen?.mitfahrer ||
        month.abrechnungsStatus?.mitfahrer?.erhalten_am;

        if (allCompleted && mitfahrerCompleted) {
          return false;
        }
      }
      return true;
    });
    setFilteredData(filtered);
  }, [monthlyData, hideCompleted, selectedYear]);

  const renderBetrag = (betrag, isReceived) => {
    return (
      <span className={isReceived ? "text-muted" : "text-value"}>
      {Number(betrag || 0).toFixed(2)} €
      </span>
    );
  };

  const QuickActions = ({ filteredData, handleAbrechnungsStatus, abrechnungstraeger }) => {
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
      {
        label: 'Alle als eingereicht markieren',
        action: async () => {
          const today = new Date().toISOString().split('T')[0];
          try {
            for (const month of filteredData) {
              // Für jeden Abrechnungsträger
              for (const traeger of abrechnungstraeger) {
                if (month.erstattungen?.[traeger.id] > 0 &&
                  !month.abrechnungsStatus?.[traeger.id]?.eingereicht_am) {
                    await handleAbrechnungsStatus(
                      month.year,
                      month.monatNr,
                      traeger.id,
                      'eingereicht',
                      today
                    );
                  }
              }
              // Für Mitfahrer
              if (month.erstattungen?.mitfahrer > 0 &&
                !month.abrechnungsStatus?.mitfahrer?.eingereicht_am) {
                  await handleAbrechnungsStatus(
                    month.year,
                    month.monatNr,
                    'mitfahrer',
                    'eingereicht',
                    today
                  );
                }
            }
          } catch (error) {
            console.error('Fehler beim Massenupdate:', error);
          }
        }
      },
      {
        label: 'Alle eingereichten als erhalten markieren',
        action: async () => {
          const today = new Date().toISOString().split('T')[0];
          try {
            for (const month of filteredData) {
              // Für jeden Abrechnungsträger
              for (const traeger of abrechnungstraeger) {
                if (month.abrechnungsStatus?.[traeger.id]?.eingereicht_am &&
                  !month.abrechnungsStatus?.[traeger.id]?.erhalten_am) {
                    await handleAbrechnungsStatus(
                      month.year,
                      month.monatNr,
                      traeger.id,
                      'erhalten',
                      today
                    );
                  }
              }
              // Für Mitfahrer
              if (month.abrechnungsStatus?.mitfahrer?.eingereicht_am &&
                !month.abrechnungsStatus?.mitfahrer?.erhalten_am) {
                  await handleAbrechnungsStatus(
                    month.year,
                    month.monatNr,
                    'mitfahrer',
                    'erhalten',
                    today
                  );
                }
            }
          } catch (error) {
            console.error('Fehler beim Massenupdate:', error);
          }
        }
      }
    ];

    return (
      <div className="relative">
      <button
      onClick={() => setIsOpen(!isOpen)}
      className="btn-primary w-full sm:w-auto flex items-center justify-between gap-2"
      >
      <span>Schnellaktionen</span>
      <span className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}>
      ▼
      </span>
      </button>

      {isOpen && (
        <>
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-primary-100 dark:border-primary-700 z-50">
        {actions.map((action, index) => (
          <button
          key={index}
          onClick={async () => {
            await action.action();
            setIsOpen(false);
          }}
          className="w-full text-left px-4 py-2 text-sm text-value hover:bg-primary-25 dark:hover:bg-primary-900 transition-colors duration-150"
          >
          {action.label}
          </button>
        ))}
        </div>
        </>
      )}
      </div>
    );
  };

  const renderStatusCell = (month, traegerId) => {
    const status = month.abrechnungsStatus?.[traegerId];
    const betrag = traegerId === 'mitfahrer'
    ? month.erstattungen?.mitfahrer || 0
    : month.erstattungen?.[traegerId] || 0;

    // Wenn Betrag 0 ist
    if (betrag === 0) {
      return (
        <div className="flex items-center justify-between">
        <span className="status-badge-secondary">
        <CheckCircle2 size={14} className="text-secondary-600 dark:text-secondary-400" />
        <span>Keine Abrechnung</span>
        </span>
        </div>
      );
    }

    // Wenn erhalten
    if (status?.erhalten_am) {
      return (
        <div className="flex items-center justify-between">
        <span
        className="status-badge-primary cursor-pointer"
        onClick={() => {
          showNotification(
            "Status zurücksetzen",
            "Möchten Sie den Status wirklich zurücksetzen?",
            () => handleAbrechnungsStatus(
              month.year,
              month.monatNr,
              traegerId,
              'reset'
            ),
            true // showCancel
          );
        }}
        >
        <CheckCircle2 size={14} />
        <span>Erhalten am: {new Date(status.erhalten_am).toLocaleDateString()}</span>
        </span>
        </div>
      );
    }

    // Wenn eingereicht aber nicht erhalten
    if (status?.eingereicht_am) {
      return (
        <div className="flex items-center justify-between">
        <span
        className="status-badge-secondary cursor-pointer"
        onClick={() => setAbrechnungsStatusModal({
          open: true,
          traegerId,
          aktion: 'erhalten',
          jahr: month.year,
          monat: month.monatNr
        })}
        >
        <Circle size={14} />
        <span>Eingereicht am: {new Date(status.eingereicht_am).toLocaleDateString()}</span>
        </span>
        </div>
      );
    }

    // Wenn noch nicht eingereicht
    return betrag > 0 ? (
      <div className="flex items-center justify-between">
      <span
      className="status-badge-secondary cursor-pointer"
      onClick={() => setAbrechnungsStatusModal({
        open: true,
        traegerId,
        aktion: 'eingereicht',
        jahr: month.year,
        monat: month.monatNr
      })}
      >
      <AlertCircle size={14} />
      <span>Nicht eingereicht</span>
      </span>
      </div>
    ) : null;
  };

  const yearTotal = calculateYearTotal();

  return (
    <div className="w-full max-w-full space-y-6">
    <div className="card-container-highlight mb-4">
    <div className="space-y-6 mb-4">
    {/* Header mit Navigation */}
    <div className="flex flex-col gap-4">
    {/* Erste Zeile */}
    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
    {/* Titel und Aktuelles Jahr - immer in einer Zeile */}
    <div className="flex justify-between items-center">
    <h2 className="text-lg font-medium text-value">
      Jahresübersicht {selectedYear === 'all' ? '— Alle Jahre' : selectedYear}
    </h2>
    {selectedYear !== currentYear && (
      <button onClick={() => setSelectedYear(currentYear)} className="sm:hidden btn-secondary">
      Aktuelles Jahr
      </button>
    )}
    </div>

    {/* Checkbox und Select - nur auf Desktop hier */}
    <div className="hidden sm:flex items-center gap-4 ml-auto">
    <label className="checkbox-label">
    {selectedYear !== currentYear && (
      <button onClick={() => setSelectedYear(currentYear)} className="btn-secondary">
      Aktuelles Jahr
      </button>
    )}
    <input
    type="checkbox"
    id="hideCompleted"
    checked={hideCompleted}
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="checkbox-input h-3 w-3"
    />
    <span className="text-xs text-label">Abgeschlossene</span>
    </label>
    <select
    value={selectedYear}
    onChange={(e) => setSelectedYear(e.target.value)}
    className="form-select w-24"
    >
    <option value="all">Gesamt</option>
    {[...new Set(monthlyData.map(m => m.year))]
      .sort((a, b) => b - a)
      .map(year => (
        <option key={year} value={year}>{year}</option>
      ))
    }
    </select>
    </div>
    </div>

    {/* Zweite Zeile - nur Mobile */}
    <div className="flex sm:hidden items-center justify-end gap-4">
    <label className="checkbox-label">
    <input
    type="checkbox"
    id="hideCompleted"
    checked={hideCompleted}
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="checkbox-input h-3 w-3"
    />
    <span className="text-xs text-label">Abgeschlossene</span>
    </label>
    <select
    value={selectedYear}
    onChange={(e) => setSelectedYear(e.target.value)}
    className="form-select w-24"
    >
    <option value="all">Gesamt</option>
    {[...new Set(monthlyData.map(m => m.year))]
      .sort((a, b) => b - a)
      .map(year => (
        <option key={year} value={year}>{year}</option>
      ))
    }
    </select>
    </div>

    {/* Dritte Zeile - Quick Actions nur auf Mobile */}
    <div className="">
    <QuickActions
    filteredData={filteredData}
    handleAbrechnungsStatus={handleAbrechnungsStatus}
    abrechnungstraeger={abrechnungstraeger}
    className="w-full text-center"
    />
    </div>
    </div>
    </div>

    {/* Cards Grid - wie in der Monatsübersicht */}
    <div className={`grid grid-cols-1 mb-4 ${
      getKategorienMitErstattung().length === 1
      ? 'sm:grid-cols-1 gap-y-4'
      : getKategorienMitErstattung().length === 2
      ? 'sm:grid-cols-2 gap-4'
      : getKategorienMitErstattung().length === 3
      ? 'sm:grid-cols-3 gap-4'
      : 'sm:grid-cols-2 lg:grid-cols-4 gap-4'
    }`}>
    {getKategorienMitErstattung().map(([key, displayName, data]) => {
      const traeger = abrechnungstraeger.find(t => t.id.toString() === key);
      const farbe = key === 'mitfahrer' ? MITFAHRER_FARBE : (traeger?.farbe || DEFAULT_FARBE);
      return (
        <div key={key} className="rounded-card p-4 shadow-card border border-card" style={getCardBg(farbe)}>
        <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-label">{displayName}</span>
        <span className="text-value font-medium">
        {(data.ausstehend || 0).toFixed(2)} €
        </span>
        </div>
        {data.original !== data.ausstehend && (
          <div className="text-right text-muted text-xs">
          Ursprünglich: {(data.original || 0).toFixed(2)} €
          </div>
        )}
        </div>
      );
    })}

    {/* Gesamt Card */}
    {yearTotal.gesamt && yearTotal.gesamt.original > 0 && (
      <div className="card-container col-span-1 sm:col-span-2 lg:col-span-full">
      <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-label">Gesamt</span>
      <span className="text-value font-medium">
      {(yearTotal.gesamt?.ausstehend || 0).toFixed(2)} €
      </span>
      </div>
      {yearTotal.gesamt?.original !== yearTotal.gesamt?.ausstehend && (
        <div className="text-right text-muted text-xs">
        Ursprünglich: {(yearTotal.gesamt?.original || 0).toFixed(2)} €
        </div>
      )}
      </div>
    )}
    </div>
    </div>
    {/* Desktop View - neue Card-basierte Ansicht */}
    <div className="hidden sm:block space-y-4">
    {filteredData.map((month) => {

      const originalGesamt = Object.values(month.erstattungen || {}).reduce((sum, betrag) =>
        sum + Number(betrag || 0), 0
      );

      const gesamtAusstehend = Object.entries(month.erstattungen || {}).reduce((sum, [id, betrag]) => {
        const received = month.abrechnungsStatus?.[id]?.erhalten_am;
        return sum + (received ? 0 : Number(betrag || 0));
      }, 0);

      return (
        <div key={month.yearMonth} className="card-container">
        {/* Header mit Monat und Gesamtsumme */}
        <div className="flex justify-between items-center mb-4 pb-2">
        <div className="flex items-center gap-2">
        <CalendarDays size={20} className="text-primary-400 dark:text-primary-500" />
        <h3 className="text-lg font-medium text-value">
        {month.monthName} {month.year}
        </h3>
        </div>
        <div className="text-right">
        <div className="text-value font-medium">
        {gesamtAusstehend.toFixed(2)} €
        </div>
        {gesamtAusstehend !== originalGesamt && (
          <div className="text-xs text-muted">
          Ursprünglich: {originalGesamt.toFixed(2)} €
          </div>
        )}
        </div>
        </div>

        {/* Grid für Abrechnungsträger */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {abrechnungstraeger
          .filter(traeger => {
            // Nur anzeigen wenn ein Betrag > 0 existiert
            const betrag = month.erstattungen?.[traeger.id] || 0;
            return betrag > 0;
          })
          .map(traeger => (
            <div key={traeger.id} className="rounded-card p-4 shadow-card border border-card" style={getCardBg(traeger.farbe)}>
            <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-value">{traeger.name}</span>
            <span className={month.abrechnungsStatus?.[traeger.id]?.erhalten_am ? "text-muted" : "text-value"}>
            {Number(month.erstattungen?.[traeger.id] || 0).toFixed(2)} €
            </span>
            </div>
            <div className="mt-2">
            {renderStatusCell(month, traeger.id)}
            </div>
            </div>
          ))}

        {/* Mitfahrer Card wenn vorhanden */}
        {month.erstattungen?.mitfahrer > 0 && (
          <div className="rounded-card p-4 shadow-card border border-card" style={getCardBg(MITFAHRER_FARBE)}>
          <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-value">Mitfahrer:innen</span>
          <span className={month.abrechnungsStatus?.mitfahrer?.erhalten_am ? "text-muted" : "text-value"}>
          {Number(month.erstattungen?.mitfahrer || 0).toFixed(2)} €
          </span>
          </div>
          <div className="mt-2">
          {renderStatusCell(month, 'mitfahrer')}
          </div>
          </div>
        )}
        </div>
        </div>
      );
    })}
    </div>

    {/* Mobile View */}
    <div className="sm:hidden space-y-4">
    {filteredData.map((month) => {
      const gesamtAusstehend = Object.entries(month.erstattungen || {}).reduce((sum, [id, betrag]) => {
        const received = month.abrechnungsStatus?.[id]?.erhalten_am;
        return sum + (received ? 0 : Number(betrag || 0));
      }, 0);

      const originalGesamt = Object.values(month.erstattungen || {}).reduce((sum, betrag) =>
        sum + Number(betrag || 0), 0
      );

      return (
        <div key={month.yearMonth} className="mobile-card">
        <div className="mobile-card-header mb-4">
        <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-primary-400 dark:text-primary-500" />
        <span className="text-lg font-semibold text-value">
        {month.monthName} {month.year}
        </span>
        </div>
        <div className="text-value font-medium">
        {gesamtAusstehend.toFixed(2)} €
        </div>
        </div>
        </div>

        {gesamtAusstehend !== originalGesamt && (
          <div className="text-muted text-xs text-right mb-4">
          Ursprünglich: {originalGesamt.toFixed(2)} €
          </div>
        )}

        <div className="space-y-4">
        {abrechnungstraeger
          .filter(traeger => {
            const betrag = month.erstattungen?.[traeger.id] || 0;
            return betrag > 0;
          })
          .map(traeger => (
            <div key={traeger.id} className="pt-4">
            <div className="flex justify-between items-start mb-2">
            <span className="text-label text-sm">{traeger.name}</span>
            <span className={month.abrechnungsStatus?.[traeger.id]?.erhalten_am ? "text-muted" : "text-value"}>
            {Number(month.erstattungen?.[traeger.id] || 0).toFixed(2)} €
            </span>
            </div>
            <div className="mt-2">
            {renderStatusCell(month, traeger.id)}
            </div>
            </div>
          ))}

        {/* Mitfahrer */}
        {month.erstattungen?.mitfahrer > 0 && (
          <div className="pt-4">
          <div className="flex justify-between items-start">
          <span className="text-label text-sm">Mitfahrer</span>
          <span className={month.abrechnungsStatus?.mitfahrer?.erhalten_am ? "text-muted" : "text-value"}>
          {Number(month.erstattungen?.mitfahrer || 0).toFixed(2)} €
          </span>
          </div>
          <div className="mt-2">
          {renderStatusCell(month, 'mitfahrer')}
          </div>
          </div>
        )}
        </div>
        </div>
      );
    })}
    </div>
    <AbrechnungsStatusModal
    isOpen={abrechnungsStatusModal.open && abrechnungsStatusModal.aktion !== 'reset'}
    onClose={() => setAbrechnungsStatusModal({})}
    onSubmit={(date) => handleAbrechnungsStatus(
      abrechnungsStatusModal.jahr,
      abrechnungsStatusModal.monat,
      abrechnungsStatusModal.traegerId,
      abrechnungsStatusModal.aktion,
      date
    )}
    traegerId={abrechnungsStatusModal.traegerId}
    aktion={abrechnungsStatusModal.aktion}
    />
    </div>
  );
}

export default MonthlyOverview;
