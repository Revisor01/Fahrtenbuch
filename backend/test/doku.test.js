// Testet die Doku-Route ohne Datenbank: eine Mini-App mit derselben Route.
//
// Geprueft wird der Weg, den ein Mensch im Browser geht: Anmeldeseite sehen,
// Formular abschicken, Cookie bekommen, Swagger sehen, abmelden.

process.env.DOKU_USER = 'testnutzer';
process.env.DOKU_PASSWORT = 'testpasswort';
process.env.JWT_SECRET = 'test-geheimnis-nur-fuer-diesen-lauf';

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

  let fehler = 0;
  function pruefe(name, bedingung, zusatz = '') {
    console.log((bedingung ? '  ok  ' : '  FEHLER  ') + name + (bedingung ? '' : ' — ' + zusatz));
    if (!bedingung) fehler++;
  }

  async function hole(pfad, optionen = {}) {
    const r = await fetch(basis + pfad, { redirect: 'manual', ...optionen });
    return {
      status: r.status,
      auth: r.headers.get('www-authenticate'),
      cookie: r.headers.get('set-cookie'),
      ort: r.headers.get('location'),
      text: await r.text(),
    };
  }

  async function anmelden(benutzer, passwort) {
    return hole('/api-docs/anmelden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ benutzer, passwort }).toString(),
    });
  }

  console.log('\nAnmeldeseite statt Browser-Dialog:');
  const ohne = await hole('/api-docs/');
  pruefe('ohne Anmeldung: 401', ohne.status === 401, 'war ' + ohne.status);
  pruefe('KEIN WWW-Authenticate (sonst oeffnet der Browser-Dialog)', !ohne.auth, String(ohne.auth));
  pruefe('zeigt die eigene Anmeldeseite', ohne.text.includes('<form method="post"'), '');
  pruefe('Seite nennt den Zweck', ohne.text.includes('API-Dokumentation'), '');
  pruefe('Seite laedt nichts von aussen', !/https?:\/\/(?!127\.0\.0\.1)/.test(ohne.text.replace(/<svg[\s\S]*?<\/svg>/g, '')), '');

  console.log('\nAnmeldung:');
  const falsch = await anmelden('testnutzer', 'falsch');
  pruefe('falsches Passwort: 401', falsch.status === 401, 'war ' + falsch.status);
  pruefe('falsches Passwort: kein Cookie', !falsch.cookie, String(falsch.cookie));
  pruefe('falsches Passwort: Hinweis auf der Seite', falsch.text.includes('stimmt nicht'), '');

  const falscherNutzer = await anmelden('jemand', 'testpasswort');
  pruefe('falscher Benutzer: 401', falscherNutzer.status === 401, 'war ' + falscherNutzer.status);

  const richtig = await anmelden('testnutzer', 'testpasswort');
  pruefe('richtige Daten: Weiterleitung', richtig.status === 303, 'war ' + richtig.status);
  pruefe('leitet auf die Doku', richtig.ort === '/api-docs/', String(richtig.ort));
  pruefe('setzt ein Cookie', !!richtig.cookie, '');
  pruefe('Cookie ist httpOnly', /httponly/i.test(richtig.cookie || ''), richtig.cookie);
  pruefe('Cookie ist SameSite=Lax', /samesite=lax/i.test(richtig.cookie || ''), richtig.cookie);
  pruefe('Cookie gilt nur fuer /api-docs', /path=\/api-docs/i.test(richtig.cookie || ''), richtig.cookie);

  const keks = (richtig.cookie || '').split(';')[0];

  console.log('\nMit Anmeldung:');
  const drin = await hole('/api-docs/', { headers: { Cookie: keks } });
  pruefe('Doku erreichbar: 200', drin.status === 200, 'war ' + drin.status);
  pruefe('liefert die Swagger-Oberflaeche', drin.text.includes('swagger-ui'), '');
  pruefe('Seitentitel gesetzt', /API-Dokumentation/.test(drin.text), '');
  pruefe('KEIN eigenes Swagger-CSS (Standard-Look)', !drin.text.includes('--doku-brand'), '');

  console.log('\nGefaelschtes Cookie:');
  const gefaelscht = await hole('/api-docs/', { headers: { Cookie: 'fb_doku=9999999999.abc123' } });
  pruefe('falsche Signatur wird abgewiesen', gefaelscht.status === 401, 'war ' + gefaelscht.status);
  const abgelaufen = await hole('/api-docs/', { headers: { Cookie: 'fb_doku=1.abc' } });
  pruefe('abgelaufenes Cookie wird abgewiesen', abgelaufen.status === 401, 'war ' + abgelaufen.status);

  console.log('\nSpezifikation als JSON:');
  const jsonOhne = await hole('/api-docs.json');
  pruefe('ohne Anmeldung: 401', jsonOhne.status === 401, 'war ' + jsonOhne.status);
  pruefe('antwortet JSON, nicht HTML', jsonOhne.text.trim().startsWith('{'), jsonOhne.text.slice(0, 40));
  const jsonMit = await hole('/api-docs.json', { headers: { Cookie: keks } });
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
      !/testpasswort|test-geheimnis|asjoi3j|4kkhXU/.test(jsonMit.text), '');
  }

  console.log('\nAbmelden:');
  const raus = await hole('/api-docs/abmelden', { method: 'POST', headers: { Cookie: keks } });
  pruefe('leitet zurueck', raus.status === 303, 'war ' + raus.status);
  pruefe('loescht das Cookie', /fb_doku=;/.test(raus.cookie || ''), String(raus.cookie));

  console.log('\nAbschaltung ohne Zugangsdaten:');
  delete process.env.DOKU_USER;
  delete process.env.DOKU_PASSWORT;
  pruefe('Doku bleibt aus, wenn Zugangsdaten fehlen', dokuEinhaengen(express()) === false, '');

  console.log(fehler === 0 ? '\nAlle Pruefungen bestanden.' : '\n' + fehler + ' FEHLER');
  server.close();
  process.exit(fehler === 0 ? 0 : 1);
});
