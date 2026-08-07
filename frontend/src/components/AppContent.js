import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Users, LogOut, Info, Bell, Home, Car, Receipt, MoreHorizontal } from 'lucide-react';
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

// Das Zeichen: offener Ring (die gefahrene Strecke), um −45° gedreht.
// Ab 32px Darstellungsgröße trägt der Ring allein (ohne Akzent-Punkt).
function LogoMark({ size = 26 }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} aria-hidden="true">
      <g transform="rotate(-45 256 256)">
        <path
          d="M256 118a138 138 0 1 1 -97.6 40.4"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="46"
        />
      </g>
    </svg>
  );
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Start', icon: Home },
  { id: 'fahrten', label: 'Fahrten', icon: Car },
  { id: 'abrechnungen', label: 'Abrechnung', icon: Receipt },
  { id: 'einstellungen', label: 'Mehr', icon: MoreHorizontal },
];

function AppContent() {
  const { isLoggedIn, logout, user, monthlyData } = useContext(AppContext);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNewFeaturesModal, setShowNewFeaturesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState(null);
  const [fahrtenFilter, setFahrtenFilter] = useState(null);

  // Extended navigation: supports "einstellungen:favoriten" and "fahrten:offene:von:bis" deeplinks
  const handleNavigate = (target) => {
    if (target && target.startsWith('fahrten:offene:')) {
      const parts = target.split(':');
      setActiveTab('fahrten');
      setFahrtenFilter({ von: parts[2], bis: parts[3] });
    } else if (target && target.includes(':')) {
      const [tab, subTab] = target.split(':');
      setActiveTab(tab);
      setSettingsSubTab(subTab);
      setFahrtenFilter(null);
    } else {
      setActiveTab(target);
      setSettingsSubTab(null);
      setFahrtenFilter(null);
    }
  };

  // Fällige Monate: Vormonate, in denen mindestens ein Träger mit Erstattung
  // weder eingereicht noch erstattet ist
  const faelligeMonate = useMemo(() => {
    const currentYearMonth = new Date().toISOString().slice(0, 7);
    return monthlyData.filter((md) => {
      if (!md.yearMonth || md.yearMonth >= currentYearMonth) return false;
      return Object.entries(md.erstattungen || {}).some(([id, betrag]) => {
        if (!(betrag > 0)) return false;
        const status = md.abrechnungsStatus?.[id];
        return !status?.eingereicht_am && !status?.erhalten_am;
      });
    }).length;
  }, [monthlyData]);

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

  const isAdmin = user?.role === 'admin';
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const roleLabel = isAdmin ? 'Administrator' : 'Nutzer:in';

  // „Mehr" ist aktiv, wenn Einstellungen oder Verwaltung offen sind
  const isNavItemActive = (id) =>
    activeTab === id || (id === 'einstellungen' && activeTab === 'verwaltung');

  const handleNavClick = (id) => {
    setActiveTab(id);
    setSettingsSubTab(null);
    setFahrtenFilter(null);
  };

  // Sekundäraktionen (ehemals Header): Darstellung, Neuigkeiten, Info,
  // Hilfe, Verwaltung (Admin), Abmelden — leben jetzt im „Mehr"-Bereich
  const mehrAktionen = (
    <div className="card-container mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <ThemeToggle />
        <button
          onClick={() => setShowNewFeaturesModal(true)}
          className="table-action-button-secondary"
          title="Neue Funktionen"
          aria-label="Neue Funktionen"
        >
          <Bell size={18} />
        </button>
        <button
          onClick={() => setShowInfoModal(true)}
          className="table-action-button-secondary"
          title="Info"
          aria-label="Info"
        >
          <Info size={18} />
        </button>
        <Link
          to="/help"
          className="table-action-button-secondary"
          title="Hilfe"
          aria-label="Hilfe"
        >
          <HelpCircle size={18} />
        </Link>
        <div className="flex-1" />
        {isAdmin && (
          <button
            onClick={() => setActiveTab('verwaltung')}
            className="btn-secondary flex items-center gap-2"
          >
            <Users size={17} />
            <span>Verwaltung</span>
          </button>
        )}
        <button
          onClick={logout}
          className="btn-ghost flex items-center gap-2"
          title="Abmelden"
        >
          <LogOut size={17} />
          <span>Abmelden</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="app-shell">
      {/* Sidebar (≥768px) */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <LogoMark size={26} />
          <span>Fahrtenbuch</span>
        </div>
        <nav className="sidebar-nav" aria-label="Hauptnavigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const label = item.id === 'einstellungen' ? 'Mehr' : item.label;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`sidebar-item${isNavItemActive(item.id) ? ' is-active' : ''}`}
                aria-current={isNavItemActive(item.id) ? 'page' : undefined}
              >
                <Icon size={19} />
                <span>{label}</span>
                {item.id === 'abrechnungen' && faelligeMonate > 0 && (
                  <span
                    className="sidebar-badge"
                    title={`${faelligeMonate} ${faelligeMonate === 1 ? 'Monat wartet' : 'Monate warten'} auf die Abrechnung`}
                  >
                    {faelligeMonate}
                  </span>
                )}
              </button>
            );
          })}
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNavClick('verwaltung')}
              className={`sidebar-item${activeTab === 'verwaltung' ? ' is-active' : ''}`}
              aria-current={activeTab === 'verwaltung' ? 'page' : undefined}
            >
              <Users size={19} />
              <span>Verwaltung</span>
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-user"
            onClick={() => handleNavClick('einstellungen')}
            title="Einstellungen öffnen"
          >
            <span className="sidebar-avatar" aria-hidden="true">{initials}</span>
            <span className="min-w-0">
              <span className="sidebar-username">{user?.username || 'Unbekannt'}</span>
              <span className="sidebar-role">{roleLabel}</span>
            </span>
          </button>
        </div>
      </aside>

      <div className="app-main">
        {/* Inhaltsbereich: scrollt selbst, Nav bleibt stehen */}
        <main className="app-content">
          <div className="app-content-inner">
            {activeTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
            {activeTab === 'fahrten' && <FahrtenListe initialFilter={fahrtenFilter} onFilterApplied={() => setFahrtenFilter(null)} />}
            {activeTab === 'abrechnungen' && <MonthlyOverview />}
            {activeTab === 'einstellungen' && (
              <>
                {mehrAktionen}
                <Settings initialTab={settingsSubTab} />
              </>
            )}
            {activeTab === 'verwaltung' && <UserManagement />}
          </div>
        </main>

        {/* Bottom-Nav (<768px) */}
        <nav className="bottom-nav" aria-label="Hauptnavigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`bottom-nav-item${isNavItemActive(item.id) ? ' is-active' : ''}`}
                aria-current={isNavItemActive(item.id) ? 'page' : undefined}
              >
                <span className="bottom-nav-icon">
                  <Icon size={19} />
                  {item.id === 'abrechnungen' && faelligeMonate > 0 && (
                    <span className="bottom-nav-dot" aria-hidden="true" />
                  )}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
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
    </div>
  );
}

export default AppContent;
