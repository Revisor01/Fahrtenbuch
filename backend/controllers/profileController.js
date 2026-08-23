const db = require('../config/database');
const { TOKEN_LAUFZEIT, ERNEUERUNGS_HEADER } = require('../utils/tokenLaufzeit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const mailService = require('../services/mailService');

exports.getProfile = async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT 
                u.username, 
                u.email_verified,
                p.email, 
                p.full_name, 
                p.iban, 
                p.kirchengemeinde, 
                p.kirchspiel, 
                p.kirchenkreis, 
                o.name as wohnort, 
                o.adresse as wohnort_adresse, 
                d.name as dienstort, 
                d.adresse as dienstort_adresse 
            FROM users u 
            LEFT JOIN user_profiles p ON u.id = p.user_id 
            LEFT JOIN orte o ON u.id = o.user_id AND o.ist_wohnort = 1 
            LEFT JOIN orte d ON u.id = d.user_id AND d.ist_dienstort = 1 
            WHERE u.id = ?`,
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Profil nicht gefunden' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Fehler beim Abrufen des Profils:', error);
        res.status(500).json({ message: 'Serverfehler beim Abrufen des Profils' });
    }
};

exports.updateProfile = async (req, res) => {
    const { email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis } = req.body;
    const userId = req.user.id;

    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Prüfen, ob ein Profil für diesen Benutzer bereits existiert
            const [existingProfile] = await connection.execute(
                'SELECT * FROM user_profiles WHERE user_id = ?',
                [userId]
            );

            // Bei E-Mail-Änderung Verifikation starten
            if (email && existingProfile.length > 0 && email !== existingProfile[0].email) {
                 // Gehoert die Adresse schon jemand anderem? Sonst liesse sich
                 // das eigene Profil auf eine fremde, vergebene Adresse
                 // umziehen — die andere Person verlöre ihren Zugang ueber
                 // "Passwort vergessen" (24.08.).
                 const [belegt] = await connection.execute(
                    'SELECT user_id FROM user_profiles WHERE email = ? AND user_id != ?',
                    [email, userId]
                 );
                 if (belegt.length > 0) {
                    await connection.rollback();
                    return res.status(400).json({ message: 'Diese E-Mail-Adresse wird bereits verwendet' });
                 }

                 // email_verified wieder auf 0 setzen
                  await connection.execute(
                    'UPDATE users SET email_verified = FALSE WHERE id = ?',
                    [userId]
                 );
                 
                 const verificationToken = crypto.randomBytes(32).toString('hex');
                await connection.execute(
                    'INSERT INTO email_verifications (user_id, new_email, verification_token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
                    [userId, email, verificationToken]
                );
               
              const [user] = await db.execute(
                    'SELECT * FROM users WHERE id = ?',
                    [userId]
                 );
              await mailService.sendEmailVerification(email, user[0].username, verificationToken);
             }

            // Profil aktualisieren/erstellen
            if (existingProfile.length > 0) {
                await connection.execute(
                    'UPDATE user_profiles SET email = ?, full_name = ?, iban = ?, kirchengemeinde = ?, kirchspiel = ?, kirchenkreis = ? WHERE user_id = ?',
                    [email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis, userId]
                );
            } else {
                await connection.execute(
                    'INSERT INTO user_profiles (user_id, email, full_name, iban, kirchengemeinde, kirchspiel, kirchenkreis) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis]
                );
            }

            await connection.commit();

            res.json({ message: 'Profil erfolgreich aktualisiert.' });

        } catch (error) {
            await connection.rollback();
             throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Detaillierter Fehler beim Aktualisieren des Profils:', error);
        res.status(500).json({ message: 'Serverfehler beim Aktualisieren des Profils' });
    }
};

exports.changePassword = async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Neue Passwörter stimmen nicht überein' });
    }

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);

        if (users.length === 0) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(oldPassword, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Altes Passwort ist falsch' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // passwort_geaendert_am mitschreiben: Die Auth-Middleware wirft damit alle
        // Anmeldungen ab, die vor diesem Wechsel ausgestellt wurden.
        await db.execute('UPDATE users SET password = ?, passwort_geaendert_am = NOW() WHERE id = ?', [hashedPassword, req.user.id]);

        // Frisches Token ueber denselben Header, den die gleitende Sitzung
        // nutzt — sonst wuerde die Middleware die eigene Anmeldung im naechsten
        // Aufruf abweisen: Wer sein Passwort aendert, flöge sofort raus.
        // Andere Geraete mit aelteren Token verlieren den Zugang, genau so ist
        // es gemeint. Nur bei JWT: Ein API-Schluessel hat kein Ausstellungsdatum.
        if (!req.mitApiSchluessel) {
          const neuesToken = jwt.sign(
            { id: req.user.id, role: req.user.role, email_verified: req.user.email_verified },
            process.env.JWT_SECRET,
            { expiresIn: TOKEN_LAUFZEIT }
          );
          res.set(ERNEUERUNGS_HEADER, neuesToken);
        }

        res.json({ message: 'Passwort erfolgreich geändert.' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ message: 'Serverfehler beim Ändern des Passworts' });
    }
};