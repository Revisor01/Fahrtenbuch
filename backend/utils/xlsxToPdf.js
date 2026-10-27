const { execFile } = require('child_process');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// LibreOffice headless wandelt die fertige Mappe nach PDF.

const SOFFICE_BIN = process.env.SOFFICE_BIN || 'soffice';
const CONVERT_TIMEOUT_MS = parseInt(process.env.SOFFICE_TIMEOUT_MS || '60000', 10);

// Höchstens 2 parallel, passend zu 2 Kernen; ein Lauf braucht 209 MB, ohne Grenze riss ein OOM mysqld mit.
const MAX_GLEICHZEITIG = parseInt(process.env.SOFFICE_MAX_PARALLEL || '2', 10);

// Lieber eine klare Fehlermeldung als eine hängende Anfrage.
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

/** Wandelt eine XLSX-Mappe per LibreOffice in ein PDF, je Aufruf mit eigenem Profil. */
async function convertXlsxBufferToPdf(xlsxBuffer, basename = 'export') {
  // Erst den Platz holen, dann Verzeichnisse anlegen.
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

  // Beschreibbares HOME, sonst scheitert der erste Aufruf im Container.
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
