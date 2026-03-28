import React, { useContext, useState, useMemo } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import FahrtForm from '../FahrtForm';
import { Banknote, Route, Car, Star, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

const API_BASE_URL = '/api';

function Dashboard() {
  const {
    summary,
    fahrten,
    favoriten,
    executeFavorit,
    showNotification,
    refreshAllData
  } = useContext(AppContext);

  const [isFormOpen, setIsFormOpen] = useState(false);

  // KPI: offene Erstattungen
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

  const handleExecuteFavorit = async (favorit) => {
    try {
      await executeFavorit(favorit.id);
      showNotification('Fahrt erstellt', 'Favorit wurde f\u00FCr heute eingetragen.');
    } catch (error) {
      console.error('Fehler beim Ausfuehren des Favoriten:', error);
      showNotification('Fehler', 'Favorit konnte nicht ausgef\u00FChrt werden.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Offene Erstattungen */}
        <div className="rounded-lg p-4 shadow-sm border border-border bg-emerald-50 dark:bg-emerald-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Offene Erstattungen</p>
              <p className="text-2xl font-semibold text-value">{offeneErstattungen.toFixed(2).replace('.', ',')} &euro;</p>
            </div>
            <Banknote size={28} className="text-emerald-500" />
          </div>
        </div>

        {/* Kilometer diesen Monat */}
        <div className="rounded-lg p-4 shadow-sm border border-border bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Kilometer diesen Monat</p>
              <p className="text-2xl font-semibold text-value">{kmThisMonth.toFixed(1).replace('.', ',')} km</p>
            </div>
            <Route size={28} className="text-blue-500" />
          </div>
        </div>

        {/* Fahrten diesen Monat */}
        <div className="rounded-lg p-4 shadow-sm border border-border bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Fahrten diesen Monat</p>
              <p className="text-2xl font-semibold text-value">{fahrtenThisMonth}</p>
            </div>
            <Car size={28} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Favoriten-Schnelleingabe */}
      <div className="card p-4">
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
                className="text-left rounded-lg border border-border p-3 hover:bg-hover transition-colors"
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

      {/* Aufklappbares Fahrt-Formular */}
      <div className="card p-4">
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center justify-between w-full"
        >
          <h2 className="text-base font-medium text-value">Neue Fahrt erfassen</h2>
          {isFormOpen ? (
            <ChevronUp size={20} className="text-muted" />
          ) : (
            <ChevronDown size={20} className="text-muted" />
          )}
        </button>
        {isFormOpen && (
          <div className="mt-4">
            <FahrtForm />
          </div>
        )}
      </div>

      {/* Letzte 3 Fahrten */}
      <div className="card p-4">
        <h2 className="text-base font-medium text-value mb-3">Letzte Fahrten</h2>
        {letzteDrei.length === 0 ? (
          <p className="text-sm text-muted">Noch keine Fahrten erfasst.</p>
        ) : (
          <div className="space-y-2">
            {letzteDrei.map((fahrt) => (
              <div
                key={fahrt.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted whitespace-nowrap">{formatDate(fahrt.datum)}</span>
                    <span className="text-value truncate">
                      {fahrt.von_ort_name || fahrt.einmaliger_von_ort} &rarr; {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort}
                    </span>
                    <span className="text-muted whitespace-nowrap">{fahrt.kilometer} km</span>
                  </div>
                </div>
                <button
                  onClick={() => handleNochmal(fahrt)}
                  className="ml-3 flex items-center gap-1 px-3 py-1 text-xs rounded-md btn-primary whitespace-nowrap"
                  title="Nochmal f\u00FCr heute"
                >
                  <RotateCcw size={14} />
                  <span className="hidden sm:inline">Nochmal</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
