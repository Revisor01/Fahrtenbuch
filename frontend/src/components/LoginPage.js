import React, { useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Car } from 'lucide-react';
import Modal from '../Modal';
import { AppContext } from '../contexts/AppContext';


function ForgotPasswordForm({ onClose }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/reset-password/request', { email });
      setStatus({
        type: 'success',
        message: 'Wenn ein Account mit dieser E-Mail existiert, wurden Anweisungen zum Zurücksetzen des Passworts versendet.'
      });
      setTimeout(onClose, 3000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      });
    }
  };

  return (
    <div className="card-container-highlight">
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="form-label">
    E-Mail-Adresse
    </label>
    <input
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="form-input"
    required
    />
    </div>

    {status && (
      <div className={status.type === 'success' ? 'status-success' : 'status-error'}>
      {status.message}
      </div>
    )}

    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={onClose}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button
    type="submit"
    className="btn-primary w-full"
    >
    Anweisungen senden
    </button>
    </div>
    </form>
    </div>
  );
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login, showNotification } = useContext(AppContext);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    username: '',
    email: '',
    registrationCode: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
    } catch (error) {
      alert('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Anmeldedaten.');
    }
  };

  const validateEmail = (email) => {
    const allowedEmailDomains = window.appConfig?.allowedEmailDomains || process.env.REACT_APP_ALLOWED_EMAIL_DOMAINS;
    if (!allowedEmailDomains) return true;

    const domain = email.split('@')[1];
    const allowedDomainsArray = allowedEmailDomains.split(',');
    return allowedDomainsArray.includes(domain);
  };

  const handleRegistration = async (e) => {
    e.preventDefault();

    // Email-Domain prüfen
    if (!validateEmail(registrationData.email)) {
      showNotification('Fehler', 'Diese Email-Domain ist nicht für die Registrierung zugelassen');
      return;
    }

    try {
      const response = await axios.post('/api/auth/register', registrationData);
      showNotification('Erfolg', response.data.message);
      setShowRegistration(false);
    } catch (error) {
      showNotification('Fehler', error.response?.data?.message || 'Registrierung fehlgeschlagen');
    }
  };

  const appTitle = window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch Kirchenkreis Dithmarschen";
  const allowRegistration = window.appConfig?.allowRegistration === 'true' || process.env.REACT_APP_ALLOW_REGISTRATION === 'true';
  const allowedEmailDomains = window.appConfig?.allowedEmailDomains || process.env.REACT_APP_ALLOWED_EMAIL_DOMAINS;
  const registrationCode = window.appConfig?.registrationCode || process.env.REACT_APP_REGISTRATION_CODE;
  const apiUrl = process.env.REACT_APP_API_URL || '/api'; //Direkt und fest definiert!

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-gray-900 dark:via-gray-900 dark:to-primary-900">
    <div className="w-full max-w-md mx-4">
    <div className="card-container-highlight">
    <div className="flex justify-center mb-6">
    <div className="w-16 h-16 bg-primary-500 dark:bg-primary-600 rounded-2xl flex items-center justify-center shadow-lg">
    <Car size={32} className="text-white" />
    </div>
    </div>
    <h1 className="text-lg font-medium text-value text-center mb-2">
    {appTitle}
    </h1>
    <p className="text-sm text-muted text-center mb-6">Melden Sie sich an, um Ihre Dienstfahrten zu verwalten.</p>

    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="form-label">
    Benutzername / E-Mail
    </label>
    <input
    type="text"
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    className="form-input"
    required
    />
    </div>

    <div>
    <label className="form-label">
    Passwort
    </label>
    <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="form-input"
    required
    />
    </div>

    <div className="flex flex-col gap-2">
    <button type="submit" className="btn-primary w-full">
    Login
    </button>
    <div className="relative my-4">
    <hr className="border-primary-100 dark:border-primary-700" />
    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card-highlight px-3 text-xs text-muted">oder</span>
    </div>
    <div className="flex justify-center gap-4 text-sm">
    <button
    type="button"
    onClick={() => setShowForgotPassword(true)}
    className="text-primary-500 hover:text-primary-600 dark:text-primary-400 hover:underline"
    >
    Passwort vergessen?
    </button>

    {allowRegistration && (
      <button
      type="button"
      onClick={() => setShowRegistration(true)}
      className="text-primary-500 hover:text-primary-600 dark:text-primary-400 hover:underline"
      >
      Registrieren
      </button>
    )}
    </div>
    <Link to="/help" className="block text-center text-sm text-muted hover:text-value mt-4">
    Hilfe & Tutorials
    </Link>
    </div>
    </form>
    </div>
    <p className="text-center text-xs text-muted mt-6">Kirchenkreis Dithmarschen</p>
    </div>

    <Modal
    isOpen={showForgotPassword}
    onClose={() => setShowForgotPassword(false)}
    title="Passwort zurücksetzen"
    >
    <ForgotPasswordForm onClose={() => setShowForgotPassword(false)} />
    </Modal>

    <Modal
    isOpen={showRegistration}
    onClose={() => setShowRegistration(false)}
    title="Registrierung"
    >
    <div className="card-container-highlight">
    <form onSubmit={handleRegistration} className="space-y-4">
    <div>
    <label className="form-label">Benutzername</label>
    <input
    type="text"
    value={registrationData.username}
    onChange={(e) => setRegistrationData({ ...registrationData, username: e.target.value })}
    className="form-input"
    required
    />
    </div>
    <div>
    <label className="form-label">E-Mail</label>
    <input
    type="email"
    value={registrationData.email}
    onChange={(e) => setRegistrationData({ ...registrationData, email: e.target.value })}
    className="form-input"
    required
    />
    </div>
    {allowedEmailDomains && (
      <div className="text-xs text-muted mt-1">
      Erlaubte Domains: {allowedEmailDomains}
      </div>
    )}
    {registrationCode && (
      <div>
      <label className="form-label">Registrierungscode</label>
      <input
      type="text"
      value={registrationData.registrationCode}
      onChange={(e) => setRegistrationData({ ...registrationData, registrationCode: e.target.value })}
      className="form-input"
      required
      />
      </div>
    )}
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => setShowRegistration(false)}
    className="btn-secondary w-full"
    >
    Abbrechen
    </button>
    <button type="submit" className="btn-primary w-full">
    Registrieren
    </button>
    </div>
    </form>
    </div>
    </Modal>
    </div>
  );
}

export default LoginPage;
