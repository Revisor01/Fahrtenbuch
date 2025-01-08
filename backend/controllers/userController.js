const db = require('../config/database');
const User = require('../models/User');
const mailService = require('../services/mailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.getAllUsers = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }
        
        // Gleiche Struktur wie im profileController
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
            LEFT JOIN orte d ON u.id = d.user_id AND d.ist_dienstort = 1`
        );
        
        res.json(rows);
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
        
        // Debug-Logging für Mail-Service
        console.log('Sending welcome email with data:', {
            email,
            username,
            verificationToken,
            FRONTEND_URL: process.env.FRONTEND_URL
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
            if (email && existingProfile.length > 0 && email !== existingProfile[0].email) {
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
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) {
            // Aus Sicherheitsgründen geben wir die gleiche Erfolgsmeldung zurück
            return res.json({ message: 'Wenn ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.' });
        }

        const resetToken = await User.initiatePasswordReset(email);
        await mailService.sendPasswordReset(email, user.username, resetToken);

        res.json({ message: 'Wenn ein Account mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen des Passworts versendet.' });
    } catch (error) {
        console.error('Fehler beim Anfordern des Passwort-Resets:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
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
        const user = await User.findByEmail(req.body.email);
        const success = await User.setPassword(user.id, newPassword);
        
        if (!success) {
            return res.status(400).json({ message: 'Ungültiger oder abgelaufener Token' });
        }
        
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