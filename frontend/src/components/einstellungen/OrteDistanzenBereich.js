import React, { useMemo, useState, useContext } from 'react';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import Sheet from '../ui/Sheet';
import AddressAutocomplete from '../AddressAutocomplete';
import BereichKopf from './BereichKopf';
import fehlerText from '../../utils/fehlerText';

const ORT_TYPEN = [
  { value: '', label: 'Sonstiger Ort' },
  { value: 'wohnort', label: 'Wohnort' },
  { value: 'dienstort', label: 'Dienstort' },
  { value: 'kirchspiel', label: 'Kirchspiel' },
];

function getOrtTyp(ort) {
  if (ort.ist_wohnort) return 'wohnort';
  if (ort.ist_dienstort) return 'dienstort';
  if (ort.ist_kirchspiel) return 'kirchspiel';
  return '';
}

function getOrtTypLabel(ort) {
  const typ = getOrtTyp(ort);
  const eintrag = ORT_TYPEN.find((t) => t.value === typ);
  return typ ? eintrag.label : '';
}

// Formular im Sheet: Name, Adresse, Art des Ortes (kleines Formular = Sheet)
function OrtSheet({ offen, ort, orte, onClose, onSave }) {
  const [name, setName] = useState(ort?.name || '');
  const [adresse, setAdresse] = useState(ort?.adresse || '');
  const [typ, setTyp] = useState(ort ? getOrtTyp(ort) : '');

  const [laeuft, setLaeuft] = useState(false);

  const hatWohnort = orte.some((o) => o.ist_wohnort && o.id !== ort?.id);

  // Sperre gegen Doppel-Tap: das Sheet bleibt waehrend des Requests offen,
  // ein zweiter Klick legte sonst denselben Ort ein zweites Mal an.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (laeuft) return;
    setLaeuft(true);
    try {
      await onSave({ name, adresse, typ });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title={ort ? 'Ort bearbeiten' : 'Ort anlegen'}>
      <form onSubmit={handleSubmit} className="set-sheet-form">
        <div>
          <label className="form-label" htmlFor="ort-name">Name</label>
          <input
            id="ort-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="z.B. Meldorf"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="ort-adresse">Adresse</label>
          <AddressAutocomplete
            value={adresse}
            onChange={setAdresse}
            placeholder="Vollständige Adresse"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="ort-typ">Art des Ortes</label>
          <select
            id="ort-typ"
            value={typ}
            onChange={(e) => setTyp(e.target.value)}
            className="form-select"
          >
            {ORT_TYPEN.filter((t) => t.value !== 'wohnort' || !hatWohnort || typ === 'wohnort').map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="set-sheet-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={laeuft}>
            {laeuft ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

// Formular im Sheet: Von, Nach, Kilometer
function DistanzSheet({ offen, distanz, orte, distanzen, onClose, onSave }) {
  const [vonOrtId, setVonOrtId] = useState(distanz ? String(distanz.von_ort_id) : '');
  const [nachOrtId, setNachOrtId] = useState(distanz ? String(distanz.nach_ort_id) : '');
  const [km, setKm] = useState(distanz ? String(distanz.distanz) : '');
  const [laeuft, setLaeuft] = useState(false);

  const sortierteOrte = [...orte].sort((a, b) => a.name.localeCompare(b.name));

  // Bestehende Distanz für das gewählte Paar vorbefüllen (wie bisher)
  const bestehende = useMemo(() => {
    if (distanz || !vonOrtId || !nachOrtId) return null;
    return distanzen.find(
      (d) =>
        (d.von_ort_id === parseInt(vonOrtId) && d.nach_ort_id === parseInt(nachOrtId)) ||
        (d.von_ort_id === parseInt(nachOrtId) && d.nach_ort_id === parseInt(vonOrtId))
    ) || null;
  }, [distanz, vonOrtId, nachOrtId, distanzen]);

  const handlePaar = (setter) => (e) => {
    setter(e.target.value);
    setKm('');
  };

  const kmWert = km === '' && bestehende ? String(bestehende.distanz) : km;

  // Sperre gegen Doppel-Tap, sonst entstehen zwei Distanzen
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (laeuft) return;
    setLaeuft(true);
    try {
      await onSave({ vonOrtId, nachOrtId, distanz: parseInt(kmWert, 10) });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title={distanz ? 'Distanz bearbeiten' : 'Distanz anlegen'}>
      <form onSubmit={handleSubmit} className="set-sheet-form">
        {distanz ? (
          <div className="set-subsatz" style={{ marginBottom: 0 }}>
            Strecke: <strong>{distanz.vonName} → {distanz.nachName}</strong>
          </div>
        ) : (
          <>
            <div>
              <label className="form-label" htmlFor="dist-von">Von</label>
              <select
                id="dist-von"
                value={vonOrtId}
                onChange={handlePaar(setVonOrtId)}
                className="form-select"
                required
              >
                <option value="">Ort auswählen</option>
                {sortierteOrte.map((ort) => (
                  <option key={ort.id} value={ort.id}>{ort.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label" htmlFor="dist-nach">Nach</label>
              <select
                id="dist-nach"
                value={nachOrtId}
                onChange={handlePaar(setNachOrtId)}
                className="form-select"
                required
              >
                <option value="">Ort auswählen</option>
                {sortierteOrte.map((ort) => (
                  <option key={ort.id} value={ort.id}>{ort.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="form-label" htmlFor="dist-km">Kilometer</label>
          <input
            id="dist-km"
            type="number"
            min="1"
            value={kmWert}
            onChange={(e) => setKm(e.target.value)}
            className="form-input"
            placeholder="km"
            required
          />
          {bestehende && (
            <p className="form-error-message" style={{ color: 'var(--text-2)' }}>
              Für diese Strecke gibt es schon {bestehende.distanz} km — Speichern aktualisiert den Wert.
            </p>
          )}
        </div>
        <div className="set-sheet-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={laeuft}>
            {laeuft ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function OrteDistanzenBereich() {
  const {
    orte, distanzen,
    addOrt, updateOrt, deleteOrt,
    addDistanz, updateDistanz, deleteDistanz,
  } = useContext(AppContext);
  const toast = useToast();

  const [suche, setSuche] = useState('');
  // null | { mode: 'neu' } | { mode: 'edit', ort }
  const [ortSheet, setOrtSheet] = useState(null);
  const [distSheet, setDistSheet] = useState(null);

  const dienstort = orte.find((o) => o.ist_dienstort);

  const getOrtName = (id) => orte.find((o) => o.id === id)?.name || 'Unbekannt';

  // Distanz ab Dienstort (Spec-Beispiel „ab Wesselburen")
  const distanzAbDienstort = (ort) => {
    if (!dienstort || ort.id === dienstort.id) return null;
    const d = distanzen.find(
      (x) =>
        (x.von_ort_id === dienstort.id && x.nach_ort_id === ort.id) ||
        (x.von_ort_id === ort.id && x.nach_ort_id === dienstort.id)
    );
    return d ? d.distanz : null;
  };

  const gefilterteOrte = useMemo(() => {
    const sortiert = [...orte].sort((a, b) => a.name.localeCompare(b.name));
    if (!suche.trim()) return sortiert;
    const q = suche.trim().toLowerCase();
    return sortiert.filter(
      (o) => o.name.toLowerCase().includes(q) || (o.adresse || '').toLowerCase().includes(q)
    );
  }, [orte, suche]);

  const sortierteDistanzen = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const alle = [...distanzen].sort((a, b) =>
      getOrtName(a.von_ort_id).localeCompare(getOrtName(b.von_ort_id))
    );
    if (!q) return alle;
    return alle.filter(
      (d) =>
        getOrtName(d.von_ort_id).toLowerCase().includes(q) ||
        getOrtName(d.nach_ort_id).toLowerCase().includes(q)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanzen, orte, suche]);

  const handleOrtSave = async ({ name, adresse, typ }) => {
    const flags = {
      istWohnort: typ === 'wohnort',
      istDienstort: typ === 'dienstort',
      istKirchspiel: typ === 'kirchspiel',
    };
    try {
      if (ortSheet?.mode === 'edit') {
        await updateOrt(ortSheet.ort.id, {
          name,
          adresse,
          ist_wohnort: flags.istWohnort,
          ist_dienstort: flags.istDienstort,
          ist_kirchspiel: flags.istKirchspiel,
        });
        toast.success('Ort aktualisiert.');
      } else {
        await addOrt({ name, adresse, ...flags });
        toast.success('Ort angelegt.');
      }
      setOrtSheet(null);
    } catch (error) {
      // Sheet offen lassen, damit die Eingaben nicht verloren gehen
      console.error('Ort konnte nicht gespeichert werden:', error);
      toast.error(fehlerText(error, 'Ort konnte nicht gespeichert werden.'));
    }
  };

  // Löschen ohne Rückfrage, mit Toast + „Rückgängig" (legt den Ort neu an)
  const handleOrtDelete = async (ort) => {
    try {
      await deleteOrt(ort.id);
      toast.success('Ort gelöscht.', {
        undo: async () => {
          try {
            await addOrt({
              name: ort.name,
              adresse: ort.adresse,
              istWohnort: !!ort.ist_wohnort,
              istDienstort: !!ort.ist_dienstort,
              istKirchspiel: !!ort.ist_kirchspiel,
            });
            toast.success('Ort wiederhergestellt.');
          } catch (error) {
            console.error('Fehler beim Wiederherstellen des Ortes:', error);
            toast.error('Ort konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Löschen des Ortes:', error);
      // Das Backend unterscheidet inzwischen zwischen "in Fahrten verwendet"
      // und "Distanzen gepflegt" - diese Meldung ist hilfreicher als eine
      // pauschale.
      toast.error(fehlerText(error, 'Dieser Ort kann nicht gelöscht werden — er wird noch verwendet.'));
    }
  };

  const handleDistanzSave = async ({ vonOrtId, nachOrtId, distanz }) => {
    try {
      if (distSheet?.mode === 'edit') {
        await updateDistanz(distSheet.distanz.id, {
          von_ort_id: distSheet.distanz.von_ort_id,
          nach_ort_id: distSheet.distanz.nach_ort_id,
          distanz,
        });
        toast.success('Distanz aktualisiert.');
      } else {
        await addDistanz({ vonOrtId, nachOrtId, distanz });
        toast.success('Distanz gespeichert.');
      }
      setDistSheet(null);
    } catch (error) {
      console.error('Distanz konnte nicht gespeichert werden:', error);
      toast.error(fehlerText(error, 'Distanz konnte nicht gespeichert werden.'));
    }
  };

  // Löschen ohne Rückfrage, mit Toast + „Rückgängig"
  const handleDistanzDelete = async (distanz) => {
    try {
      await deleteDistanz(distanz.id);
      toast.success('Distanz gelöscht.', {
        undo: async () => {
          try {
            await addDistanz({
              vonOrtId: distanz.von_ort_id,
              nachOrtId: distanz.nach_ort_id,
              distanz: distanz.distanz,
            });
            toast.success('Distanz wiederhergestellt.');
          } catch (error) {
            console.error('Fehler beim Wiederherstellen der Distanz:', error);
            toast.error('Distanz konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Löschen der Distanz:', error);
      toast.error('Distanz konnte nicht gelöscht werden.');
    }
  };

  const ortAktionen = (ort) => (
    <>
      <button
        type="button"
        className="set-action"
        title="Bearbeiten"
        aria-label={`${ort.name} bearbeiten`}
        onClick={() => setOrtSheet({ mode: 'edit', ort })}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        className="set-action set-action-danger"
        title="Löschen"
        aria-label={`${ort.name} löschen`}
        onClick={() => handleOrtDelete(ort)}
      >
        <Trash2 size={15} />
      </button>
    </>
  );

  const distanzAktionen = (distanz) => (
    <>
      <button
        type="button"
        className="set-action"
        title="Bearbeiten"
        aria-label="Distanz bearbeiten"
        onClick={() =>
          setDistSheet({
            mode: 'edit',
            distanz: {
              ...distanz,
              vonName: getOrtName(distanz.von_ort_id),
              nachName: getOrtName(distanz.nach_ort_id),
            },
          })
        }
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        className="set-action set-action-danger"
        title="Löschen"
        aria-label="Distanz löschen"
        onClick={() => handleDistanzDelete(distanz)}
      >
        <Trash2 size={15} />
      </button>
    </>
  );

  return (
    <div>
      {/* ---------- Orte ---------- */}
      <div className="set-block">
        <BereichKopf
          titel="Orte"
          satz="Orte, die du regelmäßig als Start oder Ziel nutzt."
          aktion="+ Ort"
          onAktion={() => setOrtSheet({ mode: 'neu' })}
        />

        {(orte.length > 5 || distanzen.length > 5) && (
          <div className="set-search">
            <Search size={17} aria-hidden="true" />
            <input
              type="search"
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Ort oder Adresse suchen"
              aria-label="Ort oder Adresse suchen"
            />
          </div>
        )}

        {/* Desktop: Tabelle nach Spec (1fr 1.4fr 96px 96px) */}
        <div className="set-table set-table-desktop">
          <div className="set-th-row set-grid-orte">
            <div>Ort</div>
            <div>Adresse</div>
            <div style={{ textAlign: 'right' }}>{dienstort ? `ab ${dienstort.name}` : 'Distanz'}</div>
            <div />
          </div>
          {gefilterteOrte.map((ort) => {
            const km = distanzAbDienstort(ort);
            return (
              <div key={ort.id} className="set-tr set-grid-orte">
                <div className="set-td-haupt">
                  {ort.name}
                  {getOrtTypLabel(ort) && <span className="set-td-sub">{getOrtTypLabel(ort)}</span>}
                </div>
                <div className="set-td-text">{ort.adresse}</div>
                <div className="set-td-num num">{km != null ? `${km} km` : '—'}</div>
                <div className="set-td-aktionen">{ortAktionen(ort)}</div>
              </div>
            );
          })}
          {gefilterteOrte.length === 0 && (
            <div className="set-tr" style={{ gridTemplateColumns: '1fr' }}>
              <div className="set-td-text">Kein Ort gefunden.</div>
            </div>
          )}
        </div>

        {/* Mobil: Zeilenliste */}
        <div className="set-liste-mobil">
          {gefilterteOrte.map((ort) => (
            <div key={ort.id} className="set-row">
              <div className="set-row-main">
                <div className="set-row-titel">{ort.name}</div>
                <div className="set-row-sub">
                  {[getOrtTypLabel(ort), ort.adresse].filter(Boolean).join(' · ')}
                </div>
              </div>
              {ortAktionen(ort)}
            </div>
          ))}
          {gefilterteOrte.length === 0 && (
            <div className="set-row"><div className="set-row-sub">Kein Ort gefunden.</div></div>
          )}
        </div>
      </div>

      {/* ---------- Distanzen ---------- */}
      <div className="set-block">
        <BereichKopf
          titel="Distanzen"
          satz="Einmal gepflegt, rechnet jede Fahrt die Kilometer automatisch."
          aktion="+ Distanz"
          onAktion={() => setDistSheet({ mode: 'neu' })}
        />

        <div className="set-table set-table-desktop">
          <div className="set-th-row set-grid-distanzen">
            <div>Von</div>
            <div>Nach</div>
            <div style={{ textAlign: 'right' }}>km</div>
            <div />
          </div>
          {sortierteDistanzen.map((distanz) => (
            <div key={distanz.id} className="set-tr set-grid-distanzen">
              <div className="set-td-haupt">{getOrtName(distanz.von_ort_id)}</div>
              <div className="set-td-text">{getOrtName(distanz.nach_ort_id)}</div>
              <div className="set-td-num num">{distanz.distanz} km</div>
              <div className="set-td-aktionen">{distanzAktionen(distanz)}</div>
            </div>
          ))}
          {sortierteDistanzen.length === 0 && (
            <div className="set-tr" style={{ gridTemplateColumns: '1fr' }}>
              <div className="set-td-text">Noch keine Distanz hinterlegt.</div>
            </div>
          )}
        </div>

        <div className="set-liste-mobil">
          {sortierteDistanzen.map((distanz) => (
            <div key={distanz.id} className="set-row">
              <div className="set-row-main">
                <div className="set-row-titel">
                  {getOrtName(distanz.von_ort_id)} → {getOrtName(distanz.nach_ort_id)}
                </div>
                <div className="set-row-sub num">{distanz.distanz} km</div>
              </div>
              {distanzAktionen(distanz)}
            </div>
          ))}
          {sortierteDistanzen.length === 0 && (
            <div className="set-row"><div className="set-row-sub">Noch keine Distanz hinterlegt.</div></div>
          )}
        </div>
      </div>

      {ortSheet && (
        <OrtSheet
          offen
          ort={ortSheet.mode === 'edit' ? ortSheet.ort : null}
          orte={orte}
          onClose={() => setOrtSheet(null)}
          onSave={handleOrtSave}
        />
      )}
      {distSheet && (
        <DistanzSheet
          offen
          distanz={distSheet.mode === 'edit' ? distSheet.distanz : null}
          orte={orte}
          distanzen={distanzen}
          onClose={() => setDistSheet(null)}
          onSave={handleDistanzSave}
        />
      )}
    </div>
  );
}

export default OrteDistanzenBereich;
