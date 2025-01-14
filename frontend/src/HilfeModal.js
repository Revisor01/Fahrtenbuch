import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, X } from 'lucide-react';

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

const HilfeModal = ({ isOpen, onClose }) => {
  const [openItem, setOpenItem] = useState(null);
  const helpRef = useRef(null);

  const toggleItem = (index) => {
    setOpenItem(openItem === index ? null : index);
  };


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }
  return (
    
      <div 
        ref={helpRef}
        className={`fixed top-0 right-0 h-full w-80 bg-blue-50 shadow-lg transition-transform duration-300 ease-in-out transform  translate-x-0`}
        style={{zIndex: 1000}}
      >
        <div className="p-4 relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
          <h2 className="text-xl font-bold mb-4">Willkommen in Ihrem persönlichen Fahrtenbuch!</h2>
          <AccordionItem
            title="Übersicht"
            isOpen={openItem === 0}
            toggleOpen={() => toggleItem(0)}
          >
            <p>
              Hier können Sie ganz einfach Ihre dienstlichen Fahrten eintragen und verwalten. 
              Oben auf der Seite finden Sie ein Formular für neue Fahrten. Tragen Sie einfach 
              das Datum, von wo nach wo Sie gefahren sind, warum und wie viele Kilometer ein. 
              Sie können auch angeben, ob Sie über Ihren Dienstort gefahren sind und ob jemand 
              mitgefahren ist.
            </p>
            <p className="mt-2">
              Unter dem Formular sehen Sie alle Ihre Fahrten in einer Liste. Hier können Sie 
              Einträge ändern oder löschen, falls mal etwas nicht stimmt.
            </p>
          </AccordionItem>

          <AccordionItem
            title="Monatliche Übersicht und Abrechnung"
            isOpen={openItem === 1}
            toggleOpen={() => toggleItem(1)}
          >
            <p>
              In der monatlichen Übersicht sehen Sie, wie viel Geld Sie für Ihre Fahrten 
              zurückbekommen - aufgeteilt nach Kirchenkreis und Gemeinde. Sie können diese 
              Übersicht ganz einfach als Excel-Datei herunterladen. Das macht die Abrechnung 
              mit dem Kirchenkreis viel einfacher!
            </p>
             <p className="mt-2">
             <strong>Wie exportiere ich die Daten?</strong> Klicken Sie auf den Button "Export Kirchenkreis" oder "Export Gemeinde"
              , um die jeweilige Excel-Datei zu erstellen und herunterzuladen. 
             </p>
            <p className="mt-2">
              <strong>Wichtig:</strong> Damit in der Excel-Datei alles stimmt, füllen Sie bitte 
              alle Ihre persönlichen Daten in Ihrem Profil aus.
            </p>
            <p className="mt-2">
              <strong>Was bedeuten die unterschiedlichen Symbole in der Tabelle?</strong> 
               <ul>
                    <li><b>● Erhalten:</b> Das Geld wurde bereits ausbezahlt.</li>
                    <li><b>○ Eingereicht:</b> Die Abrechnung wurde eingereicht, aber noch nicht ausbezahlt.</li>
                    <li><b>Nicht eingereicht:</b> Die Abrechnung muss noch eingereicht werden.</li>
                </ul>
            </p>
          </AccordionItem>

           <AccordionItem
            title="Fahrten eintragen"
            isOpen={openItem === 4}
            toggleOpen={() => toggleItem(4)}
          >
            <p>
             <strong>Wie trage ich eine Fahrt ein?</strong> Verwenden Sie das Formular "Fahrt hinzufügen", geben Sie das Datum, den Start- und Zielort, den Anlass und die gefahrenen Kilometer ein.
             </p>
             <p className="mt-2">
            <strong>Was bedeutet "Via Dienstort"?</strong> Wenn Sie auf dem Weg zu ihrem eigentlichen Ziel über ihren Dienstort fahren, können Sie das mit der Checkbox "Via Dienstort" auswählen. Die Kilometer zum Dienstort und die Kilometer vom Dienstort zum Zielort werden automatisch berechnet.
            </p>
              <p className="mt-2">
              <strong>Was bedeutet "Autosplit"?</strong> Bei der Autosplit funktion werden Kilometer und Beträge automatisch aufgeteilt, wenn die Fahrt durch einen Dienstort durchgeführt wird. Dabei wird die Strecke einmalig zur Gesamtabrechnung hinzugerechnet.
            </p>
            <p className="mt-2">
              <strong>Wie füge ich Mitfahrer:innen hinzu?</strong> Wenn Sie Mitfahrer:innen haben, können Sie diese mit "+" hinzufügen und die jeweiligen Namen eintragen.
            </p>
            <p className="mt-2">
            <strong>Was bedeutet einmaliger Ort?</strong> Mit einmaligen Orten kann ein Ort ausgewählt werden, der nicht gespeichert werden muss. 
            </p>
          </AccordionItem>

          <AccordionItem
             title="Orte speichern"
            isOpen={openItem === 2}
            toggleOpen={() => toggleItem(2)}
          >
            <p>
              Unter "Orte" können Sie alle Orte speichern, zu denen Sie öfter fahren. Sie können 
              hier auch Ihren Heimatort, Ihren Dienstort und Ihr Kirchspiel festlegen. Das macht 
              es viel schneller, neue Fahrten einzutragen, weil Sie die Orte dann einfach auswählen 
              können, statt sie jedes Mal neu einzugeben.
            </p>
            <p className="mt-2">
              <strong>Wie trage ich einen Ort ein?</strong> Füllen Sie einfach das Formular mit dem Namen und der Adresse aus und geben Sie an, ob es sich um ihren Wohnort, Dienstort oder ein Kirchspiel handelt.
            </p>
          </AccordionItem>

          <AccordionItem
            title="Entfernungen speichern"
            isOpen={openItem === 3}
            toggleOpen={() => toggleItem(3)}
          >
            <p>
              Unter "Distanzen" können Sie die Entfernungen zwischen Orten, die Sie gespeichert 
              haben, eintragen. Das ist praktisch, weil Sie dann bei neuen Fahrten nicht jedes Mal 
              die Kilometerzahl ausrechnen müssen. Das Fahrtenbuch macht das automatisch für Sie.
            </p>
            <p className="mt-2">
             <strong>Wie trage ich eine Distanz ein?</strong> Wählen Sie den Start- und Zielort aus der Liste aus und tragen Sie die Kilometerzahl ein.
            </p>
             <p className="mt-2">
              Das ist besonders nützlich, wenn Sie oft über Ihren Dienstort fahren. Sie sparen 
              Zeit und die Abrechnung wird genauer.
            </p>
          </AccordionItem>

          <AccordionItem
            title="Profil"
            isOpen={openItem === 5}
            toggleOpen={() => toggleItem(5)}
          >
            <p>
            <strong>Was kann ich in meinem Profil tun?</strong> Hier können Sie Ihre persönlichen Informationen einsehen,
            Ihr Passwort ändern oder sich ausloggen.
            </p>
          </AccordionItem>
          
            <AccordionItem
            title="Benutzerverwaltung (Admin)"
            isOpen={openItem === 6}
            toggleOpen={() => toggleItem(6)}
          >
            <p>
                Als Admin können Sie hier Benutzer verwalten, Rollen ändern, Benutzer hinzufügen oder entfernen.
            </p>
          </AccordionItem>
           <AccordionItem
            title="Passwort vergessen"
            isOpen={openItem === 7}
            toggleOpen={() => toggleItem(7)}
           >
            <p>
              Wenn Sie Ihr Passwort vergessen haben, klicken Sie im Login-Bildschirm auf "Passwort vergessen?".
             Sie erhalten eine E-Mail mit einem Link, um ein neues Passwort zu erstellen.
           </p>
          </AccordionItem>
        </div>
      </div>
  );
};

export default HilfeModal;