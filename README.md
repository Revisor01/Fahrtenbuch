# Fahrtenbuch für kirchliche Mitarbeiter

Dieses Projekt ist ein umfassendes Fahrtenbuch- und Reisekostenabrechnungssystem, das speziell für Mitarbeiter in kirchlichen Einrichtungen entwickelt wurde. Es ermöglicht Benutzern, ihre dienstlichen Fahrten effizient zu erfassen, zu verwalten und abzurechnen. Mit dem neuen Design, mobiler Optimierung und verbesserter Nutzerfreundlichkeit ist es ein modernes und umfassendes Tool.

## Funktionen

### Benutzerauthentifizierung
- Sicheres Login-System für Benutzer mit E-Mail oder Benutzername
- JWT-basierte Authentifizierung für sichere API-Anfragen
- Möglichkeit zum Zurücksetzen des Passworts per E-Mail
- Option zum Erstellen eines Passworts nach der Verifizierung der E-Mail.

### Ortsverwaltung
- Hinzufügen, Bearbeiten und Löschen von Orten (mit zusätzlichen Kennzeichnungen für Wohnort, Dienstort und Kirchspiele)
- Automatische Distanzberechnung zwischen gespeicherten Orten
- Benutzerfreundliche Modal-Fenster für die Ortsverwaltung

### Fahrtenmanagement
- Intuitive Erfassung von Fahrten mit Details wie Datum, Anlass, Start- und Zielort
- Unterstützung für einmalige Orte, die nicht in der gespeicherten Liste sind (mit manueller Kilometerangabe)
- Automatische Distanzberechnung für Fahrten zwischen gespeicherten Orten
- Möglichkeit zur manuellen Eingabe von Kilometern (mit Warnung bei manueller Angabe im Vergleich zur automatischen Berechnung)
- "Autosplit"-Funktion für die automatische Aufteilung der Fahrtkosten zwischen Kirchenkreis und Gemeinde (mit Anzeige der jeweiligen Anteile)
- Möglichkeit zum Hinzufügen von Mitfahrern zu einer Fahrt und damit zusammenhängende Abrechnungsänderungen
- Separate Bearbeitung und Löschung von Fahrten

### Abrechnungsfunktionen
- Flexible Abrechnungsmöglichkeiten: Kirchenkreis, Gemeinde, Autosplit (automatische Aufteilung)
- Monatliche und jährliche Übersichten der Fahrten und Kosten
- Möglichkeit, Monate als "eingereicht" und "erhalten" zu markieren
- Export von Abrechnungen im Excelformat des Kirchenkreis Dithmarschen

### Nutzerverwaltung (Admin)
- Benutzerverwaltung durch Administratoren (mit der Möglichkeit, neue Nutzer anzulegen, Rollen zuzuweisen und bestehende Nutzer zu bearbeiten)
- Option, Nutzern die Rolle "Admin" oder "Benutzer" zuzuweisen

### Benutzeroberfläche (UI)
- **Komplett neues Design:** Moderne, übersichtliche und intuitive Benutzeroberfläche
- **Mobile-Optimierung:** Vollständig responsive Darstellung für Desktop- und mobile Nutzung
- **Modal-Fenster:** Nutzung von Modal-Fenstern für die Verwaltung von Orten, Distanzen, Fahrten, Profilen und Benutzern.
- **Theme-Support:** Möglichkeit zum Wechseln zwischen einem hellen und einem dunklen Theme (Darkmode)
- **Monatsansicht:** Übersichtliche Monatsansicht mit Filterfunktionen
- **Benachrichtigungen:** Anzeige von Erfolgs- und Fehlermeldungen per Modal
- **Verbesserte Tabellen:** Verbesserte Tabellen für eine bessere Übersicht der Daten mit Sortierfunktionen.

## Technische Details

### Backend
- Node.js mit Express.js als Web-Framework
- MySQL-Datenbank zur Datenspeicherung
- RESTful API für alle Funktionen
- Integration von Redis für besseres State-Management im Backend.
- JWT-basierte Authentifizierung für sichere API-Kommunikation

### Frontend
- React-basierte Single-Page-Application
- Responsive Design für Desktop- und mobile Nutzung
- Kontextbasiertes State-Management mit `AppContext`
- Custom Hooks zur besseren Strukturierung und Wiederverwendung der Logik
- Tailwind CSS für schnelles und flexibles Styling
- Verwendung von Modal-Fenstern für bessere Benutzerinteraktion

### Sicherheit
- Passwort-Hashing mit bcrypt
- JWT (JSON Web Tokens) für sichere API-Kommunikation
- Regelmäßige Sicherheitsüberprüfungen

## Installation und Nutzung

*   **Docker:** Das System wird mit Docker und Docker Compose bereitgestellt. Dies erleichtert die Installation und das Deployment.
*   **Anweisungen:** Genaue Anweisungen zur Installation und Einrichtung des Systems werden in einer separaten Dokumentation bereitgestellt.

## Datenschutz und Sicherheit

Das System wurde mit dem Fokus auf den Schutz persönlicher Daten entwickelt. Alle sensiblen Informationen werden verschlüsselt gespeichert und übertragen. Die Einhaltung der Datenschutzgrundverordnung (DSGVO) hat oberste Priorität.

---

Dieses Fahrtenbuch-System bietet eine effiziente, benutzerfreundliche und sichere Lösung für die Verwaltung und Abrechnung von Dienstfahrten in kirchlichen Einrichtungen. Es vereinfacht den administrativen Prozess und sorgt für eine transparente und genaue Erfassung aller relevanten Fahrtdaten. Mit der modernen Benutzeroberfläche, mobiler Optimierung und den erweiterten Funktionen ist es eine zeitgemäße und zukunftssichere Lösung.
