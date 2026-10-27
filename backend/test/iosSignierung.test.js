// Release signiert fest, damit Xcode keine Zertifikate anlegt; Xcode Cloud stellt nur im Klon um. Aufruf: node test/iosSignierung.test.js

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

// Blöcke an `name = Debug;` / `name = Release;` unterscheiden.
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
  // Profilname wie in App Store Connect, ein falscher bricht die Signierung ab.
  const treffer = stellen(pbx, 'PROVISIONING_PROFILE_SPECIFIER = "[^"]+";')
    .filter((t) => t.konfig === 'Release');
  assert.ok(/"Fahrtenbuch AppStore"/.test(treffer[0].text),
    `steht: ${treffer[0].text}`);
});

// --- 2. Der Workflow baut in Xcode Cloud ----------------------------------
console.log('\n2 — Workflow:');

pruefe('ruft den Baustein xcode-cloud.yml in einer festen Fassung auf', () => {
  assert.ok(/uses: Revisor01\/workflows\/\.github\/workflows\/xcode-cloud\.yml@[0-9a-f]{40} # \d+\.\d+\.\d+\n/.test(workflow),
    'ohne feste Fassung baut der Release mit dem, was gerade im Baustein steht');
});

pruefe('nimmt die Workflow-ID aus der Repo-Variable und reicht die drei ASC-Secrets durch', () => {
  assert.ok(/workflow-id: \$\{\{ vars\.XCODE_CLOUD_WORKFLOW \}\}/.test(workflow));
  assert.ok(/asc-key-id: \$\{\{ secrets\.ASC_KEY_ID \}\}/.test(workflow));
  assert.ok(/asc-issuer-id: \$\{\{ secrets\.ASC_ISSUER_ID \}\}/.test(workflow));
  assert.ok(/asc-key-p8: \$\{\{ secrets\.ASC_KEY_P8_BASE64 \}\}/.test(workflow));
});

pruefe('startet nur von Hand', () => {
  assert.ok(/^on:\n  workflow_dispatch:\n\n/m.test(workflow));
});

pruefe('braucht kein Distribution-Zertifikat und baut nicht selbst', () => {
  // Xcode Cloud signiert selbst; ein Zertifikat im Workflow liefe am 28.11.2026 ab.
  for (const wort of ['IOS_DIST_P12_BASE64', 'IOS_P12_PASSWORD', 'security import', 'xcodebuild',
    'allowProvisioningUpdates', 'runs-on: macos']) {
    assert.ok(!workflow.includes(wort), wort);
  }
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
