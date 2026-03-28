import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Users, LogOut, Info, Bell, LayoutDashboard, Car, CalendarDays, Settings as SettingsIcon } from 'lucide-react';
import Settings from './Settings';
import FahrtForm from '../FahrtForm';
import FahrtenListe from './FahrtenListe';
import InfoModal from './InfoModal';
import UserManagement from '../UserManagement';
import ThemeToggle from '../ThemeToggle';
import NewFeaturesModal from './NewFeaturesModal';
import MonthlyOverview from './MonthlyOverview';
import Dashboard from './Dashboard';
import LoginPage from './LoginPage';
import { AppContext } from '../contexts/AppContext';


function AppContent() {
  const { isLoggedIn, gesamtKirchenkreis, gesamtGemeinde, logout, user } = useContext(AppContext);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNewFeaturesModal, setShowNewFeaturesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'fahrten', label: 'Fahrten & Export', icon: Car },
    { id: 'monatsuebersicht', label: 'Monats\u00FCbersicht', icon: CalendarDays },
    { id: 'einstellungen', label: 'Einstellungen', icon: SettingsIcon },
    ...(user?.role === 'admin' ? [{ id: 'verwaltung', label: 'Verwaltung', icon: Users }] : []),
  ];

  return (
    <div className="container mx-auto p-4">
    <div className="mb-4">
    {/* Header Section */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
    <h1 className="text-lg font-medium text-value">
    {window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch"}
    </h1>

    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
      {/* Theme, Info, Hilfe und Logout */}
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

    {/* Tab Navigation */}
    <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400 font-medium'
                : 'text-muted hover:text-value'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>

    {/* Hauptinhalt */}
    {activeTab === 'dashboard' && <Dashboard />}
    {activeTab === 'fahrten' && (
      <div className="space-y-6">
        <FahrtForm />
        <FahrtenListe />
      </div>
    )}
    {activeTab === 'monatsuebersicht' && <MonthlyOverview />}
    {activeTab === 'einstellungen' && <Settings />}
    {activeTab === 'verwaltung' && <UserManagement />}

    {/* Modals */}

<NewFeaturesModal
  isOpen={showNewFeaturesModal}
  onClose={() => setShowNewFeaturesModal(false)}
/>

    <InfoModal
      isOpen={showInfoModal}
      onClose={() => setShowInfoModal(false)}
    />

  </div>
);
}

export default AppContent;
