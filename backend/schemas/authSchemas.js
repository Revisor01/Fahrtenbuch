const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Benutzername ist erforderlich'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
  // Wird vom Frontend mitgesendet; muss durchs Schema, da validate() unbekannte Keys strippt
  registrationCode: z.string().optional(),
});

module.exports = {
  loginSchema,
  registerSchema,
};
