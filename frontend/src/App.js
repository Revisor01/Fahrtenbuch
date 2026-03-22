import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import './index.css';
import './darkMode.css';
import ProfileModal from './ProfileModal';
import LandingPage from './LandingPage';
import FahrtForm from './FahrtForm';
import FahrtenListe from './components/FahrtenListe';
import Modal from './Modal';
import { HelpCircle, Settings, Users, LogOut, Info, Bell } from 'lucide-react';
import InfoModal from './components/InfoModal';
import UserManagement from './UserManagement';
import VerifyEmail from './VerifyEmail';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import SetPassword from './SetPassword';
import { ThemeProvider } from './ThemeContext';
import ThemeToggle from './ThemeToggle';
import NewFeaturesModal from './components/NewFeaturesModal';
import { AppContext } from './contexts/AppContext';
import AppProvider from './contexts/AppContext';
import MonthlyOverview from './components/MonthlyOverview';


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
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="card-container-highlight m-6 w-full max-w-md">
    <h1 className="text-lg font-medium text-value text-center mb-6">
    {appTitle}
    </h1>

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
    <div className="flex gap-2 pb-6">
    <button
    type="button"
    onClick={() => setShowForgotPassword(true)}
    className="btn-secondary w-full"
    >
    Passwort vergessen?
    </button>

    {allowRegistration && (
      <button
      type="button"
      onClick={() => setShowRegistration(true)}
      className="btn-secondary w-full"
      >
      Registrieren
      </button>
    )}
    </div>
    <Link to="/help" className="btn-primary w-full items-center flex justify-center">
    Hilfe & Tutorials
    </Link>
    </div>
    </form>
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

function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
  }, []);

  return (
    <ThemeProvider>
    <BrowserRouter>
    <AppProvider>
    <Routes>
    <Route path="/help" element={<LandingPage />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/*" element={<AppContent />} />
    </Routes>
    </AppProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isLoggedIn, gesamtKirchenkreis, gesamtGemeinde, logout, isProfileModalOpen, setIsProfileModalOpen, user } = useContext(AppContext);
  const [showUserManagementModal, setShowUserManagementModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNewFeaturesModal, setShowNewFeaturesModal] = useState(false);
  // Token Check Effect
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem('token');
      if (token) {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.exp * 1000 < Date.now()) {
          logout();
        }
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, [logout]);

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  return (
    <div className="container mx-auto p-4">
    <div className="mb-8">
    {/* Header Section */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
    <h1 className="text-lg font-medium text-value">
    {window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch"}
    </h1>

    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
    {/* Admin-Button und Einstellungen in einer eigenen Zeile auf Mobil */}
    <div className={`grid ${user?.role === 'admin' ? 'grid-cols-2' : 'grid-cols-1'} sm:flex gap-2 w-full`}>
        {user?.role === 'admin' && (
          <button
            onClick={() => setShowUserManagementModal(true)}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Users size={16} />
            <span>Benutzerverwaltung</span>
          </button>
        )}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Settings size={16} />
          <span>Einstellungen</span>
        </button>
      </div>

      {/* Theme, Info, Hilfe und Logout in einer zweiten Zeile auf Mobil */}
      <div className="flex justify-between w-full sm:gap-4">
<div className="flex gap-2">
  <ThemeToggle />
  <button
    onClick={() => setShowNewFeaturesModal(true)}
    className="btn-primary flex items-center justify-center relative"
    title="Neue Funktionen"
  >
    <Bell size={16} />
    <div className="absolute -top-1 -right-1 bg-secondary-500 rounded-full w-3 h-3"></div>
  </button>
  <button
    onClick={() => setShowInfoModal(true)}
    className="btn-primary flex items-center justify-center"
    title="Info"
  >
    <Info size={16} />
  </button>
  <Link
    to="/help"
    className="btn-primary flex items-center justify-center gap-2"
  >
    <HelpCircle size={16} />
    <span className="hidden sm:inline">Hilfe</span>
  </Link>
</div>
        <button
          onClick={logout}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  </div>
</div>

    {/* Hauptinhalt */}
    <div className="space-y-6">
      <FahrtForm />
      <FahrtenListe />
      <MonthlyOverview />
    </div>

    {/* Modals */}

<NewFeaturesModal
  isOpen={showNewFeaturesModal}
  onClose={() => setShowNewFeaturesModal(false)}
/>

    <InfoModal
      isOpen={showInfoModal}
      onClose={() => setShowInfoModal(false)}
    />

    <ProfileModal
      isOpen={isProfileModalOpen}
      onClose={() => setIsProfileModalOpen(false)}
    />

    <Modal
      isOpen={showUserManagementModal}
      onClose={() => setShowUserManagementModal(false)}
      title="Benutzerverwaltung"
      size="wide"
    >
      <UserManagement />
    </Modal>

  </div>
);
}

export default App;
