// LIFO-Stapel offener Overlays, damit der Android-Zurueck-Button das zuletzt geoeffnete schliesst.

const stapel = [];

// Beobachter: Die native Navigationsleiste muss weichen, solange ein Overlay offen ist.
const beobachter = new Set();

function melden() {
  const offen = stapel.length > 0;
  beobachter.forEach((fn) => {
    try {
      fn(offen);
    } catch {
      // Ein fehlerhafter Beobachter darf kein Sheet blockieren.
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

// Meldet bei jeder Aenderung, ob ein Overlay offen ist; liefert die Abmeldung.
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
    // Ein fehlerhafter onClose darf den Zurueck-Button nicht lahmlegen.
  }
  return true;
}

export function hatOffenesOverlay() {
  return stapel.length > 0;
}
