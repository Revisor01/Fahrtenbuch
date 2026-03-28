import React, { useContext, useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import FahrtForm from '../FahrtForm';
import { Banknote, Route, Car, Star, ChevronDown, ChevronUp, RotateCcw, ChevronLeft, ChevronRight, BarChart3, Plus, FileDown } from 'lucide-react';

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

  const [isFormOpen, setIsFormOpen] = useState(true);
  const [yearlyStats, setYearlyStats] = useState([]);
  const [statistikJahr, setStatistikJahr] = useState(new Date().getFullYear());

  // KPI: offene Erstattungen
  // Fetch yearly km stats from monthly-summary API
  useEffect(() => {
    const fetchYearlyStats = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/fahrten/monthly-summary`);
        setYearlyStats(response.data || []);
      } catch (error) {
        console.error('Fehler beim Laden der Jahresstatistik:', error);
      }
    };
    fetchYearlyStats();
  }, [fahrten]); // Refresh when fahrten change (new trip added)

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
  const letzteDrei = useMemo(() => {
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

  // km per month from yearlyStats (monthly-summary API — covers all months)
  const kmProMonat = useMemo(() => {
    const result = Array(12).fill(0);
    if (yearlyStats && yearlyStats.length > 0) {
      yearlyStats.forEach(entry => {
        if (!entry.yearMonth) return;
        const [y, m] = entry.yearMonth.split('-');
        if (parseInt(y) === statistikJahr && entry.erstattungen) {
          // Sum km from all Träger in this month (excluding mitfahrer to avoid double-counting)
          Object.entries(entry.erstattungen).forEach(([traeger, data]) => {
            if (traeger !== 'mitfahrer') {
              result[parseInt(m) - 1] += parseFloat(data.kilometer) || 0;
            }
          });
        }
      });
    }
    return result;
  }, [yearlyStats, statistikJahr]);

  // Fahrten count per month — not available from monthly-summary, use fahrten for current month
  const fahrtenProMonat = useMemo(() => {
    const result = Array(12).fill(0);
    fahrten.forEach(f => {
      if (!f.datum) return;
      const [y, m] = f.datum.split('-');
      if (parseInt(y) === statistikJahr) {
        result[parseInt(m) - 1]++;
      }
    });
    return result;
  }, [fahrten, statistikJahr]);

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
      {/* KPI Cards — 3 farbige Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
      </div>

      {/* Favoriten-Schnelleingabe */}
      <div className="card-container">
        <div className="flex items-center gap-2 mb-3">
          <Star size={18} className="text-yellow-500" />
          <h2 className="text-base font-medium text-value">Favoriten</h2>
        </div>
        {favoriten.length === 0 ? (
          <p className="text-sm text-muted">Keine Favoriten gespeichert. Erstelle Favoriten in den Einstellungen.</p>
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
      </div>

      {/* Fahrt-Formular */}
      <div className="card-container">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center justify-between w-full min-h-[44px]"
        >
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-primary-500" />
            <h2 className="text-base font-medium text-value">Neue Fahrt erfassen</h2>
          </div>
          {isFormOpen ? <ChevronUp size={18} className="text-muted" /> : <ChevronDown size={18} className="text-muted" />}
        </button>
        {isFormOpen && (
          <div className="mt-4 pt-4 border-t border-primary-100 dark:border-primary-800">
            <FahrtForm />
          </div>
        )}
      </div>

      {/* Letzte 3 Fahrten */}
      <div className="card-container">
        <h2 className="text-base font-medium text-value mb-3">Letzte Fahrten</h2>
        {letzteDrei.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Fahrten erfasst.</p>
        ) : (
          <div className="space-y-2">
            {letzteDrei.map((fahrt) => (
              <div
                key={fahrt.id}
                className="flex items-center justify-between rounded-card border border-card p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 text-sm flex-wrap sm:flex-nowrap">
                    <span className="text-muted whitespace-nowrap text-xs sm:text-sm">{formatDate(fahrt.datum)}</span>
                    <span className="text-value truncate text-xs sm:text-sm">
                      {fahrt.von_ort_name || fahrt.einmaliger_von_ort} &rarr; {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort}
                    </span>
                    <span className="text-muted whitespace-nowrap text-xs sm:text-sm">{fahrt.kilometer} km</span>
                  </div>
                </div>
                <div className="ml-2 sm:ml-3 flex items-center gap-1">
                  <button
                    onClick={() => handleNochmal(fahrt)}
                    className="flex items-center gap-1 min-h-[44px] px-3 py-2 text-xs rounded-md btn-primary whitespace-nowrap"
                    title="Nochmal für heute"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Nochmal</span>
                  </button>
                  <button
                    onClick={() => handleNochmal({ ...fahrt, von_ort_id: fahrt.nach_ort_id, nach_ort_id: fahrt.von_ort_id, von_ort_name: fahrt.nach_ort_name, nach_ort_name: fahrt.von_ort_name, einmaliger_von_ort: fahrt.einmaliger_nach_ort, einmaliger_nach_ort: fahrt.einmaliger_von_ort })}
                    className="flex items-center gap-1 min-h-[44px] px-3 py-2 text-xs rounded-md btn-secondary whitespace-nowrap"
                    title="Rückfahrt für heute eintragen"
                  >
                    <RotateCcw size={14} className="scale-x-[-1]" />
                    <span className="hidden sm:inline">Rückfahrt</span>
                  </button>
                </div>
              </div>
            ))}
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
          <p className="text-sm text-muted text-center py-8">Keine Daten in {statistikJahr}</p>
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
