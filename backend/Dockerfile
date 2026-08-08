FROM node:20

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
RUN npm install
COPY . .

ARG CORS_ORIGIN
ENV CORS_ORIGIN=$CORS_ORIGIN

EXPOSE 5000
CMD ["node", "app.js"]