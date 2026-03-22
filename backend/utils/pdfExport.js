const PDFDocument = require('pdfkit');
const Fahrt = require('../models/Fahrt');
const db = require('../config/database');

// -- Helper functions (shared logic with excelExport.js) --

async function getUserProfile(userId) {
  const [rows] = await db.execute(
    `SELECT p.*, o.adresse as home_address
     FROM user_profiles p
     LEFT JOIN orte o ON p.user_id = o.user_id AND o.ist_wohnort = 1
     WHERE p.user_id = ?`,
    [userId]
  );
  return rows[0];
}

function formatIBAN(iban) {
  if (!iban) return '';
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

function getMonthName(monthNumber) {
  const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return monthNames[monthNumber - 1];
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
}

// -- Layout constants (A4 landscape: 841.89 x 595.28 pt) --

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = { top: 35, bottom: 30, left: 40, right: 40 };
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN.left - MARGIN.right;
const MAX_ROWS = 22;

// Column definitions for the trip table
const COLUMNS = [
  { header: 'Datum', width: 65, align: 'left' },
  { header: 'Anschrift Reiseantritt\n(wenn nicht identisch mit o.a. Anschrift):', width: 200, align: 'left' },
  { header: 'Anschrift Reiseziel', width: 180, align: 'left' },
  { header: 'Reisezweck', width: 175, align: 'left' },
  { header: 'gefahrene\nkm', width: 62, align: 'right' }
];

// Mitfahrer column definitions
const MITFAHRER_COLUMNS = [
  { header: 'Datum', width: 60, align: 'left' },
  { header: 'Reisezweck', width: 130, align: 'left' },
  { header: 'Hinweg', width: 140, align: 'left' },
  { header: 'Rückweg', width: 140, align: 'left' },
  { header: 'Name', width: 100, align: 'left' },
  { header: 'Arbeitsstätte', width: 90, align: 'left' },
  { header: 'km', width: 42, align: 'right' }
];

// -- Render functions --

function renderHeader(doc, userProfile, zeitraumHeader, traegerInfo) {
  const x = MARGIN.left;
  let y = MARGIN.top;

  // Title
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('Abrechnung von genehmigten Dienstfahrten', x, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 18;
  doc.font('Helvetica-Bold').fontSize(11);
  doc.text('mit meinem dienstlich anerkanntem Privatfahrzeug', x, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 24;

  // Header block with border
  const headerStartY = y;
  const leftColWidth = 340;
  const rightColStart = x + leftColWidth;
  const rightColWidth = CONTENT_WIDTH - leftColWidth;
  const headerHeight = 54;

  doc.rect(x, headerStartY, CONTENT_WIDTH, headerHeight).stroke('#000');
  doc.moveTo(rightColStart, headerStartY).lineTo(rightColStart, headerStartY + headerHeight).stroke('#000');

  // Left column
  doc.font('Helvetica-Bold').fontSize(9);
  const labelY1 = headerStartY + 5;
  doc.text('Jahr:', x + 5, labelY1);
  doc.font('Helvetica').fontSize(9);

  // Extract year and month display from zeitraumHeader
  const yearMatch = zeitraumHeader.match(/(\d{4})/);
  const displayYear = yearMatch ? yearMatch[1] : '';
  doc.text(displayYear, x + 35, labelY1);

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Monat:', x + 80, labelY1);
  doc.font('Helvetica').fontSize(9);
  // Remove the year from zeitraumHeader for the month field
  const monthDisplay = zeitraumHeader.replace(/\s*\d{4}\s*/, ' ').trim();
  doc.text(monthDisplay, x + 118, labelY1, { width: 200 });

  const labelY2 = headerStartY + 19;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Kostenträger:', x + 5, labelY2);
  doc.font('Helvetica').fontSize(9);
  doc.text(traegerInfo, x + 80, labelY2, { width: 250 });

  // IBAN row (left side, below Kostentraeger)
  const labelY3 = headerStartY + 36;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('IBAN:', rightColStart + 5, labelY3);
  doc.font('Helvetica').fontSize(9);
  doc.text(formatIBAN(userProfile?.iban), rightColStart + 70, labelY3, { width: 200 });

  // Right column
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Name:', rightColStart + 5, labelY1);
  doc.font('Helvetica').fontSize(9);
  doc.text(userProfile?.full_name || '', rightColStart + 70, labelY1, { width: 250 });

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Anschrift:', rightColStart + 5, labelY2);
  doc.font('Helvetica').fontSize(9);
  doc.text(userProfile?.home_address || '', rightColStart + 70, labelY2, { width: 250 });

  // IBAN hint
  doc.font('Helvetica').fontSize(7);
  const ibanHintX = rightColStart + 280;
  doc.text('(Angabe notwendig bei', ibanHintX, labelY3, { width: 120 });
  doc.text('Pastoren/innen und Ehrenamtlichen)', ibanHintX, labelY3 + 8, { width: 140 });

  return headerStartY + headerHeight + 8;
}

function renderTableHeader(doc, y, columns) {
  const x = MARGIN.left;
  const headerHeight = 28;

  // Yellow background for header
  let colX = x;
  columns.forEach(col => {
    doc.rect(colX, y, col.width, headerHeight).fill('#FFD700').stroke('#000');
    colX += col.width;
  });

  // Header text
  doc.fill('#000').font('Helvetica-Bold').fontSize(8);
  colX = x;
  columns.forEach(col => {
    const textX = col.align === 'right' ? colX + 2 : colX + 3;
    const textWidth = col.width - 6;
    doc.text(col.header, textX, y + 3, {
      width: textWidth,
      align: col.align === 'right' ? 'right' : 'left'
    });
    colX += col.width;
  });

  return y + headerHeight;
}

function renderTableRow(doc, y, rowData, columns, rowHeight) {
  const x = MARGIN.left;
  let colX = x;

  // Draw cell borders
  columns.forEach(col => {
    doc.rect(colX, y, col.width, rowHeight).stroke('#000');
    colX += col.width;
  });

  // Cell content
  doc.font('Helvetica').fontSize(8).fill('#000');
  colX = x;
  rowData.forEach((cellValue, i) => {
    const col = columns[i];
    const textX = col.align === 'right' ? colX + 2 : colX + 3;
    const textWidth = col.width - 6;
    const displayValue = cellValue !== undefined && cellValue !== null ? String(cellValue) : '';
    doc.text(displayValue, textX, y + 3, {
      width: textWidth,
      align: col.align === 'right' ? 'right' : 'left',
      lineBreak: false
    });
    colX += col.width;
  });

  return y + rowHeight;
}

function renderFooter(doc, y, gesamtKm, erstattung) {
  const x = MARGIN.left;
  const today = formatDate(new Date().toISOString());
  const currentYear = new Date().getFullYear();

  // Hint texts
  y += 2;
  doc.font('Helvetica').fontSize(7).fill('#000');
  doc.text('Für die Abrechnung von Tagegeldern nutzen Sie bitte die Einzel-Dienstreiseanträge', x, y, { width: 500 });
  y += 9;
  doc.text('Bitte beachten Sie die Ausschlussfrist von 6 Monaten (§3 Abs. 1 BRKG) je abgeschlossener Dienstreise', x, y, { width: 500 });

  // Gesamt km (right-aligned)
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Gesamt gefahrene km :', x + 450, y - 9, { width: 200, align: 'left' });
  doc.text(String(gesamtKm), x + 600, y - 9, { width: 80, align: 'right' });

  // Erstattungszeile
  y += 16;
  doc.moveTo(x, y).lineTo(x + CONTENT_WIDTH, y).stroke('#000');
  y += 5;

  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Datum:', x, y);
  doc.font('Helvetica').fontSize(9);
  doc.text(today, x + 45, y);

  doc.text('Abrechnung der oben aufgeführten gefahrenen km:', x + 230, y, { width: 300 });
  doc.text(`${gesamtKm} km x 0,30 \u20AC =`, x + 530, y, { width: 100, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text(`${erstattung.toFixed(2).replace('.', ',')} \u20AC`, x + 640, y, { width: 80, align: 'right' });

  // Unterschriftszeile
  y += 28;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Unterschrift: ___________________', x, y);
  doc.text('Datum: _________', x + 230, y);
  doc.text('Angeordnet/genehmigt Unterschrift: _____________________________________', x + 380, y);

  // Fahrtenbuch Stand
  y += 30;
  doc.font('Helvetica').fontSize(7);
  doc.text(`Fahrtenbuch Stand ${currentYear}`, x + CONTENT_WIDTH - 120, y, { width: 120, align: 'right' });
}

function renderPage(doc, chunk, userProfile, zeitraumHeader, traegerInfo, gesamtKm, erstattung, isLastPage) {
  let y = renderHeader(doc, userProfile, zeitraumHeader, traegerInfo);
  y = renderTableHeader(doc, y, COLUMNS);

  const ROW_HEIGHT = 15;
  chunk.forEach(row => {
    const rowData = [
      row.formattedDatum || '',
      row.vonOrt || '',
      row.nachOrt || '',
      row.anlass || '',
      row.kilometer !== '' && row.kilometer !== undefined ? row.kilometer : ''
    ];
    y = renderTableRow(doc, y, rowData, COLUMNS, ROW_HEIGHT);
  });

  if (isLastPage) {
    renderFooter(doc, y, gesamtKm, erstattung);
  }
}

function renderMitfahrerPage(doc, chunk, userProfile, zeitraumHeader, gesamtKm) {
  let y = MARGIN.top;

  // Title
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('Mitnahmeentschädigung', MARGIN.left, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 22;

  doc.font('Helvetica').fontSize(10);
  doc.text(zeitraumHeader, MARGIN.left, y, { width: CONTENT_WIDTH, align: 'center' });
  y += 20;

  doc.font('Helvetica').fontSize(9);
  doc.text(`Name: ${userProfile?.full_name || ''}`, MARGIN.left, y);
  y += 18;

  y = renderTableHeader(doc, y, MITFAHRER_COLUMNS);

  const ROW_HEIGHT = 15;
  chunk.forEach(row => {
    const rowData = [
      row.datum || '',
      row.anlass || '',
      row.hinweg || '',
      row.rueckweg || '',
      row.name || '',
      row.arbeitsstaette || '',
      row.kilometer !== '' && row.kilometer !== undefined ? row.kilometer : ''
    ];
    y = renderTableRow(doc, y, rowData, MITFAHRER_COLUMNS, ROW_HEIGHT);
  });

  // Gesamt
  y += 5;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text(`Gesamt gefahrene km: ${gesamtKm}`, MARGIN.left + 450, y, { width: 200, align: 'right' });
}

// -- Data preparation (same logic as excelExport.js) --

function prepareFormattedData(fahrten, type) {
  return fahrten.flatMap(fahrt => {
    if (fahrt.autosplit) {
      return fahrt.details
        .filter(detail => detail.abrechnung.toLowerCase() === type)
        .map(detail => ({
          datum: new Date(fahrt.datum),
          formattedDatum: formatDateShort(fahrt.datum),
          vonOrt: detail.von_ort_adresse || detail.von_ort_name,
          nachOrt: detail.nach_ort_adresse || detail.nach_ort_name,
          anlass: fahrt.anlass,
          kilometer: Math.round(detail.kilometer)
        }));
    } else if (fahrt.abrechnung === type) {
      return [{
        datum: new Date(fahrt.datum),
        formattedDatum: formatDateShort(fahrt.datum),
        vonOrt: fahrt.von_ort_adresse || fahrt.von_ort_name || fahrt.einmaliger_von_ort,
        nachOrt: fahrt.nach_ort_adresse || fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
        anlass: fahrt.anlass,
        kilometer: Math.round(fahrt.kilometer)
      }];
    }
    return [];
  }).sort((a, b) => a.datum - b.datum);
}

function prepareMitfahrerData(fahrten) {
  const mitfahrerData = fahrten.map(fahrt => {
    if (fahrt.mitfahrer_id) {
      return {
        datum: formatDateShort(fahrt.datum),
        anlass: fahrt.anlass,
        name: fahrt.mitfahrer_name,
        arbeitsstaette: fahrt.arbeitsstaette,
        hinweg: fahrt.richtung === 'hin' || fahrt.richtung === 'hin_rueck'
          ? `${fahrt.von_ort_name}-${fahrt.nach_ort_name}` : '',
        rueckweg: fahrt.richtung === 'rueck' || fahrt.richtung === 'hin_rueck'
          ? `${fahrt.nach_ort_name}-${fahrt.von_ort_name}` : '',
        kilometer: Math.round(parseFloat(fahrt.kilometer))
      };
    }
    return null;
  }).filter(Boolean);

  // Remove duplicates
  return mitfahrerData.filter((mitfahrer, index, self) =>
    index === self.findIndex((t) => t.datum === mitfahrer.datum && t.name === mitfahrer.name)
  );
}

function chunkData(data, maxRows) {
  const chunks = [];
  for (let i = 0; i < data.length; i += maxRows) {
    chunks.push(data.slice(i, i + maxRows));
  }

  // Pad last chunk to maxRows
  if (chunks.length > 0 && chunks[chunks.length - 1].length < maxRows) {
    const lastChunk = chunks[chunks.length - 1];
    while (lastChunk.length < maxRows) {
      lastChunk.push({ formattedDatum: '', vonOrt: '', nachOrt: '', anlass: '', kilometer: '' });
    }
  }

  // If no data, create one empty chunk
  if (chunks.length === 0) {
    const emptyChunk = [];
    for (let i = 0; i < maxRows; i++) {
      emptyChunk.push({ formattedDatum: '', vonOrt: '', nachOrt: '', anlass: '', kilometer: '' });
    }
    chunks.push(emptyChunk);
  }

  return chunks;
}

// -- Export handlers --

exports.exportToPdf = async (req, res) => {
  try {
    const { year, month, type } = req.params;
    const userId = req.user.id;

    const correctedMonth = month.split('-')[1] || month;

    const fahrten = await Fahrt.getMonthlyReport(year, correctedMonth, userId);
    const userProfile = await getUserProfile(userId);

    const zeitraumHeader = `${getMonthName(parseInt(correctedMonth))} ${year}`;

    if (type === 'mitfahrer') {
      const mitfahrerData = prepareMitfahrerData(fahrten);

      if (mitfahrerData.length === 0) {
        return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
      }

      const gesamtKm = mitfahrerData.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
      const chunks = chunkData(mitfahrerData, MAX_ROWS);

      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=mitfahrer_${year}_${correctedMonth}.pdf`);
      doc.pipe(res);

      chunks.forEach((chunk, i) => {
        if (i > 0) doc.addPage({ layout: 'landscape', size: 'A4', margin: 0 });
        renderMitfahrerPage(doc, chunk, userProfile, zeitraumHeader, gesamtKm);
      });

      doc.end();
      return;
    }

    // Normal export for Abrechnungstraeger types
    const formattedData = prepareFormattedData(fahrten, type);

    if (formattedData.length === 0) {
      return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
    }

    // Get Abrechnungstraeger info
    const [abrechnungstraeger] = await db.execute(
      'SELECT name, kostenstelle FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
      [type, userId]
    );
    const traegerName = abrechnungstraeger[0]?.name || '';
    const kostenstelle = abrechnungstraeger[0]?.kostenstelle;
    const traegerInfo = kostenstelle
      ? `${traegerName} - Kst.: ${kostenstelle}`
      : traegerName;

    const gesamtKm = formattedData.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
    const erstattung = gesamtKm * 0.30;

    const chunks = chunkData(formattedData, MAX_ROWS);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fahrtenabrechnung_${type}_${year}_${correctedMonth}.pdf`);
    doc.pipe(res);

    chunks.forEach((chunk, i) => {
      if (i > 0) doc.addPage({ layout: 'landscape', size: 'A4', margin: 0 });
      renderPage(doc, chunk, userProfile, zeitraumHeader, traegerInfo, gesamtKm, erstattung, i === chunks.length - 1);
    });

    doc.end();

  } catch (error) {
    console.error('Fehler beim PDF-Export:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Fehler beim PDF-Export', error: error.message });
    }
  }
};

exports.exportToPdfRange = async (req, res) => {
  try {
    const { startYear, startMonth, endYear, endMonth, type } = req.params;
    const userId = req.user.id;

    const fahrten = await Fahrt.getDateRangeReport(startYear, startMonth, endYear, endMonth, userId);
    const userProfile = await getUserProfile(userId);

    // Determine header time range (same logic as excelExport.js)
    const isSingleMonth = startYear === endYear && startMonth === endMonth;
    const zeitraumHeader = isSingleMonth
      ? `${getMonthName(parseInt(startMonth))} ${startYear}`
      : `${String(startMonth).padStart(2, '0')}/${startYear} - ${String(endMonth).padStart(2, '0')}/${endYear}`;

    if (type === 'mitfahrer') {
      const mitfahrerData = prepareMitfahrerData(fahrten);

      if (mitfahrerData.length === 0) {
        return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
      }

      const gesamtKm = mitfahrerData.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
      const chunks = chunkData(mitfahrerData, MAX_ROWS);

      const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=mitfahrer_${startYear}_${startMonth}_bis_${endYear}_${endMonth}.pdf`);
      doc.pipe(res);

      chunks.forEach((chunk, i) => {
        if (i > 0) doc.addPage({ layout: 'landscape', size: 'A4', margin: 0 });
        renderMitfahrerPage(doc, chunk, userProfile, zeitraumHeader, gesamtKm);
      });

      doc.end();
      return;
    }

    // Normal export
    const formattedData = prepareFormattedData(fahrten, type);

    if (formattedData.length === 0) {
      return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
    }

    // Get Abrechnungstraeger info
    const [abrechnungstraeger] = await db.execute(
      'SELECT name, kostenstelle FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
      [type, userId]
    );
    const traegerName = abrechnungstraeger[0]?.name || '';
    const kostenstelle = abrechnungstraeger[0]?.kostenstelle;
    const traegerInfo = kostenstelle
      ? `${traegerName} - Kst.: ${kostenstelle}`
      : traegerName;

    const gesamtKm = formattedData.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
    const erstattung = gesamtKm * 0.30;

    const chunks = chunkData(formattedData, MAX_ROWS);

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}.pdf`);
    doc.pipe(res);

    chunks.forEach((chunk, i) => {
      if (i > 0) doc.addPage({ layout: 'landscape', size: 'A4', margin: 0 });
      renderPage(doc, chunk, userProfile, zeitraumHeader, traegerInfo, gesamtKm, erstattung, i === chunks.length - 1);
    });

    doc.end();

  } catch (error) {
    console.error('Fehler beim PDF-Export (Range):', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Fehler beim PDF-Export', error: error.message });
    }
  }
};
