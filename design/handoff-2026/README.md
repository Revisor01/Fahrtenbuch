# Handoff: Fahrtenbuch Redesign 2026

Für `Revisor01/Fahrtenbuch` (branch `master`). Zielverzeichnis der Änderungen: `frontend/`.

## Überblick

Redesign der Fahrtenbuch-App des Kirchenkreises Dithmarschen. Drei Ziele:

1. **Eine visuelle Identität statt neun wählbarer Themes.** `frontend/src/themes.css` entfällt komplett. Es gibt genau zwei Modi: hell (Standard) und dunkel — beide eigenständig abgestimmt, Dark Mode ist keine Invertierung.
2. **Mobile-first Erfassung.** Fahrt in unter zehn Sekunden über Bottom-Sheet + Favoriten, nicht über Modal-Ketten.
3. **Eine Statussprache**, die überall identisch funktioniert und nie nur farbcodiert ist.

## Über die Design-Dateien

Die Datei `Fahrtenbuch Redesign.dc.html` in diesem Bündel ist eine **Design-Referenz in HTML** — ein Prototyp, der Aussehen und Verhalten zeigt. Sie ist **kein Produktionscode zum Kopieren**. Die Aufgabe ist, diese Designs im bestehenden Stack der App nachzubauen: React 18 + Tailwind mit CSS-Variablen-Tokens, so wie es `frontend/tailwind.config.js` bereits vorsieht. Framework, Router, State-Verwaltung und Build bleiben unverändert.

Der Prototyp verwendet Inline-Styles und einen Ordner-Baum, der nicht der App entspricht — er dient nur der Darstellung.

## Fidelity

**High-fidelity.** Farben, Typografie, Abstände, Radien, Maße und Copy sind final und sollen exakt übernommen werden. Alle Werte stehen unten und in `tokens.css`.

---

## Design Tokens

Vollständig in `tokens.css` — diese Datei **ersetzt `frontend/src/themes.css` eins zu eins**. `frontend/tailwind.config.js` bleibt funktional gleich, muss aber auf die neuen Variablennamen umgestellt werden (siehe „Migration" unten).

### Farben

| Token | Hell | Dunkel | Verwendung |
| --- | --- | --- | --- |
| `--bg` | `#EFF3F3` | `#071214` | App-Hintergrund |
| `--surface` | `#FFFFFF` | `#0F2225` | Karten, Tabellen, Sheets |
| `--surface-2` | `#E7EEEE` | `#163033` | Segmented Controls, Icon-Buttons, Avatare |
| `--surface-3` | `#DCE6E6` | `#1D3B3E` | gedrückter Zustand |
| `--line` | `#D2DEDE` | `#22474A` | Standardrand 1 px |
| `--line-strong` | `#B6C7C7` | `#2F5B5F` | gestrichelte Ränder, Sekundärbutton |
| `--text` | `#08201F` | `#E4F0EF` | Fließtext, Überschriften |
| `--text-2` | `#47605F` | `#9CB5B4` | Sekundärtext |
| `--text-3` | `#6E8685` | `#7C9594` | nur Labels ab 12 px/700 |
| `--brand` | `#0F5257` | `#35B6AA` | Primärfläche, Links, aktive Nav |
| `--brand-strong` | `#0A3B3F` | `#6BD8CC` | Hover / gedrückt |
| `--brand-soft` | `#DBEAEA` | `#10393A` | aktive Nav-Fläche, Fokusring |
| `--on-brand` | `#FFFFFF` | `#032220` | Text auf Markenfläche |
| `--accent` | `#B87A20` | `#E8B461` | **nur** „Eingereicht" und Fälligkeit |
| `--accent-soft` | `#FAEEDA` | `#3A2B12` | Badge-Fläche |
| `--accent-text` | `#784C0A` | `#F2CF98` | Badge-Text |
| `--accent-line` | `#E8D0A4` | `#57431E` | Badge-Rand |
| `--ok` | `#1D6B48` | `#52C08A` | „Erstattet" |
| `--ok-soft` | `#DDEFE5` | `#0E3226` | |
| `--ok-line` | `#B3D8C4` | `#1D5540` | |
| `--danger` | `#A32E22` | `#F08D80` | Validierung, Löschen |
| `--danger-soft` | `#F8E3E0` | `#3A1512` | |

**Wichtig:** Petrol kippt im Dunkelmodus ins Helle (`#35B6AA`). `--on-brand` ist im Dunkeln dunkel. Nicht einfach dieselbe Marke in beiden Modi verwenden — die Kontraste brechen sonst.

**Regel für den Akzent:** Sand erscheint ausschließlich dort, wo etwas von der Nutzerin verlangt wird oder aussteht — Status „Eingereicht", fälliger Monat, Badge in der Navigation. Nirgendwo dekorativ.

### Typografie

| Rolle | Familie | Größe / Gewicht | Tracking |
| --- | --- | --- | --- |
| Display | Instrument Sans | 30–54 px / 600 | −0.025 bis −0.035 em |
| Screen-Titel mobil | Instrument Sans | 22 px / 600 | −0.02 em |
| Abschnittstitel | Instrument Sans | 16–17 px / 600 | normal |
| Body | Instrument Sans | 15–16 px / 400 | normal |
| Body klein | Instrument Sans | 13–14 px / 400 | normal |
| Label | Instrument Sans | 11–12 px / 700, uppercase | 0.1 em |
| **Alle Zahlen** | JetBrains Mono | 13–52 px / 500–600 | `font-variant-numeric: tabular-nums` |

Kilometer, Beträge, Daten und Uhrzeiten stehen **immer** in JetBrains Mono mit Tabellenziffern, damit Spalten bündig laufen. Fließtext nie in Mono.

Einbindung:
```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```
Für Offlinefähigkeit der PWA: Fonts selbst hosten (`woff2`, `font-display: swap`).

### Maße

| Token | Wert | Regel |
| --- | --- | --- |
| Spacing-Skala | 4 · 8 · 12 · 16 · 20 · 28 px | nichts dazwischen |
| `--r-card` | 16 px | Karten, Tabellen, Sheets |
| `--r-btn` | 12 px | Buttons, Felder, Icon-Buttons |
| `--r-pill` | 999 px | Chips, Badges, Avatare |
| `--control-h` | 48 px | Buttons |
| `--field-h` | 52 px | Eingabefelder |
| `--tap-min` | 44 px | absolutes Minimum jeder Trefferfläche |
| Feldschrift | 16 px | **nie kleiner** — sonst zoomt iOS beim Fokus |
| Rand | 1 px, im Fokus 1,5 px | Fokus zusätzlich `box-shadow: 0 0 0 3px var(--brand-soft)` |
| `--shadow` | `0 1px 2px rgba(8,32,31,.05), 0 8px 24px -12px rgba(8,32,31,.18)` | nur Karten, nie Felder |

Der Fokusrand wächst von 1 auf 1,5 px — kompensiere die 0,5 px per `box-shadow` statt per `border`, damit das Layout nicht springt.

---

## Statussystem

Drei Zustände, drei Wörter, immer dieselbe Reihenfolge. **Umbenennung gegenüber heute:**

| alt | neu | warum |
| --- | --- | --- |
| offen | **Erfasst** | „offen" klingt nach Versäumnis; die Fahrt ist ja korrekt erfasst |
| eingereicht | **Eingereicht** | bleibt |
| erhalten | **Erstattet** | benennt die Tatsache: das Geld ist da |

Jeder Status trägt **Form + Wort + Farbe**. Die Form allein genügt zur Unterscheidung (WCAG 1.4.1).

| Status | Form | Fläche | Text | Rand |
| --- | --- | --- | --- | --- |
| Erfasst | gestrichelter Ring, leer | transparent | `--text-2` | `1px dashed var(--line-strong)` |
| Eingereicht | gefüllter Kreis mit `↑` | `--accent-soft` | `--accent-text` | `1px solid var(--accent-line)` |
| Erstattet | gefüllter Kreis mit `✓` | `--ok-soft` | `--ok` | `1px solid var(--ok-line)` |

Drei Darstellungsformen, sonst keine:

1. **Badge** (Pille, 6/12 px Padding, `--r-pill`, 14 px/600, Icon 16 px) — Detailansichten, Monatsköpfe.
2. **Punkt + Wort** (9–10 px Kreis, 6 px Abstand, 13–14 px/600) — dichte Listen und Tabellen. Nie der Punkt allein.
3. **Fortschrittsleiste** (drei Stationen, 26 px Kreise, 2 px Verbindungslinie) — Kopf einer Monatsabrechnung. Erledigte Stationen `--ok`, aktuelle `--accent`, offene gestrichelt.

Ein Monat hat pro Abrechnungsträger einen eigenen Status. Der Monatsstatus ist das Minimum seiner Trägerstatus.

---

## Screens

### 1. Dashboard mobil (`/`)

**Zweck:** Was ist offen — dann sofort erfassen.

Aufbau von oben nach unten, alle horizontalen Ränder 20 px:

- **Kopf:** Monatsname 22 px/600 links, Avatar 40 px Kreis `--surface-2` rechts, 14 px/600 Initialen `--text-2`.
- **Hero-Karte** (`--brand`, `--r-card`, 22 px Padding, Text `--on-brand`):
  - Label „Noch nicht eingereicht", 12 px/700 uppercase, 0.1 em, `opacity: .72`
  - Betrag Mono 38 px/500, `letter-spacing: -.03em`, `line-height: 1`
  - Zeile „Juli 2026 · 486 km · 2 Träger", 15 px, `opacity: .82`
  - Button volle Breite, 48 px, `--r-btn`, Fläche `--on-brand`, Text `--brand`, 16 px/600, Beschriftung „Juli abrechnen"
  - Zeigt immer den **ältesten nicht eingereichten Monat**. Gibt es keinen, tritt die Karte in den Erfolgszustand: Fläche `--surface`, Rand `--ok-line`, Text „Alles abgerechnet".
- **„Ein Tipp genügt"** — Label + Link „Alle" rechts (`--brand`, 14 px/600). Darunter Grid 2 Spalten, 10 px Gap, Kacheln `--surface` / 1 px `--line` / `--r-btn` / 14 px Padding / min. 88 px hoch: Ort 16 px/600 oben, unten Anlass 13 px `--text-2` und Mono 13 px/600 `--brand` „32 km · KK".
  - **Ein Tipp legt die Fahrt sofort an.** Kein Zwischenschritt, kein Modal. Bestätigung ausschließlich per Toast mit „Rückgängig".
- **„Zuletzt"** — Karte `--surface`, Zeilen 14/16 px Padding: Ziel 16 px/600, darunter „Di 04.08. · Konfirmanden" 13 px `--text-2`, rechts Mono 14 px km, dann Wiederholen-Button 44×44 px, `--r-btn`, `--surface-2`, Rand `--line`, Glyph `↻` in `--brand`.
- **FAB:** 62×62 px, `border-radius: 22px`, `--brand`, `+` 30 px/300 in `--on-brand`, Schatten `0 12px 28px -8px rgba(8,32,31,.55)`. Position `right: 20px`, **`bottom: 112px`** — muss über der Bottom-Nav und frei von der letzten Listenzeile stehen. Liste unten entsprechend `padding-bottom: 78px` geben.
- **Bottom-Nav:** `--surface`, Oberrand `--line`, `padding: 10px 8px 26px` (+ `env(safe-area-inset-bottom)`). Vier Ziele à 25 %: Start / Fahrten / Abrechnung / Mehr. Icon 19 px, Label 11 px/600, aktiv `--brand`, inaktiv `--text-3`. Auf „Abrechnung" ein Punkt 8 px `--accent`, wenn ein Monat fällig ist.

### 2. Erfassungsflow mobil

Ersetzt die heutige Modal-Kette. Zwei Schritte, beide als Bottom-Sheet: `--surface`, `border-radius: 28px 28px 0 0`, Griff 44×5 px `--line-strong` mittig, Overlay `rgba(8,32,31,.42)`, Schatten `0 -8px 40px -12px rgba(8,32,31,.4)`.

**Schritt 1 — „Wohin?"**
- Titel 22 px/600, darunter „Ab Wesselburen · heute, Di 04.08." 15 px `--text-2` (Startort und Datum vorbelegt, antippbar zum Ändern)
- Suchfeld 52 px, `--r-btn`, Fläche `--bg`, Rand `--line`, Placeholder 17 px `--text-3`
- Ortsliste: Zeilen 14/16 px Padding, `--r-btn`, Rand `--line`. Ausgewählt: Rand 1,5 px `--brand`, Fläche `--brand-soft`. Rechts Distanz Mono 15 px/600. Sortierung: häufigste Ziele zuerst.
- Letzter Eintrag gestrichelt: „Anderes Ziel eingeben"
- Primärbutton 54 px volle Breite „Weiter"

**Schritt 2 — Bestätigen**
- Kopf: „Wesselburen → Heide" 22 px/600, darunter Mono 15 px/600 `--brand` „32 km · 11,52 €" (Betrag live aus dem Erstattungssatz). Rechts Stift-Button 44×44 px zum Korrigieren.
- Anlass als Chips, 11/16 px Padding, `--r-pill`, 15 px. Gewählt: `--brand` / `--on-brand`. Übrige: Rand `--line`, Text `--text-2`. Letzter Chip gestrichelt „Frei eingeben…". Vorschläge aus dem Verlauf für **dieses Ziel**.
- **Rückfahrt**: Zeile 14/16 px, Rand `--line`, `--r-btn`, Fläche `--bg`. Titel 16 px/600, Hinweis 13 px „Legt eine zweite Fahrt an". Rechts Switch 52×31 px, `--r-pill`, an = `--brand`, Knopf 25 px `--surface`. **Standard: an**, wenn das Ziel bisher überwiegend mit Rückfahrt erfasst wurde.
- **Abrechnungsträger**: gleiche Zeilenform, rechts aktueller Wert + `›` in `--brand`/600. Vorbelegt mit dem zuletzt für dieses Ziel genutzten Träger.
- Primärbutton 54 px, Beschriftung zählt mit: „2 Fahrten speichern · 64 km"

**Danach:** Sheet schließt, Toast erscheint, die neuen Einträge stehen oben in „Zuletzt" mit 1,5 px `--brand`-Rand (ca. 3 s, dann normaler Rand).

### 3. Fahrtenliste mobil (`/fahrten`)

- Titel „Fahrten" 22 px/600
- Segmented Control `--surface-2`, `--r-btn`, 4 px Padding, Segmente 40 px, aktiv `--surface` + `--shadow`, 15 px/600. Drei Segmente: aktueller Monat / Vormonat / „Zeitraum".
- Summenzeile: Mono 15 px/600 km · Betrag, rechts „Export" in `--brand`/600
- Karten `--surface`, `--r-card`, 14/16 px Padding, 10 px Gap:
  - Kopfzeile: Datum Mono 13 px `--text-3` links, Status als Punkt+Wort rechts
  - Ziel 17 px/600 links, km Mono 15 px/600 rechts
  - Anlass · Träger 14 px `--text-2` links, Betrag Mono 14 px rechts
- Wischen nach links öffnet Bearbeiten/Löschen. Löschen ohne Rückfrage, mit Toast + „Rückgängig".
- Der scrollende Bereich braucht `flex: 1; min-height: 0; overflow-y: auto`, sonst schiebt die Liste die Bottom-Nav aus dem Bild.

### 4. Abrechnung mobil (`/abrechnung`)

- Titel + Zeile „2 Monate warten auf dich"
- **Fälliger Monat** als aufgeklappte Karte: Rand 1,5 px `--accent-line`. Kopf mit Fläche `--accent-soft`: Monat 18 px/600, darunter „Fällig — noch nicht eingereicht" 14 px/600 `--accent-text`, rechts Summe Mono 17 px/600. Darunter je Träger eine Zeile: Statuspunkt, Name 16 px, Untertitel „Erfasst · 312 km" 13 px, Betrag Mono 14 px rechts. Fußzeile: Primärbutton 48 px „Einreichen" + Download-Button 48×48 px.
- **Übrige Monate** eingeklappt: Karte `--surface`, Monat 18 px/600, darunter Statuspunkt + „Eingereicht am 12.07." bzw. „Erstattet am 28.06." Erstattete Monate `opacity: .72`.

### 5. Dashboard Desktop (ab 1024 px)

Sidebar 232 px + Inhalt, Inhalt 32/36 px Padding.

- **Sidebar** `--surface`, Rechtsrand `--line`: Logo + Wortmarke, dann vier Ziele (11/12 px Padding, `--r-btn`, aktiv `--brand-soft`/`--brand`/600, inaktiv `--text-2`/15 px). Auf „Abrechnung" ein Zähler-Badge 20 px Kreis `--accent`. Unten abgetrennt Nutzerzeile mit Avatar 32 px, Name 14 px/600, Rolle 12 px `--text-3`.
- **Kopf:** Begrüßung 30 px/600 („Guten Morgen, Simon"), Datum 16 px `--text-2`, rechts Primärbutton 44 px „+ Neue Fahrt".
- **Reihe 1** Grid `1.55fr 1fr`, 18 px Gap:
  - Hero `--brand`, 28 px Padding: Label, Betrag Mono 52 px/500, „aus Juli 2026" 16 px daneben. Darunter je Träger eine Kachel `rgba(255,255,255,.12)` mit Name 13 px und Betrag Mono 19 px/600, rechts Button 48 px „Juli abrechnen →" (`--on-brand` auf Fläche, Text `--brand`).
  - Rechts zwei gestapelte Karten: „August bisher" (km Mono 30 px + Betrag Mono 17 px + „14 Fahrten · 0,36 €/km") und „Unterwegs" (Punkt + „Juni eingereicht" + Betrag, darunter „seit 23 Tagen · Kirchenkreisamt" 13 px `--text-3` mit 20 px Einzug).
- **Reihe 2** gleiches Raster:
  - **Letzte Fahrten** als Tabelle. Kopf 8/22 px Padding, Fläche `--bg`, 11 px/700 uppercase `--text-3`. Spalten `82px 1fr 132px 68px 78px 108px` = Datum / Anlass·Ziel / Träger / km / Betrag / Status. Zeilen 13/22 px, Trennlinie `--line`, Hover `--surface-2`. Anlass 15 px/500, darunter „Wesselburen → Hennstedt" 13 px `--text-3`. Zahlen Mono, rechtsbündig. Status als Punkt + Wort, rechtsbündig.
  - **Chart „Kilometer 2026":** acht Balken, 8 px Gap, max. 150 px hoch, `border-radius: 5px 5px 0 0`. Farbe nach Status des Monats: `--ok` erstattet, `--accent` eingereicht, `--brand` erfasst. Monatsinitiale 11 px Mono darunter. Legende unter einer Trennlinie.

### 6. Abrechnung Desktop

Kopf: „Abrechnung 2026" 30 px/600 + „Zwei Monate sind noch nicht eingereicht." Rechts Sekundärbutton „Zeitraum-Export" und Primärbutton „Juli einreichen".

Darunter die **Matrix Monat × Abrechnungsträger** — das zentrale mentale Modell:

Spalten `150px 1fr 1fr 1fr 118px 130px` = Monat / je eine Spalte pro Träger / Summe / Aktion. Zeilen 16/24 px.
- Monat: 16 px/600, darunter km Mono 12 px `--text-3`
- Trägerzellen: Statuspunkt + Wort, 14 px/600. Kein Vorgang in diesem Monat → `—` in `--text-3`, kein Punkt.
- Summe Mono 16 px/600 rechtsbündig
- Aktion: Textlink `--brand`/14 px/600 — „Einreichen →" bei fälligen, sonst „Details", beim laufenden Monat nur „läuft" in `--text-3`

Die Spaltenanzahl folgt den konfigurierten Trägern. Ab fünf Trägern horizontal scrollen, Monatsspalte klebend.

### 7. Einstellungen

Aus acht Tabs wird eine **Liste links** (212 px, Einträge 12/14 px, `--r-btn`, aktiv `--brand-soft`/`--brand`/600) und der Inhalt rechts in einer Karte. Reihenfolge nach Nutzungshäufigkeit: Orte & Distanzen · Abrechnungsträger · Erstattungssätze · Favoriten · Mitfahrer · Profil & Passwort · Darstellung.

Beispiel „Orte": Titel 17 px/600 + erklärender Satz 14 px, rechts Primärbutton „+ Ort". Darunter Suchfeld 52 px, dann Tabelle (`1fr 1.4fr 96px 96px` = Ort / Adresse / Distanz / Aktionen). Aktions-Icons 36×36 px, `--r-btn`, Rand `--line`; Löschen in `--danger`.

Mobil wird daraus eine Vollbild-Liste mit Drilldown, kein Tab-Streifen.

**„Darstellung"** enthält genau drei Optionen: Hell / Dunkel / Systemeinstellung. Keine Farbwahl.

### 8. Anmeldung

Zentrierte Karte auf `--brand`-Fläche. Logo 52 px in `rgba(255,255,255,.14)`, `border-radius: 16px`. Titel 26 px/600 `--on-brand`, Untertitel 15 px mit `opacity: .72`. Formularkarte `--surface`, `--r-card`, 24 px Padding: Labels 12 px/700 uppercase `--text-3`, Felder 52 px, Primärbutton 52 px volle Breite. Darunter zwei Links 14 px in `--brand`.

---

## Komponenten

### Buttons — 48 px hoch, `--r-btn`, 16 px/600

| Variante | Fläche | Text | Rand |
| --- | --- | --- | --- |
| primär | `--brand` | `--on-brand` | keiner |
| sekundär | `--surface` | `--text` | 1 px `--line-strong` |
| ghost | transparent | `--brand` | keiner |
| destruktiv | transparent | `--danger` | 1 px `--danger` |

Hover: primär → `--brand-strong`; sekundär/ghost → Fläche `--surface-2`. Disabled: `opacity: .5`, `cursor: not-allowed`.
Icon-Buttons **48×48 px** (heute 26 px), `--surface-2`, Rand `--line`, Glyph 17 px `--text-2`.

### Eingabefelder — 52 px, 16 px Schrift

Fläche `--bg`, Rand 1 px `--line`, `--r-btn`, 16 px horizontales Padding, kein Schatten.
Fokus: Rand 1,5 px `--brand` + `box-shadow: 0 0 0 3px var(--brand-soft)`.
Fehler: Rand 1,5 px `--danger`, darunter Meldung 13 px/500 `--danger`.
Label darüber: 12 px/700 uppercase, 0.1 em, `--text-3`, 7 px Abstand.

> Das ist die wichtigste Einzeländerung gegenüber heute: `h-8` (32 px) und `text-sm` (14 px) fliegen raus. 14 px im Feld lässt iOS beim Fokus hineinzoomen.

### Karten

`--surface`, 1 px `--line`, `--r-card`, `--shadow`. Padding 22–32 px Desktop, 14–22 px mobil. Tabellen liegen randlos („flush") in der Karte, die Karte trägt `overflow: hidden`.

### Toasts — ersetzen Bestätigungs-Modals

Fläche `--text`, Text `--bg` (invertiert, in beiden Modi), `--r-btn`, 15/17 px Padding, Schatten `0 12px 32px -10px rgba(0,0,0,.5)`. Links Statuskreis 22–24 px (`--ok` bzw. `--danger`), Mitte Meldung 15–16 px/600, rechts Aktion 16 px/600 in `--brand-strong`.
Einblenden: `translateY(12px)` + `opacity 0` → 300 ms ease. Standzeit 5 s, bei „Rückgängig" bis zum Klick.
Mobil 16 px über der Bottom-Nav, Desktop unten rechts.

**Regel: Kein Modal für Bestätigungen.** Speichern, Löschen, Status ändern, Favorit anlegen — alles direkt ausführen und per Toast rückgängig machbar machen. Modals bleiben nur für echte mehrfeldrige Formulare auf dem Desktop.

### Leere Zustände

Gestrichelter Rahmen `--line-strong`, `--r-btn`, 28/20 px Padding, zentriert: Icon-Fläche 44 px `--brand-soft` mit `--r-btn`, Titel 16 px/600, Satz 14 px `--text-2`, Primärbutton 48 px. Text konkret, nie „Keine Daten vorhanden".

---

## Verhalten

- **Modus:** Standard folgt `prefers-color-scheme`, Nutzerwahl überschreibt und liegt in `localStorage` unter einem eigenen Schlüssel. `<meta name="theme-color">` mitziehen: `#0F5257` hell, `#071214` dunkel.
- **Erfassen:** Favoriten-Tipp und „Wiederholen" schreiben sofort, optimistisch. Fehlschlag → Toast in `--danger` und Eintrag zurückrollen.
- **Rückfahrt** erzeugt zwei getrennte Fahrten mit vertauschten Orten, gleiches Datum, gleicher Träger.
- **Einreichen** setzt alle Fahrten des Monats für diesen Träger auf „Eingereicht" und stößt den Excel/PDF-Export an. Der Export selbst bleibt unverändert — amtliches Formular, nicht Teil des Redesigns.
- **Übergänge:** 150–200 ms `ease` für Farbe und Fläche, 300 ms für Sheets und Toasts. `prefers-reduced-motion` respektieren: Sheets dann ohne Transform einblenden.
- **Breakpoints:** < 768 px mobil (Bottom-Nav, Sheets, Karten), ≥ 1024 px Desktop (Sidebar, Tabellen). Dazwischen Desktop-Layout mit einspaltigem Inhalt.

---

## PWA

`manifest.json` liegt fertig im Bündel. Icons in `assets/` als SVG in drei Varianten:

| Datei | purpose | Hinweis |
| --- | --- | --- |
| `icon-512.svg` | any | Petrol-Squircle, Radius 114/512 |
| `icon-maskable.svg` | maskable | Zeichen auf 72 % skaliert, randlose Petrol-Fläche |
| `icon-monochrome.svg` | monochrome | nur der Ring, einfarbig schwarz |

Zu PNG rastern in 192, 256, 384, 512 px und unter `/icons/` ablegen.

**Das Zeichen:** ein offener Ring (`#35B6AA`, Strichstärke 46/512, um −45° gedreht, links offen) = die gefahrene Strecke. Der Punkt am offenen Ende (`#E8B461`, r = 34/512) = was noch aussteht — dasselbe Signal wie im Status. Ab 32 px Darstellungsgröße entfällt der Punkt, der Ring allein trägt.

**Splash:** Fläche `#0F5257`, Zeichen 88 px zentriert, darunter „Fahrtenbuch" 22 px/600 weiß, am unteren Rand „Kirchenkreis Dithmarschen" 13 px in `rgba(255,255,255,.55)`.

---

## Migration

1. `frontend/src/themes.css` löschen, `tokens.css` an dessen Stelle setzen und in `index.js` importieren.
2. `ThemeContext.js` / `ThemeToggle.js` auf drei Werte reduzieren: `light` | `dark` | `system`. Die neun `data-theme`-Werte entfernen.
3. `frontend/tailwind.config.js`: `primary`/`secondary`-Skalen durch semantische Namen ersetzen, die auf die neuen Variablen zeigen (`brand`, `accent`, `ok`, `danger`, `surface`, `line`, `text`). `darkMode: 'class'` bleibt.
4. `frontend/src/index.css`: die ~80 Komponentenklassen gegen die Spezifikation oben austauschen. Die kritischen Änderungen: `.form-input` von `h-8`/`text-sm` auf 52 px/16 px, `.btn-*` von `h-8` auf 48 px, `.table-action-button` von 32 px auf 48 px, `.status-badge-primary`/`-secondary` durch die drei Statusvarianten ersetzen.
5. Bestätigungs-Modals durch einen Toast-Provider ersetzen. Betroffen: `Modal.js`, `NotificationModal.js`, `AbrechnungsStatusModal.js`, `MitfahrerModal.js`.
6. Bottom-Nav + Sheet-Komponente neu anlegen; `FahrtForm.js` in die zwei Sheet-Schritte zerlegen und das Desktop-Formular daraus ableiten.
7. Status-Wording in UI und Exportbeschriftungen umstellen: offen → Erfasst, erhalten → Erstattet. Datenbankwerte können bleiben, nur das Mapping in der Anzeige ändern.

## Barrierefreiheit

- Alle Text/Fläche-Kombinationen oben erfüllen WCAG AA in beiden Modi (Fließtext ≥ 4.5:1, Labels ≥ 12 px/700 ≥ 4.5:1).
- Status nie nur farblich: Form und Wort sind Pflicht.
- Jede Trefferfläche ≥ 44 px, Abstand zwischen benachbarten Zielen ≥ 8 px.
- Fokus ist überall sichtbar (1,5 px Rand + 3 px Ring), auch bei Tastaturbedienung.
- Sheets: Fokus fangen, `Esc` schließt, `aria-modal`, Rückgabe des Fokus auf den auslösenden Button.
- Toasts in einer `aria-live="polite"`-Region; „Rückgängig" ist ein echter Button.

## Dateien im Bündel

| Datei | Inhalt |
| --- | --- |
| `README.md` | dieses Dokument |
| `Fahrtenbuch Redesign.dc.html` | HTML-Prototyp aller Screens, Light/Dark umschaltbar |
| `tokens.css` | vollständiges Token-Set, ersetzt `themes.css` |
| `manifest.json` | fertiges PWA-Manifest |
| `assets/icon-512.svg` | App-Icon |
| `assets/icon-maskable.svg` | maskable-Variante |
| `assets/icon-monochrome.svg` | monochrome-Variante |

Der Prototyp lässt sich direkt im Browser öffnen. Oben rechts schaltet er zwischen hell und dunkel.
