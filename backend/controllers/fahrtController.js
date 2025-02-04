const Fahrt = require('../models/Fahrt');
const Mitfahrer = require('../models/Mitfahrer');
const Abrechnung = require('../models/Abrechnung');
const { getDistance } = require('../utils/distanceCalculator');
const ExcelJS = require('exceljs');
const path = require('path');
const JSZip = require('jszip');
const { exportToExcel } = require('../utils/excelExport');

exports.exportToExcel = exportToExcel;

exports.createFahrt = async (req, res) => {
  try {
    console.log('Received fahrt data:', req.body);
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
    
    const fahrtData = {
      datum,
      anlass,
      kilometer,
      abrechnung,
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null
    };
    
    console.log('Processed fahrt data:', fahrtData);
    
    const id = await Fahrt.create(fahrtData, null, userId);
    if (mitfahrer && mitfahrer.length > 0) {
      for (const person of mitfahrer) {
        await Mitfahrer.create(id, person.name, person.arbeitsstaette, person.richtung);
      }
    }
    
    res.status(201).json({ id, message: 'Fahrt erfolgreich erstellt' });
  } catch (error) {
    console.error('Fehler beim Erstellen der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Erstellen der Fahrt', error: error.message });
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
    
    const updateData = {
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null,
      anlass: anlass || null,
      kilometer: parseFloat(kilometer),
      abrechnung: abrechnung || null,
      datum: datum || null
    };
    
    const updated = await Fahrt.update(id, updateData, userId);
    if (updated) {
      await Mitfahrer.deleteByFahrtId(id);
      if (mitfahrer && mitfahrer.length > 0) {
        for (const person of mitfahrer) {
          await Mitfahrer.create(id, person.name, person.arbeitsstaette, person.richtung);
        }
      }
      res.status(200).json({ message: 'Fahrt erfolgreich aktualisiert' });
    } else {
      res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Fahrt:', error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren der Fahrt', error: error.message });
  }
};

exports.getAllFahrten = async (req, res) => {
  try {
    const userId = req.user.id;
    const fahrten = await Fahrt.findAll(userId);
    res.status(200).json(fahrten);
  } catch (error) {
    res.status(500).json({ message: 'Fehler beim Abrufen der Fahrten', error: error.message });
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
    res.status(500).json({ message: 'Fehler beim Abrufen der Fahrt', error: error.message });
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
    res.status(500).json({ message: 'Fehler beim Löschen der Fahrt', error: error.message });
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
    
    // Hole die Erstattungssätze für alle Abrechnungsträger im relevanten Zeitraum
    const [erstattungssaetze] = await db.execute(`
      SELECT 
        at.kennzeichen,
        eb.betrag,
        eb.gueltig_ab
      FROM abrechnungstraeger at
      INNER JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
      WHERE at.user_id = ? 
        AND at.active = true
        AND eb.gueltig_ab <= LAST_DAY(?)
      ORDER BY eb.gueltig_ab DESC
    `, [userId, `${year}-${month.toString().padStart(2, '0')}-01`]);
    
    // Gruppiere Erstattungssätze nach Kennzeichen
    const saetzeProTraeger = {};
    erstattungssaetze.forEach(satz => {
      if (!saetzeProTraeger[satz.kennzeichen]) {
        saetzeProTraeger[satz.kennzeichen] = [];
      }
      saetzeProTraeger[satz.kennzeichen].push(satz);
    });
    
    // Finde den korrekten Erstattungssatz für ein bestimmtes Datum
    const getErstattungssatz = (kennzeichen, datum) => {
      if (!saetzeProTraeger[kennzeichen]) return 0;
      
      const saetze = saetzeProTraeger[kennzeichen];
      const passenderSatz = saetze.find(satz => 
        new Date(satz.gueltig_ab) <= new Date(datum)
      );
      
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
    res.status(500).json({ message: 'Fehler beim Erstellen des Monatsberichts', error: error.message });
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
        at.kennzeichen,
        eb.betrag
      FROM (
        SELECT 
          DATE_FORMAT(datum, '%Y-%m') as yearMonth,
          abrechnung,
          SUM(kilometer) as kilometer,
          COUNT(m.id) as mitfahrer_count,
          MIN(datum) as datum
        FROM fahrten f
        LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
        WHERE f.user_id = ?
        GROUP BY yearMonth, abrechnung
      ) f
      LEFT JOIN abrechnungstraeger at ON at.kennzeichen = f.abrechnung
      LEFT JOIN erstattungsbetraege eb ON eb.abrechnungstraeger_id = at.id
      WHERE eb.gueltig_ab <= f.datum
      AND NOT EXISTS (
        SELECT 1 FROM erstattungsbetraege eb2
        WHERE eb2.abrechnungstraeger_id = at.id
        AND eb2.gueltig_ab > eb.gueltig_ab
        AND eb2.gueltig_ab <= f.datum
      )
      ORDER BY yearMonth DESC
    `, [userId]);
    
    if (!rows.length) {
      return res.status(404).json({ message: 'Keine Daten für die monatliche Zusammenfassung gefunden' });
    }
    
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
        // TODO: Hier noch den korrekten Mitfahrersatz für das Datum holen
        const mitfahrerErstattung = row.mitfahrer_count * 0.05 * row.kilometer;
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
    res.status(500).json({ message: 'Fehler beim Abrufen der monatlichen Zusammenfassung', error: error.message });
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
    res.status(500).json({ message: 'Fehler beim Hinzufügen des Mitfahrers', error: error.message });
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
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Mitfahrers', error: error.message });
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
    res.status(500).json({ message: 'Fehler beim Löschen des Mitfahrers', error: error.message });
  }
};

exports.getYearSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const userId = req.user.id;
    
    // Hole zuerst alle Abrechnungsträger mit ihren Erstattungssätzen
    const [erstattungssaetze] = await db.execute(`
      SELECT 
        at.kennzeichen,
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
    
    // Gruppiere Erstattungssätze nach Kennzeichen
    const saetzeProTraeger = {};
    erstattungssaetze.forEach(satz => {
      if (!saetzeProTraeger[satz.kennzeichen]) {
        saetzeProTraeger[satz.kennzeichen] = [];
      }
      saetzeProTraeger[satz.kennzeichen].push(satz);
    });
    
    // Finde den korrekten Erstattungssatz für ein bestimmtes Datum
    const getErstattungssatz = (kennzeichen, datum) => {
      if (!saetzeProTraeger[kennzeichen]) return 0;
      
      const saetze = saetzeProTraeger[kennzeichen];
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
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Jahreszusammenfassung', 
      error: error.message 
    });
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
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Status', error: error.message });
  }
};

module.exports = exports;