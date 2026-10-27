// Xcode Cloud stellt die feste Signierung nur im Klon um. Aufruf: node test/xcodeCloud.test.js

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = path.join(__dirname, '../../');
const ios = path.join(wurzel, 'frontend/ios/App');
const skript = path.join(ios, 'ci_scripts/ci_post_clone.sh');
const text = fs.readFileSync(skript, 'utf8');
const pbx = fs.readFileSync(path.join(ios, 'App.xcodeproj/project.pbxproj'), 'utf8');
const lock = JSON.parse(fs.readFileSync(path.join(wurzel, 'frontend/package-lock.json'), 'utf8'));

console.log('\n1 — Skript nach dem Klonen:');

pruefe('liegt neben dem Projekt, ist ausfuehrbar und bricht bei jedem Fehler ab', () => {
  assert.notStrictEqual(fs.statSync(skript).mode & 0o111, 0);
  assert.ok(/^set -euo pipefail$/m.test(text));
});

pruefe('geht die Schritte in dieser Reihenfolge', () => {
  const schritte = ['brew install node@26', 'CI_BUILD_NUMBER', 'npm ci', 'npm run build', 'npx cap sync ios',
    'xcodebuild -resolvePackageDependencies -project App.xcodeproj -scheme App', 'CODE_SIGN_STYLE = Automatic;'];
  const stellen = schritte.map((s) => text.indexOf(s));
  schritte.forEach((s, i) => assert.ok(stellen[i] > -1, s));
  assert.deepStrictEqual([...stellen].sort((a, b) => a - b), stellen);
});

pruefe('die Node-Linie genuegt der Capacitor-CLI', () => {
  const linie = Number(text.match(/brew install node@(\d+)/)[1]);
  const mindestens = Number(lock.packages['node_modules/@capacitor/cli'].engines.node.match(/^>=(\d+)\./)[1]);
  assert.ok(linie >= mindestens, `node@${linie} < ${mindestens}`);
  assert.ok(text.includes(`[ "$(node -p 'process.versions.node.split(".")[0]')" = ${linie} ]`));
});

pruefe('prueft nach der Paketaufloesung, dass Package.resolved da ist', () => {
  assert.ok(text.includes('RESOLVED="$IOS/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"'));
  assert.ok(text.includes('[ -f "$RESOLVED" ]'));
});

console.log('\n2 — Projekt:');

pruefe('das Schema App ist geteilt und archiviert Release', () => {
  // Xcode Cloud sieht nur geteilte Schemata.
  const schema = fs.readFileSync(path.join(ios, 'App.xcodeproj/xcshareddata/xcschemes/App.xcscheme'), 'utf8');
  const ziel = pbx.match(/(\w{24}) \/\* App \*\/ = \{\n\t\t\tisa = PBXNativeTarget;/)[1];
  assert.ok(schema.includes(`BlueprintIdentifier = "${ziel}"`));
  assert.ok(/<ArchiveAction\s+buildConfiguration = "Release"/.test(schema));
});

pruefe('die App erklaert sich frei von meldepflichtiger Verschluesselung', () => {
  // Ohne die Angabe bleibt jeder Build auf MISSING_EXPORT_COMPLIANCE.
  const plist = fs.readFileSync(path.join(ios, 'App/Info.plist'), 'utf8');
  assert.ok(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/.test(plist));
});

pruefe('Package.resolved pinnt die Capacitor-Version, die Package.swift verlangt', () => {
  // Stand vorher: 8.5.0 gepinnt, 8.5.3 verlangt. Xcode Cloud bricht daran ab.
  const verlangt = fs.readFileSync(path.join(ios, 'CapApp-SPM/Package.swift'), 'utf8')
    .match(/capacitor-swift-pm\.git", exact: "([\d.]+)"/)[1];
  const resolved = JSON.parse(fs.readFileSync(
    path.join(ios, 'App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'), 'utf8'));
  const pin = resolved.pins.find((p) => p.identity === 'capacitor-swift-pm');
  assert.strictEqual(pin.state.version, verlangt);
});

pruefe('die umgestellten Signier-Zeilen stehen so oft im Projekt, wie das Skript erwartet', () => {
  for (const [zeile, anzahl] of [['CODE_SIGN_STYLE = Manual;', 1], ['CODE_SIGN_IDENTITY = "Apple Distribution";', 2],
    ['PROVISIONING_PROFILE_SPECIFIER = "Fahrtenbuch AppStore";', 1]]) {
    assert.strictEqual(pbx.split(zeile).length - 1, anzahl, zeile);
    assert.ok(text.includes(`'${zeile}:${anzahl}'`), zeile);
  }
});

console.log('\n3 — Build-Nummer:');

const knoten = text.match(/node -e '\n([\s\S]*?)' "\$PBXPROJ"/)[1];
function setze(nummer, quelle = pbx) {
  const datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'xcc-')), 'project.pbxproj');
  fs.writeFileSync(datei, quelle);
  const lauf = spawnSync('node', ['-e', knoten, datei], { encoding: 'utf8', env: { ...process.env, CI_BUILD_NUMBER: nummer } });
  return { code: lauf.status, aus: lauf.stdout + lauf.stderr, neu: fs.readFileSync(datei, 'utf8') };
}
const bisher = Number(pbx.match(/CURRENT_PROJECT_VERSION = (\d+);/)[1]);

pruefe('uebernimmt eine hoehere Nummer in beide Konfigurationen und laesst den Rest stehen', () => {
  const { code, neu } = setze(String(bisher + 1));
  assert.strictEqual(code, 0);
  assert.strictEqual(neu.split(`CURRENT_PROJECT_VERSION = ${bisher + 1};`).length - 1, 2);
  assert.strictEqual(neu.replaceAll(`CURRENT_PROJECT_VERSION = ${bisher + 1};`, `CURRENT_PROJECT_VERSION = ${bisher};`), pbx);
});

pruefe('bricht bei gleicher, kleinerer oder fehlender Nummer ab, ohne das Projekt zu aendern', () => {
  for (const nummer of [String(bisher), '5', '', 'abc']) {
    const { code, aus, neu } = setze(nummer);
    assert.strictEqual(code, 1, nummer);
    assert.ok(aus.includes('Build Number'), nummer);
    assert.strictEqual(neu, pbx, nummer);
  }
});

pruefe('bricht ab, wenn Debug und Release verschiedene Nummern tragen', () => {
  const gemischt = pbx.replace(`CURRENT_PROJECT_VERSION = ${bisher};`, `CURRENT_PROJECT_VERSION = ${bisher - 1};`);
  const { code, aus } = setze(String(bisher + 1), gemischt);
  assert.strictEqual(code, 1);
  assert.ok(aus.includes('CURRENT_PROJECT_VERSION uneinheitlich'));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
