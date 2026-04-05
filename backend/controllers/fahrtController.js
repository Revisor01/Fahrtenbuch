const Fahrt = require('../models/Fahrt');
const Mitfahrer = require('../models/Mitfahrer');
const Abrechnung = require('../models/Abrechnung');
const { getDistance } = require('../utils/distanceCalculator');
const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const { exportToExcel, exportToExcelRange } = require('../utils/excelExport');
const { exportToPdf, exportToPdfRange } = require('../utils/pdfExport');
const db = require('../config/database');

exports.exportToExcel = exportToExcel;
exports.exportToExcelRange = exportToExcelRange;
exports.exportToPdf = exportToPdf;
exports.exportToPdfRange = exportToPdfRange;

exports.createFahrt = async (req, res) => {
  try {
    const { 
      vonOrtId, 
      nachOrtId, 
      datum, 
      anlass, 
      kilometer, 
      abrechnung,
      einmaligerVonOrt,
      einmaligerNachOrt,
      mitfahrer
    } = req.body;
    const userId = req.user.id;
    
    // Check abrechnung
    const [abrechnungCheck] = await db.execute('SELECT id FROM abrechnungstraeger WHERE id = ? AND user_id = ?', [abrechnung, userId]);
    
    if (!abrechnungCheck || abrechnungCheck.length === 0) {
      return res.status(400).json({ message: 'Abrechnungsträger nicht gefunden' });
    }
    
    let calculatedKilometer = kilometer;
    
    // Kilometer automatisch berechnen, falls vonOrtId und nachOrtId vorhanden sind
    if (!kilometer && vonOrtId && nachOrtId) {
      calculatedKilometer = await getDistance(vonOrtId, nachOrtId, userId);
    }
    
    const fahrtData = {
      datum,
      anlass,
      kilometer: calculatedKilometer, //Nutze berechneten Kilometerwert
      abrechnung,
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null,
      userId
    };
    
    const id = await Fahrt.create(fahrtData, null, userId);
    if (mitfahrer && mitfahrer.length > 0) {
      for (const person of mitfahrer) {
        await Mitfahrer.create(id, person.name, person.arbeitsstaette, person.richtung);
      }
    }
    
    res.status(201).json({ id, message: 'Fahrt erfolgreich erstellt' });
  } catch (error) {
    console.error('Fehler beim Erstellen der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Fahrt' });
  }
};

exports.updateFahrt = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      vonOrtId, 
      nachOrtId, 
      einmaligerVonOrt,
      einmaligerNachOrt,
      anlass, 
      kilometer,
      abrechnung, 
      datum,
      mitfahrer
    } = req.body;
    const userId = req.user.id;
    
    // Check abrechnung
    const [abrechnungCheck] = await db.execute(
      'SELECT id FROM abrechnungstraeger WHERE id = ? AND user_id = ?', 
      [abrechnung, userId]
    );
    
    if (!abrechnungCheck || abrechnungCheck.length === 0) {
      return res.status(400).json({ message: 'Abrechnungsträger nicht gefunden' });
    }
    
    const updateData = {
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null,
      anlass: anlass || null,
      kilometer: kilometer.toString(), // Wichtige Änderung
      abrechnung: abrechnung || null,
      datum: datum || null
    };
    
    const updated = await Fahrt.update(id, updateData, userId);
    
    if (updated) {
      if (mitfahrer?.length > 0) {
        await Mitfahrer.updateMitfahrerForFahrt(id, mitfahrer);
      }
      res.status(200).json({ message: 'Fahrt erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Fahrt' });
  }
};

exports.getAllFahrten = async (req, res) => {
  try {
    const userId = req.user.id;
    const fahrten = await Fahrt.findAll(userId);
    res.status(200).json(fahrten);
  } catch (error) {
    console.error('Fehler beim Abrufen der Fahrten:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Fahrten' });
  }
};

exports.getFahrtById = async (req, res) => {
  try {
    const userId = req.user.id;
    const fahrt = await Fahrt.findById(req.params.id, userId);
    if (fahrt) {
      const mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
      res.status(200).json({ ...fahrt, mitfahrer });
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Fahrt' });
  }
};

exports.deleteFahrt = async (req, res) => {
  try {
    const userId = req.user.id;
    const deleted = await Fahrt.delete(req.params.id, userId);
    if (deleted) {
      res.status(200).json({ message: 'Fahrt erfolgreich gelöscht' });
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Löschen der Fahrt' });
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    const year = parseInt(req.params.year) || null;
    const month = parseInt(req.params.month) || null;
    const userId = req.user.id;
    
    // Hole zuerst die Fahrten
    const [fahrten, abrechnungsStatus] = await Promise.all([
      Fahrt.getMonthlyReport(year, month, userId),
      Abrechnung.getStatus(userId, year, month)
    ]);
    
    // Füge Mitfahrer-Daten hinzu
    for (let fahrt of fahrten) {
      fahrt.mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
    }
    
    const [erstattungssaetze] = await db.execute(`
  SELECT 
    at.id,
    eb.betrag,
    eb.gueltig_ab
  FROM abrechnungstraeger at
  INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
  WHERE at.user_id = ? 
    AND at.active = true
  UNION
  SELECT 
    'mitfahrer' as id,
    betrag,
    gueltig_ab 
  FROM mitfahrer_erstattung
  WHERE user_id = ?
  ORDER BY gueltig_ab DESC
`, [userId, userId]);
    // Gruppiere Erstattungssätze nach ID
    const saetzeProTraeger = {};
    erstattungssaetze.forEach(satz => {
      if (!saetzeProTraeger[satz.id]) {
        saetzeProTraeger[satz.id] = [];
      }
      saetzeProTraeger[satz.id].push(satz);
    });
    
    // Finde den korrekten Erstattungssatz für ein bestimmtes Datum
    const getErstattungssatz = (id, datum) => {
      if (!saetzeProTraeger[id]) return 0;
      
      const saetze = saetzeProTraeger[id];
      let passenderSatz = saetze.find(satz =>
        new Date(satz.gueltig_ab) <= new Date(datum)
      );
      
      if (!passenderSatz && saetze.length > 0) {
        passenderSatz = saetze[saetze.length - 1];
      }
      
      return passenderSatz ? passenderSatz.betrag : 0;
    };
    
    // Erstelle die Zusammenfassung
    const erstattungen = {};
    
    const report = fahrten.map((fahrt) => {
      // Finde den passenden Erstattungssatz für das Fahrtdatum
      const erstattungssatz = getErstattungssatz(fahrt.abrechnung, fahrt.datum);
      const erstattung = fahrt.kilometer * erstattungssatz;
      
      // Summiere die Erstattung für diesen Träger
      if (!erstattungen[fahrt.abrechnung]) {
        erstattungen[fahrt.abrechnung] = 0;
      }
      erstattungen[fahrt.abrechnung] += erstattung;
      
      // Berechne Mitfahrer-Erstattung
      if (fahrt.mitfahrer?.length > 0) {
        const mitfahrerSatz = getErstattungssatz('mitfahrer', fahrt.datum);
        const mitfahrerErstattung = fahrt.mitfahrer.length * mitfahrerSatz * fahrt.kilometer;
        if (!erstattungen.mitfahrer) {
          erstattungen.mitfahrer = 0;
        }
        erstattungen.mitfahrer += mitfahrerErstattung;
      }
      
      return {
        ...fahrt,
        vonOrtName: fahrt.von_ort_name || fahrt.einmaliger_von_ort,
        nachOrtName: fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
        erstattungssatz,
        erstattung
      };
    });
    
    res.status(200).json({
      fahrten: report,
      summary: {
        erstattungen,
        gesamtErstattung: Object.values(erstattungen).reduce((a, b) => a + b, 0),
        abrechnungsStatus
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Monatsberichts:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Monatsberichts' });
  }
};

exports.getReportRange = async (req, res) => {
  try {
    const startYear = parseInt(req.params.startYear);
    const startMonth = parseInt(req.params.startMonth);
    const endYear = parseInt(req.params.endYear);
    const endMonth = parseInt(req.params.endMonth);
    const userId = req.user.id;

    // Hole Fahrten über den gesamten Zeitraum
    const fahrten = await Fahrt.getDateRangeReport(startYear, startMonth, endYear, endMonth, userId);

    // Sammle abrechnungsStatus für jeden Monat im Zeitraum
    // Bei Zeiträumen: nur Status anzeigen wenn ALLE Monate denselben Status haben
    // Sonst: Status entfernen (= nicht eingereicht), damit kein falscher Status angezeigt wird
    const abrechnungsStatus = {};
    const statusPerMonth = [];
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const status = await Abrechnung.getStatus(userId, y, m);
      if (status && typeof status === 'object') {
        statusPerMonth.push(status);
      } else {
        statusPerMonth.push({});
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }

    // Für Einzelmonat: direkt übernehmen
    if (statusPerMonth.length === 1) {
      Object.assign(abrechnungsStatus, statusPerMonth[0]);
    } else {
      // Für Zeiträume: pro Träger nur Status übernehmen wenn ALLE Monate konsistent sind
      const allTraegerIds = new Set();
      statusPerMonth.forEach(s => Object.keys(s).forEach(k => allTraegerIds.add(k)));

      for (const traegerId of allTraegerIds) {
        const statuses = statusPerMonth.map(s => s[traegerId]);
        const allEingereicht = statuses.every(s => s?.eingereicht_am);
        const allErhalten = statuses.every(s => s?.erhalten_am);

        if (allErhalten) {
          // Alle Monate erhalten — frühestes Datum anzeigen
          abrechnungsStatus[traegerId] = statuses.reduce((earliest, s) =>
            !earliest || new Date(s.erhalten_am) < new Date(earliest.erhalten_am) ? s : earliest
          );
        } else if (allEingereicht) {
          // Alle Monate eingereicht — frühestes Datum anzeigen
          abrechnungsStatus[traegerId] = statuses.reduce((earliest, s) =>
            !earliest || new Date(s.eingereicht_am) < new Date(earliest.eingereicht_am) ? s : earliest
          );
        }
        // Sonst: kein Status = "Nicht eingereicht" (korrekt, weil nicht alle Monate gleich)
      }
    }

    // Füge Mitfahrer-Daten hinzu
    for (let fahrt of fahrten) {
      fahrt.mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
    }

    // Hole Erstattungssätze
    const [erstattungssaetze] = await db.execute(`
  SELECT
    at.id,
    eb.betrag,
    eb.gueltig_ab
  FROM abrechnungstraeger at
  INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
  WHERE at.user_id = ?
    AND at.active = true
  UNION
  SELECT
    'mitfahrer' as id,
    betrag,
    gueltig_ab
  FROM mitfahrer_erstattung
  WHERE user_id = ?
  ORDER BY gueltig_ab DESC
`, [userId, userId]);

    // Gruppiere Erstattungssätze nach ID
    const saetzeProTraeger = {};
    erstattungssaetze.forEach(satz => {
      if (!saetzeProTraeger[satz.id]) {
        saetzeProTraeger[satz.id] = [];
      }
      saetzeProTraeger[satz.id].push(satz);
    });

    // Finde den korrekten Erstattungssatz für ein bestimmtes Datum
    const getErstattungssatz = (id, datum) => {
      if (!saetzeProTraeger[id]) return 0;

      const saetze = saetzeProTraeger[id];
      let passenderSatz = saetze.find(satz =>
        new Date(satz.gueltig_ab) <= new Date(datum)
      );

      if (!passenderSatz && saetze.length > 0) {
        passenderSatz = saetze[saetze.length - 1];
      }

      return passenderSatz ? passenderSatz.betrag : 0;
    };

    // Erstelle die Zusammenfassung
    const erstattungen = {};

    const report = fahrten.map((fahrt) => {
      const erstattungssatz = getErstattungssatz(fahrt.abrechnung, fahrt.datum);
      const erstattung = fahrt.kilometer * erstattungssatz;

      if (!erstattungen[fahrt.abrechnung]) {
        erstattungen[fahrt.abrechnung] = 0;
      }
      erstattungen[fahrt.abrechnung] += erstattung;

      // Berechne Mitfahrer-Erstattung
      if (fahrt.mitfahrer?.length > 0) {
        const mitfahrerSatz = getErstattungssatz('mitfahrer', fahrt.datum);
        const mitfahrerErstattung = fahrt.mitfahrer.length * mitfahrerSatz * fahrt.kilometer;
        if (!erstattungen.mitfahrer) {
          erstattungen.mitfahrer = 0;
        }
        erstattungen.mitfahrer += mitfahrerErstattung;
      }

      return {
        ...fahrt,
        vonOrtName: fahrt.von_ort_name || fahrt.einmaliger_von_ort,
        nachOrtName: fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
        erstattungssatz,
        erstattung
      };
    });

    // Sortiere nach Datum aufsteigend
    report.sort((a, b) => new Date(a.datum) - new Date(b.datum));

    res.status(200).json({
      fahrten: report,
      summary: {
        erstattungen,
        gesamtErstattung: Object.values(erstattungen).reduce((a, b) => a + b, 0),
        abrechnungsStatus
      }
    });
  } catch (error) {
    console.error('Fehler beim Erstellen des Zeitraum-Berichts:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen des Zeitraum-Berichts' });
  }
};

exports.getMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Hole aktive Abrechnungsträger und deren aktuelle Erstattungssätze
    const [rows] = await db.execute(`
  SELECT 
    f.yearMonth,
    f.abrechnung,
    f.kilometer,
    f.mitfahrer_count,
    f.datum,
    at.id,
    eb.betrag
  FROM (
    SELECT 
      DATE_FORMAT(datum, '%Y-%m') as yearMonth,
      abrechnung,
      SUM(kilometer) as kilometer,
      COUNT(DISTINCT m.id) as mitfahrer_count,
      MIN(datum) as datum
    FROM fahrten f
    LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
    WHERE f.user_id = ?
    GROUP BY yearMonth, abrechnung
  ) f
  LEFT JOIN (
    SELECT 'mitfahrer' as id, betrag, gueltig_ab
    FROM mitfahrer_erstattung
    WHERE user_id = ?
    UNION 
    SELECT at.id, eb.betrag, eb.gueltig_ab
    FROM abrechnungstraeger at
    INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
    WHERE at.user_id = ? AND at.active = true
  ) as eb ON eb.gueltig_ab <= f.datum
  WHERE NOT EXISTS (
    SELECT 1 FROM (
      SELECT 'mitfahrer' as id, gueltig_ab
      FROM mitfahrer_erstattung
      WHERE user_id = ?
      UNION
      SELECT at.id, eb.gueltig_ab
      FROM abrechnungstraeger at
      INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id 
      WHERE at.user_id = ? AND at.active = true
    ) as newer_rates
    WHERE newer_rates.id = eb.id
    AND newer_rates.gueltig_ab > eb.gueltig_ab
    AND newer_rates.gueltig_ab <= f.datum
  )
  ORDER BY yearMonth DESC
`, [userId, userId, userId, userId, userId]);
    
    if (!rows.length) {
      return res.status(404).json({ message: 'Keine Daten für die monatliche Zusammenfassung gefunden' });
    }

    // Mitfahrer-Erstattungssätze aus DB laden
    const [mitfahrerSaetze] = await db.execute(
      'SELECT betrag, gueltig_ab FROM mitfahrer_erstattung WHERE user_id = ? ORDER BY gueltig_ab DESC',
      [userId]
    );

    const getMitfahrerSatz = (datum) => {
      const passend = mitfahrerSaetze.find(s => new Date(s.gueltig_ab) <= new Date(datum));
      if (!passend && mitfahrerSaetze.length > 0) return mitfahrerSaetze[mitfahrerSaetze.length - 1].betrag;
      return passend ? passend.betrag : 0;
    };

    // Gruppiere nach Monaten
    const summary = rows.reduce((acc, row) => {
      if (!acc[row.yearMonth]) {
        acc[row.yearMonth] = {
          yearMonth: row.yearMonth,
          erstattungen: {}
        };
      }
      
      const erstattung = row.kilometer * row.betrag;
      acc[row.yearMonth].erstattungen[row.abrechnung] = {
        kilometer: row.kilometer,
        erstattung: erstattung
      };
      
      if (row.mitfahrer_count > 0) {
        const mitfahrerErstattung = row.mitfahrer_count * getMitfahrerSatz(row.datum) * row.kilometer;
        if (!acc[row.yearMonth].erstattungen.mitfahrer) {
          acc[row.yearMonth].erstattungen.mitfahrer = {
            kilometer: 0,
            erstattung: 0
          };
        }
        acc[row.yearMonth].erstattungen.mitfahrer.kilometer += row.kilometer;
        acc[row.yearMonth].erstattungen.mitfahrer.erstattung += mitfahrerErstattung;
      }
      
      return acc;
    }, {});
    
    res.status(200).json(Object.values(summary));
  } catch (error) {
    console.error('Fehler beim Abrufen der monatlichen Zusammenfassung:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der monatlichen Zusammenfassung' });
  }
};

exports.addMitfahrer = async (req, res) => {
  try {
    const { fahrtId } = req.params;
    const { name, arbeitsstaette, richtung } = req.body;
    const mitfahrerId = await Mitfahrer.create(fahrtId, name, arbeitsstaette, richtung);
    res.status(201).json({ id: mitfahrerId, message: 'Mitfahrer erfolgreich hinzugefügt' });
  } catch (error) {
    console.error('Fehler beim Hinzufügen des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Hinzufügen des Mitfahrers' });
  }
};

exports.updateMitfahrer = async (req, res) => {
  try {
    const { fahrtId, mitfahrerId } = req.params;
    const { name, arbeitsstaette, richtung } = req.body;
    const updated = await Mitfahrer.update(mitfahrerId, name, arbeitsstaette, richtung);
    if (updated) {
      res.status(200).json({ message: 'Mitfahrer erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Mitfahrer nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Mitfahrers' });
  }
};

exports.deleteMitfahrer = async (req, res) => {
  try {
    const { fahrtId, mitfahrerId } = req.params;
    const deleted = await Mitfahrer.delete(mitfahrerId);
    if (deleted) {
      res.status(200).json({ message: 'Mitfahrer erfolgreich gelöscht' });
    } else {
      res.status(404).json({ message: 'Mitfahrer nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Mitfahrers' });
  }
};

exports.getYearSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const userId = req.user.id;
    
    // Hole zuerst alle Abrechnungsträger mit ihren Erstattungssätzen
    const [erstattungssaetze] = await db.execute(`
      SELECT 
        at.id,
        eb.betrag,
        eb.gueltig_ab
      FROM abrechnungstraeger at
      INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
      WHERE at.user_id = ? 
        AND at.active = true
        AND eb.gueltig_ab <= LAST_DAY(?)
      ORDER BY eb.gueltig_ab DESC
    `, [userId, `${year}-12-31`]);
    
    // Hole alle Fahrten des Jahres
    const [fahrten] = await db.execute(`
      SELECT 
        f.datum,
        f.kilometer,
        f.abrechnung,
        COUNT(m.id) as mitfahrer_count
      FROM fahrten f
      LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
      WHERE YEAR(f.datum) = ? AND f.user_id = ?
      GROUP BY f.id
    `, [year, userId]);
    
    // Gruppiere Erstattungssätze nach AbrechnungTraegerId
    const saetzeProTraeger = {};
    erstattungssaetze.forEach(satz => {
      if (!saetzeProTraeger[satz.id]) {
        saetzeProTraeger[satz.id] = [];
      }
      saetzeProTraeger[satz.id].push(satz);
    });
    
    // Finde den korrekten Erstattungssatz für ein bestimmtes Datum
    const getErstattungssatz = (abrechnung, datum) => {
      if (!saetzeProTraeger[abrechnung]) return 0;
      
      const saetze = saetzeProTraeger[abrechnung];
      const passenderSatz = saetze.find(satz => 
        new Date(satz.gueltig_ab) <= new Date(datum)
      );
      
      return passenderSatz ? passenderSatz.betrag : 0;
    };
    
    // Berechne die Summen pro Abrechnungsträger
    const summary = fahrten.reduce((acc, fahrt) => {
      // Erstattung für die Fahrt
      const erstattungssatz = getErstattungssatz(fahrt.abrechnung, fahrt.datum);
      const erstattung = fahrt.kilometer * erstattungssatz;
      
      if (!acc[fahrt.abrechnung]) {
        acc[fahrt.abrechnung] = {
          kilometer: 0,
          erstattung: 0
        };
      }
      
      acc[fahrt.abrechnung].kilometer += fahrt.kilometer;
      acc[fahrt.abrechnung].erstattung += erstattung;
      
      // Mitfahrer-Erstattung
      if (fahrt.mitfahrer_count > 0) {
        const mitfahrerSatz = getErstattungssatz('mitfahrer', fahrt.datum);
        const mitfahrerErstattung = fahrt.mitfahrer_count * mitfahrerSatz * fahrt.kilometer;
        
        if (!acc.mitfahrer) {
          acc.mitfahrer = {
            kilometer: 0,
            erstattung: 0
          };
        }
        acc.mitfahrer.erstattung += mitfahrerErstattung;
        acc.mitfahrer.kilometer += fahrt.kilometer;
      }
      
      return acc;
    }, {});
    
    // Berechne Gesamtsumme
    const gesamtErstattung = Object.values(summary).reduce((sum, traeger) => 
      sum + traeger.erstattung, 0
    );
    
    res.status(200).json({
      summary,
      gesamtErstattung,
      year
    });
    
  } catch (error) {
    console.error('Fehler beim Abrufen der Jahreszusammenfassung:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der Jahreszusammenfassung' });
  }
};

exports.updateAbrechnungsStatus = async (req, res) => {
  try {
    const { jahr, monat, typ, aktion, datum } = req.body;
    const userId = req.user.id;
    
    const result = await Abrechnung.updateStatus(userId, jahr, monat, typ, aktion, datum);
    
    res.status(200).json({
      message: `Abrechnungsstatus erfolgreich aktualisiert`,
      result
    });
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Abrechnungsstatus:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Status' });
  }
};

module.exports = exports;
