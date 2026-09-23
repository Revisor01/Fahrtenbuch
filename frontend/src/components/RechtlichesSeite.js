import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ImpressumInhalt, DatenschutzInhalt } from './InfoModal';

// Impressum und Datenschutzerklaerung als oeffentliche Seite.
//
// Beides stand bisher nur im InfoModal, und das haengt im angemeldeten Teil
// der App: Wer kein Konto hat, kam nie hin. Apple verlangt unter 5.1.1 (i)
// aber, dass die Datenschutzerklaerung "easily accessible within the app"
// ist — eine Pruefer:in ohne Konto haette sie nicht gefunden und die
// Einreichung abgelehnt.
//
// Die Inhalte kommen als Komponenten aus InfoModal.js, damit der Text an
// genau einer Stelle gepflegt wird. Sie liegen im Bundle, die Seite
// funktioniert also auch ohne Netz.
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
