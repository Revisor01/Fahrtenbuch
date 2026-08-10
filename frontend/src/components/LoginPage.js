import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AppContext } from '../contexts/AppContext';
import { useToast } from './ui/Toast';
import { appConfigValue } from '../utils/appConfig';

// Anmeldung nach Spec Screen 8: Vollfläche --brand, Logo 52px in
// rgba(255,255,255,.14), Titel 26px/600 --on-brand, Formularkarte
// --surface/--r-card/24px. Registrierung und Passwort-vergessen laufen
// im selben Layout (Kartentausch statt Modal).
export function AuthLogo() {
  return (
    <div className="auth-logo" aria-hidden="true">
      <svg viewBox="0 0 512 512" width="26" height="26">
        <g transform="rotate(-45 256 256)">
          <path
            d="M256 118a138 138 0 1 1 -97.6 40.4"
            fill="none"
            stroke="var(--on-brand)"
            strokeWidth="46"
          />
        </g>
      </svg>
    </div>
  );
}

function LoginPage() {
  const { login, showNotification } = useContext(AppContext);
  const toast = useToast();

  // 'login' | 'register' | 'forgot'
  const [view, setView] = useState('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState(null);
  const [registrationData, setRegistrationData] = useState({
    username: '',
    email: '',
    registrationCode: '',
  });

  const appTitle = appConfigValue('appTitle', process.env.REACT_APP_TITLE, 'Fahrtenbuch Kirchenkreis Dithmarschen');
  const allowRegistration = appConfigValue('allowRegistration', process.env.REACT_APP_ALLOW_REGISTRATION) === 'true';
  const allowedEmailDomains = appConfigValue('allowedEmailDomains', process.env.REACT_APP_ALLOWED_EMAIL_DOMAINS);
  // Nur die Information, OB ein Code verlangt wird. Der Wert selbst stand
  // frueher im oeffentlich abrufbaren config.js und war damit fuer jeden
  // Besucher lesbar; geprueft wird er ohnehin serverseitig.
  const codeErforderlich =
    appConfigValue('registrationCodeRequired', undefined) === true ||
    appConfigValue('registrationCodeRequired', undefined) === 'true' ||
    // Fallback fuer lokale Entwicklung ohne Container-Entrypoint
    Boolean(process.env.REACT_APP_REGISTRATION_CODE);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (error) {
      toast.error('Anmeldung fehlgeschlagen — bitte Zugangsdaten prüfen.');
    }
  };

  const validateEmail = (email) => {
    if (!allowedEmailDomains) return true;
    const domain = email.split('@')[1];
    return allowedEmailDomains.split(',').includes(domain);
  };

  const handleRegistration = async (e) => {
    e.preventDefault();
    if (!validateEmail(registrationData.email)) {
      showNotification('Fehler', 'Diese Email-Domain ist nicht für die Registrierung zugelassen');
      return;
    }
    try {
      // registrationCode wird mitgesendet und serverseitig geprüft
      const response = await axios.post('/api/auth/register', registrationData);
      showNotification('Erfolg', response.data.message);
      setView('login');
    } catch (error) {
      showNotification('Fehler', error.response?.data?.message || 'Registrierung fehlgeschlagen');
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/reset-password/request', { email: forgotEmail });
      setForgotStatus({
        type: 'success',
        message: 'Wenn ein Account mit dieser E-Mail existiert, wurden Anweisungen zum Zurücksetzen versendet.',
      });
    } catch (error) {
      setForgotStatus({
        type: 'error',
        message: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.',
      });
    }
  };

  const wechselZu = (ziel) => {
    setForgotStatus(null);
    setView(ziel);
  };

  const titel =
    view === 'register' ? 'Registrieren' : view === 'forgot' ? 'Passwort zurücksetzen' : 'Anmelden';

  return (
    <div className="auth-page">
      <div className="auth-box">
        <AuthLogo />
        <h1 className="auth-titel">{titel}</h1>
        <div className="auth-sub">{appTitle}</div>

        <div className="auth-card">
          {view === 'login' && (
            <form onSubmit={handleSubmit}>
              <label className="form-label" htmlFor="login-user">Benutzername / E-Mail</label>
              <input
                id="login-user"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-input"
                required
              />
              <label className="form-label" htmlFor="login-pass">Passwort</label>
              <input
                id="login-pass"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                required
              />
              <button type="submit" className="auth-btn">Anmelden</button>
              <div className="auth-links">
                <button type="button" className="auth-link" onClick={() => wechselZu('forgot')}>
                  Passwort vergessen
                </button>
                {allowRegistration && (
                  <button type="button" className="auth-link" onClick={() => wechselZu('register')}>
                    Registrieren
                  </button>
                )}
              </div>
            </form>
          )}

          {view === 'register' && (
            <form onSubmit={handleRegistration}>
              <label className="form-label" htmlFor="reg-user">Benutzername</label>
              <input
                id="reg-user"
                type="text"
                autoComplete="username"
                value={registrationData.username}
                onChange={(e) => setRegistrationData({ ...registrationData, username: e.target.value })}
                className="form-input"
                required
              />
              <label className="form-label" htmlFor="reg-email">E-Mail</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={registrationData.email}
                onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
                className="form-input"
                required
              />
              {allowedEmailDomains && (
                <p className="auth-hinweis">Erlaubte Domains: {allowedEmailDomains}</p>
              )}
              {codeErforderlich && (
                <>
                  <label className="form-label" htmlFor="reg-code">Registrierungscode</label>
                  <input
                    id="reg-code"
                    type="text"
                    value={registrationData.registrationCode}
                    onChange={(e) =>
                      setRegistrationData({ ...registrationData, registrationCode: e.target.value })
                    }
                    className="form-input"
                    required
                  />
                </>
              )}
              <button type="submit" className="auth-btn">Registrieren</button>
              <div className="auth-links">
                <button type="button" className="auth-link" onClick={() => wechselZu('login')}>
                  Zurück zur Anmeldung
                </button>
              </div>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgot}>
              <label className="form-label" htmlFor="forgot-email">E-Mail-Adresse</label>
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="form-input"
                required
              />
              {forgotStatus && (
                <div
                  className={forgotStatus.type === 'success' ? 'status-success' : 'status-error'}
                  style={{ marginBottom: 16 }}
                >
                  {forgotStatus.message}
                </div>
              )}
              <button type="submit" className="auth-btn">Anweisungen senden</button>
              <div className="auth-links">
                <button type="button" className="auth-link" onClick={() => wechselZu('login')}>
                  Zurück zur Anmeldung
                </button>
              </div>
            </form>
          )}
        </div>

        <Link to="/help" className="auth-foot">Hilfe & Tutorials</Link>
      </div>
    </div>
  );
}

export default LoginPage;
