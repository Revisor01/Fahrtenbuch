# Fahrtenbuch für kirchliche Mitarbeiter

Dieses Projekt ist ein umfassendes Fahrtenbuch- und Reisekostenabrechnungssystem, das speziell für Mitarbeiter in kirchlichen Einrichtungen entwickelt wurde. Es ermöglicht Benutzern, ihre dienstlichen Fahrten effizient zu erfassen, zu verwalten und abzurechnen.

## Funktionen

### Benutzerauthentifizierung
- Sicheres Login-System für Benutzer
- JWT-basierte Authentifizierung für API-Anfragen

### Ortsverwaltung
- Hinzufügen, Bearbeiten und Löschen von Orten (einschließlich spezieller Kennzeichnungen für Wohnort, Dienstort und Kirchspiele)
- Automatische Distanzberechnung zwischen gespeicherten Orten

### Fahrtenmanagement
- Erfassung von Fahrten mit Details wie Datum, Anlass, Start- und Zielort
- Unterstützung für einmalige Orte, die nicht in der gespeicherten Liste sind
- Automatische Distanzberechnung für Fahrten zwischen gespeicherten Orten
- Möglichkeit zur manuellen Eingabe von Kilometern
- "Autosplit"-Funktion für automatische Aufteilung der Fahrtkosten zwischen Kirchenkreis und Gemeinde

### Abrechnungsfunktionen
- Flexible Abrechnungsmöglichkeiten: Kirchenkreis, Gemeinde oder automatische Aufteilung
- Monatliche und jährliche Übersichten der Fahrten und Kosten
- Export von Abrechnungen im CSV-Format

### Benutzeroberfläche
- Übersichtliche Darstellung aller Fahrten
- Einfache Eingabeformulare für neue Fahrten und Orte
- Bearbeitungs- und Löschfunktionen für bestehende Einträge
- Monatsweise Ansicht und Filterung der Fahrten

## Technische Details

### Backend
- Node.js mit Express.js als Web-Framework
- MySQL-Datenbank zur Datenspeicherung
- RESTful API für alle Funktionen

### Frontend
- React-basierte Single-Page-Application
- Responsive Design für Desktop- und mobile Nutzung
- Kontextbasiertes State-Management

### Sicherheit
- Passwort-Hashing mit bcrypt
- JWT (JSON Web Tokens) für sichere API-Kommunikation

## Installation und Nutzung

[Hier könnten Anweisungen zur Installation und Einrichtung des Systems folgen]

## Datenschutz und Sicherheit

Das System wurde mit Blick auf den Schutz persönlicher Daten entwickelt. Alle sensiblen Informationen werden verschlüsselt gespeichert und übertragen.

---

Dieses Fahrtenbuch-System bietet eine effiziente und benutzerfreundliche Lösung für die Verwaltung und Abrechnung von Dienstfahrten in kirchlichen Einrichtungen. Es vereinfacht den administrativen Prozess und sorgt für eine transparente und genaue Erfassung aller relevanten Fahrtdaten.