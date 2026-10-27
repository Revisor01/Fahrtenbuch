import React, { useContext, useEffect, useMemo, useState } from 'react';
import logFehler from '../utils/logFehler';
import { Car, Pencil, Trash2, RotateCw, ArrowLeftRight, CloudOff } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import { useToast } from './ui/Toast';
import { useErfassung } from '../contexts/ErfassungContext';
import Sheet from './ui/Sheet';
import AktionsSheet from './ui/AktionsSheet';
import EmptyState from './ui/EmptyState';
import FahrtForm from '../FahrtForm';
import ZeitraumSegmente from './fahrten/ZeitraumSegmente';
import FahrtKarte from './fahrten/FahrtKarte';
import FahrtenTabelle from './fahrten/FahrtenTabelle';
import ExportSheet from './fahrten/ExportSheet';
import { statusFromAbrechnung, statusLabel } from '../utils/statusLabels';
import { formatBetrag, rundeKilometer, kategorienMitErstattung } from './fahrten/zeitraumUtils';
import usePassendeGroesse from './fahrten/usePassendeGroesse';

// Fahrtenliste mit Zeitraumwahl, Summenzeile und Export; die App-Shell scrollt, kein zweiter Scroll-Container.
function FahrtenListe() {
  const {
    fahrten,
    summary,
    abrechnungstraeger,
    selectedMonth,
    selectedVonMonth,
    fetchFahrten,
    fahrtenFehler,
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

  // Träger, die im Zeitraum tatsächlich erstatten, Mitfahrer:innen als eigener Posten.
  const { setzeRef: setzeWertRef, groesse: wertGroesse } = usePassendeGroesse(
    [sortierteFahrten.length, kmGesamt, summary?.gesamtErstattung]
  );

  const traegerBetraege = useMemo(
    () => kategorienMitErstattung(summary, abrechnungstraeger),
    [summary, abrechnungstraeger]
  );

  // Status je Fahrt aus dem Monatsstatus ihres Trägers.
  const statusFuer = (fahrt) => {
    const st = summary?.abrechnungsStatus?.[String(fahrt.abrechnung)];
    return statusFromAbrechnung(
      istZeitraum ? st?.[String(fahrt.datum || '').slice(0, 7)] : st
    );
  };

  const traegerNameFuer = (fahrt) =>
    abrechnungstraeger?.find((t) => t.id === parseInt(fahrt.abrechnung))?.name || 'Unbekannt';

  // Gegenfahrt nur, wenn sie im geladenen Zeitraum liegt, sonst nur der Hinweis.
  const partnerVon = (fahrt) =>
    fahrt?.partner_fahrt_id
      ? fahrten.find((f) => f.id === fahrt.partner_fahrt_id) || null
      : null;

  // Die kleinere ID ist die Hinfahrt, wie im Export.
  const istHinfahrt = (fahrt) =>
    fahrt?.partner_fahrt_id ? fahrt.id < fahrt.partner_fahrt_id : null;

  // Mit Rückfrage, Fahrten sind Belege.
  const [loeschFrage, setLoeschFrage] = useState(null);

  const fragenObLoeschen = (fahrt) => {
    setLoeschFrage(fahrt);
  };

  // Gegenfahrt zuerst, damit die Spiegelung der Mitfahrer noch greift.
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
            logFehler('Fehler beim Wiederherstellen der Fahrt:', error);
            toast.error('Fahrt konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      logFehler('Fehler beim Löschen der Fahrt:', error);
      toast.error('Beim Löschen der Fahrt ist ein Fehler aufgetreten.');
    }
  };

  const handleEdit = (fahrt) => {
    setEditingFahrt(fahrt);
  };

  // Flow mit Prefill, startet dank nachOrtId in Schritt 2.
  const handleWiederholen = (fahrt) => {
    erfassung.open({
      vonOrtId: fahrt.von_ort_id,
      nachOrtId: fahrt.nach_ort_id,
      anlass: fahrt.anlass || '',
      abrechnung: fahrt.abrechnung,
    });
  };

  // Rückfahrt am selben Tag direkt anlegen, der häufigste Fall.
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
        // Als Paar verknüpfen, damit „Hin- und Rückfahrt“-Mitfahrer für beide gelten.
        partnerFahrtId: fahrt.id,
      });
      fetchMonthlyData();
      toast.success('Rückfahrt angelegt.');
    } catch (error) {
      logFehler('Fehler beim Anlegen der Rückfahrt:', error);
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

      {/* Der Fahrten-Tab zeigt nur noch, was dieser Zeitraum enthaelt:
          Kilometer, Summe, Anzahl. Die Erstattungs-Karte mit Status je
          Traeger stand hier und im Abrechnungs-Tab — doppelt und damit
          unklar, wofuer welcher Tab da ist (Simons Entscheidung 16.08.).
          Die Zahlen brauchen trotzdem eine Flaeche: frei zwischen
          Monatswahl und Liste standen sie verloren. */}
      <div className="fl-summe-karte">
        {/* Die Schriftgroesse richtet sich nach dem laengsten Wert: Ein
            Monat mit „14,95 €" steht gross da, ein Jahreszeitraum mit
            „4.368,00 €" so viel kleiner, wie er es braucht. Fest kleiner waere
            fuer den Normalfall schade, Kuerzen bei Betraegen keine Option
            (Simon 16.08.). */}
        <div className="fl-summe-werte" style={{ fontSize: `${wertGroesse}px` }}>
          <div className="fl-summe-spalte">
            <span className="fl-summe-label">Fahrten</span>
            <span className="fl-summe-wert num" ref={setzeWertRef(0)}>{sortierteFahrten.length}</span>
          </div>
          <div className="fl-summe-spalte">
            <span className="fl-summe-label">Kilometer</span>
            <span className="fl-summe-wert num" ref={setzeWertRef(1)}>{kmGesamt} km</span>
          </div>
          <div className="fl-summe-spalte">
            <span className="fl-summe-label">Erstattung</span>
            <span className="fl-summe-wert num" ref={setzeWertRef(2)}>{formatBetrag(summary?.gesamtErstattung)} €</span>
          </div>
        </div>
        {/* Statt der blossen Traeger-Anzahl jeder Traeger mit seinem Betrag:
            Die Summe oben sagt, wie viel es insgesamt gibt — hier steht, von
            wem. Damit ist der Monat auf einen Blick vollstaendig, ohne in die
            Abrechnung zu wechseln (Simon 16.08.). */}
        {traegerBetraege.length > 0 && (
          <ul className="fl-summe-traeger">
            {traegerBetraege.map((k) => (
              <li key={k.key}>
                <span className="fl-summe-traeger-name">{k.name}</span>
                <span className="fl-summe-traeger-betrag num">{formatBetrag(k.betrag)} €</span>
              </li>
            ))}
          </ul>
        )}
        <div className="fl-summe-fuss">
          <button
            type="button"
            className="fl-export-link"
            onClick={() => setExportOffen(true)}
          >
            Export
          </button>
        </div>
      </div>

      {/* Konnte nicht geladen werden ist etwas anderes als „nichts da". Stand
          hier frueher „Noch keine Fahrten im September", obwohl nur das Netz
          fehlte, erfasste die Nutzer:in sie ein zweites Mal — und rechnete
          sie doppelt ab. */}
      {sortierteFahrten.length === 0 && fahrtenFehler ? (
        <EmptyState
          icon={<CloudOff size={22} />}
          title="Die Fahrten konnten nicht geladen werden"
          text={fahrtenFehler}
          actionLabel="Erneut versuchen"
          onAction={() => fetchFahrten()}
        />
      ) : sortierteFahrten.length === 0 ? (
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
          {/* < 768px: Zeilenliste im Dashboard-Muster — eine Karte, getrennte
              Zeilen; ein Tipp öffnet Details + Aktionen */}
          <div className="fl-cards">
            {sortierteFahrten.map((fahrt) => (
              <FahrtKarte
                key={fahrt.id}
                fahrt={fahrt}
                status={statusFuer(fahrt)}
                onOeffnen={setAktionsFahrt}
                // Ohne Server-ID liefen die Aktionen mit der Temp-ID gegen die API.
                gesperrt={!!fahrt._optimistisch}
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
            // Eigene Zeile, im Titel steht der Anlass nur, wenn es einen gibt.
            { label: 'Anlass', wert: aktionsFahrt.anlass || '—' },
            {
              label: 'Strecke',
              wert: `${aktionsFahrt.von_ort_name || aktionsFahrt.einmaliger_von_ort || '—'} → ${
                aktionsFahrt.nach_ort_name || aktionsFahrt.einmaliger_nach_ort || '—'
              }`,
            },
            { label: 'Kilometer', wert: `${rundeKilometer(aktionsFahrt.kilometer)} km` },
            { label: 'Träger', wert: traegerNameFuer(aktionsFahrt) },
            { label: 'Status', wert: statusLabel(statusFuer(aktionsFahrt)) },
            { label: 'Erstattung', wert: `${formatBetrag(aktionsFahrt.erstattung)} €` },
            ...(aktionsFahrt.mitfahrer?.length
              ? [{ label: 'Mitfahrer', wert: aktionsFahrt.mitfahrer.map((m) => m.name).join(', ') }]
              : []),
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
            // Nur ohne Gegenfahrt, sonst entstünden Doppelungen.
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
            // Nur bei gespeicherten Orten, der Flow kennt keine einmaligen Adressen als Prefill.
            ...(aktionsFahrt.nach_ort_id
              ? [
                  {
                    id: 'wiederholen',
                    label: 'Für heute wiederholen',
                    icon: RotateCw,
                    hinweis: 'Legt dieselbe Fahrt mit heutigem Datum an',
                    onClick: () => handleWiederholen(aktionsFahrt),
                  },
                ]
              : []),
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
