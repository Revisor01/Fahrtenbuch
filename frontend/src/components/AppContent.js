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
import NativeNav from './NativeNav';
import useZurueckButton from './useZurueckButton';
import { getApiBaseUrl, setApiBaseUrl } from '../api/client';
import { ladeServerKonfig } from '../api/konfig';
import {
  KURZBEFEHL_WIEDERHOLEN,
  aufKurzbefehlHoeren,
  offenenKurzbefehlAbholen,
} from '../utils/kurzbefehle';

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

// Erfassen ist in der nativen Huelle KEIN Tab mit eigenem Screen, sondern eine
// Aktion: Das Plugin setzt `role: 'prominent'` als abgesetzten runden Knopf
// neben der Kapsel der Floating-Tabbar. Damit sitzt der Einstieg dort, wo das
// System ihn erwartet, statt als freischwebender Knopf ueber der Leiste zu
// haengen (User-Feedback 14.08.: „haengt einfach random rum").
// Im Web bleibt es beim bisherigen Weg — dort gibt es keine native Leiste.
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

  // Nur die native App braucht eine Instanz-Wahl: Sie laeuft von einem lokalen
  // Bundle und kennt ohne Auswahl keinen Server. Im Web bleibt das Gate
  // dauerhaft aus — dort loesen relative Pfade gegen den eigenen Host auf.
  const [instanzGewaehlt, setInstanzGewaehlt] = useState(
    () => !IST_NATIVE || Boolean(getApiBaseUrl())
  );

  // Die App kennt ihre Instanz-Konfiguration (Titel, Registrierung, erlaubte
  // Domains) erst, wenn der Server gefragt wurde — im Web liefert sie die
  // config.js des Deployments, dort ist hier nichts zu tun.
  const [konfigGeladen, setKonfigGeladen] = useState(!IST_NATIVE);

  // Die aktuelle Basis-URL als Ausloeser: Sie aendert sich sowohl bei der
  // ersten Wahl als auch beim spaeteren Wechsel in den Einstellungen (der nur
  // abmeldet, ohne die Auswahl neu zu oeffnen). Sonst zeigte die Anmeldung
  // nach einem Wechsel noch die Angaben des vorherigen Kirchenkreises.
  const aktuelleApiUrl = getApiBaseUrl();

  useEffect(() => {
    if (!IST_NATIVE || !instanzGewaehlt) return undefined;
    let abgemeldet = false;
    // Bewusst KEIN Zuruecksetzen auf "laedt": Der Effekt laeuft auch beim
    // Start erneut, sobald die Basis-URL feststeht. Wurde hier zurueckgesetzt,
    // erschien der Startbildschirm ein zweites Mal — fuer die volle Dauer der
    // Anfrage. Wer angemeldet ist, sieht das Ergebnis ohnehin nie; die
    // Anmeldemaske ergaenzt sich, sobald die Werte eintreffen.
    // Der Aufruf faengt seine Fehler selbst und hat eine eigene Zeitgrenze:
    // ohne Antwort gelten die Werte aus dem Bundle, die Anmeldung erscheint
    // trotzdem.
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

  // Kurzbefehle (langes Tippen auf das App-Symbol).
  //
  // Der Effekt haengt an `isLoggedIn`: Ohne Anmeldung gibt es keinen
  // Erfassungsflow, und den Kurzbefehl in die Anmeldemaske hinein zu oeffnen
  // waere eine leere Geste. Er bleibt so lange gepuffert, bis die Anmeldung
  // steht — genau das ist der Zweck des Puffers auf der nativen Seite.
  //
  // Bewusst ohne `fahrten` in den Abhaengigkeiten: Der Listener wuerde sonst
  // bei jeder Datenaktualisierung neu anmelden, und der Griff auf die letzte
  // Fahrt geschieht ohnehin erst im Moment des Tippens. Deshalb eine Ref.
  const fahrtenRef = useRef(fahrten);
  fahrtenRef.current = fahrten;

  useEffect(() => {
    if (!IST_NATIVE || !isLoggedIn) return undefined;

    const ausfuehren = (typ) => {
      if (typ === KURZBEFEHL_WIEDERHOLEN) {
        // Jüngstes Datum, bei Gleichstand die zuletzt erfasste (hoechste ID):
        // `findAll` sortiert nur nach Datum, mehrere Fahrten am selben Tag
        // kaemen sonst in beliebiger Reihenfolge.
        const letzte = (fahrtenRef.current || []).reduce((beste, f) => {
          if (!beste) return f;
          const a = (f.datum || '').slice(0, 10);
          const b = (beste.datum || '').slice(0, 10);
          if (a !== b) return a > b ? f : beste;
          return Number(f.id) > Number(beste.id) ? f : beste;
        }, null);

        if (letzte) {
          // Datum absichtlich NICHT vorbelegt: Wiederholen heisst „dieselbe
          // Strecke, heute" — genau wie der Knopf in der Fahrtenliste.
          erfassung.open({
            vonOrtId: letzte.von_ort_id,
            nachOrtId: letzte.nach_ort_id,
            anlass: letzte.anlass || '',
            abrechnung: letzte.abrechnung,
          });
          return;
        }
        // Keine Fahrt vorhanden (neues Konto): der leere Flow ist die
        // ehrlichere Antwort als gar keine Reaktion auf den Kurzbefehl.
      }
      erfassung.open();
    };

    let abgebrochen = false;
    const abmelden = aufKurzbefehlHoeren(ausfuehren);

    // Beim Kaltstart wartet der Typ nativ gepuffert — der Listener oben kann
    // ihn nicht mehr gesehen haben.
    offenenKurzbefehlAbholen().then((typ) => {
      if (!abgebrochen && typ) ausfuehren(typ);
    });

    return () => {
      abgebrochen = true;
      abmelden();
    };
  }, [isLoggedIn, erfassung]);

  // Welche Flaeche traegt der gerade sichtbare Bildschirm? Startbildschirm,
  // Kirchenkreis-Wahl und Anmeldung sind ganzflaechig Petrol, die angemeldete
  // Ansicht traegt die normale App-Flaeche. Davon haengen in der App die
  // Farbe der Systemraender und die Symbolfarbe der Statusleiste ab.
  // Muss vor den fruehen Returns stehen (Hook-Reihenfolge); im Web ist der
  // Aufruf ein No-Op.
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

  // Erst wenn die gespeicherte Anmeldung gelesen ist, steht fest, ob die
  // Anmeldemaske gehoert wird. Ohne dieses Gate blitzte sie beim Start der App
  // Ein einziger Ladezustand bis feststeht, was tatsaechlich zu zeigen ist.
  //
  // Zuvor gab es zwei aufeinanderfolgende Bedingungen: erst die gespeicherte
  // Anmeldung, dann die Instanz-Konfiguration. Dazwischen lag ein Moment, in
  // dem die Anmeldemaske schon gerendert wurde, obwohl gleich darauf das
  // Dashboard kam — sie blitzte sichtbar auf.
  //
  // Auf die Konfiguration wird weiterhin nur gewartet, wenn die Anmeldemaske
  // wirklich gebraucht wird: Wer angemeldet ist, sieht ihr Ergebnis nie.
  // Es wird nur auf die gespeicherte Anmeldung gewartet — sie entscheidet, ob
  // ueberhaupt die Anmeldemaske gebraucht wird.
  //
  // Auf die Instanz-Konfiguration wird bewusst NICHT gewartet: Sie steuert nur
  // Feinheiten der Anmeldemaske (etwa ob eine Registrierung angeboten wird)
  // und traf frueher hier ein zweites Mal den Startbildschirm — sichtbar als
  // sekundenlange Verzoegerung. Sie laedt jetzt nebenher; die Anmeldemaske
  // ergaenzt sich, sobald die Werte da sind.
  if (!anmeldungGeladen) {
    return <Startbildschirm />;
  }

  if (!isLoggedIn) {
    return (
      // Zurueck zur Kirchenkreis-Wahl nur in der App: Im Web gibt es keine
      // Auswahl, dort steht der Server fest. Die gemerkte Instanz muss dabei
      // weg, sonst startet die App gleich wieder mit derselben.
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

  // Verwaltung hat in der Sidebar einen eigenen Eintrag — mobil (ohne eigenen
  // Eintrag) markiert „Einstellungen" auch die Verwaltung als aktiv
  const isNavItemActive = (id, mobil = false) =>
    activeTab === id || (mobil && id === 'einstellungen' && activeTab === 'verwaltung');

  const handleNavClick = (id) => {
    // Der prominente Knopf ist eine Aktion, kein Ziel: Er oeffnet den
    // Erfassungsflow und laesst den sichtbaren Tab stehen. Wuerde er activeTab
    // setzen, staende die App nach dem Schliessen des Sheets auf einem Screen,
    // den es nicht gibt.
    if (id === ERFASSEN_ID) {
      if (IST_NATIVE) auswahlHaptik();
      erfassung.open();
      return;
    }
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
