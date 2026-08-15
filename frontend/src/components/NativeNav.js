import React from 'react';

// Plattform-Navigation fuer die native Huelle. Die Web-Bottom-Nav
// (.bottom-nav) bleibt davon unberuehrt — beides schliesst sich in
// AppContent gegenseitig aus.
//
// Beide Varianten arbeiten mit derselben NAV_ITEMS-Struktur wie Sidebar und
// Web-Nav; sie aendern nur Aufbau und Bewegung, nie die Daten.

// ---------------------------------------------------------------------------
// iOS 26: schwebende Capsule ueber dem Inhalt.
//
// Kein Versuch, "Liquid Glass" nachzubauen: der definierende Lensing-Effekt
// braucht backdrop-filter: url(#filter), das WebKit nicht kennt. Der Eindruck
// entsteht hier ueber Struktur — Schweben, Capsule-Radius, konzentrische
// Innenformen — plus genau EINE Glasflaeche (siehe CSS).
//
// Aktiver Tab: gefuelltes Symbol. lucide-react zeichnet Icons als Stroke, ein
// Fill auf currentColor liefert die iOS-typische gefuellte Variante, ohne ein
// zweites Icon-Set einzufuehren.
function IosTabBar({ items, aktivId, onSelect, badgeId, badgeAnzahl }) {
  return (
    <nav className="ios-tabbar" aria-label="Hauptnavigation">
      <div className="ios-tabbar-glas">
        {items.map((item) => {
          const Icon = item.icon;
          const aktiv = aktivId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`ios-tab${aktiv ? ' is-active' : ''}`}
              onClick={() => onSelect(item.id)}
              aria-current={aktiv ? 'page' : undefined}
            >
              <span className="ios-tab-icon">
                <Icon size={24} strokeWidth={aktiv ? 2.4 : 1.9} aria-hidden="true" />
                {item.id === badgeId && badgeAnzahl > 0 && (
                  <span className="ios-tab-badge" aria-hidden="true">
                    {badgeAnzahl > 9 ? '9+' : badgeAnzahl}
                  </span>
                )}
              </span>
              <span className="ios-tab-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Android, Material Design 3 (Expressive).
//
// Der Active Indicator gleitet NICHT zwischen den Tabs — MD3 skaliert ihn am
// Ort: am alten Item scaleX -> 0, am neuen scaleX -> 1. Eine wandernde Pille
// waere das falsche Idiom. Deshalb bekommt JEDES Item seinen eigenen
// Indicator, dessen Transform vom aktiven Zustand abhaengt.
//
// Aktives Icon (on-secondary-container) und aktives Label (on-surface) haben
// bewusst unterschiedliche Farbrollen — der haeufigste Fehler bei MD3-Navs.
function AndroidNavBar({ items, aktivId, onSelect, badgeId, badgeAnzahl }) {
  return (
    <nav className="md-navbar" aria-label="Hauptnavigation">
      {items.map((item) => {
        const Icon = item.icon;
        const aktiv = aktivId === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={`md-nav-item${aktiv ? ' is-active' : ''}`}
            onClick={() => onSelect(item.id)}
            aria-current={aktiv ? 'page' : undefined}
          >
            <span className="md-nav-icon-slot">
              <span className="md-nav-indicator" aria-hidden="true" />
              <span className="md-nav-icon">
                <Icon size={24} strokeWidth={aktiv ? 2.3 : 1.9} aria-hidden="true" />
                {item.id === badgeId && badgeAnzahl > 0 && (
                  <span className="md-nav-dot" aria-hidden="true" />
                )}
              </span>
            </span>
            <span className="md-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function NativeNav({ plattform, items, aktivId, onSelect, badgeId, badgeAnzahl = 0 }) {
  const props = { items, aktivId, onSelect, badgeId, badgeAnzahl };
  if (plattform === 'ios') return <IosTabBar {...props} />;
  if (plattform === 'android') return <AndroidNavBar {...props} />;
  return null;
}

export default NativeNav;
