// Die iOS-App meldet Deutsch als Sprache. Aufruf: node test/iosSprache.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = __dirname + '/../../';
const plist = fs.readFileSync(wurzel + 'frontend/ios/App/App/Info.plist', 'utf8');
const pbx = fs.readFileSync(wurzel + 'frontend/ios/App/App.xcodeproj/project.pbxproj', 'utf8');

pruefe('Info.plist: Grundsprache Deutsch', () => {
  assert.ok(/<key>CFBundleDevelopmentRegion<\/key>\s*<string>de<\/string>/.test(plist));
});

pruefe('Info.plist: Deutsch ist die einzige gemeldete Sprache', () => {
  assert.ok(/<key>CFBundleLocalizations<\/key>\s*<array>\s*<string>de<\/string>\s*<\/array>/.test(plist));
});

pruefe('Projekt: developmentRegion de, kein en in knownRegions', () => {
  assert.ok(pbx.includes('developmentRegion = de;'));
  assert.ok(!/knownRegions = \([^)]*\ben,/.test(pbx));
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
