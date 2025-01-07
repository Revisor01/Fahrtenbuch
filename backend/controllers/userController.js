const db = require('../config/database');
const User = require('../models/User');
const mailService = require('../services/mailService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

exports.getAllUsers = async (req, res) => {
    try {
        // Prüfe ob der anfragende User ein Admin ist
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }

        const users = await User.getAllUsers();
        res.json(users);
    } catch (error) {
        console.error('Fehler beim Abrufen der Benutzer:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
    }
};

exports.createUser = async (req, res) => {
    try {
        // Prüfe ob der anfragende User ein Admin ist
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }

        const { username, email, role = 'user' } = req.body;

        // Prüfe ob die E-Mail bereits existiert
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'Diese E-Mail-Adresse wird bereits verwendet' });
        }

        // Erstelle den neuen User
        const { id, verificationToken } = await User.create({
            username,
            email,
            role
        });

        // Sende Willkommens-E-Mail mit Link zur Passwort-Erstellung
        await mailService.sendWelcomeEmail(email, username, verificationToken);

        res.status(201).json({
            message: 'Benutzer erfolgreich erstellt. Eine E-Mail mit weiteren Anweisungen wurde versendet.',
            userId: id
        });
    } catch (error) {
        console.error('Fehler beim Erstellen des Benutzers:', error);
        res.status(500).json({ message: 'Interner Server-Fehler' });
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
        const { username, email, role } = req.body;

        // Prüfe Berechtigungen
        if (req.user.role !== 'admin' && req.user.id !== parseInt(id)) {
            return res.status(403).json({ message: 'Keine Berechtigung für diese Aktion' });
        }

        // Wenn ein normaler User versucht die Rolle zu ändern
        if (req.user.role !== 'admin' && role) {
            return res.status(403).json({ message: 'Keine Berechtigung, die Rolle zu ändern' });
        }

        // Prüfe bei E-Mail-Änderung ob die neue E-Mail bereits existiert
        if (email) {
            const existingUser = await User.findByEmail(email);
            if (existingUser && existingUser.id !== parseInt(id)) {
                return res.status(400).json({ message: 'Diese E-Mail-Adresse wird bereits verwendet' });
            }
        }

        const currentUser = await User.findById(id);
        if (!currentUser) {
            return res.status(404).json({ message: 'Benutzer nicht gefunden' });
        }

        // Bei E-Mail-Änderung Verifikation starten
        if (email && email !== currentUser.email) {
            const verificationToken = crypto.randomBytes(32).toString('hex');
            await mailService.sendEmailVerification(email, username || currentUser.username, verificationToken);
        }

        await User.updateProfile(id, req.body);
        res.json({ message: 'Benutzerprofil erfolgreich aktualisiert' });
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
        const success = await User.resetPassword(token, newPassword);
        
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