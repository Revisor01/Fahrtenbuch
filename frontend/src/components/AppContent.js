import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Users, LogOut, Info, Bell, LayoutDashboard, Car, Receipt, Settings as SettingsIcon } from 'lucide-react';
import Settings from './Settings';
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
  const [settingsSubTab, setSettingsSubTab] = useState(null);

  // Extended navigation: supports "einstellungen:favoriten" deeplinks
  const handleNavigate = (target) => {
    if (target && target.includes(':')) {
      const [tab, subTab] = target.split(':');
      setActiveTab(tab);
      setSettingsSubTab(subTab);
    } else {
      setActiveTab(target);
      setSettingsSubTab(null);
    }
  };

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
    { id: 'abrechnungen', label: 'Abrechnungen', icon: Receipt },
    { id: 'einstellungen', label: 'Einstellungen', icon: SettingsIcon },
    ...(user?.role === 'admin' ? [{ id: 'verwaltung', label: 'Verwaltung', icon: Users }] : []),
  ];

  return (
    <div className="container mx-auto p-4">
    <div className="mb-4">
    {/* Header Section */}
    <div className="flex justify-between items-center gap-4 mb-4">
    <h1 className="text-lg font-medium text-value">
    {window.appConfig?.appTitle || process.env.REACT_APP_TITLE || "Fahrtenbuch"}
    </h1>

    <div className="flex items-center gap-1 sm:gap-2">
      <ThemeToggle />
      <button
        onClick={() => setShowNewFeaturesModal(true)}
        className="relative p-2 rounded-card text-muted hover:text-value hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
        title="Neue Funktionen"
      >
        <Bell size={18} />
        <div className="absolute top-1 right-1 bg-secondary-500 rounded-full w-2.5 h-2.5"></div>
      </button>
      <button
        onClick={() => setShowInfoModal(true)}
        className="p-2 rounded-card text-muted hover:text-value hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
        title="Info"
      >
        <Info size={18} />
      </button>
      <Link
        to="/help"
        className="p-2 rounded-card text-muted hover:text-value hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
        title="Hilfe"
      >
        <HelpCircle size={18} />
      </Link>
      <div className="w-px h-6 bg-primary-200 dark:bg-primary-700 mx-1 hidden sm:block"></div>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-2 rounded-card text-muted hover:text-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-900 transition-colors text-sm"
        title="Logout"
      >
        <LogOut size={18} />
        <span className="hidden sm:inline">Logout</span>
      </button>
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
    {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
    {activeTab === 'fahrten' && <FahrtenListe />}
    {activeTab === 'abrechnungen' && <MonthlyOverview />}
    {activeTab === 'einstellungen' && <Settings initialTab={settingsSubTab} />}
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
