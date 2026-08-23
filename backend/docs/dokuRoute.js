// Swagger-Oberflaeche unter /api-docs, geschuetzt per Basic-Auth.
//
// Warum geschuetzt: Die Doku listet jeden Endpunkt samt Admin-Routen,
// Berechtigungen und Rate-Limits auf. Das ist keine Geheimhaltung — die API
// selbst bleibt ja gesichert —, aber es muss nicht offen im Netz stehen und
// von Scannern eingesammelt werden.
//
// Zugang ueber DOKU_USER und DOKU_PASSWORT. Fehlt eines von beiden, bleibt die
// Doku komplett abgeschaltet: lieber gar keine Doku als eine offene.

const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const { baueSpezifikation } = require('./openapi');

// Zeitkonstanter Vergleich. Ein einfaches === verraet ueber die Laufzeit,
// wie viele Zeichen stimmen — bei einem Passwort ist das vermeidbar.
function gleich(a, b) {
  const pufferA = Buffer.from(String(a));
  const pufferB = Buffer.from(String(b));
  if (pufferA.length !== pufferB.length) {
    // Trotzdem vergleichen, damit die Laufzeit nicht von der Laenge abhaengt
    crypto.timingSafeEqual(pufferA, pufferA);
    return false;
  }
  return crypto.timingSafeEqual(pufferA, pufferB);
}

function basicAuth(benutzer, passwort) {
  return (req, res, next) => {
    const kopf = req.headers.authorization || '';
    if (kopf.startsWith('Basic ')) {
      const klartext = Buffer.from(kopf.slice(6), 'base64').toString('utf8');
      const trenner = klartext.indexOf(':');
      const eingegebenerBenutzer = klartext.slice(0, trenner);
      const eingegebenesPasswort = klartext.slice(trenner + 1);
      // Beide Vergleiche immer ausfuehren, nicht per && abkuerzen
      const benutzerOk = gleich(eingegebenerBenutzer, benutzer);
      const passwortOk = gleich(eingegebenesPasswort, passwort);
      if (benutzerOk && passwortOk) return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Fahrtenbuch API-Dokumentation", charset="UTF-8"');
    return res.status(401).type('text/plain; charset=utf-8').send('Anmeldung erforderlich.');
  };
}

// Eigenes Erscheinungsbild: Swagger bringt ein sehr buntes Standardgruen mit,
// das neben dem Fahrtenbuch fremd wirkt. Hier die Farben der App, ruhigere
// Flaechen — und ein Dunkelmodus, der der Systemeinstellung folgt.
const EIGENES_CSS = `
  :root {
    --doku-brand: #0F5257;
    --doku-brand-soft: #DBEAEA;
    --doku-text: #14201F;
    --doku-text-2: #4A5C5B;
    --doku-flaeche: #FFFFFF;
    --doku-grund: #F5F8F8;
    --doku-linie: #D8E3E3;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --doku-brand: #35B6AA;
      --doku-brand-soft: #10393A;
      --doku-text: #E6EFEE;
      --doku-text-2: #9DB3B2;
      --doku-flaeche: #10201F;
      --doku-grund: #0A1716;
      --doku-linie: #24403F;
    }
  }

  body { background: var(--doku-grund); }
  .swagger-ui { color: var(--doku-text); }
  .swagger-ui .topbar { display: none; }

  /* Kopfbereich */
  .swagger-ui .info { margin: 32px 0 24px; }
  .swagger-ui .info .title { color: var(--doku-text); font-weight: 600; letter-spacing: -0.02em; }
  .swagger-ui .info .title small.version-stamp { background: var(--doku-brand); }
  .swagger-ui .info li, .swagger-ui .info p, .swagger-ui .info table { color: var(--doku-text-2); }
  .swagger-ui .info a { color: var(--doku-brand); }
  .swagger-ui .info code { background: var(--doku-brand-soft); color: var(--doku-brand); padding: 1px 5px; border-radius: 4px; }

  /* Gruppen */
  .swagger-ui .opblock-tag {
    color: var(--doku-text); border-bottom: 1px solid var(--doku-linie);
    font-weight: 600; letter-spacing: -0.01em;
  }
  .swagger-ui .opblock-tag small { color: var(--doku-text-2); }

  /* Endpunkte: ruhigere Flaechen als der Swagger-Standard */
  .swagger-ui .opblock {
    border-radius: 12px; margin: 0 0 12px; box-shadow: none;
    border: 1px solid var(--doku-linie); background: var(--doku-flaeche);
  }
  .swagger-ui .opblock .opblock-summary { border-color: transparent; }
  .swagger-ui .opblock .opblock-summary-path,
  .swagger-ui .opblock .opblock-summary-description { color: var(--doku-text); }
  .swagger-ui .opblock.opblock-get    { border-color: var(--doku-linie); background: var(--doku-flaeche); }
  .swagger-ui .opblock.opblock-get .opblock-summary-method    { background: #2C6E75; }
  .swagger-ui .opblock.opblock-post   { border-color: var(--doku-linie); background: var(--doku-flaeche); }
  .swagger-ui .opblock.opblock-post .opblock-summary-method   { background: #2E7D5B; }
  .swagger-ui .opblock.opblock-put    { border-color: var(--doku-linie); background: var(--doku-flaeche); }
  .swagger-ui .opblock.opblock-put .opblock-summary-method    { background: #9A6B1E; }
  .swagger-ui .opblock.opblock-delete { border-color: var(--doku-linie); background: var(--doku-flaeche); }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: #A34A42; }

  /* Knoepfe */
  .swagger-ui .btn { border-radius: 8px; box-shadow: none; }
  .swagger-ui .btn.authorize { color: var(--doku-brand); border-color: var(--doku-brand); }
  .swagger-ui .btn.authorize svg { fill: var(--doku-brand); }
  .swagger-ui .btn.execute { background: var(--doku-brand); border-color: var(--doku-brand); }

  /* Formulare und Tabellen */
  .swagger-ui select, .swagger-ui input[type=text], .swagger-ui textarea {
    border-radius: 8px; border-color: var(--doku-linie);
    background: var(--doku-flaeche); color: var(--doku-text);
  }
  .swagger-ui .parameter__name, .swagger-ui table thead tr th,
  .swagger-ui .response-col_status, .swagger-ui .tab li { color: var(--doku-text); }
  .swagger-ui .parameter__type, .swagger-ui .response-col_description { color: var(--doku-text-2); }
  .swagger-ui .model-title, .swagger-ui .model { color: var(--doku-text); }
  .swagger-ui section.models { border-color: var(--doku-linie); }
  .swagger-ui section.models .model-container { background: var(--doku-flaeche); }

  /* Dunkelmodus: Swagger setzt an einigen Stellen harte Weisstoene */
  @media (prefers-color-scheme: dark) {
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-external-docs-wrapper p,
    .swagger-ui .opblock-title_normal p,
    .swagger-ui .renderedMarkdown p,
    .swagger-ui label { color: var(--doku-text-2); }
    .swagger-ui .scheme-container { background: var(--doku-flaeche); box-shadow: none; border: 1px solid var(--doku-linie); }
    .swagger-ui .dialog-ux .modal-ux { background: var(--doku-flaeche); border-color: var(--doku-linie); }
    .swagger-ui .dialog-ux .modal-ux-header h3,
    .swagger-ui .dialog-ux .modal-ux-content h4,
    .swagger-ui .dialog-ux .modal-ux-content p { color: var(--doku-text); }
    .swagger-ui .highlight-code > .microlight { background: #0A1716; }
    .swagger-ui .model-box { background: rgba(255,255,255,0.03); }
    .swagger-ui table thead tr td, .swagger-ui table thead tr th { border-color: var(--doku-linie); }
  }
`;

function dokuEinhaengen(app) {
  const benutzer = process.env.DOKU_USER;
  const passwort = process.env.DOKU_PASSWORT;

  if (!benutzer || !passwort) {
    console.log('API-Dokumentation ist aus: DOKU_USER und DOKU_PASSWORT sind nicht gesetzt.');
    return false;
  }

  const schutz = basicAuth(benutzer, passwort);
  const spezifikation = baueSpezifikation();

  // Die reine Beschreibung — nuetzlich fuer Postman, Insomnia oder
  // Client-Generatoren. Gleicher Schutz wie die Oberflaeche.
  app.get('/api-docs.json', schutz, (req, res) => {
    res.type('application/json; charset=utf-8').send(JSON.stringify(spezifikation, null, 2));
  });

  app.use(
    '/api-docs',
    schutz,
    swaggerUi.serve,
    swaggerUi.setup(spezifikation, {
      customCss: EIGENES_CSS,
      customSiteTitle: (process.env.REACT_APP_TITLE || 'Fahrtenbuch') + ' — API-Dokumentation',
      swaggerOptions: {
        // Endpunkte eingeklappt: 77 Stueck offen sind unuebersichtlich
        docExpansion: 'none',
        // Suchfeld ueber den Gruppen
        filter: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        defaultModelsExpandDepth: 0,
        displayRequestDuration: true,
      },
    })
  );

  console.log('API-Dokumentation: /api-docs (Basic-Auth)');
  return true;
}

module.exports = { dokuEinhaengen, basicAuth };
