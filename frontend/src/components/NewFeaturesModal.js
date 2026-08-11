import React from 'react';
import {
  Check,
  FileSpreadsheet,
  Tag,
  CalendarRange,
  Sparkles,
  MapPin,
  Star,
  ShieldCheck,
} from 'lucide-react';
import Sheet from './ui/Sheet';

// Neuigkeiten-Sheet nach Design-Spec (Redesign 2026): Abschnitts-Labels
// 12px/700 uppercase (--text-3), Feature-Zeilen 14px mit Petrol-Häkchen
// (--brand), Bestätigen als Primärbutton 48px.
//
// Zwei Neuerungen betreffen die Abrechnung unmittelbar (Formular des
// Kirchenkreises, Kostenstellen) und stehen deshalb als hervorgehobene
// Karten oben — nicht als Häkchen-Zeile zwischen allem anderen.

// Fast alles hier stand auf einem Wunschzettel aus dem Kollegium. Deshalb
// stehen die grossen Punkte als Karten oben statt als Haekchen-Zeile
// irgendwo dazwischen.
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
  {
    icon: Sparkles,
    titel: 'Die App sieht neu aus',
    text: 'Die gesamte Oberfläche wurde neu gestaltet — ruhiger, übersichtlicher und auf dem Handy genauso benutzbar wie am Rechner. Ein Tipp auf eine Zeile öffnet jetzt überall dieselbe Ansicht mit allen Angaben und Aktionen. Helles und dunkles Design inklusive.',
  },
  {
    icon: MapPin,
    titel: 'Adressen werden vorgeschlagen',
    text: 'Beim Tippen einer Adresse erscheinen passende Vorschläge — für gespeicherte Orte ebenso wie für einmalige Ziele. Tippfehler sind kein Problem mehr, und eine mitgetippte Hausnummer wird übernommen, auch wenn die Karte sie nicht kennt.',
  },
  {
    icon: Star,
    titel: 'Favoriten für Strecken, die du oft fährst',
    text: 'Wiederkehrende Strecken lassen sich als Favorit speichern (Einstellungen → Favoriten). Ein Tipp auf dem Start-Bildschirm trägt die Fahrt mit dem heutigen Datum ein — auf Wunsch gleich mit Rückfahrt.',
  },
  {
    icon: ShieldCheck,
    titel: 'Sicherheit und Aktualität',
    text: 'Alle Bausteine der App sind auf dem aktuellen Stand, bekannte Sicherheitslücken in den verwendeten Bibliotheken sind geschlossen. Dazu kamen ein geprüfter Umgang mit Einladungs- und Zurücksetzen-Links sowie strengere Vorgaben, welche Inhalte der Browser überhaupt laden darf.',
  },
];

// Alles Weitere darunter — ohne die Punkte zu wiederholen, die oben schon
// als Karte stehen.
const FEATURES = [
  {
    titel: 'Startseite',
    punkte: [
      'Überblick über offene Erstattungen, Kilometer und Fahrten auf einen Blick',
      'Jahres-Statistik mit Balkendiagramm (km pro Monat) und Erstattungsübersicht',
      'Die zuletzt erfassten Fahrten mit einem Tipp wiederholen oder um die Rückfahrt ergänzen',
    ],
  },
  {
    titel: 'Erfassen',
    punkte: [
      'Neue Fahrt in zwei Schritten: „Wohin?" und bestätigen — den Rest füllt die App aus deinen bisherigen Fahrten',
      'Rückfahrt auf Wunsch direkt mit anlegen',
      'Mitfahrer:innen werden an der Fahrt erfasst und getrennt vergütet',
    ],
  },
  {
    titel: 'Abrechnung & Export',
    punkte: [
      'Zusätzlich zu Excel gibt es den Export als PDF — oder beides zusammen als ZIP',
      'Beim Einreichen fragt die App, welches Format du brauchst',
      'Monate lassen sich einreichen, als erstattet markieren und wieder zurücksetzen',
    ],
  },
  {
    titel: 'Kleinigkeiten',
    punkte: [
      'Hilfeseite mit einer Anleitung zu jedem Bereich der App',
      'Die App lässt sich wie eine richtige App auf dem Startbildschirm ablegen',
      'Dein Wohnort steht jetzt im Profil — er liefert die Anschrift auf der Abrechnung',
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
