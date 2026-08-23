// Ob die Registrierung offensteht, wurde an zwei Stellen unterschiedlich
// beantwortet: konfigController prüfte `!== 'false'`, authController dagegen
// `gesetzt && !== 'true'`. Bei einem Wert wie `0` oder `nein` zeigte die App
// deshalb ein Registrierungsformular, dessen Absenden der Server mit 403
// abwies (24.08.).
//
// Es gilt die strengere Lesart: Nur ein ausdrückliches `true` (oder gar keine
// Angabe) erlaubt die Registrierung. Alles andere sperrt sie — wer sie
// abschalten will, soll sich nicht auf die Schreibweise verlassen müssen.
function registrierungErlaubt() {
  const wert = process.env.ALLOW_REGISTRATION;
  if (wert === undefined || wert === '') return true;
  return wert.trim().toLowerCase() === 'true';
}

module.exports = { registrierungErlaubt };
