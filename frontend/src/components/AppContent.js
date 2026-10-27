import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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
import { useErfassung } from '../contexts/ErfassungContext';
import { aktuellerMonat } from '../utils/datum';
import { PLATTFORM, IST_NATIVE } from '../utils/plattform';
import { auswahlHaptik } from '../utils/haptik';
import { setzeSystemflaeche } from '../utils/systemflaeche';
import { tastaturBeobachten } from '../utils/tastatur';
import NativeNav from './NativeNav';
import useZurueckButton from './useZurueckButton';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { ladeServerKonfig } from '../api/konfig';
import {
  KURZBEFEHL_WIEDERHOLEN,
  aufKurzbefehlHoeren,
  offenenKurzbefehlAbholenAsync,
} from '../utils/kurzbefehle';

// Das Zeichen: offener Ring, um −45° gedreht; ab 32 px ohne Akzent-Punkt.
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

// Erfassen ist in der nativen Leiste ein abgesetzter Aktionsknopf (`role: 'prominent'`), im Web bleibt es beim bisherigen Weg.
const ERFASSEN_ID = 'erfassen';

const NATIVE_NAV_ITEMS = [
  ...NAV_ITEMS,
  { id: ERFASSEN_ID, label: 'Erfassen', icon: Car, role: 'prominent' },
];

function AppContent() {
  const { isLoggedIn, anmeldungGeladen, logout, user, token, monthlyData, fahrten } =
    useContext(AppContext);
  const { isDark, toggleDarkMode } = useTheme();
  const erfassung = useErfassung();
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showNewFeaturesModal, setShowNewFeaturesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState(null);

  // Nur die App braucht eine Instanz-Wahl.
  const [instanzGewaehlt, setInstanzGewaehlt] = useState(
    () => !IST_NATIVE || Boolean(getApiBaseUrl())
  );

  // In der App erst nach Abfrage des Servers bekannt, im Web aus config.js.
  const [konfigGeladen, setKonfigGeladen] = useState(!IST_NATIVE);

  // An der Basis-URL, damit auch ein späterer Wechsel die Angaben neu lädt.
  const aktuelleApiUrl = getApiBaseUrl();

  useEffect(() => {
    if (!IST_NATIVE || !instanzGewaehlt) return undefined;
    let abgemeldet = false;
    // Nicht auf „lädt“ zurücksetzen, sonst erscheint der Startbildschirm ein zweites Mal; ohne Antwort gelten die Bundle-Werte.
    ladeServerKonfig().finally(() => {
      if (!abgemeldet) setKonfigGeladen(true);
    });
    return () => {
      abgemeldet = true;
    };
  }, [instanzGewaehlt, aktuelleApiUrl]);

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

  // Fällig: Vormonate mit Erstattung, die weder eingereicht noch erstattet sind.
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

  // Token aus dem Context, der Systemspeicher wäre hier nur asynchron erreichbar.
  useEffect(() => {
    const checkTokenExpiration = () => {
      if (!token) return;
      try {
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        if (tokenData.exp * 1000 < Date.now()) {
          // Mit Grund: Der Logout kam bisher wortlos, mitten im Formular.
          logout({ grund: 'abgelaufen' });
        }
      } catch (error) {
        // Ein defekter Token darf die App nicht zerlegen.
        console.error('Token unlesbar, wird verworfen:', error);
        logout({ grund: 'abgelaufen' });
      }
    };

    checkTokenExpiration();
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, [logout, token]);

  // Vor den frühen Returns wegen der Hook-Reihenfolge.
  useZurueckButton({
    startTab: 'dashboard',
    activeTab,
    onNavigate: handleNavigate,
  });

  // Sonst liegen die Eingabefelder der Sheets unter der Tastatur.
  useEffect(() => tastaturBeobachten(), []);

  // Kurzbefehle erst nach der Anmeldung, bis dahin puffert die native Seite; `fahrten` als Ref, damit der Listener nicht ständig neu anmeldet.
  const fahrtenRef = useRef(fahrten);
  fahrtenRef.current = fahrten;

  useEffect(() => {
    if (!IST_NATIVE || !isLoggedIn) return undefined;

    const ausfuehren = (typ) => {
      if (typ === KURZBEFEHL_WIEDERHOLEN) {
        // Jüngstes Datum, bei Gleichstand die höchste ID.
        const letzte = (fahrtenRef.current || []).reduce((beste, f) => {
          if (!beste) return f;
          const a = (f.datum || '').slice(0, 10);
          const b = (beste.datum || '').slice(0, 10);
          if (a !== b) return a > b ? f : beste;
          return Number(f.id) > Number(beste.id) ? f : beste;
        }, null);

        if (letzte) {
          // Datum bewusst leer: Wiederholen heißt „dieselbe Strecke, heute“.
          erfassung.open({
            vonOrtId: letzte.von_ort_id,
            nachOrtId: letzte.nach_ort_id,
            anlass: letzte.anlass || '',
            abrechnung: letzte.abrechnung,
          });
          return;
        }
        // Ohne Fahrt der leere Flow statt gar keiner Reaktion.
      }
      erfassung.open();
    };

    const abmelden = aufKurzbefehlHoeren(ausfuehren);

    // Beim Kaltstart liegt der Typ schon bereit (iOS window.__kurzbefehl, Android über die Brücke).
    let abgeraeumt = false;
    offenenKurzbefehlAbholenAsync().then((offener) => {
      if (!abgeraeumt && offener) ausfuehren(offener);
    });

    return () => {
      abgeraeumt = true;
      abmelden();
    };
  }, [isLoggedIn, erfassung]);

  // Ganzflächig Petrol oder normale App-Fläche, davon hängen Systemränder und Statusleiste ab; vor den frühen Returns.
  const markenflaeche =
    !instanzGewaehlt || !anmeldungGeladen || !isLoggedIn;

  useEffect(() => {
    setzeSystemflaeche(markenflaeche ? 'brand' : 'app', isDark);
  }, [markenflaeche, isDark]);

  if (!instanzGewaehlt) {
    return (
      <InstanzAuswahl
        onGewaehlt={() => setInstanzGewaehlt(true)}
        aktuelleUrl={aktuelleApiUrl}
      />
    );
  }

  // Nur auf die gespeicherte Anmeldung warten, nicht auf die Instanz-Konfiguration, sonst blitzt die Anmeldemaske oder der Start dauert.
  if (!anmeldungGeladen) {
    return <Startbildschirm />;
  }

  if (!isLoggedIn) {
    return (
      // Zurück zur Kirchenkreis-Wahl nur in der App; die gemerkte Instanz muss weg.
      <LoginPage
        onInstanzWechsel={
          IST_NATIVE
            ? () => {
                setApiBaseUrl('');
                setInstanzGewaehlt(false);
              }
            : undefined
        }
      />
    );
  }

  const isAdmin = user?.role === 'admin';
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const roleLabel = isAdmin ? 'Administrator' : 'Nutzer:in';

  // Mobil markiert „Einstellungen“ auch die Verwaltung.
  const isNavItemActive = (id, mobil = false) =>
    activeTab === id || (mobil && id === 'einstellungen' && activeTab === 'verwaltung');

  const handleNavClick = (id) => {
    // Der prominente Knopf öffnet nur den Flow und setzt keinen Tab.
    if (id === ERFASSEN_ID) {
      if (IST_NATIVE) auswahlHaptik();
      erfassung.open();
      return;
    }
    // Haptik nur bei echtem Wechsel.
    if (IST_NATIVE && id !== activeTab) auswahlHaptik();
    setActiveTab(id);
    setSettingsSubTab(null);
  };

  // Auch nativ markiert „Einstellungen“ die Verwaltung.
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
              onClick={() => logout()}
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
            items={NATIVE_NAV_ITEMS}
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
