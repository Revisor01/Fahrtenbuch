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
            Bitte die App einmal schließen und neu öffnen.
          </span>
          <pre className="startbildschirm-fehler">
            {String(this.state.fehler?.message || this.state.fehler)}
          </pre>
        </div>
      </div>
    );
  }
}

export default Fehlergrenze;
