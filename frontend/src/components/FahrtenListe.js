import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Car } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import { useToast } from './ui/Toast';
import { useErfassung } from '../contexts/ErfassungContext';
import Sheet from './ui/Sheet';
import EmptyState from './ui/EmptyState';
import FahrtForm from '../FahrtForm';
import ZeitraumSegmente from './fahrten/ZeitraumSegmente';
import StatusUebersicht from './fahrten/StatusUebersicht';
import FahrtKarte from './fahrten/FahrtKarte';
import FahrtenTabelle from './fahrten/FahrtenTabelle';
import ExportSheet from './fahrten/ExportSheet';
import { statusFromAbrechnung } from '../utils/statusLabels';
import { formatBetrag, rundeKilometer } from './fahrten/zeitraumUtils';

// Fahrtenliste (Phase R5, Design-Spec Screen 3):
// Titel + Segmented Control (aktueller Monat / Vormonat / Zeitraum) +
// Summenzeile mit Export, darunter die Fahrten — mobil als Karten mit
// Swipe-Aktionen. Bearbeiten öffnet das bestehende FahrtForm im Sheet,
// Löschen läuft ohne Rückfrage mit Toast + „Rückgängig" (R2-Muster).
// Der scrollende Bereich ist die App-Shell (.app-content, flex:1 /
// min-height:0 / overflow-y:auto) — kein zweiter Scroll-Container.
function FahrtenListe() {
  const {
    fahrten,
    summary,
    abrechnungstraeger,
    selectedMonth,
    selectedVonMonth,
    fetchFahrten,
    deleteFahrt,
    addFahrt,
    fetchMonthlyData,
    refreshAllData,
  } = useContext(AppContext);
  const toast = useToast();
  const erfassung = useErfassung();

  const [editingFahrt, setEditingFahrt] = useState(null);
  const [exportOffen, setExportOffen] = useState(false);
  const [swipeOffenId, setSwipeOffenId] = useState(null);

  useEffect(() => {
    fetchFahrten();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedVonMonth]);

  const istZeitraum = !!(selectedVonMonth && selectedVonMonth !== selectedMonth);

  const sortierteFahrten = useMemo(
    () => [...fahrten].sort((a, b) => (a.datum < b.datum ? 1 : a.datum > b.datum ? -1 : 0)),
    [fahrten]
  );

  const kmGesamt = useMemo(
    () => rundeKilometer(fahrten.reduce((sum, f) => sum + (parseFloat(f.kilometer) || 0), 0)),
    [fahrten]
  );

  // Status je Fahrt: Monatsstatus ihres Trägers (im Zeitraum-Modus liegt
  // der Status je Monat unter dem Monats-Key der Fahrt)
  const statusFuer = (fahrt) => {
    const st = summary?.abrechnungsStatus?.[String(fahrt.abrechnung)];
    return statusFromAbrechnung(
      istZeitraum ? st?.[String(fahrt.datum || '').slice(0, 7)] : st
    );
  };

  const traegerNameFuer = (fahrt) =>
    abrechnungstraeger?.find((t) => t.id === parseInt(fahrt.abrechnung))?.name || 'Unbekannt';

  // Löschen mit Rückfrage (User-Feedback 07.08.) — Fahrten sind Belege,
  // das versehentliche Wegwischen soll nicht unbemerkt passieren.
  const [loeschFrage, setLoeschFrage] = useState(null);

  const fragenObLoeschen = (fahrt) => {
    setSwipeOffenId(null);
    setLoeschFrage(fahrt);
  };

  const handleDelete = async (fahrt) => {
    setSwipeOffenId(null);
    setLoeschFrage(null);
    try {
      await deleteFahrt(fahrt.id);
      fetchMonthlyData();
      toast.success('Fahrt gelöscht.', {
        undo: async () => {
          try {
            await addFahrt({
              datum: fahrt.datum?.slice(0, 10),
              vonOrtId: fahrt.von_ort_id || null,
              nachOrtId: fahrt.nach_ort_id || null,
              einmaligerVonOrt: fahrt.einmaliger_von_ort || null,
              einmaligerNachOrt: fahrt.einmaliger_nach_ort || null,
              anlass: fahrt.anlass || '',
              kilometer: fahrt.kilometer,
              abrechnung: fahrt.abrechnung,
              mitfahrer: fahrt.mitfahrer || [],
            });
            fetchMonthlyData();
            toast.success('Fahrt wiederhergestellt.');
          } catch (error) {
            console.error('Fehler beim Wiederherstellen der Fahrt:', error);
            toast.error('Fahrt konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Fahrt:', error);
      toast.error('Beim Löschen der Fahrt ist ein Fehler aufgetreten.');
    }
  };

  const handleEdit = (fahrt) => {
    setSwipeOffenId(null);
    setEditingFahrt(fahrt);
  };

  // „Wiederholen" (Desktop-Tabelle): Erfassungsflow mit Prefill,
  // startet dank nachOrtId direkt in Schritt 2 — Datum heute
  const handleWiederholen = (fahrt) => {
    erfassung.open({
      vonOrtId: fahrt.von_ort_id,
      nachOrtId: fahrt.nach_ort_id,
      anlass: fahrt.anlass || '',
      abrechnung: fahrt.abrechnung,
    });
  };

  const monatLabel = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('de-DE', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="fahrtenliste">
      <div className="fl-titelzeile">
        <h1 className="fl-titel">Fahrten</h1>
        {sortierteFahrten.length > 0 && (
          <span className="fl-anzahl num">{sortierteFahrten.length}</span>
        )}
        {/* Gleicher Einstieg wie auf dem Dashboard: öffnet den Erfassungsflow */}
        <button
          type="button"
          className="dash-d-btn fl-neu-btn"
          onClick={() => erfassung.open()}
        >
          + Neue Fahrt
        </button>
      </div>

      <ZeitraumSegmente />

      <div className="fl-summe">
        <span className="fl-summe-wert num">{kmGesamt} km</span>
        <span className="fl-summe-punkt" aria-hidden="true">·</span>
        <span className="fl-summe-wert num">{formatBetrag(summary?.gesamtErstattung)} €</span>
        <button
          type="button"
          className="fl-export-link"
          onClick={() => setExportOffen(true)}
        >
          Export
        </button>
      </div>

      <StatusUebersicht />

      {sortierteFahrten.length === 0 ? (
        <EmptyState
          icon={<Car size={22} />}
          title={
            istZeitraum
              ? `Keine Fahrten von ${monatLabel(selectedVonMonth)} bis ${monatLabel(selectedMonth)}`
              : `Noch keine Fahrten im ${monatLabel(selectedMonth)}`
          }
          text="Eine neue Fahrt ist in wenigen Sekunden erfasst."
          actionLabel="Fahrt erfassen"
          onAction={() => erfassung.open()}
        />
      ) : (
        <>
          {/* < 768px: Karten mit Swipe */}
          <div className="fl-cards">
            {sortierteFahrten.map((fahrt) => (
              <FahrtKarte
                key={fahrt.id}
                fahrt={fahrt}
                status={statusFuer(fahrt)}
                traegerName={traegerNameFuer(fahrt)}
                istOffen={swipeOffenId === fahrt.id}
                onOeffnen={setSwipeOffenId}
                onEdit={() => handleEdit(fahrt)}
                onDelete={() => fragenObLoeschen(fahrt)}
              />
            ))}
          </div>
          {/* ≥ 768px: Tabelle nach dem Dashboard-Tabellen-Muster */}
          <FahrtenTabelle
            fahrten={sortierteFahrten}
            statusFuer={statusFuer}
            traegerNameFuer={traegerNameFuer}
            onEdit={handleEdit}
            onDelete={fragenObLoeschen}
            onWiederholen={handleWiederholen}
          />
        </>
      )}

      {/* FAB wie auf dem Dashboard — nur mobil sichtbar (CSS blendet ihn ≥768px aus) */}
      <button
        type="button"
        className="dash-fab"
        onClick={() => erfassung.open()}
        aria-label="Neue Fahrt erfassen"
      >
        +
      </button>

      <ExportSheet isOpen={exportOffen} onClose={() => setExportOffen(false)} />

      {/* Rückfrage vor dem Löschen; danach bleibt der Undo-Toast als Netz */}
      <Sheet
        isOpen={!!loeschFrage}
        onClose={() => setLoeschFrage(null)}
        title="Fahrt löschen?"
      >
        {loeschFrage && (
          <div className="fav-frage">
            <p className="fav-frage-text">
              {new Date(loeschFrage.datum).toLocaleDateString('de-DE')} ·{' '}
              {loeschFrage.nach_ort_name || loeschFrage.einmaliger_nach_ort}
              {loeschFrage.anlass ? ` · ${loeschFrage.anlass}` : ''} ·{' '}
              {rundeKilometer(loeschFrage.kilometer)} km
            </p>
            <button
              type="button"
              className="btn-destructive w-full"
              onClick={() => handleDelete(loeschFrage)}
            >
              Löschen
            </button>
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setLoeschFrage(null)}
            >
              Abbrechen
            </button>
          </div>
        )}
      </Sheet>

      <Sheet
        isOpen={!!editingFahrt}
        onClose={() => setEditingFahrt(null)}
        title="Fahrt bearbeiten"
      >
        {editingFahrt && (
          <FahrtForm
            editData={editingFahrt}
            onUpdate={() => {
              setEditingFahrt(null);
              refreshAllData();
            }}
            onCancel={() => setEditingFahrt(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

export default FahrtenListe;
