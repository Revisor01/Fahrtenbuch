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
