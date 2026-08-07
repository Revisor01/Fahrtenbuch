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

  // Löschen ohne Rückfrage, mit Toast + „Rückgängig" (legt die Fahrt mit
  // denselben Daten neu an — neue ID, Status wieder „Erfasst")
  const handleDelete = async (fahrt) => {
    setSwipeOffenId(null);
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
              onDelete={() => handleDelete(fahrt)}
            />
          ))}
        </div>
      )}

      <ExportSheet isOpen={exportOffen} onClose={() => setExportOffen(false)} />

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
