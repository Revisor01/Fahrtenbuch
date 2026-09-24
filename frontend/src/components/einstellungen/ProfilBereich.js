import React, { useState, useEffect, useContext } from 'react';
import logFehler from '../../utils/logFehler';

// Muss zu backend/schemas/profileSchemas.js passen — und zu SetPassword.js.
// Der Wert stand hier auf 8, waehrend der Server kurzzeitig 10 verlangte:
// Die Pruefliste zeigte einen gruenen Punkt, und das Speichern scheiterte
// trotzdem mit „Validierungsfehler". Jetzt fordern beide Seiten 8.
const PASSWORT_MINDESTLAENGE = 8;
import axios from 'axios';
import { Home, AlertTriangle, Trash2 } from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import Sheet from '../ui/Sheet';
import Spinner from '../ui/Spinner';
import fehlerText from '../../utils/fehlerText';
import BereichKopf from './BereichKopf';

// Profil & Passwort: persönliche Daten für die Abrechnung + Passwortwechsel.
// Formulare bleiben Seiteninhalt (mehrfeldrig, kein Sheet).
function ProfilBereich() {
  const { setUser, refreshAllData, orte, updateOrt, logout, fetchCurrentUser } = useContext(AppContext);
  const toast = useToast();
  const [profile, setProfile] = useState({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [wohnortLaeuft, setWohnortLaeuft] = useState(false);
  const [loeschenOffen, setLoeschenOffen] = useState(false);
  const [loeschPasswort, setLoeschPasswort] = useState('');
  const [loeschenLaeuft, setLoeschenLaeuft] = useState(false);

  const schliesseLoeschen = () => {
    setLoeschenOffen(false);
    setLoeschPasswort('');
  };

  // Konto endgueltig loeschen. Der Server prueft das Passwort noch einmal und
  // raeumt in einer Transaktion alles ab, was am Konto haengt.
  const loescheKonto = async () => {
    if (!loeschPasswort || loeschenLaeuft) return;
    setLoeschenLaeuft(true);
    try {
      await axios.delete('/api/profile', { data: { password: loeschPasswort } });
      // Erst abmelden, dann melden: Ohne Konto wuerde jeder weitere Abruf in
      // ein 401 laufen und die Oberflaeche in einen unklaren Zustand bringen.
      schliesseLoeschen();
      logout();
      toast.success('Konto und alle Daten wurden gelöscht.');
    } catch (error) {
      console.error(
        'Konto konnte nicht gelöscht werden:',
        error.response?.status || error.code || 'Netzfehler'
      );
      toast.error(fehlerText(error, 'Konto konnte nicht gelöscht werden.'));
      setLoeschenLaeuft(false);
    }
  };

  // Der als Wohnort markierte Ort liefert die Anschrift fürs Abrechnungsformular
  const wohnort = (orte || []).find((o) => o.ist_wohnort);
  const orteOhneWohnort = (orte || []).filter((o) => !o.ist_wohnort);

  // Der Server erzwingt keinen einzelnen Wohnort — ohne das Zuruecksetzen des
  // alten gaebe es zwei, und der Excel-Export nimmt dann einen beliebigen
  // davon als Anschrift.
  const handleWohnortSetzen = async (ortId) => {
    const ort = (orte || []).find((o) => String(o.id) === String(ortId));
    if (!ort) return;
    setWohnortLaeuft(true);
    try {
      if (wohnort && wohnort.id !== ort.id) {
        await updateOrt(wohnort.id, {
          name: wohnort.name,
          adresse: wohnort.adresse,
          ist_wohnort: false,
          ist_dienstort: !!wohnort.ist_dienstort,
          ist_kirchspiel: !!wohnort.ist_kirchspiel,
        });
      }
      await updateOrt(ort.id, {
        name: ort.name,
        adresse: ort.adresse,
        ist_wohnort: true,
        ist_dienstort: false,
        ist_kirchspiel: false,
      });
      toast.success(`${ort.name} ist jetzt dein Wohnort.`);
    } catch (error) {
      logFehler('Fehler beim Setzen des Wohnorts:', error);
      toast.error('Wohnort konnte nicht gesetzt werden.');
    } finally {
      setWohnortLaeuft(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      const profileData = { ...response.data, fullName: response.data.full_name };
      setProfile(profileData);
      setUser((prev) => ({ ...prev, email_verified: profileData.email_verified }));
    } catch (error) {
      logFehler('Fehler beim Abrufen des Profils:', error);
      toast.error('Profil konnte nicht geladen werden.');
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const cleanProfile = { ...profile };
      delete cleanProfile.wohnort;
      delete cleanProfile.wohnort_adresse;
      delete cleanProfile.dienstort;
      delete cleanProfile.dienstort_adresse;
      delete cleanProfile.username;

      await axios.put('/api/profile', cleanProfile);
      toast.success('Profil aktualisiert.');
      // fetchProfile fuellt nur dieses Formular; den Namen fuer die
      // Begruessung auf der Startseite haelt `user` im Context. Ohne
      // fetchCurrentUser stand dort nach einer Namensaenderung bis zum
      // naechsten Start der alte Name.
      //
      // Mit await: Sonst laeuft der Abruf neben refreshAllData weiter, und
      // ein Wechsel der Ansicht unmittelbar danach zeigt noch den alten
      // Stand.
      await Promise.all([fetchProfile(), fetchCurrentUser()]);
      await refreshAllData();
    } catch (error) {
      logFehler('Fehler beim Aktualisieren des Profils:', error);
      toast.error('Profil konnte nicht aktualisiert werden.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    try {
      await axios.put('/api/profile/change-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      });
      toast.success('Passwort geändert.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      // Nur der Status — error.config.data enthaelt hier altes UND neues
      // Passwort im Klartext und landet sonst im Geraetelog.
      console.error(
        'Passwortwechsel fehlgeschlagen:',
        error.response?.status || error.code || 'Netzfehler'
      );
      toast.error(error.response?.data?.message || 'Passwort konnte nicht geändert werden.');
    }
  };

  const handleResendVerification = async () => {
    try {
      await axios.post('/api/users/resend-verification', { email: profile.email });
      toast.success('Verifizierungs-E-Mail erneut gesendet.');
    } catch (error) {
      logFehler('Fehler beim Senden der Verifizierungs-E-Mail:', error);
      toast.error('Verifizierungs-E-Mail konnte nicht gesendet werden.');
    }
  };

  const pruefungen = [
    { ok: newPassword.length >= PASSWORT_MINDESTLAENGE, text: `Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen` },
    { ok: /[A-Z]/.test(newPassword), text: 'Großbuchstaben' },
    { ok: /[a-z]/.test(newPassword), text: 'Kleinbuchstaben' },
    { ok: /\d/.test(newPassword), text: 'Mindestens eine Zahl' },
  ];

  return (
    <div>
      <BereichKopf
        titel="Profil & Passwort"
        satz="Deine Daten erscheinen auf den Abrechnungen — halte sie aktuell."
      />

      {/* Wohnort: geht als Anschrift ins Abrechnungsformular. Fehlt er, bleibt
          das Feld dort leer — deshalb steht der Hinweis ganz oben und nicht
          versteckt unter „Orte". */}
      <div className={`profil-wohnort${wohnort ? '' : ' is-fehlt'}`}>
        <span className="profil-wohnort-icon" aria-hidden="true">
          {wohnort ? <Home size={18} /> : <AlertTriangle size={18} />}
        </span>
        <div className="profil-wohnort-text">
          <h3>{wohnort ? 'Dein Wohnort' : 'Kein Wohnort festgelegt'}</h3>
          {wohnort ? (
            <p>
              <strong>{wohnort.name}</strong>
              {wohnort.adresse ? ` · ${wohnort.adresse}` : ''}
              <br />
              Diese Anschrift steht auf deinen Abrechnungen.
            </p>
          ) : (
            <p>
              Für die Abrechnung braucht es deine Anschrift. Wähle einen deiner
              gespeicherten Orte als Wohnort — er erscheint dann im
              Abrechnungsformular.
            </p>
          )}

          {orteOhneWohnort.length > 0 && (
            <div className="profil-wohnort-wahl">
              <label className="form-label" htmlFor="wohnort-wahl">
                {wohnort ? 'Anderen Ort als Wohnort festlegen' : 'Ort als Wohnort festlegen'}
              </label>
              <select
                id="wohnort-wahl"
                className="form-select"
                value=""
                onChange={(e) => e.target.value && handleWohnortSetzen(e.target.value)}
                disabled={wohnortLaeuft}
              >
                <option value="">Ort auswählen…</option>
                {orteOhneWohnort.map((ort) => (
                  <option key={ort.id} value={ort.id}>
                    {ort.name}{ort.adresse ? ` — ${ort.adresse}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {orte?.length === 0 && (
            <p className="profil-wohnort-leer">
              Du hast noch keine Orte gespeichert. Lege deine Adresse unter
              „Orte &amp; Distanzen" an und komm dann hierher zurück.
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleProfileUpdate} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="profil-email">E-Mail</label>
          <input
            id="profil-email"
            type="email"
            value={profile.email || ''}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className="form-input"
          />
          <div className="flex justify-end mt-1">
            {profile.email_verified ? (
              <span className="text-sm" style={{ color: 'var(--ok)' }}>Verifiziert</span>
            ) : (
              <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--accent-text)' }}>
                Ausstehend
                <button
                  type="button"
                  onClick={handleResendVerification}
                  className="underline"
                  style={{ color: 'var(--brand)' }}
                >
                  Erneut senden
                </button>
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="form-label" htmlFor="profil-name">Voller Name</label>
          <input
            id="profil-name"
            type="text"
            value={profile.fullName || ''}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            className="form-input"
            placeholder="z.B. Max Mustermann"
          />
        </div>

        <div>
          <label className="form-label" htmlFor="profil-iban">IBAN</label>
          <input
            id="profil-iban"
            type="text"
            value={profile.iban || ''}
            onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
            className="form-input"
            placeholder="DE12 3456 7890 1234 5678 90"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label" htmlFor="profil-gemeinde">Kirchengemeinde</label>
            <input
              id="profil-gemeinde"
              type="text"
              value={profile.kirchengemeinde || ''}
              onChange={(e) => setProfile({ ...profile, kirchengemeinde: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="profil-kirchspiel">Kirchspiel</label>
            <input
              id="profil-kirchspiel"
              type="text"
              value={profile.kirchspiel || ''}
              onChange={(e) => setProfile({ ...profile, kirchspiel: e.target.value })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label" htmlFor="profil-kirchenkreis">Kirchenkreis</label>
            <input
              id="profil-kirchenkreis"
              type="text"
              value={profile.kirchenkreis || ''}
              onChange={(e) => setProfile({ ...profile, kirchenkreis: e.target.value })}
              className="form-input"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary mobile-full">Speichern</button>
        </div>
      </form>

      <hr className="set-divider" />

      <div className="set-subhead">Passwort ändern</div>
      <p className="set-subsatz">{`Mindestens ${PASSWORT_MINDESTLAENGE} Zeichen, mit Groß- und Kleinbuchstaben und einer Zahl.`}</p>

      <form onSubmit={handlePasswordChange} className="space-y-4">
        <div>
          <label className="form-label" htmlFor="pw-alt">Aktuelles Passwort</label>
          <input
            id="pw-alt"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div>
          <label className="form-label" htmlFor="pw-neu">Neues Passwort</label>
          <input
            id="pw-neu"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="form-input"
            required
          />
          {newPassword && (
            <ul className="mt-2 space-y-1 text-sm" style={{ listStyle: 'none', padding: 0 }}>
              {pruefungen.map((p) => (
                <li
                  key={p.text}
                  className="flex items-center gap-2"
                  style={{ color: p.ok ? 'var(--ok)' : 'var(--text-3)' }}
                >
                  <span aria-hidden="true">{p.ok ? '●' : '○'}</span>
                  <span>{p.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="form-label" htmlFor="pw-wdh">Passwort bestätigen</label>
          <input
            id="pw-wdh"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary mobile-full">Passwort ändern</button>
        </div>
      </form>

      {/* Konto loeschen — Pflicht fuer App Store und Play Store: Wo man ein
          Konto anlegen kann, muss man es auch wieder loeschen koennen
          (Apple 5.1.1 v). Bisher ging das nur ueber eine Administratorin. */}
      <hr className="set-divider" />
      <div className="set-subhead">Konto löschen</div>
      <p className="set-subsatz">
        Dabei werden alle Fahrten, Orte, Abrechnungsträger und Abrechnungen
        endgültig gelöscht. Das lässt sich nicht rückgängig machen.
      </p>
      <div className="flex justify-end">
        <button
          type="button"
          className="btn-destructive mobile-full"
          onClick={() => setLoeschenOffen(true)}
        >
          <Trash2 size={16} />
          Konto löschen
        </button>
      </div>

      <Sheet
        isOpen={loeschenOffen}
        onClose={() => (loeschenLaeuft ? null : schliesseLoeschen())}
        title="Konto endgültig löschen"
      >
        <div className="fav-frage">
          <p className="fav-frage-text">
            Alle Fahrten, Orte, Abrechnungsträger und Abrechnungen werden
            gelöscht. Das lässt sich nicht rückgängig machen.
          </p>
          <div>
            <label className="form-label" htmlFor="loesch-pw">
              Zur Bestätigung das Passwort eingeben
            </label>
            <input
              id="loesch-pw"
              type="password"
              autoComplete="current-password"
              value={loeschPasswort}
              onChange={(e) => setLoeschPasswort(e.target.value)}
              className="form-input"
              disabled={loeschenLaeuft}
            />
          </div>
          <button
            type="button"
            className="btn-destructive w-full"
            onClick={loescheKonto}
            disabled={loeschenLaeuft || !loeschPasswort}
          >
            {loeschenLaeuft ? <Spinner /> : <Trash2 size={16} />}
            {loeschenLaeuft ? 'Wird gelöscht …' : 'Endgültig löschen'}
          </button>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={schliesseLoeschen}
            disabled={loeschenLaeuft}
          >
            Abbrechen
          </button>
        </div>
      </Sheet>
    </div>
  );
}

export default ProfilBereich;
