import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Settings, Users, LogOut, Info, Bell } from 'lucide-react';
import ProfileModal from '../ProfileModal';
import FahrtForm from '../FahrtForm';
import FahrtenListe from './FahrtenListe';
import Modal from '../Modal';
import InfoModal from './InfoModal';
import UserManagement from '../UserManagement';
import ThemeToggle from '../ThemeToggle';
import NewFeaturesModal from './NewFeaturesModal';
import MonthlyOverview from './MonthlyOverview';
import LoginPage from './LoginPage';
import { AppContext } from '../contexts/AppContext';


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

export default AppContent;
