// Punkt 15 der Pre-Launch-Liste, Teilbefund „Veraltete Daten".
//
// Nach einer Namensaenderung im Profil blieb die Begruessung auf der
// Startseite alt: handleProfileUpdate rief fetchProfile (fuellt nur das
// Formular), aber nicht fetchCurrentUser (haelt `user` im Context). Der
// alte Name stand dort bis zum naechsten Start der App.
//
// Dazu sechs Aufrufe von fetchOrte/fetchDistanzen ohne await: Die Funktion
// kehrte zurueck, bevor die neue Liste stand — die Oberflaeche zeigte kurz
// den Stand von vorher.
//
// Laeuft ohne Test-Framework: `node test/aktualitaet.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const basis = __dirname + '/../../frontend/src/';
const ctx = fs.readFileSync(basis + 'contexts/AppContext.js', 'utf8');
const profil = fs.readFileSync(basis + 'components/einstellungen/ProfilBereich.js', 'utf8');

// --- 1. Die Begruessung ----------------------------------------------------
console.log('\n1 — Der Name wird nach dem Speichern aktualisiert:');

pruefe('fetchCurrentUser steht im Context bereit', () => {
  assert.ok(/\n      fetchCurrentUser,/.test(ctx),
    'ohne Export kommt der ProfilBereich nicht daran');
});

pruefe('der ProfilBereich holt es sich', () => {
  assert.ok(/fetchCurrentUser \} = useContext\(AppContext\)/.test(profil));
});

pruefe('nach dem Speichern werden BEIDE Quellen erneuert', () => {
  const fn = profil.split('const handleProfileUpdate = async')[1].split('\n  };')[0];
  assert.ok(/fetchProfile\(\)/.test(fn), 'das Formular');
  assert.ok(/fetchCurrentUser\(\)/.test(fn), 'und der Name fuer die Begruessung');
});

pruefe('und es wird darauf gewartet', () => {
  const fn = profil.split('const handleProfileUpdate = async')[1].split('\n  };')[0];
  assert.ok(/await Promise\.all\(\[fetchProfile\(\), fetchCurrentUser\(\)\]\)/.test(fn),
    'ohne await zeigt ein sofortiger Ansichtswechsel noch den alten Stand');
});

pruefe('die beiden Abrufe laufen nebeneinander, nicht nacheinander', () => {
  // Promise.all statt zweier awaits: Sie haengen nicht voneinander ab.
  const fn = profil.split('const handleProfileUpdate = async')[1].split('\n  };')[0];
  assert.ok(!/await fetchProfile\(\);\s*\n\s*await fetchCurrentUser\(\)/.test(fn));
});

// --- 2. Listen sind fertig, bevor die Funktion zurueckkehrt -----------------
console.log('\n2 — Kein Rueckkehren vor dem Neuladen:');

pruefe('kein fetchOrte/fetchDistanzen mehr ohne await', () => {
  const ohne = ctx.split('\n').filter((z) => /^\s*fetch(Orte|Distanzen)\(\);\s*$/.test(z));
  assert.deepStrictEqual(ohne, [],
    `diese Aufrufe warten nicht: ${ohne.map((z) => z.trim()).join(', ')}`);
});

pruefe('alle sechs Stellen warten jetzt', () => {
  const mit = (ctx.match(/await fetch(Orte|Distanzen)\(\);/g) || []).length;
  assert.strictEqual(mit, 6, `erwartet 6, gefunden ${mit}`);
});

for (const fn of ['addOrt', 'updateOrt', 'deleteOrt']) {
  pruefe(`${fn} laedt die Orte nach und wartet`, () => {
    const block = ctx.split(`const ${fn} = async`)[1].split('\n  };')[0];
    assert.ok(/await fetchOrte\(\);/.test(block));
  });
}

for (const fn of ['addDistanz', 'deleteDistanz']) {
  pruefe(`${fn} laedt die Distanzen nach und wartet`, () => {
    const block = ctx.split(`const ${fn} = async`)[1].split('\n  };')[0];
    assert.ok(/await fetchDistanzen\(\);/.test(block));
  });
}

console.log('\n' + geprueft + ' Pruefungen bestanden.');
