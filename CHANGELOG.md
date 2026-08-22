# Changelog

Alle nennenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung folgt [SemVer](https://semver.org/lang/de/).

## [Unreleased] - 2.3.0

### Hinzugefügt
- Anlässe lassen sich als eigene Liste pflegen und beim Erfassen einer Fahrt direkt auswählen; neue Anlässe können dabei ohne Umweg angelegt werden. Häufig genutzte stehen oben. Die bisher genutzten Anlässe werden einmalig übernommen, und das Löschen eines Anlasses lässt bereits erfasste Fahrten unverändert
- Langes Tippen auf das App-Symbol bietet „Fahrt erfassen" und „Letzte Fahrt wiederholen" an — beide öffnen die Erfassung direkt, ohne den Umweg über die Startseite
- Ein Tipp auf einen Balken im Kilometer-Diagramm zeigt die Werte des Monats: Kilometer, Anzahl der Fahrten, Erstattung und Status. Am Rechner genügt weiterhin der Mauszeiger
- Das Fahrtenbuch lässt sich als App auf Startbildschirm oder Desktop installieren und startet dann ohne Browser-Leiste
- Beim ersten Start der App lässt sich der eigene Kirchenkreis aus einer Liste wählen; die Anmeldung läuft danach gegen dessen Fahrtenbuch. Kommt ein Kirchenkreis dazu, erscheint er ohne App-Update
- Bei einer neuen Version erscheint ein Hinweis mit „Neu laden" — der Wechsel passiert erst nach Bestätigung, laufende Eingaben gehen nicht verloren
- Ohne Internetverbindung öffnet die App weiterhin und meldet klar, dass gerade keine Verbindung besteht, statt eine leere Browser-Fehlerseite zu zeigen; sobald die Verbindung zurück ist, gibt es ebenfalls einen Hinweis
- Der Kirchenkreis lässt sich in den Einstellungen der App nachträglich wechseln; zur Sicherheit meldet der Wechsel ab, damit die Anmeldung immer zum gewählten Fahrtenbuch gehört
- Ist die Liste der Kirchenkreise beim ersten Start nicht erreichbar, zeigt die App die ihr bekannten Kirchenkreise samt Hinweis und einer Möglichkeit, es erneut zu versuchen
- Die App nutzt auf iPhone und Android die Navigationsleiste des Betriebssystems selbst — auf dem iPhone die schwebende Glasleiste mit gefülltem Symbol, auf Android die gewohnte Leiste mit farbig hinterlegtem aktivem Eintrag. Sie sieht damit nicht nur so aus wie die des Systems, sie ist es, samt Bewegung, Anzeige der Zahl offener Abrechnungen und Bedienhilfen. Ihre Farben folgen weiterhin dem Fahrtenbuch und wechseln mit hellem und dunklem Design. Im Browser bleibt alles wie bisher
- Ein Tabwechsel in der App gibt eine kurze, dezente Rückmeldung über die Vibration des Geräts
- Die Zurück-Taste auf Android schließt zuerst ein offenes Fenster, geht dann eine Seite zurück, danach auf die Startseite — und beendet die App erst, wenn es nichts mehr zurückzugehen gibt
- Beim Öffnen der App erscheint ein Startbildschirm mit Logo und Namen, bis die Anmeldung geladen ist
- Von der Anmeldung der App führt ein Weg zurück zur Auswahl der Kirchenkreise, falls man sich vertan hat

### Geändert
- Startort, Datum, Anlass und Abrechnungsträger klappen ihre Auswahl jetzt mit einem Tipp direkt auf, statt erst ein Zwischenmenü zu zeigen. Beim Datum öffnet sich die Auswahl des Geräts sofort
- „Fahrt bearbeiten" ist genauso aufgebaut wie das Erfassen einer Fahrt: dieselbe Auswahl für Orte, Datum, Anlass und Abrechnungsträger. Die Angabe „Einmaliger Ort" entfällt — eine einmalige Adresse steht jetzt als letzter Eintrag in der Ortsliste
- Ist für eine Strecke bereits eine Entfernung hinterlegt, zeigt das Bearbeiten-Fenster kein Kilometerfeld mehr, sondern die Kilometer samt Stift zum Korrigieren — wie beim Erfassen
- Die Übersicht über der Fahrtenliste zeigt jetzt Anzahl der Fahrten, Kilometer und Erstattung nebeneinander und darunter jeden Abrechnungsträger mit seiner Summe. Damit steht der ganze Monat auf einen Blick da, ohne in die Abrechnung zu wechseln
- Jede Fahrt steht jetzt in einer eigenen Karte: oben das Datum, darunter der Anlass und der Weg in einer Zeile, rechts Erstattung und Kilometer. Lange Anlässe werden nicht mehr abgeschnitten
- Statt „+1" stehen bei einer Fahrt jetzt die Namen der Mitfahrer:innen
- Startseite und Fahrtenliste zeigen die Fahrten in derselben Darstellung
- Die Farben im Kilometer-Diagramm entsprechen jetzt denen der Abrechnung — erfasst, eingereicht und erstattet sehen überall gleich aus
- In der App liegt die Anmeldung jetzt im gesicherten Bereich des Geräts statt im Browserspeicher, geschützt durch die Bildschirmsperre. Wer bereits angemeldet ist, bleibt es — die Übernahme passiert beim ersten Start von selbst. Im Browser ändert sich nichts
- Beim Start der App erscheint kurz eine ruhige Fläche, bis die gespeicherte Anmeldung gelesen ist; die Anmeldemaske blitzt dadurch nicht mehr auf, wenn man bereits angemeldet ist
- Die Anmeldung hält jetzt, solange man das Fahrtenbuch benutzt — das tägliche Neuanmelden entfällt. Wer es längere Zeit nicht öffnet, wird weiterhin abgemeldet; an geteilten Rechnern bleibt also niemand dauerhaft angemeldet
- Das Logo auf der Anmeldeseite zeigt jetzt dasselbe Zeichen wie das App-Symbol, samt Punkt am offenen Ende des Rings
- Die Fahrtenliste zeigt die Fahrten auf dem Handy jetzt im selben Layout wie das Dashboard: eine zusammenhängende Liste statt einzelner Kacheln, mit Anlass, Strecke, Datum, Träger und Status untereinander und Kilometern samt Erstattung rechts. Es passen dadurch spürbar mehr Fahrten auf den Bildschirm. Mitfahrer:innen, der Hinweis auf verknüpfte Hin- und Rückfahrten und alle Aktionen bleiben erhalten; am Rechner bleibt die Tabelle unverändert
- In der App liegt „Fahrt hinzufügen" jetzt als eigener runder Knopf rechts in der Navigationsleiste des Systems statt als schwebender Knopf über dem Inhalt. Er ist von jeder Ansicht aus erreichbar und verdeckt keine Fahrten mehr. Im Browser bleibt der bisherige Weg unverändert
- In der Fahrtenliste stehen Start und Ziel jetzt untereinander statt nebeneinander. Adressen mit Straße und Postleitzahl sind damit vollständig zu lesen; vorher blieb vom Ziel oft nur ein abgeschnittener Anfang übrig
- Der Abrechnungsträger hat in der Fahrtenliste eine eigene Zeile und wird nicht mehr mitten im Namen abgeschnitten
- Der Pfeil am rechten Rand der Listen ist entfernt. Die Zeilen lassen sich weiterhin antippen, der gewonnene Platz gehört jetzt dem Text
- Die Liste auf der Startseite ist genauso aufgebaut wie die Fahrtenliste: Start und Ziel untereinander, der Abrechnungsträger auf eigener Zeile. Auch dort wird jetzt nichts mehr mitten im Wort abgeschnitten
- „Erfasst" steht nicht mehr an jeder einzelnen Fahrt. Der Status gilt ohnehin für den ganzen Monat eines Abrechnungsträgers und steht weiter oben in der Übersicht. Bei einer Auswahl über mehrere Monate erscheint er weiterhin an den Fahrten, die bereits eingereicht oder erstattet sind
- Die Fahrtenliste ist deutlich kompakter: Das Datum steht jetzt vorn in der ersten Zeile, der Anlass daneben, Start und Ziel darunter. Der Abrechnungsträger entfällt in der Liste — er steht in der Übersicht darüber. Es passen dadurch spürbar mehr Fahrten auf den Bildschirm, und Adressen mit Straße und Postleitzahl bleiben vollständig lesbar
- Die App startet spürbar schneller und zeigt beim Start weder einen weißen Bildschirm noch kurz die Anmeldung, wenn man bereits angemeldet ist
- Kilometer und Betrag stehen in derselben Zeile wie Anlass und Datum, damit die Summe jeder Fahrt immer an derselben Stelle steht
- Der Hinweis auf verknüpfte Hin- und Rückfahrten erscheint jetzt auch auf der Startseite
- Während des Starts dreht sich das Zeichen, solange geladen wird
- Die Reichweitenmessung wurde ersatzlos entfernt
- Die Kilometer der letzten Monate erscheinen jetzt auch in der App als Balkendiagramm am Ende der Startseite
- Die Fahrtenliste zeigt Kilometer und Erstattung in einer eigenen Übersicht über der Liste; jede Fahrt steht auf einer eigenen Karte
- Der Fortschritt einer Abrechnung (Erfasst → Eingereicht → Erstattet) ist in der Monatsübersicht immer sichtbar, ohne die Karte zu öffnen
- In der Abrechnung lässt sich ein Träger auch ohne Export als eingereicht markieren — für alle, die die Abrechnung auf anderem Weg abgegeben haben
- Die Anmeldung hält jetzt zwei Wochen und verlängert sich bei Nutzung; das tägliche Neuanmelden entfällt

### Behoben
- In der App verdeckte die Tastatur das Eingabefeld, in das man gerade schreibt — in jedem Fenster mit Eingabefeldern: Anlässe, Orte, Träger, Profil, Fahrt erfassen und bearbeiten, Mitfahrer. Das Fenster rückt jetzt über die Tastatur, die Navigationsleiste tritt zurück, solange getippt wird, und der Platz, den sie sonst freihält, bleibt nicht als leerer Streifen stehen. Das Feld bleibt sichtbar, auch beim Wechsel ins nächste. Ebenso auf der Anmeldeseite, wo Benutzername und Passwort hinter der Tastatur liegen konnten
- Die Mitnahmeentschädigung im Abrechnungsformular rechnete alle Fahrten mit dem zuletzt eingetragenen Satz, auch ältere. Wurde der Satz zum Beispiel zum 1. Juli erhöht, wies eine Abrechnung über Mai bis Juli auch für Mai und Juni zu hohe Beträge aus, und ein erst künftig gültiger Satz wirkte bereits. Jede Fahrt wird jetzt mit dem Satz gerechnet, der an ihrem Datum galt; wechselt der Satz innerhalb des Zeitraums, weist das Formular den sich ergebenden Mischsatz aus
- Wurde direkt nach dem Speichern „Rückgängig" getippt, während die Fahrt noch gesichert wurde, konnte die Rückfahrt trotzdem angelegt werden und blieb ohne Verbindung zur Hinfahrt stehen — sie wäre unbemerkt mit abgerechnet worden. „Rückgängig" nimmt jetzt in jedem Fall beide Fahrten zurück
- Wurde bei einer Mitfahrerin die Richtung geändert oder ein Tippfehler im Namen korrigiert, verschwand sie beim Speichern ganz aus der Fahrt — bei verknüpften Hin- und Rückfahrten sogar aus beiden. Die Erstattung fehlte damit unbemerkt in der Abrechnung. Änderungen werden jetzt übernommen, ohne den Eintrag zu entfernen
- Beim Bearbeiten einer Fahrt, die mit einer Gegenfahrt verknüpft ist, konnten Mitfahrer:innen der anderen Fahrt verloren gehen, obwohl sie gar nicht angefasst wurden — etwa beim bloßen Korrigieren der Kilometer. Es verschwindet jetzt nur noch, was tatsächlich entfernt wurde
- Wurde eine Mitfahrerin von „Hin- und Rückfahrt" auf eine einzelne Richtung umgestellt, blieb sie an der Gegenfahrt weiterhin für beide Strecken eingetragen und wurde doppelt erstattet. Beide Fahrten bleiben jetzt stimmig
- Beim Anlegen einer Fahrt wurde der Abrechnungsträger mitten im Namen abgeschnitten, während das Wort „Abrechnungsträger" groß daneben stand. Jetzt steht der Name groß und vollständig da, notfalls über zwei Zeilen, und die Bezeichnung klein darüber
- Beim Bearbeiten einer Fahrt wurden von Hand eingetragene Kilometer beim Öffnen stillschweigend durch die hinterlegte Entfernung ersetzt — ein eingetragener Umweg ging beim nächsten Speichern verloren. Die eingetragenen Kilometer bleiben jetzt stehen; die hinterlegte Entfernung lässt sich auf Wunsch übernehmen
- Die Esc-Taste schloss zwei übereinanderliegende Fenster gleichzeitig — wer aus der Erfassung heraus Mitfahrer:innen eintrug, verlor damit die halb erfasste Fahrt. Sie schließt jetzt immer nur das oberste Fenster
- Frisch gespeicherte Fahrten ließen sich in der Fahrtenliste antippen, bevor sie gesichert waren; Bearbeiten oder Löschen schlug dann fehl. Sie sind jetzt bis zur Sicherung gesperrt
- Beim Wechsel des Startorts blieb eine von Hand eingetragene Kilometerzahl stehen und galt stillschweigend für die neue Strecke
- Im Kilometerfeld erschien nach dem Leeren sofort wieder die alte Entfernung, sodass sich kaum ein neuer Wert eintippen ließ
- Beim Tippen in einem Fenster sprang der Inhalt gelegentlich an den Anfang zurück
- In der App fehlte auf der Anmeldung der Knopf „Registrieren", ebenso der Name des Kirchenkreises und der Hinweis auf zugelassene E-Mail-Domains. Die App holt diese Angaben jetzt vom gewählten Fahrtenbuch; ist es nicht erreichbar, öffnet die Anmeldung trotzdem
- In der App führten „Excel", „PDF" und „Beides" zu keiner Datei — der Export öffnet jetzt das Teilen-Fenster, aus dem sich die Abrechnung sichern oder direkt versenden lässt. Ein Abbruch dort gilt nicht mehr als Fehler
- In der App tritt die Navigationsleiste zurück, sobald sich ein Fenster von unten öffnet, und kommt beim Schließen wieder — der untere Rand eines solchen Fensters ist dadurch immer erreichbar
- In der App standen an den Rändern des Bildschirms helle bzw. schwarze Streifen. Die Ränder tragen jetzt die Farbe des jeweiligen Bildschirms — Petrol auf Startbildschirm und Anmeldung, die normale Fläche in der angemeldeten Ansicht, hell wie dunkel. Auch die Uhrzeit und die Symbole der Statusleiste sind dadurch immer lesbar
- Fenster, die sich von unten öffnen, lassen sich jetzt durch Wischen nach unten schließen — am Griff oder an der Titelzeile. Ein zu kurzer Zug federt zurück, und solange der Inhalt noch gescrollt wird, bleibt das Wischen beim Inhalt
- Solche Fenster werden nie höher als der Bildschirm: Griff und Titel stehen fest, der Inhalt scrollt darunter. Vorher konnte bei langen Formularen der obere Rand mitsamt Griff wegscrollen
- In der App machte das Datumsfeld unter „Fahrt bearbeiten" das Fenster so hoch, dass es sich nicht mehr schließen ließ. Es ist jetzt genauso hoch wie jedes andere Eingabefeld; die Datumsauswahl des Geräts öffnet sich weiterhin wie gewohnt
- In der App verschwand die letzte Fahrt einer Liste halb hinter der Navigationsleiste. Listen enden jetzt immer mit sichtbarem Abstand darüber
- Unter „Fahrt bearbeiten" lief der Name des Abrechnungsträgers unter das Auswahlsymbol und wirkte dadurch angeschnitten. Längere Namen sind jetzt vollständig lesbar; das gilt für alle Auswahlfelder im Fahrtenbuch

### Sonstiges
- Fahrten und Abrechnungen werden bewusst nicht offline zwischengespeichert: angezeigte Zahlen stammen immer vom Server
- Die App darf auf iOS und Android auf die Schnittstelle zugreifen, ohne dass die Absicherung der Weboberfläche gelockert wird

## [2.2.0] - 2026-08-14

### Added
- Abrechnung über mehrere Monate: Statt Monat für Monat lässt sich ein Zeitraum wählen — etwa ein Quartal — und alles landet in einer Abrechnung; bei mehreren Dateien automatisch als ZIP
- Kostenstelle je Abrechnungsträger, die automatisch in den Export übernommen wird
- „Rückfahrt hinzufügen": legt die Gegenrichtung einer Fahrt am selben Tag an — ein Tipp statt vollständiger Neuerfassung
- Der Wohnort steht jetzt im Profil, mit Hinweis wenn keiner gesetzt ist: Er liefert die Anschrift auf dem Abrechnungsformular
- Hilfeseite (/help) komplett neu: Inhaltsverzeichnis mit Sprungmarken und aufklappbare FAQ zu jedem Bereich der App (Start, Fahrt erfassen, Fahrten, Abrechnung, Statussystem, Mitfahrer:innen, Einstellungen, Verwaltung, Export & Formular, Installation auf dem Homescreen) — im Design des Redesigns 2026, hell wie dunkel
- „+ Neue Fahrt" in der Fahrtenliste (Desktop) und FAB auf Mobilgeräten — gleicher Erfassungsflow wie auf dem Dashboard
- Einreichen fragt nach dem Exportformat (Excel / PDF / Beides als ZIP), statt stillschweigend Excel zu laden
- Mitfahrer-Hinweis auch in der Startseiten-Tabelle (gedeckt), in der Fahrtenliste farblich abgesetzt mit Punkt
- Fahrten mit Mitfahrern zeigen die Mitfahrer-Erstattung als kleine Zweitzahl unter dem Betrag (Fahrtenliste mobil + desktop, Dashboard „Letzte Fahrten"); Backend liefert `mitfahrerErstattung` jetzt pro Fahrt
- Kilometer-Chart: Hover/Fokus öffnet eine Monats-Aufschlüsselung (km, Fahrten, Erstattung, Mitfahrer-Anteil, Status)
- Dashboard „Unterwegs": zeigt das Einreich-Datum („am 05.04. · seit 124 Tagen", heute = „heute")
- Dashboard desktop: Favoriten-Kachelreihe „Ein Tipp genügt" (fehlte am Desktop komplett — Favoriten waren nur mobil sichtbar)
- Dashboard „Unterwegs": listet jetzt ALLE eingereichten Monate einzeln, jeder mit ✓-Schnellaktion „als erstattet markieren" (mit Rückgängig)
- Redesign 2026, Fundament: Design-Token-Set (`tokens.css`) mit zwei eigenständig abgestimmten Modi (hell/dunkel), Statusklassen Erfasst/Eingereicht/Erstattet, Toast- und Empty-State-Bausteine, `.num`-Utility für Zahlen in JetBrains Mono
- PWA-Grundlagen: Manifest mit Icons und Shortcuts, self-hosted Fonts (Instrument Sans, JetBrains Mono), neues App-Icon inkl. Favicon
- Toast-System (`ToastProvider`/`useToast`): Erfolg/Fehler mit Statuskreis, „Rückgängig"-Aktion, aria-live; mobil über der Bottom-Nav, Desktop unten rechts
- StatusBadge-Komponente mit drei Darstellungsformen (Badge, Punkt+Wort, Fortschrittsleiste) und zentralem Wording-Mapping (`utils/statusLabels.js`)
- Sheet-Komponente: mobil Bottom-Sheet mit Griff und Fokusfalle, ab 768 px zentriertes Modal-Panel
- EmptyState-Komponente (gestrichelter Rahmen, Icon-Fläche, Primäraktion)
- Zweistufiger Erfassungsflow als Sheet: „Wohin?" (Ortsliste nach Häufigkeit mit Distanz vom Startort, Startort/Datum antippbar, freie Zieleingabe) und „Bestätigen" (km · € live aus dem Erstattungssatz, Anlass-Chips aus dem Verlauf des Ziels, Rückfahrt-Switch mit Verlaufs-Heuristik, Trägerauswahl); Speichern optimistisch mit Toast + „Rückgängig", Rückfahrt legt eine zweite Fahrt an
- `useErfassung().open(prefill?)` als zentraler Einstieg für alle „Neue Fahrt"-Aktionen (Prefill-Signatur für „Wiederholen"/FAB bereits enthalten)
- Dashboard komplett neu (mobil + Desktop): Hero-Karte mit dem ältesten nicht eingereichten Monat („Alles abgerechnet" als Erfolgszustand), „Ein Tipp genügt"-Favoriten-Kacheln (legen die Fahrt sofort an, Toast mit „Rückgängig"), „Zuletzt" mit Wiederholen-Button, FAB über der Bottom-Nav; Desktop mit tageszeitabhängiger Begrüßung, Trägerkacheln im Hero, Karten „{Monat} bisher"/„Unterwegs", Tabelle „Letzte Fahrten" und Kilometer-Chart (Balkenfarbe = Monatsstatus)
- Fahrtenliste komplett neu: Segmented Control (aktueller Monat / Vormonat / Zeitraum mit ausklappbarer Von-/Bis-Wahl und „Offene anzeigen"), Summenzeile „km · €" mit Export-Sheet (Excel/PDF/ZIP je Träger); mobil Karten mit Wischen-nach-links für Bearbeiten/Löschen (auch per Tipp/Tastatur erreichbar), ab 768 px Tabelle mit Inline-Aktionen inkl. „Wiederholen" über den Erfassungsflow; Bearbeiten öffnet das Formular im Sheet, leerer Monat mit konkretem Empty-State
- Abrechnung komplett neu: mobil Monatskarten (fällige Monate aufgeklappt mit Fortschrittsleiste, Trägerzeilen und Einreichen-Button; übrige eingeklappt mit Statuspunkt + Datum, erstattete gedimmt), ab 768 px die Matrix Monat × Träger mit klebender Monatsspalte, „Details"-Aufklappzeile, Kopf-Aktionen „Zeitraum-Export" und „{ältester fälliger Monat} einreichen"; „Einreichen" stößt den Excel-Export je offenem Träger an und setzt die Status direkt mit Toast + „Rückgängig" — Download-Button exportiert ohne Statuswechsel
- Einstellungen komplett neu: statt acht Tabs eine Bereichsliste (desktop links 212 px, Inhalt in einer Karte; mobil Vollbild-Liste mit Drilldown) — Orte & Distanzen · Abrechnungsträger · Erstattungssätze · Favoriten · Mitfahrer · Profil & Passwort · Darstellung · API-Zugriff, Verwaltung (Admin) mobil in der Liste; kleine Formulare öffnen als Sheet, Tabellen mit 36×36-px-Aktionen, Löschen direkt mit Undo-Toast wo möglich
- Bereich „Darstellung": genau drei Optionen Hell / Dunkel / System mit Radio-Semantik; der provisorische Umschalter aus der Kopfzeile entfällt
- Anmeldung nach Redesign-Spec: zentrierte Formularkarte auf Markenfläche, Logo-Kachel 52 px, Felder/Primärbutton 52 px; Registrierung und Passwort-vergessen im selben Layout statt als Modals, Passwort-Reset-/Setzen-Seiten und E-Mail-Verifizierung nachgezogen

### Changed
- Mitfahrer:innen lassen sich jetzt direkt beim Erfassen eintragen, nicht erst nachträglich über „Bearbeiten"
- Im Erfassungsflow führt eine „Zurück"-Schaltfläche zur Zielauswahl — bisher kam man nur über einen Klick auf die Route dorthin, was nicht erkennbar war
- Zusammengehörige Fahrten: Beim Überfahren einer Zeile wird die passende Hin- oder Rückfahrt mit hervorgehoben; das Detail zeigt die Gegenfahrt samt Strecke, Kilometern und Betrag
- „Rückfahrt hinzufügen" erscheint nicht mehr, wenn es bereits eine gibt — und wieder, sobald die Gegenfahrt gelöscht wurde
- Meldungen erscheinen auf dem Handy jetzt oben statt unten, wo sie von der Navigationsleiste verdeckt wurden
- Dialoge liegen auf dem Handy vollständig über der Navigationsleiste; ihr unterer Teil war vorher nicht bedienbar
- Das Fahrtenbuch lässt sich als App auf dem Homescreen installieren — der Hinweis dazu steht jetzt in den Neuigkeiten
- Läuft die Anmeldung ab oder wird das Konto entfernt, erscheint wieder die Anmeldeseite statt einer leeren weißen Seite
- Mitfahrer:innen, die für „Hin- und Rückfahrt" eingetragen sind, erscheinen jetzt bei beiden Fahrten: Legt man über „Rückfahrt hinzufügen" die Gegenrichtung an, gehören die beiden Fahrten zusammen und die Eintragung gilt für beide. Wird eine der beiden gelöscht, verschwindet die zugehörige Hälfte mit — bisher blieb sie stehen und wurde weiter erstattet
- Zusammengehörige Hin- und Rückfahrten sind in der Fahrtenliste an einem Doppelpfeil erkennbar; beim Löschen weist ein Hinweis auf die Gegenfahrt hin
- Schlägt beim Registrieren der Mailversand fehl, wird kein halbes Konto mehr angelegt: Statt einer Fehlerseite erscheint der Hinweis, es später erneut zu versuchen — und der gewünschte Benutzername bleibt frei. Vorher existierte das Konto bereits ohne Passwort, und ein zweiter Versuch scheiterte an „Name bereits vergeben"
- Mitfahrer:innen stehen im Fahrt-Formular jetzt an der richtigen Stelle — als eigenes Feld zwischen Abrechnung und den Schaltflächen statt unterhalb von „Fahrt speichern". Jeder Eintrag zeigt Name, Arbeitsstätte und ob die Person hin, zurück oder beides mitgefahren ist; Antippen bearbeitet ihn
- Die Auswahl im Mitfahrer-Dialog heißt jetzt „Nur die Hinfahrt / Nur die Rückfahrt / Hin- und Rückfahrt" statt „Hin / Rück / Hin & Rück"
- Feldbeschriftungen im Fahrt-Formular einheitlich: „Startort" und „Zielort" sehen aus wie „Anlass", „Kilometer" und „Abrechnung"
- Lange Dialoge (Neuigkeiten, Info) öffnen auf dem Handy von oben — vorher begannen sie unterhalb des sichtbaren Bereichs und man landete mitten im Text
- Listen überall gleich bedienbar: Ein Tipp auf eine Zeile öffnet alle Angaben und die möglichen Aktionen — statt kleiner Symbole in der Zeile und einer Wischgeste bei den Fahrten. Gilt für Fahrten, Startseite, Abrechnungsträger, Orte, Distanzen, Favoriten, Erstattungssätze und API-Zugriff, auf dem Handy wie am Rechner
- Einstellungen: „Profil & Passwort" steht jetzt an erster Stelle; auf dem Handy sind Neuigkeiten, Hilfe und Info beschriftet statt nur als Symbole
- PDF-Export sieht jetzt 1:1 wie die Excel-Liste aus: Statt das Formular nachzuzeichnen, wird die fertige Excel-Arbeitsmappe nach PDF konvertiert (LibreOffice headless im Backend-Container) — ein PDF ist damit genau „das Excel gedruckt", nur leichter zu drucken. Chunking (29 Zeilen je Blatt), ZIP ab zwei Dateien und der Mitfahrer-Export verhalten sich wie beim Excel-Export
- Statusmeldungen benennen die Aktion („Als erstattet markiert.", „Status zurückgesetzt — wieder ‚Erfasst'.") statt „wurde aktualisiert"; Backend-Fehlermeldungen erscheinen im Toast
- Frontend-Version auf 2.2.0 gesetzt (war 1.6.0 und damit weit hinter dem Stand)
- Favoriten-Tipp fragt jetzt kurz nach: „Hin- und Rückfahrt" oder „Nur Hinfahrt" (statt stillschweigend nur die Hinfahrt anzulegen)
- Fahrt löschen fragt vor dem Löschen nach (Datum, Ziel, Anlass, km werden gezeigt); der Rückgängig-Toast bleibt als zweites Netz
- Info- und Neuigkeiten-Dialog ins neue Design umgezogen (Sheet statt Alt-Modal); Impressum und Datenschutzerklärung als Unteransichten mit Zurück-Navigation statt gestapelter Modals
- Verwaltung (Admin): Benutzer-Übersicht als Tabelle (desktop) bzw. gestapelte Zeilenliste (mobil) statt Kacheln — Spalten Benutzer, E-Mail (+ Verifiziert-Status), Rolle, Aktionen; Anlegen/Bearbeiten als Sheet, Löschen weiter mit Inline-Zweischritt
- Dashboard desktop neu komponiert: Vierer-Kachel-Grid oben (Noch nicht eingereicht · Monat bisher · Unterwegs · Kilometer-Chart), darunter Favoriten, unten „Letzte Fahrten" in voller Breite mit ↻-Schnellbutton pro Zeile (Fahrt für heute wiederholen)
- Dashboard „Letzte Fahrten": Spalte zeigt nur noch den Anlass (Ziel entfällt, Route im Tooltip); Träger-Spalte schmaler mit Zeilenumbruch, Datum ohne Jahr
- Sidebar-Werkzeugknöpfe dezenter: rahmenlos, Teal-Hover statt grauer Kacheln
- Einstellungen: „Mitfahrer" (Mitfahrer-Erstattungssatz) ist jetzt Unterabschnitt von „Erstattungssätze" statt eigener Bereich
- Sidebar unten: Werkzeugleiste mit Dark-Mode-Schalter, Neuigkeiten, Info und Hilfe über der Nutzerzeile; Abmelden sitzt als Icon direkt an der Nutzerzeile
- Dashboard „Letzte Fahrten": schlankere Zeilen — nur noch der Anlass (Route als Tooltip)
- Fahrtenseite: Monats-Status-Chips der Erstattungsübersicht tragen jetzt Statusfarben (Sand für Eingereicht, Grün für Erstattet, gestrichelt für Erfasst)
- Navigation: „Mehr" heißt jetzt „Einstellungen" (mit Zahnrad-Icon)
- Tailwind auf semantische Farbnamen umgestellt (brand/accent/ok/danger/surface/line/bg/text); alte primary-/secondary-Klassen laufen übergangsweise über Aliasse weiter
- Komponentenklassen nach Design-Spec: Eingabefelder 52 px/16 px (kein iOS-Zoom mehr), Buttons 48 px, Icon-Buttons 48×48 px, einheitlicher Fokusring ohne Layout-Sprung
- Theme-Auswahl auf Hell/Dunkel/System reduziert (Default: Systemeinstellung); gespeicherte alte Theme-Werte werden migriert
- index.html: deutsche Sprache/Beschreibung, Titel „Fahrtenbuch", dynamische theme-color
- App-Shell umgebaut: Bottom-Nav mit vier Zielen (Start/Fahrten/Abrechnung/Mehr) auf Mobilgeräten, Sidebar 232 px mit Nutzerzeile ab 768 px; Fälligkeits-Punkt bzw. Zähler-Badge auf „Abrechnung"
- Bestätigungen laufen ohne Modal: Löschen (Fahrten, Orte, Distanzen, Mitfahrer, Favoriten) direkt mit Toast + „Rückgängig"; Favoriten-Tipp legt die Fahrt sofort an; Export-Formatwahl als direkte Buttons; Statusanzeige heißt jetzt Erfasst/Eingereicht/Erstattet
- Neue Fahrten laufen nur noch über den Erfassungsflow; `FahrtForm` dient ausschließlich dem Bearbeiten bestehender Fahrten (Create-Code entfernt)
- Status in der Fahrtenliste einheitlich über StatusBadge (Punkt+Wort; Zeitraum als Monats-Chips); Status-Reset bei „Erstattet" funktioniert wieder (Klick lief zuvor ins nie öffnende Modal); Erstattungen je Träger als neutrale Karte statt farbiger KPI-Kacheln
- Statusaktionen der Abrechnung laufen direkt mit Undo-Toast statt über das Bestätigungs-Modal; der Datums-Dialog (Nachfolger des AbrechnungsStatusModal) ist ein kompaktes Sheet und existiert nur noch einmal global — der Doppel-Mount, bei dem die Abrechnungs-Instanz `singleMonth` nicht übergab, ist behoben

### Fixed
- Beim Export über mehrere Monate wurden auch Monate ohne Fahrten als eingereicht markiert. Sie standen danach dauerhaft in der Übersicht, ohne je abschließbar zu sein
- Mitfahrer:innen mit „Nur die Rückfahrt" wurden an der Hinfahrt gespeichert statt an der Rückfahrt
- Beim Löschen einer von zwei zusammengehörigen Fahrten verschwand die mitfahrende Person auch von der verbleibenden Fahrt. Sie bleibt jetzt dort und gilt für die verbliebene Richtung
- Das App-Symbol zeigte den Punkt neben statt auf dem Ring
- Abrechnungsformular (Excel **und** PDF): Kostenträger, Name, Anschrift und IBAN blieben im Quartals- und im Mitnahmeblatt leer bzw. standen auf „0", weil diese Felder im Template per Querverweis aus dem Vorlage-Blatt kamen und beim Schreiben ohne berechneten Wert zurückblieben — sie werden jetzt direkt gefüllt, ebenso Ausstellungsdatum, Gesamt-km und die Mitnahme-Erstattung
- PDF des normalen Abrechnungsexports enthält keine leere Seite „Mitnahmeentschädigung" mehr (in der Excel-Datei bleibt das Blatt erhalten)
- Fortschrittsleiste (mobil): „Erstattet" als Endstation zeigt jetzt den Haken statt eines leeren Kreises
- Dashboard-Kacheln der unteren Zeile sind gleich hoch; die „Unterwegs"-Liste scrollt innerhalb ihrer Kachel
- Statuswechsel scheiterte, sobald irgendwo eine Mitfahrer-Erstattung existierte: die Spalte `abrechnungen.typ` enthält Träger-IDs und den Text „mitfahrer" gemischt, wodurch MySQL beim numerischen Vergleich die ganze Spalte casten wollte und abbrach — betraf Einreichen, Erstattet-Markieren und Zurücksetzen (fiel im Zeitraum-Modus auf, weil dort ein Monat mit Mitfahrern enthalten war)
- Info-Dialog zeigte die Version des letzten GitHub-Releases (v1.2.0 von Mai 2025) und bei fehlender Netzverbindung „v1.0.0" — jetzt kommt sie aus dem eigenen Build
- Statusänderungen und alle anderen validierten Endpunkte antworteten bei Eingabefehlern mit einem Absturz (500) statt einer Meldung — Ursache: Zod 4 nennt die Fehlerliste `issues`, nicht `errors`
- „Als erstattet markieren" ohne vorheriges Einreichen meldet jetzt verständlich „muss erst eingereicht werden" (409) statt eines Serverfehlers; die Backend-Meldung erscheint im Toast
- Zeitraum-Übersicht: Monate ohne Vorgang zeigen einen neutralen Strich statt „Erfasst" (Backend liefert dazu die Beträge je Träger und Monat)
- Mitfahrer-Erstattung sauber getrennt: kein gemischter €/km-Satz mehr auf dem Dashboard („0,33 €/km"), stattdessen „davon x € Mitfahrer"; Fahrt-Betrag und Mitfahrer-Betrag werden getrennt berechnet (0,30 €/km Fahrt + 0,05 €/km je Mitfahrer)
- Dashboard-Erfolgszustand meldet jetzt „Alles eingereicht — n Monate warten noch auf die Erstattung" statt pauschal „Alles abgerechnet"
- Einstellungen: der Abmelden-Bereich wurde am Desktop abgeschnitten — Sekundäraktionen erscheinen dort jetzt nur noch mobil
- Abrechnungs-Matrix: aufgeklappte Trägerdetails nutzen jetzt die volle Zeilenbreite (vorher auf 720 px begrenzt)
- Abrechnung: fällige Monate außerhalb des vorgewählten Jahres (z. B. Dezember des Vorjahres) waren in der Liste unsichtbar — die Ansicht weitet sich jetzt automatisch auf „Alle Jahre"
- Abrechnung: Untertitel meldete „nichts wartet auf dich", obwohl eingereichte Monate noch auf die Erstattung warten — zeigt jetzt „{n} Monate warten auf die Erstattung"
- Toasts mit „Rückgängig"-Aktion blieben dauerhaft stehen und stapelten sich — blenden jetzt nach 8 s aus (Abweichung von der Design-Spec, User-Feedback)
- Login zeigte den Platzhalter `DEFAULT_TITLE` statt des App-Titels (unersetzte `config.js`-Platzhalter zählen jetzt als „nicht gesetzt")
- Dashboard-Tabelle: Routen-Text lief ohne Abstand in die Träger-Spalte
- Dashboard hing am Monatsfilter des Fahrten-Tabs (KPIs/„Letzte Fahrten" zeigten je nach gewähltem Monat falsche Werte) — alle Dashboard-Daten werden jetzt eigenständig und ungefiltert abgeleitet
- „Wiederholen" (früher „Nochmal") verlor die Mitfahrer der Vorlage-Fahrt — die neue Fahrt übernimmt sie jetzt vollständig
- Bearbeiten einer Fahrt setzte den Abrechnungsträger asynchron auf den Default zurück und überschrieb den gespeicherten Wert (Mount-Effect in `FahrtForm` entfernt)
- Excel-/PDF-Export und Monatsreport zählten Fahrten mit mehreren Mitfahrern mehrfach (Dedup nach Fahrt-ID)
- Export rechnete hartcodiert mit 0,30 €/km statt mit den gepflegten, zeitabhängigen Erstattungssätzen des Trägers

### Removed
- Video-Anleitungen auf der Hilfeseite entfernt (die Aufnahmen zeigten die alte Oberfläche) — neue Videos folgen
- Freies Nachzeichnen des Formulars per PDFKit (samt Abhängigkeit `pdfkit`) — ersetzt durch die Excel-Konvertierung
- Die neun wählbaren Farbthemes (`themes.css`) und die globale Transition auf allen Elementen (`darkMode.css`)
- CRA-Reste (logo192/logo512, Google-Fonts-Link, Standard-Manifest)
- `NotificationModal` (Bestätigungs-/Hinweis-Modal) — vollständig durch Toasts ersetzt; alter Header- und Tab-Streifen zugunsten von Bottom-Nav/Sidebar
- Alte Dashboard-Bausteine (KPI-Cards, Jahres-Statistik-Chart, Erstattungstabelle, Inline-Bearbeiten) sowie ungenutzte `ProfileModal.js`/`HilfeModal.js`
- Alte Abrechnungs-Bausteine: Schnellaktionen-Dropdown (arbeitete auf dem Zeitraum-Filter des Fahrten-Tabs), dreifache Statuszellen-Logik, farbige Träger-KPI-Karten samt Jahres-Summenkacheln und „Abgeschlossene ausblenden"-Filter (erstattete Monate bleiben sichtbar, gedimmt)

### Sonstiges
- Die Mitfahrer-Erstattung wird überall nach derselben Regel berechnet: je Fahrt die Mitfahrenden dieser Fahrt mal deren Kilometer. In der Monats- und der Jahresübersicht wurde bisher die Zahl der Mitfahrenden eines ganzen Zeitraums mit dessen Kilometersumme multipliziert — dort standen zu hohe Beträge. Ausgezahlt wurde nie zu viel: Das Abrechnungsformular hat immer richtig gerechnet
- Alle Bausteine der App sind auf dem aktuellen Stand; bekannte Sicherheitslücken in den verwendeten Bibliotheken sind geschlossen
- Die Seite wird mit zusätzlichen Sicherheitsvorgaben ausgeliefert: Sie lässt sich nicht mehr in fremde Websites einbetten, erlaubt nur noch Inhalte aus bekannten Quellen und gibt beim Wechsel auf externe Seiten keine Adressdaten mehr weiter
- Das Frontend wird mit einem neuen Werkzeug gebaut. Für die Anwendung ändert sich nichts; im Hintergrund verschwinden damit 25 Sicherheitsmeldungen veralteter Build-Abhängigkeiten, und der Build dauert Sekunden statt einer Minute

### Security
- IDOR behoben: Erstattungssätze fremder Nutzer waren les-, änder- und löschbar (Ownership-Check auf Abrechnungsträger)
- IDOR behoben: Mitfahrer fremder Fahrten waren änder- und löschbar (Fahrt-Ownership-Prüfung)
- Cross-User-Schreibzugriff behoben: Distanz-Updates konnten Kilometer fremder Fahrten überschreiben (user_id-Scoping aller `UPDATE fahrten`, Ort-/Träger-Ownership-Validierung)
- Registrierung serverseitig abgesichert: `ALLOW_REGISTRATION`, `ALLOWED_EMAIL_DOMAINS`, `REGISTRATION_CODE` (timing-safe) + Rate-Limits auf Registrierung und Passwort-Reset (5/h)
- mysql2 2.x → 3.23 (kritische RCE-Advisory), ungenutztes verwundbares `xlsx`-Paket entfernt, `npm audit fix` in Backend und Frontend
- Admin-Passwort wird nicht mehr bei jedem Container-Start auf `INITIAL_ADMIN_PASSWORD` zurückgesetzt (nur noch beim Erstlauf)

## [2.1.0] - 2026-04-04

### Changed
- UI-Konsistenz & View-Architektur: globale CSS-Patterns, View-Polish, Navigation überarbeitet (5 Phasen)

## [2.0.0] - 2026-04-03

### Changed
- Design Makeover: Designsystem eingeführt, alle Views modernisiert (7 Phasen)

## [1.6.0] - 2026-03-22

### Added
- PDF-Export, ZIP-Export für Mehrfach-Exporte

### Changed
- App.js von 3056 auf 36 Zeilen refaktoriert (Komponenten-Aufteilung)

## [1.5.0] - 2026-03-22

### Added
- Dashboard, Favoriten, Statistiken, Adress-Autocomplete (Milestone „v1.3 Dashboard & UX")

### Changed
- UX-Polish und Navigations-Umbau (Milestone „v1.4")

## [1.4.0] - 2026-03-22

### Added
- Zeitraum-Auswahl für Exporte, Kostenstellen

## [1.3.0] - 2026-03-22

### Fixed
- Stabilität & Security: Bugfixes, helmet, Zod-Validierung, npm audit (Milestone „v1.1")

## [1.2.0] - 2025-05-15

### Added
- Benutzerfreundliche Verbesserungen (Excel-Export, Distanz-Updates)

## [1.1.0] - 2025-03-20

### Added
- Hilfeseite und Verbesserungen

## [1.0.1] - 2025-02-13

### Added
- Rechtliche Informationen (Impressum/Datenschutz)

## [1.0.0] - 2025-02-13

### Added
- Initial Release: Digitales Fahrtenbuch mit Fahrten-Erfassung, Orten, Distanzen, Abrechnungsträgern und Excel-Export

[Unreleased]: https://github.com/Revisor01/Fahrtenbuch/compare/v2.1...HEAD
