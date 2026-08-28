// OpenAPI-3.1-Beschreibung der Fahrtenbuch-API.
//
// Bewusst als JS-Modul und nicht als YAML: Titel, Server-URL und Beschreibung
// kommen aus der Umgebung, damit dieselbe Datei bei jedem Kirchenkreis die
// richtige Adresse zeigt.
//
// Gepflegt wird sie zusammen mit den Routen — eine neue Route gehoert hier
// hinein, im selben Commit.

const ANTWORT = (beschreibung, beispiel) => ({
  description: beschreibung,
  content: { 'application/json': { schema: { type: 'object' }, example: beispiel } },
});

const MELDUNG = (text) => ANTWORT(text, { message: text });

// Wiederkehrende Fehlerantworten. Sie gelten fuer nahezu jeden Endpunkt und
// stehen deshalb einmal zentral.
const FEHLER = {
  401: ANTWORT('Nicht angemeldet oder Token abgelaufen', { message: 'Keine Authentifizierung vorhanden' }),
  403: MELDUNG('Keine Berechtigung für diese Aktion'),
  404: MELDUNG('Nicht gefunden'),
  429: ANTWORT('Zu viele Anfragen', { message: 'Zu viele Anfragen. Bitte kurz warten und erneut versuchen.' }),
  500: MELDUNG('Interner Server-Fehler'),
};

const VALIDIERUNG = ANTWORT('Validierungsfehler', {
  message: 'Validierungsfehler',
  errors: [{ field: 'anlass', message: 'Anlass ist erforderlich' }],
});

// --- Bausteine ------------------------------------------------------------

const schemas = {
  Fahrt: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 2830 },
      datum: { type: 'string', format: 'date', example: '2026-08-24' },
      von_ort_id: { type: ['integer', 'null'], example: 7 },
      nach_ort_id: { type: ['integer', 'null'], example: 8 },
      anlass: { type: 'string', example: 'Dienstbesprechung' },
      kilometer: { type: 'string', example: '32.00' },
      abrechnung: { type: 'string', example: '1' },
      einmaliger_von_ort: { type: ['string', 'null'], example: null },
      einmaliger_nach_ort: { type: ['string', 'null'], example: 'Heide, Marktplatz' },
      partner_fahrt_id: { type: ['integer', 'null'], example: 2831 },
      von_ort_name: { type: 'string', example: 'Hennstedt' },
      nach_ort_name: { type: 'string', example: 'Büsum' },
    },
  },
  FahrtEingabe: {
    type: 'object',
    required: ['datum', 'anlass', 'abrechnung'],
    properties: {
      datum: { type: 'string', format: 'date', example: '2026-08-24' },
      anlass: { type: 'string', minLength: 1, example: 'Dienstbesprechung' },
      abrechnung: { type: 'integer', minimum: 1, example: 1, description: 'ID des Abrechnungsträgers. Pflicht — leer oder 0 wird abgewiesen.' },
      vonOrtId: {
        type: ['integer', 'string', 'null'], example: 7,
        description: 'Leerer Text, 0 und null bedeuten „nicht ausgewählt" und werden zu null. Dann greift der Freitext-Ort.',
      },
      nachOrtId: { type: ['integer', 'string', 'null'], example: 8, description: 'Wie vonOrtId.' },
      kilometer: {
        type: ['number', 'string', 'null'], example: 32,
        description: 'Leerer Text, 0 und null bedeuten „nicht angegeben". Sind dann beide Ort-IDs gesetzt, nimmt der Server die hinterlegte Distanz.',
      },
      einmaligerVonOrt: { type: ['string', 'null'], example: null, description: 'Freitext-Adresse statt gespeichertem Ort.' },
      einmaligerNachOrt: { type: ['string', 'null'], example: 'Heide, Marktplatz' },
      partnerFahrtId: {
        type: ['integer', 'string', 'null'], example: 2830,
        description: 'Verknüpft diese Fahrt als Gegenfahrt mit der angegebenen. Nur beim Anlegen.',
      },
      mitfahrer: {
        type: 'array',
        items: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'Anna Beispiel' },
            arbeitsstaette: { type: ['string', 'null'], example: 'Kirchenkreisamt' },
            richtung: { type: 'string', enum: ['hin', 'rueck', 'hin_rueck'], default: 'hin' },
          },
        },
      },
    },
  },
  Ort: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 7 },
      name: { type: 'string', example: 'Hennstedt' },
      adresse: { type: 'string', example: 'Kirchspiel 1, 25779 Hennstedt' },
      ist_wohnort: { type: 'integer', enum: [0, 1], example: 1 },
      ist_dienstort: { type: 'integer', enum: [0, 1], example: 0 },
      ist_kirchspiel: { type: 'integer', enum: [0, 1], example: 0 },
      sort_order: { type: 'integer', example: 0 },
    },
  },
  Distanz: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 2 },
      von_ort_id: { type: 'integer', example: 7 },
      nach_ort_id: { type: 'integer', example: 8 },
      distanz: { type: 'integer', example: 32 },
    },
  },
  Abrechnungstraeger: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 1 },
      name: { type: 'string', example: 'Kirchenkreis' },
      kostenstelle: { type: ['string', 'null'], example: '1234' },
      active: { type: 'integer', enum: [0, 1], example: 1 },
      sort_order: { type: 'integer', example: 0 },
      aktueller_betrag: { type: ['string', 'null'], example: '0.30' },
      betrag_gueltig_ab: { type: ['string', 'null'], format: 'date', example: '2026-01-01' },
    },
  },
  Anlass: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 3 },
      name: { type: 'string', example: 'Dienstbesprechung' },
      sort_order: { type: 'integer', example: 0 },
      aktiv: { type: 'integer', enum: [0, 1], example: 1 },
      nutzung_anzahl: { type: 'integer', example: 12, description: 'Nur in der Liste, nicht beim Einzelabruf.' },
    },
  },
  Favorit: {
    type: 'object',
    properties: {
      id: { type: 'integer', example: 2 },
      von_ort_id: { type: 'integer', example: 7 },
      nach_ort_id: { type: 'integer', example: 8 },
      anlass: { type: 'string', example: 'Dienstbesprechung' },
      abrechnungstraeger_id: { type: 'integer', example: 1 },
      sort_order: { type: 'integer', example: 0 },
      von_ort_name: { type: 'string', example: 'Hennstedt' },
      nach_ort_name: { type: 'string', example: 'Büsum' },
      traeger_name: { type: 'string', example: 'Kirchenkreis' },
    },
  },
  SortierEingabe: {
    type: 'object',
    required: ['sortOrder'],
    properties: {
      sortOrder: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'sort_order'],
          properties: {
            id: { type: 'integer', minimum: 1, example: 7 },
            sort_order: { type: 'integer', minimum: 0, example: 0 },
          },
        },
      },
    },
  },
};

// --- Hilfsfunktionen fuer wiederkehrende Formen ---------------------------

const pfadId = (beschreibung = 'Kennung des Datensatzes') => ({
  name: 'id', in: 'path', required: true, schema: { type: 'integer' }, description: beschreibung,
});

const liste = (schema, beschreibung) => ({
  200: { description: beschreibung, content: { 'application/json': { schema: { type: 'array', items: { $ref: `#/components/schemas/${schema}` } } } } },
  401: FEHLER[401], 500: FEHLER[500],
});

const koerper = (schema, pflicht = true) => ({
  required: pflicht,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${schema}` } } },
});

// --- Pfade ----------------------------------------------------------------

const paths = {
  // ===================== Anmeldung =====================
  '/api/auth/login': {
    post: {
      tags: ['Anmeldung'], summary: 'Anmelden und Token erhalten',
      description: 'Benutzername **oder** E-Mail plus Passwort. Rate-Limit: 20 Fehlversuche in 10 Minuten je IP (erfolgreiche zählen nicht).',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['username', 'password'],
          properties: {
            username: { type: 'string', example: 'musterfrau', description: 'Benutzername oder E-Mail-Adresse.' },
            password: { type: 'string', format: 'password', example: '••••••••' },
          },
        } } },
      },
      responses: {
        200: ANTWORT('Anmeldung erfolgreich. Das Token gilt standardmäßig 14 Tage.', { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…' }),
        400: VALIDIERUNG,
        401: MELDUNG('Ungültige Anmeldeinformationen'),
        429: ANTWORT('Zu viele Fehlversuche', { message: 'Zu viele Login-Versuche. Bitte in 10 Minuten erneut versuchen.' }),
        500: MELDUNG('Serverfehler beim Login'),
      },
    },
  },
  '/api/auth/register': {
    post: {
      tags: ['Anmeldung'], summary: 'Konto anlegen',
      description: 'Legt ein Konto ohne Passwort an und verschickt eine Mail zum Setzen. Ob Registrierung erlaubt ist, welche Mail-Domains zugelassen sind und ob ein Code nötig ist, verrät `GET /api/konfig`. Rate-Limit: 5 Versuche in 10 Minuten je IP.',
      security: [],
      requestBody: {
        required: true,
        content: { 'application/json': { schema: {
          type: 'object', required: ['username', 'email'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50, example: 'musterfrau' },
            email: { type: 'string', format: 'email', example: 'person@example.org' },
            registrationCode: { type: 'string', description: 'Nur nötig, wenn die Instanz einen Code verlangt.' },
          },
        } } },
      },
      responses: {
        201: MELDUNG('Registrierung erfolgreich. Bitte prüfen Sie Ihre E-Mails um Ihr Passwort zu setzen.'),
        400: ANTWORT('Validierungsfehler oder Name/E-Mail bereits vergeben', { message: 'Benutzername oder E-Mail bereits vergeben' }),
        403: ANTWORT('Registrierung gesperrt, Domain nicht zugelassen oder Code falsch', { message: 'Registrierung ist deaktiviert' }),
        429: ANTWORT('Zu viele Versuche', { message: 'Zu viele Registrierungsversuche. Bitte in 10 Minuten erneut versuchen.' }),
        502: MELDUNG('Die Bestätigungsmail konnte nicht versendet werden. Bitte versuchen Sie es später erneut.'),
        500: MELDUNG('Serverfehler bei der Registrierung'),
      },
    },
  },

  // ===================== Fahrten =====================
  '/api/fahrten': {
    get: { tags: ['Fahrten'], summary: 'Alle Fahrten abrufen', description: 'Absteigend nach Datum.', responses: liste('Fahrt', 'Liste aller Fahrten') },
    post: {
      tags: ['Fahrten'], summary: 'Fahrt anlegen',
      description: 'Ohne Kilometerangabe nimmt der Server die hinterlegte Distanz zwischen den beiden Orten. Für eine Freitext-Adresse `vonOrtId`/`nachOrtId` leer lassen und `einmaligerVonOrt`/`einmaligerNachOrt` setzen.',
      requestBody: koerper('FahrtEingabe'),
      responses: {
        201: ANTWORT('Fahrt angelegt', { id: 2830, message: 'Fahrt erfolgreich erstellt' }),
        400: ANTWORT('Validierungsfehler, unbekannter Träger oder fremder Ort', { message: 'Abrechnungsträger nicht gefunden' }),
        401: FEHLER[401], 429: FEHLER[429], 500: MELDUNG('Fehler beim Erstellen der Fahrt'),
      },
    },
  },
  '/api/fahrten/{id}': {
    get: {
      tags: ['Fahrten'], summary: 'Einzelne Fahrt abrufen', parameters: [pfadId('ID der Fahrt')],
      responses: { 200: { description: 'Die Fahrt samt Mitfahrern', content: { 'application/json': { schema: { $ref: '#/components/schemas/Fahrt' } } } }, 401: FEHLER[401], 404: MELDUNG('Fahrt nicht gefunden'), 500: FEHLER[500] },
    },
    put: {
      tags: ['Fahrten'], summary: 'Fahrt ändern', parameters: [pfadId('ID der Fahrt')],
      description: 'Kein Teil-Update: `datum`, `anlass` und `abrechnung` sind auch hier Pflicht. Ein leeres `mitfahrer`-Array entfernt alle Mitfahrer:innen. `partnerFahrtId` wird hier ignoriert.',
      requestBody: koerper('FahrtEingabe'),
      responses: { 200: MELDUNG('Fahrt erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Fahrt nicht gefunden'), 500: MELDUNG('Fehler beim Aktualisieren der Fahrt') },
    },
    delete: {
      tags: ['Fahrten'], summary: 'Fahrt löschen', parameters: [pfadId('ID der Fahrt')],
      description: 'Eine verknüpfte Gegenfahrt bleibt bestehen und wird entkoppelt. Mitfahrer:innen, die dort für beide Richtungen eingetragen waren, gelten danach nur noch für die verbleibende Richtung.',
      responses: { 200: MELDUNG('Fahrt erfolgreich gelöscht'), 401: FEHLER[401], 404: MELDUNG('Fahrt nicht gefunden'), 500: MELDUNG('Fehler beim Löschen der Fahrt') },
    },
  },
  '/api/fahrten/{fahrtId}/mitfahrer': {
    post: {
      tags: ['Fahrten'], summary: 'Mitfahrer:in hinzufügen',
      parameters: [{ name: 'fahrtId', in: 'path', required: true, schema: { type: 'integer' }, description: 'ID der Fahrt' }],
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['name'],
        properties: {
          name: { type: 'string', example: 'Anna Beispiel' },
          arbeitsstaette: { type: ['string', 'null'], example: 'Kirchenkreisamt' },
          richtung: { type: 'string', enum: ['hin', 'rueck', 'hin_rueck'], default: 'hin' },
        },
      } } } },
      responses: { 201: ANTWORT('Hinzugefügt', { id: 9, message: 'Mitfahrer erfolgreich hinzugefügt' }), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Fahrt nicht gefunden'), 500: MELDUNG('Fehler beim Hinzufügen des Mitfahrers') },
    },
  },
  '/api/fahrten/{fahrtId}/mitfahrer/{mitfahrerId}': {
    put: {
      tags: ['Fahrten'], summary: 'Mitfahrer:in ändern',
      parameters: [
        { name: 'fahrtId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'mitfahrerId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['name'],
        properties: { name: { type: 'string' }, arbeitsstaette: { type: ['string', 'null'] }, richtung: { type: 'string', enum: ['hin', 'rueck', 'hin_rueck'] } },
      } } } },
      responses: { 200: MELDUNG('Mitfahrer erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Fahrt oder Mitfahrer nicht gefunden'), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Fahrten'], summary: 'Mitfahrer:in entfernen',
      parameters: [
        { name: 'fahrtId', in: 'path', required: true, schema: { type: 'integer' } },
        { name: 'mitfahrerId', in: 'path', required: true, schema: { type: 'integer' } },
      ],
      responses: { 200: MELDUNG('Mitfahrer erfolgreich gelöscht'), 401: FEHLER[401], 404: MELDUNG('Fahrt oder Mitfahrer nicht gefunden'), 500: FEHLER[500] },
    },
  },
  '/api/fahrten/report/{year}/{month}': {
    get: {
      tags: ['Auswertungen'], summary: 'Monatsbericht',
      description: 'Alle Fahrten des Monats mit berechneter Erstattung je Fahrt und einer Zusammenfassung je Abrechnungsträger.',
      parameters: [
        { name: 'year', in: 'path', required: true, schema: { type: 'integer' }, example: 2026 },
        { name: 'month', in: 'path', required: true, schema: { type: 'integer' }, example: 8 },
      ],
      responses: {
        200: ANTWORT('Bericht des Monats', {
          fahrten: [{ id: 2830, datum: '2026-08-24', anlass: 'Dienstbesprechung', kilometer: '32.00', erstattungssatz: 0.3, erstattung: 9.6 }],
          summary: { erstattungen: { 1: 9.6, mitfahrer: 1.2 }, gesamtErstattung: 10.8, abrechnungsStatus: { 1: { eingereicht_am: '2026-08-05', erhalten_am: null } } },
        }),
        401: FEHLER[401], 500: MELDUNG('Fehler beim Erstellen des Monatsberichts'),
      },
    },
  },
  '/api/fahrten/monthly-summary': {
    get: {
      tags: ['Auswertungen'], summary: 'Monatsübersicht über alle Monate',
      responses: {
        200: ANTWORT('Je Monat Kilometer und Erstattung pro Träger', [{ yearMonth: '2026-08', erstattungen: { 1: { kilometer: 124.5, erstattung: 37.35 } } }]),
        401: FEHLER[401], 404: MELDUNG('Keine Daten für die monatliche Zusammenfassung gefunden'), 500: FEHLER[500],
      },
    },
  },
  '/api/fahrten/year-summary/{year}': {
    get: {
      tags: ['Auswertungen'], summary: 'Jahresübersicht',
      parameters: [{ name: 'year', in: 'path', required: true, schema: { type: 'integer' }, example: 2026 }],
      responses: { 200: ANTWORT('Summen des Jahres', { summary: { 1: { kilometer: 1240.5, erstattung: 372.15 } }, gesamtErstattung: 378.35, year: '2026' }), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/fahrten/report-range/{startYear}/{startMonth}/{endYear}/{endMonth}': {
    get: {
      tags: ['Auswertungen'], summary: 'Bericht über einen Zeitraum',
      parameters: ['startYear', 'startMonth', 'endYear', 'endMonth'].map((n) => ({ name: n, in: 'path', required: true, schema: { type: 'integer' } })),
      responses: { 200: ANTWORT('Bericht des Zeitraums, zusätzlich je Monat aufgeschlüsselt', { fahrten: [], summary: { erstattungen: {}, erstattungenProMonat: {}, gesamtErstattung: 0, abrechnungsStatus: {} } }), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/fahrten/export/{type}/{year}/{month}': {
    get: {
      tags: ['Export'], summary: 'Monatsabrechnung als Excel',
      description: 'Ändert **nichts** am Status. Rate-Limit: 60 Exporte in 10 Minuten.',
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'ID des Abrechnungsträgers oder `mitfahrer`', example: '1' },
        { name: 'year', in: 'path', required: true, schema: { type: 'string' }, example: '2026' },
        { name: 'month', in: 'path', required: true, schema: { type: 'string' }, description: 'Entweder `08` oder `2026-08`.', example: '08' },
      ],
      responses: {
        200: { description: 'Excel-Datei, bei mehreren Blättern ein ZIP', content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } }, 'application/zip': { schema: { type: 'string', format: 'binary' } } } },
        401: FEHLER[401], 404: MELDUNG('Keine Daten für den ausgewählten Zeitraum und Typ gefunden.'), 429: ANTWORT('Zu viele Exporte', { message: 'Zu viele Exporte in kurzer Zeit. Bitte einen Moment warten.' }), 500: FEHLER[500],
      },
    },
  },
  '/api/fahrten/export-range/{type}/{startYear}/{startMonth}/{endYear}/{endMonth}': {
    get: {
      tags: ['Export'], summary: 'Zeitraum-Abrechnung als Excel',
      description: '**Achtung:** Dieser Abruf verändert Daten — er setzt jeden Monat des Zeitraums auf „eingereicht" mit dem heutigen Datum.',
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'ID des Abrechnungsträgers oder `mitfahrer`' },
        ...['startYear', 'startMonth', 'endYear', 'endMonth'].map((n) => ({ name: n, in: 'path', required: true, schema: { type: 'string' } })),
      ],
      responses: {
        200: { description: 'Excel-Datei oder ZIP', content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } }, 'application/zip': { schema: { type: 'string', format: 'binary' } } } },
        401: FEHLER[401], 404: MELDUNG('Keine Daten für den ausgewählten Zeitraum und Typ gefunden.'), 429: FEHLER[429], 500: FEHLER[500],
      },
    },
  },
  '/api/fahrten/export-pdf/{type}/{year}/{month}': {
    get: {
      tags: ['Export'], summary: 'Monatsabrechnung als PDF', description: 'Ändert nichts am Status.',
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'year', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'month', in: 'path', required: true, schema: { type: 'string' } },
      ],
      responses: { 200: { description: 'Eine PDF-Datei. Reicht die Abrechnung über mehrere Formularblätter, stehen sie als Seiten in derselben Datei.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } }, 401: FEHLER[401], 404: MELDUNG('Keine Daten für den ausgewählten Zeitraum und Typ gefunden.'), 429: FEHLER[429], 500: FEHLER[500] },
    },
  },
  '/api/fahrten/export-pdf-range/{type}/{startYear}/{startMonth}/{endYear}/{endMonth}': {
    get: {
      tags: ['Export'], summary: 'Zeitraum-Abrechnung als PDF',
      description: '**Achtung:** Setzt jeden Monat des Zeitraums auf „eingereicht".',
      parameters: [
        { name: 'type', in: 'path', required: true, schema: { type: 'string' } },
        ...['startYear', 'startMonth', 'endYear', 'endMonth'].map((n) => ({ name: n, in: 'path', required: true, schema: { type: 'string' } })),
      ],
      responses: { 200: { description: 'Eine PDF-Datei. Reicht die Abrechnung über mehrere Formularblätter, stehen sie als Seiten in derselben Datei.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } }, 401: FEHLER[401], 404: MELDUNG('Keine Daten für den ausgewählten Zeitraum und Typ gefunden.'), 429: FEHLER[429], 500: FEHLER[500] },
    },
  },
  '/api/fahrten/abrechnungsstatus': {
    post: {
      tags: ['Abrechnung'], summary: 'Abrechnungsstatus setzen',
      description: 'Setzt einen Monat auf eingereicht oder erstattet — oder nimmt den Status zurück.',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['jahr', 'monat', 'typ', 'aktion'],
        properties: {
          jahr: { type: 'integer', example: 2026 },
          monat: { type: 'integer', minimum: 1, maximum: 12, example: 8 },
          typ: { type: 'string', description: 'ID des Abrechnungsträgers oder `mitfahrer`', example: '1' },
          aktion: { type: 'string', enum: ['eingereicht', 'erhalten', 'reset'], example: 'eingereicht' },
          datum: { type: ['string', 'null'], format: 'date', example: '2026-08-24' },
        },
      } } } },
      responses: { 200: MELDUNG('Abrechnungsstatus erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 409: MELDUNG('Abrechnung muss erst eingereicht werden'), 500: MELDUNG('Fehler beim Aktualisieren des Status') },
    },
  },

  // ===================== Orte =====================
  '/api/orte': {
    get: { tags: ['Orte'], summary: 'Alle Orte abrufen', responses: liste('Ort', 'Liste der Orte, sortiert nach eigener Reihenfolge') },
    post: {
      tags: ['Orte'], summary: 'Ort anlegen',
      description: 'Die Kennzeichen werden in beiden Schreibweisen angenommen — `istWohnort` wie `ist_wohnort`.',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['name', 'adresse'],
        properties: {
          name: { type: 'string', maxLength: 200, example: 'Hennstedt' },
          adresse: { type: 'string', example: 'Kirchspiel 1, 25779 Hennstedt' },
          istWohnort: { type: 'boolean', default: false },
          istDienstort: { type: 'boolean', default: false },
          istKirchspiel: { type: 'boolean', default: false },
        },
      } } } },
      responses: { 201: ANTWORT('Ort angelegt', { id: 12, message: 'Ort erfolgreich erstellt' }), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/orte/simple': {
    get: {
      tags: ['Orte'], summary: 'Schlanke Ortsliste',
      description: 'Vorsortiert: Wohnort, Dienstort, Kirchspiel, dann der Rest. Antwort ist in `data` verpackt.',
      responses: { 200: ANTWORT('Ortsliste', { data: [{ id: 7, name: 'Hennstedt', ist_wohnort: 1, ist_dienstort: 0, ist_kirchspiel: 0, adresse: 'Kirchspiel 1' }] }), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/orte/sort': {
    put: { tags: ['Orte'], summary: 'Reihenfolge der Orte speichern', requestBody: koerper('SortierEingabe'), responses: { 200: MELDUNG('Sortierung aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/orte/{id}': {
    get: { tags: ['Orte'], summary: 'Einzelnen Ort abrufen', parameters: [pfadId('ID des Ortes')], responses: { 200: { description: 'Der Ort', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ort' } } } }, 401: FEHLER[401], 404: MELDUNG('Ort nicht gefunden'), 500: FEHLER[500] } },
    put: {
      tags: ['Orte'], summary: 'Ort ändern', parameters: [pfadId('ID des Ortes')],
      description: 'Kein Teil-Update: Nicht mitgeschickte Kennzeichen werden auf `false` gesetzt. Beide Schreibweisen werden angenommen.',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['name', 'adresse'],
        properties: {
          name: { type: 'string', maxLength: 200 }, adresse: { type: 'string' },
          ist_wohnort: { type: 'boolean', default: false }, ist_dienstort: { type: 'boolean', default: false }, ist_kirchspiel: { type: 'boolean', default: false },
        },
      } } } },
      responses: { 200: MELDUNG('Ort erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Ort nicht gefunden'), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Orte'], summary: 'Ort löschen', parameters: [pfadId('ID des Ortes')],
      description: 'Nur möglich, solange der Ort weder in Fahrten noch in Distanzen vorkommt.',
      responses: { 200: MELDUNG('Ort erfolgreich gelöscht'), 400: ANTWORT('Ort noch in Verwendung', { message: 'Ort kann nicht gelöscht werden, da er in Fahrten verwendet wird' }), 401: FEHLER[401], 404: MELDUNG('Ort nicht gefunden'), 500: FEHLER[500] },
    },
  },

  // ===================== Distanzen =====================
  '/api/distanzen': {
    get: { tags: ['Distanzen'], summary: 'Alle Distanzen abrufen', responses: liste('Distanz', 'Gepflegte Entfernungen') },
    post: {
      tags: ['Distanzen'], summary: 'Distanz anlegen oder ändern',
      description: 'Richtungsunabhängig. Existiert die Strecke bereits, wird sie aktualisiert — und alle betroffenen Fahrten bekommen rückwirkend den neuen Wert.',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['vonOrtId', 'nachOrtId', 'distanz'],
        properties: { vonOrtId: { type: 'integer', example: 7 }, nachOrtId: { type: 'integer', example: 8 }, distanz: { type: 'number', minimum: 0, example: 32 } },
      } } } },
      responses: { 201: ANTWORT('Angelegt oder aktualisiert', { result: 2, message: 'Distanz erfolgreich erstellt oder aktualisiert' }), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/distanzen/between': {
    get: {
      tags: ['Distanzen'], summary: 'Distanz zwischen zwei Orten',
      parameters: [
        { name: 'vonOrtId', in: 'query', required: true, schema: { type: 'integer' }, example: 7 },
        { name: 'nachOrtId', in: 'query', required: true, schema: { type: 'integer' }, example: 8 },
      ],
      responses: { 200: ANTWORT('Die hinterlegte Entfernung', { distanz: 32 }), 400: MELDUNG('Von-Ort-ID und Nach-Ort-ID sind erforderlich'), 401: FEHLER[401], 404: MELDUNG('Distanz nicht gefunden'), 500: FEHLER[500] },
    },
  },
  '/api/distanzen/{id}': {
    put: {
      tags: ['Distanzen'], summary: 'Distanz ändern', parameters: [pfadId('ID der Distanz')],
      description: 'Schreibt den neuen Wert rückwirkend in alle betroffenen Fahrten.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['vonOrtId', 'nachOrtId', 'distanz'], properties: { vonOrtId: { type: 'integer' }, nachOrtId: { type: 'integer' }, distanz: { type: 'number' } } } } } },
      responses: { 200: MELDUNG('Distanz erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Distanz nicht gefunden'), 500: FEHLER[500] },
    },
    delete: { tags: ['Distanzen'], summary: 'Distanz löschen', parameters: [pfadId('ID der Distanz')], responses: { 200: MELDUNG('Distanz erfolgreich gelöscht'), 401: FEHLER[401], 404: MELDUNG('Distanz nicht gefunden'), 500: FEHLER[500] } },
  },

  // ===================== Abrechnungsträger =====================
  '/api/abrechnungstraeger': {
    get: { tags: ['Abrechnungsträger'], summary: 'Alle Träger abrufen', description: 'Inklusive aktuell gültigem Erstattungsbetrag.', responses: liste('Abrechnungstraeger', 'Liste der Abrechnungsträger') },
    post: {
      tags: ['Abrechnungsträger'], summary: 'Träger anlegen',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 200, example: 'Kirchenkreis' }, kostenstelle: { type: ['string', 'null'], example: '1234' }, farbe: { type: ['string', 'null'], pattern: '^#[0-9a-fA-F]{6}$', example: '#0F5257', description: 'Farbe im Format #RRGGBB.' } } } } } },
      responses: { 201: ANTWORT('Angelegt', { id: 7, message: 'Abrechnungsträger erfolgreich erstellt' }), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/abrechnungstraeger/simple': {
    get: { tags: ['Abrechnungsträger'], summary: 'Nur aktive Träger', description: 'Antwort ist in `data` verpackt.', responses: { 200: ANTWORT('Aktive Träger', { data: [{ id: 1, name: 'Kirchenkreis', kostenstelle: '1234', active: 1 }] }), 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/abrechnungstraeger/sort': {
    put: { tags: ['Abrechnungsträger'], summary: 'Reihenfolge speichern', requestBody: koerper('SortierEingabe'), responses: { 200: MELDUNG('Sortierung aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/abrechnungstraeger/{id}': {
    get: { tags: ['Abrechnungsträger'], summary: 'Einzelnen Träger abrufen', parameters: [pfadId('ID des Trägers')], responses: { 200: { description: 'Der Träger', content: { 'application/json': { schema: { $ref: '#/components/schemas/Abrechnungstraeger' } } } }, 401: FEHLER[401], 404: MELDUNG('Abrechnungsträger nicht gefunden'), 500: FEHLER[500] } },
    put: {
      tags: ['Abrechnungsträger'], summary: 'Träger ändern oder aktiv schalten', parameters: [pfadId('ID des Trägers')],
      description: 'Zwei Wege: Nur `active` schicken schaltet den Träger an oder aus. Mit `name` wird der Datensatz vollständig geschrieben.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', maxLength: 200 }, kostenstelle: { type: ['string', 'null'] }, active: { type: 'boolean' }, farbe: { type: ['string', 'null'], pattern: '^#[0-9a-fA-F]{6}$', example: '#0F5257' } } } } } },
      responses: { 200: MELDUNG('Abrechnungsträger erfolgreich aktualisiert'), 400: ANTWORT('Validierungsfehler oder unbrauchbare Anfrage', { message: 'Ungültige Aktualisierungsanfrage' }), 401: FEHLER[401], 404: MELDUNG('Abrechnungsträger nicht gefunden'), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Abrechnungsträger'], summary: 'Träger löschen', parameters: [pfadId('ID des Trägers')],
      description: 'Nur möglich, wenn keine Fahrten darauf gebucht sind — sonst lässt er sich stattdessen deaktivieren.',
      responses: { 200: MELDUNG('Abrechnungsträger erfolgreich gelöscht'), 400: MELDUNG('Abrechnungsträger kann nicht gelöscht werden, da noch Fahrten darauf gebucht sind. Du kannst ihn stattdessen deaktivieren.'), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/abrechnungstraeger/{id}/historie': {
    get: {
      tags: ['Abrechnungsträger'], summary: 'Historie der Erstattungssätze', parameters: [pfadId('ID des Trägers')],
      responses: { 200: ANTWORT('Sätze, neueste zuerst', [{ id: 12, betrag: '0.30', gueltig_ab: '2026-01-01' }]), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/abrechnungstraeger/{id}/erstattung': {
    post: {
      tags: ['Abrechnungsträger'], summary: 'Erstattungssatz hinzufügen', parameters: [pfadId('ID des Trägers')],
      description: 'Jede Fahrt wird mit dem Satz gerechnet, der an ihrem Datum galt.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['betrag'], properties: { betrag: { type: 'number', minimum: 0, example: 0.3 }, gueltig_ab: { type: ['string', 'null'], format: 'date', description: 'Ohne Angabe gilt der heutige Tag.' } } } } } },
      responses: { 201: MELDUNG('Erstattungssatz erfolgreich hinzugefügt'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Abrechnungsträger nicht gefunden'), 500: FEHLER[500] },
    },
  },
  '/api/abrechnungstraeger/{id}/erstattung/{erstattungssatzId}': {
    put: {
      tags: ['Abrechnungsträger'], summary: 'Erstattungssatz ändern',
      parameters: [pfadId('ID des Trägers'), { name: 'erstattungssatzId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['betrag'], properties: { betrag: { type: 'number', minimum: 0 }, gueltig_ab: { type: ['string', 'null'], format: 'date' } } } } } },
      responses: { 200: MELDUNG('Erstattungssatz erfolgreich aktualisiert'), 400: ANTWORT('Validierungsfehler oder Datum doppelt', { message: 'Es existiert bereits ein Eintrag für dieses Datum' }), 401: FEHLER[401], 404: MELDUNG('Erstattungssatz nicht gefunden'), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Abrechnungsträger'], summary: 'Erstattungssatz löschen',
      parameters: [pfadId('ID des Trägers'), { name: 'erstattungssatzId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { 200: MELDUNG('Erstattungssatz erfolgreich gelöscht'), 400: MELDUNG('Der letzte Erstattungssatz kann nicht gelöscht werden'), 401: FEHLER[401], 404: MELDUNG('Abrechnungsträger nicht gefunden'), 500: FEHLER[500] },
    },
  },

  // ===================== Mitfahrer-Erstattung =====================
  '/api/mitfahrer-erstattung/current': {
    get: { tags: ['Mitfahrer-Erstattung'], summary: 'Aktuellen Satz abrufen', responses: { 200: ANTWORT('Der heute gültige Satz', { betrag: '0.05', gueltig_ab: '2026-01-01' }), 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/mitfahrer-erstattung/historie': {
    get: { tags: ['Mitfahrer-Erstattung'], summary: 'Historie abrufen', responses: { 200: ANTWORT('Sätze, neueste zuerst', [{ id: 4, betrag: '0.05', gueltig_ab: '2026-01-01' }]), 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/mitfahrer-erstattung': {
    post: {
      tags: ['Mitfahrer-Erstattung'], summary: 'Satz setzen',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['betrag'], properties: { betrag: { type: 'number', minimum: 0, example: 0.05 }, gueltig_ab: { type: ['string', 'null'], format: 'date', description: 'Ohne Angabe gilt der heutige Tag.' } } } } } },
      responses: { 200: MELDUNG('Erstattungssatz erfolgreich gesetzt'), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/mitfahrer-erstattung/{erstattungssatzId}': {
    put: {
      tags: ['Mitfahrer-Erstattung'], summary: 'Satz ändern',
      parameters: [{ name: 'erstattungssatzId', in: 'path', required: true, schema: { type: 'integer' } }],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['betrag'], properties: { betrag: { type: 'number', minimum: 0 }, gueltig_ab: { type: ['string', 'null'], format: 'date' } } } } } },
      responses: { 200: MELDUNG('Erstattungssatz erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Erstattungssatz nicht gefunden'), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Mitfahrer-Erstattung'], summary: 'Satz löschen',
      parameters: [{ name: 'erstattungssatzId', in: 'path', required: true, schema: { type: 'integer' } }],
      responses: { 200: MELDUNG('Erstattungssatz erfolgreich gelöscht'), 400: MELDUNG('Der letzte Erstattungssatz kann nicht gelöscht werden'), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },

  // ===================== Anlässe =====================
  '/api/anlaesse': {
    get: { tags: ['Anlässe'], summary: 'Alle Anlässe abrufen', description: 'Mit Angabe, wie oft jeder verwendet wurde.', responses: liste('Anlass', 'Liste der Anlässe') },
    post: {
      tags: ['Anlässe'], summary: 'Anlass anlegen',
      description: 'Existiert der Name bereits, kommt der bestehende Eintrag zurück (dann Status 200 statt 201).',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', maxLength: 255, example: 'Konfirmandenunterricht' }, sortOrder: { type: 'integer', default: 0 } } } } } },
      responses: { 201: { description: 'Neu angelegt', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anlass' } } } }, 200: { description: 'Name existierte bereits', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anlass' } } } }, 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/anlaesse/sort': {
    put: { tags: ['Anlässe'], summary: 'Reihenfolge speichern', requestBody: koerper('SortierEingabe'), responses: { 200: MELDUNG('Sortierung aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/anlaesse/{id}': {
    get: { tags: ['Anlässe'], summary: 'Einzelnen Anlass abrufen', parameters: [pfadId('ID des Anlasses')], responses: { 200: { description: 'Der Anlass, ohne Nutzungszahl', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anlass' } } } }, 401: FEHLER[401], 404: MELDUNG('Anlass nicht gefunden'), 500: FEHLER[500] } },
    put: {
      tags: ['Anlässe'], summary: 'Anlass ändern', parameters: [pfadId('ID des Anlasses')],
      description: 'Mindestens ein Feld muss mitkommen.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', maxLength: 255 }, sortOrder: { type: 'integer' }, aktiv: { type: 'boolean' } } } } } },
      responses: { 200: { description: 'Der geänderte Anlass', content: { 'application/json': { schema: { $ref: '#/components/schemas/Anlass' } } } }, 400: ANTWORT('Validierungsfehler oder Name doppelt', { message: 'Ein Anlass mit diesem Namen existiert bereits' }), 401: FEHLER[401], 404: MELDUNG('Anlass nicht gefunden'), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Anlässe'], summary: 'Anlass löschen', parameters: [pfadId('ID des Anlasses')],
      description: 'Bereits erfasste Fahrten behalten ihren Anlass-Text.',
      responses: { 200: MELDUNG('Anlass erfolgreich gelöscht'), 401: FEHLER[401], 404: MELDUNG('Anlass nicht gefunden'), 500: FEHLER[500] },
    },
  },

  // ===================== Favoriten =====================
  '/api/favoriten': {
    get: { tags: ['Favoriten'], summary: 'Alle Favoriten abrufen', responses: liste('Favorit', 'Liste der Favoriten-Fahrten') },
    post: {
      tags: ['Favoriten'], summary: 'Favorit anlegen',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['vonOrtId', 'nachOrtId', 'anlass', 'abrechnungstraegerId'],
        properties: { vonOrtId: { type: 'integer', example: 7 }, nachOrtId: { type: 'integer', example: 8 }, anlass: { type: 'string', maxLength: 500, example: 'Dienstbesprechung' }, abrechnungstraegerId: { type: 'integer', example: 1 }, sortOrder: { type: 'integer', default: 0 } },
      } } } },
      responses: { 201: { description: 'Der angelegte Favorit', content: { 'application/json': { schema: { $ref: '#/components/schemas/Favorit' } } } }, 400: ANTWORT('Validierungsfehler, fremder Ort oder Träger', { message: 'Ort nicht gefunden' }), 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/favoriten/{id}': {
    delete: { tags: ['Favoriten'], summary: 'Favorit löschen', parameters: [pfadId('ID des Favoriten')], responses: { 200: MELDUNG('Favorit erfolgreich geloescht'), 401: FEHLER[401], 404: MELDUNG('Favorit nicht gefunden'), 500: FEHLER[500] } },
  },
  '/api/favoriten/{id}/execute': {
    post: {
      tags: ['Favoriten'], summary: 'Favorit als Fahrt eintragen', parameters: [pfadId('ID des Favoriten')],
      description: 'Legt eine Fahrt für **heute** an. Die Kilometer kommen aus der hinterlegten Distanz.',
      requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { mitRueckfahrt: { type: 'boolean', default: false, description: 'Legt zusätzlich die verknüpfte Gegenfahrt an.' } } } } } },
      responses: { 201: ANTWORT('Fahrt angelegt', { id: 2830, message: 'Fahrt aus Favorit erfolgreich erstellt' }), 401: FEHLER[401], 404: MELDUNG('Favorit nicht gefunden'), 500: FEHLER[500] },
    },
  },

  // ===================== Profil =====================
  '/api/profile': {
    get: { tags: ['Profil'], summary: 'Eigenes Profil abrufen', responses: { 200: ANTWORT('Stammdaten samt Wohn- und Dienstort', { username: 'musterfrau', email: 'person@example.org', full_name: 'Vorname Nachname', iban: 'DE00…', kirchengemeinde: 'Beispielgemeinde', wohnort: 'Zuhause', dienstort: 'Büro' }), 401: FEHLER[401], 404: MELDUNG('Profil nicht gefunden'), 500: FEHLER[500] } },
    put: {
      tags: ['Profil'], summary: 'Profil ändern',
      description: 'Bei geänderter E-Mail-Adresse wird eine Bestätigungsmail verschickt und die Adresse gilt bis dahin als unbestätigt. Es empfiehlt sich, alle Felder mitzuschicken — fehlende werden geleert.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { email: { type: 'string', format: 'email' }, fullName: { type: ['string', 'null'] }, iban: { type: ['string', 'null'] }, kirchengemeinde: { type: ['string', 'null'] }, kirchspiel: { type: ['string', 'null'] }, kirchenkreis: { type: ['string', 'null'] } } } } } },
      responses: { 200: MELDUNG('Profil erfolgreich aktualisiert.'), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/profile/change-password': {
    put: {
      tags: ['Profil'], summary: 'Eigenes Passwort ändern',
      description: 'Höchstens 10 Versuche in 10 Minuten je Konto. Nach dem Wechsel verlieren alle bestehenden Anmeldungen ihre Gültigkeit — die eigene ausgenommen, sie bekommt über den Header `X-Token-Erneuert` ein frisches Token.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['oldPassword', 'newPassword', 'confirmPassword'], properties: { oldPassword: { type: 'string', format: 'password' }, newPassword: { type: 'string', format: 'password', minLength: 6 }, confirmPassword: { type: 'string', format: 'password' } } } } } },
      responses: { 200: MELDUNG('Passwort erfolgreich geändert.'), 400: ANTWORT('Altes Passwort falsch oder Wiederholung stimmt nicht', { message: 'Altes Passwort ist falsch' }), 401: FEHLER[401], 404: MELDUNG('Benutzer nicht gefunden'), 500: FEHLER[500] },
    },
  },

  // ===================== Benutzerverwaltung =====================
  '/api/users/me': {
    get: { tags: ['Benutzer'], summary: 'Eigenes Konto abrufen', responses: { 200: ANTWORT('Das eigene Konto samt Profil', { id: 1, username: 'musterfrau', role: 'user', email_verified: 1, email: 'person@example.org' }), 401: FEHLER[401], 404: MELDUNG('Benutzer nicht gefunden'), 500: FEHLER[500] } },
  },
  '/api/users': {
    get: { tags: ['Benutzer'], summary: 'Alle Konten abrufen', description: '**Nur für Administratoren.**', responses: { 200: ANTWORT('Alle Konten mit Profil', [{ id: 1, username: 'musterfrau', role: 'user', email: 'person@example.org' }]), 401: FEHLER[401], 403: FEHLER[403], 500: FEHLER[500] } },
    post: {
      tags: ['Benutzer'], summary: 'Konto anlegen', description: '**Nur für Administratoren.** Es wird kein Passwort vergeben — die eingeladene Person setzt es über den Link in der Willkommensmail (7 Tage gültig).',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', required: ['username', 'email'],
        properties: { username: { type: 'string', minLength: 3, maxLength: 50 }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['admin', 'user'], default: 'user' }, fullName: { type: ['string', 'null'] }, iban: { type: ['string', 'null'] }, kirchengemeinde: { type: ['string', 'null'] }, kirchspiel: { type: ['string', 'null'] }, kirchenkreis: { type: ['string', 'null'] } },
      } } } },
      responses: { 201: ANTWORT('Konto angelegt', { message: 'Benutzer erfolgreich erstellt. Eine E-Mail mit weiteren Anweisungen wurde versendet.', userId: 12 }), 400: ANTWORT('Validierungsfehler oder E-Mail vergeben', { message: 'Diese E-Mail-Adresse wird bereits verwendet' }), 401: FEHLER[401], 403: FEHLER[403], 500: FEHLER[500] },
    },
  },
  '/api/users/{id}': {
    put: {
      tags: ['Benutzer'], summary: 'Konto ändern', parameters: [pfadId('ID des Kontos')],
      description: 'Für Administratoren oder das eigene Konto. Die Rolle darf nur ein Administrator setzen. Kein Teil-Update — fehlende Felder werden geleert.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { username: { type: 'string', minLength: 3, maxLength: 50 }, email: { type: 'string', format: 'email' }, role: { type: 'string', enum: ['admin', 'user'] }, fullName: { type: ['string', 'null'] }, iban: { type: ['string', 'null'] }, kirchengemeinde: { type: ['string', 'null'] }, kirchspiel: { type: ['string', 'null'] }, kirchenkreis: { type: ['string', 'null'] } } } } } },
      responses: { 200: MELDUNG('Benutzerprofil erfolgreich aktualisiert'), 400: VALIDIERUNG, 401: FEHLER[401], 403: ANTWORT('Fremdes Konto oder Rollenwechsel ohne Adminrecht', { message: 'Keine Berechtigung, die Rolle zu ändern' }), 500: FEHLER[500] },
    },
    delete: {
      tags: ['Benutzer'], summary: 'Konto löschen', parameters: [pfadId('ID des Kontos')],
      description: '**Nur für Administratoren.** Löscht alle Daten des Kontos: Fahrten, Orte, Distanzen, Träger und Abrechnungen. Das eigene Konto lässt sich nicht löschen, ebenso wenig das letzte Administratorkonto.',
      responses: { 200: MELDUNG('Benutzer erfolgreich gelöscht'), 400: MELDUNG('Sie können Ihren eigenen Account nicht löschen'), 401: FEHLER[401], 403: FEHLER[403], 500: FEHLER[500] },
    },
  },
  '/api/users/{id}/password': {
    put: {
      tags: ['Benutzer'], summary: 'Passwort eines Kontos ändern', parameters: [pfadId('ID des Kontos')],
      description: 'Für Administratoren oder das eigene Konto. Administratoren brauchen das alte Passwort nicht zu kennen, müssen `currentPassword` aber trotzdem mitschicken. Höchstens 10 Versuche in 10 Minuten je Konto. Nach dem Wechsel verlieren alle bestehenden Anmeldungen ihre Gültigkeit.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string', format: 'password' }, newPassword: { type: 'string', format: 'password', minLength: 6 } } } } } },
      responses: { 200: MELDUNG('Passwort erfolgreich geändert'), 400: ANTWORT('Validierungsfehler oder falsches Passwort', { message: 'Aktuelles Passwort ist falsch' }), 401: FEHLER[401], 403: FEHLER[403], 404: MELDUNG('Benutzer nicht gefunden'), 500: FEHLER[500] },
    },
  },
  '/api/users/resend-verification': {
    post: {
      tags: ['Benutzer'], summary: 'Bestätigungsmail erneut senden',
      description: 'Gehört die Adresse bereits einem anderen Konto, wird die Anfrage abgewiesen.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
      responses: { 200: MELDUNG('Verifizierungs-E-Mail wurde erneut gesendet'), 400: VALIDIERUNG, 401: FEHLER[401], 404: MELDUNG('Benutzer nicht gefunden'), 500: FEHLER[500] },
    },
  },
  '/api/users/reset-password/request': {
    post: {
      tags: ['Passwort zurücksetzen'], summary: 'Zurücksetzen anfordern', security: [],
      description: 'Die Antwort ist immer gleich — ob es das Konto gibt, wird bewusst nicht verraten. Rate-Limit: 5 Anfragen in 10 Minuten.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } } } } },
      responses: { 200: MELDUNG('Wenn ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.'), 400: VALIDIERUNG, 429: ANTWORT('Zu viele Anfragen', { message: 'Zu viele Passwort-Reset-Anfragen. Bitte in 10 Minuten erneut versuchen.' }), 500: FEHLER[500] },
    },
  },
  '/api/users/reset-password/verify': {
    post: {
      tags: ['Passwort zurücksetzen'], summary: 'Neues Passwort setzen', security: [],
      description: 'Der Link aus der Mail ist 24 Stunden gültig.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string', format: 'password', minLength: 6 } } } } } },
      responses: { 200: MELDUNG('Passwort erfolgreich zurückgesetzt'), 400: MELDUNG('Ungültiger oder abgelaufener Token'), 429: FEHLER[429], 500: FEHLER[500] },
    },
  },
  '/api/users/set-password': {
    post: {
      tags: ['Passwort zurücksetzen'], summary: 'Passwort nach Einladung setzen', security: [],
      description: 'Nimmt sowohl den Einladungs-Token (7 Tage) als auch einen Reset-Token (24 Stunden). Bestätigt zugleich die E-Mail-Adresse.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token', 'newPassword'], properties: { token: { type: 'string' }, newPassword: { type: 'string', format: 'password', minLength: 6 } } } } } },
      responses: { 200: MELDUNG('Passwort erfolgreich gesetzt'), 400: MELDUNG('Ungültiger oder abgelaufener Token'), 429: FEHLER[429], 500: FEHLER[500] },
    },
  },
  '/api/users/verify-email': {
    post: {
      tags: ['Passwort zurücksetzen'], summary: 'E-Mail-Adresse bestätigen', security: [],
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['token'], properties: { token: { type: 'string' } } } } } },
      responses: { 200: MELDUNG('E-Mail-Adresse erfolgreich verifiziert'), 400: MELDUNG('Ungültiger oder abgelaufener Token'), 429: FEHLER[429] },
    },
  },

  // ===================== API-Schlüssel =====================
  '/api/keys': {
    get: { tags: ['API-Schlüssel'], summary: 'Eigene Schlüssel auflisten', description: 'Der Schlüssel selbst wird nie erneut ausgegeben.', responses: { 200: ANTWORT('Liste der Schlüssel ohne den Schlüsselwert', [{ id: 1, description: 'Kurzbefehle iPhone', created_at: '2026-01-05T10:12:00.000Z', last_used_at: null, is_active: 1 }]), 401: FEHLER[401], 500: FEHLER[500] } },
    post: {
      tags: ['API-Schlüssel'], summary: 'Schlüssel erzeugen',
      description: 'Der Schlüssel wird **nur hier ein einziges Mal** im Klartext ausgegeben. Danach ist er nicht mehr abrufbar.',
      requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['description'], properties: { description: { type: 'string', maxLength: 200, example: 'Kurzbefehle iPhone' } } } } } },
      responses: { 201: ANTWORT('Der neue Schlüssel', { message: 'API-Schlüssel erfolgreich erstellt', key: '‹64 Zeichen — jetzt notieren›' }), 400: VALIDIERUNG, 401: FEHLER[401], 500: FEHLER[500] },
    },
  },
  '/api/keys/test': {
    get: { tags: ['API-Schlüssel'], summary: 'Zugangsdaten prüfen', description: 'Nützlich, um in einem Skript zu prüfen, ob der Schlüssel noch gilt.', responses: { 200: ANTWORT('Zugang gültig', { success: true, message: 'API Key ist gültig', user: { id: 1, username: 'musterfrau' } }), 401: FEHLER[401], 500: FEHLER[500] } },
  },
  '/api/keys/{id}': {
    delete: { tags: ['API-Schlüssel'], summary: 'Schlüssel löschen', parameters: [pfadId('ID des Schlüssels')], responses: { 200: MELDUNG('API-Schlüssel wurde gelöscht'), 401: FEHLER[401], 404: MELDUNG('API-Schlüssel nicht gefunden'), 500: FEHLER[500] } },
  },

  // ===================== Öffentlich =====================
  '/api/instanzen': {
    get: {
      tags: ['Öffentlich'], summary: 'Verzeichnis der Kirchenkreise', security: [],
      description: 'Ohne Anmeldung abrufbar — die mobilen Apps brauchen die Liste, bevor sich jemand anmelden kann. Wird fünf Minuten zwischengespeichert.',
      responses: { 200: ANTWORT('Auswählbare Instanzen', { instanzen: [{ id: 'dithmarschen', name: 'Kirchenkreis Dithmarschen', apiUrl: 'https://kkd-fahrtenbuch.de' }] }), 429: FEHLER[429], 500: FEHLER[500] },
    },
  },
  '/api/konfig': {
    get: {
      tags: ['Öffentlich'], summary: 'Einstellungen dieser Instanz', security: [],
      description: 'Ohne Anmeldung abrufbar. Sagt, ob eine Registrierung möglich ist und welche Bedingungen dafür gelten. Ein etwaiger Registrierungscode wird nie mitgeliefert.',
      responses: { 200: ANTWORT('Öffentliche Konfiguration', { appTitle: 'Fahrtenbuch', allowRegistration: true, allowedEmailDomains: 'example.org', registrationCodeRequired: false }), 429: FEHLER[429], 500: FEHLER[500] },
    },
  },
};

// --- Dokument -------------------------------------------------------------

function baueSpezifikation({ titel, serverUrl } = {}) {
  return {
    openapi: '3.1.0',
    info: {
      title: (titel || process.env.REACT_APP_TITLE || 'Fahrtenbuch') + ' — API',
      version: '2.3.0',
      description: [
        'Schnittstelle des Fahrtenbuchs für Dienstfahrten mit dem Privatfahrzeug.',
        '',
        '## Anmelden',
        '',
        'Zwei Wege stehen zur Wahl:',
        '',
        '- **Token:** `POST /api/auth/login` liefert ein Token, das standardmäßig 14 Tage gilt.',
        '  Es gehört in den Header `Authorization: Bearer ‹Token›`. Wer regelmäßig arbeitet, bleibt',
        '  angemeldet — ab der halben Laufzeit schickt der Server im Header `X-Token-Erneuert` ein frisches mit.',
        '- **API-Schlüssel:** Für Skripte und Kurzbefehle. Unter `POST /api/keys` erzeugen und',
        '  im Header `X-API-Key` mitschicken. Der Schlüssel wird nur einmal angezeigt.',
        '',
        'Oben rechts über **Authorize** lässt sich beides hier direkt eintragen und ausprobieren.',
        '',
        '## Gut zu wissen',
        '',
        '- Leere Werte für `kilometer`, `vonOrtId` und `nachOrtId` bedeuten „nicht angegeben".',
        '  Fehlen die Kilometer und sind beide Orte gesetzt, nimmt der Server die hinterlegte Distanz.',
        '- Die beiden Zeitraum-Exporte (`export-range`, `export-pdf-range`) **verändern Daten**:',
        '  Sie setzen jeden Monat des Zeitraums auf „eingereicht".',
        '- Alle Daten sind streng nach Konto getrennt. Fremde Datensätze sind nicht erreichbar,',
        '  auch nicht über geratene Kennungen.',
        '- Zu viele Anfragen werden gebremst: 600 in 5 Minuten allgemein, 200 Änderungen in 5 Minuten,',
        '  60 Exporte in 10 Minuten, 20 Anmeldeversuche in 10 Minuten.',
      ].join('\n'),
      contact: { name: 'Support', email: 'support@kkd-fahrtenbuch.de' },
    },
    servers: [{ url: serverUrl || process.env.FRONTEND_URL || 'https://kkd-fahrtenbuch.de', description: 'Diese Instanz' }],
    tags: [
      { name: 'Anmeldung', description: 'Anmelden und Konto anlegen' },
      { name: 'Fahrten', description: 'Fahrten erfassen, ändern, löschen' },
      { name: 'Auswertungen', description: 'Berichte über Monate und Zeiträume' },
      { name: 'Export', description: 'Abrechnungsformulare als Excel oder PDF' },
      { name: 'Abrechnung', description: 'Status einer Monatsabrechnung' },
      { name: 'Orte', description: 'Gespeicherte Orte' },
      { name: 'Distanzen', description: 'Entfernungen zwischen Orten' },
      { name: 'Abrechnungsträger', description: 'Träger und ihre Erstattungssätze' },
      { name: 'Mitfahrer-Erstattung', description: 'Satz für die Mitnahmeentschädigung' },
      { name: 'Anlässe', description: 'Vorlagen für den Anlass einer Fahrt' },
      { name: 'Favoriten', description: 'Häufige Fahrten als Schnellzugriff' },
      { name: 'Profil', description: 'Eigene Stammdaten und Passwort' },
      { name: 'Benutzer', description: 'Kontenverwaltung (teils nur für Administratoren)' },
      { name: 'Passwort zurücksetzen', description: 'Ohne Anmeldung erreichbar' },
      { name: 'API-Schlüssel', description: 'Zugänge für Skripte und Kurzbefehle' },
      { name: 'Öffentlich', description: 'Ohne Anmeldung abrufbar' },
    ],
    components: {
      schemas,
      securitySchemes: {
        Token: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Das Token aus `POST /api/auth/login`. Hier ohne „Bearer" davor eintragen.' },
        ApiSchluessel: { type: 'apiKey', in: 'header', name: 'X-API-Key', description: 'Ein Schlüssel aus `POST /api/keys`.' },
      },
    },
    security: [{ Token: [] }, { ApiSchluessel: [] }],
    paths,
  };
}

module.exports = { baueSpezifikation };
