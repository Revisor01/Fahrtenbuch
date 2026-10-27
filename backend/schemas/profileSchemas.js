const { z } = require('zod');

const updateProfileSchema = z.object({
  email: z.string().email('Ungueltige E-Mail-Adresse').optional(),
  fullName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  kirchengemeinde: z.string().optional().nullable(),
  kirchspiel: z.string().optional().nullable(),
  kirchenkreis: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Altes Passwort ist erforderlich'),
  // Mindestens 8 wie in der Oberfläche; der Login prüft nur min(1), niemand wird ausgesperrt.
  newPassword: z.string().min(8, 'Neues Passwort muss mindestens 8 Zeichen lang sein'),
  confirmPassword: z.string().min(1, 'Passwort-Bestätigung ist erforderlich'),
});

// Konto selbst löschen, Pflicht in den Stores; mit Passwort gegen fremde offene Geräte.
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Passwort ist zur Bestätigung erforderlich'),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
};
