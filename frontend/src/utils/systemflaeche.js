import { IST_NATIVE } from './plattform';

// Farbe der Systemraender (Statusleiste oben, Home-Anzeige unten) in der
// nativen Huelle.
//
// WARUM ueberhaupt noetig: Die WebView zeichnet unter Statusleiste und
// Home-Anzeige. Was dort durchscheint, ist die Flaeche des <html>-Elements —
// nicht die des gerade sichtbaren Bildschirms. Steht dort die App-Flaeche,
// waehrend vorne die Anmeldung in Petrol liegt, bleiben oben und unten helle
// bzw. dunkle Streifen stehen. Deshalb meldet jeder Bildschirm, welche Flaeche
// er traegt, und <html> uebernimmt sie.
//
// Im Browser passiert hier nichts: das Attribut wird nur in der nativen Huelle
// gesetzt, die Weboberflaeche bleibt unveraendert.

// 'brand'  — ganzflaechig Petrol (Startbildschirm, Anmeldung, Instanz-Wahl)
// 'app'    — normale App-Flaeche (angemeldete Ansicht)
const STANDARD_FLAECHE = 'app';

// Statusleisten-Symbole: 'light' = helle Symbole (fuer dunklen Untergrund),
// 'dark' = dunkle Symbole (fuer hellen Untergrund).
let statusBarModul = null;

async function ladeStatusBar() {
  if (!IST_NATIVE) return null;
  if (!statusBarModul) {
    statusBarModul = import('@capacitor/status-bar').catch(() => null);
  }
  return statusBarModul;
}

// Zuletzt gesetzter Stil — spart ueberfluessige Bruecken-Aufrufe, wenn sich
// beim Neurendern nichts geaendert hat.
let letzterStil = null;

async function setzeStatusleistenStil(hellerText) {
  if (!IST_NATIVE) return;
  const stil = hellerText ? 'light' : 'dark';
  if (stil === letzterStil) return;
  letzterStil = stil;

  try {
    const modul = await ladeStatusBar();
    if (!modul) return;
    const { StatusBar, Style } = modul;
    // Achtung Namensfalle: Style.Light bedeutet bei Capacitor "heller
    // Hintergrund, also DUNKLE Symbole". Style.Dark ist der umgekehrte Fall.
    // Wir denken hier in Symbolfarben, deshalb die Umkehrung.
    // Bewusst NUR der Stil: Android erzwingt ab Version 15 Edge-to-Edge, eine
    // Hintergrundfarbe der Systemleiste laesst sich dort nicht mehr setzen.
    // Die Flaeche kommt in beiden Faellen aus dem CSS (data-flaeche), nicht aus
    // dem Plugin — so gibt es nur eine Farbquelle.
    await StatusBar.setStyle({ style: hellerText ? Style.Dark : Style.Light });
  } catch (error) {
    // Die Statusleiste ist Beiwerk: ein Fehler hier darf den Start nicht
    // aufhalten. In der App gibt es keine Konsole, deshalb nur loggen.
    console.error('Statusleiste liess sich nicht setzen:', error);
  }
}

// Setzt die Flaeche des aktuellen Bildschirms und den dazu passenden
// Statusleisten-Stil.
//
// Die Symbolfarbe folgt derselben Regel wie --on-brand bzw. --text im
// Token-System, damit es keine zweite Quelle fuer denselben Kontrast gibt:
//   Markenflaeche hell  (#0F5257, dunkles Petrol) -> helle Symbole
//   Markenflaeche dunkel (#35B6AA, helles Petrol) -> dunkle Symbole
//   App-Flaeche hell     (#EFF3F3)                -> dunkle Symbole
//   App-Flaeche dunkel   (#071214)                -> helle Symbole
// Auf der Markenflaeche laeuft es damit genau andersherum als auf der
// App-Flaeche — daher die Umkehrung von `dunkelmodus`.
export function setzeSystemflaeche(flaeche, dunkelmodus) {
  if (!IST_NATIVE) return;

  const wert = flaeche === 'brand' ? 'brand' : STANDARD_FLAECHE;
  document.documentElement.setAttribute('data-flaeche', wert);

  // Petrol im hellen Modus ist dunkel -> helle Symbole. Im dunklen Modus ist
  // die Markenflaeche hell (#35B6AA), aber --on-brand ist dort dunkel, also
  // brauchen auch die Symbole dunkle Farbe.
  const hellerText = wert === 'brand' ? !dunkelmodus : dunkelmodus;
  setzeStatusleistenStil(hellerText);
}

// Startflaeche schon beim Laden des Moduls setzen, nicht erst im Effekt.
//
// Der Effekt in AppContent laeuft erst NACH dem ersten Zeichnen. In diesem
// einen Moment traegt das Dokument noch die App-Flaeche, waehrend darueber
// bereits der Startbildschirm in Petrol liegt — oben und unten blitzen dann
// helle bzw. schwarze Streifen auf.
//
// Die App beginnt immer auf der Markenflaeche: Startbildschirm,
// Kirchenkreis-Wahl und Anmeldung liegen alle darauf.
if (IST_NATIVE) {
  document.documentElement.setAttribute('data-flaeche', 'brand');
}
