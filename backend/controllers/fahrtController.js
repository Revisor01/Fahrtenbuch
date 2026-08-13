const Fahrt = require('../models/Fahrt');
const Mitfahrer = require('../models/Mitfahrer');
const Abrechnung = require('../models/Abrechnung');
const { getDistance } = require('../utils/distanceCalculator');
const { exportToExcel, exportToExcelRange } = require('../utils/excelExport');
const { exportToPdf, exportToPdfRange } = require('../utils/pdfExport');
const {
  ladeErstattungssaetze,
  findeSatz,
  berechneFahrtErstattung,
  berechneMitfahrerErstattung,
} = require('../utils/erstattung');
const db = require('../config/database');

exports.exportToExcel = exportToExcel;
exports.exportToExcelRange = exportToExcelRange;
exports.exportToPdf = exportToPdf;
exports.exportToPdfRange = exportToPdfRange;

// Der mitfahrer-JOIN in getMonthlyReport/getDateRangeReport liefert pro Mitfahrer
// eine Row — für Reports je Fahrt genau eine Zeile behalten (Mitfahrer werden
// separat per Mitfahrer.findByFahrtId geladen, keine Informationsverluste).
function dedupeByFahrtId(rows) {
  const seen = new Set();
  return rows.filter(r => {
    if (seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });
}

// Ownership-Check: gehört der Ort dem eingeloggten User?
async function ortGehoertUser(ortId, userId) {
  const [rows] = await db.execute(
    'SELECT id FROM orte WHERE id = ? AND user_id = ?',
    [ortId, userId]
  );
  return rows.length > 0;
}

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
      mitfahrer,
      partnerFahrtId
    } = req.body;
    const userId = req.user.id;

    // Check abrechnung
    const [abrechnungCheck] = await db.execute('SELECT id FROM abrechnungstraeger WHERE id = ? AND user_id = ?', [abrechnung, userId]);
    
    if (!abrechnungCheck || abrechnungCheck.length === 0) {
      return res.status(400).json({ message: 'Abrechnungsträger nicht gefunden' });
    }

    // Ort-Ownership: fremde Ort-IDs abweisen (einmalige Orte als Freitext bleiben unberührt)
    for (const ortId of [vonOrtId, nachOrtId]) {
      if (ortId !== null && ortId !== undefined && !(await ortGehoertUser(ortId, userId))) {
        return res.status(400).json({ message: 'Ort nicht gefunden' });
      }
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
    
    // Mitfahrer und die Paar-Verknuepfung laufen in derselben Transaktion wie
    // die Fahrt. verknuepfePaar prueft selbst, ob die Partnerfahrt dem Nutzer
    // gehoert — eine fremde ID bleibt wirkungslos.
    const id = await Fahrt.create(
      fahrtData,
      null,
      userId,
      Array.isArray(mitfahrer) ? mitfahrer : [],
      partnerFahrtId || null
    );


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

    // Ort-Ownership: fremde Ort-IDs abweisen (einmalige Orte als Freitext bleiben unberührt)
    for (const ortId of [vonOrtId, nachOrtId]) {
      if (ortId !== null && ortId !== undefined && !(await ortGehoertUser(ortId, userId))) {
        return res.status(400).json({ message: 'Ort nicht gefunden' });
      }
    }

    const updateData = {
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null,
      anlass: anlass || null,
      // Fehlt kilometer, warf .toString() einen TypeError und damit einen 500er
      kilometer: kilometer !== undefined && kilometer !== null ? kilometer.toString() : null,
      abrechnung: abrechnung || null,
      datum: datum || null
    };

    const updated = await Fahrt.update(id, updateData, userId);

    if (updated) {
      // Auch ein leeres Array verarbeiten: sonst liess sich der letzte
      // Mitfahrer nie entfernen - die Oberflaeche meldete Erfolg, nach dem
      // Neuladen war er wieder da (und wurde weiter erstattet).
      if (Array.isArray(mitfahrer)) {
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
    const [fahrtenRaw, abrechnungsStatus] = await Promise.all([
      Fahrt.getMonthlyReport(year, month, userId),
      Abrechnung.getStatus(userId, year, month)
    ]);

    // Mitfahrer-JOIN-Duplikate entfernen (eine Zeile pro Fahrt)
    const fahrten = dedupeByFahrtId(fahrtenRaw);

    // Füge Mitfahrer-Daten hinzu
    for (let fahrt of fahrten) {
      fahrt.mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
    }
    
    const saetzeProTraeger = await ladeErstattungssaetze(userId);

    // Erstelle die Zusammenfassung
    const erstattungen = {};

    const report = fahrten.map((fahrt) => {
      // Finde den passenden Erstattungssatz für das Fahrtdatum
      const erstattungssatz = findeSatz(saetzeProTraeger, fahrt.abrechnung, fahrt.datum);
      const erstattung = berechneFahrtErstattung(
        saetzeProTraeger, fahrt.abrechnung, fahrt.kilometer, fahrt.datum
      );

      // Summiere die Erstattung für diesen Träger
      if (!erstattungen[fahrt.abrechnung]) {
        erstattungen[fahrt.abrechnung] = 0;
      }
      erstattungen[fahrt.abrechnung] += erstattung;

      // Berechne Mitfahrer-Erstattung (auch pro Fahrt ausweisen)
      const mitfahrerErstattung = berechneMitfahrerErstattung(
        saetzeProTraeger, fahrt.mitfahrer?.length, fahrt.kilometer, fahrt.datum
      );
      if (mitfahrerErstattung > 0) {
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
        erstattung,
        mitfahrerErstattung
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

    // Hole Fahrten über den gesamten Zeitraum — Mitfahrer-JOIN-Duplikate entfernen
    const fahrten = dedupeByFahrtId(
      await Fahrt.getDateRangeReport(startYear, startMonth, endYear, endMonth, userId)
    );

    // Pro-Monat-Status: { traegerId: { "2026-01": { eingereicht_am, erhalten_am }, ... } }
    const abrechnungsStatus = {};
    let y = startYear;
    let m = startMonth;
    while (y < endYear || (y === endYear && m <= endMonth)) {
      const monthKey = `${y}-${String(m).padStart(2, '0')}`;
      const status = await Abrechnung.getStatus(userId, y, m);
      if (status && typeof status === 'object') {
        for (const [traegerId, statusData] of Object.entries(status)) {
          if (!abrechnungsStatus[traegerId]) {
            abrechnungsStatus[traegerId] = {};
          }
          abrechnungsStatus[traegerId][monthKey] = statusData;
        }
      }
      m++;
      if (m > 12) { m = 1; y++; }
    }

    // Füge Mitfahrer-Daten hinzu
    for (let fahrt of fahrten) {
      fahrt.mitfahrer = await Mitfahrer.findByFahrtId(fahrt.id);
    }

    // Hole Erstattungssätze
    const saetzeProTraeger = await ladeErstattungssaetze(userId);

    // Erstelle die Zusammenfassung
    const erstattungen = {};
    // Beträge je Träger UND Monat — die Zeitraum-Übersicht braucht sie, um
    // Monate ohne Vorgang von wirklich offenen zu unterscheiden
    const erstattungenProMonat = {};
    const merkeMonat = (key, ym, betrag) => {
      if (!erstattungenProMonat[key]) erstattungenProMonat[key] = {};
      erstattungenProMonat[key][ym] = (erstattungenProMonat[key][ym] || 0) + betrag;
    };

    const report = fahrten.map((fahrt) => {
      // fahrt.datum ist ein Date-Objekt (mysql2) — String(...) ergäbe
      // „Wed Jan 01 ...“; lokal formatieren, damit „YYYY-MM“ herauskommt
      const fahrtDatum = new Date(fahrt.datum);
      const fahrtYM = `${fahrtDatum.getFullYear()}-${String(fahrtDatum.getMonth() + 1).padStart(2, '0')}`;
      const erstattungssatz = findeSatz(saetzeProTraeger, fahrt.abrechnung, fahrt.datum);
      const erstattung = berechneFahrtErstattung(
        saetzeProTraeger, fahrt.abrechnung, fahrt.kilometer, fahrt.datum
      );

      if (!erstattungen[fahrt.abrechnung]) {
        erstattungen[fahrt.abrechnung] = 0;
      }
      erstattungen[fahrt.abrechnung] += erstattung;
      merkeMonat(String(fahrt.abrechnung), fahrtYM, erstattung);

      // Berechne Mitfahrer-Erstattung (auch pro Fahrt ausweisen)
      const mitfahrerErstattung = berechneMitfahrerErstattung(
        saetzeProTraeger, fahrt.mitfahrer?.length, fahrt.kilometer, fahrt.datum
      );
      if (mitfahrerErstattung > 0) {
        if (!erstattungen.mitfahrer) {
          erstattungen.mitfahrer = 0;
        }
        erstattungen.mitfahrer += mitfahrerErstattung;
        merkeMonat('mitfahrer', fahrtYM, mitfahrerErstattung);
      }

      return {
        ...fahrt,
        vonOrtName: fahrt.von_ort_name || fahrt.einmaliger_von_ort,
        nachOrtName: fahrt.nach_ort_name || fahrt.einmaliger_nach_ort,
        erstattungssatz,
        erstattung,
        mitfahrerErstattung
      };
    });

    // Sortiere nach Datum aufsteigend
    report.sort((a, b) => new Date(a.datum) - new Date(b.datum));

    res.status(200).json({
      fahrten: report,
      summary: {
        erstattungen,
        erstattungenProMonat,
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
    
    // Je Fahrt eine Zeile — die Erstattung entsteht immer auf Fahrt-Ebene.
    // Vorher aggregierte die Abfrage schon in SQL auf Monat/Traeger und
    // multiplizierte dann die Mitfahrer-Anzahl des Monats mit dessen
    // Kilometersumme: bis zum 40-fachen des richtigen Betrags.
    const [fahrten] = await db.execute(`
      SELECT
        DATE_FORMAT(f.datum, '%Y-%m') as yearMonth,
        f.datum,
        f.abrechnung,
        f.kilometer,
        COUNT(m.id) as mitfahrer_count
      FROM fahrten f
      LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
      WHERE f.user_id = ?
      GROUP BY f.id
      ORDER BY f.datum DESC
    `, [userId]);

    if (!fahrten.length) {
      return res.status(404).json({ message: 'Keine Daten für die monatliche Zusammenfassung gefunden' });
    }

    const saetzeProTraeger = await ladeErstattungssaetze(userId);

    // Gruppiere nach Monaten
    const summary = fahrten.reduce((acc, fahrt) => {
      if (!acc[fahrt.yearMonth]) {
        acc[fahrt.yearMonth] = {
          yearMonth: fahrt.yearMonth,
          erstattungen: {}
        };
      }
      const monat = acc[fahrt.yearMonth].erstattungen;

      if (!monat[fahrt.abrechnung]) {
        monat[fahrt.abrechnung] = { kilometer: 0, erstattung: 0 };
      }
      monat[fahrt.abrechnung].kilometer += Number(fahrt.kilometer || 0);
      monat[fahrt.abrechnung].erstattung += berechneFahrtErstattung(
        saetzeProTraeger, fahrt.abrechnung, fahrt.kilometer, fahrt.datum
      );

      const mitfahrerErstattung = berechneMitfahrerErstattung(
        saetzeProTraeger, fahrt.mitfahrer_count, fahrt.kilometer, fahrt.datum
      );
      if (mitfahrerErstattung > 0) {
        if (!monat.mitfahrer) {
          monat.mitfahrer = { kilometer: 0, erstattung: 0 };
        }
        monat.mitfahrer.kilometer += Number(fahrt.kilometer || 0);
        monat.mitfahrer.erstattung += mitfahrerErstattung;
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
    const fahrt = await Fahrt.findById(fahrtId, req.user.id);
    if (!fahrt) {
      return res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
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
    const fahrt = await Fahrt.findById(fahrtId, req.user.id);
    if (!fahrt) {
      return res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
    const updated = await Mitfahrer.update(mitfahrerId, fahrtId, name, arbeitsstaette, richtung);
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
    const fahrt = await Fahrt.findById(fahrtId, req.user.id);
    if (!fahrt) {
      return res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
    const deleted = await Mitfahrer.delete(mitfahrerId, fahrtId);
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
    
    // Hole alle Fahrten des Jahres — COUNT(DISTINCT m.id), damit ein zweiter
    // JOIN-Treffer die Mitfahrer nicht doppelt zaehlt
    const [fahrten] = await db.execute(`
      SELECT
        f.datum,
        f.kilometer,
        f.abrechnung,
        COUNT(DISTINCT m.id) as mitfahrer_count
      FROM fahrten f
      LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
      WHERE YEAR(f.datum) = ? AND f.user_id = ?
      GROUP BY f.id
    `, [year, userId]);

    const saetzeProTraeger = await ladeErstattungssaetze(userId);

    // Berechne die Summen pro Abrechnungsträger
    const summary = fahrten.reduce((acc, fahrt) => {
      // Erstattung für die Fahrt
      const erstattung = berechneFahrtErstattung(
        saetzeProTraeger, fahrt.abrechnung, fahrt.kilometer, fahrt.datum
      );

      if (!acc[fahrt.abrechnung]) {
        acc[fahrt.abrechnung] = {
          kilometer: 0,
          erstattung: 0
        };
      }

      acc[fahrt.abrechnung].kilometer += Number(fahrt.kilometer || 0);
      acc[fahrt.abrechnung].erstattung += erstattung;

      // Mitfahrer-Erstattung
      const mitfahrerErstattung = berechneMitfahrerErstattung(
        saetzeProTraeger, fahrt.mitfahrer_count, fahrt.kilometer, fahrt.datum
      );
      if (mitfahrerErstattung > 0) {
        if (!acc.mitfahrer) {
          acc.mitfahrer = {
            kilometer: 0,
            erstattung: 0
          };
        }
        acc.mitfahrer.erstattung += mitfahrerErstattung;
        acc.mitfahrer.kilometer += Number(fahrt.kilometer || 0);
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
    // Fachliche Vorbedingung (z. B. „erst einreichen") ist kein Serverfehler
    if (/erst eingereicht/i.test(error.message || '')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Status' });
  }
};

module.exports = exports;
