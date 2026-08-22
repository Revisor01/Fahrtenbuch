import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { GripVertical, Check, Pencil, Trash2, Power } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import Sheet from '../ui/Sheet';
import AktionsSheet from '../ui/AktionsSheet';
import BereichKopf from './BereichKopf';
import useSortierbareListe from './useSortierbareListe';

// Formular im Sheet: Name + Kostenstelle (kleines Formular = Sheet).
// Die alte Farbwahl entfällt — die Träger-Farbe wird seit dem Redesign
// nirgends mehr angezeigt (Akzent-Regel), das Feld bleibt in der DB.
function TraegerSheet({ offen, traeger, onClose, onSave }) {
  const [name, setName] = useState(traeger?.name || '');
  const [kostenstelle, setKostenstelle] = useState(traeger?.kostenstelle || '');

  const [laeuft, setLaeuft] = useState(false);

  // Sperre gegen Doppel-Tap, sonst entstehen zwei Traeger
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (laeuft) return;
    setLaeuft(true);
    try {
      await onSave({ name, kostenstelle });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title={traeger ? 'Träger bearbeiten' : 'Träger anlegen'}>
      <form onSubmit={handleSubmit} className="set-sheet-form">
        <div>
          <label className="form-label" htmlFor="traeger-name">Name</label>
          <input
            id="traeger-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            placeholder="z.B. Kirchenkreis Dithmarschen"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="traeger-kst">Kostenstelle (optional)</label>
          <input
            id="traeger-kst"
            type="text"
            value={kostenstelle}
            onChange={(e) => setKostenstelle(e.target.value)}
            className="form-input"
            placeholder="z.B. 760130"
          />
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

function TraegerBereich() {
  const { refreshAllData } = useContext(AppContext);
  const toast = useToast();
  const [traegerListe, setTraegerListe] = useState([]);
  // null | { mode: 'neu' } | { mode: 'edit', traeger }
  const [sheet, setSheet] = useState(null);
  // Angetippte Zeile: zeigt Details + Aktionen (Bearbeiten/Aktivieren/Löschen)
  const [aktionen, setAktionen] = useState(null);

  const sortiert = (liste) => [...liste].sort((a, b) => a.sort_order - b.sort_order);

  const fetchTraeger = async () => {
    try {
      const response = await axios.get('/api/abrechnungstraeger');
      setTraegerListe(sortiert(response.data));
    } catch (error) {
      console.error('Fehler beim Laden der Abrechnungsträger:', error);
      toast.error('Abrechnungsträger konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchTraeger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    await refreshAllData((aktualisiert) => setTraegerListe(sortiert(aktualisiert)));
  };

  const handleSave = async ({ name, kostenstelle }) => {
    try {
      if (sheet?.mode === 'edit') {
        await axios.put(`/api/abrechnungstraeger/${sheet.traeger.id}`, { name, kostenstelle });
        toast.success('Träger aktualisiert.');
      } else {
        await axios.post('/api/abrechnungstraeger', {
          name,
          kostenstelle,
          sort_order: traegerListe.length + 1,
        });
        toast.success('Träger angelegt.');
      }
      setSheet(null);
      await refresh();
    } catch (error) {
      console.error('Fehler beim Speichern des Trägers:', error);
      toast.error('Träger konnte nicht gespeichert werden.');
    }
  };

  // Reihenfolge: Ziehen am Griff (User-Feedback 07.08. — die Pfeil-Buttons
  // entfallen); Tastatur: Pfeil hoch/runter auf dem Griff. Beides kommt aus
  // dem gemeinsamen Hook, damit sich alle Listen gleich anfuehlen.
  const handleReorder = async (von, nach) => {
    if (von === null || nach === null || von === nach) return;
    const neu = [...traegerListe];
    const [bewegt] = neu.splice(von, 1);
    neu.splice(nach, 0, bewegt);
    setTraegerListe(neu); // optimistisch
    const sortOrder = neu.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    try {
      await axios.put('/api/abrechnungstraeger/sort', { sortOrder });
      await refresh();
    } catch (error) {
      console.error('Fehler beim Sortieren:', error);
      toast.error('Reihenfolge konnte nicht aktualisiert werden.');
      fetchTraeger();
    }
  };

  const sortieren = useSortierbareListe({
    anzahl: traegerListe.length,
    onReorder: handleReorder,
  });

  const handleToggleActive = async (traeger) => {
    try {
      await axios.put(`/api/abrechnungstraeger/${traeger.id}`, { active: !traeger.active });
      toast.success(traeger.active ? 'Träger deaktiviert.' : 'Träger aktiviert.');
      await refresh();
    } catch (error) {
      console.error('Fehler beim Ändern des Status:', error);
      toast.error('Status konnte nicht aktualisiert werden.');
    }
  };

  // Löschen ohne Rückfrage (Design-Spec) — kein Undo möglich, da am
  // Träger Erstattungssätze und Historie hängen
  const handleDelete = async (traeger) => {
    try {
      await axios.delete(`/api/abrechnungstraeger/${traeger.id}`);
      toast.success('Träger gelöscht.');
      await refresh();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error(error.response?.data?.message || 'Träger konnte nicht gelöscht werden.');
    }
  };

  return (
    <div>
      <BereichKopf
        titel="Abrechnungsträger"
        satz="Organisationen, die deine Fahrten erstatten — die Reihenfolge bestimmt die Anzeige."
        aktion="+ Träger"
        onAktion={() => setSheet({ mode: 'neu' })}
      />

      <div className="set-zeilen">
        {traegerListe.map((traeger, index) => (
          <div
            key={traeger.id}
            className={`set-row${sortieren.zeilenKlasse(index)}`}
            {...sortieren.zeilenProps(index)}
          >
            <button
              type="button"
              className="set-grip"
              {...sortieren.griffProps(index, `${traeger.name} verschieben — ziehen oder Pfeiltasten nutzen`)}
            >
              <GripVertical size={15} aria-hidden="true" />
            </button>
            {/* Die ganze Zeile oeffnet das Aktions-Sheet: einzelne Icon-Buttons
                waren auf dem Handy kaum zu lesen und schwer zu treffen. */}
            <button
              type="button"
              className="set-row-main set-row-tap"
              onClick={() => setAktionen(traeger)}
              aria-label={`${traeger.name} — Aktionen öffnen`}
            >
              <span className="set-row-titel" style={traeger.active ? undefined : { opacity: 0.55 }}>
                {traeger.name}
              </span>
              <span className="set-row-sub">
                {[traeger.kostenstelle ? `Kst. ${traeger.kostenstelle}` : null, traeger.active ? null : 'Inaktiv']
                  .filter(Boolean)
                  .join(' · ') || 'Keine Kostenstelle'}
              </span>
            </button>
          </div>
        ))}
        {traegerListe.length === 0 && (
          <div className="set-row"><div className="set-row-sub">Noch kein Abrechnungsträger angelegt.</div></div>
        )}
      </div>

      {sheet && (
        <TraegerSheet
          offen
          traeger={sheet.mode === 'edit' ? sheet.traeger : null}
          onClose={() => setSheet(null)}
          onSave={handleSave}
        />
      )}

      {aktionen && (
        <AktionsSheet
          isOpen
          onClose={() => setAktionen(null)}
          titel={aktionen.name}
          untertitel={aktionen.active ? 'Wird zur Auswahl angeboten' : 'Inaktiv — erscheint nicht zur Auswahl'}
          zeilen={[
            { label: 'Kostenstelle', wert: aktionen.kostenstelle || '—' },
            { label: 'Status', wert: aktionen.active ? 'Aktiv' : 'Inaktiv' },
          ]}
          aktionen={[
            {
              id: 'bearbeiten',
              label: 'Bearbeiten',
              icon: Pencil,
              onClick: () => setSheet({ mode: 'edit', traeger: aktionen }),
            },
            {
              id: 'aktiv',
              label: aktionen.active ? 'Deaktivieren' : 'Aktivieren',
              icon: Power,
              hinweis: aktionen.active
                ? 'Steht bei neuen Fahrten nicht mehr zur Auswahl'
                : 'Steht bei neuen Fahrten wieder zur Auswahl',
              onClick: () => handleToggleActive(aktionen),
            },
            {
              id: 'loeschen',
              label: 'Löschen',
              icon: Trash2,
              variant: 'gefahr',
              hinweis: 'Lässt sich nicht rückgängig machen',
              onClick: () => handleDelete(aktionen),
            },
          ]}
        />
      )}
    </div>
  );
}

export default TraegerBereich;
