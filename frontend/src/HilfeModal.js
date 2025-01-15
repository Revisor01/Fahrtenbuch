import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Modal from './Modal';

const AccordionItem = ({ title, children, isOpen, toggleOpen }) => {
  return (
    <div className="border border-primary-100 rounded-lg overflow-hidden mb-2">
      <button
        className="w-full text-left p-4 bg-white hover:bg-primary-50 transition-colors duration-200 flex justify-between items-center"
        onClick={toggleOpen}
      >
        <span className="font-medium text-primary-900">{title}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white border-t border-primary-100">
          <div className="text-primary-600 text-sm space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};
const HilfeModal = ({ isOpen, onClose, isFirstVisit }) => {
  const [openItem, setOpenItem] = useState(isFirstVisit ? 0 : null);
  
  const toggleItem = (index) => {
    setOpenItem(openItem === index ? null : index);
  };
  
  return (
    <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={isFirstVisit ? "Herzlich Willkommen!" : "Hilfe & Informationen"}
    size="wide"
    >
    <div className="bg-primary-25 p-6 rounded-lg space-y-6">
    {isFirstVisit && (
      <div className="mb-6 text-primary-600">
      <p className="text-lg">Willkommen in Ihrem persönlichen Fahrtenbuch!</p>
      <p className="mt-2">
      Diese Anwendung hilft Ihnen dabei, Ihre dienstlichen Fahrten einfach und übersichtlich zu verwalten. 
      Sie können Fahrten eintragen, Abrechnungen erstellen und den Überblick über Ihre Erstattungen behalten.
      </p>
      </div>
    )}
    
    <div className="space-y-2">
    <AccordionItem
    title="Der erste Start - Grundeinrichtung"
    isOpen={openItem === 0}
    toggleOpen={() => toggleItem(0)}
    >
    <p>Bevor Sie mit dem Fahrtenbuch arbeiten können, sollten Sie einige Grundeinstellungen vornehmen:</p>
    <ol className="list-decimal ml-4 mt-2 space-y-2">
    <li>
    <strong>Profil vervollständigen:</strong> Tragen Sie unter "Profil" Ihre persönlichen Daten ein. 
    Diese werden für die Abrechnungen benötigt.
    </li>
    <li>
    <strong>Orte anlegen:</strong> Speichern Sie unter "Orte" Ihre wichtigsten Adressen:
    <ul className="list-disc ml-4 mt-1">
    <li>Ihren Wohnort</li>
    <li>Ihren Dienstort</li>
    <li>Häufig besuchte Adressen</li>
    </ul>
    </li>
    <li>
    <strong>Distanzen einrichten:</strong> Legen Sie unter "Distanzen" die Entfernungen zwischen Ihren gespeicherten Orten fest.
    </li>
    </ol>
    </AccordionItem>
    
    <AccordionItem
    title="Fahrten eintragen"
    isOpen={openItem === 1}
    toggleOpen={() => toggleItem(1)}
    >
    <p>Das Eintragen einer neuen Fahrt ist ganz einfach:</p>
    <ol className="list-decimal ml-4 mt-2 space-y-2">
    <li>
    <strong>Grunddaten:</strong>
    <ul className="list-disc ml-4 mt-1">
    <li>Wählen Sie das Datum der Fahrt</li>
    <li>Geben Sie den Anlass der Fahrt ein (z.B. "Dienstbesprechung", "Hausbesuch")</li>
    </ul>
    </li>
    <li>
    <strong>Start- und Zielort:</strong>
    <ul className="list-disc ml-4 mt-1">
    <li>Wählen Sie die Orte aus der Liste oder nutzen Sie "Einmaliger Ort" für neue Adressen</li>
    <li>Bei gespeicherten Orten wird die Entfernung automatisch berechnet</li>
    </ul>
    </li>
    <li>
    <strong>Besondere Optionen:</strong>
    <ul className="list-disc ml-4 mt-1">
    <li>"via Dienstort" - wenn Sie über Ihren Dienstort fahren</li>
    <li>"Autosplit" - teilt die Kilometer automatisch zwischen Kirchenkreis und Gemeinde auf</li>
    <li>"Rückfahrt anlegen" - erstellt automatisch die Rückfahrt</li>
    </ul>
    </li>
    <li>
    <strong>Mitfahrer:innen:</strong> Fügen Sie bei Bedarf Mitfahrer:innen hinzu
    </li>
    </ol>
    </AccordionItem>
    
    <AccordionItem
    title="Abrechnung und Erstattung"
    isOpen={openItem === 2}
    toggleOpen={() => toggleItem(2)}
    >
    <p>Die Jahresübersicht zeigt Ihnen den aktuellen Stand Ihrer Abrechnungen:</p>
    <div className="space-y-2 mt-2">
    <p><strong>Status der Abrechnungen:</strong></p>
    <ul className="list-disc ml-4">
    <li><strong>Nicht eingereicht</strong> - Fahrt wurde noch nicht zur Abrechnung eingereicht</li>
    <li><strong>○ Eingereicht</strong> - Abrechnung wurde eingereicht, aber noch nicht erhalten</li>
    <li><strong>● Erhalten</strong> - Erstattung wurde bereits ausgezahlt</li>
    </ul>
    
    <p className="mt-3"><strong>Export und Abrechnung:</strong></p>
    <ul className="list-disc ml-4">
    <li>Nutzen Sie die Export-Funktion für Kirchenkreis und Gemeinde</li>
    <li>Sie erhalten eine Excel-Datei mit allen relevanten Daten</li>
    <li>Aktualisieren Sie den Status nach Einreichung oder Erhalt der Erstattung</li>
    </ul>
    
    <div className="mt-3 bg-primary-50 p-3 rounded">
    <strong>Tipp:</strong> Behalten Sie den Status Ihrer Abrechnungen im Auge und 
    aktualisieren Sie ihn regelmäßig. So haben Sie immer einen guten Überblick über 
    ausstehende Erstattungen.
    </div>
    </div>
    </AccordionItem>
    
    <AccordionItem
    title="Orte und Distanzen verwalten"
    isOpen={openItem === 3}
    toggleOpen={() => toggleItem(3)}
    >
    <div className="space-y-3">
    <div>
    <p className="font-medium">Orte anlegen:</p>
    <ul className="list-disc ml-4 mt-1">
    <li>Klicken Sie auf den Button "Orte"</li>
    <li>Geben Sie Namen und Adresse ein</li>
    <li>Markieren Sie ggf. als Wohnort, Dienstort oder Kirchspiel</li>
    <li>Speichern Sie den Ort</li>
    </ul>
    </div>
    
    <div>
    <p className="font-medium">Distanzen festlegen:</p>
    <ul className="list-disc ml-4 mt-1">
    <li>Öffnen Sie "Distanzen"</li>
    <li>Wählen Sie Start- und Zielort</li>
    <li>Tragen Sie die Kilometerzahl ein</li>
    <li>Die Distanz wird automatisch auch für die Gegenrichtung gespeichert</li>
    </ul>
    </div>
    
    <div className="bg-primary-50 p-3 rounded">
    <strong>Tipp:</strong> Je mehr Orte und Distanzen Sie speichern, 
    desto schneller können Sie neue Fahrten eintragen. Die Kilometer werden 
    dann automatisch berechnet.
    </div>
    </div>
    </AccordionItem>
    
    <AccordionItem
    title="Zusätzliche Funktionen"
    isOpen={openItem === 4}
    toggleOpen={() => toggleItem(4)}
    >
    <div className="space-y-3">
    <p className="font-medium">Profilverwaltung:</p>
    <ul className="list-disc ml-4">
    <li>Persönliche Daten aktualisieren</li>
    <li>Passwort ändern</li>
    <li>Abrechnungsinformationen verwalten</li>
    </ul>
    
    <p className="font-medium mt-3">Benutzerverwaltung (nur für Administratoren):</p>
    <ul className="list-disc ml-4">
    <li>Neue Benutzer anlegen</li>
    <li>Benutzerrechte verwalten</li>
    <li>Benutzer deaktivieren</li>
    </ul>
    </div>
    </AccordionItem>
    </div>
    
    <div className="mt-6 flex justify-end">
    <button
    onClick={onClose}
    className="w-full sm:w-auto btn-primary"
    >
    {isFirstVisit ? 'Los geht\'s!' : 'Verstanden'}
    </button>
    </div>
    </div>
    </Modal>
  );
};

export default HilfeModal;