#!/bin/sh
# Laufzeit-Konfiguration: ersetzt die DEFAULT_*-Platzhalter in config.js durch
# die Werte der Container-Umgebung. Dadurch lassen sich Titel und
# Registrierungsregeln pro Instanz setzen, ohne das Image neu zu bauen —
# wichtig für mehrere Kirchenkreise auf demselben Image.
set -e

CONFIG=/usr/share/nginx/html/config.js

if [ -f "$CONFIG" ]; then
  cat > "$CONFIG" <<EOF
window.appConfig = {
  appTitle: '${REACT_APP_TITLE:-Fahrtenbuch}',
  allowRegistration: '${REACT_APP_ALLOW_REGISTRATION:-false}',
  allowedEmailDomains: '${REACT_APP_ALLOWED_EMAIL_DOMAINS:-}',
  registrationCode: '${REACT_APP_REGISTRATION_CODE:-}'
};
EOF
fi

exec "$@"
