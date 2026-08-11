// LandingPage.js — Hilfeseite unter /help (auch ohne Login erreichbar).
//
// Redesign 2026: eigenes Layout auf den Design-Tokens aus tokens.css
// (--brand, --surface, --text-2, --r-card …) und den globalen Klassen
// (.card-container, .btn-*, .form-label). Kein AppContext-Zwang — die
// Inhalte stehen auch anonymen Besucher:innen zur Verfügung.
//
// Die FAQ beschreibt ausschließlich, was die App tatsächlich tut; die
// Abschnitte folgen der Navigation (Start · Fahrt erfassen · Fahrten ·
// Abrechnung · Einstellungen · Verwaltung) plus Querschnittsthemen.
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import './index.css';
import { ChevronDown, ArrowLeft, Car, Mail } from 'lucide-react';
import { AppContext } from './contexts/AppContext';
import { appConfigValue } from './utils/appConfig';

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

function AccordionItem({ id, title, isOpen, onToggle, children }) {
  return (
    <div className={`help-item${isOpen ? ' is-open' : ''}`}>
      <button
        type="button"
        className="help-item-btn"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`${id}-panel`}
        id={`${id}-btn`}
      >
        <span className="help-item-titel">{title}</span>
        <ChevronDown className="help-item-chevron" size={18} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="help-item-panel" id={`${id}-panel`} role="region" aria-labelledby={`${id}-btn`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Ein Themenblock mit Sprungmarke
function Abschnitt({ id, titel, satz, children }) {
  return (
    <section className="help-abschnitt" id={id}>
      <h2 className="help-abschnitt-titel">{titel}</h2>
      {satz && <p className="help-abschnitt-satz">{satz}</p>}
      <div className="help-liste">{children}</div>
    </section>
  );
}

const Tipp = ({ children }) => <div className="help-tipp">{children}</div>;

// ---------------------------------------------------------------------------
// Inhalte
// ---------------------------------------------------------------------------

const ABSCHNITTE = [
  { id: 'start', titel: 'Erste Schritte' },
  { id: 'dashboard', titel: 'Start (Dashboard)' },
  { id: 'erfassen', titel: 'Fahrt erfassen' },
  { id: 'fahrten', titel: 'Fahrten' },
  { id: 'abrechnung', titel: 'Abrechnung' },
  { id: 'status', titel: 'Statussystem' },
  { id: 'mitfahrer', titel: 'Mitfahrer:innen' },
  { id: 'einstellungen', titel: 'Einstellungen' },
  { id: 'verwaltung', titel: 'Verwaltung (Admin)' },
  { id: 'export', titel: 'Export & Formular' },
  { id: 'installation', titel: 'App installieren' },
];

export default function LandingPage() {
  const { isLoggedIn } = useContext(AppContext) || { isLoggedIn: false };
  const [offen, setOffen] = useState(null);
  const appTitle = appConfigValue(
    'appTitle',
    import.meta.env.VITE_TITLE,
    'Fahrtenbuch Kirchenkreis Dithmarschen'
  );

  const toggle = (key) => setOffen((prev) => (prev === key ? null : key));
  const item = (key) => ({ id: key, isOpen: offen === key, onToggle: () => toggle(key) });

  return (
    <div className="help-root">
      {/* ---------------- Kopf ---------------- */}
      <header className="help-header">
        <div className="help-wrap help-header-inner">
          <span className="help-header-titel">{appTitle}</span>
          <Link to="/" className="btn-secondary help-zurueck">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>{isLoggedIn ? 'Zurück zur App' : 'Zum Login'}</span>
          </Link>
        </div>
      </header>

      <main className="help-wrap help-main">
        {/* ---------------- Einleitung ---------------- */}
        <section className="help-intro">
          <span className="help-intro-icon" aria-hidden="true">
            <Car size={26} />
          </span>
          <h1 className="help-intro-titel">Hilfe &amp; Anleitung</h1>
          <p className="help-intro-satz">
            Hier steht, wie du Dienstfahrten erfasst, den Überblick behältst und am
            Monatsende abrechnest — Bereich für Bereich, so wie die App aufgebaut ist.
            Tippe eine Frage an, um die Antwort aufzuklappen.
          </p>
        </section>

        {/* ---------------- Inhaltsverzeichnis ---------------- */}
        <nav className="help-toc" aria-label="Inhalt">
          <div className="form-label help-toc-label">Inhalt</div>
          <ul className="help-toc-liste">
            {ABSCHNITTE.map(({ id, titel }) => (
              <li key={id}>
                <a href={`#${id}`} className="help-toc-link">{titel}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Videos folgen — VideoCard wurde am 08.08.2026 entfernt (Neuaufnahme geplant) */}

        {/* ================= Erste Schritte ================= */}
        <Abschnitt
          id="start"
          titel="Erste Schritte"
          satz="In dieser Reihenfolge bist du in etwa zehn Minuten startklar."
        >
          <AccordionItem {...item('start-1')} title="1. Profil ausfüllen">
            <p>
              Öffne <strong>Einstellungen → Profil &amp; Passwort</strong> und trage
              <strong> vollen Namen</strong>, <strong>E-Mail</strong> und <strong>IBAN</strong> ein,
              dazu bei Bedarf Kirchengemeinde, Kirchspiel und Kirchenkreis.
            </p>
            <p>
              Diese Angaben landen direkt im Abrechnungsformular. Ohne Name und IBAN kann
              die Verwaltung dir nichts überweisen — das ist der wichtigste Schritt.
            </p>
            <p>
              Deine E-Mail-Adresse zeigt hinter dem Feld „Verifiziert" oder „Ausstehend"; ist
              sie noch nicht bestätigt, kannst du die Verifizierungs-Mail dort erneut anfordern.
            </p>
          </AccordionItem>

          <AccordionItem {...item('start-2')} title="2. Orte anlegen">
            <p>
              Unter <strong>Einstellungen → Orte &amp; Distanzen</strong> legst du die Orte an,
              zwischen denen du unterwegs bist: Name, Adresse und die Art des Ortes
              (Wohnort, Dienstort, Kirchspiel oder sonstiger Ort).
            </p>
            <p>
              Wohnort und Dienstort gibt es jeweils nur einmal. Der Wohnort ist die
              Vorbelegung für den Startort beim Erfassen, der Dienstort dient als Bezugspunkt
              für die Distanzspalte in der Ortsliste.
            </p>
          </AccordionItem>

          <AccordionItem {...item('start-3')} title="3. Distanzen pflegen">
            <p>
              Im selben Bereich trägst du unter „Distanzen" die Kilometer zwischen zwei
              gespeicherten Orten ein. Eine Distanz gilt automatisch in beide Richtungen.
            </p>
            <p>
              Sobald eine Strecke gepflegt ist, füllt die App die Kilometer beim Erfassen von
              selbst aus — und alle Fahrten auf dieser Strecke haben dieselbe Zahl.
            </p>
            <Tipp>
              Leg eine Distanz am besten direkt beim ersten Mal an. Nach ein paar Wochen ist
              deine Streckenliste vollständig und du tippst beim Erfassen fast nichts mehr.
            </Tipp>
          </AccordionItem>

          <AccordionItem {...item('start-4')} title="4. Abrechnungsträger und Erstattungssätze prüfen">
            <p>
              Unter <strong>Einstellungen → Abrechnungsträger</strong> stehen die
              Organisationen, die deine Fahrten erstatten — mit optionaler Kostenstelle.
              Unter <strong>Erstattungssätze</strong> hinterlegst du je Träger, was pro
              Kilometer gezahlt wird, jeweils mit einem „gültig ab"-Datum.
            </p>
            <p>
              Ist für einen Träger kein Satz gepflegt, rechnet die App beim Erfassen
              vorläufig mit <span className="num">0,30 €/km</span> und markiert das im
              Erfassungsschritt als „(Standardsatz)".
            </p>
          </AccordionItem>

          <AccordionItem {...item('start-5')} title="5. Erste Fahrt erfassen und am Monatsende einreichen">
            <p>
              Tippe auf <strong>+ Neue Fahrt</strong> (Desktop) bzw. den runden
              <strong> +</strong>-Knopf unten rechts (Mobil), wähle das Ziel, bestätige
              Anlass und Träger — fertig.
            </p>
            <p>
              Ist der Monat vorbei, zeigt dir der Bereich <strong>Abrechnung</strong> ihn als
              „fällig" an. Dort lädst du die Abrechnung herunter und der Status springt auf
              „Eingereicht". Kommt das Geld an, markierst du den Monat als „Erstattet".
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Dashboard ================= */}
        <Abschnitt
          id="dashboard"
          titel="Start (Dashboard)"
          satz="Die Startseite beantwortet zwei Fragen: Was ist noch offen? Und wie erfasse ich schnell?"
        >
          <AccordionItem {...item('dash-1')} title={'„Noch nicht eingereicht" / „Alles eingereicht"'}>
            <p>
              Die große Kachel oben zeigt den <strong>ältesten abgeschlossenen Monat</strong>,
              in dem noch mindestens ein Träger weder eingereicht noch erstattet ist — mit
              Summe, Kilometern und der Zahl der betroffenen Träger. Der Knopf
              „{'{'}Monat{'}'} abrechnen" springt direkt in die Abrechnung.
            </p>
            <p>
              Der laufende Monat taucht dort bewusst nicht auf — er ist noch nicht fällig.
            </p>
            <p>
              Ist nichts offen, steht dort „Alles eingereicht" (wenn noch Monate auf die
              Erstattung warten) bzw. „Alles abgerechnet" (wenn wirklich alles durch ist).
            </p>
          </AccordionItem>

          <AccordionItem {...item('dash-2')} title={'„{Monat} bisher"'}>
            <p>
              Diese Kachel (Desktop) summiert den laufenden Monat: Kilometer, Betrag und die
              Anzahl der Fahrten. Gibt es Mitfahrer:innen, steht deren Anteil getrennt dahinter
              („davon x € Mitfahrer") — Fahrt- und Mitfahrer-Satz werden nie vermischt.
            </p>
          </AccordionItem>

          <AccordionItem {...item('dash-3')} title={'„Unterwegs" und die ✓-Schnellaktion'}>
            <p>
              „Unterwegs" listet alle Monate, die <strong>eingereicht, aber noch nicht
              erstattet</strong> sind — mit Betrag, Einreichdatum und der Zahl der Tage
              seitdem.
            </p>
            <p>
              Der <strong>✓</strong>-Knopf rechts markiert alle eingereichten Träger dieses
              Monats in einem Rutsch als erstattet. Es erscheint ein Hinweis mit
              „Rückgängig", falls du dich vertippt hast.
            </p>
          </AccordionItem>

          <AccordionItem {...item('dash-4')} title="Kilometer-Balken und Hover-Aufschlüsselung">
            <p>
              Das Diagramm zeigt die <strong>letzten acht Monate</strong>. Die Farbe eines
              Balkens ist der Monatsstatus: grün = erstattet, sandfarben = eingereicht,
              petrol = erfasst.
            </p>
            <p>
              Zeigst du mit der Maus auf einen Balken (oder springst per Tabulator darauf),
              klappt die Aufschlüsselung auf: Kilometer, Anzahl Fahrten, Erstattung, bei
              Bedarf der Mitfahrer-Anteil und der Status.
            </p>
          </AccordionItem>

          <AccordionItem {...item('dash-5')} title={'Favoriten — „Ein Tipp genügt"'}>
            <p>
              Unter „Ein Tipp genügt" liegen deine gespeicherten Strecken als Kacheln: Ziel,
              Anlass, Kilometer und das Kürzel des Trägers.
            </p>
            <p>
              Ein Tipp fragt kurz nach — <strong>„Hin- und Rückfahrt"</strong> oder
              <strong> „Nur Hinfahrt"</strong> — und legt die Fahrt(en) sofort mit dem heutigen
              Datum an. Auch hier gibt es „Rückgängig".
            </p>
            <p>
              Favoriten pflegst du unter <strong>Einstellungen → Favoriten</strong>; „Alle"
              auf dem Dashboard führt direkt dorthin.
            </p>
          </AccordionItem>

          <AccordionItem {...item('dash-6')} title={'„Letzte Fahrten" und ↻ Wiederholen'}>
            <p>
              Die Liste zeigt die fünf jüngsten Fahrten — unabhängig davon, welcher Monat in
              der Fahrtenliste gerade gefiltert ist.
            </p>
            <p>
              Der <strong>↻</strong>-Knopf legt dieselbe Fahrt noch einmal an, mit dem
              heutigen Datum und <strong>samt Mitfahrer:innen</strong>. Der Eintrag erscheint
              sofort in der Liste; „Rückgängig" entfernt ihn wieder.
            </p>
          </AccordionItem>

          <AccordionItem {...item('dash-7')} title="Wo starte ich eine neue Fahrt?">
            <p>
              Auf dem Desktop über <strong>+ Neue Fahrt</strong> oben rechts, auf dem Handy
              über den runden <strong>+</strong>-Knopf unten rechts (er schwebt über der
              unteren Navigation). Beide öffnen denselben zweistufigen Erfassungsflow.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Erfassen ================= */}
        <Abschnitt
          id="erfassen"
          titel="Fahrt erfassen"
          satz={'Zwei Schritte: „Wohin?" und „Bestätigen". Alles andere füllt die App aus dem Verlauf.'}
        >
          <AccordionItem {...item('erf-1')} title={'Schritt 1: „Wohin?"'}>
            <p>
              Oben steht „Ab {'{'}Startort{'}'} · {'{'}Datum{'}'}". Beides ist antippbar:
              Der Startort wird als Auswahl aufgeklappt, das Datum als Datumsfeld.
            </p>
            <p>
              Vorbelegt ist als Startort dein <strong>Wohnort</strong>, ersatzweise der
              Dienstort, sonst der Ort, von dem du bisher am häufigsten gestartet bist. Das
              Datum steht auf heute.
            </p>
            <p>
              Darunter liegt die Zielliste — nach Häufigkeit sortiert, mit der gepflegten
              Distanz rechts. Das Suchfeld filtert nach Name und Adresse. Ist das Ziel nicht
              dabei, nimmst du <strong>„Anderes Ziel eingeben"</strong> und tippst die Adresse
              (mit Adressvorschlägen) ein.
            </p>
          </AccordionItem>

          <AccordionItem {...item('erf-2')} title={'Schritt 2: „Bestätigen"'}>
            <p>
              Oben stehen Route und Rechnung: „{'{'}km{'}'} km · {'{'}Betrag{'}'} €" — mit dem
              heute gültigen Satz des gewählten Trägers. Ein Klick auf die Route bringt dich
              zurück zu Schritt 1, der Stift daneben öffnet das Kilometerfeld.
            </p>
            <p>
              Ist für die Strecke keine Distanz gepflegt (oder das Ziel frei eingegeben),
              öffnet sich das Kilometerfeld gleich von selbst — dort trägst du die
              <strong> einfache Strecke</strong> ein.
            </p>
          </AccordionItem>

          <AccordionItem {...item('erf-3')} title="Anlass-Chips">
            <p>
              Für das gewählte Ziel schlägt die App bis zu drei Anlässe vor, die du dort
              bisher am häufigsten eingetragen hast — ein Tipp genügt. Über
              „Frei eingeben…" schreibst du stattdessen einen eigenen Text.
            </p>
            <p>Ein Anlass ist Pflicht — ohne ihn bleibt der Speichern-Knopf inaktiv.</p>
          </AccordionItem>

          <AccordionItem {...item('erf-4')} title="Rückfahrt-Schalter">
            <p>
              Ist der Schalter an, legt die App <strong>zwei eigenständige Fahrten</strong> an:
              die Hinfahrt und die Rückfahrt mit vertauschten Orten, gleichem Datum, gleichem
              Anlass und gleichem Träger.
            </p>
            <p>
              Die Vorbelegung kommt aus deinem Verlauf: Wurde dieses Ziel bisher überwiegend
              mit Rückfahrt am selben Tag erfasst, ist der Schalter an. Ohne Verlauf ist er
              ebenfalls an. Deine Auswahl gilt immer vor der Vorbelegung.
            </p>
          </AccordionItem>

          <AccordionItem {...item('erf-5')} title="Abrechnungsträger wählen">
            <p>
              Vorgeschlagen wird der Träger, den du für dieses Ziel zuletzt verwendet hast
              („Zuletzt für dieses Ziel"), sonst der erste aktive Träger deiner Liste. Ein Tipp
              auf die Zeile öffnet die Auswahl mit allen <strong>aktiven</strong> Trägern samt
              Kostenstelle.
            </p>
          </AccordionItem>

          <AccordionItem {...item('erf-6')} title="Speichern und Rückgängig">
            <p>
              Der Knopf sagt, was passiert: „1 Fahrt speichern" oder „2 Fahrten speichern",
              dahinter die Gesamtkilometer. Das Fenster schließt sofort, die Fahrten stehen
              unmittelbar in der Liste.
            </p>
            <p>
              Im Hinweis unten steht <strong>„Rückgängig"</strong> — damit werden die eben
              angelegten Fahrten wieder entfernt, auch wenn das Speichern im Hintergrund noch
              läuft.
            </p>
          </AccordionItem>

          <AccordionItem {...item('erf-7')} title="Mitfahrer:innen beim Erfassen">
            <p>
              Der schnelle Zwei-Schritt-Flow legt Fahrten <strong>ohne</strong> Mitfahrer:innen
              an. Wenn jemand mitfährt, erfasse die Fahrt zuerst normal und ergänze die
              Mitfahrer:innen anschließend über <strong>Fahrten → Bearbeiten</strong>. Mehr
              dazu im Abschnitt „Mitfahrer:innen".
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Fahrten ================= */}
        <Abschnitt
          id="fahrten"
          titel="Fahrten"
          satz="Die Liste aller erfassten Fahrten eines Monats oder Zeitraums — mit Summen, Status und Export."
        >
          <AccordionItem {...item('fl-1')} title="Zeitraum wählen: aktueller Monat, Vormonat, Zeitraum">
            <p>
              Über der Liste stehen drei Schaltflächen. Die ersten beiden springen direkt auf
              den <strong>aktuellen Monat</strong> bzw. den <strong>Vormonat</strong>.
            </p>
            <p>
              <strong>„Zeitraum"</strong> klappt eine Von-/Bis-Auswahl auf. Steht „Von" auf
              „—", siehst du genau den Bis-Monat; sonst alle Monate dazwischen. Der Knopf
              <strong> „Offene anzeigen"</strong> setzt den Zeitraum automatisch auf die Spanne
              vom ältesten bis zum jüngsten Monat, in dem noch etwas offen ist.
            </p>
          </AccordionItem>

          <AccordionItem {...item('fl-2')} title="Summenzeile und Export">
            <p>
              Direkt unter der Auswahl stehen die Gesamtkilometer und der Gesamtbetrag des
              gewählten Zeitraums. Rechts liegt <strong>„Export"</strong>.
            </p>
            <p>
              Das Export-Fenster bietet je Abrechnungsträger drei Formate:
              <strong> Excel</strong>, <strong>PDF</strong> und <strong>Beide (ZIP)</strong>.
              Im Zeitraum-Modus erscheinen dabei nur Träger, bei denen noch offene Monate
              enthalten sind — bereits eingereichte oder erstattete brauchen keinen Export.
            </p>
            <p>Dieser Export ändert keinen Status.</p>
          </AccordionItem>

          <AccordionItem {...item('fl-3')} title="Erstattungsübersicht mit Status-Chips">
            <p>
              Der Block „Erstattungen" listet die Summe je Abrechnungsträger (und, falls
              vorhanden, Mitfahrer:innen) und darunter „Noch nicht erstattet" als Restsumme.
            </p>
            <p>
              Bei einem einzelnen Monat steht neben jedem Träger sein Status samt Datum. Ein
              Klick schaltet weiter: <em>Erfasst</em> → Datumsabfrage „eingereicht",
              <em> Eingereicht</em> → Datumsabfrage „erstattet", <em>Erstattet</em> → Status
              wird direkt zurückgesetzt.
            </p>
            <p>
              Im Zeitraum-Modus siehst du je Träger eine Chip-Reihe mit einem Chip pro Monat.
              Ein Klick wirkt immer nur auf diesen einen Monat. Monate ohne Vorgang zeigen
              einen neutralen Strich.
            </p>
          </AccordionItem>

          <AccordionItem {...item('fl-4')} title="Karten mit Wischen (mobil) und Tabelle (Desktop)">
            <p>
              <strong>Auf dem Handy</strong> steht jede Fahrt als Karte: Datum und Status oben,
              Ziel und Kilometer, darunter „Anlass · Träger" und der Betrag; Mitfahrer:innen
              als Zusatzzeile.
            </p>
            <p>
              Wischen nach links legt <strong>Bearbeiten</strong> und <strong>Löschen</strong>
              frei. Wer nicht wischen mag: Ein Tipp auf die Karte (oder Enter/Leertaste)
              zeigt dieselben Knöpfe. Es ist immer nur eine Karte geöffnet.
            </p>
            <p>
              <strong>Ab Tablet-Breite</strong> wird daraus eine Tabelle mit Datum,
              Anlass · Route, Träger, km, Betrag und Status. Rechts liegen Bearbeiten,
              Löschen und <strong>↻ Wiederholen</strong> — Letzteres öffnet den
              Erfassungsflow vorausgefüllt in Schritt 2 und erscheint nur bei Fahrten
              zwischen zwei gespeicherten Orten.
            </p>
          </AccordionItem>

          <AccordionItem {...item('fl-5')} title="Fahrt bearbeiten oder löschen">
            <p>
              <strong>Bearbeiten</strong> öffnet das vollständige Fahrtformular — dort änderst
              du Datum, Orte, Anlass, Kilometer, Träger und die Mitfahrer:innen.
            </p>
            <p>
              <strong>Löschen</strong> fragt vorher nach und zeigt dabei Datum, Ziel, Anlass
              und Kilometer. Nach dem Löschen bleibt „Rückgängig" als zweites Netz: Die Fahrt
              wird mit allen Daten wieder angelegt.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Abrechnung ================= */}
        <Abschnitt
          id="abrechnung"
          titel="Abrechnung"
          satz="Monat für Monat: einreichen, Erstattung bestätigen, Belege nachladen."
        >
          <AccordionItem {...item('abr-1')} title="Monatskarten (mobil)">
            <p>
              Jeder Monat ist eine Karte. <strong>Fällige Monate</strong> — also abgeschlossene
              Monate mit mindestens einem noch nicht eingereichten Träger — sind hervorgehoben,
              immer aufgeklappt und tragen den Hinweis „Fällig — noch nicht eingereicht" samt
              Fortschrittsleiste.
            </p>
            <p>
              Alle anderen Monate sind eingeklappt und zeigen Statuspunkt und Datum
              („Eingereicht am …" / „Erstattet am …"); erstattete sind gedämpft dargestellt.
              Ein Tipp klappt die Trägerzeilen samt Aktionen auf. Der laufende Monat steht als
              „Läuft · noch nicht fällig" da.
            </p>
          </AccordionItem>

          <AccordionItem {...item('abr-2')} title="Matrix Monat × Träger (Desktop)">
            <p>
              Ab Tablet-Breite wird daraus eine Tabelle: Zeilen sind Monate, Spalten die
              Abrechnungsträger (Mitfahrer:innen als eigene Spalte, wenn es welche gibt),
              dazu Summe und Aktion. Wo kein Vorgang existiert, steht ein Strich.
            </p>
            <p>
              Die Aktion rechts heißt bei fälligen Monaten <strong>„Einreichen →"</strong>,
              sonst <strong>„Details"</strong> — das klappt die Trägerzeilen inline auf. Beim
              laufenden Monat steht „läuft". Bei vielen Trägern scrollt die Matrix seitwärts,
              die Monatsspalte bleibt stehen.
            </p>
            <p>
              Über der Tabelle wählst du das Jahr (oder „Alle Jahre"). Liegt ein fälliger
              Monat außerhalb des vorgewählten Jahres, schaltet die Ansicht einmalig
              automatisch auf „Alle Jahre" um.
            </p>
          </AccordionItem>

          <AccordionItem {...item('abr-3')} title="Einreichen — mit Formatwahl">
            <p>
              „Einreichen" fragt zuerst nach dem Format: <strong>Excel</strong>,
              <strong> PDF</strong> oder <strong>Beides (ZIP)</strong>. Danach passiert
              zweierlei, in dieser Reihenfolge:
            </p>
            <ol className="help-ol">
              <li>Für jeden noch offenen Träger wird eine Datei heruntergeladen.</li>
              <li>
                Erst wenn das geklappt hat, springen diese Träger auf „Eingereicht" mit dem
                heutigen Datum.
              </li>
            </ol>
            <p>
              Schlägt der Download fehl, bleibt der Status unangetastet. Der Hinweis danach
              enthält „Rückgängig" und setzt die eben eingereichten Träger wieder zurück.
            </p>
            <p>
              Auf dem Desktop steht oben zusätzlich ein Knopf für den ältesten fälligen Monat
              („{'{'}Monat{'}'} einreichen"). Einzelne Träger reichst du über den Link
              „Einreichen" in ihrer Zeile ein.
            </p>
          </AccordionItem>

          <AccordionItem {...item('abr-4')} title={'„Als erstattet markieren", „Datum ändern", „Zurücksetzen"'}>
            <p>
              In jeder Trägerzeile stehen je nach Status passende Links:
            </p>
            <ul className="help-ul">
              <li><strong>Erfasst</strong> → „Einreichen"</li>
              <li><strong>Eingereicht</strong> → „Als erstattet markieren" · „Datum ändern"</li>
              <li><strong>Erstattet</strong> → „Zurücksetzen" · „Datum ändern"</li>
            </ul>
            <p>
              „Als erstattet markieren" setzt das heutige Datum. „Datum ändern" öffnet die
              Datumsauswahl, wenn du nachträglich das echte Einreich- oder Gutschriftsdatum
              eintragen willst. „Zurücksetzen" bringt den Träger zurück auf „Erfasst".
            </p>
            <p>Alle drei laufen ohne Sicherheitsabfrage — dafür mit „Rückgängig" im Hinweis.</p>
          </AccordionItem>

          <AccordionItem {...item('abr-5')} title="Export ohne Statuswechsel">
            <p>
              Willst du eine Datei nur noch einmal herunterladen, nutze den
              <strong> Download-Knopf</strong> auf der Monatskarte bzw. den Link
              „Exportieren". Das ändert keinen Status — die Fahrten bleiben, wie sie sind.
            </p>
            <p>
              Der Knopf <strong>„Zeitraum-Export"</strong> im Desktop-Kopf macht dasselbe über
              eine frei wählbare Von-/Bis-Spanne, je Träger als Excel, PDF oder ZIP.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Status ================= */}
        <Abschnitt
          id="status"
          titel="Statussystem"
          satz="Drei Stationen, gleiche Bedeutung überall in der App."
        >
          <AccordionItem {...item('st-1')} title="Erfasst → Eingereicht → Erstattet">
            <ul className="help-ul">
              <li>
                <strong>Erfasst</strong> — die Fahrten stehen in der App, aber die Abrechnung
                ist noch nicht raus. Hier kannst du noch alles ändern.
              </li>
              <li>
                <strong>Eingereicht</strong> — die Abrechnung wurde exportiert und
                weitergegeben; das Einreichdatum ist gespeichert. Du wartest auf das Geld.
              </li>
              <li>
                <strong>Erstattet</strong> — die Erstattung ist gutgeschrieben; das
                Gutschriftsdatum ist gespeichert. Der Vorgang ist abgeschlossen.
              </li>
            </ul>
            <p>
              Der Status hängt immer an der Kombination aus <strong>Monat und
              Abrechnungsträger</strong>, nicht an der einzelnen Fahrt. Eine Fahrt zeigt daher
              den Status ihres Trägers in ihrem Monat.
            </p>
          </AccordionItem>

          <AccordionItem {...item('st-2')} title={'Warum steht mein Monat noch auf „Erfasst"?'}>
            <p>
              Weil der <strong>Monatsstatus das Minimum aller Trägerstatus</strong> ist: Solange
              ein einziger Träger noch „Erfasst" ist, gilt der ganze Monat als „Erfasst" — auch
              wenn die anderen längst erstattet sind. Erst wenn alle Träger erstattet sind, ist
              der Monat erstattet.
            </p>
            <p>
              Träger ohne Erstattungsbetrag zählen dabei nicht mit. Klapp den Monat in der
              Abrechnung auf, dann siehst du, welcher Träger noch aussteht.
            </p>
          </AccordionItem>

          <AccordionItem {...item('st-3')} title={'Was heißt „fällig"?'}>
            <p>
              Fällig ist ein Monat, der <strong>vor dem laufenden Monat</strong> liegt und in
              dem mindestens ein Träger noch auf „Erfasst" steht. Genau diese Monate zählt
              das Abzeichen an der Navigation und die Kachel auf dem Dashboard.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Mitfahrer ================= */}
        <Abschnitt
          id="mitfahrer"
          titel="Mitfahrer:innen"
          satz="Wer mitfährt, wird an der Fahrt erfasst — und getrennt vergütet."
        >
          <AccordionItem {...item('mf-1')} title="Mitfahrer:innen eintragen">
            <p>
              Öffne die Fahrt über <strong>Fahrten → Bearbeiten</strong> und nutze dort
              <strong> „+ Mitfahrer:in"</strong>. Pro Person trägst du <strong>Name</strong>,
              <strong> Arbeitsstätte</strong> und die <strong>Richtung</strong> ein:
              „Hin", „Rück" oder „Hin &amp; Rück". Mehrere Personen sind möglich.
            </p>
            <p>
              Legst du beim Bearbeiten zugleich eine Rückfahrt an, werden nur die
              Mitfahrer:innen übernommen, deren Richtung dazu passt.
            </p>
          </AccordionItem>

          <AccordionItem {...item('mf-2')} title="Eigener Erstattungssatz">
            <p>
              Für Mitfahrer:innen gilt ein <strong>eigener Satz pro Kilometer und Person</strong>.
              Du pflegst ihn unter <strong>Einstellungen → Erstattungssätze</strong> im Bereich
              „Mitfahrer" — genau wie die Trägersätze mit „gültig ab"-Datum und Historie.
            </p>
          </AccordionItem>

          <AccordionItem {...item('mf-3')} title="Wo die Beträge auftauchen">
            <p>
              Die Mitfahrer-Erstattung wird <strong>nie</strong> mit dem Fahrt-Betrag
              vermischt. In den Listen steht sie als eigener „+ x €"-Zusatz unter dem Betrag,
              auf dem Dashboard als „davon x € Mitfahrer", und in der Abrechnung erscheinen
              „Mitfahrer:innen" als eigene Kategorie mit eigenem Status — also auch als eigene
              Zeile bzw. Spalte und als eigener Export.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Einstellungen ================= */}
        <Abschnitt
          id="einstellungen"
          titel="Einstellungen"
          satz="Sieben Bereiche, sortiert nach dem, was du am häufigsten brauchst."
        >
          <AccordionItem {...item('set-1')} title="Orte & Distanzen">
            <p>
              Zwei Blöcke untereinander, jeder mit eigenem „+"-Knopf.
              <strong> Orte</strong> haben Name, Adresse (mit Adressvorschlägen) und eine Art:
              Wohnort, Dienstort, Kirchspiel oder sonstiger Ort. Wohnort und Dienstort gibt es
              jeweils nur einmal.
            </p>
            <p>
              Die Ortsliste zeigt in der dritten Spalte die Entfernung <strong>ab deinem
              Dienstort</strong>, sofern eine Distanz gepflegt ist — sonst einen Strich.
            </p>
            <p>
              <strong>Distanzen</strong> verbinden zwei gespeicherte Orte mit einer
              Kilometerzahl und gelten in beide Richtungen. Ab etwa fünf Einträgen erscheint
              ein Suchfeld, das Orte und Distanzen zugleich filtert. Gelöschte Orte und
              Distanzen lassen sich über „Rückgängig" zurückholen.
            </p>
          </AccordionItem>

          <AccordionItem {...item('set-2')} title="Abrechnungsträger">
            <p>
              Hier stehen die Organisationen, die deine Fahrten erstatten — mit Name und
              optionaler <strong>Kostenstelle</strong> (die im Formular auftaucht).
            </p>
            <p>
              Die <strong>Reihenfolge</strong> änderst du per Drag &amp; Drop am Griff links;
              mit der Tastatur gehen dort Pfeil hoch und runter. Sie bestimmt, wie die Träger
              überall in der App sortiert erscheinen.
            </p>
            <p>
              Der <strong>Haken rechts</strong> schaltet einen Träger aktiv oder inaktiv.
              Inaktive Träger stehen beim Erfassen nicht mehr zur Auswahl, ihre bisherigen
              Fahrten bleiben aber erhalten. Löschen entfernt den Träger endgültig — das geht
              nicht mehr rückgängig und schlägt fehl, wenn noch Daten daran hängen.
            </p>
          </AccordionItem>

          <AccordionItem {...item('set-3')} title="Erstattungssätze (inkl. Mitfahrer-Satz)">
            <p>
              Je Träger legst du Sätze mit <strong>Betrag in €/km</strong> und
              <strong> „gültig ab"-Datum</strong> an. Oben steht immer der aktuell gültige
              Satz, darunter die vollständige Historie.
            </p>
            <p>
              Dadurch bleiben alte Fahrten korrekt: Eine Fahrt wird mit dem Satz gerechnet,
              der an ihrem Datum galt. Ändert sich der Kilometersatz zum 1. Januar, legst du
              einfach einen neuen Satz mit diesem Datum an — die alten Abrechnungen ändern
              sich nicht.
            </p>
            <p>
              Der <strong>Mitfahrer-Satz</strong> steht im eigenen Bereich „Mitfahrer",
              funktioniert aber genauso (Betrag, gültig ab, Historie). Für ein Datum kann es
              je Träger nur einen Satz geben.
            </p>
          </AccordionItem>

          <AccordionItem {...item('set-4')} title="Favoriten">
            <p>
              Ein Favorit besteht aus <strong>Von-Ort</strong>, <strong>Nach-Ort</strong>,
              optionalem <strong>Anlass</strong> und optionalem <strong>Träger</strong>. Er
              erscheint auf dem Dashboard unter „Ein Tipp genügt" und legt dort mit einem
              Tipp die Fahrt für heute an.
            </p>
            <p>Gelöschte Favoriten lassen sich über „Rückgängig" zurückholen.</p>
          </AccordionItem>

          <AccordionItem {...item('set-5')} title="Profil & Passwort">
            <p>
              E-Mail, voller Name, IBAN sowie Kirchengemeinde, Kirchspiel und Kirchenkreis —
              diese Angaben erscheinen auf den Abrechnungen. Hinter der E-Mail steht, ob sie
              verifiziert ist; die Verifizierungs-Mail lässt sich dort erneut anfordern.
            </p>
            <p>
              Darunter änderst du das <strong>Passwort</strong>: aktuelles Passwort, neues
              Passwort, Wiederholung. Das neue Passwort braucht mindestens 8 Zeichen mit Groß-
              und Kleinbuchstaben und einer Zahl; die Prüfliste hakt live mit ab.
            </p>
          </AccordionItem>

          <AccordionItem {...item('set-6')} title="Darstellung">
            <p>
              Drei Optionen: <strong>Hell</strong>, <strong>Dunkel</strong> und
              <strong> System</strong> (folgt der Einstellung deines Geräts). Die Wahl gilt
              sofort und bleibt gespeichert.
            </p>
          </AccordionItem>

          <AccordionItem {...item('set-7')} title="API-Zugriff">
            <p>
              Hier erzeugst du API-Schlüssel für externe Anwendungen und Kurzbefehle. Jeder
              Schlüssel bekommt eine Beschreibung, damit du ihn später wiedererkennst.
            </p>
            <p>
              <strong>Wichtig:</strong> Der Schlüssel wird genau einmal im Klartext angezeigt
              — kopiere ihn sofort. Danach siehst du nur noch den Eintrag in der Liste und
              kannst ihn löschen. Ein gelöschter Schlüssel funktioniert sofort nicht mehr.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Verwaltung ================= */}
        <Abschnitt
          id="verwaltung"
          titel="Verwaltung (nur Admins)"
          satz={'Der Bereich erscheint ausschließlich bei Konten mit der Rolle „Administrator".'}
        >
          <AccordionItem {...item('vw-1')} title="Nutzer anlegen, bearbeiten, löschen">
            <p>
              Auf dem Desktop liegt „Verwaltung" als eigener Eintrag in der Seitenleiste,
              auf dem Handy als Punkt in der Einstellungsliste.
            </p>
            <p>
              Beim <strong>Anlegen</strong> sind E-Mail und Benutzername Pflicht; dazu kommen
              Rolle (Benutzer oder Administrator), voller Name, IBAN sowie Kirchengemeinde,
              Kirchspiel und Kirchenkreis. Dieselben Felder lassen sich später bearbeiten.
            </p>
            <p>
              <strong>Löschen</strong> läuft in zwei Schritten: Der erste Klick auf das
              Papierkorb-Symbol schaltet es scharf („Sicher?"), der zweite löscht endgültig —
              samt aller Daten des Kontos und ohne Rückgängig. Das eigene Konto lässt sich
              nicht löschen.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Export ================= */}
        <Abschnitt
          id="export"
          titel="Export & Abrechnungsformular"
          satz="Die Excel-Datei ist das offizielle Formular — direkt einreichbar."
        >
          <AccordionItem {...item('ex-1')} title="Was die Excel-Datei enthält">
            <p>
              Der Excel-Export nutzt das <strong>offizielle Dienstfahrten-Abrechnungsformular
              des Kirchenkreises</strong>. Deine Profildaten (Name, Anschrift, IBAN) und die
              Kostenstelle des Trägers stehen im Kopf, die Fahrten mit Datum, Route, Anlass
              und Kilometern in den Zeilen, dazu der Erstattungssatz und die Summen.
            </p>
            <p>
              Deshalb lohnt es sich, das Profil vollständig auszufüllen — sonst musst du im
              Formular nacharbeiten.
            </p>
          </AccordionItem>

          <AccordionItem {...item('ex-2')} title="Quartalsblätter und mehrere Dateien">
            <p>
              Das Formular ist in <strong>Quartalsblätter</strong> gegliedert
              (Januar–März, April–Juni, Juli–September, Oktober–Dezember); die Datei enthält
              das Blatt des passenden Quartals.
            </p>
            <p>
              Pro Blatt passen <strong>maximal 29 Fahrten</strong>. Hast du mehr, teilt die App
              den Export automatisch auf mehrere Dateien auf und liefert sie zusammen als
              <strong> ZIP-Archiv</strong>.
            </p>
          </AccordionItem>

          <AccordionItem {...item('ex-3')} title="PDF als Alternative">
            <p>
              Überall, wo Excel angeboten wird, gibt es auch <strong>PDF</strong> und
              <strong> „Beide (ZIP)"</strong>. Das PDF hat denselben Inhalt und ist praktisch,
              wenn die Abrechnung nur unterschrieben und weitergereicht werden soll.
            </p>
          </AccordionItem>

          <AccordionItem {...item('ex-4')} title="Ausschlussfrist: sechs Monate">
            <p>
              Für Dienstreisen gilt eine <strong>Ausschlussfrist von sechs Monaten</strong> je
              abgeschlossener Dienstreise (§ 3 Abs. 1 BRKG). Dieser Hinweis steht auch auf dem
              Formular selbst.
            </p>
            <p>
              Praktisch heißt das: Reiche jeden Monat zeitnah ein. Die Kachel auf dem
              Dashboard und das Abzeichen an „Abrechnung" zeigen dir, was noch offen ist.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ================= Installation ================= */}
        <Abschnitt
          id="installation"
          titel="App installieren (Homescreen)"
          satz="Das Fahrtenbuch lässt sich wie eine App auf dem Startbildschirm ablegen."
        >
          <AccordionItem {...item('pwa-1')} title="iPhone und iPad (Safari)">
            <ol className="help-ol">
              <li>Öffne das Fahrtenbuch in <strong>Safari</strong>.</li>
              <li>Tippe unten auf das <strong>Teilen-Symbol</strong> (Quadrat mit Pfeil nach oben).</li>
              <li>Wähle <strong>„Zum Home-Bildschirm"</strong>.</li>
              <li>Namen bestätigen, fertig.</li>
            </ol>
            <p>
              Das Symbol liegt danach zwischen deinen Apps, und das Fahrtenbuch startet ohne
              Browserleiste im Vollbild.
            </p>
          </AccordionItem>

          <AccordionItem {...item('pwa-2')} title="Android (Chrome)">
            <ol className="help-ol">
              <li>Öffne das Fahrtenbuch in <strong>Chrome</strong>.</li>
              <li>Tippe oben rechts auf das <strong>Menü</strong> (drei Punkte).</li>
              <li>Wähle <strong>„App installieren"</strong> bzw. „Zum Startbildschirm hinzufügen".</li>
            </ol>
            <p>
              Häufig blendet Chrome die Installation auch von selbst als Leiste am unteren
              Rand ein.
            </p>
          </AccordionItem>

          <AccordionItem {...item('pwa-3')} title="Was bringt die Installation?">
            <p>
              Das Fahrtenbuch startet im Vollbild ohne Adressleiste und ist mit einem Tipp
              erreichbar. Über einen langen Druck auf das Symbol erreichst du direkt
              <strong> „Fahrt erfassen"</strong> und <strong>„Abrechnung"</strong>.
            </p>
            <p>
              Eine Internetverbindung wird weiterhin gebraucht — die Daten liegen auf dem
              Server, nicht auf dem Gerät.
            </p>
          </AccordionItem>
        </Abschnitt>

        {/* ---------------- Kontakt ---------------- */}
        <section className="help-kontakt">
          <h2 className="help-kontakt-titel">Frage offen geblieben?</h2>
          <p className="help-kontakt-satz">
            Wenn hier etwas fehlt, etwas nicht funktioniert oder du eine Idee für das
            Fahrtenbuch hast — schreib einfach.
          </p>
          <a href="mailto:support@kkd-fahrtenbuch.de" className="btn-primary help-kontakt-btn">
            <Mail size={16} aria-hidden="true" />
            support@kkd-fahrtenbuch.de
          </a>
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
