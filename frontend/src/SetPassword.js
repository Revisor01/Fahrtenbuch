import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthLogo } from './components/LoginPage';
import { appConfigValue } from './utils/appConfig';

// Passwort setzen/zurücksetzen im Anmelde-Layout (Spec Screen 8):
// Vollfläche --brand, zentrierte Formularkarte. Bedient beide Routen —
// /set-password (Erstvergabe) und /reset-password (Reset-Link).
export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const istReset = location.pathname.includes('reset-password');
  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (!token) {
      setStatus({ type: 'error', message: 'Ungültiger oder fehlender Token.' });
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Die Passwörter stimmen nicht überein.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = istReset
        ? '/api/users/reset-password/verify'
        : '/api/users/set-password';

      await axios.post(endpoint, { token, newPassword: password });

      setStatus({
        type: 'success',
        message: 'Passwort wurde erfolgreich gesetzt. Du wirst zur Anmeldung weitergeleitet …',
      });
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      setStatus({
        type: 'error',
        message:
          error.response?.data?.message ||
          'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
      });
    }
    setIsSubmitting(false);
  };

  const validatePassword = (value) =>
    value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value);

  const pruefungen = [
    { ok: password.length >= 8, text: 'Mindestens 8 Zeichen' },
    { ok: /[A-Z]/.test(password), text: 'Großbuchstaben' },
    { ok: /[a-z]/.test(password), text: 'Kleinbuchstaben' },
    { ok: /\d/.test(password), text: 'Mindestens eine Zahl' },
  ];

  const appTitle =
    appConfigValue('appTitle', import.meta.env.VITE_TITLE, 'Fahrtenbuch Kirchenkreis Dithmarschen');

  return (
    <div className="auth-page">
      <div className="auth-box">
        <AuthLogo />
        <h1 className="auth-titel">{istReset ? 'Neues Passwort' : 'Passwort festlegen'}</h1>
        <div className="auth-sub">{appTitle}</div>

        <div className="auth-card">
          <form onSubmit={handleSubmit}>
            <label className="form-label" htmlFor="set-pass">Neues Passwort</label>
            <input
              id="set-pass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              disabled={isSubmitting || !token}
            />
            {password && (
              <ul className="space-y-1 text-sm" style={{ listStyle: 'none', padding: 0, margin: '-8px 0 16px' }}>
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

            <label className="form-label" htmlFor="set-pass-wdh">Passwort bestätigen</label>
            <input
              id="set-pass-wdh"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="form-input"
              required
              disabled={isSubmitting || !token}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="auth-hinweis" style={{ color: 'var(--danger)' }}>
                Die Passwörter stimmen nicht überein.
              </p>
            )}

            {status.message && (
              <div
                className={status.type === 'success' ? 'status-success' : 'status-error'}
                style={{ marginBottom: 16 }}
              >
                {status.message}
              </div>
            )}

            <button
              type="submit"
              className="auth-btn"
              disabled={isSubmitting || !token || !validatePassword(password) || password !== confirmPassword}
            >
              {isSubmitting ? 'Wird verarbeitet …' : 'Passwort setzen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
