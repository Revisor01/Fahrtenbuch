import React from 'react';

// Faengt Fehler beim Rendern ab und zeigt sie an, statt einen leeren oder
// eingefrorenen Bildschirm zu hinterlassen.
//
// In der App ist das mehr als Komfort: Ohne Entwicklerkonsole ist ein Fehler
// dort sonst unsichtbar — die App steht einfach, und niemand kann sagen,
// woran es lag.
class Fehlergrenze extends React.Component {
  constructor(props) {
    super(props);
    this.state = { fehler: null };
  }

  static getDerivedStateFromError(fehler) {
    return { fehler };
  }

  componentDidCatch(fehler, info) {
    console.error('Fehler beim Rendern:', fehler, info?.componentStack);
  }

  render() {
    if (!this.state.fehler) return this.props.children;

    return (
      <div className="startbildschirm">
        <div className="startbildschirm-inhalt">
          <span className="startbildschirm-name">Etwas ist schiefgelaufen</span>
          <span className="startbildschirm-text">
            Ein erneuter Versuch hilft meistens.
          </span>
          {/* „Schliessen und neu oeffnen" half im Browser nicht weiter, und in
              der installierten App ist es umstaendlich. Ein Knopf, der neu
              laedt, deckt beide Faelle ab. */}
          <button
            type="button"
            className="startbildschirm-knopf"
            onClick={() => window.location.reload()}
          >
            Neu laden
          </button>
          {/* Die Fehlermeldung nur bei der Entwicklung: Auf dem Geraet einer
              Nutzer:in sagt sie nichts, und Apple-Pruefer:innen sehen sonst
              ein Stacktrace-Fragment auf der oeffentlichen Rechtsseite. */}
          {import.meta.env?.DEV && (
            <pre className="startbildschirm-fehler">
              {String(this.state.fehler?.message || this.state.fehler)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}

export default Fehlergrenze;
