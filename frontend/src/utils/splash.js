import { IST_NATIVE } from './plattform';

// Der Startbildschirm blendet sich bewusst nicht selbst aus
// (launchAutoHide: false). Sonst gaebe er die App frei, waehrend die
// gespeicherte Anmeldung noch aus dem Systemspeicher gelesen wird — und die
// Anmeldemaske blitzte kurz auf, obwohl jemand angemeldet ist.
//
// Dafuer MUSS er aktiv ausgeblendet werden: Ohne diesen Aufruf bleibt die App
// dauerhaft auf dem Startbildschirm stehen.

let bereitsAusgeblendet = false;

// Notbremse: Sollte der Aufruf durch einen Fehler im Startpfad nie erfolgen,
// waere die App unbedienbar. Nach dieser Frist verschwindet der
// Startbildschirm in jedem Fall.
const NOTBREMSE_MS = 2000;

async function ausblenden() {
  if (bereitsAusgeblendet || !IST_NATIVE) return;
  bereitsAusgeblendet = true;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (error) {
    // Nicht kritisch: Der Startbildschirm verschwindet spaetestens mit der
    // Notbremse. Ein Fehler hier darf den Start nicht aufhalten.
    console.error('Startbildschirm liess sich nicht ausblenden:', error);
  }
}

export function splashAusblenden() {
  ausblenden();
}

if (IST_NATIVE) {
  setTimeout(ausblenden, NOTBREMSE_MS);
}
