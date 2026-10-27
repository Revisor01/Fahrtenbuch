# Fahrtenbuch Frontend

`npm start` (Port 9642, `/api` an Port 5000), `npm run build` (nach `build/`,
der Dockerfile erwartet diesen Namen), `npm run preview`.

Titel und Registrierungsregeln setzt `docker-entrypoint.sh` beim Containerstart
in `public/config.js`, lokal greifen `VITE_*`-Variablen. Nur
`VITE_INSTANZ_VERZEICHNIS` (Instanzliste der App) muss beim Bauen feststehen.
