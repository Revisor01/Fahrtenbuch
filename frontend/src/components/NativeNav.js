import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../ThemeContext';
import { overlayBeobachten } from '../utils/overlayStack';

// Beschreibt die native Leiste per Effekt und rendert selbst nichts; das Plugin wird dynamisch geladen, damit es nicht ins Web-Bundle kommt.

// Je Tab ein SF Symbol (iOS) und Inline-SVG aus lucide (Android), zugeordnet über die id.
const SVG_KOPF = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';

function svg(inhalt) {
  return `${SVG_KOPF}${inhalt}</svg>`;
}

const SYMBOLE = {
  dashboard: {
    ios: { sfSymbol: 'house' },
    iosAktiv: { sfSymbol: 'house.fill' },
    android: svg(
      '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/>' +
        '<path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
    ),
  },
  fahrten: {
    ios: { sfSymbol: 'car' },
    iosAktiv: { sfSymbol: 'car.fill' },
    android: svg(
      '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>' +
        '<circle cx="7" cy="17" r="2"/>' +
        '<path d="M9 17h6"/>' +
        '<circle cx="17" cy="17" r="2"/>'
    ),
  },
  abrechnungen: {
    ios: { sfSymbol: 'doc.text' },
    iosAktiv: { sfSymbol: 'doc.text.fill' },
    android: svg(
      '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>' +
        '<path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>' +
        '<path d="M12 17.5v-11"/>'
    ),
  },
  // Plus für „neu anlegen“, ohne gefülltes Gegenstück, der Knopf hat keine Auswahl.
  erfassen: {
    ios: { sfSymbol: 'plus' },
    iosAktiv: { sfSymbol: 'plus' },
    android: svg('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  },
  einstellungen: {
    ios: { sfSymbol: 'gearshape' },
    iosAktiv: { sfSymbol: 'gearshape.fill' },
    android: svg(
      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>' +
        '<circle cx="12" cy="12" r="3"/>'
    ),
  },
};

// Lieber ein neutrales Zeichen als eine leere Fläche.
const ERSATZSYMBOL = {
  ios: { sfSymbol: 'circle' },
  iosAktiv: { sfSymbol: 'circle.fill' },
  android: svg('<circle cx="12" cy="12" r="9"/>'),
};

function symbolFuer(id, plattform, aktiv) {
  const eintrag = SYMBOLE[id] || ERSATZSYMBOL;
  if (plattform === 'ios') {
    return { ios: aktiv ? eintrag.iosAktiv : eintrag.ios };
  }
  return { android: { svg: eintrag.android }, width: 24, height: 24 };
}

// ── Farben aus den CSS-Tokens zur Laufzeit als #RRGGBB/#AARRGGBB, neu bei Wechsel hell/dunkel ──
function alsHex(wert, ersatz) {
  const roh = (wert || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(roh)) return roh.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(roh)) {
    return `#${roh[1]}${roh[1]}${roh[2]}${roh[2]}${roh[3]}${roh[3]}`.toUpperCase();
  }
  const rgb = roh.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (rgb) {
    const teil = (n) =>
      Math.max(0, Math.min(255, Math.round(parseFloat(n))))
        .toString(16)
        .padStart(2, '0');
    return `#${teil(rgb[1])}${teil(rgb[2])}${teil(rgb[3])}`.toUpperCase();
  }
  return ersatz;
}

// Android MaterialNav (eigenes Plugin, Material 3), iOS @capgo/capacitor-native-navigation; Rückgabe in { plugin }, weil ein Capacitor-Proxy sonst als Thenable gilt.
async function ladePlugin(plattform) {
  if (plattform === 'android') {
    const { registerPlugin } = await import('@capacitor/core');
    return { plugin: registerPlugin('MaterialNav') };
  }
  const { NativeNavigation } = await import('@capgo/capacitor-native-navigation');
  return { plugin: NativeNavigation };
}

// Android mit MD3-Maßen (80 dp, ohne Rand und Radius), sonst bekäme es die iOS-Kapsel.
function formFuer(plattform) {
  if (plattform === 'android') {
    return { shape: 'floating', height: 80, horizontalMargin: 0, maxWidth: 0, bottomGap: 0, cornerRadius: 0 };
  }
  return { shape: 'floating' };
}

// Auf Android deckend, MD3 kennt kein Glas.
function glasFuer(plattform) {
  return plattform === 'android' ? undefined : { effect: 'liquidGlass' };
}

function leseFarben() {
  const stil = getComputedStyle(document.documentElement);
  const token = (name, ersatz) => alsHex(stil.getPropertyValue(name), ersatz);
  return {
    // false, sonst legt Material You die Systemfarbe über das Petrol.
    dynamic: false,
    tint: token('--brand', '#0F5257'),
    inactiveTint: token('--text-2', '#47605F'),
    background: token('--surface', '#FFFFFF'),
    foreground: token('--text', '#08201F'),
    badgeBackground: token('--accent', '#B87A20'),
    badgeText: '#FFFFFF',
    indicator: token('--brand-soft', '#DBEAEA'),
    ripple: token('--brand-soft', '#DBEAEA'),
  };
}

function NativeNav({ plattform, items, aktivId, onSelect, badgeId, badgeAnzahl = 0 }) {
  const { isDark } = useTheme();

  // Callbacks als Ref, damit der Listener nur einmal anmeldet; Aktions-Ids bleiben nicht ausgewählt.
  const aktionsIds = useMemo(
    () => new Set(items.filter((i) => i.role && i.role !== 'normal').map((i) => i.id)),
    [items]
  );

  // Damit der configure-Effekt sie liest, ohne sie als Abhängigkeit zu haben.
  const stand = useRef({ onSelect, aktivId, aktionsIds, plattform });
  stand.current = { onSelect, aktivId, aktionsIds, plattform };

  // Zuletzt von der Leiste gemeldet, ein Rückruf dorthin wäre überflüssig.
  const nativBekannt = useRef(null);

  const pluginRef = useRef(null);
  // Zähler, damit das Eintreffen des Plugins den Effekt auslöst.
  const [pluginBereit, setPluginBereit] = useState(0);

  // Die native Leiste liegt über der WebView, bei offenem Overlay verschwindet sie.
  const [overlayOffen, setOverlayOffen] = useState(false);

  useEffect(() => overlayBeobachten(setOverlayOffen), []);

  // Plugin einmalig laden und den Listener anmelden.
  useEffect(() => {
    let abgebrochen = false;
    let abmelden = null;

    ladePlugin(stand.current.plattform)
      .then(({ plugin: NativeNavigation }) => {
        if (abgebrochen || !NativeNavigation) return undefined;
        pluginRef.current = NativeNavigation;

        // 'css' schreibt die echte Leistenhöhe als CSS-Variablen; MaterialNav kennt nur colors.
        return NativeNavigation.configure(
          stand.current.plattform === 'android'
            ? { colors: leseFarben() }
            : {
                enabled: true,
                platformStyle: 'auto',
                contentInsetMode: 'css',
                colors: leseFarben(),
                glass: glasFuer(stand.current.plattform),
              }
        )
          .then(() =>
            NativeNavigation.addListener('tabSelect', (ereignis) => {
              const { onSelect: waehle, aktivId: aktuell, aktionsIds: aktionen } =
                stand.current;
              // Aktions-Einträge sofort auf den offenen Tab zurücksetzen, sonst bleibt der Knopf markiert.
              if (aktionen?.has(ereignis.id)) {
                nativBekannt.current = null;
                pluginRef.current
                  ?.setTabbar({ selectedId: aktuell, animated: false })
                  .catch(() => {});
                waehle(ereignis.id);
                return;
              }
              nativBekannt.current = ereignis.id;
              // Gleicher Tab, nichts zu tun.
              if (ereignis.id === aktuell) return;
              waehle(ereignis.id);
            })
          )
          .then((handle) => {
            if (abgebrochen) {
              handle.remove();
              return;
            }
            abmelden = () => handle.remove();
            // Jetzt erst darf der Effekt unten die Leiste aufbauen.
            setPluginBereit((n) => n + 1);
          });
      })
      .catch(() => {
        // Ohne Plugin fehlt die Leiste, aber nichts blockiert.
      });

    return () => {
      abgebrochen = true;
      if (abmelden) abmelden();
      // Beim Abmelden muss die Leiste weg, sonst liegt sie über der Anmeldemaske.
      pluginRef.current?.setTabbar({ hidden: true, animated: false }).catch(() => {});
    };
  }, []);

  // Ein Effekt für Tabs, Auswahl, Badge und Farben, weil die Leiste ihren Zustand als Ganzes nimmt.
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;

    // Kam der Wechsel von der Leiste, wird nur die Auswahl nicht erneut gesetzt.
    const vonNativ = nativBekannt.current === aktivId;
    nativBekannt.current = aktivId;

    const tabs = items.map((item) => ({
      id: item.id,
      title: item.label,
      icon: symbolFuer(item.id, plattform, item.id === aktivId),
      // iOS wechselt selbst aufs gefüllte Symbol, Android bleibt beim Umriss.
      selectedIcon: plattform === 'ios' ? symbolFuer(item.id, plattform, true) : undefined,
      // Native Badges kuerzen selbst — der frueher noetige "9+"-Trick entfaellt.
      badge: item.id === badgeId && badgeAnzahl > 0 ? badgeAnzahl : undefined,
      // 'prominent' stellt den Eintrag als runden Knopf neben die Kapsel.
      role: item.role,
    }));

    plugin
      .setTabbar({
        hidden: overlayOffen,
        tabs,
        selectedId: vonNativ ? undefined : aktivId,
        labels: true,
        colors: leseFarben(),
        glass: glasFuer(plattform),
        style: formFuer(plattform),
        animated: true,
      })
      .catch(() => {});
    // isDark und pluginBereit als Auslöser, obwohl sie im Rumpf fehlen.
  }, [
    items,
    aktivId,
    badgeId,
    badgeAnzahl,
    plattform,
    isDark,
    overlayOffen,
    pluginBereit,
  ]);

  return null;
}

export default NativeNav;
