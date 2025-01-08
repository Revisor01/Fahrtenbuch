const nodemailer = require('nodemailer');

class MailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            },
            logger: true,
            debug: true
        });
    }
    
    async sendWelcomeEmail(email, username, token) {
        const resetLink = `${process.env.FRONTEND_URL}/set-password?token=${token}`;
        
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: 'Willkommen beim Fahrtenbuch',
            html: `
                <h1>Willkommen beim Fahrtenbuch!</h1>
                <p>Hallo ${username},</p>
                <p>Ihr Account wurde erfolgreich erstellt. Bitte klicken Sie auf den folgenden Link, um Ihr Passwort festzulegen:</p>
                <p><a href="${resetLink}">Passwort festlegen</a></p>
                <p>Dieser Link ist 24 Stunden gültig.</p>
                <p>Mit freundlichen Grüßen<br>Ihr Fahrtenbuch-Team</p>
            `
        });
    }

    async sendEmailVerification(email, username, token) {
        const verifyLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
        
        await this.transporter.sendMail({
            from: process.env.MAIL_FROM,
            to: email,
            subject: 'E-Mail-Adresse bestätigen',
            html: `
                <h1>E-Mail-Adresse bestätigen</h1>
                <p>Hallo ${username},</p>
                <p>Bitte bestätigen Sie Ihre neue E-Mail-Adresse durch Klick auf den folgenden Link:</p>
                <p><a href="${verifyLink}">E-Mail bestätigen</a></p>
                <p>Dieser Link ist 24 Stunden gültig.</p>
                <p>Mit freundlichen Grüßen<br>Ihr Fahrtenbuch-Team</p>
            `
        });
    }

    async sendPasswordReset(email, username, token) {
        try {
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
            
            console.log('Sending password reset email with data:', {
                email,
                username,
                resetLink
            });
            
            const info = await this.transporter.sendMail({
                from: process.env.MAIL_FROM,
                to: email,
                subject: 'Passwort zurücksetzen',
                html: `
                <h1>Passwort zurücksetzen</h1>
                <p>Hallo ${username},</p>
                <p>Sie haben angefordert, Ihr Passwort zurückzusetzen. Klicken Sie auf den folgenden Link:</p>
                <p><a href="${resetLink}">Passwort zurücksetzen</a></p>
                <p>Dieser Link ist 24 Stunden gültig.</p>
                <p>Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>
                <p>Mit freundlichen Grüßen<br>Ihr Fahrtenbuch-Team</p>
            `
            });
            console.log("Nachricht verschickt: %s", info.messageId);
        } catch (error) {
            console.error('Fehler beim senden des Passwort Reset Links:', error);
            throw error;
        }
    }
}

module.exports = new MailService();