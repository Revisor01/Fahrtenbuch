import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const AccordionItem = ({ title, children, isOpen, toggleOpen }) => {
  return (
    <div className="mb-2 rounded-lg overflow-hidden">
      <button
        className="w-full text-left p-4 bg-blue-100 hover:bg-blue-200 transition-colors duration-200 flex justify-between items-center"
        onClick={toggleOpen}
      >
        <span className="font-semibold">{title}</span>
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {isOpen && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

const FahrtenbuchHilfe = () => {
  const [openItem, setOpenItem] = useState(null);
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  const toggleItem = (index) => {
    setOpenItem(openItem === index ? null : index);
  };

  const toggleHelp = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  return (
    <>
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-blue-50 shadow-lg transition-transform duration-300 ease-in-out transform ${isHelpVisible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{zIndex: 1000}}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Willkommen in Ihrem persönlichen Fahrtenbuch!</h2>
          <AccordionItem
            title="Übersicht"
            isOpen={openItem === 0}
            toggleOpen={() => toggleItem(0)}
          >
            <ul className="list-disc pl-5 space-y-2">
              <li>Verwalten Sie Ihre dienstlichen Fahrten einfach und effizient</li>
              <li>Fügen Sie neue Fahrten mit wenigen Klicks hinzu</li>
              <li>Geben Sie Datum, Start- und Zielort, Anlass und Kilometerzahl ein</li>
              <li>Option für Fahrten über den Dienstort und Mitfahrer:innen</li>
              <li>Bearbeiten oder löschen Sie bestehende Einträge in der Fahrten-Liste</li>
            </ul>
          </AccordionItem>

          <AccordionItem
            title="Monatliche Übersicht und Export"
            isOpen={openItem === 1}
            toggleOpen={() => toggleItem(1)}
          >
            <ul className="list-disc pl-5 space-y-2">
              <li>Sehen Sie Ihre Erstattungen für Kirchenkreis und Gemeinde auf einen Blick</li>
              <li>Nutzen Sie Excel-Export für einfache Abrechnungserstellung</li>
              <li>Direkter Import in das Kirchenkreis-Formular möglich</li>
              <li><strong>Wichtig:</strong> Vervollständigen Sie Ihr Profil für korrekte Daten im Excel-Export</li>
            </ul>
          </AccordionItem>

          <AccordionItem
            title="Orte verwalten"
            isOpen={openItem === 2}
            toggleOpen={() => toggleItem(2)}
          >
            <ul className="list-disc pl-5 space-y-2">
              <li>Speichern Sie regelmäßig besuchte Orte</li>
              <li>Kategorisieren Sie als Heimatort, Dienstort oder Kirchspiel</li>
              <li>Alle anderen Orte werden unter "Sonstiges" sortiert</li>
              <li>Erleichtert schnelles Eintragen häufiger Fahrtziele</li>
            </ul>
          </AccordionItem>

          <AccordionItem
            title="Distanzen verwalten"
            isOpen={openItem === 3}
            toggleOpen={() => toggleItem(3)}
          >
            <ul className="list-disc pl-5 space-y-2">
              <li>Definieren Sie Entfernungen zwischen gespeicherten Orten</li>
              <li>Automatische Kilometerberechnung spart Zeit bei der Eingabe</li>
              <li>Besonders nützlich für Fahrten via Dienstort</li>
              <li>Vordefinierte Distanzen für präzise Fahrtkilometerberechnung</li>
            </ul>
          </AccordionItem>
        </div>
      </div>

      <div 
        className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-blue-500 text-white p-2 cursor-pointer rounded-l-lg"
        onClick={toggleHelp}
        style={{zIndex: 1001, writingMode: 'vertical-rl', textOrientation: 'mixed'}}
      >
        <HelpCircle size={24} className="mb-2" />
        Hilfe
      </div>
    </>
  );
};

export default FahrtenbuchHilfe;