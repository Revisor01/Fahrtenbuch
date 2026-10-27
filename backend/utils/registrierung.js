// Registrierung nur bei ausdrücklichem `true` oder ohne Angabe, an beiden Stellen gleich gelesen.
function registrierungErlaubt() {
  const wert = process.env.ALLOW_REGISTRATION;
  if (wert === undefined || wert === '') return true;
  return wert.trim().toLowerCase() === 'true';
}

module.exports = { registrierungErlaubt };
