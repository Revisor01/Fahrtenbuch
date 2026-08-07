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
