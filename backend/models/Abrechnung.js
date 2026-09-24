const db = require('../config/database');

class Abrechnung {
    static async getStatus(userId, jahr, monat) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM abrechnungen WHERE user_id = ? AND jahr = ? AND monat = ?',
                [userId, jahr, monat]
            );
            
            // Konvertiere die Zeilen in ein strukturiertes Objekt
            const status = {};
            rows.forEach(row => {
                status[row.typ] = {
                    eingereicht_am: row.eingereicht_am,
                    erhalten_am: row.erhalten_am
                };
            });
            
            return status;
        } catch (error) {
            console.error('Fehler beim Abrufen des Abrechnungsstatus:', error);
            throw error;
        }
    }

    static async updateStatus(userId, jahr, monat, typ, aktion, datum) {
        try {
            // `abrechnungen.typ` ist VARCHAR und enthält gemischt Träger-IDs
            // und den Sonderwert 'mitfahrer'. Wird ein numerischer Wert
            // gebunden, castet MySQL die ganze Spalte auf DOUBLE und bricht
            // an der Zeile 'mitfahrer' ab (ER_TRUNCATED_WRONG_VALUE).
            // Daher IMMER als String vergleichen/schreiben.
            const istMitfahrer = String(typ) === 'mitfahrer';
            const typForDb = istMitfahrer ? 'mitfahrer' : String(parseInt(typ, 10));

            // Prüfen ob der Abrechnungsträger existiert - nur für numerische IDs
            if (!istMitfahrer) {
                if (!Number.isInteger(parseInt(typ, 10))) {
                    throw new Error('Ungültiger Abrechnungsträger');
                }
                const [traeger] = await db.execute(
                    'SELECT id FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
                    [parseInt(typ, 10), userId]
                );

                if (traeger.length === 0) {
                    throw new Error('Ungültiger Abrechnungsträger');
                }
            }
            
            if (aktion === 'eingereicht') {
                const [result] = await db.execute(
                    `INSERT INTO abrechnungen (user_id, jahr, monat, typ, eingereicht_am)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE eingereicht_am = ?`,
                    [userId, jahr, monat, typForDb, datum, datum]
                );
                return result;
            } else if (aktion === 'erhalten') {
                // ... Rest des Codes bleibt gleich, aber nutze typForDb
                const [current] = await db.execute(
                    'SELECT eingereicht_am FROM abrechnungen WHERE user_id = ? AND jahr = ? AND monat = ? AND typ = ?',
                    [userId, jahr, monat, typForDb]
                );
                
                if (!current || !current[0]?.eingereicht_am) {
                    throw new Error('Abrechnung muss erst eingereicht werden');
                }
                
                const [result] = await db.execute(
                    `UPDATE abrechnungen 
                SET erhalten_am = ?
                WHERE user_id = ? AND jahr = ? AND monat = ? AND typ = ?`,
                    [datum, userId, jahr, monat, typForDb]
                );
                return result;
            } else if (aktion === 'reset') {
                const [result] = await db.execute(
                    `DELETE FROM abrechnungen 
                WHERE user_id = ? AND jahr = ? AND monat = ? AND typ = ?`,
                    [userId, jahr, monat, typForDb]
                );
                return result;
            }
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Status:', error);
            throw error;
        }
    }
    
    // Alle Monate eines Zeitraums in EINER Transaktion auf „eingereicht"
    // setzen.
    //
    // Der Zeitraum-Export rief bisher updateStatus pro Monat auf, jeweils mit
    // eigenem Autocommit — und das mitten im Bauen der Datei, also bevor
    // feststand, dass ueberhaupt eine Datei herauskommt. Brach der Lauf bei
    // Monat 3 von 6 ab (oder spaeter LibreOffice mit 60-s-Timeout), standen
    // zwei Monate auf „eingereicht", vier nicht, und der Nutzer hatte nichts
    // in der Hand. Zurueckgenommen werden musste das von Hand.
    //
    // Entweder alle Monate oder keiner. Aufgerufen wird das erst, wenn die
    // Datei beim Nutzer ist.
    static async markiereZeitraumEingereicht({ userId, startYear, startMonth, endYear, endMonth, typ, datum }) {
        const istMitfahrer = String(typ) === 'mitfahrer';
        // Dieselbe Falle wie in updateStatus: `abrechnungen.typ` ist VARCHAR
        // mit gemischtem Inhalt, ein numerischer Bind castet die Spalte.
        const typForDb = istMitfahrer ? 'mitfahrer' : String(parseInt(typ, 10));

        if (!istMitfahrer) {
            if (!Number.isInteger(parseInt(typ, 10))) {
                throw new Error('Ungültiger Abrechnungsträger');
            }
            const [traeger] = await db.execute(
                'SELECT id FROM abrechnungstraeger WHERE id = ? AND user_id = ?',
                [parseInt(typ, 10), userId]
            );
            if (traeger.length === 0) {
                throw new Error('Ungültiger Abrechnungsträger');
            }
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            let y = parseInt(startYear, 10);
            let m = parseInt(startMonth, 10);
            const ey = parseInt(endYear, 10);
            const em = parseInt(endMonth, 10);

            while (y < ey || (y === ey && m <= em)) {
                await connection.execute(
                    `INSERT INTO abrechnungen (user_id, jahr, monat, typ, eingereicht_am)
                     VALUES (?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE eingereicht_am = ?`,
                    [userId, y, m, typForDb, datum, datum]
                );
                m++;
                if (m > 12) { m = 1; y++; }
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            console.error('Fehler beim Markieren des Zeitraums als eingereicht:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getAllStatusForYear(userId, jahr) {
        try {
            const [rows] = await db.execute(
                'SELECT * FROM abrechnungen WHERE user_id = ? AND jahr = ?',
                [userId, jahr]
            );

            // Gruppiere nach Monaten
            const statusByMonth = {};
            rows.forEach(row => {
                if (!statusByMonth[row.monat]) {
                    statusByMonth[row.monat] = {};
                }
                statusByMonth[row.monat][row.typ] = {
                    eingereicht_am: row.eingereicht_am,
                    erhalten_am: row.erhalten_am
                };
            });

            return statusByMonth;
        } catch (error) {
            console.error('Fehler beim Abrufen der Jahres-Status:', error);
            throw error;
        }
    }
}

module.exports = Abrechnung;