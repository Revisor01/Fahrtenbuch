# Redesign 2026 — Entscheidungen & markierte Unklarheiten

Fortlaufendes Protokoll der Umsetzung des Design-Handoffs (`design/handoff-2026/`).
Jede Phase trägt hier Annahmen, Abweichungen und offene Fragen ein.

## Entscheidungen (vom Orchestrator)

- **Service Worker / Offline verschoben:** Das Handoff empfiehlt Font-Self-Hosting für die PWA-Offline-Fähigkeit. Manifest, Icons und Fonts kommen jetzt; der Service Worker selbst folgt in der Vite-Migration (unter CRA wäre es Wegwerfarbeit). → PWA ist installierbar, aber noch nicht offline-fähig.
- **Tag-Chaos ignoriert:** Historische Tags (v1.6.0 = Milestone v1.2 etc.) werden im CHANGELOG so dokumentiert wie sie sind; Bereinigung ist Teil der späteren Git-Konsolidierung, nicht des Redesigns.
- **Phasen-Schnitt pro View statt pro Gerät:** Jeder Screen wird mobil + desktop in einer Phase komplett umgesetzt (Wunsch des Users: „alles durchballern", Reihenfolge egal).

## Offene Punkte / markierte Unklarheiten

_(werden von den Phasen-Agents ergänzt)_
