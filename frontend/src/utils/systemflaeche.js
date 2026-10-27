import { IST_NATIVE } from './plattform';

// <html> uebernimmt die Flaeche des Bildschirms, weil sie unter Status- und Home-Leiste durchscheint.

const STANDARD_FLAECHE = 'app';

// 'light' = helle Symbole, 'dark' = dunkle Symbole.
let statusBarModul = null;

async function ladeStatusBar() {
  if (!IST_NATIVE) return null;
  if (!statusBarModul) {
    statusBarModul = import('@capacitor/status-bar').catch(() => null);
  }
  return statusBarModul;
}

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
    // Capacitor-Style.Light heisst dunkle Symbole, daher umgekehrt; nur der Stil, Android 15 erzwingt Edge-to-Edge.
    await StatusBar.setStyle({ style: hellerText ? Style.Dark : Style.Light });
  } catch (error) {
    // Die Statusleiste darf den Start nicht aufhalten.
    console.error('Statusleiste liess sich nicht setzen:', error);
  }
}

// Symbolfarbe folgt --on-brand bzw. --text; auf der Markenflaeche umgekehrt zum Dunkelmodus.
export function setzeSystemflaeche(flaeche, dunkelmodus) {
  if (!IST_NATIVE) return;

  const wert = flaeche === 'brand' ? 'brand' : STANDARD_FLAECHE;
  document.documentElement.setAttribute('data-flaeche', wert);

  // Im Dunkelmodus ist die Markenflaeche hell, --on-brand dunkel.
  const hellerText = wert === 'brand' ? !dunkelmodus : dunkelmodus;
  setzeStatusleistenStil(hellerText);
}
