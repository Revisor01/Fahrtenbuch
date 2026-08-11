import React, { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import Sheet from './ui/Sheet';

// Info-Sheet nach Design-Spec (Redesign 2026): ein Sheet (mobil Bottom-Sheet,
// desktop zentriertes Panel) mit internen Unteransichten für Impressum und
// Datenschutz — statt gestapelter Modals. Abschnitts-Labels 12px/700
// uppercase (--text-3), Fließtext 14px (--text-2), Links in --brand.

const TITEL = {
  info: 'Information',
  impressum: 'Impressum',
  datenschutz: 'Datenschutzerklärung',
};

const ImpressumInhalt = () => (
  <>
    <div className="sheet-abschnitt">
      <div className="form-label">Angaben gemäß § 5 TMG</div>
      <p className="sheet-text">
        Simon Luthe<br />
        Süderstraße 18<br />
        25779 Hennstedt
      </p>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">Kontakt</div>
      <p className="sheet-text">
        E-Mail: <a href="mailto:support@kkd-fahrtenbuch.de" className="sheet-link">support@kkd-fahrtenbuch.de</a>
      </p>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</div>
      <p className="sheet-text">
        Simon Luthe<br />
        Süderstraße 18<br />
        25779 Hennstedt
      </p>
    </div>
  </>
);

const DatenschutzInhalt = () => (
  <>
    <div className="sheet-abschnitt">
      <div className="form-label">1. Grundsätzliche Angaben zur Datenverarbeitung</div>
      <p className="sheet-text">Die Verarbeitung personenbezogener Daten erfolgt im Einklang mit dem Datenschutzgesetz der Evangelischen Kirche in Deutschland (DSG-EKD).</p>
      <div className="sheet-untertitel">Verantwortliche Stelle</div>
      <p className="sheet-text">
        Simon Luthe<br />
        Süderstraße 18<br />
        25779 Hennstedt<br />
        E-Mail: support@kkd-fahrtenbuch.de
      </p>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">2. Zweck der Datenverarbeitung</div>
      <p className="sheet-text">Die Verarbeitung personenbezogener Daten erfolgt zum Zweck der Verwaltung und Abrechnung von Dienstfahrten im kirchlichen Kontext.</p>
      <div className="sheet-untertitel">2.1 Erhobene Daten</div>
      <ul className="sheet-liste">
        <li>Name und Kontaktdaten</li>
        <li>Dienstliche E-Mail-Adresse</li>
        <li>Kirchengemeinde/Dienstort</li>
        <li>Wohnort</li>
        <li>IBAN (für Abrechnungszwecke)</li>
        <li>Fahrtdaten (Start, Ziel, Kilometerstand, Zweck)</li>
      </ul>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">3. Cookies und Analysedienste</div>
      <p className="sheet-text">
        Die Anwendung verwendet notwendige Session-Cookies für die Aufrechterhaltung der Funktionalität.
        Zusätzlich nutzen wir Plausible Analytics für die Erfassung der dienstlichen Nutzung.
        Dies ist ein datenschutzfreundliches Analysetool, das ohne Cookies arbeitet und keine personenbezogenen Daten speichert.
        Eine Opt-out-Möglichkeit wird nicht angeboten, da die Nutzungsstatistiken für dienstliche Zwecke erforderlich sind.
      </p>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">4. Technische Sicherheitsmaßnahmen</div>
      <ul className="sheet-liste">
        <li>Verschlüsselte Datenübertragung (SSL/TLS)</li>
        <li>Verschlüsselte Datenspeicherung</li>
        <li>Regelmäßige Sicherheitsupdates</li>
        <li>Zugriffsbeschränkungen und Authentifizierung</li>
      </ul>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">5. Externe Dienstleister</div>
      <p className="sheet-text">Folgende Dienstleister werden eingesetzt:</p>
      <ul className="sheet-liste">
        <li>Hosting: ip-projects.de</li>
        <li>E-Mail-Versand: Interner Mailserver</li>
      </ul>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">6. Betroffenenrechte nach DSG-EKD</div>
      <p className="sheet-text">Sie haben das Recht auf:</p>
      <ul className="sheet-liste">
        <li>Auskunft über gespeicherte Daten (§ 19 DSG-EKD)</li>
        <li>Berichtigung unrichtiger Daten (§ 20 DSG-EKD)</li>
        <li>Löschung (§ 21 DSG-EKD)</li>
        <li>Einschränkung der Verarbeitung (§ 22 DSG-EKD)</li>
        <li>Datenübertragbarkeit (§ 24 DSG-EKD)</li>
        <li>Widerspruch (§ 25 DSG-EKD)</li>
      </ul>
    </div>

    <div className="sheet-abschnitt">
      <div className="form-label">7. Aufsichtsbehörde</div>
      <p className="sheet-text">
        Der Beauftragte für den Datenschutz der EKD<br />
        Böttcherstraße 7<br />
        30419 Hannover<br />
        Telefon: +49 (0) 511 768128-0<br />
        E-Mail: info@datenschutz.ekd.de
      </p>
    </div>
  </>
);

// Version aus dem eigenen Build (package.json, via __APP_VERSION__ zur
// Build-Zeit eingebacken). Der frühere Live-Abruf des letzten GitHub-Releases
// zeigte den Stand des letzten *Releases* — und war offline/bei Ratelimit
// schlicht falsch („v1.0.0"-Fallback).
const APP_VERSION = __APP_VERSION__ || null;

const InfoModal = ({ isOpen, onClose }) => {
  // 'info' | 'impressum' | 'datenschutz'
  const [view, setView] = useState('info');

  useEffect(() => {
    if (isOpen) setView('info');
  }, [isOpen]);

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title={TITEL[view]} wide>
      {view !== 'info' && (
        <button type="button" className="sheet-back" onClick={() => setView('info')}>
          <ChevronLeft size={16} aria-hidden="true" />
          Zurück
        </button>
      )}

      {view === 'info' && (
        <>
          <div className="sheet-abschnitt">
            <div className="form-label">Version &amp; Copyright</div>
            <p className="sheet-text">Version: {APP_VERSION ? `v${APP_VERSION}` : 'unbekannt'}</p>
            <p className="sheet-text">© 2026 Simon Luthe. Alle Rechte vorbehalten.</p>
          </div>

          <div className="sheet-abschnitt">
            <div className="form-label">Rechtliches</div>
            <div>
              <button type="button" className="sheet-link" onClick={() => setView('impressum')}>
                Impressum
              </button>
            </div>
            <div>
              <button type="button" className="sheet-link" onClick={() => setView('datenschutz')}>
                Datenschutzerklärung
              </button>
            </div>
          </div>

          <div className="sheet-abschnitt">
            <div className="form-label">Kontakt</div>
            <p className="sheet-text">Bei Fragen oder Problemen wenden Sie sich bitte an:</p>
            <a href="mailto:support@kkd-fahrtenbuch.de" className="sheet-link">
              support@kkd-fahrtenbuch.de
            </a>
          </div>
        </>
      )}

      {view === 'impressum' && <ImpressumInhalt />}
      {view === 'datenschutz' && <DatenschutzInhalt />}

      <div className="sheet-fuss">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Schließen
        </button>
      </div>
    </Sheet>
  );
};

export default InfoModal;
