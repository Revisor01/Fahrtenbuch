import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import BereichKopf from './BereichKopf';
import { SatzSheet, SatzListe } from './SatzBausteine';

// Bereich „Mitfahrer": der Erstattungssatz für Mitfahrer:innen.
// (Mitfahrer selbst hängen an der einzelnen Fahrt und werden dort erfasst.)
function MitfahrerBereich() {
  const { refreshAllData } = useContext(AppContext);
  const toast = useToast();
  const [saetze, setSaetze] = useState([]);
  // null | { mode: 'neu' } | { mode: 'edit', satz }
  const [sheet, setSheet] = useState(null);

  const fetchSaetze = async () => {
    try {
      const response = await axios.get('/api/mitfahrer-erstattung/historie');
      setSaetze(
        response.data.sort((a, b) => new Date(b.gueltig_ab) - new Date(a.gueltig_ab))
      );
    } catch (error) {
      console.error('Fehler beim Laden der Mitfahrer-Sätze:', error);
      toast.error('Mitfahrer-Sätze konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchSaetze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async ({ betrag, gueltig_ab }) => {
    try {
      if (sheet?.mode === 'edit') {
        await axios.put(`/api/mitfahrer-erstattung/${sheet.satz.id}`, { betrag, gueltig_ab });
        toast.success('Mitfahrer-Satz aktualisiert.');
      } else {
        await axios.post('/api/mitfahrer-erstattung', { betrag, gueltig_ab });
        toast.success('Mitfahrer-Satz gespeichert.');
      }
      setSheet(null);
      await fetchSaetze();
      await refreshAllData();
    } catch (error) {
      console.error('Fehler beim Speichern des Mitfahrer-Satzes:', error);
      if (error.response?.data?.error?.includes('Duplicate entry')) {
        toast.error('Für dieses Datum existiert bereits ein Satz.');
      } else {
        toast.error('Mitfahrer-Satz konnte nicht gespeichert werden.');
      }
    }
  };

  // Löschen ohne Rückfrage (Design-Spec) — kein Undo, da der Satz
  // jederzeit neu angelegt werden kann
  const handleDelete = async (satz) => {
    try {
      await axios.delete(`/api/mitfahrer-erstattung/${satz.id}`);
      toast.success('Mitfahrer-Satz gelöscht.');
      await fetchSaetze();
      await refreshAllData();
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      toast.error(error.response?.data?.message || 'Mitfahrer-Satz konnte nicht gelöscht werden.');
    }
  };

  const aktuellerSatz = saetze[0];

  return (
    <div>
      <BereichKopf
        titel="Mitfahrer"
        satz="Der Erstattungssatz pro Kilometer, wenn jemand mitfährt. Mitfahrer:innen selbst trägst du an der einzelnen Fahrt ein."
        aktion="+ Satz"
        onAktion={() => setSheet({ mode: 'neu' })}
      />

      <div className="set-subsatz">
        Aktueller Satz:{' '}
        <span className="num">{parseFloat(aktuellerSatz?.betrag || 0).toFixed(2)} €/km</span>
      </div>

      <SatzListe
        saetze={saetze}
        onEdit={(satz) => setSheet({ mode: 'edit', satz })}
        onDelete={handleDelete}
        leerText="Noch kein Mitfahrer-Satz hinterlegt."
      />

      {sheet && (
        <SatzSheet
          offen
          titel={sheet.mode === 'edit' ? 'Satz bearbeiten' : 'Satz anlegen'}
          satz={sheet.mode === 'edit' ? sheet.satz : null}
          onClose={() => setSheet(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default MitfahrerBereich;
