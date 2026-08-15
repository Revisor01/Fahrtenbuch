const jwt = require('jsonwebtoken');

// Gleitende Sitzung: Die Anmeldung laeuft nicht nach fester Frist ab, sondern
// nach einer Zeit ohne Nutzung.
//
// Vorher galt ein Token genau einen Tag. Das zwang alle taeglich zur
// Neuanmeldung und macht die Erfassung ohne Netz unmoeglich — wer unterwegs
// mehrere Tage Fahrten sammelt, waere beim Uebertragen abgemeldet.
//
// Eine schlicht laengere Frist waere das falsche Mittel: In Gemeindebueros
// teilen sich mehrere Menschen einen Rechner. Wer sich dort nicht abmeldet,
// haette seine Abrechnungsdaten wochenlang fuer die naechste Person offen.
//
// Deshalb wird das Token bei Nutzung erneuert. Wer regelmaessig arbeitet,
// bleibt dauerhaft angemeldet; ein liegengelassener Browser laeuft nach
// INAKTIVITAET ab.
const TOKEN_LAUFZEIT = process.env.TOKEN_LAUFZEIT || '14d';

// Erneuert wird erst, wenn ein spuerbarer Teil der Laufzeit verstrichen ist.
// Bei jedem Request ein neues Token auszustellen waere unnoetige Rechenlast
// und wuerde den Wert im Speicher der App staendig neu schreiben.
const ERNEUERN_AB_ANTEIL = 0.5;

// Name des Headers, ueber den ein erneuertes Token zurueckkommt. Muss in der
// CORS-Konfiguration exponiert sein, sonst kann der Browser ihn nicht lesen.
const ERNEUERUNGS_HEADER = 'X-Token-Erneuert';

// Stellt ein neues Token aus, wenn die Haelfte der Laufzeit vorbei ist.
// Gibt das neue Token zurueck oder null, wenn keine Erneuerung noetig war.
//
// Bewusst kein Refresh-Token-Verfahren: Das waere der sauberere Weg fuer
// oeffentliche Clients, verlangt aber Speicherung und Widerruf serverseitig.
// Fuer diese App — ein Nutzerkreis, eigener Server — ist das gleitende
// Ablaufdatum der angemessene Kompromiss.
function erneuereBeiBedarf(decoded, res) {
  if (!decoded?.exp || !decoded?.iat) return null;

  const jetzt = Math.floor(Date.now() / 1000);
  const gesamt = decoded.exp - decoded.iat;
  const verstrichen = jetzt - decoded.iat;

  if (gesamt <= 0 || verstrichen < gesamt * ERNEUERN_AB_ANTEIL) return null;

  // Nur die fachlichen Angaben uebernehmen: iat/exp vergibt jwt.sign neu,
  // ein Mitschleifen wuerde die alte Gueltigkeit fortschreiben.
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
