// Trockenlauf der naechtlichen Sicherung mit Attrappen fuer docker und sftp. Aufruf: node test/sicherungTrockenlauf.test.js

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

const skript = path.join(__dirname, '../../deploy/backup.sh');
const KENNWORT = 'db-kennwort-attrappe';
const PASSPHRASE = 'passphrase-attrappe-1234567890';
const STACK_ENV = `DB_USER=fahrtenbuch\nDB_PASSWORD=${KENNWORT}\nJWT_SECRET=jwt-attrappe\n`;

function lauf({ mitPassphrase }) {
  const wurzel = fs.mkdtempSync(path.join(os.tmpdir(), 'sicherung-'));
  const bin = path.join(wurzel, 'bin');
  const stack = path.join(wurzel, 'stack');
  const ziel = path.join(wurzel, 'ziel');
  const protokoll = path.join(wurzel, 'aufrufe');
  fs.mkdirSync(bin);
  fs.mkdirSync(stack);
  fs.mkdirSync(protokoll);
  fs.writeFileSync(path.join(stack, 'stack.env'), STACK_ENV);
  const passphraseDatei = path.join(wurzel, 'passphrase');
  if (mitPassphrase) fs.writeFileSync(passphraseDatei, PASSPHRASE, { mode: 0o400 });

  fs.writeFileSync(path.join(bin, 'docker'), `#!/usr/bin/env bash
if [[ "$1" == ps ]]; then echo fahrtenbuch-db-1; exit 0; fi
printf '%s\\n' "$*" >> "${protokoll}/docker-args"
printf '%s' "\${MYSQL_PWD:-}" > "${protokoll}/docker-pwd"
for t in a b c d e f; do echo "CREATE TABLE \\\`$t\\\` (id int);"; done
`, { mode: 0o755 });
  fs.writeFileSync(path.join(bin, 'sftp'), `#!/usr/bin/env bash
printf '%s\\n' "$*" > "${protokoll}/sftp-args"
cat > "${protokoll}/sftp-befehle"
`, { mode: 0o755 });

  const kopie = path.join(wurzel, 'backup.sh');
  fs.copyFileSync(skript, kopie);
  fs.writeFileSync(path.join(wurzel, 'backup.env'), [
    `INSTANZEN=("test|${stack}|fahrtenbuch-db-1|fahrtenbuch")`,
    `ZIEL="${ziel}"`,
    `LOG="${path.join(wurzel, 'backup.log')}"`,
    `PASSPHRASE_DATEI="${passphraseDatei}"`,
    'BACKUP_SFTP_ZIEL="nutzer@sicherung.invalid"',
  ].join('\n') + '\n');

  const ergebnis = spawnSync('bash', [kopie], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    encoding: 'utf8',
  });
  const lies = (name) => {
    const datei = path.join(protokoll, name);
    return fs.existsSync(datei) ? fs.readFileSync(datei, 'utf8') : '';
  };
  return {
    wurzel, ziel, passphraseDatei,
    status: ergebnis.status,
    log: fs.readFileSync(path.join(wurzel, 'backup.log'), 'utf8'),
    dateien: fs.existsSync(ziel) ? fs.readdirSync(ziel).sort() : [],
    dockerArgs: lies('docker-args'),
    dockerPwd: lies('docker-pwd'),
    sftpArgs: lies('sftp-args'),
    sftpBefehle: lies('sftp-befehle'),
  };
}

console.log('\nSicherung (Trockenlauf):');

const gut = lauf({ mitPassphrase: true });

pruefe('mit Passphrase: Lauf endet ohne Fehler', () => {
  assert.strictEqual(gut.status, 0, gut.log);
  assert.ok(/abgeschlossen, alles in Ordnung/.test(gut.log));
});

pruefe('mit Passphrase: Dump und verschluesselte stack.env liegen im Ziel', () => {
  assert.strictEqual(gut.dateien.length, 2, gut.dateien.join(', '));
  assert.ok(/^fahrtenbuch_.*\.sql\.gz$/.test(gut.dateien[0]));
  assert.ok(/^secrets_.*\.tar\.gz\.enc$/.test(gut.dateien[1]));
});

pruefe('mit Passphrase: stack.env laesst sich mit der Passphrase zurueckholen', () => {
  const enc = path.join(gut.ziel, gut.dateien[1]);
  assert.ok(!fs.readFileSync(enc).includes(KENNWORT), 'Kennwort im Klartext in der Sicherung');
  const aus = path.join(gut.wurzel, 'zurueck');
  fs.mkdirSync(aus);
  const r = spawnSync('bash', ['-c',
    `openssl enc -d -aes-256-cbc -pbkdf2 -in "$1" -pass "file:$2" | tar xzf - -C "$3"`,
    '_', enc, gut.passphraseDatei, aus], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const stackRelativ = path.join(gut.wurzel, 'stack', 'stack.env').replace(/^\//, '');
  assert.strictEqual(fs.readFileSync(path.join(aus, stackRelativ), 'utf8'), STACK_ENV);
});

pruefe('mit Passphrase: falsche Passphrase entschluesselt nicht', () => {
  const r = spawnSync('bash', ['-c',
    'openssl enc -d -aes-256-cbc -pbkdf2 -in "$1" -pass pass:falsch | tar tzf - >/dev/null',
    '_', path.join(gut.ziel, gut.dateien[1])], { encoding: 'utf8' });
  assert.notStrictEqual(r.status, 0);
});

pruefe('mit Passphrase: beide Dateien gehen auswaerts, die Passphrase nicht', () => {
  assert.strictEqual((gut.sftpBefehle.match(/^put /gm) || []).length, 2);
  assert.ok(gut.sftpBefehle.includes(gut.dateien[1]));
  assert.ok(!gut.sftpBefehle.includes('passphrase'));
});

pruefe('Kennwort kommt ueber MYSQL_PWD, nicht als Aufrufparameter', () => {
  assert.strictEqual(gut.dockerPwd, KENNWORT);
  assert.ok(!gut.dockerArgs.includes(KENNWORT));
  assert.ok(/^exec -e MYSQL_PWD fahrtenbuch-db-1 mysqldump -u fahrtenbuch /m.test(gut.dockerArgs));
});

pruefe('sftp lernt unbekannte Hostschluessel einmal und weist geaenderte ab', () => {
  assert.ok(gut.sftpArgs.includes('StrictHostKeyChecking=accept-new'));
});

pruefe('Protokoll enthaelt weder Kennwort noch Passphrase', () => {
  assert.ok(!gut.log.includes(KENNWORT));
  assert.ok(!gut.log.includes(PASSPHRASE));
});

const ohne = lauf({ mitPassphrase: false });

pruefe('ohne Passphrase: Lauf meldet Fehler, Dump wird trotzdem gesichert', () => {
  assert.strictEqual(ohne.status, 1);
  assert.ok(/Secrets werden NICHT gesichert/.test(ohne.log));
  assert.strictEqual(ohne.dateien.length, 1, ohne.dateien.join(', '));
  assert.ok(/^fahrtenbuch_.*\.sql\.gz$/.test(ohne.dateien[0]));
  assert.strictEqual((ohne.sftpBefehle.match(/^put /gm) || []).length, 1);
});

for (const r of [gut, ohne]) fs.rmSync(r.wurzel, { recursive: true, force: true });

console.log('\n' + geprueft + ' Prüfungen bestanden.');
