import React, { useState } from 'react';

const AccordionItem = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b">
      <button
        className="w-full text-left p-4 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
};

const FahrtenbuchHilfe = () => {
  return (
    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
      <h2 className="text-xl font-bold mb-4">Willkommen in Ihrem persönlichen Fahrtenbuch!</h2>
      <div>
        <AccordionItem title="Übersicht">
          <p>
            Hier haben Sie alles im Blick, was Sie für die Verwaltung Ihrer dienstlichen Fahrten benötigen. Im oberen Bereich finden Sie ein Formular, mit dem Sie schnell und einfach neue Fahrten hinzufügen können. Geben Sie einfach das Datum, Start- und Zielort, den Anlass und die Kilometerzahl ein. Sie können auch angeben, ob die Fahrt über Ihren Dienstort ging und ob Sie Mitfahrer:innen hatten.
          </p>
          <p className="mt-2">
            Unterhalb des Formulars sehen Sie eine Liste all Ihrer eingetragenen Fahrten. Hier können Sie bestehende Einträge bearbeiten oder löschen.
          </p>
        </AccordionItem>

        <AccordionItem title="Monatliche Übersicht und Export">
          <p>
            Die monatliche Übersicht zeigt Ihnen auf einen Blick, wie viel Erstattung Sie für den Kirchenkreis und die Gemeinde erhalten. Nutzen Sie die Excel-Export-Funktionen, um Ihre Abrechnungen einfach zu erstellen und direkt in das Formular vom Kirchenkreis einzutragen.
          </p>
          <p className="mt-2">
            <strong>Wichtig:</strong> Damit alle Daten im Excelformular stimmen, tragen Sie bitte in Ihrem Profil alle benötigten Daten ein.
          </p>
        </AccordionItem>

        <AccordionItem title="Orte verwalten">
          <p>
            Unter "Orte" können Sie regelmäßig besuchte Orte speichern und ihnen die Kategorien Heimatort, Dienstort und Kirchspiel zuweisen. Alle anderen Orte werden unter Sonstiges sortiert.
          </p>
          <p className="mt-2">
            Dies erleichtert Ihnen das schnelle Eintragen von häufig besuchten Orten bei Ihren Fahrten.
          </p>
        </AccordionItem>

        <AccordionItem title="Distanzen verwalten">
          <p>
            Unter "Distanzen" können Sie die Entfernungen zwischen zwei vorher gespeicherten Orten definieren. So sparen Sie sich die Eingabe von Kilometern. Das System berechnet die Kilometer automatisch.
          </p>
          <p className="mt-2">
            Das ist besonders praktisch, wenn Sie Fahrten via Dienstort abrechnen wollen. Die vordefinierten Distanzen werden für die automatische Berechnung Ihrer Fahrtkilometer verwendet.
          </p>
        </AccordionItem>
      </div>
    </div>
  );
};

export default FahrtenbuchHilfe;