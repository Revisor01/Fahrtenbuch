// Sheets schließen nicht ohne Nachfrage: zurück auf die Ebene darunter, sonst ein stehender Toast „Verwerfen“. Aufruf: node test/sheetSchutz.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const basis = __dirname + '/../../frontend/src/';
const lies = (p) => fs.readFileSync(basis + p, 'utf8');

const sheet = lies('components/ui/Sheet.js');
const flow = lies('components/erfassung/ErfassungsFlow.js');

// --- 1. Die Pruefung sitzt an einer Stelle --------------------------------
console.log('\n1 — Alle vier Schliesswege laufen ueber schliessen():');

pruefe('Sheet nimmt schutz und onZurueck an', () => {
  assert.ok(/schutz = false/.test(sheet));
  assert.ok(/onZurueck/.test(sheet));
});

pruefe('der Tipp auf die Flaeche daneben ruft schliessen', () => {
  assert.ok(/className="sheet-overlay" onClick=\{schliessen\}/.test(sheet));
});

pruefe('das Wischen ruft schliessen', () => {
  // Das zweite Vorkommen der Schwelle, das erste ist die Konstante.
  const geste = sheet.split('SCHLIESS_SCHWELLE').pop().slice(0, 200);
  assert.ok(/schliessen\(\)/.test(geste));
});

pruefe('die Android-Zurueck-Taste ruft schliessen', () => {
  assert.ok(/overlayAnmelden\(schliessen\)/.test(sheet));
});

pruefe('Esc laeuft ueber schliessenRef, nicht ueber den rohen onClose', () => {
  // Der Esc-Stapel bekam frueher onCloseRef und umging damit die Abfrage.
  assert.ok(/escAnmelden\(schliessenRef\)/.test(sheet));
  assert.ok(!/escAnmelden\(onCloseRef\)/.test(sheet));
});

// --- 2. Was die Pruefung tut ----------------------------------------------
console.log('\n2 — Das Verhalten:');

const schliessenRumpf = sheet.split('const schliessen = useCallback(')[1].split('}, [toast]);')[0];

pruefe('eine Ebene darunter hat Vorrang vor der Rueckfrage', () => {
  assert.ok(schliessenRumpf.indexOf('zurueckRef.current')
    < schliessenRumpf.indexOf('schutzRef.current'),
    'wer zurueck kann, soll zurueck — nicht gefragt werden, ob er verwerfen will');
});

pruefe('ohne schutz schliesst es weiterhin sofort', () => {
  assert.ok(/if \(schutzRef\.current && !verwerfenBestaetigt\.current\)/.test(sheet),
    'alle anderen Sheets im Projekt duerfen sich nicht anders verhalten');
});

pruefe('die Rueckfrage laeuft ueber einen bleibenden Toast', () => {
  const zweig = schliessenRumpf.split('schutzRef.current')[1];
  assert.ok(/bleibt: true/.test(zweig), 'ein ablaufender Toast liesse den Nutzer im Unklaren');
  assert.ok(/actionLabel: 'Verwerfen'/.test(zweig));
});

pruefe('nach dem Bestaetigen schliesst es wirklich', () => {
  const zweig = schliessenRumpf.split('schutzRef.current')[1];
  assert.ok(/verwerfenBestaetigt\.current = true/.test(zweig));
  assert.ok(/onCloseRef\.current\?\.\(\)/.test(zweig));
});

pruefe('beim erneuten Oeffnen ist der Schutz wieder scharf', () => {
  assert.ok(/if \(isOpen\) verwerfenBestaetigt\.current = false/.test(sheet),
    'sonst liesse sich das naechste Sheet einmal ungefragt verwerfen');
});

// --- 3. Der Erfassungsflow nutzt beides -----------------------------------
console.log('\n3 — Der Erfassungsflow:');

pruefe('Schritt 1 schuetzt nur mit gewaehltem Ziel', () => {
  const s1 = flow.split('title="Wohin?"')[0].slice(-400) + flow.split('title="Wohin?"')[1].slice(0, 300);
  assert.ok(/schutz=\{!!zielOrtId \|\| !!zielAdresse\}/.test(s1),
    'ein leeres Sheet darf man beilaeufig wegtippen');
});

pruefe('Schritt 2 ist immer geschuetzt', () => {
  const s2 = flow.split('ariaLabel="Fahrt bestätigen"')[1].slice(0, 500);
  assert.ok(/\n      schutz\n/.test(s2), 'dort stehen alle Eingaben');
});

pruefe('Schritt 2 geht bei Zurueck eine Ebene hoch statt zu verwerfen', () => {
  const s2 = flow.split('ariaLabel="Fahrt bestätigen"')[1].slice(0, 500);
  assert.ok(/onZurueck=\{\(\) => setStep\(1\)\}/.test(s2),
    'die Android-Zurueck-Taste verwarf hier bisher den ganzen Flow');
});

pruefe('das Speichern schliesst weiterhin ohne Rueckfrage', () => {
  // Gewolltes Schließen fragt nicht nach.
  const speichern = flow.split('const handleSpeichern')[1].split('// ---- Rendering')[0];
  assert.ok(/\n    onClose\(\);/.test(speichern));
});

pruefe('die Zurueck-Knoepfe im Sheet bleiben unveraendert', () => {
  assert.ok(/onClick=\{\(\) => setStep\(1\)\}/.test(flow),
    'sie rufen setStep, nicht onClose — der Schutz stoert sie nicht');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
