// Der iOS-Build signierte das Archiv mit einem Development-Zertifikat, das
// Xcode sich dafuer selbst anlegte.
//
// Belegt am Log von Build 31 (Lauf 35933605897, 23.09.2026):
//   Signing Identity:     "Apple Development: Created via API (***)"
//   Provisioning Profile: "iOS Team Provisioning Profile: de.godsapp.fahrtenbuch"
//
// Ursache: In der Release-Konfiguration des Xcode-Projekts standen
// CODE_SIGN_STYLE = Automatic und CODE_SIGN_IDENTITY = "iPhone Developer".
// Bei automatischer Signierung entscheidet das Projekt, nicht der Keychain —
// und `-allowProvisioningUpdates` erlaubte Xcode, sich das Fehlende ueber
// die App-Store-Connect-API zu besorgen. Der Keychain eines CI-Runners ist
// bei jedem Lauf leer, also entstand dort ein Zertifikat.
//
// Das Limit ist KONTOWEIT: Fahrtenbuch, Konfi Quest und Moin Kark teilen es
// sich. Gemessen am 24.09.: 6 Zertifikate, 4 davon "Created via API".
//
// Der Export re-signierte fuers App-Store-Ziel, deshalb kam Build 31 durch —
// das Archiv war trotzdem falsch signiert.
//
// Laeuft ohne Test-Framework: `node test/iosSignierung.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = __dirname + '/../../';
const workflow = fs.readFileSync(wurzel + '.github/workflows/ios-release.yml', 'utf8');
const pbx = fs.readFileSync(
  wurzel + 'frontend/ios/App/App.xcodeproj/project.pbxproj', 'utf8');

// Die Bloecke sind ueber `name = Debug;` / `name = Release;` am Ende
// unterscheidbar. Fuer jede Fundstelle den naechstfolgenden Namen suchen.
function konfigurationVon(quelle, index) {
  const rest = quelle.slice(index);
  const treffer = rest.match(/name = (Debug|Release);/);
  return treffer ? treffer[1] : null;
}

function stellen(quelle, muster) {
  const gefunden = [];
  const regex = new RegExp(muster, 'g');
  let m;
  while ((m = regex.exec(quelle)) !== null) {
    gefunden.push({ index: m.index, text: m[0], konfig: konfigurationVon(quelle, m.index) });
  }
  return gefunden;
}

// --- 1. Das Projekt signiert Release mit Distribution ----------------------
console.log('\n1 — Release-Konfiguration:');

pruefe('kein "iPhone Developer" mehr in einer Release-Konfiguration', () => {
  const treffer = stellen(pbx, 'CODE_SIGN_IDENTITY = "iPhone Developer";')
    .filter((t) => t.konfig === 'Release');
  assert.deepStrictEqual(treffer.map((t) => t.konfig), [],
    'genau das liess Xcode ein Development-Zertifikat anlegen');
});

pruefe('Debug darf weiterhin auf Development stehen', () => {
  // Sonst kann lokal niemand mehr aufs eigene Geraet bauen.
  const treffer = stellen(pbx, 'CODE_SIGN_IDENTITY = "iPhone Developer";')
    .filter((t) => t.konfig === 'Debug');
  assert.ok(treffer.length >= 1, 'die Debug-Einstellung darf nicht mitgeaendert werden');
});

pruefe('Release signiert manuell', () => {
  const treffer = stellen(pbx, 'CODE_SIGN_STYLE = Manual;')
    .filter((t) => t.konfig === 'Release');
  assert.ok(treffer.length >= 1, 'bei Automatic entscheidet das Projekt, nicht der Keychain');
});

pruefe('Release nennt die Distribution-Identitaet', () => {
  const treffer = stellen(pbx, 'CODE_SIGN_IDENTITY = "Apple Distribution";')
    .filter((t) => t.konfig === 'Release');
  assert.ok(treffer.length >= 1);
});

pruefe('Release nennt ein Profil beim Namen', () => {
  const treffer = stellen(pbx, 'PROVISIONING_PROFILE_SPECIFIER = "[^"]+";')
    .filter((t) => t.konfig === 'Release');
  assert.ok(treffer.length >= 1, 'manuelle Signierung braucht einen Profilnamen');
  assert.ok(/Fahrtenbuch AppStore/.test(treffer[0].text));
});

pruefe('der Profilname ist der, den es im Konto gibt', () => {
  // Am 24.09. ueber die ASC-API geprueft: „Fahrtenbuch AppStore", ACTIVE,
  // IOS_APP_STORE, Bundle-ID de.godsapp.fahrtenbuch. Ein „…CI"-Suffix wie
  // bei Konfi Quest gibt es hier NICHT — ein erfundener Name liesse den
  // Build bei manueller Signierung hart abbrechen.
  const treffer = stellen(pbx, 'PROVISIONING_PROFILE_SPECIFIER = "[^"]+";')
    .filter((t) => t.konfig === 'Release');
  assert.ok(/"Fahrtenbuch AppStore"/.test(treffer[0].text),
    `steht: ${treffer[0].text}`);
});

// --- 2. Der Workflow besorgt nichts mehr selbst ----------------------------
console.log('\n2 — Workflow:');

pruefe('-allowProvisioningUpdates ist raus', () => {
  assert.ok(!/allowProvisioningUpdates/.test(workflow),
    'damit durfte Xcode sich Zertifikate ueber die ASC-API anlegen');
});

pruefe('das Profil wird stattdessen geladen', () => {
  assert.ok(/name: Provisioning-Profil laden/.test(workflow));
  assert.ok(/Library\/MobileDevice\/Provisioning/.test(workflow),
    'Xcode sucht es dort');
});

pruefe('ein fehlendes Profil bricht ab, statt umgangen zu werden', () => {
  const schritt = workflow.split('name: Provisioning-Profil laden')[1].split('- name:')[0];
  assert.ok(/sys\.exit\(1\)/.test(schritt), 'sonst faellt es erst beim Signieren auf');
  assert.ok(/nicht gefunden/.test(schritt), 'mit verstaendlicher Meldung');
});

pruefe('das Distribution-Zertifikat kommt weiterhin aus dem Secret', () => {
  assert.ok(/IOS_DIST_P12_BASE64/.test(workflow));
  assert.ok(/security import dist\.p12/.test(workflow));
});

pruefe('der Export signiert ebenfalls manuell', () => {
  assert.ok(/<key>signingStyle<\/key><string>manual<\/string>/.test(workflow),
    'automatic hier haette dasselbe Schlupfloch offengelassen');
  assert.ok(/<key>signingCertificate<\/key><string>Apple Distribution<\/string>/.test(workflow));
});

pruefe('der Export nennt Bundle-ID und Profil', () => {
  assert.ok(/de\.godsapp\.fahrtenbuch<\/key><string>Fahrtenbuch AppStore<\/string>/.test(workflow));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
