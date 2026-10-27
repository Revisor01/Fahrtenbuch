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

// Fasst die JOIN-Zeilen je Fahrt mit Mitfahrer-Liste zusammen; die Form gleicht Mitfahrer.findByFahrtId, weil die Apps sie lesen.
function fahrtenMitMitfahrern(rows) {
  const fahrten = [];
  const nachId = new Map();

  for (const zeile of rows) {
    let fahrt = nachId.get(zeile.id);
    if (!fahrt) {
      // Die Mitfahrer-Spalten gehoeren nicht an die Fahrt selbst.
      const { mitfahrer_id, mitfahrer_name, arbeitsstaette, richtung, ...rest } = zeile;
      fahrt = { ...rest, mitfahrer: [] };
      nachId.set(zeile.id, fahrt);
      fahrten.push(fahrt);
    }
    // Bei einer Fahrt ohne Mitfahrer liefert der LEFT JOIN NULL-Spalten.
    if (zeile.mitfahrer_id !== null && zeile.mitfahrer_id !== undefined) {
      fahrt.mitfahrer.push({
        id: zeile.mitfahrer_id,
        fahrt_id: zeile.id,
        name: zeile.mitfahrer_name,
        arbeitsstaette: zeile.arbeitsstaette,
        richtung: zeile.richtung,
      });
    }
  }

  return fahrten;
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
    
    // In derselben Transaktion; verknuepfePaar prüft die Partnerfahrt selbst.
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

    // Ohne Kilometer die hinterlegte Distanz, wie beim Anlegen.
    let updateKilometer = kilometer;
    if (!updateKilometer && vonOrtId && nachOrtId) {
      updateKilometer = await getDistance(vonOrtId, nachOrtId, userId);
    }

    const updateData = {
      vonOrtId: vonOrtId || null,
      nachOrtId: nachOrtId || null,
      einmaligerVonOrt: einmaligerVonOrt || null,
      einmaligerNachOrt: einmaligerNachOrt || null,
      anlass: anlass || null,
      // Fehlt kilometer, warf .toString() einen TypeError und damit einen 500er
      kilometer: updateKilometer !== undefined && updateKilometer !== null ? updateKilometer.toString() : null,
      abrechnung: abrechnung || null,
      datum: datum || null
    };

    const updated = await Fahrt.update(id, updateData, userId);

    if (updated) {
      // Auch ein leeres Array, sonst ließe sich der letzte Mitfahrer nie entfernen.
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

    // Mitfahrer aus denselben Zeilen statt Einzelabfragen.
    const fahrten = fahrtenMitMitfahrern(fahrtenRaw);
    
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

    // Mitfahrer aus denselben Zeilen statt Einzelabfragen.
    const fahrten = fahrtenMitMitfahrern(
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


    // Hole Erstattungssätze
    const saetzeProTraeger = await ladeErstattungssaetze(userId);

    // Erstelle die Zusammenfassung
    const erstattungen = {};
    // Je Träger und Monat, um Monate ohne Vorgang von offenen zu unterscheiden.
    const erstattungenProMonat = {};
    const merkeMonat = (key, ym, betrag) => {
      if (!erstattungenProMonat[key]) erstattungenProMonat[key] = {};
      erstattungenProMonat[key][ym] = (erstattungenProMonat[key][ym] || 0) + betrag;
    };

    const report = fahrten.map((fahrt) => {
      // Date-Objekt aus mysql2, lokal zu „YYYY-MM“ formatieren.
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
    
    // Je Fahrt, weil die Erstattung auf Fahrt-Ebene entsteht.
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

    // Status aller Monate in einer Abfrage.
    const statusNachMonat = await Abrechnung.getStatusNachMonat(userId);

    const summary = fahrten.reduce((acc, fahrt) => {
      if (!acc[fahrt.yearMonth]) {
        acc[fahrt.yearMonth] = {
          yearMonth: fahrt.yearMonth,
          erstattungen: {},
          // Zusätzlich, damit die Monatsübersicht keine Einzelberichte abruft; die alten Felder bleiben.
          abrechnungsStatus: statusNachMonat[fahrt.yearMonth] || {},
          kmProTraeger: {},
          fahrtenCount: 0,
          totalKm: 0,
          gesamtErstattung: 0,
        };
      }
      const eintrag = acc[fahrt.yearMonth];
      const monat = eintrag.erstattungen;

      eintrag.fahrtenCount += 1;
      const km = Number(fahrt.kilometer || 0);
      eintrag.totalKm += km;
      if (fahrt.abrechnung !== null && fahrt.abrechnung !== undefined) {
        const schluessel = String(fahrt.abrechnung);
        eintrag.kmProTraeger[schluessel] = (eintrag.kmProTraeger[schluessel] || 0) + km;
      }

      if (!monat[fahrt.abrechnung]) {
        monat[fahrt.abrechnung] = { kilometer: 0, erstattung: 0 };
      }
      monat[fahrt.abrechnung].kilometer += Number(fahrt.kilometer || 0);
      const fahrtErstattung = berechneFahrtErstattung(
        saetzeProTraeger, fahrt.abrechnung, fahrt.kilometer, fahrt.datum
      );
      monat[fahrt.abrechnung].erstattung += fahrtErstattung;
      eintrag.gesamtErstattung += fahrtErstattung;

      const mitfahrerErstattung = berechneMitfahrerErstattung(
        saetzeProTraeger, fahrt.mitfahrer_count, fahrt.kilometer, fahrt.datum
      );
      if (mitfahrerErstattung > 0) {
        if (!monat.mitfahrer) {
          monat.mitfahrer = { kilometer: 0, erstattung: 0 };
        }
        monat.mitfahrer.kilometer += Number(fahrt.kilometer || 0);
        monat.mitfahrer.erstattung += mitfahrerErstattung;
        eintrag.gesamtErstattung += mitfahrerErstattung;
      }

      return acc;
    }, {});

    res.status(200).json(Object.values(summary));
  } catch (error) {
    console.error('Fehler beim Abrufen der monatlichen Zusammenfassung:', error);
    res.status(500).json({ message: 'Fehler beim Abrufen der monatlichen Zusammenfassung' });
  }
};

// Die Einzel-Endpunkte gehen über updateMitfahrerForFahrt, weil nur dieser Weg die Gegenfahrt eines Paares mitführt.
exports.addMitfahrer = async (req, res) => {
  try {
    const { fahrtId } = req.params;
    const { name, arbeitsstaette, richtung } = req.body;
    const fahrt = await Fahrt.findById(fahrtId, req.user.id);
    if (!fahrt) {
      return res.status(404).json({ message: 'Fahrt nicht gefunden' });
    }
    const vorhandene = await Mitfahrer.findByFahrtId(fahrtId);
    await Mitfahrer.updateMitfahrerForFahrt(fahrtId, [
      ...vorhandene,
      { name, arbeitsstaette, richtung },
    ]);
    // Die id entsteht erst im INSERT.
    const danach = await Mitfahrer.findByFahrtId(fahrtId);
    const bekannt = new Set(vorhandene.map(m => String(m.id)));
    const neuer = danach.find(m => !bekannt.has(String(m.id)));
    res.status(201).json({ id: neuer?.id, message: 'Mitfahrer erfolgreich hinzugefügt' });
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
    const vorhandene = await Mitfahrer.findByFahrtId(fahrtId);
    if (!vorhandene.some(m => String(m.id) === String(mitfahrerId))) {
      return res.status(404).json({ message: 'Mitfahrer nicht gefunden' });
    }
    const neueListe = vorhandene.map(m =>
      String(m.id) === String(mitfahrerId)
        ? { ...m, name, arbeitsstaette, richtung }
        : m
    );
    await Mitfahrer.updateMitfahrerForFahrt(fahrtId, neueListe);
    res.status(200).json({ message: 'Mitfahrer erfolgreich aktualisiert' });
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
    const vorhandene = await Mitfahrer.findByFahrtId(fahrtId);
    if (!vorhandene.some(m => String(m.id) === String(mitfahrerId))) {
      return res.status(404).json({ message: 'Mitfahrer nicht gefunden' });
    }
    await Mitfahrer.updateMitfahrerForFahrt(
      fahrtId,
      vorhandene.filter(m => String(m.id) !== String(mitfahrerId))
    );
    res.status(200).json({ message: 'Mitfahrer erfolgreich gelöscht' });
  } catch (error) {
    console.error('Fehler beim Löschen des Mitfahrers:', error);
    res.status(500).json({ message: 'Fehler beim Löschen des Mitfahrers' });
  }
};

exports.getYearSummary = async (req, res) => {
  try {
    const { year } = req.params;
    const userId = req.user.id;
    
    // COUNT(DISTINCT m.id), sonst zählt ein zweiter JOIN-Treffer doppelt.
    const [fahrten] = await db.execute(`
      SELECT
        f.datum,
        f.kilometer,
        f.abrechnung,
        COUNT(DISTINCT m.id) as mitfahrer_count
      FROM fahrten f
      LEFT JOIN mitfahrer m ON f.id = m.fahrt_id
      WHERE f.user_id = ? AND f.datum >= ? AND f.datum < ?
      GROUP BY f.id
    `, [userId, `${parseInt(year, 10)}-01-01`, `${parseInt(year, 10) + 1}-01-01`]);

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
