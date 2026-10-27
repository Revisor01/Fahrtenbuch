import { IST_NATIVE } from './plattform';

// launchAutoHide ist aus, damit die Anmeldemaske nicht aufblitzt; ohne hide() bleibt der Startbildschirm stehen.

let bereitsAusgeblendet = false;

// Notbremse, falls hide() im Startpfad nie aufgerufen wird.
const NOTBREMSE_MS = 2000;

async function ausblenden() {
  if (bereitsAusgeblendet || !IST_NATIVE) return;
  bereitsAusgeblendet = true;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (error) {
    // Die Notbremse greift ohnehin.
    console.error('Startbildschirm liess sich nicht ausblenden:', error);
  }
}

export function splashAusblenden() {
  ausblenden();
}

if (IST_NATIVE) {
  setTimeout(ausblenden, NOTBREMSE_MS);
}
