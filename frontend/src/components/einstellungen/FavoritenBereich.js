import React, { useState, useContext, useEffect } from 'react';
import { X } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import Sheet from '../ui/Sheet';
import BereichKopf from './BereichKopf';

// Formular im Sheet: Von, Nach, Anlass, Träger (kleines Formular = Sheet)
function FavoritSheet({ offen, orte, abrechnungstraeger, onClose, onSave }) {
  const [form, setForm] = useState({ vonOrtId: '', nachOrtId: '', anlass: '', abrechnungstraegerId: '' });

  const sortierteOrte = [...orte].sort((a, b) => a.name.localeCompare(b.name));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title="Favorit anlegen">
      <form onSubmit={handleSubmit} className="set-sheet-form">
        <div>
          <label className="form-label" htmlFor="fav-von">Von</label>
          <select
            id="fav-von"
            value={form.vonOrtId}
            onChange={(e) => setForm({ ...form, vonOrtId: e.target.value })}
            className="form-select"
            required
          >
            <option value="">Bitte wählen</option>
            {sortierteOrte.map((ort) => (
              <option key={ort.id} value={ort.id}>{ort.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="fav-nach">Nach</label>
          <select
            id="fav-nach"
            value={form.nachOrtId}
            onChange={(e) => setForm({ ...form, nachOrtId: e.target.value })}
            className="form-select"
            required
          >
            <option value="">Bitte wählen</option>
            {sortierteOrte.map((ort) => (
              <option key={ort.id} value={ort.id}>{ort.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label" htmlFor="fav-anlass">Anlass</label>
          <input
            id="fav-anlass"
            type="text"
            value={form.anlass}
            onChange={(e) => setForm({ ...form, anlass: e.target.value })}
            className="form-input"
            placeholder="z.B. Dienstbesprechung"
          />
        </div>
        <div>
          <label className="form-label" htmlFor="fav-traeger">Träger</label>
          <select
            id="fav-traeger"
            value={form.abrechnungstraegerId}
            onChange={(e) => setForm({ ...form, abrechnungstraegerId: e.target.value })}
            className="form-select"
          >
            <option value="">Bitte wählen</option>
            {abrechnungstraeger.map((traeger) => (
              <option key={traeger.id} value={traeger.id}>{traeger.name}</option>
            ))}
          </select>
        </div>
        <div className="set-sheet-buttons">
          <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn-primary">Speichern</button>
        </div>
      </form>
    </Sheet>
  );
}

function FavoritenBereich() {
  const { favoriten, orte, abrechnungstraeger, addFavorit, deleteFavorit, fetchFavoriten } =
    useContext(AppContext);
  const toast = useToast();
  const [sheetOffen, setSheetOffen] = useState(false);

  useEffect(() => {
    fetchFavoriten();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (form) => {
    if (!form.vonOrtId || !form.nachOrtId) return;
    try {
      await addFavorit({
        vonOrtId: parseInt(form.vonOrtId),
        nachOrtId: parseInt(form.nachOrtId),
        anlass: form.anlass || '',
        abrechnungstraegerId: form.abrechnungstraegerId
          ? parseInt(form.abrechnungstraegerId)
          : null,
      });
      setSheetOffen(false);
      toast.success('Favorit gespeichert.');
    } catch (error) {
      toast.error('Favorit konnte nicht gespeichert werden.');
    }
  };

  // Löschen ohne Rückfrage, mit Toast + „Rückgängig"
  const handleDelete = async (fav) => {
    try {
      await deleteFavorit(fav.id);
      toast.success('Favorit gelöscht.', {
        undo: async () => {
          try {
            await addFavorit({
              vonOrtId: fav.von_ort_id,
              nachOrtId: fav.nach_ort_id,
              anlass: fav.anlass || '',
              abrechnungstraegerId: fav.abrechnungstraeger_id,
            });
            toast.success('Favorit wiederhergestellt.');
          } catch (error) {
            console.error('Fehler beim Wiederherstellen des Favoriten:', error);
            toast.error('Favorit konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      toast.error('Favorit konnte nicht gelöscht werden.');
    }
  };

  return (
    <div>
      <BereichKopf
        titel="Favoriten"
        satz="Häufige Strecken für die Ein-Tipp-Erfassung auf dem Dashboard."
        aktion="+ Favorit"
        onAktion={() => setSheetOffen(true)}
      />

      <div className="set-zeilen">
        {favoriten.map((fav) => (
          <div key={fav.id} className="set-row">
            <div className="set-row-main">
              <div className="set-row-titel">
                {fav.von_ort_name} → {fav.nach_ort_name}
              </div>
              <div className="set-row-sub">
                {[fav.anlass, fav.traeger_name].filter(Boolean).join(' · ') || 'Ohne Anlass'}
              </div>
            </div>
            <button
              type="button"
              className="set-action set-action-danger"
              title="Löschen"
              aria-label={`Favorit ${fav.von_ort_name} → ${fav.nach_ort_name} löschen`}
              onClick={() => handleDelete(fav)}
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {favoriten.length === 0 && (
          <div className="set-row">
            <div className="set-row-sub">Noch kein Favorit — die erste gespeicherte Strecke erscheint auf dem Dashboard.</div>
          </div>
        )}
      </div>

      {sheetOffen && (
        <FavoritSheet
          offen
          orte={orte}
          abrechnungstraeger={abrechnungstraeger}
          onClose={() => setSheetOffen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default FavoritenBereich;
