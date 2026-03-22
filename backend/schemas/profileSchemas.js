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
  newPassword: z.string().min(6, 'Neues Passwort muss mindestens 6 Zeichen lang sein'),
  confirmPassword: z.string().min(1, 'Passwort-Bestaetigung ist erforderlich'),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
};
