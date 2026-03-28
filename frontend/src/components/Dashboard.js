import React, { useContext, useMemo, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import FahrtForm from '../FahrtForm';
import { Banknote, Route, Car, Star, RotateCcw, ChevronLeft, ChevronRight, BarChart3, FileDown, Plus, Clock } from 'lucide-react';

const API_BASE_URL = '/api';

function Dashboard({ onNavigate }) {
  const {
    summary,
    fahrten,
    favoriten,
    executeFavorit,
    showNotification,
    refreshAllData,
    monthlyData,
    abrechnungstraeger
  } = useContext(AppContext);

  const [statistikJahr, setStatistikJahr] = useState(new Date().getFullYear());

  const offeneErstattungen = useMemo(() => {
    if (!summary?.erstattungen) return 0;
    return Object.values(summary.erstattungen).reduce((sum, val) => sum + (val || 0), 0);
  }, [summary]);

  // KPI: km and count for current month
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const { kmThisMonth, fahrtenThisMonth } = useMemo(() => {
    const monthTrips = fahrten.filter(f => f.datum && f.datum.startsWith(currentYearMonth));
    const km = monthTrips.reduce((sum, f) => sum + (parseFloat(f.kilometer) || 0), 0);
    return { kmThisMonth: km, fahrtenThisMonth: monthTrips.length };
  }, [fahrten, currentYearMonth]);

  // KPI: total trips count
  const fahrtenGesamt = fahrten.length;

  // Last 3 trips sorted by date descending, then by id descending
  const letzteTrips = useMemo(() => {
    const sorted = [...fahrten].sort((a, b) => {
      const dateA = new Date(a.datum);
      const dateB = new Date(b.datum);
      if (dateB - dateA !== 0) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });
    return sorted.slice(0, 3);
  }, [fahrten]);

  // Month abbreviations for chart labels
  const monatLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  // km per month from monthlyData (has totalKm per month from all loaded months)
  const kmProMonat = useMemo(() => {
    const result = Array(12).fill(0);
    monthlyData.forEach(md => {
      if (md.year === statistikJahr) {
        result[md.monatNr - 1] += md.totalKm || 0;
      }
    });
    return result;
  }, [monthlyData, statistikJahr]);

  // Fahrten count per month from monthlyData
  const fahrtenProMonat = useMemo(() => {
    const result = Array(12).fill(0);
    monthlyData.forEach(md => {
      if (md.year === statistikJahr) {
        result[md.monatNr - 1] += md.fahrtenCount || 0;
      }
    });
    return result;
  }, [monthlyData, statistikJahr]);

  const maxKm = useMemo(() => Math.max(...kmProMonat, 1), [kmProMonat]);
  const hasKmData = useMemo(() => kmProMonat.some(km => km > 0), [kmProMonat]);

  // Erstattungen per Traeger for the selected year from monthlyData
  const erstattungenProTraeger = useMemo(() => {
    const traegerMap = {};
    monthlyData
      .filter(md => md.year === statistikJahr)
      .forEach(md => {
        if (!md.erstattungen) return;
        Object.entries(md.erstattungen).forEach(([traeger, betrag]) => {
          traegerMap[traeger] = (traegerMap[traeger] || 0) + (betrag || 0);
        });
      });
    return traegerMap;
  }, [monthlyData, statistikJahr]);

  const gesamtErstattung = useMemo(() => {
    return Object.values(erstattungenProTraeger).reduce((sum, val) => sum + val, 0);
  }, [erstattungenProTraeger]);

  const hasErstattungen = Object.keys(erstattungenProTraeger).length > 0;

  // Map Träger-IDs to names
  const getTraegerName = (traegerId) => {
    if (!abrechnungstraeger) return traegerId;
    const found = abrechnungstraeger.find(t => String(t.id) === String(traegerId));
    return found ? found.name : traegerId;
  };

  const handleNochmal = async (fahrt) => {
    try {
      await axios.post(`${API_BASE_URL}/fahrten`, {
        vonOrtId: fahrt.von_ort_id || null,
        nachOrtId: fahrt.nach_ort_id || null,
        datum: new Date().toISOString().slice(0, 10),
        anlass: fahrt.anlass,
        abrechnung: fahrt.abrechnung,
        einmaligerVonOrt: fahrt.einmaliger_von_ort || null,
        einmaligerNachOrt: fahrt.einmaliger_nach_ort || null,
        kilometer: fahrt.kilometer
      });
      showNotification('Fahrt erstellt', `Fahrt ${fahrt.von_ort_name || fahrt.einmaliger_von_ort} \u2192 ${fahrt.nach_ort_name || fahrt.einmaliger_nach_ort} wurde f\u00FCr heute eingetragen.`);
      refreshAllData();
    } catch (error) {
      console.error('Fehler beim Duplizieren der Fahrt:', error);
      showNotification('Fehler', 'Fahrt konnte nicht erstellt werden.');
    }
  };

  const handleExecuteFavorit = (favorit) => {
    showNotification(
      'Favorit ausf\u00FChren',
      `${favorit.von_ort_name} \u2192 ${favorit.nach_ort_name}`,
      async () => {
        try {
          await executeFavorit(favorit.id, false);
          showNotification('Fahrt erstellt', 'Hinfahrt wurde f\u00FCr heute eingetragen.');
        } catch (error) {
          console.error('Fehler beim Ausf\u00FChren des Favoriten:', error);
          showNotification('Fehler', 'Favorit konnte nicht ausgef\u00FChrt werden.');
        }
      },
      true,
      'Nur Hinfahrt',
      async () => {
        try {
          await executeFavorit(favorit.id, true);
          showNotification('Fahrten erstellt', 'Hin- und R\u00FCckfahrt wurden f\u00FCr heute eingetragen.');
        } catch (error) {
          console.error('Fehler beim Ausf\u00FChren des Favoriten:', error);
          showNotification('Fehler', 'Favorit konnte nicht ausgef\u00FChrt werden.');
        }
      },
      'Mit R\u00FCckfahrt'
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards — 4 farbige Cards inkl. Export */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Offene Erstattungen */}
        <div className="rounded-card p-4 shadow-card border border-card bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted mb-1">Offene Erstattungen</p>
              <p className="text-xl font-semibold text-value truncate">{offeneErstattungen.toFixed(2).replace('.', ',')} &euro;</p>
            </div>
            <Banknote size={22} className="text-emerald-500 shrink-0" />
          </div>
        </div>

        {/* Kilometer diesen Monat */}
        <div className="rounded-card p-4 shadow-card border border-card bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted mb-1">km diesen Monat</p>
              <p className="text-xl font-semibold text-value truncate">{kmThisMonth.toFixed(1).replace('.', ',')} km</p>
            </div>
            <Route size={22} className="text-blue-500 shrink-0" />
          </div>
        </div>

        {/* Fahrten diesen Monat */}
        <div className="rounded-card p-4 shadow-card border border-card bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-muted mb-1">Fahrten diesen Monat</p>
              <p className="text-xl font-semibold text-value">{fahrtenThisMonth}</p>
            </div>
            <Car size={22} className="text-purple-500 shrink-0" />
          </div>
        </div>

        {/* Export-Schnellzugriff als prominente 4. Card */}
        <button
          onClick={() => onNavigate && onNavigate('fahrten')}
          className="rounded-card p-4 shadow-card border-2 border-primary-300 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/30 hover:shadow-card-hover hover:border-primary-400 dark:hover:border-primary-500 transition-all text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mb-1">Fahrten & Export</p>
              <p className="text-xl font-semibold text-value">{fahrtenGesamt}</p>
              <p className="text-xs text-muted">alle anzeigen &rarr;</p>
            </div>
            <FileDown size={22} className="text-primary-500 shrink-0" />
          </div>
        </button>
      </div>

      {/* Favoriten-Schnelleingabe */}
      <div className="card-container">
        <div className="flex items-center gap-2 mb-3">
          <Star size={18} className="text-yellow-500" />
          <h2 className="text-base font-medium text-value">Favoriten</h2>
        </div>
        {favoriten.length === 0 ? (
          <p className="text-sm text-muted">Keine Favoriten gespeichert.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {favoriten.map((fav) => (
              <button
                key={fav.id}
                onClick={() => handleExecuteFavorit(fav)}
                className="text-left rounded-card border border-card min-h-[44px] p-3 hover:shadow-card-hover transition-all"
              >
                <p className="text-sm font-medium text-value">
                  {fav.von_ort_name} &rarr; {fav.nach_ort_name}
                </p>
                {fav.anlass && (
                  <p className="text-xs text-muted mt-1">{fav.anlass}</p>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end mt-3">
          <button
            onClick={() => onNavigate && onNavigate('einstellungen')}
            className="text-sm px-3 py-1.5 rounded-card bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors"
          >
            Favoriten verwalten &rarr;
          </button>
        </div>
      </div>

      {/* Fahrt-Formular — immer sichtbar */}
      <div className="card-container">
        <div className="flex items-center gap-2 mb-4">
          <Plus size={18} className="text-primary-500" />
          <h2 className="text-base font-medium text-value">Neue Fahrt erfassen</h2>
        </div>
        <FahrtForm />
      </div>

      {/* Letzte 3 Fahrten */}
      <div className="card-container">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={18} className="text-orange-500" />
          <h2 className="text-base font-medium text-value">Letzte Fahrten</h2>
        </div>
        {letzteTrips.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Fahrten erfasst.</p>
        ) : (
          <div className="space-y-2">
            {letzteTrips.map((fahrt) => (
              <div
                key={fahrt.id}
                className="flex items-center justify-between rounded-card border border-card p-3 gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted text-xs whitespace-nowrap">{formatDate(fahrt.datum)}</span>
                    <span className="text-value font-medium truncate">
                      {fahrt.von_ort_name || fahrt.einmaliger_von_ort} &rarr; {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted">
                    <span>{fahrt.kilometer} km</span>
                    {fahrt.anlass && <span className="font-semibold text-value">&middot; {fahrt.anlass}</span>}
                    {fahrt.abrechnung && <span>&middot; {getTraegerName(fahrt.abrechnung)}</span>}
                    {fahrt.mitfahrer && fahrt.mitfahrer.length > 0 && (
                      <span>&middot; {fahrt.mitfahrer.length} Mitfahrer:in{fahrt.mitfahrer.length > 1 ? 'nen' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleNochmal(fahrt)}
                    className="btn-primary flex items-center gap-1 text-xs"
                    title="Nochmal für heute"
                  >
                    <RotateCcw size={12} />
                    <span className="hidden sm:inline">Nochmal</span>
                  </button>
                  <button
                    onClick={() => handleNochmal({ ...fahrt, von_ort_id: fahrt.nach_ort_id, nach_ort_id: fahrt.von_ort_id, von_ort_name: fahrt.nach_ort_name, nach_ort_name: fahrt.von_ort_name, einmaliger_von_ort: fahrt.einmaliger_nach_ort, einmaliger_nach_ort: fahrt.einmaliger_von_ort })}
                    className="btn-secondary flex items-center gap-1 text-xs"
                    title="Rückfahrt für heute eintragen"
                  >
                    <RotateCcw size={12} className="scale-x-[-1]" />
                    <span className="hidden sm:inline">Rückfahrt</span>
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-end mt-3">
              <button
                onClick={() => onNavigate && onNavigate('fahrten')}
                className="text-sm px-3 py-1.5 rounded-card bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-200 hover:bg-primary-200 dark:hover:bg-primary-700 transition-colors"
              >
                Alle Fahrten anzeigen &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Statistik: km-Chart + Erstattungen in einem Card */}
      <div className="card-container">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" />
            <h2 className="text-base font-medium text-value">Statistik {statistikJahr}</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStatistikJahr(statistikJahr - 1)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-hover transition-colors"
              title="Vorheriges Jahr"
            >
              <ChevronLeft size={18} className="text-muted" />
            </button>
            <button
              onClick={() => setStatistikJahr(statistikJahr + 1)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded hover:bg-hover transition-colors"
              title="N&auml;chstes Jahr"
            >
              <ChevronRight size={18} className="text-muted" />
            </button>
          </div>
        </div>
        {!hasKmData && !hasErstattungen ? (
          <p className="text-sm text-muted text-center py-8">{monthlyData.length === 0 ? 'Statistik wird geladen...' : `Keine Daten in ${statistikJahr}`}</p>
        ) : (
          <>
            {/* km-Balkendiagramm */}
            {hasKmData && (
              <div>
                <div className="flex items-end gap-1" style={{ height: '160px' }}>
                  {kmProMonat.map((km, i) => {
                    const heightPercent = (km / maxKm) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="relative w-full group flex items-end justify-center" style={{ height: '100%' }}>
                          <div
                            className="w-full rounded-t bg-primary-500 transition-all duration-300 relative"
                            style={{ height: `${Math.max(heightPercent, 1.5)}%` }}
                            title={`${km.toFixed(1)} km | ${fahrtenProMonat[i]} Fahrten`}
                          >
                            {km > 0 && (
                              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-muted whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center">
                                <span>{km.toFixed(0)} km</span>
                                <span>{fahrtenProMonat[i]} F.</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1 mt-1">
                  {monatLabels.map((label, i) => (
                    <div key={i} className="flex-1 text-center text-xs text-muted">{label}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Trennlinie zwischen Chart und Erstattungen */}
            {hasKmData && hasErstattungen && (
              <hr className="border-border my-4" />
            )}

            {/* Erstattungen pro Abrechnungstraeger */}
            {hasErstattungen && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Banknote size={18} className="text-emerald-500" />
                  <h3 className="text-sm font-medium text-value">Erstattungen</h3>
                </div>
                <table className="table-auto w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left text-muted font-normal pb-2">Abrechnungstr&auml;ger</th>
                      <th className="text-right text-muted font-normal pb-2">Gesamt (EUR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(erstattungenProTraeger)
                      .sort(([, a], [, b]) => b - a)
                      .map(([traeger, betrag]) => (
                        <tr key={traeger} className="border-b border-border">
                          <td className="py-2 text-value">{getTraegerName(traeger)}</td>
                          <td className="py-2 text-right text-value">{betrag.toFixed(2).replace('.', ',')} &euro;</td>
                        </tr>
                      ))}
                    <tr className="font-semibold">
                      <td className="pt-2 text-value">Gesamt</td>
                      <td className="pt-2 text-right text-value">{gesamtErstattung.toFixed(2).replace('.', ',')} &euro;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
