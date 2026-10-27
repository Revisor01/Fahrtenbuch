import { IST_NATIVE } from './plattform';

// Haptik nur bei bestaetigter Auswahl; Plugin wird lazy geladen, Fehler sind egal.
let haptikModul = null;

async function ladeHaptik() {
  if (!IST_NATIVE) return null;
  if (!haptikModul) {
    haptikModul = import('@capacitor/haptics').catch(() => null);
  }
  return haptikModul;
}

// Tab-Wechsel und andere Auswahlen — auf iOS wie Android dasselbe Idiom.
export function auswahlHaptik() {
  ladeHaptik()
    .then((mod) => mod?.Haptics?.selectionChanged?.())
    .catch(() => {});
}
