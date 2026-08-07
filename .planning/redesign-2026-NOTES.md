# Redesign 2026 — Entscheidungen & markierte Unklarheiten

Fortlaufendes Protokoll der Umsetzung des Design-Handoffs (`design/handoff-2026/`).
Jede Phase trägt hier Annahmen, Abweichungen und offene Fragen ein.

## Entscheidungen (vom Orchestrator)

- **Service Worker / Offline verschoben:** Das Handoff empfiehlt Font-Self-Hosting für die PWA-Offline-Fähigkeit. Manifest, Icons und Fonts kommen jetzt; der Service Worker selbst folgt in der Vite-Migration (unter CRA wäre es Wegwerfarbeit). → PWA ist installierbar, aber noch nicht offline-fähig.
- **Tag-Chaos ignoriert:** Historische Tags (v1.6.0 = Milestone v1.2 etc.) werden im CHANGELOG so dokumentiert wie sie sind; Bereinigung ist Teil der späteren Git-Konsolidierung, nicht des Redesigns.
- **Phasen-Schnitt pro View statt pro Gerät:** Jeder Screen wird mobil + desktop in einer Phase komplett umgesetzt (Wunsch des Users: „alles durchballern", Reihenfolge egal).

## Offene Punkte / markierte Unklarheiten

### Phase R1 (Fundament)

- **Migration alter Theme-Werte:** Spec sagt „alte Theme-Werte auf 'system' migrieren". Entschieden: eine explizit gespeicherte Hell/Dunkel-Wahl (`localStorage.darkMode` true/false) wird als 'dark'/'light' übernommen, nur die Farbthemes (`localStorage.theme`) fallen ersatzlos auf 'system' zurück — respektiert die bewusste Nutzerentscheidung, ohne die alten Farbthemes zu erhalten.
- **`.btn-destruktiv` vs. `.btn-destructive`:** Bestand heißt `.btn-destructive` (referenziert in UserManagement.js). Klassenname beibehalten, nur Styling auf die Spec-Variante „destruktiv" (transparent, `--danger`-Text/-Rand) umgestellt. Kein zusätzlicher Alias angelegt.
- **Übergangs-Aliasse primary/secondary:** Die alten Skalen sind hell-dunkel-Stufen, die neuen Tokens flippen selbst im Dark Mode → `dark:*-primary-900`-Klassen würden doppelt flippen. Gelöst über Alias-Variablen in tokens.css mit eigenen `.dark`-Overrides (z. B. `--primary-900` hell = `--text`, dunkel = `--surface-2`). Nicht pixelgenau, aber stimmig; fliegt mit den Screen-Phasen raus.
- **`--font-field` als Zusatz-Token:** In der Handoff-tokens.css enthalten, im README nur als Regel (16 px). Übernommen wie geliefert.
- **Label-Abstand 7 px:** README nennt explizit 7 px unter Labels — Widerspruch zur 4/8/12-Skala. High-fidelity-Wert (7 px) übernommen.
- **KPI-Card-Farbvarianten (emerald/blue/purple):** nicht Teil der Spec; transitional auf `--ok-soft`/`--brand-soft`/`--accent-soft` gemappt, endgültige Zuordnung machen die Screen-Phasen (Achtung Akzent-Regel: Sand nur für „Eingereicht"/Fälligkeit).
- **ThemeToggle-Platzierung:** Der Dreifach-Umschalter ersetzt den alten Sonne/Mond+Palette-Toggle in AppContent unverändert an Ort und Stelle; Feinstyling und Verlagerung in „Einstellungen → Darstellung" macht die Einstellungen-Phase.
- **`viewport-fit=cover`** in index.html ergänzt (Voraussetzung für `env(safe-area-inset-bottom)` der späteren Bottom-Nav).
- **`noscript`-Text** eingedeutscht (war CRA-Englisch) — Konsequenz aus lang="de".

### Phase R2 (App-Shell + Kernkomponenten)

- **Toast mit Aktion bleibt bis zum Klick (Spec), zusätzlich per Tipp auf die Meldung schließbar** — sonst gäbe es keinen Weg, einen nie geklickten „Rückgängig"-Toast loszuwerden. Toasts ohne Aktion: 5 s Standzeit.
- **Toast-Viewport-Abstand mobil: `bottom: 90px + safe-area`** — approximiert „16 px über der Bottom-Nav" (Nav ≈ 74 px hoch). Exakte Kopplung an die Nav-Höhe folgt, falls die Screen-Phasen die Nav-Maße ändern.
- **Sidebar ab 768 px statt erst ab 1024 px** (Zwischenbereich 768–1023): Spec erlaubt „232 px oder Icon-Leiste" — entschieden für volle 232 px, da der Inhalt dort ohnehin einspaltig läuft und keine zweite Nav-Variante gepflegt werden muss. Bottom-Nav nur < 768 px.
- **Sekundäraktionen des alten Headers** (ThemeToggle, Neuigkeiten-Bell, Info, Hilfe, Abmelden) leben jetzt in einer Aktionszeile oben im „Mehr"-Bereich (vor Settings). Endgültige Platzierung entscheidet die Einstellungen-Screen-Phase.
- **Verwaltung (Admin)**: fünfter Sidebar-Eintrag auf Desktop; mobil erreichbar über Button im „Mehr"-Bereich (Bottom-Nav bleibt bei vier Zielen à 25 %). Bei aktivem „verwaltung"-Tab ist mobil „Mehr" als aktiv markiert.
- **Fällig-Logik** (Nav-Punkt/Badge): Monate vor dem aktuellen Monat, in denen mindestens ein Träger mit Erstattung > 0 weder `eingereicht_am` noch `erhalten_am` hat — abgeleitet aus `monthlyData` (inkl. Mitfahrer-Pseudo-Träger).
- **Favoriten-Tipp im Dashboard führt sofort aus (nur Hinfahrt)** — Spec Screen 1: „Ein Tipp legt die Fahrt sofort an". Die alte Auswahl „Mit Rückfahrt" entfällt an dieser Stelle; der Rückfahrt-Standard („an, wenn Ziel überwiegend mit Rückfahrt") kommt mit dem neuen Erfassungsflow (Screen-Phase 2). Undo löscht die angelegte Fahrt (`executeFavorit` liefert die Fahrt-ID).
- **Undo bei Fahrt-Löschung = Wiederanlegen mit denselben Daten** (Datum, Orte, Anlass, km, Träger, Mitfahrer). Die Fahrt bekommt eine neue ID und startet wieder als „Erfasst" — Abrechnungsstatus einer bereits eingereichten Einzelfahrt wird nicht rekonstruiert (Status hängt am Monat/Träger, nicht an der Fahrt).
- **Ohne Undo (dokumentiert statt erzwungen):** Abrechnungsträger (Erstattungssätze/Historie hängen dran), API-Keys (Klartext nicht rekonstruierbar), Erstattungssätze (trivial neu anlegbar), Status-Reset (Wiederherstellen bräuchte das alte Datum je Aktion — Screen-Phase 4 kann das über die Monatskarte lösen).
- **Benutzer-Löschen (Verwaltung): Inline-Zweischritt** (erster Klick „Wirklich löschen?", 4 s Timeout) statt Modal — Konto-Löschung ist nicht undo-bar, ein Ein-Klick-Löschen wäre fahrlässig, ein Modal verletzt die Spec-Regel.
- **Export-Formatwahl** (Excel/PDF/Beide) war ein Drei-Optionen-Modal → jetzt direkte Buttons je Träger. „Als eingereicht markieren" nach Export hängt als Aktions-Button am Erfolgs-Toast (bleibt bis zum Klick).
- **`showNotification` bleibt als Brücke** in AppContext (Titel „Fehler" → `toast.error`, sonst `toast.success`), damit ~50 Bestands-Callsites ohne Umbau weiterlaufen. Screen-Phasen ersetzen sie sukzessive durch direkte `useToast`-Nutzung. `hasActiveNotification` wird konstant `false` geliefert (Modal.js-Konsument).
- **MonthlyOverview-Statuszellen** nutzen bereits StatusBadge (Badge-Variante + Datum als Kleinzeile darunter); „Keine Abrechnung" wurde zur Matrix-Zelle „—" (Spec Screen 6). Der Rest der View bleibt für Screen-Phase 4.
- **Sheet wird in R2 noch nirgends gerendert** (Erfassungsflow kommt in Screen-Phase 2); Syntax per Babel-Transform verifiziert. EmptyState hat eine erste echte Nutzung (Dashboard, Favoriten leer).
- **Sidebar-Logo**: Inline-SVG-Ring in `--brand` (Geometrie aus icon-monochrome.svg), ohne Akzent-Punkt — bei 26 px trägt der Ring allein.
