import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImpressumInhalt, DatenschutzInhalt } from './InfoModal';

// Impressum und Datenschutz öffentlich und offline, weil Apple sie ohne Konto erreichbar verlangt; Inhalte aus InfoModal.js.
function RechtlichesSeite() {
  return (
    <div className="help-root">
      <header className="help-header">
        <div className="help-wrap help-header-inner">
          <span className="help-header-titel">Rechtliches</span>
          <Link to="/" className="btn-secondary help-zurueck">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Zurück</span>
          </Link>
        </div>
      </header>

      <main className="help-wrap help-main">
        <section className="help-abschnitt" id="impressum" aria-labelledby="impressum-titel">
          <h2 id="impressum-titel" className="help-abschnitt-titel">Impressum</h2>
          <ImpressumInhalt />
        </section>

        <section className="help-abschnitt" id="datenschutz" aria-labelledby="datenschutz-titel">
          <h2 id="datenschutz-titel" className="help-abschnitt-titel">Datenschutzerklärung</h2>
          <DatenschutzInhalt />
        </section>
      </main>

      <footer className="help-footer">
        <div className="help-wrap">
          © {new Date().getFullYear()} Simon Luthe · Alle Rechte vorbehalten
        </div>
      </footer>
    </div>
  );
}

export default RechtlichesSeite;
