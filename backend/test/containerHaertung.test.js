// Punkte 4 und 7 der Pre-Launch-Liste: Container-Nutzer und Sicherheits-
// Kopfzeilen.
//
// Punkt 4: Das Backend lief als root. In genau diesem Container rendert
// LibreOffice Texte, die Nutzer:innen eingegeben haben (Anlass, Ortsnamen) —
// der Prozess mit den weitesten Rechten verarbeitet die am wenigsten
// vertrauenswuerdigen Daten.
//
// Punkt 7: frontend/nginx.conf setzte nur Cache-Kopfzeilen. helmet() im
// Backend deckt die API ab, nicht die ausgelieferte Oberflaeche.
//
// Die nginx-Konfiguration wurde zusaetzlich gegen ein echtes Image gemessen
// (alle sieben Pfade liefern CSP und X-Frame-Options, die Cache-Kopfzeilen
// bleiben unveraendert). Hier steht, was sich ohne Docker pruefen laesst.
//
// Laeuft ohne Test-Framework: `node test/containerHaertung.test.js`.

const assert = require('assert');
const fs = require('fs');

let geprueft = 0;
function pruefe(beschreibung, fn) {
  fn();
  geprueft += 1;
  console.log('  ok  ' + beschreibung);
}

const wurzel = __dirname + '/../../';
const lies = (p) => fs.readFileSync(wurzel + p, 'utf8');

const backendDocker = lies('backend/Dockerfile');
const frontendDocker = lies('frontend/Dockerfile');
const nginx = lies('frontend/nginx.conf');
const header = lies('frontend/security-headers.conf');
const composeDev = lies('docker-compose.yml');

// --- 1. Das Backend laeuft nicht als root ---------------------------------
console.log('\n1 — Container-Nutzer:');

pruefe('das Backend-Image setzt USER node', () => {
  assert.ok(/^USER node$/m.test(backendDocker));
});

pruefe('USER steht nach dem COPY, sonst greift es fuer den Build nicht', () => {
  assert.ok(backendDocker.indexOf('COPY --chown=node:node . .')
    < backendDocker.indexOf('USER node'));
});

pruefe('die Anwendungsdateien gehoeren node', () => {
  assert.ok(/COPY --chown=node:node \. \./.test(backendDocker),
    'ohne --chown gehoert /app root und node kann dort nichts anlegen');
});

pruefe('npm ci --omit=dev statt npm install', () => {
  assert.ok(/npm ci --omit=dev/.test(backendDocker));
  assert.ok(!/RUN npm install/.test(backendDocker));
});

pruefe('nodemon ist die einzige devDependency und laeuft nicht im Betrieb', () => {
  // Sonst waere --omit=dev ein Bruch.
  const pkg = JSON.parse(lies('backend/package.json'));
  assert.deepStrictEqual(Object.keys(pkg.devDependencies || {}), ['nodemon']);
  assert.ok(/CMD \["node", "app\.js"\]/.test(backendDocker),
    'der Start darf nicht ueber nodemon laufen');
});

pruefe('package-lock.json passt zu package.json — sonst bricht npm ci', () => {
  const pkg = JSON.parse(lies('backend/package.json'));
  const lock = JSON.parse(lies('backend/package-lock.json'));
  const wurzelEintrag = lock.packages[''];
  for (const [name, bereich] of Object.entries(pkg.dependencies)) {
    assert.strictEqual(wurzelEintrag.dependencies?.[name], bereich,
      `${name} weicht ab — npm ci bricht bei Abweichung hart ab`);
  }
});

pruefe('die Entwicklungs-Compose setzt user: root wegen des Bind-Mounts', () => {
  // ./backend:/app gehoert dem Host; ohne diese Zeile koennte node dort
  // nicht lesen und die Entwicklungsumgebung startete nicht mehr.
  assert.ok(/user: root/.test(composeDev));
  assert.ok(/\.\/backend:\/app/.test(composeDev));
});

pruefe('die Produktions-Compose hat keinen Bind-Mount auf /app', () => {
  const prod = lies('docker-compose.example.yml');
  assert.ok(!/\.\/backend:\/app/.test(prod),
    'dort muss USER node ohne Ausnahme greifen');
});

pruefe('der einzige Schreibzugriff geht nach /tmp', () => {
  // Waere es ein anderes Verzeichnis, koennte node dort nicht schreiben.
  const pdf = lies('backend/utils/xlsxToPdf.js');
  assert.ok(/os\.tmpdir\(\)/.test(pdf));
  assert.ok(/HOME: tmpDir/.test(pdf) || /HOME:/.test(pdf),
    'LibreOffice braucht ein beschreibbares HOME');
});

// --- 2. Sicherheits-Kopfzeilen --------------------------------------------
console.log('\n2 — Kopfzeilen der Oberflaeche:');

for (const name of ['X-Content-Type-Options', 'X-Frame-Options',
                    'Referrer-Policy', 'Content-Security-Policy']) {
  pruefe(`${name} ist gesetzt`, () => {
    assert.ok(new RegExp(`add_header ${name} `).test(header));
  });
}

pruefe('jede Kopfzeile traegt always', () => {
  const zeilen = header.split('\n').filter((z) => z.trim().startsWith('add_header'));
  assert.ok(zeilen.length >= 4);
  for (const z of zeilen) {
    assert.ok(/ always;$/.test(z.trim()),
      `ohne always fehlt die Kopfzeile bei 404/304: ${z.trim().slice(0, 60)}`);
  }
});

pruefe('JEDER location-Block bindet die Kopfzeilen ein', () => {
  // Der eigentliche Fallstrick: nginx vererbt add_header nicht, sobald ein
  // location-Block selbst eines setzt — und fuenf Bloecke tun das fuer die
  // Cache-Steuerung.
  const bloecke = nginx.split('location ').slice(1);
  assert.ok(bloecke.length >= 6, `nur ${bloecke.length} location-Bloecke gefunden`);
  for (const b of bloecke) {
    const kopf = b.split('\n')[0];
    assert.ok(/include \/etc\/nginx\/security-headers\.conf;/.test(b.split('}')[0]),
      `location ${kopf} ohne Kopfzeilen — dort fehlten sie im Betrieb`);
  }
});

pruefe('auch der server-Block bindet sie ein', () => {
  const vorErstemLocation = nginx.split('location ')[0];
  assert.ok(/include \/etc\/nginx\/security-headers\.conf;/.test(vorErstemLocation));
});

pruefe('die Datei landet im Image', () => {
  assert.ok(/COPY \.\/security-headers\.conf \/etc\/nginx\/security-headers\.conf/
    .test(frontendDocker));
});

pruefe('die Cache-Kopfzeilen sind erhalten geblieben', () => {
  // Beim Einfuegen der Includes durfte nichts verlorengehen.
  assert.ok(/max-age=31536000, immutable/.test(nginx), '/assets/ bleibt langlebig');
  const noCache = nginx.match(/no-cache, no-store, must-revalidate/g) || [];
  assert.strictEqual(noCache.length, 3, 'sw.js, config.js und index.html');
});

// --- 3. Die CSP passt zu dem, was die App wirklich laedt -------------------
console.log('\n3 — Die CSP bricht nichts:');

const csp = header.split('Content-Security-Policy "')[1].split('"')[0];

pruefe('der Dienst fuer die Adresssuche ist erlaubt', () => {
  assert.ok(csp.includes('https://photon.komoot.io'),
    'sonst faellt die Adresssuche und der Standort-Knopf aus');
});

pruefe('das Instanz-Verzeichnis ist erlaubt', () => {
  assert.ok(csp.includes('https://verzeichnis.kkd-fahrtenbuch.de'));
});

pruefe('alle externen Ziele des Frontends stehen in connect-src', () => {
  // Gegenprobe gegen den Quelltext: Was dort aufgerufen wird, muss erlaubt
  // sein — sonst bricht die CSP genau die Funktion, die sie schuetzen soll.
  const quellen = ['src/components/useAdressSuche.js', 'src/api/instanzen.js']
    .map((p) => lies('frontend/' + p)).join('\n');
  const ziele = new Set((quellen.match(/https:\/\/[a-zA-Z0-9.-]+/g) || []));
  const connectSrc = csp.split('connect-src')[1].split(';')[0];
  for (const ziel of ziele) {
    assert.ok(connectSrc.includes(ziel), `${ziel} fehlt in connect-src`);
  }
});

pruefe('style-src erlaubt inline — der Startblock in index.html braucht es', () => {
  const html = lies('frontend/index.html');
  assert.ok(/<style>/.test(html), 'die Annahme muss stimmen');
  assert.ok(/style-src [^;]*'unsafe-inline'/.test(csp));
});

pruefe('script-src erlaubt KEIN inline', () => {
  const html = lies('frontend/index.html');
  // Beide Skripte haengen an src, es gibt kein Inline-Skript.
  assert.ok(!/<script(?![^>]*src=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/.test(html),
    'es duerfte kein Inline-Skript geben');
  const scriptSrc = csp.split('script-src')[1].split(';')[0];
  assert.ok(!scriptSrc.includes('unsafe-inline'));
  assert.ok(!scriptSrc.includes('unsafe-eval'));
});

pruefe('die Seite laesst sich nicht einbetten', () => {
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

pruefe('kein HSTS — TLS endet bei Caddy, nicht hier', () => {
  assert.ok(!/Strict-Transport-Security/i.test(header),
    'der Container hoert nur auf Port 80');
});

console.log('\n' + geprueft + ' Pruefungen bestanden.');
