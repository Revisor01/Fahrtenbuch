# Bookworm, weil Trixie ein anderes LibreOffice mit ungeprüfter PDF-Ausgabe brächte.
FROM node:26-bookworm

# LibreOffice Calc für den PDF-Export nach Formular; ohne Java, das spart ~150 MB.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-calc \
      fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
# npm ci --omit=dev: genau das Lockfile, nodemon braucht es zur Laufzeit nicht.
RUN npm ci --omit=dev
COPY --chown=node:node . .

ARG CORS_ORIGIN
ENV CORS_ORIGIN=$CORS_ORIGIN

# Nicht als root, weil LibreOffice Nutzereingaben rendert; geschrieben wird nur nach /tmp.
USER node

EXPOSE 5000
CMD ["node", "app.js"]