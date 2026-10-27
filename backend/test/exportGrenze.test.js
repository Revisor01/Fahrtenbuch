// Begrenzung gleichzeitiger PDF-Konvertierungen, weil ein Lauf 209 MB braucht.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
async function pruefe(beschreibung, fn) {
  await fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}
const lies = (pfad) => fs.readFileSync(__dirname + '/../' + pfad, 'utf8');

(async () => {
  // --- 1. Die Grenze steht im Code -----------------------------------------
  console.log('\n1 — Die Begrenzung ist vorhanden:');

  await pruefe('MAX_GLEICHZEITIG ist gesetzt und klein', () => {
    const quelle = lies('utils/xlsxToPdf.js');
    const treffer = quelle.match(/SOFFICE_MAX_PARALLEL[^)]*\|\|\s*'(\d+)'/);
    assert.ok(treffer, 'Grenze muss ueber SOFFICE_MAX_PARALLEL einstellbar sein');
    const wert = parseInt(treffer[1], 10);
    assert.ok(wert >= 1 && wert <= 4, `Vorgabe ${wert} passt nicht zu 2 Kernen`);
  });

  await pruefe('der Platz wird im finally wieder freigegeben', () => {
    const quelle = lies('utils/xlsxToPdf.js');
    assert.ok(
      /finally\s*\{\s*platzFreigeben\(\);/.test(quelle),
      'ohne finally bleibt bei einem Fehler ein Platz dauerhaft belegt'
    );
  });

  await pruefe('der Platz wird vor dem Anlegen der Dateien geholt', () => {
    const quelle = lies('utils/xlsxToPdf.js');
    const vorne = quelle.indexOf('await platzAnfordern()');
    const mkdtemp = quelle.indexOf('fs.mkdtemp');
    assert.ok(vorne > 0 && vorne < mkdtemp, 'sonst haeufen sich temporaere Verzeichnisse an');
  });

  // --- 2. Warteschlange als Nachbau aus xlsxToPdf.js ---
  console.log('\n2 — Die Warteschlange laesst nur zwei gleichzeitig durch:');

  function baueSchlange(max) {
    let laufend = 0;
    let hoechstand = 0;
    const warteschlange = [];
    const anfordern = () => {
      if (laufend < max) {
        laufend += 1;
        hoechstand = Math.max(hoechstand, laufend);
        return Promise.resolve();
      }
      return new Promise((weiter) => warteschlange.push(weiter));
    };
    const freigeben = () => {
      const naechster = warteschlange.shift();
      if (naechster) {
        naechster();
        return;
      }
      laufend -= 1;
    };
    return {
      anfordern,
      freigeben,
      hoechstand: () => hoechstand,
      laufend: () => laufend,
      wartend: () => warteschlange.length,
    };
  }

  await pruefe('bei 10 Auftraegen laufen nie mehr als 2 gleichzeitig', async () => {
    const s = baueSchlange(2);
    let gleichzeitig = 0;
    let spitze = 0;
    const auftrag = async () => {
      await s.anfordern();
      gleichzeitig += 1;
      spitze = Math.max(spitze, gleichzeitig);
      await new Promise((f) => setTimeout(f, 5));
      gleichzeitig -= 1;
      s.freigeben();
    };
    await Promise.all(Array.from({ length: 10 }, auftrag));
    assert.strictEqual(spitze, 2, `Spitze war ${spitze}, erlaubt sind 2`);
  });

  await pruefe('alle Auftraege kommen durch, keiner geht verloren', async () => {
    const s = baueSchlange(2);
    let fertig = 0;
    const auftrag = async () => {
      await s.anfordern();
      await new Promise((f) => setTimeout(f, 2));
      fertig += 1;
      s.freigeben();
    };
    await Promise.all(Array.from({ length: 12 }, auftrag));
    assert.strictEqual(fertig, 12);
    assert.strictEqual(s.laufend(), 0, 'am Ende muss alles freigegeben sein');
    assert.strictEqual(s.wartend(), 0, 'niemand darf haengen bleiben');
  });

  await pruefe('ein Fehler im Auftrag blockiert den Platz nicht', async () => {
    const s = baueSchlange(2);
    const auftrag = async (i) => {
      await s.anfordern();
      try {
        if (i < 2) throw new Error('Konvertierung fehlgeschlagen');
        await new Promise((f) => setTimeout(f, 2));
      } finally {
        s.freigeben();
      }
    };
    const ergebnisse = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => auftrag(i))
    );
    assert.strictEqual(ergebnisse.filter((e) => e.status === 'rejected').length, 2);
    assert.strictEqual(s.laufend(), 0, 'nach Fehlern muss der Platz frei sein');
  });

  // --- 3. Die Zeitgrenze fuers Warten --------------------------------------
  console.log('\n3 — Wer zu lange wartet, bekommt eine klare Meldung:');

  await pruefe('WARTE_TIMEOUT ist gesetzt', () => {
    const quelle = lies('utils/xlsxToPdf.js');
    assert.ok(/SOFFICE_QUEUE_TIMEOUT_MS/.test(quelle));
    assert.ok(
      /ausgelastet/i.test(quelle),
      'die Meldung muss erklaeren, was los ist — nicht nur "Timeout"'
    );
  });

  console.log('\n' + geprueft + ' Pruefungen bestanden.\n');
})().catch((fehler) => {
  console.error('\nFEHLGESCHLAGEN:', fehler.message);
  process.exit(1);
});
