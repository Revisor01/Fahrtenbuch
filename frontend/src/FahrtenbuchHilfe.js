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

const FahrtenbuchHilfe = () => {
  const [openItem, setOpenItem] = useState(null);
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const helpRef = useRef(null);

  const toggleItem = (index) => {
    setOpenItem(openItem === index ? null : index);
  };

  const toggleHelp = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  const closeHelp = () => {
    setIsHelpVisible(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (helpRef.current && !helpRef.current.contains(event.target)) {
        closeHelp();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <div 
        ref={helpRef}
        className={`fixed top-0 right-0 h-full w-80 bg-blue-50 shadow-lg transition-transform duration-300 ease-in-out transform ${isHelpVisible ? 'translate-x-0' : 'translate-x-full'}`}
        style={{zIndex: 1000}}
      >
        <div className="p-4 relative">
          <button
            onClick={closeHelp}
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
              <strong>Wichtig:</strong> Damit in der Excel-Datei alles stimmt, füllen Sie bitte 
              alle Ihre persönlichen Daten in Ihrem Profil aus.
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
              Das ist besonders nützlich, wenn Sie oft über Ihren Dienstort fahren. Sie sparen 
              Zeit und die Abrechnung wird genauer.
            </p>
          </AccordionItem>
        </div>
      </div>

    {!isHelpVisible && (
      <div 
      className="fixed top-20 right-0 bg-blue-500 text-white px-3 py-2 cursor-pointer rounded-l-lg flex items-center opacity-70"
      onClick={toggleHelp}
      style={{
        zIndex: 1001,
        writingMode: 'vertical-rl',
        textOrientation: 'mixed'
      }}
      >
      <HelpCircle size={24} className="mb-2 transform rotate-90" />
      <span className="text-lg ml-1">Hilfe</span>
      </div>
    )}
    </>
  );
};

export default FahrtenbuchHilfe;