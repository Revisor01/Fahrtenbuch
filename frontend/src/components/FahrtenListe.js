import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Car, Pencil, Trash2, RotateCw, ArrowLeftRight } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import { useToast } from './ui/Toast';
import { useErfassung } from '../contexts/ErfassungContext';
import Sheet from './ui/Sheet';
import AktionsSheet from './ui/AktionsSheet';
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
  // Angetippte Fahrt: zeigt Details + Aktionen
  const [aktionsFahrt, setAktionsFahrt] = useState(null);

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

  // Gegenfahrt eines Hin-und-Rueck-Paares. Sie liegt nur dann vor, wenn sie im
  // geladenen Zeitraum enthalten ist — bei Monatswechseln (Hinfahrt 31.,
  // Rueckfahrt 1.) kann sie fehlen, dann zeigen wir nur den Hinweis.
  const partnerVon = (fahrt) =>
    fahrt?.partner_fahrt_id
      ? fahrten.find((f) => f.id === fahrt.partner_fahrt_id) || null
      : null;

  // Welche Richtung ist diese Fahrt im Paar? Die kleinere ID wurde zuerst
  // erfasst — dieselbe Regel wie im Export.
  const istHinfahrt = (fahrt) =>
    fahrt?.partner_fahrt_id ? fahrt.id < fahrt.partner_fahrt_id : null;

  // Löschen mit Rückfrage (User-Feedback 07.08.) — Fahrten sind Belege,
  // das versehentliche Wegwischen soll nicht unbemerkt passieren.
  const [loeschFrage, setLoeschFrage] = useState(null);

  const fragenObLoeschen = (fahrt) => {
    setLoeschFrage(fahrt);
  };

  // auchPartner: bei verknuepften Fahrten beide Richtungen auf einmal loeschen.
  // Die Gegenfahrt zuerst, damit die Spiegelung der Mitfahrer noch greift —
  // beim Loeschen der zweiten gibt es keinen Partner mehr aufzuraeumen.
  const handleDelete = async (fahrt, auchPartner = false) => {
    setLoeschFrage(null);
    const partner = auchPartner ? partnerVon(fahrt) : null;
    try {
      if (partner) {
        await deleteFahrt(partner.id);
      }
      await deleteFahrt(fahrt.id);
      fetchMonthlyData();
      if (partner) {
        toast.success('Hin- und Rückfahrt gelöscht.');
        return;
      }
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
    setEditingFahrt(fahrt);
  };

  // „Wiederholen": Erfassungsflow mit Prefill, startet dank nachOrtId direkt
  // in Schritt 2 — Datum heute
  const handleWiederholen = (fahrt) => {
    erfassung.open({
      vonOrtId: fahrt.von_ort_id,
      nachOrtId: fahrt.nach_ort_id,
      anlass: fahrt.anlass || '',
      abrechnung: fahrt.abrechnung,
    });
  };

  // Rückfahrt: dieselbe Strecke rückwärts, am selben Tag. Der häufigste Fall
  // nach einer Hinfahrt — deshalb direkt anlegen statt über den Erfassungsflow.
  const handleRueckfahrt = async (fahrt) => {
    try {
      await addFahrt({
        datum: fahrt.datum?.slice(0, 10),
        vonOrtId: fahrt.nach_ort_id || null,
        nachOrtId: fahrt.von_ort_id || null,
        einmaligerVonOrt: fahrt.einmaliger_nach_ort || null,
        einmaligerNachOrt: fahrt.einmaliger_von_ort || null,
        anlass: fahrt.anlass ? `Rückfahrt: ${fahrt.anlass}` : 'Rückfahrt',
        kilometer: fahrt.kilometer,
        abrechnung: fahrt.abrechnung,
        mitfahrer: [],
        // Beide Fahrten als Paar verknüpfen — Mitfahrer mit „Hin- und
        // Rückfahrt" gelten dann für beide
        partnerFahrtId: fahrt.id,
      });
      fetchMonthlyData();
      toast.success('Rückfahrt angelegt.');
    } catch (error) {
      console.error('Fehler beim Anlegen der Rückfahrt:', error);
      toast.error('Rückfahrt konnte nicht angelegt werden.');
    }
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
          {/* < 768px: Karten — ein Tipp öffnet Details + Aktionen */}
          <div className="fl-cards">
            {sortierteFahrten.map((fahrt) => (
              <FahrtKarte
                key={fahrt.id}
                fahrt={fahrt}
                status={statusFuer(fahrt)}
                traegerName={traegerNameFuer(fahrt)}
                onOeffnen={setAktionsFahrt}
              />
            ))}
          </div>
          {/* ≥ 768px: Tabelle nach dem Dashboard-Tabellen-Muster */}
          <FahrtenTabelle
            fahrten={sortierteFahrten}
            statusFuer={statusFuer}
            traegerNameFuer={traegerNameFuer}
            onOeffnen={setAktionsFahrt}
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
      {aktionsFahrt && (
        <AktionsSheet
          isOpen
          onClose={() => setAktionsFahrt(null)}
          titel={
            aktionsFahrt.anlass ||
            aktionsFahrt.nach_ort_name ||
            aktionsFahrt.einmaliger_nach_ort ||
            'Fahrt'
          }
          untertitel={new Date(aktionsFahrt.datum).toLocaleDateString('de-DE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          zeilen={[
            {
              label: 'Strecke',
              wert: `${aktionsFahrt.von_ort_name || aktionsFahrt.einmaliger_von_ort || '—'} → ${
                aktionsFahrt.nach_ort_name || aktionsFahrt.einmaliger_nach_ort || '—'
              }`,
            },
            { label: 'Kilometer', wert: `${rundeKilometer(aktionsFahrt.kilometer)} km` },
            { label: 'Träger', wert: traegerNameFuer(aktionsFahrt) },
            { label: 'Erstattung', wert: `${formatBetrag(aktionsFahrt.erstattung)} €` },
            ...(aktionsFahrt.mitfahrer?.length
              ? [{ label: 'Mitfahrer', wert: aktionsFahrt.mitfahrer.map((m) => m.name).join(', ') }]
              : []),
            // Gegenfahrt mit ihren Werten — sonst muesste man sie in der Liste
            // suchen, um zu sehen, was dort steht
            ...(aktionsFahrt.partner_fahrt_id
              ? [
                  {
                    label: istHinfahrt(aktionsFahrt) ? 'Rückfahrt' : 'Hinfahrt',
                    wert: (() => {
                      const p = partnerVon(aktionsFahrt);
                      if (!p) return 'außerhalb des gewählten Zeitraums';
                      const strecke = `${p.von_ort_name || p.einmaliger_von_ort || '—'} → ${
                        p.nach_ort_name || p.einmaliger_nach_ort || '—'
                      }`;
                      const betrag =
                        p.erstattung != null ? `, ${formatBetrag(p.erstattung)} €` : '';
                      return `${strecke} · ${rundeKilometer(p.kilometer)} km${betrag}`;
                    })(),
                  },
                ]
              : []),
          ]}
          aktionen={[
            {
              id: 'bearbeiten',
              label: 'Bearbeiten',
              icon: Pencil,
              onClick: () => handleEdit(aktionsFahrt),
            },
            // Nur anbieten, solange es keine Gegenfahrt gibt — sonst entstuenden
            // Doppelungen. Wird die Gegenfahrt geloescht, faellt
            // partner_fahrt_id auf NULL und die Aktion erscheint wieder.
            ...(aktionsFahrt.partner_fahrt_id
              ? []
              : [
                  {
                    id: 'rueckfahrt',
                    label: 'Rückfahrt hinzufügen',
                    icon: ArrowLeftRight,
                    hinweis: 'Dieselbe Strecke zurück, am selben Tag',
                    onClick: () => handleRueckfahrt(aktionsFahrt),
                  },
                ]),
            {
              id: 'wiederholen',
              label: 'Für heute wiederholen',
              icon: RotateCw,
              hinweis: 'Legt dieselbe Fahrt mit heutigem Datum an',
              onClick: () => handleWiederholen(aktionsFahrt),
            },
            {
              id: 'loeschen',
              label: 'Löschen',
              icon: Trash2,
              variant: 'gefahr',
              onClick: () => fragenObLoeschen(aktionsFahrt),
            },
          ]}
        />
      )}

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
            {loeschFrage.partner_fahrt_id && (
              <p className="fav-frage-hinweis">
                {(() => {
                  const p = partnerVon(loeschFrage);
                  const richtung = istHinfahrt(loeschFrage) ? 'Rückfahrt' : 'Hinfahrt';
                  if (!p) {
                    return `Diese Fahrt gehört zu einer Hin- und Rückfahrt. Die ${richtung} liegt außerhalb des gewählten Zeitraums und bleibt bestehen.`;
                  }
                  return `Dazu gehört die ${richtung} ${
                    p.von_ort_name || p.einmaliger_von_ort || '—'
                  } → ${p.nach_ort_name || p.einmaliger_nach_ort || '—'} · ${rundeKilometer(
                    p.kilometer
                  )} km. Mitfahrer:innen, die für beide Richtungen eingetragen sind, werden dort mit entfernt.`;
                })()}
              </p>
            )}
            <button
              type="button"
              className="btn-destructive w-full"
              onClick={() => handleDelete(loeschFrage)}
            >
              {loeschFrage.partner_fahrt_id ? 'Nur diese Fahrt löschen' : 'Löschen'}
            </button>
            {loeschFrage.partner_fahrt_id && partnerVon(loeschFrage) && (
              <button
                type="button"
                className="btn-destructive w-full"
                onClick={() => handleDelete(loeschFrage, true)}
              >
                Beide Fahrten löschen
              </button>
            )}
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
