import React from 'react';
import { Check } from 'lucide-react';
import Sheet from './ui/Sheet';

// Neuigkeiten-Sheet nach Design-Spec (Redesign 2026): Abschnitts-Labels
// 12px/700 uppercase (--text-3), Feature-Zeilen 14px mit Petrol-Häkchen
// (--brand), Bestätigen als Primärbutton 48px.

const FEATURES = [
  {
    titel: 'Dashboard',
    punkte: [
      'Neues Dashboard als Startseite mit Übersicht über Erstattungen, Kilometer und Fahrten',
      'Jahres-Statistik mit Balkendiagramm (km pro Monat) und Erstattungsübersicht',
      'Neue Tab-Navigation: Dashboard, Fahrten & Export, Monatsübersicht, Einstellungen',
    ],
  },
  {
    titel: 'Favoriten & Schnelleingabe',
    punkte: [
      'Wiederkehrende Fahrten als Favoriten speichern (unter Einstellungen → Favoriten)',
      'Ein Klick auf einen Favoriten trägt die Fahrt mit heutigem Datum ein',
      '"Nochmal"-Button bei den letzten Fahrten — kopiert die Fahrt für heute',
    ],
  },
  {
    titel: 'Adress-Vervollständigung',
    punkte: [
      'Bei der Eingabe von Adressen erscheinen automatisch Vorschläge aus OpenStreetMap',
      'Funktioniert bei neuen Orten und einmaligen Orten im Fahrt-Formular',
    ],
  },
  {
    titel: 'Weitere Verbesserungen',
    punkte: [
      'PDF-Export neben Excel — mit Format-Auswahl (Excel, PDF oder beides als ZIP)',
      'Verbesserte Sicherheit, Eingabevalidierung und mobile Darstellung',
    ],
  },
];

const NewFeaturesModal = ({ isOpen, onClose }) => {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Neuigkeiten" wide>
      {FEATURES.map(({ titel, punkte }) => (
        <div key={titel} className="sheet-abschnitt">
          <div className="form-label">{titel}</div>
          {punkte.map((punkt) => (
            <div key={punkt} className="sheet-feature">
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              <p>{punkt}</p>
            </div>
          ))}
        </div>
      ))}

      <div className="sheet-fuss">
        <button type="button" className="btn-primary" onClick={onClose}>
          Verstanden
        </button>
      </div>
    </Sheet>
  );
};

export default NewFeaturesModal;
