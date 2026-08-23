// Testet die Doku-Route ohne Datenbank: eine Mini-App mit derselben Route.
process.env.DOKU_USER = 'testnutzer';
process.env.DOKU_PASSWORT = 'testpasswort';

const express = require('express');
const helmet = require('helmet');
const { dokuEinhaengen } = require('../docs/dokuRoute');

const app = express();
app.use(['/api-docs', '/api-docs.json'], helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
  } },
  crossOriginEmbedderPolicy: false,
}));
dokuEinhaengen(app);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const basis = `http://127.0.0.1:${port}`;
  const gut = Buffer.from('testnutzer:testpasswort').toString('base64');
  const schlecht = Buffer.from('testnutzer:falsch').toString('base64');

  async function hole(pfad, kopf) {
    const r = await fetch(basis + pfad, kopf ? { headers: { Authorization: kopf } } : undefined);
    const text = await r.text();
    return { status: r.status, auth: r.headers.get('www-authenticate'), csp: r.headers.get('content-security-policy'), text };
  }

  let fehler = 0;
  function pruefe(name, bedingung, zusatz = '') {
    console.log((bedingung ? '  ok  ' : '  FEHLER  ') + name + (bedingung ? '' : ' — ' + zusatz));
    if (!bedingung) fehler++;
  }

  console.log('\nZugriffsschutz:');
  const ohne = await hole('/api-docs/');
  pruefe('ohne Anmeldung: 401', ohne.status === 401, 'war ' + ohne.status);
  pruefe('fordert Basic-Auth an', /^Basic realm=/.test(ohne.auth || ''), ohne.auth);

  const falsch = await hole('/api-docs/', 'Basic ' + schlecht);
  pruefe('falsches Passwort: 401', falsch.status === 401, 'war ' + falsch.status);

  const richtig = await hole('/api-docs/', 'Basic ' + gut);
  pruefe('richtiges Passwort: 200', richtig.status === 200, 'war ' + richtig.status);
  pruefe('liefert die Swagger-Oberflaeche', richtig.text.includes('swagger-ui'), '');
  pruefe('eigenes CSS ist drin', richtig.text.includes('--doku-brand'), '');
  pruefe('Seitentitel gesetzt', /API-Dokumentation/.test(richtig.text), '');

  console.log('\nSicherheitskopf:');
  pruefe('CSP gesetzt', !!richtig.csp, '');
  pruefe('CSP erlaubt Inline-Styles', /style-src[^;]*unsafe-inline/.test(richtig.csp || ''), richtig.csp);
  pruefe('CSP verbietet Einbettung', /frame-ancestors 'none'/.test(richtig.csp || ''), '');

  console.log('\nSpezifikation als JSON:');
  const jsonOhne = await hole('/api-docs.json');
  pruefe('ohne Anmeldung: 401', jsonOhne.status === 401, 'war ' + jsonOhne.status);
  const jsonMit = await hole('/api-docs.json', 'Basic ' + gut);
  pruefe('mit Anmeldung: 200', jsonMit.status === 200, 'war ' + jsonMit.status);
  let spec = null;
  try { spec = JSON.parse(jsonMit.text); } catch (e) {}
  pruefe('ist gueltiges JSON', !!spec, '');
  if (spec) {
    const anzahl = Object.values(spec.paths).reduce((n, ops) =>
      n + Object.keys(ops).filter(m => ['get','post','put','delete','patch'].includes(m)).length, 0);
    pruefe('enthaelt 77 Operationen', anzahl === 77, 'waren ' + anzahl);
    pruefe('OpenAPI 3.1', spec.openapi === '3.1.0', spec.openapi);
    pruefe('beide Anmeldewege beschrieben',
      !!spec.components.securitySchemes.Token && !!spec.components.securitySchemes.ApiSchluessel, '');
    pruefe('keine Secrets in der Spezifikation',
      !/DOKU_PASSWORT|testpasswort|asjoi3j|4kkhXU/.test(jsonMit.text), '');
  }

  console.log('\nAbschaltung ohne Zugangsdaten:');
  delete process.env.DOKU_USER;
  delete process.env.DOKU_PASSWORT;
  const app2 = express();
  const eingehaengt = dokuEinhaengen(app2);
  pruefe('Doku bleibt aus, wenn Zugangsdaten fehlen', eingehaengt === false, '');

  console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
  server.close();
  process.exit(fehler === 0 ? 0 : 1);
});
