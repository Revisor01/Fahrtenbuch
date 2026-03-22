const ExcelJS = require('exceljs');
const path = require('path');

async function updateTemplate() {
  const templatePath = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath);
  const ws = wb.getWorksheet('monatliche Abrechnung');

  // Row 31: Hinweistext 1
  ws.getCell('A31').value = 'Für die Abrechnung von Tagegeldern nutzen Sie bitte die Einzel-Dienstreiseanträge';
  ws.getCell('A31').font = { name: 'Arial', size: 10, bold: false };

  // Row 32: Hinweistext 2 (bold per PDF reference)
  ws.getCell('A32').value = 'Bitte beachten Sie die Ausschlussfrist von 6 Monaten (§3 Abs. 1 BRKG) je abgeschlossener Dienstreise';
  ws.getCell('A32').font = { name: 'Arial', size: 10, bold: true };

  // Row 33: Datum-Label links
  ws.getCell('A33').value = 'Datum:';
  ws.getCell('A33').font = { name: 'Arial', size: 12, bold: true };

  // Row 36: Unterschrift-Label links
  ws.getCell('A36').value = 'Unterschrift: _________________________';
  ws.getCell('A36').font = { name: 'Arial', size: 12, bold: true };

  await wb.xlsx.writeFile(templatePath);
  console.info('Template updated successfully');
}

updateTemplate().catch(console.error);
