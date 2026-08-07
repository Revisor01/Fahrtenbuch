import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { GripVertical, Check, Pencil, Trash2 } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import Sheet from '../ui/Sheet';
import BereichKopf from './BereichKopf';

// Formular im Sheet: Name + Kostenstelle (kleines Formular = Sheet).
// Die alte Farbwahl entfällt — die Träger-Farbe wird seit dem Redesign
// nirgends mehr angezeigt (Akzent-Regel), das Feld bleibt in der DB.
function TraegerSheet({ offen, traeger, onClose, onSave }) {
  const [name, setName] = useState(traeger?.name || '');
  const [kostenstelle, setKostenstelle] = useState(traeger?.kostenstelle || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, kostenstelle });
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
          <button type="submit" className="btn-primary">Speichern</button>
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

  // Reihenfolge: Drag & Drop über den Griff (User-Feedback 07.08. — die
  // Pfeil-Buttons entfallen); Tastatur: Pfeil hoch/runter auf dem Griff.
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

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

  const handleGripKeyDown = (e, index) => {
    if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      handleReorder(index, index - 1);
    } else if (e.key === 'ArrowDown' && index < traegerListe.length - 1) {
      e.preventDefault();
      handleReorder(index, index + 1);
    }
  };

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
            className={`set-row${dragIndex === index ? ' is-dragging' : ''}${overIndex === index && dragIndex !== null && dragIndex !== index ? ' is-dragover' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (overIndex !== index) setOverIndex(index);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleReorder(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
          >
            <button
              type="button"
              className="set-grip"
              draggable
              onDragStart={(e) => {
                setDragIndex(index);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onKeyDown={(e) => handleGripKeyDown(e, index)}
              title="Ziehen zum Sortieren (Pfeiltasten: verschieben)"
              aria-label={`${traeger.name} verschieben — Pfeiltasten nutzen`}
            >
              <GripVertical size={15} />
            </button>
            <div className="set-row-main">
              <div className="set-row-titel" style={traeger.active ? undefined : { opacity: 0.55 }}>
                {traeger.name}
              </div>
              <div className="set-row-sub">
                {[traeger.kostenstelle ? `Kst. ${traeger.kostenstelle}` : null, traeger.active ? null : 'Inaktiv']
                  .filter(Boolean)
                  .join(' · ') || 'Keine Kostenstelle'}
              </div>
            </div>
            <button
              type="button"
              className={`set-check${traeger.active ? ' is-on' : ''}`}
              onClick={() => handleToggleActive(traeger)}
              title={traeger.active ? 'Aktiv — klicken zum Deaktivieren' : 'Inaktiv — klicken zum Aktivieren'}
              aria-pressed={!!traeger.active}
              aria-label={`${traeger.name} ${traeger.active ? 'deaktivieren' : 'aktivieren'}`}
            >
              {traeger.active && <Check size={14} strokeWidth={3} />}
            </button>
            <button
              type="button"
              className="set-action"
              onClick={() => setSheet({ mode: 'edit', traeger })}
              title="Bearbeiten"
              aria-label={`${traeger.name} bearbeiten`}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="set-action set-action-danger"
              onClick={() => handleDelete(traeger)}
              title="Löschen"
              aria-label={`${traeger.name} löschen`}
            >
              <Trash2 size={15} />
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
    </div>
  );
}

export default TraegerBereich;
