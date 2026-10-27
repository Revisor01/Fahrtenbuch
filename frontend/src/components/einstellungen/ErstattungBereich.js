import React, { useState, useEffect, useContext } from 'react';
import logFehler from '../../utils/logFehler';
import axios from 'axios';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import BereichKopf from './BereichKopf';
import { SatzSheet, SatzListe } from './SatzBausteine';
import MitfahrerBereich from './MitfahrerBereich';

// Erstattungssätze der Träger; der Mitfahrer-Satz hat einen eigenen Bereich.
function ErstattungBereich() {
  const { refreshAllData } = useContext(AppContext);
  const toast = useToast();
  const [traegerListe, setTraegerListe] = useState([]);
  // null | { mode: 'neu' } | { mode: 'edit', traegerId, satz }
  const [sheet, setSheet] = useState(null);
  const [neuTraegerId, setNeuTraegerId] = useState('');

  const fetchSaetze = async () => {
    try {
      const response = await axios.get('/api/abrechnungstraeger');
      // Bei Fehlern kommt ein Objekt statt einer Liste.
      const traegerListe = Array.isArray(response.data) ? response.data : [];
      const mitHistorie = await Promise.all(
        traegerListe.map(async (traeger) => {
          const historieRes = await axios.get(`/api/abrechnungstraeger/${traeger.id}/historie`);
          const historie = Array.isArray(historieRes.data) ? historieRes.data : [];
          return {
            ...traeger,
            erstattungsbetraege: historie.sort(
              (a, b) => new Date(b.gueltig_ab) - new Date(a.gueltig_ab)
            ),
          };
        })
      );
      setTraegerListe(mitHistorie);
    } catch (error) {
      logFehler('Fehler beim Laden der Erstattungssätze:', error);
      toast.error('Erstattungssätze konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchSaetze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async ({ betrag, gueltig_ab }) => {
    try {
      if (sheet?.mode === 'edit') {
        await axios.put(
          `/api/abrechnungstraeger/${sheet.traegerId}/erstattung/${sheet.satz.id}`,
          { betrag, gueltig_ab }
        );
        toast.success('Erstattungssatz aktualisiert.');
      } else {
        if (!neuTraegerId) return;
        await axios.post(`/api/abrechnungstraeger/${neuTraegerId}/erstattung`, {
          betrag,
          gueltig_ab,
        });
        toast.success('Erstattungssatz gespeichert.');
      }
      setSheet(null);
      await fetchSaetze();
      await refreshAllData();
    } catch (error) {
      logFehler('Fehler beim Speichern des Erstattungssatzes:', error);
      // Doppelter Stichtag kommt als 409 mit fertiger Meldung.
      if (error.response?.status === 409) {
        toast.error('Für dieses Datum existiert bereits ein Satz.');
      } else {
        toast.error('Erstattungssatz konnte nicht gespeichert werden.');
      }
    }
  };

  // Ohne Rückfrage, ein Satz lässt sich jederzeit neu anlegen.
  const handleDelete = async (traegerId, satz) => {
    try {
      await axios.delete(`/api/abrechnungstraeger/${traegerId}/erstattung/${satz.id}`);
      toast.success('Erstattungssatz gelöscht.');
      await fetchSaetze();
      await refreshAllData();
    } catch (error) {
      logFehler('Fehler beim Löschen:', error);
      toast.error(error.response?.data?.message || 'Erstattungssatz konnte nicht gelöscht werden.');
    }
  };

  return (
    <div>
      <BereichKopf
        titel="Erstattungssätze"
        satz="Was die Träger pro Kilometer erstatten — zeitlich gestaffelt, gültig ab Datum."
        aktion="+ Satz"
        onAktion={() => {
          setNeuTraegerId(traegerListe[0] ? String(traegerListe[0].id) : '');
          setSheet({ mode: 'neu' });
        }}
      />

      {traegerListe.map((traeger) => (
        <div key={traeger.id} className="set-block">
          <div className="set-subhead">{traeger.name}</div>
          <div className="set-subsatz">
            Aktueller Satz:{' '}
            <span className="num">{parseFloat(traeger.aktueller_betrag || 0).toFixed(2)} €/km</span>
          </div>
          <SatzListe
            saetze={traeger.erstattungsbetraege || []}
            onEdit={(satz) => setSheet({ mode: 'edit', traegerId: traeger.id, satz })}
            onDelete={(satz) => handleDelete(traeger.id, satz)}
            leerText="Noch kein Satz hinterlegt."
          />
        </div>
      ))}
      {traegerListe.length === 0 && (
        <p className="set-subsatz">Lege zuerst einen Abrechnungsträger an.</p>
      )}

      {sheet && (
        <SatzSheet
          offen
          titel={sheet.mode === 'edit' ? 'Satz bearbeiten' : 'Satz anlegen'}
          satz={sheet.mode === 'edit' ? sheet.satz : null}
          onClose={() => setSheet(null)}
          onSave={handleSave}
          kinder={
            sheet.mode === 'neu' ? (
              <div>
                <label className="form-label" htmlFor="satz-traeger">Träger</label>
                <select
                  id="satz-traeger"
                  value={neuTraegerId}
                  onChange={(e) => setNeuTraegerId(e.target.value)}
                  className="form-select"
                  required
                >
                  {traegerListe.map((traeger) => (
                    <option key={traeger.id} value={traeger.id}>{traeger.name}</option>
                  ))}
                </select>
              </div>
            ) : null
          }
        />
      )}

      {/* Mitfahrer-Erstattungssatz gehört fachlich zu den Sätzen
          (User-Feedback 07.08.) — eigener Unterabschnitt statt Bereich */}
      <div className="set-subbereich">
        <MitfahrerBereich />
      </div>
    </div>
  );
}

export default ErstattungBereich;
