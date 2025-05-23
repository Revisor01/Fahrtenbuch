const db = require('../config/database');
const User = require('../models/User');
const mailService = require('../services/mailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// In userController.js - Methode getAllUsers
exports.getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }
        
        // ANY_VALUE für nicht-Gruppierungsspalten verwenden
        const [users] = await db.execute(`
            SELECT 
                u.id, 
                ANY_VALUE(u.username) as username, 
                ANY_VALUE(u.role) as role, 
                ANY_VALUE(u.email_verified) as email_verified,
                ANY_VALUE(p.email) as email,
                ANY_VALUE(p.full_name) as full_name,
                ANY_VALUE(p.iban) as iban,
                ANY_VALUE(p.kirchengemeinde) as kirchengemeinde, 
                ANY_VALUE(p.kirchspiel) as kirchspiel, 
                ANY_VALUE(p.kirchenkreis) as kirchenkreis,
                ANY_VALUE(o.name) as wohnort,
                ANY_VALUE(o.adresse) as wohnort_adresse
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id 
            LEFT JOIN orte o ON u.id = o.user_id AND o.ist_wohnort = 1
            GROUP BY u.id
        `);
        
        // Für jeden Benutzer den ersten Dienstort separat abfragen
        for (const user of users) {
            const [dienstorte] = await db.execute(`
                SELECT name as dienstort, adresse as dienstort_adresse 
                FROM orte 
                WHERE user_id = ? AND ist_dienstort = 1 
                LIMIT 1
            `, [user.id]);
            
            if (dienstorte.length > 0) {
                user.dienstort = dienstorte[0].dienstort;
                user.dienstort_adresse = dienstorte[0].dienstort_adresse;
            } else {
                user.dienstort = null;
                user.dienstort_adresse = null;
            }
        }
        
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ message: 'Interner Server-Fehler beim Abrufen der Benutzer' });
    }
};

exports.getCurrentUser = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT 
                u.id, 
                u.username, 
                u.role, 
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
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server error' });
    }
};


exports.createUser = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }
        
        const { 
            username, 
            email, 
            role = 'user',
            fullName,
            iban,
            kirchengemeinde,
            kirchspiel,
            kirchenkreis 
        } = req.body;
        
        // Prüfe ob die E-Mail bereits existiert
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Diese E-Mail-Adresse wird bereits verwendet' });
        }
        
        // Erstelle den neuen User mit Profil
        const { id, verificationToken } = await User.createUserWithProfile({
            username,
            email,
            role,
            fullName,
            iban,
            kirchengemeinde,
            kirchspiel,
            kirchenkreis
        });
        
        // Sende Willkommens-E-Mail
        await mailService.sendWelcomeEmail(email, username, verificationToken);
        
        res.status(201).json({
            message: 'Benutzer erfolgreich erstellt. Eine E-Mail mit weiteren Anweisungen wurde versendet.',
            userId: id
        });
    } catch (error) {
        console.error('Detaillierter Fehler beim Erstellen des Benutzers:', error);
        res.status(500).json({ 
            message: 'Fehler beim Erstellen des Benutzers',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

exports.resendVerification = async (req, res) => {
    try {
        const { email } = req.body;
        const userId = req.user.id;
        
        // Prüfe ob der User die E-Mail ändern darf
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }
        
        // Generiere neuen Verifikationstoken
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Speichere den neuen Token
        const [result] = await db.execute(
            'INSERT INTO email_verifications (user_id, new_email, verification_token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
            [userId, email, verificationToken]
        );
        
        // Sende neue Verifikationsmail
        await mailService.sendEmailVerification(email, user.username, verificationToken);
        
        res.json({ message: 'Verifizierungs-E-Mail wurde erneut gesendet' });
    } catch (error) {
        console.error('Fehler beim Senden der Verifikationsmail:', error);
        res.status(500).json({ message: 'Fehler beim Senden der Verifikationsmail' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis } = req.body;
        
        // Berechtigungsprüfung: Nur Admin oder der User selbst darf ändern
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }
        
        // Normale User dürfen keine Rollen ändern
        if (req.user.role !== 'admin' && role) {
            return res.status(403).json({ message: 'Keine Berechtigung, die Rolle zu ändern' });
        }
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            // User-Basisdaten aktualisieren
            await connection.execute(
                'UPDATE users SET username = ?, role = ? WHERE id = ?',
                [username, role, id]
            );
            
            // Profildaten prüfen
            const [existingProfile] = await connection.execute(
                'SELECT * FROM user_profiles WHERE user_id = ?', 
                [id]
            );
            
           // Bei E-Mail-Änderung Verifikation starten
           // Hier wird die Email auch in der Profil Tabelle aktualisiert. Das sollte ok sein, da die Email eh aus dem Profil geholt wird.
           if (email && existingProfile.length > 0 && email !== existingProfile[0].email) {
               // Email verifiziert Status wieder auf 0 setzen
                 await connection.execute(
                    'UPDATE users SET email_verified = FALSE WHERE id = ?',
                    [id]
                );
              
                const verificationToken = crypto.randomBytes(32).toString('hex');
                await connection.execute(
                    'INSERT INTO email_verifications (user_id, new_email, verification_token, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))',
                    [id, email, verificationToken]
                );
                await mailService.sendEmailVerification(email, username, verificationToken);
            }
            
            // Profil aktualisieren/erstellen
            if (existingProfile.length > 0) {
                await connection.execute(
                    'UPDATE user_profiles SET email = ?, full_name = ?, iban = ?, kirchengemeinde = ?, kirchspiel = ?, kirchenkreis = ? WHERE user_id = ?',
                    [email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis, id]
                );
            } else {
                await connection.execute(
                    'INSERT INTO user_profiles (user_id, email, full_name, iban, kirchengemeinde, kirchspiel, kirchenkreis) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [id, email, fullName, iban, kirchengemeinde, kirchspiel, kirchenkreis]
                );
            }
            
            await connection.commit();
            res.json({ message: 'Benutzerprofil erfolgreich aktualisiert' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Benutzers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        // Nur Admins dürfen User löschen
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }

        const { id } = req.params;
        
        // Verhindere, dass der Admin sich selbst löscht
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'Sie können Ihren eigenen Account nicht löschen' });
        }

        const deleted = await User.delete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        res.json({ message: 'Benutzer erfolgreich gelöscht' });
    } catch (error) {
        console.error('Fehler beim Löschen des Benutzers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.body;
        await User.verifyEmail(token);
        res.json({ message: 'E-Mail-Adresse erfolgreich verifiziert' });
    } catch (error) {
        console.error('Fehler bei der E-Mail-Verifizierung:', error);
        res.status(400).json({ message: 'Ungültiger oder abgelaufener Token' });
    }
};

exports.requestPasswordReset = async (req, res) => {
    const { email } = req.body;
    
    try {
        // Erst prüfen ob User existiert
        const user = await User.findByEmail(email);
        if (!user) {
            return res.json({ 
                message: 'Wenn ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.' 
            });
        }
        
        // Token generieren
        const resetToken = await User.initiatePasswordReset(email);
        
        // Mail senden
        await mailService.sendPasswordReset(email, user.username, resetToken);
        
        res.json({ 
            message: 'Wenn ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.' 
        });
    } catch (error) {
        console.error('Error in password reset flow:', error);
        // Generische Fehlermeldung nach außen
        res.status(500).json({ 
            message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.' 
        });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const success = await User.resetPassword(token, newPassword);
        
        if (!success) {
            return res.status(400).json({ message: 'Ungültiger oder abgelaufener Token' });
        }

        res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
    } catch (error) {
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.setPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token und neues Passwort sind erforderlich' });
        }
        
        // Find User by token (egal ob Verification oder Reset token)
        const [rows] = await db.execute(
            'SELECT id FROM users WHERE verification_token = ? OR password_reset_token = ?',
            [token, token]
        );
        
        if (rows.length === 0) {
            return res.status(400).json({ message: 'Ungültiger oder abgelaufener Token' });
        }
        
        const user = rows[0];
        
        // Passwort hashen und setzen
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update user: Setze Passwort, lösche Token und markiere Email als verifiziert
        await db.execute(
            `UPDATE users 
            SET password = ?, 
                verification_token = NULL,
                password_reset_token = NULL,
                email_verified = TRUE 
            WHERE id = ?`,
            [hashedPassword, user.id]
        );
        
        res.json({ message: 'Passwort erfolgreich gesetzt' });
    } catch (error) {
        console.error('Fehler beim Setzen des Passworts:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Prüfe Berechtigungen
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }

        // Admin kann Passwort ohne altes Passwort ändern
        if (req.user.role === 'admin') {
            await User.setPassword(id, newPassword);
        } else {
            // User muss aktuelles Passwort angeben
            const user = await User.findById(id);
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            
            if (!isMatch) {
                return res.status(400).json({ message: 'Aktuelles Passwort ist falsch' });
            }

            await User.setPassword(id, newPassword);
        }

        res.json({ message: 'Passwort erfolgreich geändert' });
    } catch (error) {
        console.error('Fehler beim Ändern des Passworts:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};