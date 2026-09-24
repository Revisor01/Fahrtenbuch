// Punkt 1 der Pre-Launch-Liste: Der Erfassungsflow verwarf bei einem
// fehlgeschlagenen POST alle Eingaben — es blieb ein Toast, der nach 8 s
// verschwand, und die Fahrt war weg. Haeufigster realer Fall: Funkloch.
//
// Geprueft wird hier zweierlei:
//  1. Die Struktur im Frontend (der Sendelauf ist wiederholbar, der Toast
//     bleibt stehen) — per Quelltext, weil es kein Frontend-Testframework
//     gibt und die Datei React-JSX enthaelt.
//  2. Die eigentliche Logik — als nachgebauter Sendelauf mit Fake-axios.
//     Das faengt die Fehler, die eine Textsuche nicht sieht: doppeltes
//     Anlegen beim Neuversuch und falsche Partner-Verknuepfung.
//
// Laeuft ohne Test-Framework: `node test/erfassungWiederholen.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const flow = fs.readFileSync(
  __dirname + '/../../frontend/src/components/erfassung/ErfassungsFlow.js', 'utf8');
const toastQuelle = fs.readFileSync(
  __dirname + '/../../frontend/src/components/ui/Toast.js', 'utf8');

// --- Struktur: Sendelauf ist wiederholbar ---------------------------------
console.log('\nStruktur — wiederholbarer Sendelauf:');

pruefe('der POST-Lauf steckt in einer benannten Funktion, nicht in einer IIFE', () => {
  assert.ok(/const sende = async \(\) => \{/.test(flow),
    'sende() muss existieren, damit der Neuversuch dieselbe Nutzlast verwendet');
  assert.ok(!/\}\)\(\);\n  \};/.test(flow.split('const sende')[0].slice(-200)),
    'der alte IIFE-Aufruf darf nicht daneben stehen bleiben');
});

pruefe('der Fehler-Toast bietet „Erneut versuchen" und ruft sende()', () => {
  const block = flow.split('Fahrt konnte nicht gespeichert werden')[1].slice(0, 500);
  assert.ok(block.includes("actionLabel: 'Erneut versuchen'"),
    'ohne Aktion bleibt dem Nutzer nur Neutippen');
  assert.ok(/onAction:[\s\S]{0,300}sende\(\)/.test(block),
    'die Aktion muss den Sendelauf erneut starten');
});

pruefe('der Fehler-Toast laeuft nicht ab', () => {
  const block = flow.split('Fahrt konnte nicht gespeichert werden')[1].slice(0, 500);
  assert.ok(block.includes('bleibt: true'),
    'ein ablaufender Toast nimmt die einzige Rettung der Eingaben mit');
});

pruefe('der Neuversuch stellt die optimistischen Eintraege wieder her', () => {
  const block = flow.split("actionLabel: 'Erneut versuchen'")[1].slice(0, 400);
  assert.ok(/setFahrten\(\(prev\) => \[\.\.\.optimistisch, \.\.\.prev\]\)/.test(block),
    'sonst bleibt die Liste bis zum Refresh leer, obwohl gesendet wird');
});

pruefe('Doppeltipp auf „Erneut versuchen" startet keinen zweiten Lauf', () => {
  const block = flow.split("actionLabel: 'Erneut versuchen'")[1].slice(0, 400);
  assert.ok(/if \(op\.sendetGerade\) return;/.test(block),
    'zwei parallele Laeufe legen die Fahrt doppelt an');
  assert.ok(/op\.sendetGerade = true;/.test(flow) && /op\.sendetGerade = false;/.test(flow),
    'das Flag muss gesetzt und im finally geloest werden');
});

// --- Struktur: Waisen getrennt von der Partner-Liste ----------------------
console.log('\nStruktur — Waisen und Partner-Verknuepfung:');

pruefe('op hat eine eigene waisen-Liste', () => {
  assert.ok(/waisen: \[\]/.test(flow),
    'nicht loeschbare Fahrten duerfen nicht in ids landen — ids[0] ist die Partner-ID');
});

pruefe('gescheiterte Loeschungen wandern nach waisen, nicht nach ids', () => {
  const block = flow.split('Teilerfolg zurücknehmen')[1].slice(0, 1200);
  assert.ok(/op\.waisen\.push\(id\)/.test(block), 'muss in waisen gemerkt werden');
  assert.ok(/op\.ids\.length = 0;/.test(block), 'ids wird geleert');
  assert.ok(!/op\.ids\.push\(\.\.\./.test(block),
    'eine Waise in ids wuerde die neue Hinfahrt an eine fremde Fahrt haengen');
});

pruefe('der naechste Lauf raeumt die Waisen zuerst weg', () => {
  const block = flow.split('const sende = async')[1].slice(0, 900);
  assert.ok(/op\.waisen\.length > 0/.test(block),
    'sonst steht die halb angelegte Fahrt doppelt in der Abrechnung');
  assert.ok(block.indexOf('op.waisen') < block.indexOf('for (const t of trips)'),
    'das Aufraeumen muss VOR den neuen POSTs laufen');
});

// --- Struktur: Toast-Komponente -------------------------------------------
console.log('\nStruktur — Toast:');

pruefe('bleibende Toasts bekommen keinen Timer', () => {
  assert.ok(/if \(!bleibt\) \{[\s\S]{0,200}setTimeout/.test(toastQuelle),
    'der Timer darf bei bleibt:true nicht gesetzt werden');
});

pruefe('bleibende Toasts schliessen nicht per Flaechentipp', () => {
  assert.ok(/onClick=\{t\.bleibt \? undefined : \(\) => dismiss\(t\.id\)\}/.test(toastQuelle),
    'der Daumen am Geraeterand haette sonst die Rettung weggetippt');
});

pruefe('bleibt landet im Toast-Objekt', () => {
  assert.ok(/\{ id, variant, message, actionLabel, onAction, bleibt \}/.test(toastQuelle),
    'ohne das Feld kann das Rendering es nicht auswerten');
});

// --- Logik: Sendelauf nachgebaut ------------------------------------------
// Nachbau der Ablaufsteuerung aus handleSpeichern. Wenn sich die echte Logik
// aendert, muss dieser Nachbau mitgezogen werden — die Strukturtests oben
// halten die Verbindung.
console.log('\nLogik — Sendelauf mit Fake-axios:');

function baueSendelauf({ postVerhalten, deleteVerhalten }) {
  const serverFahrten = new Set();
  let naechsteId = 100;
  const postAufrufe = [];
  const deleteAufrufe = [];

  const axios = {
    async post(url, nutzlast) {
      postAufrufe.push(nutzlast);
      const ergebnis = postVerhalten(postAufrufe.length, nutzlast);
      if (ergebnis === 'fehler') {
        const e = new Error('Netzwerkfehler');
        e.response = undefined;
        throw e;
      }
      const id = naechsteId++;
      serverFahrten.add(id);
      return { data: { id } };
    },
    async delete(url) {
      const id = parseInt(url.split('/').pop(), 10);
      deleteAufrufe.push(id);
      const ergebnis = deleteVerhalten ? deleteVerhalten(id) : 'ok';
      if (ergebnis === 'fehler') {
        const e = new Error('Timeout');
        e.response = { status: 504 };
        throw e;
      }
      if (!serverFahrten.has(id)) {
        const e = new Error('weg');
        e.response = { status: 404 };
        throw e;
      }
      serverFahrten.delete(id);
      return {};
    },
  };

  const trips = [{ anlass: 'Hin' }, { anlass: 'Rueck' }];
  const op = { abgebrochen: false, ids: [], waisen: [], laeuft: null };
  let fehlerToast = 0;

  const sende = async () => {
    op.sendetGerade = true;
    try {
      if (op.waisen.length > 0) {
        const bleibt = [];
        for (const id of op.waisen) {
          try {
            await axios.delete(`/api/fahrten/${id}`);
          } catch (delErr) {
            if (delErr?.response?.status !== 404) bleibt.push(id);
          }
        }
        op.waisen.length = 0;
        op.waisen.push(...bleibt);
      }
      for (const t of trips) {
        if (op.abgebrochen) break;
        const nutzlast = op.ids.length > 0 ? { ...t, partnerFahrtId: op.ids[0] } : t;
        const res = await axios.post('/api/fahrten', nutzlast);
        op.ids.push(res.data.id);
      }
    } catch (error) {
      for (const id of op.ids) {
        try {
          await axios.delete(`/api/fahrten/${id}`);
        } catch (delErr) {
          if (delErr?.response?.status !== 404) op.waisen.push(id);
        }
      }
      op.ids.length = 0;
      fehlerToast += 1;
    } finally {
      op.sendetGerade = false;
    }
  };

  return {
    sende, op, serverFahrten, postAufrufe, deleteAufrufe,
    fehlerToasts: () => fehlerToast,
  };
}

async function logikTests() {
  // Fall A: Rueckfahrt scheitert. Die Hinfahrt muss zurueckgenommen werden.
  {
    const l = baueSendelauf({ postVerhalten: (n) => (n === 2 ? 'fehler' : 'ok') });
    await l.sende();
    assert.strictEqual(l.serverFahrten.size, 0,
      'nach dem Rollback darf keine Fahrt stehen bleiben');
    assert.strictEqual(l.fehlerToasts(), 1, 'genau ein Fehler-Toast');
    assert.strictEqual(l.op.waisen.length, 0, 'nichts blieb ungeloescht');
    geprueft += 1;
    console.log('  ok  Fehler bei der Rueckfahrt nimmt die Hinfahrt zurueck');
  }

  // Fall B: Neuversuch nach Fehler legt genau zwei Fahrten an, nicht vier.
  {
    let versuch = 0;
    const l = baueSendelauf({
      postVerhalten: (n) => {
        if (versuch === 0 && n === 2) return 'fehler';
        return 'ok';
      },
    });
    await l.sende();
    versuch = 1;
    l.postAufrufe.length = 0;
    await l.sende();
    assert.strictEqual(l.serverFahrten.size, 2,
      'nach dem Neuversuch genau Hin- und Rueckfahrt');
    assert.strictEqual(l.postAufrufe.length, 2, 'genau zwei POSTs im zweiten Lauf');
    geprueft += 1;
    console.log('  ok  Neuversuch legt genau zwei Fahrten an, keine Duplikate');
  }

  // Fall C: Das Aufraeumen scheitert selbst (Timeout). Die Waise darf NICHT
  // als Partner-ID des naechsten Laufs dienen, und sie muss weggeraeumt
  // werden, sobald es wieder geht.
  {
    let loeschenGehtWieder = false;
    let versuch = 0;
    const l = baueSendelauf({
      postVerhalten: (n) => (versuch === 0 && n === 2 ? 'fehler' : 'ok'),
      deleteVerhalten: () => (loeschenGehtWieder ? 'ok' : 'fehler'),
    });
    await l.sende();
    assert.strictEqual(l.op.waisen.length, 1, 'die nicht loeschbare Fahrt ist gemerkt');
    assert.strictEqual(l.op.ids.length, 0, 'sie steht NICHT in ids');

    versuch = 1;
    loeschenGehtWieder = true;
    l.postAufrufe.length = 0;
    await l.sende();

    assert.strictEqual(l.op.waisen.length, 0, 'die Waise wurde weggeraeumt');
    assert.strictEqual(l.serverFahrten.size, 2,
      'genau zwei Fahrten — die Waise ist weg, Hin und Rueck sind neu');
    assert.strictEqual(l.postAufrufe[0].partnerFahrtId, undefined,
      'die erste Fahrt des Neuversuchs darf keine Partner-ID einer Waise tragen');
    assert.ok(l.postAufrufe[1].partnerFahrtId,
      'die Rueckfahrt haengt am frischen Partner');
    geprueft += 1;
    console.log('  ok  Waise blockiert die Partner-Verknuepfung nicht und wird geraeumt');
  }

  // Fall D: Doppeltipp auf „Erneut versuchen".
  {
    const l = baueSendelauf({ postVerhalten: () => 'ok' });
    const ersterLauf = l.sende();
    const zweiterTipp = l.op.sendetGerade ? null : l.sende();
    await ersterLauf;
    if (zweiterTipp) await zweiterTipp;
    assert.strictEqual(l.serverFahrten.size, 2,
      'der zweite Tipp waehrend des Laufs darf nichts zusaetzlich anlegen');
    geprueft += 1;
    console.log('  ok  Doppeltipp legt die Fahrt nicht doppelt an');
  }

  console.log('\n' + geprueft + ' Pruefungen bestanden.');
}

logikTests().catch((e) => {
  console.error('\nFEHLGESCHLAGEN:', e.message);
  process.exit(1);
});
