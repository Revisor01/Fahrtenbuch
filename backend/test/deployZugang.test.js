// Deploy- und Sicherungsskript: keine Kennwörter in Prozesslisten, keine blind angenommenen Hostschlüssel. Aufruf: node test/deployZugang.test.js

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = __dirname + '/../../';
const deploy = fs.readFileSync(wurzel + 'deploy/deploy.sh', 'utf8');
const backup = fs.readFileSync(wurzel + 'deploy/backup.sh', 'utf8');

console.log('\nDeploy-Zugang:');

for (const [name, text] of [['deploy.sh', deploy], ['backup.sh', backup]]) {
  pruefe(name + ': kein MySQL-Kennwort per -p auf der Befehlszeile', () => {
    assert.ok(!/-p\\?"\\?\$/.test(text), 'Fund: -p"$…" in ' + name);
  });

  pruefe(name + ': Hostschlüssel werden nicht blind angenommen', () => {
    assert.ok(!/StrictHostKeyChecking=no/.test(text));
  });
}

pruefe('deploy.sh: sshpass liest das Kennwort aus der Umgebung', () => {
  assert.ok(!/sshpass -p/.test(deploy));
  assert.ok(/SSHPASS="\$KKD_SSH_PASS" sshpass -e ssh/.test(deploy));
});

pruefe('deploy.sh: unbekannte Hosts werden einmal gelernt, geänderte abgewiesen', () => {
  assert.ok(/StrictHostKeyChecking=accept-new/.test(deploy));
});

pruefe('deploy.sh: mysqldump und mysql bekommen das Kennwort über MYSQL_PWD', () => {
  assert.strictEqual((deploy.match(/docker exec -e MYSQL_PWD \$DB_CONTAINER/g) || []).length, 2);
});

pruefe('backup.sh: mysqldump bekommt das Kennwort über MYSQL_PWD', () => {
  assert.ok(/MYSQL_PWD="\$kennwort" docker exec -e MYSQL_PWD "\$container" mysqldump -u "\$nutzer"/.test(backup));
});

console.log('\n' + geprueft + ' Prüfungen bestanden.');
