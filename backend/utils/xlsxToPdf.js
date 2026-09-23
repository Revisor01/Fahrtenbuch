const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// LibreOffice headless: Konvertierung einer fertigen Arbeitsmappe nach PDF.
// Das PDF ist damit exakt das, was beim Drucken der Excel-Datei herauskäme —
// das offizielle Formular bleibt die einzige Layout-Wahrheit.

const SOFFICE_BIN = process.env.SOFFICE_BIN || 'soffice';
const CONVERT_TIMEOUT_MS = parseInt(process.env.SOFFICE_TIMEOUT_MS || '60000', 10);

// Wie viele LibreOffice-Prozesse gleichzeitig laufen duerfen.
//
// Auf dem Produktionsserver gemessen (23.09.2026, im Backend-Container):
//   1 Konvertierung  = 4,74 s, 209 MB Spitzenspeicher, 4,37 CPU-Sekunden
//   2 parallel       = 7,4/7,8 s (+60 %), zusammen 287 MB
// Der Server hat 2 Kerne und 6,3 GB frei. Ohne Grenze durfte ein einzelner
// angemeldeter Nutzer 60 Exporte in 10 Minuten ausloesen (Rate-Limit begrenzt
// die Anzahl, nicht die Gleichzeitigkeit) — bei 60 parallelen Laeufen waeren
// das rund 12,6 GB. Dann greift der OOM-Killer, und der groesste Prozess auf
// der Maschine ist mysqld: Ein Export haette die Datenbank mitgerissen.
//
// 2 passt zu den 2 Kernen: mehr bringt keinen Durchsatz, nur Speicher.
const MAX_GLEICHZEITIG = parseInt(process.env.SOFFICE_MAX_PARALLEL || '2', 10);

// Wie lange ein Auftrag auf einen freien Platz wartet, bevor er aufgibt.
// Lieber eine klare Fehlermeldung als eine Anfrage, die ewig haengt.
const WARTE_TIMEOUT_MS = parseInt(process.env.SOFFICE_QUEUE_TIMEOUT_MS || '120000', 10);

let laufend = 0;
const warteschlange = [];

function platzAnfordern() {
  if (laufend < MAX_GLEICHZEITIG) {
    laufend += 1;
    return Promise.resolve();
  }
  return new Promise((weiter, abbrechen) => {
    const eintrag = { weiter, abbrechen };
    const uhr = setTimeout(() => {
      const i = warteschlange.indexOf(eintrag);
      if (i >= 0) warteschlange.splice(i, 1);
      abbrechen(new Error('Der Server ist gerade ausgelastet. Bitte in einem Moment erneut versuchen.'));
    }, WARTE_TIMEOUT_MS);
    eintrag.uhr = uhr;
    warteschlange.push(eintrag);
  });
}

function platzFreigeben() {
  const naechster = warteschlange.shift();
  if (naechster) {
    clearTimeout(naechster.uhr);
    naechster.weiter();
    return; // laufend bleibt gleich: Platz geht direkt weiter
  }
  laufend -= 1;
}

function runSoffice(args, cwd, env) {
  return new Promise((resolve, reject) => {
    execFile(
      SOFFICE_BIN,
      args,
      { cwd, env, timeout: CONVERT_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          if (error.code === 'ENOENT') {
            return reject(new Error(
              `LibreOffice (${SOFFICE_BIN}) wurde nicht gefunden. Für den PDF-Export muss libreoffice-calc im Container installiert sein.`
            ));
          }
          if (error.killed || error.signal === 'SIGTERM') {
            return reject(new Error(
              `LibreOffice-Konvertierung nach ${CONVERT_TIMEOUT_MS} ms abgebrochen (Timeout).`
            ));
          }
          return reject(new Error(
            `LibreOffice-Konvertierung fehlgeschlagen: ${error.message} ${String(stderr || '').trim()}`.trim()
          ));
        }
        resolve({ stdout, stderr });
      }
    );
  });
}

/**
 * Konvertiert eine XLSX-Arbeitsmappe (Buffer) via LibreOffice headless nach PDF.
 *
 * Jeder Aufruf bekommt ein eigenes temporäres Verzeichnis samt eigenem
 * UserInstallation-Profil, damit parallele Aufrufe sich nicht blockieren.
 *
 * @param {Buffer} xlsxBuffer  Inhalt der XLSX-Datei
 * @param {string} [basename]  Basisname ohne Endung (nur für die temporäre Datei)
 * @returns {Promise<Buffer>}  PDF-Inhalt
 */
async function convertXlsxBufferToPdf(xlsxBuffer, basename = 'export') {
  // Platz in der Warteschlange holen, BEVOR irgendetwas angelegt wird —
  // sonst liegen bei Andrang Dutzende temporaere Verzeichnisse herum,
  // waehrend die Auftraege warten.
  await platzAnfordern();
  try {
    return await konvertiere(xlsxBuffer, basename);
  } finally {
    platzFreigeben();
  }
}

async function konvertiere(xlsxBuffer, basename) {
  if (!Buffer.isBuffer(xlsxBuffer)) {
    xlsxBuffer = Buffer.from(xlsxBuffer);
  }

  const safeName = String(basename).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60) || 'export';
  const tmpDir = await fs.mkdtemp(
    path.join(os.tmpdir(), `fb-pdf-${crypto.randomBytes(6).toString('hex')}-`)
  );

  const xlsxPath = path.join(tmpDir, `${safeName}.xlsx`);
  const pdfPath = path.join(tmpDir, `${safeName}.pdf`);
  const profileDir = path.join(tmpDir, 'lo');

  try {
    await fs.writeFile(xlsxPath, xlsxBuffer);

    // LibreOffice braucht ein beschreibbares HOME, sonst scheitert der erste
    // Aufruf im Container ("javaldx"/Profil-Fehler). Das temporäre Verzeichnis
    // dient hier zugleich als HOME und als UserInstallation.
    const env = {
      ...process.env,
      HOME: tmpDir,
      TMPDIR: tmpDir
    };

    await runSoffice(
      [
        '--headless',
        '--norestore',
        '--nolockcheck',
        '--nodefault',
        '--nofirststartwizard',
        `-env:UserInstallation=file://${profileDir}`,
        '--convert-to', 'pdf:calc_pdf_Export',
        '--outdir', tmpDir,
        xlsxPath
      ],
      tmpDir,
      env
    );

    let pdfBuffer;
    try {
      pdfBuffer = await fs.readFile(pdfPath);
    } catch (readError) {
      throw new Error(
        `LibreOffice hat keine PDF-Datei erzeugt (erwartet: ${path.basename(pdfPath)}).`
      );
    }

    if (!pdfBuffer.length) {
      throw new Error('LibreOffice hat eine leere PDF-Datei erzeugt.');
    }

    return pdfBuffer;
  } finally {
    // Temporäres Verzeichnis inklusive XLSX, PDF und LO-Profil aufräumen
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

module.exports = { convertXlsxBufferToPdf };
