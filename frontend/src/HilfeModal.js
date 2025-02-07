import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import Modal from './Modal';

const AccordionItem = ({ title, children, isOpen, toggleOpen }) => {
    return (
        <div className="card-container-flush">
            <button
                className="w-full text-left p-4 bg-white dark:bg-gray-800 hover:bg-primary-25 dark:hover:bg-primary-900 
                    transition-colors duration-200 flex justify-between items-center"
                onClick={toggleOpen}
            >
                <span className="text-value font-medium">{title}</span>
                {isOpen ? <ChevronUp className="text-label" size={20} /> : <ChevronDown className="text-label" size={20} />}
            </button>
            {isOpen && (
                <div className="p-4 border-t border-primary-100 dark:border-primary-800">
                    <div className="text-label text-sm space-y-2">
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
            <div className="card-container-highlight space-y-6">
                {isFirstVisit && (
                    <div className="text-value">
                        <p className="text-lg">Willkommen in Ihrem persönlichen Fahrtenbuch!</p>
                        <p className="mt-2 text-label">
                            Diese Anwendung hilft Ihnen, Ihre dienstlichen Fahrten einfach und übersichtlich zu verwalten.
                            Sie können Fahrten eintragen, Abrechnungen erstellen und den Überblick über Ihre Erstattungen behalten.
                        </p>
                    </div>
                )}

                <div className="space-y-2">
                    <AccordionItem
                        title="Erste Schritte: Einrichtung"
                        isOpen={openItem === 0}
                        toggleOpen={() => toggleItem(0)}
                    >
                        <p>So richten Sie Ihr Fahrtenbuch ein:</p>
                        <ol className="list-decimal ml-4 space-y-2">
                            <li><strong>Profil vervollständigen:</strong> Geben Sie Ihre persönlichen Daten unter "Einstellungen" ein.</li>
                            <li><strong>Orte anlegen:</strong> Speichern Sie häufig besuchte Adressen (Dienstort, Wohnort, Kirchspiele) unter "Orte".</li>
                            <li><strong>Abrechnungsträger anlegen:</strong> Hinterlegen Sie unter "Einstellungen" > "Abrechnungsträger" die Organisationen, die Ihre Fahrtkosten erstatten.</li>
                            <li><strong>Erstattungssätze prüfen:</strong> Überprüfen Sie unter "Einstellungen" > "Erstattungen" die Kilometer-Erstattungssätze für Abrechnungsträger und Mitfahrer. <br/><strong>Wichtig:</strong> Erstattungen können mit einem Gültigkeitsdatum versehen werden. Das System berechnet dann die korrekten Beträge anhand des Fahrtendatums.</li>
                            <li><strong>Distanzen festlegen:</strong> Hinterlegen Sie unter "Distanzen" die Strecken zwischen Ihren Orten, um die Kilometer automatisch berechnen zu lassen.</li>
                        </ol>
                    </AccordionItem>

                    <AccordionItem
                        title="Fahrten eintragen"
                        isOpen={openItem === 1}
                        toggleOpen={() => toggleItem(1)}
                    >
                        <p>So erfassen Sie eine neue Fahrt:</p>
                        <ol className="list-decimal ml-4 mt-2 space-y-2">
                            <li><strong>Datum und Anlass:</strong> Wählen Sie das Datum und geben Sie den Anlass der Fahrt an.</li>
                            <li><strong>Start und Ziel:</strong> Wählen Sie Start- und Zielort aus Ihren gespeicherten Orten oder geben Sie einmalige Adressen ein.</li>
                            <li><strong>Kilometer:</strong> Die Kilometer werden automatisch berechnet, können aber bei Bedarf manuell angepasst werden.</li>
                            <li><strong>Abrechnungsträger:</strong> Wählen Sie den Abrechnungsträger aus, der die Fahrtkosten erstattet.</li>
                            <li><strong>Mitfahrer:</strong> Erfassen Sie Mitfahrer, um die korrekten Erstattungssätze zu berücksichtigen.</li>
                        </ol>
                    </AccordionItem>

                    <AccordionItem
                        title="Abrechnung und Erstattung"
                        isOpen={openItem === 2}
                        toggleOpen={() => toggleItem(2)}
                    >
                        <p>So behalten Sie den Überblick über Ihre Abrechnungen:</p>
                        <ol className="list-decimal ml-4 mt-2 space-y-2">
                            <li><strong>Monatsübersicht:</strong> Sehen Sie in der Monatsübersicht den Status Ihrer Abrechnungen (nicht eingereicht, eingereicht, erhalten).</li>
                            <li><strong>Jahresübersicht:</strong> Die Jahresübersicht fasst alle Monatsdaten zusammen.</li>
                            <li><strong>Export:</strong> Exportieren Sie Ihre Fahrtenabrechnungen als Excel-Datei zur Einreichung beim Abrechnungsträger.</li>
                        </ol>
                        <p className="mt-3"><strong>Tipp:</strong> Aktualisieren Sie den Abrechnungsstatus, sobald Sie eine Abrechnung eingereicht oder eine Erstattung erhalten haben.</p>
                    </AccordionItem>

                    <AccordionItem
                        title="Orte und Distanzen verwalten"
                        isOpen={openItem === 3}
                        toggleOpen={() => toggleItem(3)}
                    >
                        <p>Verwalten Sie Ihre Orte und Distanzen, um das Eintragen von Fahrten zu vereinfachen:</p>
                        <ul className="list-disc ml-4 mt-2 space-y-2">
                            <li><strong>Orte:</strong> Legen Sie Ihre häufigsten Start- und Zielorte (z.B. Wohnort, Dienstort, Kirchspiele) an.</li>
                            <li><strong>Distanzen:</strong> Hinterlegen Sie die Entfernungen zwischen Ihren gespeicherten Orten, um die Kilometer automatisch berechnen zu lassen.</li>
                        </ul>
                    </AccordionItem>

                     <AccordionItem
                        title="Automatisierung mit iOS-Kurzbefehlen"
                        isOpen={openItem === 4}
                        toggleOpen={() => toggleItem(4)}
                    >
                        <p>Nutzen Sie iOS-Kurzbefehle, um das Erfassen von Fahrten noch einfacher zu gestalten:</p>
                        <ul className="list-disc ml-4 mt-2 space-y-2">
                            <li><strong>iOS-Kurzbefehle:</strong> [Platzhalter für Link zum Download des iOS-Kurzbefehls]</li>
                            <li><strong>API-Schlüssel:</strong> Generieren Sie einen persönlichen API-Schlüssel unter "Einstellungen" > "API-Schlüssel", um die Kurzbefehle mit Ihrem Fahrtenbuch zu verbinden.</li>
                            <li><strong>Anleitung:</strong> Eine detaillierte Anleitung zur Verwendung der Kurzbefehle finden Sie [hier] (Platzhalter für Link zur Anleitung).</li>
                        </ul>
                    </AccordionItem>

                    <AccordionItem
                        title="Zusätzliche Funktionen"
                        isOpen={openItem === 5}
                        toggleOpen={() => toggleItem(5)}
                    >
                        <ul className="list-disc ml-4 mt-2 space-y-2">
                            <li><strong>Profilverwaltung:</strong> Passen Sie Ihre persönlichen Daten und Ihr Passwort an.</li>
                            {/* <li><strong>Benutzerverwaltung:</strong> (Nur für Administratoren) Verwalten Sie Benutzerkonten und -rechte.</li> */}
                        </ul>
                    </AccordionItem>
                </div>

                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="btn-primary w-full sm:w-auto"
                    >
                        {isFirstVisit ? 'Los geht\'s!' : 'Verstanden'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default HilfeModal;