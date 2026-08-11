import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Building2, Coins, Star, User, SunMoon, Key, Users,
  ChevronRight, ArrowLeft, Bell, Info, HelpCircle, LogOut,
} from 'lucide-react';
import { AppContext } from '../../contexts/AppContext';
import UserManagement from '../../UserManagement';
import OrteDistanzenBereich from './OrteDistanzenBereich';
import TraegerBereich from './TraegerBereich';
import ErstattungBereich from './ErstattungBereich';
import FavoritenBereich from './FavoritenBereich';
import ProfilBereich from './ProfilBereich';
import DarstellungBereich from './DarstellungBereich';
import ApiBereich from './ApiBereich';

// Einstellungen nach Spec Screen 7: Desktop Liste links (212px) + Inhalt
// rechts in einer Karte; mobil Vollbild-Liste mit Drilldown.
// Reihenfolge nach Nutzungshäufigkeit (Spec) — „API-Zugriff" als
// zusätzlicher Punkt am Ende, „Verwaltung" (Admin) mobil in der Liste,
// desktop über den Sidebar-Eintrag.
// Reihenfolge nach dem, was zuerst gebraucht wird: Profil (dort stehen Name,
// IBAN und der Wohnort — ohne die stimmt die Abrechnung nicht), dann die
// Stammdaten, zuletzt Selteneres.
const BEREICHE = [
  { id: 'profil', label: 'Profil & Passwort', Icon: User, Component: ProfilBereich },
  { id: 'orte', label: 'Orte & Distanzen', Icon: MapPin, Component: OrteDistanzenBereich },
  { id: 'traeger', label: 'Abrechnungsträger', Icon: Building2, Component: TraegerBereich },
  { id: 'erstattung', label: 'Erstattungssätze', Icon: Coins, Component: ErstattungBereich },
  { id: 'favoriten', label: 'Favoriten', Icon: Star, Component: FavoritenBereich },
  { id: 'darstellung', label: 'Darstellung', Icon: SunMoon, Component: DarstellungBereich },
  { id: 'api', label: 'API-Zugriff', Icon: Key, Component: ApiBereich },
  { id: 'verwaltung', label: 'Verwaltung', Icon: Users, Component: UserManagement, adminOnly: true, mobileOnly: true },
];

// Alte Sub-Tab-IDs (Deeplinks wie „einstellungen:favoriten") → neue Bereiche
const LEGACY_MAP = {
  profile: 'profil',
  security: 'profil',
  abrechnungen: 'traeger',
  erstattungssaetze: 'erstattung',
  distanzen: 'orte',
  mitfahrer: 'erstattung',
};

function EinstellungenView({ initialTab, onShowInfo, onShowNewFeatures }) {
  const { user, logout } = useContext(AppContext);
  const isAdmin = user?.role === 'admin';

  const bereiche = BEREICHE.filter((b) => !b.adminOnly || isAdmin);

  const [aktiv, setAktiv] = useState('orte');
  // Mobil: false = Bereichsliste, true = Bereich als eigene Seite
  const [drilldown, setDrilldown] = useState(false);

  useEffect(() => {
    if (!initialTab) return;
    const ziel = LEGACY_MAP[initialTab] || initialTab;
    if (BEREICHE.some((b) => b.id === ziel)) {
      setAktiv(ziel);
      setDrilldown(true);
    }
  }, [initialTab]);

  const aktiverBereich = bereiche.find((b) => b.id === aktiv) || bereiche[0];
  const Inhalt = aktiverBereich.Component;

  const oeffneBereich = (id) => {
    setAktiv(id);
    setDrilldown(true);
  };

  return (
    <div className={`set-root${drilldown ? ' is-detail' : ''}`}>
      <div className="set-layout">
        {/* Bereichsliste: desktop links, mobil Vollbild */}
        <nav className="set-nav" aria-label="Einstellungen">
          {bereiche.map(({ id, label, Icon, mobileOnly }) => (
            <button
              key={id}
              type="button"
              onClick={() => oeffneBereich(id)}
              className={`set-nav-item${aktiv === id ? ' is-active' : ''}${mobileOnly ? ' set-item-mobile-only' : ''}`}
              aria-current={aktiv === id ? 'true' : undefined}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
              <span className="set-nav-chevron" aria-hidden="true">
                <ChevronRight size={17} />
              </span>
            </button>
          ))}

          {/* Sekundäraktionen (mobil): beschriftet statt nur Icons — drei
              unbeschriftete Symbole nebeneinander waren nicht zu unterscheiden */}
          <div className="set-nav-foot">
            <div className="set-nav-foot-links">
              <button
                type="button"
                onClick={onShowNewFeatures}
                className="set-nav-foot-link"
              >
                <Bell size={18} />
                <span>Neuigkeiten</span>
              </button>
              <Link to="/help" className="set-nav-foot-link">
                <HelpCircle size={18} />
                <span>Hilfe &amp; Anleitung</span>
              </Link>
              <button
                type="button"
                onClick={onShowInfo}
                className="set-nav-foot-link"
              >
                <Info size={18} />
                <span>Über die App</span>
              </button>
              <button
                type="button"
                onClick={logout}
                className="set-nav-foot-link is-abmelden"
              >
                <LogOut size={18} />
                <span>Abmelden</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Inhalt: desktop Karte rechts, mobil Drilldown-Seite */}
        <div className="set-content">
          <div className="set-back">
            <button
              type="button"
              className="set-back-btn"
              onClick={() => setDrilldown(false)}
              aria-label="Zurück zu den Einstellungen"
            >
              <ArrowLeft size={22} />
            </button>
            <span className="set-back-titel">{aktiverBereich.label}</span>
          </div>
          <Inhalt />
        </div>
      </div>
    </div>
  );
}

export default EinstellungenView;
