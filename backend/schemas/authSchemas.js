const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(1, 'Benutzername ist erforderlich'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50),
  email: z.string().email('Ungueltige E-Mail-Adresse'),
});

module.exports = {
  loginSchema,
  registerSchema,
};
