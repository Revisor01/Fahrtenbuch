const ExcelJS = require('exceljs');
const { heuteISO } = require('./datum');
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

// Zeilenhöhe verbundener Zellen selbst setzen; in H:J passen 41 Zeichen Arial bzw. 48 DejaVu Sans (27.10.2026).
const TEXTSPALTEN = [['B', 'E'], ['F', 'G'], ['H', 'J']];
const ZEICHEN_JE_BREITE = 1.0;
const ZEILENHOEHE = 13;

// Lieber eine Zeile zu viel.
function benoetigteZeilen(text, breite) {
 const proZeile = Math.max(1, Math.floor(breite * ZEICHEN_JE_BREITE));
 let zeilen = 1;
 let belegt = 0;
 String(text ?? '').split(/\s+/).filter(Boolean).forEach((wort) => {
   const laenge = belegt ? belegt + 1 + wort.length : wort.length;
   if (laenge <= proZeile) {
     belegt = laenge;
     return;
   }
   if (belegt) zeilen += 1;
   zeilen += Math.ceil(wort.length / proZeile) - 1;
   belegt = wort.length % proZeile || proZeile;
 });
 return zeilen;
}

function passeZeilenhoeheAn(worksheet, excelRow) {
 const zeilen = Math.max(...TEXTSPALTEN.map(([von, bis]) => {
   let breite = 0;
   for (let c = worksheet.getColumn(von).number; c <= worksheet.getColumn(bis).number; c++) {
     breite += worksheet.getColumn(c).width || 0;
   }
   return benoetigteZeilen(excelRow.getCell(von).value, breite);
 }));
 const hoehe = zeilen * ZEILENHOEHE;
 if (zeilen > 1 && hoehe > (excelRow.height || 0)) excelRow.height = hoehe;
}

// Fest 0,05 €/km laut Formular (F42).
const MITNAHME_SATZ = 0.05;

// Je Fahrt genau eine Zeile.
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

// Kopffelder mit echten Werten, weil LibreOffice die Querverweise ohne Cache als 0 zeigt.
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

 // Ab Zeile 8, höchstens 29, nur Werte, die Stile stehen in der Vorlage.
 data.forEach((row, rowIndex) => {
   if (rowIndex >= MAX_ROWS_PER_SHEET) return;
   const excelRow = worksheet.getRow(rowIndex + 8);

   excelRow.getCell('A').value = row.datum;
   excelRow.getCell('A').numFmt = 'DD.MM.YYYY';
   excelRow.getCell('B').value = row.vonOrt;
   excelRow.getCell('F').value = row.nachOrt;
   excelRow.getCell('H').value = row.anlass;
   excelRow.getCell('K').value = row.kilometer;
   passeZeilenhoeheAn(worksheet, excelRow);
 });

 // Gesamt km in K37
 const gesamtKm = data.reduce((sum, row) => sum + (typeof row.kilometer === 'number' ? row.kilometer : 0), 0);
 worksheet.getCell('K37').value = gesamtKm;

 // Ausstellungsdatum (Template: Formel TODAY() ohne Cache-Wert)
 worksheet.getCell('B40').value = new Date();
 worksheet.getCell('B40').numFmt = 'DD.MM.YYYY';

 // Zeile 40 mit dem Satz je Fahrtdatum, die Vorlage enthält statisch 0,30 €.
 const { betrag, gemischt, effektivSatz } = berechneErstattung(data, saetze);

 worksheet.getCell('H40').value = gesamtKm;
 // Bei Satzwechsel macht der Mischsatz den Betrag nachvollziehbar.
 worksheet.getCell('I40').value = gemischt
   ? `km, Mischsatz ${effektivSatz.toFixed(4).replace('.', ',')} € =`
   : `km x ${satz.toFixed(2).replace('.', ',')} € =`;
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
 // Ein Eintrag füllt die Spalte seiner Fahrt; nur ohne Paar füllt 'hin_rueck' beide, sonst zahlte der Kirchenkreis doppelt.
 const mitfahrerData = fahrten.map(fahrt => {
   if (fahrt.mitfahrer_id) {
     const hin = `${fahrt.von_ort_name}-${fahrt.nach_ort_name}`;
     const zurueck = `${fahrt.nach_ort_name}-${fahrt.von_ort_name}`;
     const imPaar = !!fahrt.partner_fahrt_id;

     let hinweg = '';
     let rueckweg = '';
     if (fahrt.richtung === 'hin') {
       hinweg = hin;
     } else if (fahrt.richtung === 'rueck') {
       rueckweg = zurueck;
     } else if (fahrt.richtung === 'hin_rueck') {
       if (imPaar) {
         // Die Gegenfahrt füllt die andere Spalte, die kleinere ID ist die Hinfahrt.
         const istHinfahrt = (fahrt.id ?? fahrt.fahrt_id) < fahrt.partner_fahrt_id;
         if (istHinfahrt) {
           hinweg = hin;
         } else {
           rueckweg = hin;
         }
       } else {
         hinweg = hin;
         rueckweg = zurueck;
       }
     }

     return {
       // fahrt_id/mitfahrer_id nur zum Entduplizieren, nicht fuers Formular
       _fahrtId: fahrt.id ?? fahrt.fahrt_id,
       _mitfahrerId: fahrt.mitfahrer_id,
       // Rohdatum zum Vergleichen, `datum` ist schon formatiert.
       _datum: fahrt.datum,
       datum: formatDate(fahrt.datum),
       anlass: fahrt.anlass,
       name: fahrt.mitfahrer_name,
       arbeitsstaette: fahrt.arbeitsstaette,
       hinweg,
       rueckweg,
       kilometer: Math.round(parseFloat(fahrt.kilometer))
     };
   }
   return null;
 }).filter(Boolean);

 // Nur echte Duplikate, dieselbe Person auf derselben Fahrt.
 const gesehen = new Set();
 return mitfahrerData.filter((m) => {
   const schluessel = `${m._fahrtId}|${m._mitfahrerId}`;
   if (gesehen.has(schluessel)) return false;
   gesehen.add(schluessel);
   return true;
 });
}

/** Alle Mitnahmesätze, jüngster zuerst, damit je Fahrtdatum gerechnet wird. */
async function ladeMitnahmeSaetze(userId) {
 try {
   const [rows] = await db.execute(
     'SELECT betrag, gueltig_ab FROM mitfahrer_erstattung WHERE user_id = ? ORDER BY gueltig_ab DESC',
     [userId]
   );
   return rows;
 } catch (error) {
   console.error('Mitnahmesaetze konnten nicht geladen werden, nutze Standard:', error);
   return [];
 }
}

/** Satz an einem Fahrtdatum, sonst der älteste, wie in erstattung.js. */
function mitnahmeSatzAmDatum(saetze, datum) {
 if (!saetze || saetze.length === 0) return MITNAHME_SATZ;
 const d = new Date(datum);
 const treffer = saetze.find((s) => new Date(s.gueltig_ab) <= d) || saetze[saetze.length - 1];
 const betrag = parseFloat(treffer?.betrag);
 return Number.isFinite(betrag) ? betrag : MITNAHME_SATZ;
}

/** Mitnahmeentschädigung je Zeile mit ihrem Satz; meldet, ob mehrere Sätze griffen. */
function berechneMitnahme(mitfahrerData, saetze) {
 let summe = 0;
 let kmGesamt = 0;
 const verwendet = new Set();

 for (const m of mitfahrerData) {
   const km = typeof m.kilometer === 'number' ? m.kilometer : parseFloat(m.kilometer);
   if (!Number.isFinite(km)) continue;
   const satz = mitnahmeSatzAmDatum(saetze, m._datum);
   verwendet.add(satz);
   summe += km * satz;
   kmGesamt += km;
 }

 const betrag = Math.round(summe * 100) / 100;
 const liste = [...verwendet];
 return {
   betrag,
   kmGesamt,
   gemischt: liste.length > 1,
   // Mischsatz, damit "km x Satz = Betrag" im Formular aufgeht
   effektivSatz: kmGesamt > 0 ? betrag / kmGesamt : (liste[0] ?? MITNAHME_SATZ),
 };
}

function chunkFormattedData(formattedData) {
 const chunkedData = [];
 for (let i = 0; i < formattedData.length; i += MAX_ROWS_PER_SHEET) {
   chunkedData.push(formattedData.slice(i, i + MAX_ROWS_PER_SHEET));
 }
 return chunkedData;
}

async function baueMitfahrerWorkbook({ jahr, zeitraumHeader, userProfile, mitfahrerData, saetze = [] }) {
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

   // Querverweise durch echte Werte ersetzen (E2/E4/E6).
   mitnahmeWorksheet.getCell('E2').value = userProfile.full_name;
   mitnahmeWorksheet.getCell('E4').value = userProfile.home_address;
   mitnahmeWorksheet.getCell('E6').value = formatIBAN(userProfile.iban);
   mitnahmeWorksheet.getCell('B4').value = 'Mitfahrer:innen';

   // Der Aufrufer teilt schon auf MAX_ROWS_PER_SHEET auf.
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

   // Jede Zeile mit dem Satz ihres Datums.
   const { betrag, kmGesamt, gemischt, effektivSatz } = berechneMitnahme(mitfahrerData, saetze);
   mitnahmeWorksheet.getCell('G39').value = kmGesamt;
   mitnahmeWorksheet.getCell('B42').value = new Date();
   mitnahmeWorksheet.getCell('B42').numFmt = 'DD.MM.YYYY';
   mitnahmeWorksheet.getCell('E42').value = kmGesamt;
   // Weicht der Satz von 0,05 € ab, zieht die Beschriftung mit, bei mehreren mit Mischsatz.
   if (gemischt) {
     mitnahmeWorksheet.getCell('F42').value =
       `km x ${effektivSatz.toFixed(4).replace('.', ',')} € (gemischte Saetze) =`;
   } else if (Math.abs(effektivSatz - MITNAHME_SATZ) > 1e-9) {
     mitnahmeWorksheet.getCell('F42').value = `km x ${effektivSatz.toFixed(2).replace('.', ',')} € =`;
   }
   mitnahmeWorksheet.getCell('G42').value = betrag;
 }

 return workbook;
}

/** Mitfahrer-Mappen, ab 30 Zeilen mehrere Formulare. */
async function baueMitfahrerWorkbooks({ jahr, zeitraumHeader, userProfile, mitfahrerData, saetze }) {
 const chunks = chunkFormattedData(mitfahrerData);
 return Promise.all(
   chunks.map((chunk) =>
     baueMitfahrerWorkbook({ jahr, zeitraumHeader, userProfile, mitfahrerData: chunk, saetze })
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

/** Arbeitsmappen eines Monatsexports: { notFound: true } oder { dateien: [{ dateiname, workbook }], zipName }, Dateinamen ohne Endung. */
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

   const saetze = await ladeMitnahmeSaetze(userId);
   const workbooks = await baueMitfahrerWorkbooks({
     jahr: year,
     zeitraumHeader: `${getMonthName(parseInt(correctedMonth))} ${year}`,
     userProfile,
     mitfahrerData,
     saetze
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

/** Arbeitsmappen eines Zeitraumexports. */
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

   // Ohne Daten weder Formular noch Statuswechsel.
   if (mitfahrerData.length === 0) {
     return { notFound: true };
   }

   const saetze = await ladeMitnahmeSaetze(userId);
   const workbooks = await baueMitfahrerWorkbooks({
     jahr: startYear,
     zeitraumHeader,
     userProfile,
     mitfahrerData,
     saetze
   });

   const basis = `mitfahrer_${startYear}_${startMonth}_bis_${endYear}_${endMonth}`;
   return {
     dateien: workbooks.map((workbook, i) => ({
       dateiname: workbooks.length > 1 ? `${basis}_teil${i + 1}` : basis,
       workbook
     })),
     zipName: `mitfahrer_${startYear}_${startMonth}_bis_${endYear}_${endMonth}`,
     // Status erst, wenn die Datei beim Nutzer ist.
     zeitraumStatus: { startYear, startMonth, endYear, endMonth, type, userId }
   };
 }

 const formattedData = prepareFormattedData(fahrten, type);

 if (formattedData.length === 0) {
   return { notFound: true };
 }

 const chunkedData = chunkFormattedData(formattedData);
 // Über Quartalsgrenzen bleibt das Startquartal, D2 nennt den echten Zeitraum.
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

 return {
   dateien: workbooks.map((workbook, index) => ({
     dateiname: `fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}_${index + 1}`,
     workbook
   })),
   zipName: `fahrtenabrechnung_${type}_${startYear}_${startMonth}_bis_${endYear}_${endMonth}`,
   zeitraumStatus: { startYear, startMonth, endYear, endMonth, type, userId }
 };
}

// Zeitraum als eingereicht markieren, erst nach dem Senden und in einer Transaktion; scheitert es, setzt der Nutzer den Status selbst.
async function markiereZeitraum(zeitraumStatus) {
 if (!zeitraumStatus) return;
 const { startYear, startMonth, endYear, endMonth, type, userId } = zeitraumStatus;
 try {
   await Abrechnung.markiereZeitraumEingereicht({
     userId, startYear, startMonth, endYear, endMonth, typ: type, datum: heuteISO()
   });
 } catch (error) {
   console.error('Zeitraum konnte nicht als eingereicht markiert werden:', error);
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
   res.status(500).json({ message: 'Fehler beim Exportieren nach Excel' });
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

   await sendeExcelAntwort(res, ergebnis);
   // Erst jetzt, die Datei ist raus.
   await markiereZeitraum(ergebnis.zeitraumStatus);
   return;
 } catch (error) {
   console.error('Fehler beim Exportieren nach Excel (Range):', error);
   res.status(500).json({ message: 'Fehler beim Exportieren nach Excel' });
 }
};

// Für den PDF-Export (utils/pdfExport.js)
exports.baueMonatsWorkbooks = baueMonatsWorkbooks;
exports.baueZeitraumWorkbooks = baueZeitraumWorkbooks;
exports.markiereZeitraum = markiereZeitraum;
exports.fillQuartalSheet = fillQuartalSheet;
exports.benoetigteZeilen = benoetigteZeilen;
