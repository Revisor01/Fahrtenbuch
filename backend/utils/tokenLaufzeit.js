const jwt = require('jsonwebtoken');

// Gleitende Sitzung: läuft nach Inaktivität ab, nicht nach fester Frist, weil sich in Büros mehrere einen Rechner teilen.
const TOKEN_LAUFZEIT = process.env.TOKEN_LAUFZEIT || '14d';

// Erst nach einem spürbaren Teil der Laufzeit erneuern.
const ERNEUERN_AB_ANTEIL = 0.5;

// Muss in CORS exponiert sein.
const ERNEUERUNGS_HEADER = 'X-Token-Erneuert';

// Neues Token ab halber Laufzeit, sonst null; bewusst ohne Refresh-Token, das serverseitigen Widerruf bräuchte.
function erneuereBeiBedarf(decoded, res) {
  if (!decoded?.exp || !decoded?.iat) return null;

  const jetzt = Math.floor(Date.now() / 1000);
  const gesamt = decoded.exp - decoded.iat;
  const verstrichen = jetzt - decoded.iat;

  if (gesamt <= 0 || verstrichen < gesamt * ERNEUERN_AB_ANTEIL) return null;

  // iat/exp vergibt jwt.sign neu.
  const neuesToken = jwt.sign(
    { id: decoded.id, role: decoded.role, email_verified: decoded.email_verified },
    process.env.JWT_SECRET,
    { expiresIn: TOKEN_LAUFZEIT }
  );

  res.set(ERNEUERUNGS_HEADER, neuesToken);
  return neuesToken;
}

module.exports = {
  TOKEN_LAUFZEIT,
  ERNEUERUNGS_HEADER,
  erneuereBeiBedarf,
};
