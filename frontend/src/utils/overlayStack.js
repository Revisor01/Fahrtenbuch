// Register offener Overlays (Sheets, Modals) fuer den Android-Zurueck-Button.
//
// Warum ein globaler Stapel und kein Context: Sheets liegen per Portal am
// <body> und koennen sich schachteln (z. B. Traeger-Auswahl im Erfassungsflow).
// Der Zurueck-Button muss immer das ZULETZT geoeffnete Overlay schliessen —
// also LIFO. Ein Context muesste dafuer durch jede Zwischenebene gereicht
// werden; der Stapel ist an genau einer Stelle (Sheet.js) angebunden.
//
// Im Web laeuft der Stapel mit, kostet aber nichts und aendert kein Verhalten:
// nur der Zurueck-Listener der nativen App fragt ihn ab.

const stapel = [];

// Beobachter des Fuellstands. Die native App braucht das: Ihre
// Navigationsleiste liegt UEBER der WebView und muss weichen, solange ein
// Overlay offen ist. Der Stapel weiss als Einziger verlaesslich Bescheid —
// jedes Sheet einzeln anzufassen waere fehleranfaellig.
const beobachter = new Set();

function melden() {
  const offen = stapel.length > 0;
  beobachter.forEach((fn) => {
    try {
      fn(offen);
    } catch {
      // Ein fehlerhafter Beobachter darf das Oeffnen/Schliessen eines Sheets
      // nicht verhindern.
    }
  });
}

// Gibt eine Abmeldefunktion zurueck (passt zum useEffect-Cleanup).
export function overlayAnmelden(schliessen) {
  const eintrag = { schliessen };
  stapel.push(eintrag);
  melden();
  return () => {
    const index = stapel.indexOf(eintrag);
    if (index !== -1) {
      stapel.splice(index, 1);
      melden();
    }
  };
}

// Meldet, ob gerade mindestens ein Overlay offen ist — bei jeder Aenderung.
// Gibt eine Abmeldefunktion zurueck.
export function overlayBeobachten(fn) {
  beobachter.add(fn);
  return () => beobachter.delete(fn);
}

// Schliesst das oberste Overlay. true = es gab eines (Ereignis verbraucht).
export function oberstesOverlaySchliessen() {
  const oben = stapel[stapel.length - 1];
  if (!oben) return false;
  try {
    oben.schliessen();
  } catch {
    // Ein fehlerhafter onClose darf den Zurueck-Button nicht lahmlegen;
    // der Eintrag verschwindet ohnehin ueber das Cleanup.
  }
  return true;
}

export function hatOffenesOverlay() {
  return stapel.length > 0;
}
