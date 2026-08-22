import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Tag, Pencil, Trash2, GripVertical } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { API_BASE_URL } from '../../api/client';
import { useToast } from '../ui/Toast';
import Sheet from '../ui/Sheet';
import AktionsSheet from '../ui/AktionsSheet';
import EmptyState from '../ui/EmptyState';
import BereichKopf from './BereichKopf';
import useSortierbareListe from './useSortierbareListe';
import fehlerText from '../../utils/fehlerText';

// Standard-Anlässe der eigenen Person. Muster wie bei Orten und Trägern:
// Liste + Sheet zum Anlegen/Umbenennen, Tipp auf die Zeile öffnet die
// Aktionen. Die Reihenfolge steuert, was im Erfassungs-Modal oben steht —
// sortiert wird per Drag & Drop am Griff, wie bei den Abrechnungsträgern.

// Umbenennen und Anlegen teilen sich dasselbe Formular.
function AnlassSheet({ offen, anlass, onClose, onSave }) {
  const [name, setName] = useState(anlass?.name || '');
  const [laeuft, setLaeuft] = useState(false);

  // Sperre gegen Doppel-Tap, sonst laufen zwei Requests parallel
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (laeuft) return;
    setLaeuft(true);
    try {
      await onSave(name.trim());
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title={anlass ? 'Anlass umbenennen' : 'Anlass anlegen'}>
      <form onSubmit={handleSubmit} className="set-sheet-form">
        <div>
          <label className="form-label" htmlFor="anlass-name">Bezeichnung</label>
          <input
            id="anlass-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="z.B. Konfirmandenunterricht"
            autoFocus
            required
          />
          {anlass && (
            <p className="form-error-message" style={{ color: 'var(--text-2)' }}>
              Der neue Name gilt für künftige Fahrten — bereits erfasste Fahrten behalten ihren Text.
            </p>
          )}
        </div>
        <div className="set-sheet-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn-primary" disabled={laeuft || !name.trim()}>
            {laeuft ? 'Speichert…' : 'Speichern'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

function AnlassBereich() {
  const { anlaesse, fetchAnlaesse, addAnlass } = useContext(AppContext);
  const toast = useToast();

  // null | { mode: 'neu' } | { mode: 'edit', anlass }
  const [sheet, setSheet] = useState(null);
  // Angetippte Zeile: Details + Aktionen (Umbenennen/Löschen)
  const [aktionen, setAktionen] = useState(null);
  // Verhindert doppeltes Verschieben, solange der PUT noch läuft
  const [sortiert, setSortiert] = useState(false);

  // Der POST ist idempotent: ein bekannter Name ist kein Fehler, sondern
  // liefert den vorhandenen Eintrag. Das soll sich für Nutzende auch so
  // anfühlen — ruhiger Hinweis statt roter Meldung.
  const anlegen = async (name) => {
    const sauber = (name || '').trim();
    if (!sauber) return false;
    const kanntenWir = anlaesse.some(
      (a) => a.name.trim().toLowerCase() === sauber.toLowerCase()
    );
    try {
      await addAnlass(sauber);
      if (kanntenWir) {
        toast.success(`„${sauber}" steht bereits in deiner Liste.`);
      } else {
        toast.success('Anlass angelegt.');
      }
      return true;
    } catch (error) {
      console.error('Anlass konnte nicht angelegt werden:', error);
      toast.error(fehlerText(error, 'Anlass konnte nicht angelegt werden.'));
      return false;
    }
  };

  const handleSheetSave = async (name) => {
    if (sheet?.mode === 'edit') {
      try {
        await axios.put(`${API_BASE_URL}/anlaesse/${sheet.anlass.id}`, { name });
        toast.success('Anlass umbenannt.');
        setSheet(null);
        await fetchAnlaesse();
      } catch (error) {
        // Sheet offen lassen, damit die Eingabe nicht verloren geht
        console.error('Anlass konnte nicht umbenannt werden:', error);
        toast.error(fehlerText(error, 'Anlass konnte nicht umbenannt werden.'));
      }
      return;
    }
    const ok = await anlegen(name);
    if (ok) setSheet(null);
  };

  const handleDelete = async (anlass) => {
    try {
      await axios.delete(`${API_BASE_URL}/anlaesse/${anlass.id}`);
      toast.success('Anlass aus der Liste entfernt.');
      await fetchAnlaesse();
    } catch (error) {
      console.error('Anlass konnte nicht gelöscht werden:', error);
      toast.error(fehlerText(error, 'Anlass konnte nicht gelöscht werden.'));
    }
  };

  // Reihenfolge: Ziehen am Griff, Muster wie beim Abrechnungsträger.
  // Die Liste liegt im AppContext, deshalb hält `reihenfolge` waehrend des
  // Requests eine optimistische Kopie — sonst springt die Zeile zurueck,
  // bis fetchAnlaesse geantwortet hat.
  const [reihenfolge, setReihenfolge] = useState(null);
  const liste = reihenfolge || anlaesse;

  const handleReorder = async (von, nach) => {
    if (sortiert || von === null || nach === null || von === nach) return;
    if (von < 0 || nach < 0 || von >= liste.length || nach >= liste.length) return;
    const neu = [...liste];
    const [bewegt] = neu.splice(von, 1);
    neu.splice(nach, 0, bewegt);
    setReihenfolge(neu); // optimistisch
    setSortiert(true);
    const sortOrder = neu.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    try {
      await axios.put(`${API_BASE_URL}/anlaesse/sort`, { sortOrder });
      await fetchAnlaesse();
      setReihenfolge(null);
    } catch (error) {
      console.error('Reihenfolge konnte nicht gespeichert werden:', error);
      toast.error(fehlerText(error, 'Reihenfolge konnte nicht gespeichert werden.'));
      setReihenfolge(null); // zurueck auf den Stand aus dem Context
      await fetchAnlaesse();
    } finally {
      setSortiert(false);
    }
  };

  // Ziehen (Maus, Finger, Stift) und Tastatur (Pfeil hoch/runter auf dem
  // fokussierten Griff) kommen aus dem gemeinsamen Hook.
  const sortierenHook = useSortierbareListe({
    anzahl: liste.length,
    onReorder: handleReorder,
  });

  const nutzungText = (anlass) => {
    const anzahl = Number(anlass.nutzung_anzahl) || 0;
    if (anzahl === 0) return 'Noch nicht verwendet';
    return anzahl === 1 ? '1 Fahrt' : `${anzahl} Fahrten`;
  };

  return (
    <div>
      <BereichKopf
        titel="Anlässe"
        satz="Deine Standard-Anlässe — die Reihenfolge bestimmt, was beim Erfassen oben steht."
        aktion="+ Anlass"
        onAktion={() => setSheet({ mode: 'neu' })}
      />

      {anlaesse.length === 0 ? (
        <EmptyState
          icon={<Tag size={22} aria-hidden="true" />}
          title="Noch keine Anlässe hinterlegt"
          text="Trage hier ein, wofür du regelmäßig unterwegs bist — Konfirmandenunterricht, Dienstbesprechung, Gemeindebesuch. Beim Erfassen einer Fahrt stehen diese Anlässe dann sofort zur Auswahl, statt sie jedes Mal zu tippen."
          actionLabel="Ersten Anlass anlegen"
          onAction={() => setSheet({ mode: 'neu' })}
        />
      ) : (
        <>
          <div className="set-zeilen">
            {liste.map((anlass, index) => (
              <div
                key={anlass.id}
                className={`set-row${sortierenHook.zeilenKlasse(index)}`}
                {...sortierenHook.zeilenProps(index)}
              >
                <button
                  type="button"
                  className="set-grip"
                  {...sortierenHook.griffProps(index, `${anlass.name} verschieben — ziehen oder Pfeiltasten nutzen`)}
                >
                  <GripVertical size={15} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="set-row-main set-row-tap"
                  onClick={() => setAktionen(anlass)}
                  aria-label={`${anlass.name} — Aktionen öffnen`}
                >
                  <span className="set-row-titel">{anlass.name}</span>
                  <span className="set-row-sub">{nutzungText(anlass)}</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {sheet && (
        <AnlassSheet
          offen
          anlass={sheet.mode === 'edit' ? sheet.anlass : null}
          onClose={() => setSheet(null)}
          onSave={handleSheetSave}
        />
      )}

      {aktionen && (
        <AktionsSheet
          isOpen
          onClose={() => setAktionen(null)}
          titel={aktionen.name}
          untertitel="Steht beim Erfassen zur Auswahl"
          zeilen={[
            { label: 'Verwendet in', wert: nutzungText(aktionen) },
            { label: 'Position', wert: `${liste.findIndex((a) => a.id === aktionen.id) + 1} von ${liste.length}` },
          ]}
          aktionen={[
            {
              id: 'umbenennen',
              label: 'Umbenennen',
              icon: Pencil,
              hinweis: 'Gilt für künftige Fahrten — erfasste Fahrten behalten ihren Text',
              onClick: () => setSheet({ mode: 'edit', anlass: aktionen }),
            },
            {
              id: 'loeschen',
              label: 'Aus der Liste entfernen',
              icon: Trash2,
              variant: 'gefahr',
              hinweis: 'Bereits erfasste Fahrten behalten ihren Anlass — nur die Auswahl verliert den Eintrag',
              onClick: () => handleDelete(aktionen),
            },
          ]}
        />
      )}
    </div>
  );
}

export default AnlassBereich;
