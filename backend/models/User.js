const db = require('../config/database');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class User {
    static async create(userData) {
        const { username, email, role = 'user', password = null } = userData;
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            
            let hashedPassword = null;
            if (password) {
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            }

            const [result] = await connection.execute(
                'INSERT INTO users (username, email, password, role, verification_token) VALUES (?, ?, ?, ?, ?)',
                [username, email, hashedPassword, role, verificationToken]
            );

            await connection.commit();
            return { id: result.insertId, verificationToken };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findById(id) {
        const [rows] = await db.execute(
            'SELECT id, username, email, role, email_verified FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    static async findByEmail(email) {
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    static async updateProfile(id, userData) {
        const { username, email, full_name } = userData;
        const [result] = await db.execute(
            'UPDATE users SET username = ?, email = ?, full_name = ? WHERE id = ?',
            [username, email, full_name, id]
        );
        return result.affectedRows > 0;
    }

    static async verifyEmail(token) {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const [rows] = await connection.execute(
                'SELECT * FROM email_verifications WHERE verification_token = ? AND expires_at > NOW()',
                [token]
            );

            if (rows.length === 0) {
                throw new Error('Invalid or expired verification token');
            }

            const verification = rows[0];

            await connection.execute(
                'UPDATE users SET email = ?, email_verified = TRUE WHERE id = ?',
                [verification.new_email, verification.user_id]
            );

            await connection.execute(
                'DELETE FROM email_verifications WHERE id = ?',
                [verification.id]
            );

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async initiatePasswordReset(email) {
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const [result] = await db.execute(
            'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE email = ?',
            [token, expires, email]
        );

        if (result.affectedRows === 0) {
            throw new Error('No user found with this email address');
        }

        return token;
    }

    static async resetPassword(token, newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await db.execute(
            'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE password_reset_token = ? AND password_reset_expires > NOW()',
            [hashedPassword, token]
        );

        return result.affectedRows > 0;
    }

    static async getAllUsers() {
        const [rows] = await db.execute(
            'SELECT id, username, email, role, email_verified, created_at, updated_at FROM users'
        );
        return rows;
    }

    static async setPassword(id, newPassword) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const [result] = await db.execute(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );

        return result.affectedRows > 0;
    }

    static async delete(id) {
        const [result] = await db.execute(
            'DELETE FROM users WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = User;