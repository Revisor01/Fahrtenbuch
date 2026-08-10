import React, { useState } from 'react';
import { heuteISO, alsISODatum } from '../../utils/datum';
import { Pencil, Trash2 } from 'lucide-react';
import Sheet from '../ui/Sheet';

// Gemeinsame Bausteine für Erstattungssätze (Träger + Mitfahrer):
// Sheet mit Betrag/Gültig-ab und die Historien-Zeilenliste.

export function SatzSheet({ offen, titel, satz, kinder, onClose, onSave }) {
  const [betrag, setBetrag] = useState(satz ? String(satz.betrag) : '');
  const [gueltigAb, setGueltigAb] = useState(
    satz
      ? alsISODatum(satz.gueltig_ab)
      : heuteISO()
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const wert = parseFloat(betrag);
    if (Number.isNaN(wert) || wert <= 0) return;
    onSave({ betrag: wert, gueltig_ab: gueltigAb });
  };

  return (
    <Sheet isOpen={offen} onClose={onClose} title={titel}>
      <form onSubmit={handleSubmit} className="set-sheet-form">
        {kinder}
        <div>
          <label className="form-label" htmlFor="satz-betrag">Betrag (€/km)</label>
          <input
            id="satz-betrag"
            type="number"
            step="0.01"
            min="0.01"
            value={betrag}
            onChange={(e) => setBetrag(e.target.value)}
            className="form-input"
            placeholder="z.B. 0,30"
            required
          />
        </div>
        <div>
          <label className="form-label" htmlFor="satz-datum">Gültig ab</label>
          <input
            id="satz-datum"
            type="date"
            value={gueltigAb}
            onChange={(e) => setGueltigAb(e.target.value)}
            className="form-input"
            required
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

export function SatzListe({ saetze, onEdit, onDelete, leerText }) {
  return (
    <div className="set-zeilen">
      {saetze.map((satz) => (
        <div key={satz.id} className="set-row">
          <div className="set-row-main">
            <div className="set-row-titel num">{parseFloat(satz.betrag).toFixed(2)} €/km</div>
            <div className="set-row-sub">
              Gültig ab {new Date(satz.gueltig_ab).toLocaleDateString('de-DE')}
            </div>
          </div>
          <button
            type="button"
            className="set-action"
            title="Bearbeiten"
            aria-label="Erstattungssatz bearbeiten"
            onClick={() => onEdit(satz)}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="set-action set-action-danger"
            title="Löschen"
            aria-label="Erstattungssatz löschen"
            onClick={() => onDelete(satz)}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {saetze.length === 0 && (
        <div className="set-row"><div className="set-row-sub">{leerText}</div></div>
      )}
    </div>
  );
}
