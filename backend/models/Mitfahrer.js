const db = require('../config/database');

class Mitfahrer {
  static async create(fahrtId, name, arbeitsstaette, richtung) {
    const [result] = await db.execute(
      'INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung) VALUES (?, ?, ?, ?)',
      [fahrtId, name, arbeitsstaette, richtung]
    );
    return result.insertId;
  }

  static async findByFahrtId(fahrtId) {
    const [rows] = await db.execute(
      'SELECT * FROM mitfahrer WHERE fahrt_id = ?',
      [fahrtId]
    );
    return rows;
  }

  static async update(id, fahrtId, name, arbeitsstaette, richtung) {
    const [result] = await db.execute(
      'UPDATE mitfahrer SET name = ?, arbeitsstaette = ?, richtung = ? WHERE id = ? AND fahrt_id = ?',
      [name, arbeitsstaette, richtung, id, fahrtId]
    );
    return result.affectedRows > 0;
  }

  static async delete(id, fahrtId) {
    const [result] = await db.execute(
      'DELETE FROM mitfahrer WHERE id = ? AND fahrt_id = ?',
      [id, fahrtId]
    );
    return result.affectedRows > 0;
  }

  static async deleteByFahrtId(fahrtId) {
    const [result] = await db.execute(
      'DELETE FROM mitfahrer WHERE fahrt_id = ?', 
      [fahrtId]
    );
    return result.affectedRows > 0;
  }
  /**
   * Haelt die "Hin- und Rueckfahrt"-Eintraege auf beiden Fahrten eines Paares
   * gleich.
   *
   * Bisher hing ein Mitfahrer an genau EINER Fahrt: Wer bei der Hinfahrt mit
   * "beide" eingetragen war, tauchte beim Oeffnen der Rueckfahrt nicht auf.
   * Ist die Fahrt mit einer Gegenfahrt verknuepft, bekommt diese jetzt
   * dieselben 'hin_rueck'-Eintraege — und verliert die, die hier weg sind.
   *
   * 'hin' und 'rueck' bleiben unberuehrt: Sie gelten ausdruecklich nur fuer
   * eine Richtung und gehoeren genau zu der Fahrt, an der sie haengen.
   *
   * Bestandsdaten werden nicht angefasst — die Spiegelung entsteht erst, wenn
   * eine Fahrt bearbeitet wird (so entschieden: 52 der 64 Mitfahrer stehen auf
   * 'hin_rueck', teils in bereits eingereichten Monaten).
   *
   * @param {Array} vomPartnerZuNehmen - was in DIESEM Request die Partnerfahrt
   *   verlassen hat: geloeschte 'hin_rueck'-Eintraege und solche, die von
   *   'hin_rueck' auf eine einzelne Richtung zurueckgestuft wurden. Nur deren
   *   Gegenhaelften werden am Partner entfernt.
   *
   *   Die Loeschung darf NICHT aus dem Ist-Zustand abgeleitet werden ("was am
   *   Partner steht und hier fehlt, muss weg"). Genau das war destruktiv:
   *   Migration 0009 hat Bestandspaare verknuepft, die Mitfahrer aber
   *   ausdruecklich NICHT angefasst — dort haengt 'hin_rueck' nur an EINER der
   *   beiden Fahrten. Wer die leere Haelfte eines solchen Paares oeffnet und
   *   nur die Kilometer korrigiert, schickt `mitfahrer: []` mit; aus dem
   *   Ist-Zustand gelesen haette das die Person an der anderen Fahrt geloescht,
   *   ohne dass der Nutzer Mitfahrer je angefasst hat. Aus dem Request gelesen
   *   passiert nichts — dort wurde nichts geloescht.
   */
  static async spiegleAufPartner(connection, fahrtId, vomPartnerZuNehmen = []) {
    const [rows] = await connection.execute(
      'SELECT partner_fahrt_id FROM fahrten WHERE id = ?',
      [fahrtId]
    );
    const partnerId = rows[0]?.partner_fahrt_id;
    if (!partnerId) return false;

    // Eintraege, die nur fuer die GEGENrichtung gelten, an die richtige Fahrt
    // verschieben: Wer beim Bearbeiten der Hinfahrt "nur zurueck" waehlt, meint
    // die Rueckfahrt — und umgekehrt. Die kleinere ID ist die Hinfahrt.
    const istHinfahrt = fahrtId < partnerId;
    const falscheRichtung = istHinfahrt ? 'rueck' : 'hin';
    await connection.execute(
      'UPDATE mitfahrer SET fahrt_id = ? WHERE fahrt_id = ? AND richtung = ?',
      [partnerId, fahrtId, falscheRichtung]
    );

    // Gegenhaelften der Eintraege entfernen, die in diesem Request die
    // Partnerfahrt verlassen haben. Nur diese — siehe Kommentarkopf: aus dem
    // Ist-Zustand abgeleitet wuerde die Spiegelung Bestandsdaten der
    // Partnerfahrt mitreissen, die der Nutzer nie angefasst hat.
    for (const weg of vomPartnerZuNehmen) {
      // <=> vergleicht NULL-sicher: eine leere Arbeitsstaette steht als NULL in
      // der Tabelle und wuerde mit = nie treffen.
      await connection.execute(
        `DELETE FROM mitfahrer
         WHERE fahrt_id = ? AND richtung = 'hin_rueck'
           AND name = ? AND (arbeitsstaette <=> ?)`,
        [partnerId, weg.name, weg.arbeitsstaette ?? null]
      );
    }

    // Fehlende Gegenhaelften anlegen
    await connection.execute(
      `INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung)
       SELECT ?, e.name, e.arbeitsstaette, 'hin_rueck'
       FROM (SELECT name, arbeitsstaette FROM mitfahrer WHERE fahrt_id = ? AND richtung = 'hin_rueck') e
       WHERE NOT EXISTS (
         SELECT 1 FROM (SELECT name, arbeitsstaette FROM mitfahrer WHERE fahrt_id = ? AND richtung = 'hin_rueck') p
         WHERE p.name = e.name AND (p.arbeitsstaette <=> e.arbeitsstaette)
       )`,
      [partnerId, fahrtId, partnerId]
    );

    return true;
  }

  static async updateMitfahrerForFahrt(fahrtId, neueMitfahrer) {
    // Alles in einer Transaktion: bisher liefen Loeschen, Aktualisieren und
    // Anlegen parallel auf dem Pool - ein Fehler mittendrin hinterliess einen
    // Teilzustand (alte weg, neue fehlen).
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Aktuelle Mitfahrer abrufen
      const [aktuelle] = await connection.execute(
        'SELECT * FROM mitfahrer WHERE fahrt_id = ?',
        [fahrtId]
      );

      // IDs kommen aus dem Request teils als String, aus der Datenbank immer
      // als Zahl — deshalb durchgaengig ueber String() vergleichen.
      const gleicheId = (a, b) => String(a) === String(b);

      // 2. Zu löschende Mitfahrer identifizieren — AUSSCHLIESSLICH ueber die id.
      // Geloescht ist, wer in der neuen Liste gar nicht mehr vorkommt.
      // Frueher verlangte diese Bedingung Gleichheit ALLER Felder: Wer nur die
      // Richtung umgestellt oder einen Tippfehler im Namen korrigiert hatte,
      // landete gleichzeitig im Loesch- und im Aktualisieren-Bucket. Geloescht
      // wurde zuerst, das anschliessende UPDATE traf 0 Zeilen — die Person war
      // weg, ueber die Spiegelung sogar aus BEIDEN Fahrten des Paares.
      // Feldaenderungen gehoeren nicht in die Loeschentscheidung, die deckt
      // zuAktualisieren ab.
      const zuLoeschen = aktuelle.filter(alt =>
        !neueMitfahrer.some(neu => gleicheId(neu.id, alt.id))
      );

      // 3. Neue Mitfahrer identifizieren
      const zuErstellen = neueMitfahrer.filter(neu => !neu.id);

      // 4. Zu aktualisierende Mitfahrer — nur IDs, die zu dieser Fahrt gehören
      // (fremde/unbekannte IDs werden stillschweigend ignoriert)
      const zuAktualisieren = neueMitfahrer.filter(neu =>
        neu.id && aktuelle.some(alt => gleicheId(alt.id, neu.id))
      );

      // 5. Änderungen durchführen — nacheinander auf derselben Verbindung,
      // damit die Transaktion greift
      for (const m of zuLoeschen) {
        await connection.execute('DELETE FROM mitfahrer WHERE id = ?', [m.id]);
      }
      // Updates (defensiv zusätzlich per fahrt_id gescopt)
      for (const m of zuAktualisieren) {
        await connection.execute(
          'UPDATE mitfahrer SET name = ?, arbeitsstaette = ?, richtung = ? WHERE id = ? AND fahrt_id = ?',
          [m.name, m.arbeitsstaette, m.richtung, m.id, fahrtId]
        );
      }
      for (const m of zuErstellen) {
        await connection.execute(
          'INSERT INTO mitfahrer (fahrt_id, name, arbeitsstaette, richtung) VALUES (?, ?, ?, ?)',
          [fahrtId, m.name, m.arbeitsstaette, m.richtung]
        );
      }

      // Was die Partnerfahrt durch diesen Request verlassen hat: einerseits
      // geloeschte 'hin_rueck'-Eintraege, andererseits solche, die von
      // 'hin_rueck' auf eine einzelne Richtung zurueckgestuft wurden. Der
      // Rueckstufungs-Fall ist der teurere: Bleibt die Spiegelkopie am Partner
      // auf 'hin_rueck' stehen, wird die Person fuer eine Strecke erstattet,
      // von der sie gerade abgemeldet wurde (UEBERZAHLUNG). Der Vergleich muss
      // hier passieren — nur hier ist der Zustand VOR dem Update noch bekannt.
      // Uebernommen wird jeweils der Stand VOR dem Update: die Kopie am Partner
      // traegt noch den alten Namen, ein gleichzeitig korrigierter Tippfehler
      // wuerde sie sonst verfehlen.
      const alterStand = new Map(aktuelle.map(alt => [String(alt.id), alt]));
      const zurueckgestuft = zuAktualisieren
        .filter(neu => {
          const alt = alterStand.get(String(neu.id));
          return alt && alt.richtung === 'hin_rueck' && neu.richtung !== 'hin_rueck';
        })
        .map(neu => alterStand.get(String(neu.id)));

      const vomPartnerZuNehmen = [...zuLoeschen, ...zurueckgestuft]
        .filter(m => m.richtung === 'hin_rueck');

      await Mitfahrer.spiegleAufPartner(connection, fahrtId, vomPartnerZuNehmen);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      console.error('Fehler beim Aktualisieren der Mitfahrer:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Mitfahrer;