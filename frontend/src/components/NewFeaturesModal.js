import React from 'react';
import { Check, FileSpreadsheet, Tag, CalendarRange } from 'lucide-react';
import Sheet from './ui/Sheet';

// Neuigkeiten-Sheet nach Design-Spec (Redesign 2026): Abschnitts-Labels
// 12px/700 uppercase (--text-3), Feature-Zeilen 14px mit Petrol-Häkchen
// (--brand), Bestätigen als Primärbutton 48px.
//
// Zwei Neuerungen betreffen die Abrechnung unmittelbar (Formular des
// Kirchenkreises, Kostenstellen) und stehen deshalb als hervorgehobene
// Karten oben — nicht als Häkchen-Zeile zwischen allem anderen.

const HIGHLIGHTS = [
  {
    icon: FileSpreadsheet,
    titel: 'Das aktuelle Formular des Kirchenkreises',
    text: 'Der Export nutzt jetzt das offizielle Abrechnungsformular des Kirchenkreises. Was die App ausgibt, kannst du ohne Nacharbeit einreichen — mit vollständigem Datum, Unterschriftsfeldern und den Feldern für Name, Kostenträger und IBAN.',
  },
  {
    icon: Tag,
    titel: 'Kostenstellen',
    text: 'Zu jedem Abrechnungsträger lässt sich eine Kostenstelle hinterlegen (Einstellungen → Abrechnungsträger). Sie wandert automatisch in den Export und steht im Formular an der richtigen Stelle.',
  },
  {
    icon: CalendarRange,
    titel: 'Mehrere Monate auf einmal',
    text: 'Der Export ist nicht mehr auf einen Monat beschränkt: Du wählst einen Zeitraum — etwa ein ganzes Quartal — und bekommst alles in einer Abrechnung. Bei mehreren Dateien kommt automatisch ein ZIP.',
  },
];

const FEATURES = [
  {
    titel: 'Neues Design',
    punkte: [
      'Die gesamte Oberfläche wurde neu gestaltet — ruhiger, übersichtlicher und auf dem Handy genauso benutzbar wie am Rechner',
      'Helles und dunkles Design, umschaltbar über das Symbol in der Seitenleiste',
    ],
  },
  {
    titel: 'Startseite',
    punkte: [
      'Neue Startseite mit Überblick über offene Erstattungen, Kilometer und Fahrten',
      'Jahres-Statistik mit Balkendiagramm (km pro Monat) und Erstattungsübersicht',
    ],
  },
  {
    titel: 'Schneller erfassen',
    punkte: [
      'Wiederkehrende Fahrten als Favoriten speichern (Einstellungen → Favoriten) — ein Klick trägt sie mit heutigem Datum ein',
      '„Nochmal"-Button bei den letzten Fahrten kopiert eine Fahrt für heute',
      'Adressen werden beim Tippen vorgeschlagen, auch für einmalige Orte — eine mitgetippte Hausnummer wird übernommen, selbst wenn die Karte sie nicht kennt',
    ],
  },
  {
    titel: 'Export',
    punkte: [
      'Zusätzlich zu Excel gibt es den Export als PDF — oder beides zusammen als ZIP',
      'Beim Einreichen fragt die App, welches Format du brauchst',
    ],
  },
  {
    titel: 'Unter der Haube',
    punkte: [
      'Hilfeseite mit Anleitung zu jedem Bereich der App',
      'Verbesserte Sicherheit, Eingabeprüfung und mobile Darstellung',
    ],
  },
];

const NewFeaturesModal = ({ isOpen, onClose }) => {
  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Neuigkeiten" wide>
      <div className="neu-highlights">
        {HIGHLIGHTS.map(({ icon: Icon, titel, text }) => (
          <div key={titel} className="neu-highlight">
            <span className="neu-highlight-icon" aria-hidden="true">
              <Icon size={18} strokeWidth={2} />
            </span>
            <div className="neu-highlight-text">
              <h3>{titel}</h3>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>

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
