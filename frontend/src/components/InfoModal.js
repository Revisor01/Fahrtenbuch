import React, { useState, useEffect } from 'react';
import { Info, Github, Copyright } from 'lucide-react';
import Modal from '../Modal';

const ImpressumModal = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Impressum"
    size="wide"
  >
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-value">Angaben gemäß § 5 TMG</h2>
        <p className="text-label">
          Simon Luthe<br />
          Süderstraße 18<br />
          25779 Hennstedt
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-value">Kontakt</h2>
        <p className="text-label">
          E-Mail: <a href="mailto:support@kkd-fahrtenbuch.de" className="text-primary-500 hover:text-primary-600">support@kkd-fahrtenbuch.de</a>
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-value">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
        <p className="text-label">
          Simon Luthe<br />
          Süderstraße 18<br />
          25779 Hennstedt
        </p>
      </div>
    </div>
  </Modal>
);

const DatenschutzModal = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Datenschutzerklärung nach DSG-EKD"
    size="wide"
  >
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">1. Grundsätzliche Angaben zur Datenverarbeitung</h3>
        <p className="text-label">Die Verarbeitung personenbezogener Daten erfolgt im Einklang mit dem Datenschutzgesetz der Evangelischen Kirche in Deutschland (DSG-EKD).</p>

        <div className="space-y-2">
          <h4 className="text-lg font-medium text-value">Verantwortliche Stelle</h4>
          <p className="text-label">
            Simon Luthe<br />
            Süderstraße 18<br />
            25779 Hennstedt<br />
            E-Mail: support@kkd-fahrtenbuch.de
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">2. Zweck der Datenverarbeitung</h3>
        <p className="text-label">Die Verarbeitung personenbezogener Daten erfolgt zum Zweck der Verwaltung und Abrechnung von Dienstfahrten im kirchlichen Kontext.</p>

        <div className="space-y-2">
          <h4 className="text-lg font-medium text-value">2.1 Erhobene Daten</h4>
          <ul className="list-disc pl-5 text-label space-y-1">
            <li>Name und Kontaktdaten</li>
            <li>Dienstliche E-Mail-Adresse</li>
            <li>Kirchengemeinde/Dienstort</li>
            <li>Wohnort</li>
            <li>IBAN (für Abrechnungszwecke)</li>
            <li>Fahrtdaten (Start, Ziel, Kilometerstand, Zweck)</li>
          </ul>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">3. Cookies und Analysedienste</h3>
        <p className="text-label">
          Die Anwendung verwendet notwendige Session-Cookies für die Aufrechterhaltung der Funktionalität. 
          Zusätzlich nutzen wir Plausible Analytics für die Erfassung der dienstlichen Nutzung. 
          Dies ist ein datenschutzfreundliches Analysetool, das ohne Cookies arbeitet und keine personenbezogenen Daten speichert. 
          Eine Opt-out-Möglichkeit wird nicht angeboten, da die Nutzungsstatistiken für dienstliche Zwecke erforderlich sind.
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">4. Technische Sicherheitsmaßnahmen</h3>
        <ul className="list-disc pl-5 text-label space-y-1">
          <li>Verschlüsselte Datenübertragung (SSL/TLS)</li>
          <li>Verschlüsselte Datenspeicherung</li>
          <li>Regelmäßige Sicherheitsupdates</li>
          <li>Zugriffsbeschränkungen und Authentifizierung</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">5. Externe Dienstleister</h3>
        <p className="text-label">Folgende Dienstleister werden eingesetzt:</p>
        <ul className="list-disc pl-5 text-label space-y-1">
          <li>Hosting: ip-projects.de</li>
          <li>E-Mail-Versand: Interner Mailserver</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">6. Betroffenenrechte nach DSG-EKD</h3>
        <p className="text-label">Sie haben das Recht auf:</p>
        <ul className="list-disc pl-5 text-label space-y-1">
          <li>Auskunft über gespeicherte Daten (§ 19 DSG-EKD)</li>
          <li>Berichtigung unrichtiger Daten (§ 20 DSG-EKD)</li>
          <li>Löschung (§ 21 DSG-EKD)</li>
          <li>Einschränkung der Verarbeitung (§ 22 DSG-EKD)</li>
          <li>Datenübertragbarkeit (§ 24 DSG-EKD)</li>
          <li>Widerspruch (§ 25 DSG-EKD)</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-value">7. Aufsichtsbehörde</h3>
        <p className="text-label">
          Der Beauftragte für den Datenschutz der EKD<br />
          Böttcherstraße 7<br />
          30419 Hannover<br />
          Telefon: +49 (0) 511 768128-0<br />
          E-Mail: info@datenschutz.ekd.de
        </p>
      </div>
    </div>
  </Modal>
);

const InfoModal = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState(null);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/Revisor01/Fahrtenbuch/releases/latest');
        const data = await response.json();
        setVersion(data.tag_name);
      } catch (error) {
        console.error('Error fetching version:', error);
        setVersion('v1.0.0');
      }
    };
    
    if (isOpen) {
      fetchVersion();
    }
  }, [isOpen]);

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose}
        title={
          <div className="flex items-center gap-2">
            <Info size={20} />
            <span>Information</span>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="card-container">
            <div className="flex items-center gap-2 mb-2">
              <Copyright size={16} className="text-primary-500" />
              <h3 className="text-value font-medium">Version & Copyright</h3>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-label">
                Version: {version || 'Lädt...'}
              </p>
              <p className="text-sm text-label">
                © 2025 Simon Luthe. Alle Rechte vorbehalten.
              </p>
            </div>
          </div>

          <div className="card-container">
            <div className="flex items-center gap-2 mb-2">
              <Github size={16} className="text-primary-500" />
              <h3 className="text-value font-medium">Rechtliches</h3>
            </div>
            <div className="space-y-2">
              <button 
                onClick={() => setShowImpressum(true)}
                className="text-sm text-primary-500 hover:text-primary-600 block w-full text-left"
              >
                Impressum
              </button>
              <button
                onClick={() => setShowDatenschutz(true)}
                className="text-sm text-primary-500 hover:text-primary-600 block w-full text-left"
              >
                Datenschutzerklärung
              </button>
            </div>
          </div>

          <div className="card-container">
            <h3 className="text-value font-medium mb-2">Kontakt</h3>
            <p className="text-sm text-label">
              Bei Fragen oder Problemen wenden Sie sich bitte an:
            </p>
            <a 
              href="mailto:support@kkd-fahrtenbuch.de"
              className="text-sm text-primary-500 hover:text-primary-600"
            >
              support@kkd-fahrtenbuch.de
            </a>
          </div>
        </div>
      </Modal>

      <ImpressumModal 
        isOpen={showImpressum} 
        onClose={() => setShowImpressum(false)} 
      />
      
      <DatenschutzModal 
        isOpen={showDatenschutz} 
        onClose={() => setShowDatenschutz(false)} 
      />
    </>
  );
};

export default InfoModal;