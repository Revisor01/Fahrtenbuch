import React, { useEffect, useRef, useState } from 'react';
import { heuteISO, alsISODatum } from '../../utils/datum';
import { Pencil, Trash2 } from 'lucide-react';
import Sheet from '../ui/Sheet';
import AktionsSheet from '../ui/AktionsSheet';

// Gemeinsame Bausteine für Erstattungssätze (Träger + Mitfahrer):
// Sheet mit Betrag/Gültig-ab und die Historien-Zeilenliste.

export function SatzSheet({ offen, titel, satz, kinder, onClose, onSave }) {
  const [betrag, setBetrag] = useState(satz ? String(satz.betrag) : '');
  const [gueltigAb, setGueltigAb] = useState(
    satz
      ? alsISODatum(satz.gueltig_ab)
      : heuteISO()
  );

  // Sperre gegen den zweiten Klick. Beim Mitfahrer-Satz legte er bis zur
  // Migration 0013 tatsaechlich zwei Saetze mit demselben Stichtag an —
  // welcher dann galt, entschied die Sortierung. Die Regel in der Datenbank
  // faengt das jetzt ab, aber der Nutzer soll den Fehler gar nicht erst
  // ausloesen.
  const [speichert, setSpeichert] = useState(false);
  const montiertRef = useRef(true);
  useEffect(() => () => { montiertRef.current = false; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (speichert) return;
    const wert = parseFloat(betrag);
    if (Number.isNaN(wert) || wert <= 0) return;
    setSpeichert(true);
    try {
      // onSave ist bei beiden Aufrufern async; await wartet auch auf eine
      // gewoehnliche Rueckgabe gefahrlos.
      await onSave({ betrag: wert, gueltig_ab: gueltigAb });
    } finally {
      // Nur setzen, wenn es die Komponente noch gibt: Bei Erfolg schliessen
      // beide Aufrufer das Sheet (setSheet(null)), die Komponente ist dann
      // schon weg. React 18 verzeiht das zwar stillschweigend, aber darauf
      // soll sich der Code nicht verlassen.
      if (montiertRef.current) setSpeichert(false);
    }
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
          <button type="submit" className="btn-primary" disabled={speichert}>
            {speichert ? 'Speichert …' : 'Speichern'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

export function SatzListe({ saetze, onEdit, onDelete, leerText }) {
  // Ein Tipp auf die Zeile oeffnet Details + Aktionen (gleiches Muster wie in
  // den uebrigen Listen), statt zwei kleiner Icon-Buttons in der Zeile.
  const [aktionen, setAktionen] = useState(null);

  return (
    <div className="set-zeilen">
      {saetze.map((satz) => (
        <div key={satz.id} className="set-row">
          <button
            type="button"
            className="set-row-main set-row-tap"
            onClick={() => setAktionen(satz)}
            aria-label={`Erstattungssatz ${parseFloat(satz.betrag).toFixed(2)} € pro km — Aktionen öffnen`}
          >
            <span className="set-row-titel num">{parseFloat(satz.betrag).toFixed(2)} €/km</span>
            <span className="set-row-sub">
              Gültig ab {new Date(satz.gueltig_ab).toLocaleDateString('de-DE')}
            </span>
          </button>
        </div>
      ))}
      {saetze.length === 0 && (
        <div className="set-row"><div className="set-row-sub">{leerText}</div></div>
      )}

      {aktionen && (
        <AktionsSheet
          isOpen
          onClose={() => setAktionen(null)}
          titel={`${parseFloat(aktionen.betrag).toFixed(2)} € pro Kilometer`}
          untertitel={`Gültig ab ${new Date(aktionen.gueltig_ab).toLocaleDateString('de-DE')}`}
          zeilen={[
            { label: 'Satz', wert: `${parseFloat(aktionen.betrag).toFixed(2)} €/km` },
            { label: 'Gültig ab', wert: new Date(aktionen.gueltig_ab).toLocaleDateString('de-DE') },
          ]}
          aktionen={[
            {
              id: 'bearbeiten',
              label: 'Bearbeiten',
              icon: Pencil,
              onClick: () => onEdit(aktionen),
            },
            {
              id: 'loeschen',
              label: 'Löschen',
              icon: Trash2,
              variant: 'gefahr',
              hinweis: 'Bereits abgerechnete Fahrten bleiben unverändert',
              onClick: () => onDelete(aktionen),
            },
          ]}
        />
      )}
    </div>
  );
}
