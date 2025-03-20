// LandingPage.js
import React, { useState, useContext, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './index.css';
import { ChevronDown, ChevronUp, Play, Book, ArrowLeft, Smartphone, Download } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { AppContext } from './App';

// AccordionItem Komponente
const AccordionItem = ({ title, children, isOpen, toggleOpen }) => {
  return (
    <div className="card-container-flush mb-2 border border-primary-100 dark:border-primary-700">
    <button
    className="w-full text-left p-4 bg-white dark:bg-gray-800 hover:bg-primary-25 dark:hover:bg-primary-900 transition-colors duration-200 flex justify-between items-center"
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

const VideoCard = ({ title, description, thumbnail, videoUrl, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [iframeHeight, setIframeHeight] = useState(null);  // Höhe wird dynamisch berechnet
    const cardRef = useRef(null);

    useEffect(() => {
        const calculateIframeHeight = () => {
            if (!cardRef.current) return;  // Stellen Sie sicher, dass die Ref gesetzt ist

            const cardWidth = cardRef.current.offsetWidth;
            const aspectRatio = 9 / 16;
            setIframeHeight(cardWidth * aspectRatio);
        };

        calculateIframeHeight();
        window.addEventListener('resize', calculateIframeHeight);

        return () => window.removeEventListener('resize', calculateIframeHeight);
    }, []);

    return (
        <div className="card-container-highlight flex flex-col h-full rounded-lg" ref={cardRef}>
            <div className="relative">
                {!isPlaying ? (
                    <>
                        <img
                            src={thumbnail}
                            alt={title}
                            className="w-full object-cover rounded-t-lg"
                            style={{ height: iframeHeight ? `${iframeHeight}px` : 'auto' }} // Höhe basierend auf Berechnung
                        />
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-40 transition-all duration-200"
                        >
                            <div className="bg-primary-500 text-white rounded-full p-3">
                                <Play size={24} />
                            </div>
                        </button>
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                            {duration}
                        </div>
                    </>
                ) : (
                    <div className="aspect-video">
                        <iframe
                            src={videoUrl}
                            title={title}
                            className="w-full"
                            style={{ height: iframeHeight ? `${iframeHeight}px` : 'auto' }} // Höhe basierend auf Berechnung
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                )}
            </div>
            <div className="p-4 flex-1 flex flex-col">
                <h3 className="text-lg font-medium text-value mb-2">{title}</h3>
                <p className="text-sm text-label flex-1">{description}</p>
            </div>
        </div>
    );
};

export default function LandingPage() {
    const { isLoggedIn } = useContext(AppContext) || { isLoggedIn: false };
    const [openItem, setOpenItem] = useState(null);
    const appTitle = window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch Kirchenkreis Dithmarschen";

    const toggleItem = (index) => {
        setOpenItem(openItem === index ? null : index);
    };

    const videos = [
        {
            id: 1,
            title: "Registrieren",
            description: "So legen Sie ihren Benutzeraccount an.",
            thumbnail: "https://media.godsapp.de/media/original/thumbnails/user/Simon/bc49d8ced7b947fba2d70f7bf0e320e7_AZxwP9x.1Benutzererstellen.mp4.jpg",
            videoUrl: "https://media.godsapp.de/embed?m=irWJ4ut4p",
            duration: "1:15"
        },
        {
            id: 2,
            title: "Grundfunktionen",
            description: "Profil einrichten, Orte und Distanzen speichern, Abrechnungsträger verwalten.",
            thumbnail: "https://media.godsapp.de/media/original/thumbnails/user/Simon/8e530b6fc0b34536be3e0d511bf554ca_0wOWmP6.2Grundfunktionen.mp4.jpg",
            videoUrl: "https://media.godsapp.de/embed?m=vthFrHWjI",
            duration: "3:10"
        },
        {
            id: 3,
            title: "Fahrten & Abrechnung",
            description: "Fahrten eintragen, exportieren und den Abrechnungsstatus verwalten.",
            thumbnail: "https://media.godsapp.de/media/original/thumbnails/user/Simon/f9d62ff48dfb44efbbf81013250d83a0_van9Mq8.3Fahrteneintragenundexportieren.mp4.jpg",
            videoUrl: "https://media.godsapp.de/embed?m=hZJphkTvu",
            duration: "4:10"
        },
        {
            id: 4,
            title: "iOS Kurzbefehl einrichten",
            description: "Erfahren Sie, wie Sie Fahrten per Kurzbefehle auf dem iPhone erfassen können.",
            thumbnail: "https://media.godsapp.de/media/original/thumbnails/user/Simon/5d881e9156494dbf9f1e581627cb645b_kiyvVqw.4KurzbefehliOS.mp4.jpg",
            videoUrl: "https://media.godsapp.de/embed?m=mhHRVFXDD",
            duration: "4:40"
        }
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900">
      <div className="container mx-auto p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
      <h1 className="text-lg font-medium text-value">
      {appTitle}
      </h1>
      <Link to="/" className="w-full sm:w-auto btn-secondary flex items-center justify-center gap-2">
      <ArrowLeft size={16} />
      <span>{isLoggedIn ? "Zurück zum Fahrtenbuch" : "Zum Login"}</span>
      </Link>
      </div>
      </div>
      </header>

            {/* Main Content */}
            <main className="container mx-auto p-4 py-8 space-y-12">
                {/* Intro Section */}
                <section className="text-center max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-value mb-4">
                        Willkommen im Fahrtenbuch für kirchliche Mitarbeiter:innen
                    </h2>
                    <p className="text-label mb-6">
                        Hier finden Sie Anleitungen und Hilfevideos, die Ihnen bei der Nutzung des Fahrtenbuchs helfen.
                        Lernen Sie, wie Sie Ihre Fahrten effizient erfassen und abrechnen können.
                    </p>
                    <div className="flex justify-center gap-4">
                        <a href="#videos" className="btn-primary flex items-center gap-2">
                            <Play size={16} />
                            Videos ansehen
                        </a>
                        <a href="#faq" className="btn-secondary flex items-center gap-2">
                            <Book size={16} />
                            FAQs lesen
                        </a>
                    </div>
                </section>

                {/* Video Tutorials */}
                <section id="videos">
                    <h2 className="text-xl font-bold text-value mb-6">Video-Anleitungen</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {videos.map(video => (
                            <VideoCard key={video.id} {...video} />
                        ))}
                    </div>
                    <div className="text-center mt-6">
                        <p className="text-sm text-label mb-2">Alle Videos in einer Playlist ansehen:</p>
      
      <a
      href="https://media.godsapp.de/playlists/lIkPjeALd"
      target="_blank"
      rel="noopener noreferrer"
      className="btn-primary w-full sm:w-auto inline-flex justify-center items-center"
      >
      Zur kompletten Playlist
      </a>
                    </div>
                </section>

                {/* Hilfe & Informationen (früher FAQ) */}
                <section id="faq" className="card-container-highlight">
                    <h2 className="text-xl font-bold text-value mb-6">Hilfe & Informationen</h2>
                    <div className="space-y-6">

                        <div className="text-value">
                            <p className="text-lg">Willkommen in Ihrem persönlichen Fahrtenbuch!</p>
                            <p className="mt-2 text-label">
                                Diese Anwendung hilft Ihnen, Ihre dienstlichen Fahrten einfach und übersichtlich zu verwalten.
                                Sie können Fahrten eintragen, Abrechnungen erstellen und den Überblick über Ihre Erstattungen behalten.
                                </p>
                        </div>

                        <div className="space-y-2">
                            <AccordionItem
                                title="Erste Schritte: Einrichtung"
                                isOpen={openItem === 0}
                                toggleOpen={() => toggleItem(0)}
                            >
                                <div className="space-y-4">
                                    <p>Bevor Sie mit dem Fahrtenbuch arbeiten können, sind einige Grundeinstellungen nötig:</p>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">1. Profil vervollständigen</h4>
                                        <p>Öffnen Sie die Einstellungen über den Button oben rechts:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Hinterlegen Sie Ihre persönlichen Daten</li>
                                            <li>Wichtig für die Abrechnung: Name, E-Mail, IBAN</li>
                                            <li>Optional: Organisationsdetails</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">2. Orte anlegen</h4>
                                        <p>Unter "Orte" in den Einstellungen:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Legen Sie Ihren Wohnort fest (wird oben in der Liste angezeigt)</li>
                                            <li>Bestimmen Sie Ihren Dienstort (wird oben in der Liste angezeigt)</li>
                                            <li>Speichern Sie häufig besuchte Adressen</li>
                                            <li>Tipp: Nutzen Sie aussagekräftige Namen für die Orte</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">3. Distanzen hinterlegen</h4>
                                        <p>Im Tab "Distanzen" der Einstellungen:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Häufige Strecken mit korrekter Kilometerzahl speichern</li>
                                            <li>Gilt automatisch für beide Richtungen</li>
                                            <li>Ermöglicht schnellere Erfassung von Fahrten</li>
                                            <li>Verhindert Abweichungen bei wiederkehrenden Strecken</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">4. Abrechnungsträger einrichten</h4>
                                        <p>Im Tab "Träger" der Einstellungen:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Definieren Sie alle Organisationen, die Ihre Fahrtkosten erstatten</li>
                                            <li>Die Reihenfolge können Sie per Drag & Drop anpassen</li>
                                            <li>Nicht mehr benötigte Träger können deaktiviert werden</li>
                                            <li>Ein Löschen ist nur möglich, wenn keine Fahrten zugeordnet sind</li>
                                        </ul>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="font-medium">5. Erstattungssätze festlegen</h4>
                                        <p>Im Tab "Erstattungen" der Einstellungen:</p>
                                        <ul className="list-disc ml-4 space-y-1">
                                            <li>Für jeden Abrechnungsträger Kilometersatz festlegen</li>
                                            <li>Mitfahrer:innen-Erstattung separat definieren</li>
                                            <li>Gültig-ab-Datum beachten - ermöglicht zeitliche Änderungen</li>
                                            <li>Historische Sätze bleiben für alte Fahrten erhalten</li>
                                        </ul>
                                    </div>
                                </div>
                            </AccordionItem>

      <AccordionItem
      title="Fahrten eintragen"
      isOpen={openItem === 1}
      toggleOpen={() => toggleItem(1)}
      >
      <div className="space-y-4">
      <p>So erfassen Sie eine neue Fahrt:</p>
      
      <div className="space-y-2">
      <h4 className="font-medium">1. Grunddaten der Fahrt</h4>
      <ul className="list-disc ml-4 space-y-1">
      <li>Wählen Sie das Datum der Fahrt</li>
      <li>Geben Sie einen aussagekräftigen Anlass ein</li>
      <li>Wählen Sie den passenden Abrechnungsträger</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">2. Start- und Zielort</h4>
      <ul className="list-disc ml-4 space-y-1">
      <li>Wählen Sie aus Ihren gespeicherten Orten</li>
      <li>Oder nutzen Sie "Einmaliger Ort" für neue Adressen</li>
      <li>Die Kilometer werden bei gespeicherten Orten automatisch berechnet</li>
      <li>Bei einmaligen Orten: Kilometer manuell eingeben</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">3. Mitfahrer:innen (optional)</h4>
      <ul className="list-disc ml-4 space-y-1">
      <li>Button "+ Mitfahrer:in" klicken</li>
      <li>Name und Arbeitsstätte eingeben</li>
      <li>Fahrtrichtung wählen: Hin, Rück oder Beides</li>
      <li>Mehrere Mitfahrer:innen möglich</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">4. Rückfahrt</h4>
      <ul className="list-disc ml-4 space-y-1">
      <li>Option "Rückfahrt anlegen" aktivieren</li>
      <li>Erstellt automatisch eine zweite Fahrt</li>
      <li>Übernimmt alle Daten in umgekehrter Richtung</li>
      <li>Mitfahrer:innen werden entsprechend ihrer Auswahl übernommen</li>
      </ul>
      </div>
      </div>
      </AccordionItem>
      <AccordionItem
      title="Orte und Distanzen verwalten"
      isOpen={openItem === 4}
      toggleOpen={() => toggleItem(4)}
      >
      <div className="space-y-4">
      <div className="space-y-2">
      <h4 className="font-medium">Orte verwalten</h4>
      <p>In den Einstellungen unter "Orte":</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Neue Orte anlegen mit Name und Adresse</li>
      <li>Spezielle Kennzeichnungen möglich:
      <ul className="list-disc ml-4 mt-1">
      <li>Wohnort (nur einer möglich)</li>
      <li>Dienstort (nur einer möglich)</li>
      <li>Kirchspiel/Zweigstelle (mehrere möglich)</li>
      </ul>
      </li>
      <li>Orte bearbeiten oder löschen</li>
      <li>Sortierung erfolgt automatisch nach Typ</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">Distanzen festlegen</h4>
      <p>In den Einstellungen unter "Distanzen":</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Entfernungen zwischen gespeicherten Orten definieren</li>
      <li>Gilt automatisch für beide Richtungen</li>
      <li>Nachträgliche Änderungen möglich</li>
      <li>Auswirkung auf bestehende Fahrten prüfbar</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">Automatische Berechnung</h4>
      <p>Vorteile der Distanzverwaltung:</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Schnellere Erfassung von Fahrten</li>
      <li>Konsistente Kilometerzahlen</li>
      <li>Weniger Fehlerquellen</li>
      <li>Bessere Nachvollziehbarkeit</li>
      </ul>
      </div>
      
      <div className="bg-primary-50 dark:bg-primary-900 p-4 rounded-lg mt-4">
      <h4 className="font-medium mb-2">Tipp zur Distanzpflege:</h4>
      <p className="text-sm">
      Legen Sie neue Distanzen am besten direkt an, wenn Sie eine Strecke zum 
      ersten Mal fahren. So bauen Sie nach und nach eine vollständige 
      Distanzdatenbank auf und sparen langfristig Zeit bei der Erfassung.
      </p>
      </div>
      </div>
      </AccordionItem>
      <AccordionItem
      title="Abrechnung und Erstattung"
      isOpen={openItem === 2}
      toggleOpen={() => toggleItem(2)}
      >
      <div className="space-y-4">
      <div className="space-y-2">
      <h4 className="font-medium">Monatsübersicht</h4>
      <p>Im oberen Bereich sehen Sie die Zusammenfassung des aktuellen Monats:</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Summen pro Abrechnungsträger</li>
      <li>Mitfahrer-Erstattungen</li>
      <li>Gesamtsumme des Monats</li>
      <li>Status der Abrechnungen (nicht eingereicht/eingereicht/erhalten)</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">Export der Abrechnungen</h4>
      <p>Für jeden Abrechnungsträger separat:</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Excel-Export über den "Export"-Button</li>
      <li>Enthält alle relevanten Informationen</li>
      <li>Optimiert für die Einreichung</li>
      <li>Bei vielen Fahrten: Automatische Aufteilung</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">Abrechnungsstatus verwalten</h4>
      <p>Halten Sie den Status Ihrer Abrechnungen aktuell:</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Nach Export: Als "Eingereicht" markieren</li>
      <li>Nach Erhalt: Als "Erhalten" markieren</li>
      <li>Status einzeln oder per Schnellaktion ändern</li>
      <li>Filterung nach offenen Abrechnungen möglich</li>
      </ul>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">Jahresübersicht</h4>
      <p>Behalten Sie den Überblick:</p>
      <ul className="list-disc ml-4 space-y-1">
      <li>Summen pro Jahr und Abrechnungsträger</li>
      <li>Ausstehende und erhaltene Beträge</li>
      <li>Filterung nach Jahren</li>
      <li>Export für Steuererklärung möglich</li>
      </ul>
      </div>
      
      <div className="bg-primary-50 dark:bg-primary-900 p-4 rounded-lg mt-4">
      <h4 className="font-medium mb-2">Wichtig für die Abrechnung:</h4>
      <ul className="list-disc ml-4 space-y-1">
      <li>Rechtzeitige Einreichung beachten</li>
      <li>Vollständigkeit der Angaben prüfen</li>
      <li>Status aktuell halten</li>
      <li>Belege gemäß Vorgaben aufbewahren</li>
      </ul>
      </div>
      </div>
      </AccordionItem>
      <AccordionItem
      title={
        <div className="flex items-center gap-2">
        <Smartphone size={16} className="text-primary-500" />
        <span>Automatisierung mit iOS-Kurzbefehlen</span>
        </div>
      }
      isOpen={openItem === 5}
      toggleOpen={() => toggleItem(5)}
      >
      <p>Nutzen Sie iOS-Kurzbefehle, um das Erfassen von Fahrten noch einfacher zu gestalten:</p>
      <div className="space-y-4 mt-4">
      <div>
      <a 
      href="https://www.icloud.com/shortcuts/a41b3e30b8da4dff8c2f28e7c1a84361" 
      className="btn-primary w-full md:w-auto flex items-center justify-center md:justify-start gap-2 text-sm"
      target="_blank"
      rel="noopener noreferrer"
      >
      <Download size={16} />
      <span className="hidden md:inline">Kurzbefehl: "Neue Fahrt eintragen" installieren</span>
      <span className="md:hidden">Kurzbefehl installieren</span>
      </a>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">So richten Sie den Kurzbefehl ein:</h4>
      <ol className="list-decimal ml-4 space-y-2">
      <li>Klicken Sie auf den Button "Kurzbefehl installieren"</li>
      <li>Öffnen Sie in den Einstellungen den Bereich "API-Zugriff"</li>
      <li>Generieren Sie einen neuen API-Schlüssel für iOS-Kurzbefehle</li>
      <li>Kopieren Sie den generierten Schlüssel</li>
      <li>Beim ersten Start des Kurzbefehls werden Sie nach dem API-Schlüssel gefragt</li>
      <li>Der Schlüssel wird sicher in Ihrer iCloud gespeichert</li>
      </ol>
      </div>
      
      <div className="space-y-2">
      <h4 className="font-medium">Funktionen des Kurzbefehls:</h4>
      <ul className="list-disc ml-4 space-y-2">
      <li>Schnelle Erfassung von Fahrten direkt vom Homescreen</li>
      <li>Den aktuellen Standort mittels GPS als Adresse angeben</li>
      <li>Siri Unterstützung: "Hey Siri, neue Fahrt eintragen."</li>
      </ul>
      </div>
      
      <div className="bg-primary-50 dark:bg-primary-900 p-4 rounded-lg mt-4">
      <h4 className="font-medium mb-2">Tipp:</h4>
      <p className="text-sm">
      Fügen Sie den Kurzbefehl zu Ihrem Home-Bildschirm hinzu, um mit einem Tipp 
      eine neue Fahrt zu erfassen. Sie können auch "Hey Siri, neue Fahrt eintragen." 
      verwenden.
      </p>
      </div>
      </div>
      </AccordionItem>
                       
                        </div>
                    </div>
                </section>

                {/* Contact */}
                <section className="text-center max-w-3xl mx-auto">
                    <h2 className="text-xl font-bold text-value mb-4">Weitere Hilfe benötigt?</h2>
                    <p className="text-label mb-6">
                        Wenn Sie weitere Fragen haben oder Unterstützung benötigen, wenden Sie sich bitte an Ihren Administrator oder kontaktieren Sie uns über das Kontaktformular.
                    </p>
      <a
      href="mailto:support@kkd-fahrtenbuch.de"
      className="btn-primary w-full sm:w-auto inline-flex justify-center items-center"
      >
      Kontakt aufnehmen
      </a>

                </section>
            </main>

            {/* Footer */}
            <footer className="bg-primary-50 dark:bg-primary-900 py-6">
                <div className="container mx-auto px-4 text-center text-sm text-label">
                    <p>© {new Date().getFullYear()} Simon Luthe. Alle Rechte vorbehalten.</p>
                </div>
            </footer>
        </div>
    );
}