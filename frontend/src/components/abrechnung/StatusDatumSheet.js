import React, { useState, useEffect } from 'react';
import { heuteISO } from '../../utils/datum';
import Sheet from '../ui/Sheet';
import { statusLabel } from '../../utils/statusLabels';

// Nachfolger des AbrechnungsStatusModal (Phase R6): kompaktes Sheet für
// Statusaktionen mit Datumswahl — heute vor allem „Datum ändern" aus den
// Trägerzeilen der Abrechnung sowie die Statusklicks der Fahrtenliste
// (StatusUebersicht). Genau ein Mount, global im AppContext; jede Aktion
// läuft singleMonth-korrekt über den dort übergebenen onSubmit.
// abrechnungstraeger kommt als Prop (kein Context-Import — vermeidet den
// Import-Zyklus AppContext ↔ Dialog des Vorgängers).
function StatusDatumSheet({
  isOpen,
  onClose,
  onSubmit,
  traegerId,
  aktion,
  monat,
  jahr,
  abrechnungstraeger,
}) {
  const heute = heuteISO();
  const [selectedDate, setSelectedDate] = useState(heute);

  // Bei jedem Öffnen frisch mit heute starten
  useEffect(() => {
    if (isOpen) setSelectedDate(heuteISO());
  }, [isOpen]);

  if (!isOpen) return null;

  const displayName = traegerId === 'mitfahrer'
    ? 'Mitfahrer:innen'
    : (abrechnungstraeger || []).find((t) => t.id === parseInt(traegerId))?.name || 'Unbekannt';

  const monatName = monat && jahr
    ? new Date(parseInt(jahr), parseInt(monat) - 1).toLocaleString('de-DE', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const frage = () => {
    const zeitraum = monatName ? ` für ${monatName}` : '';
    if (aktion === 'eingereicht') {
      return `Wann wurden die Fahrtkosten${zeitraum} bei ${displayName} eingereicht?`;
    }
    if (aktion === 'erhalten') {
      return `Wann wurde die Erstattung${zeitraum} von ${displayName} gutgeschrieben?`;
    }
    return 'Wähle das entsprechende Datum aus.';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedDate);
    onClose();
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title={`${displayName}: ${statusLabel(aktion)}`}
    >
      <p className="abr-sheet-frage">{frage()}</p>
      <form onSubmit={handleSubmit} className="abr-sheet-form">
        <div>
          <label className="form-label" htmlFor="abr-status-datum">
            Datum
          </label>
          <input
            id="abr-status-datum"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
            max={heute}
            required
          />
        </div>
        <div className="abr-sheet-buttons">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Abbrechen
          </button>
          <button type="submit" className="btn-primary flex-1">
            Speichern
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export default StatusDatumSheet;
