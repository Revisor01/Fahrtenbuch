const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const Fahrt = require('../models/Fahrt');
const Abrechnung = require('../models/Abrechnung');
const db = require('../config/database');
const {
  getErstattungssatzFuerTraeger,
  ladeSaetzeFuerTraeger,
  berechneErstattung,
} = require('./erstattung');

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
 const monthNames = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
 const monthName = monthNames[date.getMonth()];
 return `${day}. ${monthName}`;
}

const QUARTAL_SHEETS = [
 'Januar-März',
 'April-Juni',
 'Juli-September',
 'Oktober-Dezember'
];

function getQuartalSheet(month) {
 const m = parseInt(month);
 if (m >= 1 && m <= 3) return QUARTAL_SHEETS[0];
 if (m >= 4 && m <= 6) return QUARTAL_SHEETS[1];
 if (m >= 7 && m <= 9) return QUARTAL_SHEETS[2];
 return QUARTAL_SHEETS[3];
}

// Max data rows per quartal sheet (rows 8-36)
const MAX_ROWS_PER_SHEET = 29;

const TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'fahrtenabrechnung_vorlage.xlsx');

// Mitnahmeentschädigung: im offiziellen Formular fest mit 0,05 €/km vorgegeben
// (Beschriftung "km x 0,05 € =" steht statisch in F42).
const MITNAHME_SATZ = 0.05;

// Der mitfahrer-JOIN in getMonthlyReport/getDateRangeReport liefert pro Mitfahrer
// eine Row — für den normalen Export je Fahrt genau eine Zeile behalten.
function dedupeByFahrtId(rows) {
  const seen = new Set();
  return rows.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

function fillVorlageSheet(worksheet, year, kostentraeger, kostenstelle, userProfile) {
 worksheet.getCell('C7').value = parseInt(year);
 worksheet.getCell('C8').value = kostenstelle
   ? `${kostentraeger} - Kst.: ${kostenstelle}`
   : kostentraeger;
 worksheet.getCell('C12').value = userProfile.full_name;
 worksheet.getCell('C13').value = userProfile.home_address;
 worksheet.getCell('C14').value = formatIBAN(userProfile.iban);
}

// Das Quartalsblatt zieht Jahr, Kostenträger, Name, Anschrift und IBAN im
// Template per Querverweis aus dem Vorlage-Blatt (z. B. G2 = Vorlage!C12).
// ExcelJS schreibt solche Formeln ohne belastbaren Cache-Wert zurück, weshalb
// LibreOffice beim PDF-Export dort 0 anzeigt. Deshalb werden die Kopffelder
// hier mit echten Werten überschrieben — im Excel wie im PDF identisch.
function fillQuartalHeader(worksheet, year, kostentraeger, kostenstelle, userProfile) {
 worksheet.getCell('B2').value = parseInt(year);
 worksheet.getCell('B3').value = kostenstelle
   ? `${kostentraeger} - Kst.: ${kostenstelle}`
   : kostentraeger;
 worksheet.getCell('G2').value = userProfile.full_name;
 worksheet.getCell('G3').value = userProfile.home_address;
 worksheet.getCell('G4').value = formatIBAN(userProfile.iban);
}

function fillQuartalSheet(worksheet, data, year, satz, saetze) {
 // Update year
 worksheet.getCell('B2').value = parseInt(year);

 // Fill data rows (starting at row 8, max 29 rows)
 // Only set values — styles are already correct in the template
 data.forEach((row, rowIndex) => {
   if (rowIndex >= MAX_ROWS_PER_SHEET) return;
   const excelRow = worksheet.getRow(rowIndex + 8);

   excelRow.getCell('A').value = row.datum;
   excelRow.getCell('A').numFmt = 'DD.MM.YYYY';
   excelRow.getCell('B').value = row.vonOrt;
   excelRow.getCell('F').value = row.nachOrt;
   excelRow.getCell('H').value = row.anlass;
   excelRow.getCell('K').value = row.kilometer;
 });

 // Gesamt km in K37
 const gesamtKm = data.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
 worksheet.getCell('K37').value = gesamtKm;

 // Ausstellungsdatum (Template: Formel TODAY() ohne Cache-Wert)
 worksheet.getCell('B40').value = new Date();
 worksheet.getCell('B40').numFmt = 'DD.MM.YYYY';

 // Erstattungsberechnung in Zeile 40 — Satz aus der DB (Template enthält
 // statisch "km x 0,30 € =" in I40 und Formel H40*0.3 in J40, beides überschreiben).
 // Jede Fahrt wird mit dem an IHREM Datum gueltigen Satz gerechnet. Frueher galt
 // ein einziger Stichtagssatz fuer den gesamten Zeitraum - bei einer
 // Satzaenderung standen dadurch falsche Betraege im eingereichten Formular.
 const { betrag, gemischt, effektivSatz } = berechneErstattung(data, saetze);

 worksheet.getCell('H40').value = gesamtKm;
 worksheet.getCell('I40').value = gemischt
   // Bei Satzwechsel im Zeitraum passt keine einzelne "km x Satz"-Zeile; der
   // Mischsatz macht den Betrag nachvollziehbar statt ihn zu verschleiern.
   ? `km, Mischsatz ${effektivSatz.toFixed(4).replace('.', ',')} € =`
   : `km x ${(gemischt ? effektivSatz : satz).toFixed(2).replace('.', ',')} € =`;
 worksheet.getCell('J40').value = betrag;
}

function removeUnusedQuartalSheets(workbook, keepSheetName) {
 // Remove quartal sheets we don't need
 QUARTAL_SHEETS.forEach(name => {
   if (name !== keepSheetName) {
     const ws = workbook.getWorksheet(name);
     if (ws) workbook.removeWorksheet(ws.id);
   }
 });
}

async function ladeTemplate() {
 const workbook = new ExcelJS.Workbook();
 await workbook.xlsx.readFile(TEMPLATE_PATH);
 // Verbliebene Formeln (z. B. SUM) beim Öffnen neu berechnen lassen
 workbook.calcProperties.fullCalcOnLoad = true;
 return workbook;
}

// -- Datenaufbereitung (von Excel- und PDF-Export gemeinsam genutzt) --

function prepareFormattedData(fahrten, type) {
 return dedupeByFahrtId(fahrten).flatMap(fahrt => {
   if (fahrt.autosplit) {
     return fahrt.details
     .filter(detail => detail.abrechnung.toLowerCase() === type)
     .map(detail => ({
       datum: new Date(fahrt.datum),
       formattedDatum: formatDate(fahrt.datum),
       vonOrt: detail.von_ort_adresse || detail.von_ort_name,
       nachOrt: detail.nach_ort_adresse || detail.nach_ort_name,
       anlass: fahrt.anlass,
       kilometer: Math.round(detail.kilometer)
     }));
   } else if (fahrt.abrechnung === type) {
     return [{
       datum: new Date(fahrt.datum),
       formattedDatum: formatDate(fahrt.datum),
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
       // fahrt_id/mitfahrer_id nur zum Entduplizieren, nicht fuers Formular
       _fahrtId: fahrt.id ?? fahrt.fahrt_id,
       _mitfahrerId: fahrt.mitfahrer_id,
       datum: formatDate(fahrt.datum),
       anlass: fahrt.anlass,
       name: fahrt.mitfahrer_name,
       arbeitsstaette: fahrt.arbeitsstaette,
       hinweg: fahrt.richtung === 'hin' || fahrt.richtung === 'hin_rueck' ?
         `${fahrt.von_ort_name}-${fahrt.nach_ort_name}` : '',
       rueckweg: fahrt.richtung === 'rueck' || fahrt.richtung === 'hin_rueck' ?
         `${fahrt.nach_ort_name}-${fahrt.von_ort_name}` : '',
       kilometer: Math.round(parseFloat(fahrt.kilometer))
     };
   }
   return null;
 }).filter(Boolean);

 // Echte Duplikate aus dem JOIN entfernen — also dieselbe Person auf derselben
 // Fahrt. Frueher lief der Filter ueber (Datum, Name) und verwarf damit die
 // zweite Fahrt einer Person am selben Tag: bei getrennt erfasster Hin- und
 // Rueckfahrt fiel die Rueckfahrt still aus der Mitnahmeentschaedigung.
 const gesehen = new Set();
 return mitfahrerData.filter((m) => {
   const schluessel = `${m._fahrtId}|${m._mitfahrerId}`;
   if (gesehen.has(schluessel)) return false;
   gesehen.add(schluessel);
   return true;
 });
}

/**
 * Konfigurierter Mitnahmesatz des Nutzers. Der Export rechnete bisher immer mit
 * 0,05 €, obwohl der Satz in den Einstellungen aenderbar ist — Anzeige und
 * Formular wichen dadurch voneinander ab.
 */
async function getMitnahmeSatz(userId) {
 try {
   const [rows] = await db.execute(
     'SELECT betrag FROM mitfahrer_erstattung WHERE user_id = ? ORDER BY gueltig_ab DESC LIMIT 1',
     [userId]
   );
   const betrag = parseFloat(rows[0]?.betrag);
   return Number.isFinite(betrag) ? betrag : MITNAHME_SATZ;
 } catch (error) {
   console.error('Mitnahmesatz konnte nicht geladen werden, nutze Standard:', error);
   return MITNAHME_SATZ;
 }
}

function chunkFormattedData(formattedData) {
 const chunkedData = [];
 for (let i = 0; i < formattedData.length; i += MAX_ROWS_PER_SHEET) {
   chunkedData.push(formattedData.slice(i, i + MAX_ROWS_PER_SHEET));
 }
 return chunkedData;
}

async function baueMitfahrerWorkbook({ jahr, zeitraumHeader, userProfile, mitfahrerData, satz = MITNAHME_SATZ }) {
 const workbook = await ladeTemplate();

 const vorlageWorksheet = workbook.getWorksheet('Vorlage');
 if (vorlageWorksheet) {
   vorlageWorksheet.getCell('C7').value = parseInt(jahr);
   vorlageWorksheet.getCell('C8').value = "Mitfahrer:innen";
   vorlageWorksheet.getCell('C12').value = userProfile.full_name;
   vorlageWorksheet.getCell('C13').value = userProfile.home_address;
   vorlageWorksheet.getCell('C14').value = formatIBAN(userProfile.iban);
 }

 // Remove all quartal sheets for mitfahrer export
 QUARTAL_SHEETS.forEach(name => {
   const ws = workbook.getWorksheet(name);
   if (ws) workbook.removeWorksheet(ws.id);
 });

 const mitnahmeWorksheet = workbook.getWorksheet('Mitnahmeentschädigung');
 if (mitnahmeWorksheet) {
   mitnahmeWorksheet.getCell('B2').value = parseInt(jahr);
   mitnahmeWorksheet.getCell('D2').value = zeitraumHeader;

   // Wie im Quartalsblatt: Querverweise auf das Vorlage-Blatt durch echte
   // Werte ersetzen (E2/E4/E6 sind die Anker der verbundenen Zellen).
   mitnahmeWorksheet.getCell('E2').value = userProfile.full_name;
   mitnahmeWorksheet.getCell('E4').value = userProfile.home_address;
   mitnahmeWorksheet.getCell('E6').value = formatIBAN(userProfile.iban);
   mitnahmeWorksheet.getCell('B4').value = 'Mitfahrer:innen';

   // Der Aufrufer chunkt bereits auf MAX_ROWS_PER_SHEET — hier wird genau
   // geschrieben, was ankommt. Frueher wurde ab Zeile 30 still verworfen.
   mitfahrerData.forEach((mitfahrer, index) => {
     const row = mitnahmeWorksheet.getRow(index + 10);
     row.getCell('A').value = mitfahrer.datum;
     row.getCell('B').value = mitfahrer.anlass;
     row.getCell('C').value = mitfahrer.hinweg;
     row.getCell('D').value = mitfahrer.rueckweg;
     row.getCell('E').value = mitfahrer.name;
     row.getCell('F').value = mitfahrer.arbeitsstaette;
     row.getCell('G').value = mitfahrer.kilometer;
   });

   // Summen- und Erstattungszeile (Template: SUM-Formeln ohne Cache-Wert)
   const gesamtKm = mitfahrerData
     .reduce((sum, m) => sum + (typeof m.kilometer === 'number' && !isNaN(m.kilometer) ? m.kilometer : 0), 0);
   mitnahmeWorksheet.getCell('G39').value = gesamtKm;
   mitnahmeWorksheet.getCell('B42').value = new Date();
   mitnahmeWorksheet.getCell('B42').numFmt = 'DD.MM.YYYY';
   mitnahmeWorksheet.getCell('E42').value = gesamtKm;
   // Satz aus der DB statt hartkodiert — Nutzer koennen ihn konfigurieren.
   // Das Template beschriftet die Zeile statisch mit "km x 0,05 €", daher bei
   // abweichendem Satz die Beschriftung mitziehen.
   if (Math.abs(satz - MITNAHME_SATZ) > 1e-9) {
     mitnahmeWorksheet.getCell('F42').value = `km x ${satz.toFixed(2).replace('.', ',')} € =`;
   }
   mitnahmeWorksheet.getCell('G42').value = Math.round(gesamtKm * satz * 100) / 100;
 }

 return workbook;
}

/**
 * Baut die Mitfahrer-Mappen. Ab 30 Zeilen entstehen mehrere Formulare —
 * wie bei den normalen Abrechnungen auch.
 */
async function baueMitfahrerWorkbooks({ jahr, zeitraumHeader, userProfile, mitfahrerData, satz }) {
 const chunks = chunkFormattedData(mitfahrerData);
 return Promise.all(
   chunks.map((chunk) =>
     baueMitfahrerWorkbook({ jahr, zeitraumHeader, userProfile, mitfahrerData: chunk, satz })
   )
 );
}

async function baueQuartalWorkbooks({ chunkedData, jahr, quartalSheetName, zeitraumHeader, traegerName, kostenstelle, userProfile, satz, saetze }) {
 return Promise.all(chunkedData.map(async (chunk) => {
   const workbook = await ladeTemplate();

   const vorlageWorksheet = workbook.getWorksheet('Vorlage');
   if (vorlageWorksheet) {
     fillVorlageSheet(vorlageWorksheet, jahr, traegerName, kostenstelle, userProfile);
   }

   // Remove unused quartal sheets, keep only the relevant one
   removeUnusedQuartalSheets(workbook, quartalSheetName);

   const quartalWorksheet = workbook.getWorksheet(quartalSheetName);
   if (quartalWorksheet) {
     quartalWorksheet.getCell('D2').value = zeitraumHeader;
     fillQuartalHeader(quartalWorksheet, jahr, traegerName, kostenstelle, userProfile);
     fillQuartalSheet(quartalWorksheet, chunk, jahr, satz, saetze);
   }

   return workbook;
 }));
}

/**
 * Baut die Arbeitsmappen für einen Monatsexport.
 * Liefert entweder { notFound: true } oder { dateien: [{ dateiname, workbook }], zipName }.
 * Der Dateiname ist ohne Endung — Excel- und PDF-Export hängen ihre eigene an.
 */
async function baueMonatsWorkbooks({ year, month, type, userId }) {
 const correctedMonth = month.split('-')[1] || month;

 const fahrten = await Fahrt.getMonthlyReport(year, correctedMonth, userId);
 const userProfile = await getUserProfile(userId);

 if (type === 'mitfahrer') {
   const mitfahrerData = prepareMitfahrerData(fahrten);

   // Wie beim normalen Export: ohne Daten kein leeres Formular mit 0 km
   if (mitfahrerData.length === 0) {
     return { notFound: true };
   }

   const satz = await getMitnahmeSatz(userId);
   const workbooks = await baueMitfahrerWorkbooks({
     jahr: year,
     zeitraumHeader: `${getMonthName(parseInt(correctedMonth))} ${year}`,
     userProfile,
     mitfahrerData,
     satz
   });

   const basis = `mitfahrer_${year}_${correctedMonth}`;
   return {
     dateien: workbooks.map((workbook, i) => ({
       dateiname: workbooks.length > 1 ? `${basis}_teil${i + 1}` : basis,
       workbook
     })),
     zipName: basis
   };
 }

 const formattedData = prepareFormattedData(fahrten, type);

 if (formattedData.length === 0) {
   return { notFound: true };
 }

 const chunkedData = chunkFormattedData(formattedData);
 const quartalSheetName = getQuartalSheet(correctedMonth);

 const [abrechnungstraeger] = await db.execute(
   'SELECT name, kostenstelle FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
   [type, userId]
 );
 const traegerName = abrechnungstraeger[0]?.name || '';
 const kostenstelle = abrechnungstraeger[0]?.kostenstelle;

 // Erstattungssatz zum Stichtag (letzter Tag des Exportmonats) aus der DB
 const stichtag = new Date(parseInt(year), parseInt(correctedMonth), 0);
 const satz = await getErstattungssatzFuerTraeger(type, userId, stichtag);
 const saetze = await ladeSaetzeFuerTraeger(type, userId);

 const workbooks = await baueQuartalWorkbooks({
   chunkedData,
   jahr: year,
   quartalSheetName,
   zeitraumHeader: getMonthName(parseInt(correctedMonth)),
   traegerName,
   kostenstelle,
   userProfile,
   satz,
   saetze
 });

 return {
   dateien: workbooks.map((workbook, index) => ({
     dateiname: `fahrtenabrechnung_${type}_${year}_${correctedMonth}_${index + 1}`,
     workbook
   })),
   zipName: `fahrtenabrechnung_${type}_${year}_${correctedMonth}`
 };
}

/**
 * Baut die Arbeitsmappen für einen Zeitraumexport.
 * Setzt zusätzlich den Abrechnungsstatus jedes Monats im Zeitraum auf
 * "eingereicht" — dieses Verhalten stammt aus dem bisherigen Excel-Export.
 */
async function baueZeitraumWorkbooks({ startYear, startMonth, endYear, endMonth, type, userId }) {
 const fahrten = await Fahrt.getDateRangeReport(startYear, startMonth, endYear, endMonth, userId);
 const userProfile = await getUserProfile(userId);

 // Determine header time range
 const isSingleMonth = startYear === endYear && startMonth === endMonth;
 const zeitraumHeader = isSingleMonth
   ? getMonthName(parseInt(startMonth))
   : `${String(startMonth).padStart(2, '0')}/${startYear} - ${String(endMonth).padStart(2, '0')}/${endYear}`;

 if (type === 'mitfahrer') {
   const mitfahrerData = prepareMitfahrerData(fahrten);

   // Ohne Daten kein leeres Formular - und vor allem kein Statuswechsel auf
   // "eingereicht" fuer Monate, in denen gar nichts abzurechnen war.
   if (mitfahrerData.length === 0) {
     return { notFound: true };
   }

   const satz = await getMitnahmeSatz(userId);
   const workbooks = await baueMitfahrerWorkbooks({
     jahr: startYear,
     zeitraumHeader,
     userProfile,
     mitfahrerData,
     satz
   });

   await setzeZeitraumStatus({ startYear, startMonth, endYear, endMonth, type, userId });

   const basis = `mitfahrer_${startYear}_${startMonth}_bis_${endYear}_${endMonth}`;
   return {
     dateien: workbooks.map((workbook, i) => ({
       dateiname: workbooks.length > 1 ? `${basis}_teil${i + 1}` : basis,
       workbook
     })),
     zipName: `mitfahrer_${startYear}_${startMonth}_bis_${endYear}_${endMonth}`
   };
 }

 const formattedData = prepareFormattedData(fahrten, type);

 if (formattedData.length === 0) {
   return { notFound: true };
 }

 const chunkedData = chunkFormattedData(formattedData);
 // Das Formular kennt nur feste Quartalsblaetter. Bei einem Zeitraum ueber
 // Quartalsgrenzen passt keins exakt — die Kopfzeile D2 nennt aber den echten
 // Zeitraum, deshalb bleibt das Startquartal als Traegerblatt.
 const quartalSheetName = getQuartalSheet(startMonth);

 const [abrechnungstraeger] = await db.execute(
   'SELECT name, kostenstelle FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
   [type, userId]
 );
 const traegerName = abrechnungstraeger[0]?.name || '';
 const kostenstelle = abrechnungstraeger[0]?.kostenstelle;

 // Erstattungssatz zum Stichtag (letzter Tag des Endmonats) aus der DB
 const stichtag = new Date(parseInt(endYear), parseInt(endMonth), 0);
 const satz = await getErstattungssatzFuerTraeger(type, userId, stichtag);
 const saetze = await ladeSaetzeFuerTraeger(type, userId);

 const workbooks = await baueQuartalWorkbooks({
   chunkedData,
   jahr: startYear,
   quartalSheetName,
   zeitraumHeader,
   traegerName,
   kostenstelle,
   userProfile,
   satz,
   saetze
 });

 await setzeZeitraumStatus({ startYear, startMonth, endYear, endMonth, type, userId });

 return {
   dateien: workbooks.map((workbook, index) => ({
     dateiname: `fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}_${index + 1}`,
     workbook
   })),
   zipName: `fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}`
 };
}

// Status-Update für jeden Monat im Zeitraum
async function setzeZeitraumStatus({ startYear, startMonth, endYear, endMonth, type, userId }) {
 let y = parseInt(startYear), m = parseInt(startMonth);
 const ey = parseInt(endYear), em = parseInt(endMonth);
 while (y < ey || (y === ey && m <= em)) {
   await Abrechnung.updateStatus(userId, y, m, type, 'eingereicht', new Date().toISOString().slice(0, 10));
   m++;
   if (m > 12) { m = 1; y++; }
 }
}

// -- HTTP-Handler (Excel) --

async function sendeExcelAntwort(res, ergebnis) {
 const files = await Promise.all(ergebnis.dateien.map(async ({ dateiname, workbook }) => ({
   fileName: `${dateiname}.xlsx`,
   buffer: await workbook.xlsx.writeBuffer()
 })));

 if (files.length === 1) {
   res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
   res.setHeader('Content-Disposition', `attachment; filename=${files[0].fileName}`);
   return res.send(files[0].buffer);
 }

 const zip = new JSZip();
 files.forEach(file => {
   zip.file(file.fileName, file.buffer);
 });

 const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

 res.setHeader('Content-Type', 'application/zip');
 res.setHeader('Content-Disposition', `attachment; filename=${ergebnis.zipName}.zip`);
 res.send(zipBuffer);
}

exports.exportToExcel = async (req, res) => {
 try {
   const { year, month, type } = req.params;
   const ergebnis = await baueMonatsWorkbooks({ year, month, type, userId: req.user.id });

   if (ergebnis.notFound) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }

   return await sendeExcelAntwort(res, ergebnis);
 } catch (error) {
   console.error('Fehler beim Exportieren nach Excel:', error);
   res.status(500).json({ message: 'Fehler beim Exportieren nach Excel', error: error.message });
 }
};

exports.exportToExcelRange = async (req, res) => {
 try {
   const { startYear, startMonth, endYear, endMonth, type } = req.params;
   const ergebnis = await baueZeitraumWorkbooks({
     startYear, startMonth, endYear, endMonth, type, userId: req.user.id
   });

   if (ergebnis.notFound) {
     return res.status(404).json({ message: 'Keine Daten für den ausgewählten Zeitraum und Typ gefunden.' });
   }

   return await sendeExcelAntwort(res, ergebnis);
 } catch (error) {
   console.error('Fehler beim Exportieren nach Excel (Range):', error);
   res.status(500).json({ message: 'Fehler beim Exportieren nach Excel', error: error.message });
 }
};

// Für den PDF-Export (utils/pdfExport.js)
exports.baueMonatsWorkbooks = baueMonatsWorkbooks;
exports.baueZeitraumWorkbooks = baueZeitraumWorkbooks;
