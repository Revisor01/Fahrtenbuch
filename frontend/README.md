# Fahrtenbuch — Frontend

React 18, gebaut mit [Vite](https://vite.dev/).

## Skripte

### `npm start`

Entwicklungsserver auf [http://localhost:9642](http://localhost:9642).
`/api`-Anfragen gehen per Proxy an das Backend auf Port 5000, das dafuer
laufen muss.

### `npm run build`

Produktionsbuild nach `build/`. Der Ordner heisst bewusst nicht `dist` —
der Dockerfile kopiert `/app/build` nach nginx.

### `npm run preview`

Liefert den fertigen Build lokal aus, um ihn vor dem Deployment zu pruefen.

## Konfiguration

Titel und Registrierungsregeln werden **zur Laufzeit** gesetzt, nicht beim
Bauen: `docker-entrypoint.sh` schreibt beim Containerstart `public/config.js`
aus den Umgebungsvariablen (`REACT_APP_TITLE`, `REACT_APP_ALLOW_REGISTRATION`,
`REACT_APP_ALLOWED_EMAIL_DOMAINS`, `REACT_APP_REGISTRATION_CODE`). Dadurch
laeuft dasselbe Image bei mehreren Kirchenkreisen.

Gelesen wird das im Code ueber `appConfigValue()` aus `src/utils/appConfig.js`.
Der Registrierungscode selbst landet nie im Frontend — ausgeliefert wird nur,
*ob* ein Code verlangt wird; geprueft wird er serverseitig.

Fuer die lokale Entwicklung ohne Container greifen ersatzweise
`VITE_*`-Variablen aus einer `.env`-Datei.

### Instanz-Verzeichnis der App (`VITE_INSTANZ_VERZEICHNIS`)

Die native App (Capacitor) hat beim ersten Start noch keinen Server: Nutzende
waehlen zuerst ihren Kirchenkreis. Die Adresse, unter der diese Liste liegt,
kann deshalb nicht zur Laufzeit aus `config.js` kommen — sie muss **beim Bauen**
im Bundle stehen.

- Variable: `VITE_INSTANZ_VERZEICHNIS`
- Default: `https://kkd-fahrtenbuch.de`
- Abgefragt wird `<VITE_INSTANZ_VERZEICHNIS>/api/instanzen` (ohne Anmeldung)

Die Liste selbst pflegt das Backend ueber `INSTANZEN` — ein neuer Kirchenkreis
braucht also kein App-Update, nur einen Eintrag dort. Ist das Verzeichnis nicht
erreichbar, faellt die App auf eine im Bundle hinterlegte Liste zurueck
(`src/api/instanzen.js`), damit die Auswahl auch ohne Netz bedienbar bleibt.

Die Auswahl greift ausschliesslich in der nativen App. Im Web bleibt es beim
bisherigen Verhalten: relative Pfade gegen den eigenen Host, keine Auswahl.

## Hinweise zum Aufbau

- JSX steht in `.js`-Dateien. Ein kleiner Plugin-Hook in `vite.config.js`
  laesst esbuild diese Dateien als JSX lesen, damit sie nicht alle auf `.jsx`
  umbenannt werden mussten.
- Die App-Version im Info-Dialog kommt aus `package.json` und wird ueber
  `define: __APP_VERSION__` in den Build eingesetzt.
