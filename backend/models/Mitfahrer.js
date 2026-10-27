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
  /** Hält 'hin_rueck' auf beiden Fahrten eines Paares gleich; gelöscht wird am Partner nur, was [vomPartnerZuNehmen] in diesem Request verlassen hat, nie aus dem Ist-Zustand abgeleitet. */
  static async spiegleAufPartner(connection, fahrtId, vomPartnerZuNehmen = []) {
    const [rows] = await connection.execute(
      'SELECT partner_fahrt_id FROM fahrten WHERE id = ?',
      [fahrtId]
    );
    const partnerId = rows[0]?.partner_fahrt_id;
    if (!partnerId) return false;

    // Nur für die Gegenrichtung gültige Einträge an die richtige Fahrt verschieben, die kleinere ID ist die Hinfahrt.
    const istHinfahrt = fahrtId < partnerId;
    const falscheRichtung = istHinfahrt ? 'rueck' : 'hin';
    await connection.execute(
      'UPDATE mitfahrer SET fahrt_id = ? WHERE fahrt_id = ? AND richtung = ?',
      [partnerId, fahrtId, falscheRichtung]
    );

    // Nur die Einträge, die in diesem Request den Partner verlassen haben.
    for (const weg of vomPartnerZuNehmen) {
      // <=> vergleicht NULL-sicher.
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
    // In einer Transaktion, sonst bleibt bei Fehlern ein Teilzustand.
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Aktuelle Mitfahrer abrufen
      const [aktuelle] = await connection.execute(
        'SELECT * FROM mitfahrer WHERE fahrt_id = ?',
        [fahrtId]
      );

      // IDs als String vergleichen, sie kommen teils als String.
      const gleicheId = (a, b) => String(a) === String(b);

      // 2. Gelöscht ist nur, wessen id in der neuen Liste fehlt; Feldänderungen deckt zuAktualisieren ab.
      const zuLoeschen = aktuelle.filter(alt =>
        !neueMitfahrer.some(neu => gleicheId(neu.id, alt.id))
      );

      // 3. Neue Mitfahrer identifizieren
      const zuErstellen = neueMitfahrer.filter(neu => !neu.id);

      // 4. Nur IDs dieser Fahrt, fremde werden ignoriert.
      const zuAktualisieren = neueMitfahrer.filter(neu =>
        neu.id && aktuelle.some(alt => gleicheId(alt.id, neu.id))
      );

      // 5. Nacheinander auf derselben Verbindung, damit die Transaktion greift.
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

      // Was den Partner verlässt (gelöscht oder von 'hin_rueck' zurückgestuft), mit dem Stand vor dem Update, sonst Überzahlung.
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