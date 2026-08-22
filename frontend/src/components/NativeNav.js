import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../ThemeContext';
import { overlayBeobachten } from '../utils/overlayStack';
import { tastaturAbonnieren, tastaturHoehe } from '../utils/tastatur';

// Plattform-Navigation fuer die native Huelle: eine ECHTE Systemleiste, kein
// Nachbau in der WebView. Auf iOS 26 rendert UIKit die systemeigene
// Liquid-Glass-Tab-Bar, auf Android eine echte Material-3-Navigationsleiste.
//
// Die Komponente zeichnet deshalb nichts (`return null`) — sie beschreibt nur
// den Zustand der nativen Leiste per Effekt. Die Props-Schnittstelle bleibt
// dieselbe wie beim frueheren DOM-Nachbau, damit AppContent unveraendert
// bleibt.
//
// Die Web-Bottom-Nav (.bottom-nav) ist davon nicht beruehrt: AppContent
// rendert entweder diese Komponente ODER die Web-Nav. Das Plugin wird per
// dynamischem import() geladen, damit es im Web-Bundle gar nicht erst landet.

// Native Leisten rendern Symbole selbst — React-Komponenten aus lucide-react
// sind ueber die Bruecke nicht uebertragbar. Deshalb pro Tab zwei
// serialisierbare Beschreibungen:
//   iOS     -> SF Symbol (Systemsatz, passt automatisch zur Glass-Bar)
//   Android -> Inline-SVG mit den Pfaden aus lucide-react, damit die App auf
//              beiden Plattformen dieselbe Bildsprache behaelt.
// Die Zuordnung laeuft ueber die id aus NAV_ITEMS, nicht ueber die Reihenfolge.
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
  // Prominenter Knopf: das Plus ist auf beiden Systemen das Zeichen fuer
  // „neu anlegen". Kein gefuelltes Gegenstueck — der Knopf hat keinen
  // ausgewaehlten Zustand, er loest nur aus.
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

// Fallback, falls NAV_ITEMS spaeter einen Eintrag ohne Symbol bekommt: lieber
// ein neutrales Zeichen als eine leere Flaeche in der Systemleiste.
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

// ---------------------------------------------------------------------------
// Farben aus dem Designsystem statt fester Werte im Aufruf: Die native Leiste
// soll aus demselben Guss sein wie die App. Die Tokens stehen als
// CSS-Variablen am <html>, also werden sie zur Laufzeit dort ausgelesen und
// als Hex uebergeben. Beim Wechsel hell/dunkel setzt ThemeContext die Klasse
// .dark — der Effekt unten haengt an isDark und liest neu.
//
// Farbwerte muessen dem nativen Parser als #RRGGBB bzw. #AARRGGBB zugehen.
// tokens.css liefert bereits Hex; alles andere (etwa ein rgb()-Wert aus einem
// spaeteren Token) wird hier umgerechnet.
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

function leseFarben() {
  const stil = getComputedStyle(document.documentElement);
  const token = (name, ersatz) => alsHex(stil.getPropertyValue(name), ersatz);
  return {
    // dynamic MUSS false bleiben: Material You wuerde sonst auf Android die
    // Systemfarbe der Nutzer:innen ueber unser Petrol legen.
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

  // Aktuelle Callbacks als Ref: Der Listener wird nur EINMAL angemeldet. Waere
  // onSelect eine Abhaengigkeit, meldete er sich bei jedem Render neu an — in
  // der Luecke dazwischen gingen Taps ins Leere.
  // Ids, die nur eine Aktion ausloesen und keinen Screen oeffnen (role
  // 'prominent'/'search'). Sie duerfen in der Leiste nicht ausgewaehlt bleiben.
  const aktionsIds = useMemo(
    () => new Set(items.filter((i) => i.role && i.role !== 'normal').map((i) => i.id)),
    [items]
  );

  const stand = useRef({ onSelect, aktivId, aktionsIds });
  stand.current = { onSelect, aktivId, aktionsIds };

  // Was die native Leiste zuletzt SELBST gemeldet hat. Kommt ein Wechsel von
  // dort, hat sie ihre Auswahl bereits umgestellt; ein Rueckruf nach nativ
  // waere ueberfluessig und koennte ein weiteres Ereignis ausloesen. Der
  // React-State bleibt die einzige Wahrheit, dieser Ref ist nur die Notiz
  // "das weiss die Leiste schon".
  const nativBekannt = useRef(null);

  const pluginRef = useRef(null);
  // Zaehler statt Boolean: Er macht das Eintreffen des Plugins zu einer
  // Abhaengigkeit des Effekts unten. Ohne ihn liefe der erste Aufbau der Leiste
  // ins Leere, weil das Plugin beim ersten Render noch geladen wird.
  const [pluginBereit, setPluginBereit] = useState(0);

  // Overlay-Kopplung: Die native Leiste liegt UEBER der WebView — kein z-index
  // im Dokument erreicht sie. Ein offenes Sheet wuerde sonst unten von ihr
  // angeschnitten. Solange etwas im Overlay-Stapel liegt, verschwindet sie.
  const [overlayOffen, setOverlayOffen] = useState(false);

  useEffect(() => overlayBeobachten(setOverlayOffen), []);

  // Dasselbe bei offener Tastatur: Sie liegt ebenfalls ueber der WebView, und
  // die Leiste bliebe sonst zwischen Tastatur und Inhalt haengen — sie schwebt
  // dann mitten im Bild oder wird von der Tastatur angeschnitten. Wer tippt,
  // braucht sie ohnehin nicht.
  // Startwert direkt abfragen: Das Abo meldet erst bei der naechsten
  // Aenderung. Baut sich die Leiste bei schon offener Tastatur neu auf, bliebe
  // sie sonst stehen, bis die Tastatur das naechste Mal faehrt.
  const [tastaturOffen, setTastaturOffen] = useState(() => tastaturHoehe() > 0);

  useEffect(() => {
    setTastaturOffen(tastaturHoehe() > 0);
    return tastaturAbonnieren((hoehe) => setTastaturOffen(hoehe > 0));
  }, []);

  // Beide Gruende fuehren zum selben Ergebnis: Leiste weg.
  const leisteVerbergen = overlayOffen || tastaturOffen;

  // Plugin einmalig laden und den Listener anmelden.
  useEffect(() => {
    let abgebrochen = false;
    let abmelden = null;

    import('@capgo/capacitor-native-navigation')
      .then(({ NativeNavigation }) => {
        if (abgebrochen) return undefined;
        pluginRef.current = NativeNavigation;

        // contentInsetMode: 'css' laesst das Plugin die tatsaechliche Hoehe der
        // Leiste als CSS-Variablen an <html> schreiben. Nur damit stimmt der
        // Abstand des Inhalts zur echten Leiste — feste Werte plus
        // env(safe-area-inset-bottom) koennen das nicht treffen.
        return NativeNavigation.configure({
          enabled: true,
          platformStyle: 'auto',
          contentInsetMode: 'css',
          colors: leseFarben(),
          glass: { effect: 'liquidGlass' },
        })
          .then(() =>
            NativeNavigation.addListener('tabSelect', (ereignis) => {
              const { onSelect: waehle, aktivId: aktuell, aktionsIds: aktionen } =
                stand.current;
              // Aktions-Eintraege (der prominente Knopf) haben keinen Screen.
              // Die Leiste hat ihn beim Tippen trotzdem als ausgewaehlt
              // markiert — deshalb NICHT als bekannten Stand merken, sondern
              // die Auswahl sofort auf den offenen Tab zuruecksetzen. Sonst
              // bliebe der Knopf hervorgehoben, obwohl nur ein Sheet aufging.
              if (aktionen?.has(ereignis.id)) {
                nativBekannt.current = null;
                pluginRef.current
                  ?.setTabbar({ selectedId: aktuell, animated: false })
                  .catch(() => {});
                waehle(ereignis.id);
                return;
              }
              nativBekannt.current = ereignis.id;
              // Gleicher Tab: nichts zu tun. Sonst liefe bei jedem Tippen auf
              // den offenen Tab ein Zustandswechsel samt Haptik.
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
        // Ohne Plugin bleibt die App bedienbar: Die Leiste fehlt dann, aber
        // nichts blockiert. Ein Absturz waere hier das schlechtere Verhalten.
      });

    return () => {
      abgebrochen = true;
      if (abmelden) abmelden();
      // Beim Abmelden (Logout, Instanzwechsel) muss die native Leiste weg —
      // sie liegt sonst weiter ueber der Anmeldemaske.
      pluginRef.current?.setTabbar({ hidden: true, animated: false }).catch(() => {});
    };
  }, []);

  // Tabs, Auswahl, Badge und Farben an die native Leiste geben.
  //
  // Ein Effekt fuer alles: Die native Leiste nimmt ihren Zustand als Ganzes
  // entgegen, und getrennte Effekte wuerden nur mehrere Bruecken-Aufrufe pro
  // Wechsel erzeugen.
  useEffect(() => {
    const plugin = pluginRef.current;
    if (!plugin) return;

    // Kam der Wechsel gerade von der Leiste selbst, kennt sie ihn schon.
    // Trotzdem laufen Farben und Badge unten weiter durch — nur die Auswahl
    // wird dann nicht erneut gesetzt.
    const vonNativ = nativBekannt.current === aktivId;
    nativBekannt.current = aktivId;

    const tabs = items.map((item) => ({
      id: item.id,
      title: item.label,
      icon: symbolFuer(item.id, plattform, item.id === aktivId),
      // Auf iOS wechselt die Systemleiste beim Auswaehlen selbst auf das
      // gefuellte Symbol; auf Android bleibt es beim Umriss (MD3-Idiom).
      selectedIcon: plattform === 'ios' ? symbolFuer(item.id, plattform, true) : undefined,
      // Native Badges kuerzen selbst — der frueher noetige "9+"-Trick entfaellt.
      badge: item.id === badgeId && badgeAnzahl > 0 ? badgeAnzahl : undefined,
      // 'prominent' loest den Eintrag aus der Kapsel und stellt ihn als runden
      // Knopf daneben. Ohne role bleibt es beim normalen Tab.
      role: item.role,
    }));

    plugin
      .setTabbar({
        hidden: leisteVerbergen,
        tabs,
        selectedId: vonNativ ? undefined : aktivId,
        labels: true,
        colors: leseFarben(),
        glass: { effect: 'liquidGlass' },
        style: { shape: 'floating' },
        animated: true,
      })
      .catch(() => {});
    // isDark steht bewusst in den Abhaengigkeiten, obwohl es im Rumpf nicht
    // vorkommt: Es ist der Ausloeser dafuer, die Tokens neu auszulesen.
    // pluginBereit ebenso — es markiert den Moment, ab dem die Bruecke steht.
  }, [
    items,
    aktivId,
    badgeId,
    badgeAnzahl,
    plattform,
    isDark,
    leisteVerbergen,
    pluginBereit,
  ]);

  return null;
}

export default NativeNav;
