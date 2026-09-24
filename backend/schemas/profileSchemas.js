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
  // 10 statt 6 (24.09.2026): In diesem Konto stehen IBAN und ein
  // Bewegungsprofil. Niemand wird dadurch ausgesperrt — das Anmelde-Schema
  // (authSchemas) prueft bewusst nur min(1), die Laenge gilt allein bei der
  // Neuvergabe. Bestehende kuerzere Passwoerter funktionieren weiter.
  newPassword: z.string().min(10, 'Neues Passwort muss mindestens 10 Zeichen lang sein'),
  confirmPassword: z.string().min(1, 'Passwort-Bestätigung ist erforderlich'),
});

// Konto selbst loeschen. Apple (5.1.1 v) und Google verlangen, dass eine App,
// in der man ein Konto anlegen kann, es auch wieder loeschen laesst — und zwar
// in der App, nicht per Mail an eine Verwaltung.
//
// Das Passwort ist Pflicht: Wer ein fremdes, offenes Geraet in die Hand
// bekommt, soll damit nicht das Konto samt aller Fahrten loeschen koennen.
const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Passwort ist zur Bestätigung erforderlich'),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
};
