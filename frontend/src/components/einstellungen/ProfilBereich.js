import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import BereichKopf from './BereichKopf';

// Profil & Passwort: persönliche Daten für die Abrechnung + Passwortwechsel.
// Formulare bleiben Seiteninhalt (mehrfeldrig, kein Sheet).
function ProfilBereich() {
  const { setUser, refreshAllData } = useContext(AppContext);
  const toast = useToast();
  const [profile, setProfile] = useState({});
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile');
      const profileData = { ...response.data, fullName: response.data.full_name };
      setProfile(profileData);
      setUser((prev) => ({ ...prev, email_verified: profileData.email_verified }));
    } catch (error) {
      console.error('Fehler beim Abrufen des Profils:', error);
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
      fetchProfile();
      await refreshAllData();
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error);
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
      console.error('Fehler beim Ändern des Passworts:', error);
      toast.error(error.response?.data?.message || 'Passwort konnte nicht geändert werden.');
    }
  };

  const handleResendVerification = async () => {
    try {
      await axios.post('/api/users/resend-verification', { email: profile.email });
      toast.success('Verifizierungs-E-Mail erneut gesendet.');
    } catch (error) {
      console.error('Fehler beim Senden der Verifizierungs-E-Mail:', error);
      toast.error('Verifizierungs-E-Mail konnte nicht gesendet werden.');
    }
  };

  const pruefungen = [
    { ok: newPassword.length >= 8, text: 'Mindestens 8 Zeichen' },
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
      <p className="set-subsatz">Mindestens 8 Zeichen, mit Groß- und Kleinbuchstaben und einer Zahl.</p>

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
    </div>
  );
}

export default ProfilBereich;
