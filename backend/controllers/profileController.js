const db = require('../config/database');
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

    console.log('Received profile update request:', req.body);
    console.log('User ID:', req.user.id);

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
            let result;
            if (existingProfile.length > 0) {
                result = await connection.execute(
                    'UPDATE user_profiles SET email = ?, full_name = ?, iban = ?, kirchengemeinde = ?, kirchspiel = ?, kirchenkreis = ? WHERE user_id = ?',
                    [email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis, userId]
                );
            } else {
                result = await connection.execute(
                    'INSERT INTO user_profiles (user_id, email, full_name, iban, kirchengemeinde, kirchspiel, kirchenkreis) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis]
                );
            }

            await connection.commit();

            console.log('Database operation result:', result);

            res.json({ message: 'Profil erfolgreich aktualisiert.' });

        } catch (error) {
            await connection.rollback();
             throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Detaillierter Fehler beim Aktualisieren des Profils:', error);
        res.status(500).json({
            message: 'Serverfehler beim Aktualisieren des Profils',
            error: error.message,
            stack: error.stack
        });
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

        await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Passwort erfolgreich geändert.' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ message: 'Serverfehler beim Ändern des Passworts' });
    }
};