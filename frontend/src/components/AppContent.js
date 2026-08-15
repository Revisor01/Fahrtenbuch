import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Users, Home, Car, Receipt, Settings, Sun, Moon, Bell, Info, HelpCircle, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';
import EinstellungenView from './einstellungen/EinstellungenView';
import FahrtenListe from './FahrtenListe';
import InfoModal from './InfoModal';
import Startbildschirm from './Startbildschirm';
import UserManagement from '../UserManagement';
import NewFeaturesModal from './NewFeaturesModal';
import MonthlyOverview from './MonthlyOverview';
import Dashboard from './Dashboard';
import LoginPage from './LoginPage';
import InstanzAuswahl from './InstanzAuswahl';
import { AppContext } from '../contexts/AppContext';
import { aktuellerMonat } from '../utils/datum';
import { PLATTFORM, IST_NATIVE } from '../utils/plattform';
import { auswahlHaptik } from '../utils/haptik';
import NativeNav from './NativeNav';
import useZurueckButton from './useZurueckButton';
import { getApiBaseUrl } from '../api/client';

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
  const { isLoggedIn, anmeldungGeladen, logout, user, token, monthlyData } = useContext(AppContext);
  const { isDark, toggleDarkMode } = useTheme();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNewFeaturesModal, setShowNewFeaturesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState(null);

  // Nur die native App braucht eine Instanz-Wahl: Sie laeuft von einem lokalen
  // Bundle und kennt ohne Auswahl keinen Server. Im Web bleibt das Gate
  // dauerhaft aus — dort loesen relative Pfade gegen den eigenen Host auf.
  const [instanzGewaehlt, setInstanzGewaehlt] = useState(
    () => !IST_NATIVE || Boolean(getApiBaseUrl())
  );

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
    const currentYearMonth = aktuellerMonat();
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
  //
  // Quelle ist der Token aus dem Context statt localStorage: in der App liegt
  // er im Systemspeicher und waere hier nur asynchron erreichbar. Der Context
  // haelt ohnehin denselben Wert.
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (!token) return;
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.exp * 1000 < Date.now()) {
          logout();
        }
      } catch (error) {
        // Ein defekter Token darf die App nicht zerlegen: die Exception lief
        // bisher aus dem useEffect heraus, React warf den Baum weg (weisse
        // Seite) und der kaputte Wert blieb liegen - jeder Reload crashte neu.
        console.error('Token unlesbar, wird verworfen:', error);
        logout();
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, [logout, token]);

  // Muss vor den fruehen Returns stehen (Hook-Reihenfolge) und ist ausserhalb
  // von Android ohnehin ein No-Op.
  useZurueckButton({
    startTab: 'dashboard',
    activeTab,
    onNavigate: handleNavigate,
  });

  if (!instanzGewaehlt) {
    return <InstanzAuswahl onGewaehlt={() => setInstanzGewaehlt(true)} />;
  }

  // Erst wenn die gespeicherte Anmeldung gelesen ist, steht fest, ob die
  // Anmeldemaske gehoert wird. Ohne dieses Gate blitzte sie beim Start der App
  // kurz auf, weil der sichere Speicher erst asynchron antwortet.
  if (!anmeldungGeladen) {
    return <Startbildschirm />;
  }

  if (!isLoggedIn) {
    return <LoginPage />;
  }

  const isAdmin = user?.role === 'admin';
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const roleLabel = isAdmin ? 'Administrator' : 'Nutzer:in';

  // Verwaltung hat in der Sidebar einen eigenen Eintrag — mobil (ohne eigenen
  // Eintrag) markiert „Einstellungen" auch die Verwaltung als aktiv
  const isNavItemActive = (id, mobil = false) =>
    activeTab === id || (mobil && id === 'einstellungen' && activeTab === 'verwaltung');

  const handleNavClick = (id) => {
    // Haptik nur beim tatsaechlichen Wechsel: erneutes Tippen auf den offenen
    // Tab soll sich nicht nach einer Aktion anfuehlen. Im Web passiert nichts.
    if (IST_NATIVE && id !== activeTab) auswahlHaptik();
    setActiveTab(id);
    setSettingsSubTab(null);
  };

  // Der native Nav-Balken kennt keinen Verwaltungs-Eintrag — wie mobil im Web
  // markiert dort „Einstellungen" auch die Verwaltung.
  const nativAktivId = activeTab === 'verwaltung' ? 'einstellungen' : activeTab;

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
          <div className="sidebar-tools">
            <button
              type="button"
              className="sidebar-tool"
              onClick={toggleDarkMode}
              title={isDark ? 'Helles Design' : 'Dunkles Design'}
              aria-label={isDark ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button
              type="button"
              className="sidebar-tool"
              onClick={() => setShowNewFeaturesModal(true)}
              title="Neue Funktionen"
              aria-label="Neue Funktionen"
            >
              <Bell size={17} />
            </button>
            <button
              type="button"
              className="sidebar-tool"
              onClick={() => setShowInfoModal(true)}
              title="Info"
              aria-label="Info"
            >
              <Info size={17} />
            </button>
            <Link to="/help" className="sidebar-tool" title="Hilfe" aria-label="Hilfe">
              <HelpCircle size={17} />
            </Link>
          </div>
          <div className="sidebar-user-row">
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
            <button
              type="button"
              className="sidebar-tool sidebar-logout"
              onClick={logout}
              title="Abmelden"
              aria-label="Abmelden"
            >
              <LogOut size={17} />
            </button>
          </div>
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
            {/* Desktop-Tab: Karte als Untergrund (in den Einstellungen liefert
                der Drilldown die set-content-Karte) */}
            {activeTab === 'verwaltung' && (
              <div className="set-content">
                <UserManagement />
              </div>
            )}
          </div>
        </main>

        {/* In der nativen Huelle uebernimmt die Plattform-Navigation. Die
            Web-Bottom-Nav bleibt unveraendert der Fall fuer Browser und PWA —
            deshalb ein Entweder-oder statt einer Erweiterung der bestehenden. */}
        {IST_NATIVE ? (
          <NativeNav
            plattform={PLATTFORM}
            items={NAV_ITEMS}
            aktivId={nativAktivId}
            onSelect={handleNavClick}
            badgeId="abrechnungen"
            badgeAnzahl={faelligeMonate}
          />
        ) : (
        <nav className="bottom-nav" aria-label="Hauptnavigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`bottom-nav-item${isNavItemActive(item.id, true) ? ' is-active' : ''}`}
                aria-current={isNavItemActive(item.id, true) ? 'page' : undefined}
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
        )}
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
