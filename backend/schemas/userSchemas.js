const { z } = require('zod');

const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  role: z.enum(['admin', 'user']).optional().default('user'),
  fullName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  kirchengemeinde: z.string().optional().nullable(),
  kirchspiel: z.string().optional().nullable(),
  kirchenkreis: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user']).optional(),
  fullName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  kirchengemeinde: z.string().optional().nullable(),
  kirchspiel: z.string().optional().nullable(),
  kirchenkreis: z.string().optional().nullable(),
});

const resetPasswordRequestSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  newPassword: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
});

const setPasswordSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
  newPassword: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token ist erforderlich'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Aktuelles Passwort ist erforderlich'),
  newPassword: z.string().min(6, 'Neues Passwort muss mindestens 6 Zeichen lang sein'),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  resetPasswordRequestSchema,
  resetPasswordSchema,
  setPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  changePasswordSchema,
};
