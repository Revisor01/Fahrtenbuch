import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, ChevronRight } from 'lucide-react';
import { useToast } from '../ui/Toast';
import AktionsSheet from '../ui/AktionsSheet';
import Sheet from '../ui/Sheet';
import BereichKopf from './BereichKopf';

// API-Zugriff: Keys für Kurzbefehle/externe Anwendungen.
// Anlegen im Sheet — der Klartext-Key erscheint dort genau einmal.
function ApiKeySheet({ offen, onClose, onCreated }) {
  const toast = useToast();
  const [beschreibung, setBeschreibung] = useState('');
  const [generatedKey, setGeneratedKey] = useState(null);
  const [laeuft, setLaeuft] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLaeuft(true);
      const response = await axios.post('/api/keys', {
        description: beschreibung || 'API Key für Kurzbefehle',
      });
      setGeneratedKey(response.data.key);
      onCreated();
    } catch (error) {
      console.error('Fehler beim Generieren des API-Keys:', error);
      toast.error('API-Key konnte nicht erstellt werden.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title="API-Key erstellen">
      {generatedKey ? (
        <div className="set-sheet-form">
          <div className="set-key-box">
            <div className="set-subhead">Dein neuer API-Key</div>
            <code>{generatedKey}</code>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                navigator.clipboard.writeText(generatedKey);
                toast.success('API-Key kopiert.');
              }}
            >
              Kopieren
            </button>
          </div>
          <p className="set-subsatz" style={{ marginBottom: 0 }}>
            Kopiere den Key jetzt — er wird nur dieses eine Mal angezeigt.
          </p>
          <div className="set-sheet-buttons">
            <button type="button" className="btn-primary" onClick={onClose}>Fertig</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="set-sheet-form">
          <div>
            <label className="form-label" htmlFor="key-beschreibung">Beschreibung</label>
            <input
              id="key-beschreibung"
              type="text"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              className="form-input"
              placeholder="z.B. iOS Kurzbefehle"
            />
          </div>
          <div className="set-sheet-buttons">
            <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={laeuft}>
              {laeuft ? 'Erstellt …' : 'Key erstellen'}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}

function ApiBereich() {
  const toast = useToast();
  const [apiKeys, setApiKeys] = useState([]);
  const [sheetOffen, setSheetOffen] = useState(false);
  const [aktionen, setAktionen] = useState(null);

  const fetchApiKeys = async () => {
    try {
      const response = await axios.get('/api/keys');
      setApiKeys(response.data);
    } catch (error) {
      console.error('Fehler beim Laden der API-Keys:', error);
      toast.error('API-Keys konnten nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchApiKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Löschen ohne Rückfrage (Design-Spec) — kein Undo möglich, da der
  // Klartext-Key nach dem Anlegen nicht mehr rekonstruierbar ist
  const handleDelete = async (key) => {
    try {
      await axios.delete(`/api/keys/${key.id}`);
      await fetchApiKeys();
      toast.success('API-Key gelöscht.');
    } catch (error) {
      console.error('Fehler beim Löschen des API-Keys:', error);
      toast.error('API-Key konnte nicht gelöscht werden.');
    }
  };

  return (
    <div>
      <BereichKopf
        titel="API-Zugriff"
        satz="Keys für Kurzbefehle und externe Anwendungen — je Zweck ein eigener Key."
        aktion="+ API-Key"
        onAktion={() => setSheetOffen(true)}
      />

      <div className="set-zeilen">
        {apiKeys.map((key) => (
          <div key={key.id} className="set-row">
            <button
              type="button"
              className="set-row-main set-row-tap"
              onClick={() => setAktionen(key)}
              aria-label={`API-Key ${key.description || ''} — Aktionen öffnen`}
            >
              <span className="set-row-titel">{key.description || 'API-Key'}</span>
              <span className="set-row-sub">
                {[
                  key.is_active ? 'Aktiv' : 'Inaktiv',
                  `Erstellt ${new Date(key.created_at).toLocaleDateString('de-DE')}`,
                  key.last_used_at
                    ? `zuletzt ${new Date(key.last_used_at).toLocaleDateString('de-DE')}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </button>
            <ChevronRight size={16} className="set-row-chevron" aria-hidden="true" />
          </div>
        ))}
        {apiKeys.length === 0 && (
          <div className="set-row"><div className="set-row-sub">Noch kein API-Key erstellt.</div></div>
        )}
      </div>

      {sheetOffen && (
        <ApiKeySheet offen onClose={() => setSheetOffen(false)} onCreated={fetchApiKeys} />
      )}

      {aktionen && (
        <AktionsSheet
          isOpen
          onClose={() => setAktionen(null)}
          titel={aktionen.description || 'API-Key'}
          untertitel={aktionen.is_active ? 'Aktiv' : 'Inaktiv'}
          zeilen={[
            { label: 'Erstellt', wert: new Date(aktionen.created_at).toLocaleDateString('de-DE') },
            {
              label: 'Zuletzt genutzt',
              wert: aktionen.last_used_at
                ? new Date(aktionen.last_used_at).toLocaleDateString('de-DE')
                : 'Noch nie',
            },
          ]}
          aktionen={[
            {
              id: 'loeschen',
              label: 'Key löschen',
              icon: Trash2,
              variant: 'gefahr',
              hinweis: 'Programme mit diesem Key haben sofort keinen Zugriff mehr',
              onClick: () => handleDelete(aktionen),
            },
          ]}
        />
      )}
    </div>
  );
}

export default ApiBereich;
