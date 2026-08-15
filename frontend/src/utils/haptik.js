import { IST_NATIVE } from './plattform';

// Haptik bewusst sparsam: nur an Stellen, an denen das Geraet eine Auswahl
// bestaetigt. Ein Klopfen bei jedem Tap stumpft ab und wirkt billig.
//
// Das Plugin wird erst beim ersten Bedarf geladen (dynamischer Import), damit
// der Web-Build es gar nicht erst mitzieht. Fehler werden verschluckt: Haptik
// ist Beiwerk und darf eine Navigation nie blockieren.
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
