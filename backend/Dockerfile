FROM node:24

# LibreOffice Calc (headless) für den PDF-Export: Die fertige Excel-Arbeitsmappe
# wird nach PDF konvertiert, damit der Ausdruck 1:1 dem offiziellen Formular
# entspricht. default-jre-headless wird NICHT benötigt — der Calc-PDF-Export
# funktioniert ohne Java (nur eine folgenlose javaldx-Warnung), das spart ~150 MB.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-calc \
      fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# --omit=dev: nodemon ist die einzige devDependency und wird zur Laufzeit
# nicht gebraucht (CMD startet node direkt). `npm ci` statt `npm install`,
# damit der Build genau den Stand aus package-lock.json nimmt.
RUN npm ci --omit=dev
COPY --chown=node:node . .

ARG CORS_ORIGIN
ENV CORS_ORIGIN=$CORS_ORIGIN

# Nicht als root laufen: In diesem Container rendert LibreOffice Texte, die
# Nutzer:innen eingegeben haben (Anlass, Ortsnamen) — der Prozess mit den
# weitesten Rechten im Stack verarbeitet die am wenigsten vertrauenswuerdigen
# Daten.
#
# Geprueft, dass nichts daran scheitert: Der einzige Schreibzugriff geht nach
# /tmp (utils/xlsxToPdf.js, fs.mkdtemp), und LibreOffice bekommt HOME, TMPDIR
# und -env:UserInstallation bereits auf genau dieses Verzeichnis gesetzt.
# Port 5000 liegt ueber 1024, braucht also keine zusaetzliche Berechtigung.
#
# Die Entwicklungs-Compose mountet ./backend nach /app und setzt deshalb
# `user: root` — dort gehoert das Verzeichnis dem Host.
USER node

EXPOSE 5000
CMD ["node", "app.js"]