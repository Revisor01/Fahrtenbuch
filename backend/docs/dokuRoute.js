// Swagger-Oberflaeche unter /api-docs, geschuetzt durch eine eigene Anmeldeseite.
//
// Warum geschuetzt: Die Doku listet jeden Endpunkt samt Admin-Routen,
// Berechtigungen und Rate-Limits auf. Das ist keine Geheimhaltung — die API
// selbst bleibt gesichert —, aber es muss nicht offen im Netz stehen und von
// Scannern eingesammelt werden.
//
// Warum kein Basic-Auth: Der Browser-Dialog laesst sich nicht gestalten, passt
// nicht zum Rest der App und bietet keinen Weg, sich wieder abzumelden. Hier
// steht stattdessen eine eigene Seite; die Anmeldung haelt ein signiertes
// Cookie fuer acht Stunden.
//
// Die Swagger-Oberflaeche selbst bleibt bewusst im Standard-Aussehen.
//
// Zugang ueber DOKU_USER und DOKU_PASSWORT. Fehlt eines von beiden, bleibt die
// Doku komplett abgeschaltet: lieber gar keine Doku als eine offene.

const crypto = require('crypto');
const swaggerUi = require('swagger-ui-express');
const { baueSpezifikation } = require('./openapi');

const COOKIE_NAME = 'fb_doku';
const SITZUNG_SEKUNDEN = 8 * 60 * 60; // acht Stunden

// Zeitkonstanter Vergleich. Ein einfaches === verraet ueber die Laufzeit, wie
// viele Zeichen stimmen — bei einem Passwort ist das vermeidbar.
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

// --- Sitzung --------------------------------------------------------------
// Ein eigenes kleines Token statt jsonwebtoken: Hier steht nur ein Ablauf-
// zeitpunkt drin, und die Pruefung soll ohne Umweg lesbar bleiben.

function tokenErzeugen(geheimnis) {
  const laeuftAb = Math.floor(Date.now() / 1000) + SITZUNG_SEKUNDEN;
  const inhalt = String(laeuftAb);
  const signatur = crypto.createHmac('sha256', geheimnis).update(inhalt).digest('hex');
  return inhalt + '.' + signatur;
}

function tokenGueltig(token, geheimnis) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [inhalt, signatur] = token.split('.');
  if (!inhalt || !signatur) return false;
  const erwartet = crypto.createHmac('sha256', geheimnis).update(inhalt).digest('hex');
  if (!gleich(signatur, erwartet)) return false;
  const laeuftAb = Number(inhalt);
  return Number.isFinite(laeuftAb) && laeuftAb > Math.floor(Date.now() / 1000);
}

// Cookies aus dem Header lesen. cookie-parser waere eine weitere Abhaengigkeit
// fuer genau einen Wert.
function cookieLesen(req, name) {
  const kopf = req.headers.cookie;
  if (!kopf) return null;
  for (const teil of kopf.split(';')) {
    const trenner = teil.indexOf('=');
    if (trenner < 0) continue;
    if (teil.slice(0, trenner).trim() === name) {
      return decodeURIComponent(teil.slice(trenner + 1).trim());
    }
  }
  return null;
}

// --- Anmeldeseite ---------------------------------------------------------
// Eigenstaendige Seite in den Farben der App. Sie laedt nichts nach, damit sie
// unter der strengen CSP dieser Route funktioniert.

function anmeldeSeite({ titel, fehler }) {
  const hinweis = fehler
    ? '<p class="fehler" role="alert">Benutzername oder Passwort stimmt nicht.</p>'
    : '';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Anmelden — ${titel}</title>
<style>
  :root {
    --brand: #0F5257; --brand-strong: #0A3B3F; --on-brand: #fff;
    --text: #14201F; --text-2: #4A5C5B;
    --flaeche: #fff; --grund: #F5F8F8; --linie: #D8E3E3;
    --danger: #A34A42;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --brand: #35B6AA; --brand-strong: #6BD8CC; --on-brand: #032220;
      --text: #E6EFEE; --text-2: #9DB3B2;
      --flaeche: #10201F; --grund: #0A1716; --linie: #24403F;
      --danger: #E88A80;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; min-height: 100dvh;
    display: flex; align-items: center; justify-content: center;
    padding: 24px; background: var(--grund); color: var(--text);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .karte {
    width: 100%; max-width: 380px; background: var(--flaeche);
    border: 1px solid var(--linie); border-radius: 16px;
    padding: 32px 28px; box-shadow: 0 12px 32px -16px rgba(8,32,31,.28);
  }
  .marke {
    display: flex; align-items: center; gap: 10px; margin-bottom: 4px;
    font-size: 15px; font-weight: 600; color: var(--brand);
  }
  .marke svg { flex-shrink: 0; }
  h1 { margin: 0 0 6px; font-size: 22px; font-weight: 600; letter-spacing: -.02em; }
  .unterzeile { margin: 0 0 24px; font-size: 15px; color: var(--text-2); }
  label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; }
  input {
    width: 100%; height: 46px; padding: 0 14px; margin-bottom: 16px;
    font-size: 16px; color: var(--text); background: var(--grund);
    border: 1px solid var(--linie); border-radius: 10px;
    transition: border-color 150ms ease, box-shadow 150ms ease;
  }
  input:focus {
    outline: none; border-color: var(--brand);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--brand) 18%, transparent);
  }
  button {
    width: 100%; height: 48px; border: 0; border-radius: 10px;
    font-size: 16px; font-weight: 600; color: var(--on-brand);
    background: var(--brand); cursor: pointer;
    transition: background-color 150ms ease;
  }
  button:hover { background: var(--brand-strong); }
  .fehler {
    margin: 0 0 16px; padding: 10px 12px; border-radius: 10px;
    font-size: 14px; color: var(--danger);
    background: color-mix(in srgb, var(--danger) 12%, transparent);
  }
  .fuss { margin: 20px 0 0; font-size: 13px; color: var(--text-2); text-align: center; }
</style>
</head>
<body>
  <main class="karte">
    <div class="marke">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 17h14M5 17a2 2 0 0 1-2-2v-3l2-5h14l2 5v3a2 2 0 0 1-2 2M5 17v2M19 17v2"/>
        <circle cx="7.5" cy="14.5" r="1"/><circle cx="16.5" cy="14.5" r="1"/>
      </svg>
      ${titel}
    </div>
    <h1>API-Dokumentation</h1>
    <p class="unterzeile">Bitte anmelden, um die Schnittstelle einzusehen.</p>
    ${hinweis}
    <form method="post" action="/api-docs/anmelden">
      <label for="benutzer">Benutzername</label>
      <input id="benutzer" name="benutzer" type="text" autocomplete="username" autocapitalize="none" autocorrect="off" required autofocus>
      <label for="passwort">Passwort</label>
      <input id="passwort" name="passwort" type="password" autocomplete="current-password" required>
      <button type="submit">Anmelden</button>
    </form>
    <p class="fuss">Die Anmeldung gilt acht Stunden.</p>
  </main>
</body>
</html>`;
}

// --- Einhaengen -----------------------------------------------------------

function dokuEinhaengen(app) {
  const benutzer = process.env.DOKU_USER;
  const passwort = process.env.DOKU_PASSWORT;

  if (!benutzer || !passwort) {
    console.log('API-Dokumentation ist aus: DOKU_USER und DOKU_PASSWORT sind nicht gesetzt.');
    return false;
  }

  // Eigenes Geheimnis fuer die Cookie-Signatur, abgeleitet aus JWT_SECRET.
  // So kann ein Doku-Cookie nie als Sitzungstoken der App durchgehen.
  const geheimnis = crypto
    .createHash('sha256')
    .update(String(process.env.JWT_SECRET || '') + '|doku')
    .digest();

  const titel = process.env.REACT_APP_TITLE || 'Fahrtenbuch';
  const spezifikation = baueSpezifikation();
  const angemeldet = (req) => tokenGueltig(cookieLesen(req, COOKIE_NAME), geheimnis);

  // Formularauswertung nur fuer diese eine Route — express.urlencoded global
  // einzuschalten waere eine Aenderung an der ganzen App.
  const formular = require('express').urlencoded({ extended: false });

  app.post('/api-docs/anmelden', formular, (req, res) => {
    const eingegebenerBenutzer = (req.body && req.body.benutzer) || '';
    const eingegebenesPasswort = (req.body && req.body.passwort) || '';
    // Beide Vergleiche immer ausfuehren, nicht per && abkuerzen
    const benutzerOk = gleich(eingegebenerBenutzer, benutzer);
    const passwortOk = gleich(eingegebenesPasswort, passwort);

    if (!benutzerOk || !passwortOk) {
      return res
        .status(401)
        .type('text/html; charset=utf-8')
        .send(anmeldeSeite({ titel, fehler: true }));
    }

    res.cookie(COOKIE_NAME, tokenErzeugen(geheimnis), {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      maxAge: SITZUNG_SEKUNDEN * 1000,
      path: '/api-docs',
    });
    res.redirect(303, '/api-docs/');
  });

  app.post('/api-docs/abmelden', (req, res) => {
    res.clearCookie(COOKIE_NAME, { path: '/api-docs' });
    res.redirect(303, '/api-docs/');
  });

  const schutz = (req, res, next) => {
    if (angemeldet(req)) return next();
    // Kein 401 mit WWW-Authenticate: Das oeffnete wieder den Browser-Dialog.
    res.status(401).type('text/html; charset=utf-8').send(anmeldeSeite({ titel, fehler: false }));
  };

  // Die reine Beschreibung — fuer Postman, Insomnia oder Client-Generatoren.
  // Hier antwortet JSON statt einer Anmeldeseite, sonst bekaeme ein Skript HTML.
  //
  // Sie liegt UNTERHALB von /api-docs, nicht daneben: Das Sitzungs-Cookie gilt
  // fuer den Pfad /api-docs, und ein Browser schickt es an /api-docs.json nicht
  // mit — die Datei blieb damit auch nach der Anmeldung unerreichbar
  // (gemessen auf Produktion, 24.08.).
  const spezifikationSenden = (req, res) => {
    if (!angemeldet(req)) {
      return res.status(401).json({ message: 'Bitte zuerst unter /api-docs anmelden.' });
    }
    res.type('application/json; charset=utf-8').send(JSON.stringify(spezifikation, null, 2));
  };

  app.get('/api-docs/spezifikation.json', spezifikationSenden);

  // Alte Adresse: fuer angemeldete Aufrufe weiterleiten, fuer Skripte mit
  // eigenem Cookie-Umgang direkt ausliefern.
  app.get('/api-docs.json', (req, res) => {
    if (angemeldet(req)) return spezifikationSenden(req, res);
    res.redirect(307, '/api-docs/spezifikation.json');
  });

  app.use(
    '/api-docs',
    schutz,
    swaggerUi.serve,
    swaggerUi.setup(spezifikation, {
      customSiteTitle: titel + ' — API-Dokumentation',
      swaggerOptions: {
        // Endpunkte eingeklappt: 77 Stueck offen sind unuebersichtlich
        docExpansion: 'none',
        filter: true,
        persistAuthorization: true,
        tryItOutEnabled: true,
        defaultModelsExpandDepth: 0,
        displayRequestDuration: true,
      },
    })
  );

  console.log('API-Dokumentation: /api-docs (eigene Anmeldeseite)');
  return true;
}

module.exports = { dokuEinhaengen };
