import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Users, Home, Car, Receipt, Settings } from 'lucide-react';
import EinstellungenView from './einstellungen/EinstellungenView';
import FahrtenListe from './FahrtenListe';
import InfoModal from './InfoModal';
import UserManagement from '../UserManagement';
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
  { id: 'einstellungen', label: 'Einstellungen', icon: Settings },
];

function AppContent() {
  const { isLoggedIn, logout, user, monthlyData } = useContext(AppContext);
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
  };

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
            const label = item.label;
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
            {activeTab === 'fahrten' && <FahrtenListe />}
            {activeTab === 'abrechnungen' && <MonthlyOverview />}
            {activeTab === 'einstellungen' && (
              <EinstellungenView
                initialTab={settingsSubTab}
                onShowInfo={() => setShowInfoModal(true)}
                onShowNewFeatures={() => setShowNewFeaturesModal(true)}
              />
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
