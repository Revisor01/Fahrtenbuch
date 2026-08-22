import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../../contexts/AppContext';
import Sheet from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { useAdressSuche, adresseZuKoordinaten } from '../useAdressSuche';
import { Pencil, Search, ChevronRight, ChevronLeft, MapPin, Crosshair, Check, Plus, X } from 'lucide-react';
import MitfahrerModal from '../../MitfahrerModal';
import { RICHTUNG_TEXT } from '../../FahrtForm';

// Zweistufiger Erfassungsflow nach Design-Spec (Redesign 2026, Screen 2):
// Schritt 1 „Wohin?" — Startort/Datum vorbelegt und antippbar, Ortsliste nach
// Häufigkeit sortiert (Distanz vom Startort rechts), „Anderes Ziel eingeben".
// Schritt 2 „Bestätigen" — Route + „km · €" (Erstattungssatz des Trägers),
// Anlass-Chips aus dem Verlauf für dieses Ziel, Rückfahrt-Switch,
// Abrechnungsträger-Zeile, mitzählender Speichern-Button.
// Speichern läuft optimistisch: Sheet schließt sofort, Toast mit „Rückgängig";
// bei API-Fehler Fehler-Toast und Rollback der optimistischen Einträge.

const STANDARD_SATZ = 0.3; // Fallback, wenn kein Erstattungssatz gepflegt ist

// Lokales Datum, nicht UTC: toISOString() liefert zwischen Mitternacht und
// 2 Uhr (Sommerzeit) noch den Vortag und wuerde Fahrten falsch datieren.
const heute = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

function formatDatumZeile(datum) {
  const d = new Date(`${datum}T00:00:00`);
  const label = d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
  return datum === heute() ? `heute, ${label}` : label;
}

function formatKm(km) {
  if (km === null || km === undefined || km === '') return '';
  const num = parseFloat(km);
  if (Number.isNaN(num)) return '';
  return Number.isInteger(num) ? String(num) : num.toFixed(1).replace('.', ',');
}

function formatEuro(betrag) {
  return betrag.toFixed(2).replace('.', ',');
}

function ErfassungsFlow({ isOpen, onClose, prefill }) {
  const { orte, distanzen, abrechnungstraeger, anlaesse, addAnlass, setFahrten, refreshAllData } =
    useContext(AppContext);
  const toast = useToast();

  // prefill mit Ziel springt direkt in Schritt 2 („Wiederholen"-Signatur)
  const [step, setStep] = useState(prefill?.nachOrtId ? 2 : 1);
  const [startOrtId, setStartOrtId] = useState(prefill?.vonOrtId ? String(prefill.vonOrtId) : null);
  const [datum, setDatum] = useState(prefill?.datum || heute());
  const [zielOrtId, setZielOrtId] = useState(prefill?.nachOrtId ? String(prefill.nachOrtId) : null);
  const [suche, setSuche] = useState('');
  const [anlass, setAnlass] = useState(prefill?.anlass || '');
  // Anlass-Auswahl klappt wie die Trägerliste in der Zeile auf
  const [anlassAuswahlOffen, setAnlassAuswahlOffen] = useState(false);
  const [anlassSuche, setAnlassSuche] = useState('');
  // Freitext: bewusst getrennt von der Liste, damit der Unterschied zwischen
  // „einmalig eintippen" und „dauerhaft merken" sichtbar bleibt
  const [freiAnlassAktiv, setFreiAnlassAktiv] = useState(false);
  const [anlassMerken, setAnlassMerken] = useState(false);
  const [anlassSpeichert, setAnlassSpeichert] = useState(false);
  // Frisch angelegte Anlässe sofort in der Liste zeigen, auch bevor der
  // Context-Refresh durch ist
  const [neueAnlaesse, setNeueAnlaesse] = useState([]);
  // null = automatisch (Heuristik/Verlauf), Nutzerwahl überschreibt
  const [rueckfahrtWahl, setRueckfahrtWahl] = useState(
    prefill?.mitRueckfahrt !== undefined ? !!prefill.mitRueckfahrt : null
  );
  const [traegerWahl, setTraegerWahl] = useState(
    prefill?.abrechnung ? String(prefill.abrechnung) : null
  );
  const [traegerAuswahlOffen, setTraegerAuswahlOffen] = useState(false);
  // Mitfahrer:innen direkt beim Erfassen — vorher liessen sie sich nur
  // nachtraeglich ueber „Bearbeiten" eintragen
  const [mitfahrer, setMitfahrer] = useState([]);
  const [mitfahrerDialog, setMitfahrerDialog] = useState(false);
  const [mitfahrerEditIndex, setMitfahrerEditIndex] = useState(null);
  const [kmManuell, setKmManuell] = useState(
    prefill?.kilometer !== undefined && prefill?.kilometer !== null ? String(prefill.kilometer) : ''
  );
  const [kmEdit, setKmEdit] = useState(false);
  const [editStart, setEditStart] = useState(false);
  // Freier Startort (per Standort ermittelt oder aus der Adresssuche gewählt)
  const [freierStart, setFreierStart] = useState(null);
  const [startSuche, setStartSuche] = useState('');
  const [ortenStatus, setOrtenStatus] = useState(null); // 'laedt' | 'fehler' | null
  // Gewählte Live-Adresse als Ziel + ob sie dauerhaft gespeichert werden soll
  const [zielAdresse, setZielAdresse] = useState(null);
  const [zielMerken, setZielMerken] = useState(false);
  // Doppel-Tap-Sperre beim Speichern (Ref, weil der State-Update zu spät kommt)
  const [speichert, setSpeichert] = useState(false);
  const speichertRef = useRef(false);
  // Autofokus: Ziel-Suchfeld beim Öffnen, Freitext-Anlass beim Aufklappen
  const zielSucheRef = useRef(null);
  const anlassInputRef = useRef(null);

  // Verlauf (alle Fahrten) und Träger inkl. heute gültigem Erstattungssatz —
  // je ein GET beim Öffnen; Context-`fahrten` ist auf den gewählten Monat
  // beschränkt und taugt nicht als Historie.
  const [historie, setHistorie] = useState(null);
  const [traegerVoll, setTraegerVoll] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let aktiv = true;
    axios
      .get('/api/fahrten')
      .then((res) => aktiv && setHistorie(Array.isArray(res.data) ? res.data : []))
      .catch(() => aktiv && setHistorie([]));
    axios
      .get('/api/abrechnungstraeger')
      .then((res) => aktiv && setTraegerVoll(Array.isArray(res.data) ? res.data : []))
      .catch(() => aktiv && setTraegerVoll([]));
    return () => {
      aktiv = false;
    };
  }, [isOpen]);

  // Ziel-Suchfeld direkt bereit — spart einen Tap vor dem Tippen
  useEffect(() => {
    if (!isOpen || step !== 1 || editStart) return;
    const id = window.setTimeout(() => zielSucheRef.current?.focus(), 120);
    return () => window.clearTimeout(id);
  }, [isOpen, step, editStart]);

  // Freitext-Anlass fokussieren, sobald „Frei eingeben…" gewählt wurde
  useEffect(() => {
    if (freiAnlassAktiv) anlassInputRef.current?.focus();
  }, [freiAnlassAktiv]);

  // ---- Abgeleitete Werte ------------------------------------------------

  // Startort: prefill > Wohnort > Dienstort > häufigster Startort > erster Ort
  const defaultStartOrtId = useMemo(() => {
    const wohnort = orte.find((o) => o.ist_wohnort);
    if (wohnort) return String(wohnort.id);
    const dienstort = orte.find((o) => o.ist_dienstort);
    if (dienstort) return String(dienstort.id);
    if (historie && historie.length > 0) {
      const counts = {};
      historie.forEach((f) => {
        if (f.von_ort_id) counts[f.von_ort_id] = (counts[f.von_ort_id] || 0) + 1;
      });
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      if (top) return String(top[0]);
    }
    return orte.length > 0 ? String(orte[0].id) : null;
  }, [orte, historie]);

  // Freier Startort (Standort/Adresssuche) hat Vorrang vor der Ortsliste
  const effStartOrtId = freierStart ? null : startOrtId ?? defaultStartOrtId;
  const startOrt = orte.find((o) => String(o.id) === String(effStartOrtId));
  const zielOrt = orte.find((o) => String(o.id) === String(zielOrtId));

  const ortName = (ort) => (ort ? ort.name : '');
  const startLabel = freierStart ? freierStart.text : ortName(startOrt);

  // Distanz zwischen zwei gespeicherten Orten (beide Richtungen)
  const findDistanz = (vonId, nachId) => {
    if (!vonId || !nachId) return null;
    const hit = distanzen.find(
      (d) =>
        (String(d.von_ort_id) === String(vonId) && String(d.nach_ort_id) === String(nachId)) ||
        (String(d.von_ort_id) === String(nachId) && String(d.nach_ort_id) === String(vonId))
    );
    return hit ? parseFloat(hit.distanz) : null;
  };

  // Ortsliste: häufigste Ziele zuerst (Verlauf), dann alphabetisch
  const sortierteZiele = useMemo(() => {
    const counts = {};
    (historie || []).forEach((f) => {
      if (f.nach_ort_id) counts[f.nach_ort_id] = (counts[f.nach_ort_id] || 0) + 1;
    });
    const liste = orte.filter((o) => String(o.id) !== String(effStartOrtId));
    return [...liste].sort((a, b) => {
      const diff = (counts[b.id] || 0) - (counts[a.id] || 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'de');
    });
  }, [orte, historie, effStartOrtId]);

  // Startorte: Wohnort, dann Dienstort, dann alphabetisch — die beiden sind
  // in der Praxis fast immer der Ausgangspunkt
  const sortierteStartorte = useMemo(() => {
    const rang = (o) => (o.ist_wohnort ? 0 : o.ist_dienstort ? 1 : 2);
    return [...orte].sort((a, b) => {
      const diff = rang(a) - rang(b);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'de');
    });
  }, [orte]);

  // Die Ortsliste erscheint erst beim Tippen — eine Vorabliste aller Orte
  // stand nur im Weg und schob Datum/Startort aus dem Bild.
  const zielSucheClean = suche.trim();

  const gefilterteZiele = useMemo(() => {
    const q = zielSucheClean.toLowerCase();
    if (!q) return [];
    return sortierteZiele.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.adresse && o.adresse.toLowerCase().includes(q))
    );
  }, [sortierteZiele, zielSucheClean]);

  // Startorte werden ebenfalls erst getippt gesucht; ohne Eingabe bleibt die
  // Liste leer, damit das Suchfeld nicht in einer Wand aus Orten untergeht.
  const gefilterteStartorte = useMemo(() => {
    const q = startSuche.trim().toLowerCase();
    if (!q) return [];
    return sortierteStartorte.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.adresse && o.adresse.toLowerCase().includes(q))
    );
  }, [sortierteStartorte, startSuche]);

  // Live-Adressen zusätzlich zur eigenen Ortsliste — kein Chip-Klick nötig.
  // Erst ab 3 Zeichen und nur, wenn die eigenen Orte wenig hergeben.
  const { vorschlaege: adressTreffer, laedt: adressenLaden, zuruecksetzen: adressenLeeren } =
    useAdressSuche(suche, { aktiv: !zielAdresse });

  // Adressen ausblenden, die schon als eigener Ort in der Liste stehen
  const neueAdressen = useMemo(() => {
    const bekannt = new Set(
      orte.flatMap((o) => [o.name, o.adresse].filter(Boolean).map((s) => s.toLowerCase()))
    );
    return adressTreffer.filter((a) => !bekannt.has(a.text.toLowerCase()));
  }, [adressTreffer, orte]);

  // Anlass-Vorschläge aus dem Verlauf für DIESES Ziel (häufigste zuerst).
  // „Rückfahrt: "-Präfixe aus Altdaten werden für die Vorschläge entfernt.
  const anlassVorschlaege = useMemo(() => {
    if (!historie || !zielOrtId) return [];
    const counts = new Map();
    historie
      .filter((f) => String(f.nach_ort_id) === String(zielOrtId) && f.anlass)
      .forEach((f) => {
        const a = f.anlass.replace(/^Rückfahrt:\s*/i, '').trim();
        if (!a) return;
        counts.set(a, (counts.get(a) || 0) + 1);
      });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([a]) => a);
  }, [historie, zielOrtId]);

  // Gespeicherte Anlässe: häufig genutzte oben, dann alphabetisch. Frisch
  // angelegte kommen dazu, solange der Context-Refresh noch läuft.
  const alleAnlaesse = useMemo(() => {
    const nachName = new Map();
    [...(anlaesse || []), ...neueAnlaesse].forEach((a) => {
      const name = (a?.name || '').trim();
      if (!name) return;
      const vorhanden = nachName.get(name.toLowerCase());
      // Der Context-Eintrag gewinnt: er trägt die echte Nutzungshäufigkeit
      if (!vorhanden || (a.nutzung_anzahl ?? 0) >= (vorhanden.nutzung_anzahl ?? 0)) {
        nachName.set(name.toLowerCase(), { ...a, name });
      }
    });
    // Gepflegte Reihenfolge zuerst: die Migration belegt sort_order mit dem
    // Haeufigkeitsrang, spaeter darf der Nutzer sie umsortieren — dann muss
    // seine Reihenfolge die Nutzungszahl schlagen. Bei gleichem Rang (etwa
    // frisch angelegte Anlaesse) entscheidet weiter die Haeufigkeit.
    return [...nachName.values()].sort((a, b) => {
      const rang = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (rang !== 0) return rang;
      const diff = (b.nutzung_anzahl || 0) - (a.nutzung_anzahl || 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'de');
    });
  }, [anlaesse, neueAnlaesse]);

  // Ziel-Vorschläge stehen abgesetzt oben — sie dürfen in der Hauptliste
  // nicht ein zweites Mal auftauchen.
  const vorschlagSet = useMemo(
    () => new Set(anlassVorschlaege.map((a) => a.toLowerCase())),
    [anlassVorschlaege]
  );

  const anlassSucheClean = anlassSuche.trim();

  const gefilterteAnlaesse = useMemo(() => {
    const q = anlassSucheClean.toLowerCase();
    const ohneVorschlaege = alleAnlaesse.filter((a) => !vorschlagSet.has(a.name.toLowerCase()));
    if (!q) return ohneVorschlaege;
    return ohneVorschlaege.filter((a) => a.name.toLowerCase().includes(q));
  }, [alleAnlaesse, vorschlagSet, anlassSucheClean]);

  const gefilterteVorschlaege = useMemo(() => {
    const q = anlassSucheClean.toLowerCase();
    if (!q) return anlassVorschlaege;
    return anlassVorschlaege.filter((a) => a.toLowerCase().includes(q));
  }, [anlassVorschlaege, anlassSucheClean]);

  // Suchfeld erst ab genug Einträgen — bei wenigen stört es nur
  const anlassSucheZeigen = alleAnlaesse.length + anlassVorschlaege.length >= 8;

  // „… als neuen Anlass anlegen": nur, wenn die Eingabe noch nicht existiert
  const anlassExistiert = useMemo(
    () =>
      alleAnlaesse.some((a) => a.name.toLowerCase() === anlassSucheClean.toLowerCase()) ||
      vorschlagSet.has(anlassSucheClean.toLowerCase()),
    [alleAnlaesse, vorschlagSet, anlassSucheClean]
  );

  // Rückfahrt-Default: an, wenn das Ziel bisher überwiegend mit gleichtägiger
  // Gegenrichtung erfasst wurde; ohne Verlauf: an.
  const rueckfahrtDefault = useMemo(() => {
    if (!historie || !zielOrtId || !effStartOrtId) return true;
    const hin = historie.filter(
      (f) =>
        String(f.von_ort_id) === String(effStartOrtId) &&
        String(f.nach_ort_id) === String(zielOrtId)
    );
    if (hin.length === 0) return true;
    const mitRueck = hin.filter((h) =>
      historie.some(
        (r) =>
          r.id !== h.id &&
          String(r.von_ort_id) === String(zielOrtId) &&
          String(r.nach_ort_id) === String(effStartOrtId) &&
          String(r.datum).slice(0, 10) === String(h.datum).slice(0, 10)
      )
    );
    return mitRueck.length * 2 >= hin.length;
  }, [historie, zielOrtId, effStartOrtId]);

  const rueckfahrt = rueckfahrtWahl ?? rueckfahrtDefault;

  // Träger: prefill/Nutzerwahl > zuletzt für dieses Ziel genutzt > App-Default
  const aktiveTraeger = useMemo(
    () => (abrechnungstraeger || []).filter((t) => t.active !== 0 && t.active !== false),
    [abrechnungstraeger]
  );

  const defaultTraegerId = useMemo(() => {
    if (historie && zielOrtId) {
      const letzte = historie.find(
        (f) => String(f.nach_ort_id) === String(zielOrtId) && f.abrechnung
      );
      if (letzte && aktiveTraeger.some((t) => String(t.id) === String(letzte.abrechnung))) {
        return String(letzte.abrechnung);
      }
    }
    return aktiveTraeger.length > 0 ? String(aktiveTraeger[0].id) : null;
  }, [historie, zielOrtId, aktiveTraeger]);

  const effTraegerId = traegerWahl ?? defaultTraegerId;
  const effTraeger = aktiveTraeger.find((t) => String(t.id) === String(effTraegerId));

  // Erstattungssatz: heute gültiger Satz des Trägers, sonst Standardsatz (markiert)
  const traegerMitSatz = (traegerVoll || []).find((t) => String(t.id) === String(effTraegerId));
  const satz = traegerMitSatz?.aktueller_betrag ? parseFloat(traegerMitSatz.aktueller_betrag) : null;
  const effSatz = satz ?? STANDARD_SATZ;

  // Kilometer: manuelle Eingabe > gepflegte Distanz (nur zwischen echten Orten)
  const distanzKm =
    zielAdresse || freierStart ? null : findDistanz(effStartOrtId, zielOrtId);
  const km = kmManuell !== '' ? parseFloat(kmManuell) : distanzKm;
  const kmGueltig = km !== null && !Number.isNaN(km) && km > 0;
  const betrag = kmGueltig ? km * effSatz : null;

  const zielLabel = zielAdresse ? zielAdresse.text : ortName(zielOrt);
  const fahrtenAnzahl = rueckfahrt ? 2 : 1;
  const gesamtKm = kmGueltig ? km * fahrtenAnzahl : null;

  const kannWeiter = !!zielAdresse || !!zielOrtId;
  const kannSpeichern =
    kannWeiter &&
    kmGueltig &&
    !!anlass.trim() &&
    !!effTraegerId &&
    (!!effStartOrtId || !!freierStart) &&
    !!datum;

  // Warum ist der Button aus? Ohne Begründung bleibt nur Raten.
  const fehltWeiter = kannWeiter ? null : 'Ziel fehlt';
  const fehltSpeichern = useMemo(() => {
    if (kannSpeichern) return null;
    const fehlt = [];
    if (!kannWeiter) fehlt.push('Ziel');
    if (!effStartOrtId && !freierStart) fehlt.push('Startort');
    if (!datum) fehlt.push('Datum');
    if (!kmGueltig) fehlt.push('Kilometer');
    if (!anlass.trim()) fehlt.push('Anlass');
    if (!effTraegerId) fehlt.push('Abrechnungsträger');
    if (fehlt.length === 0) return null;
    return `Noch offen: ${fehlt.join(', ')}`;
  }, [
    kannSpeichern,
    kannWeiter,
    effStartOrtId,
    freierStart,
    datum,
    kmGueltig,
    anlass,
    effTraegerId,
  ]);

  // ---- Aktionen ----------------------------------------------------------

  // Standort -> exakte Adresse (Reverse-Geocoding). Ein gespeicherter Ort wird
  // nur übernommen, wenn er praktisch am selben Punkt liegt (~60 m, also
  // Nachbarhausnummer); sonst zählt die tatsächlich ermittelte Adresse.
  const handleStandort = () => {
    if (!navigator.geolocation) {
      setOrtenStatus('fehler');
      return;
    }
    setOrtenStatus('laedt');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const treffer = await adresseZuKoordinaten(latitude, longitude);
          if (!treffer) {
            setOrtenStatus('fehler');
            return;
          }
          const naher = orte.find(
            (o) => o.adresse && o.adresse.toLowerCase() === treffer.text.toLowerCase()
          );
          if (naher) {
            setStartOrtId(String(naher.id));
            setFreierStart(null);
          } else {
            setFreierStart(treffer);
            setStartOrtId(null);
          }
          setOrtenStatus(null);
          setEditStart(false);
        } catch (err) {
          console.error('Reverse-Geocoding fehlgeschlagen:', err);
          setOrtenStatus('fehler');
        }
      },
      () => setOrtenStatus('fehler'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // km-Feld haengt allein an kmManuell. Beim Oeffnen einmalig mit der
  // bekannten Distanz vorbelegen - sonst schnappt das Feld beim Leeren
  // sofort wieder auf die Distanz zurueck.
  const oeffneKmEdit = () => {
    setKmManuell((v) => (v !== '' ? v : distanzKm !== null && distanzKm !== undefined ? String(distanzKm) : ''));
    setKmEdit(true);
  };

  // Neuen Anlass aus der aufgeklappten Liste heraus anlegen: optimistisch
  // auswählen und zuklappen, bei Fehler den Eintrag wieder zurücknehmen.
  const handleAnlassAnlegen = async (name) => {
    const sauber = name.trim();
    if (!sauber || anlassSpeichert) return;
    setAnlassSpeichert(true);
    // sort_order bewusst hoch: das Backend haengt neue Anlaesse ans Ende der
    // Liste. Ohne den Wert stuende der Eintrag bis zum Refresh ganz oben und
    // sprungt danach nach unten.
    const platzhalter = {
      id: `neu-${Date.now()}`,
      name: sauber,
      nutzung_anzahl: 0,
      sort_order: Number.MAX_SAFE_INTEGER,
    };
    setNeueAnlaesse((prev) => [...prev, platzhalter]);
    setAnlass(sauber);
    setFreiAnlassAktiv(false);
    setAnlassMerken(false);
    setAnlassAuswahlOffen(false);
    setAnlassSuche('');
    try {
      const angelegt = await addAnlass(sauber);
      // Der Server kann den Namen normalisiert haben (idempotenter POST)
      const echterName = (angelegt?.name || '').trim();
      if (echterName) {
        setAnlass(echterName);
        setNeueAnlaesse((prev) =>
          prev.map((a) => (a.id === platzhalter.id ? { ...angelegt, name: echterName } : a))
        );
      }
    } catch (error) {
      console.error('Anlass konnte nicht gespeichert werden:', error);
      setNeueAnlaesse((prev) => prev.filter((a) => a.id !== platzhalter.id));
      toast.error('Der Anlass konnte nicht gespeichert werden — er gilt nur für diese Fahrt.');
    } finally {
      setAnlassSpeichert(false);
    }
  };

  const handleWeiter = () => {
    setStep(2);
    // Ohne bekannte Distanz (freies Ziel oder ungepflegtes Paar) km direkt editierbar
    if (!kmGueltig) oeffneKmEdit();
  };

  // Mitfahrer:innen — gleiche Bedienung wie im vollen Formular
  const handleMitfahrerSpeichern = (person) => {
    if (mitfahrerEditIndex !== null) {
      const naechste = [...mitfahrer];
      naechste[mitfahrerEditIndex] = person;
      setMitfahrer(naechste);
    } else {
      setMitfahrer([...mitfahrer, person]);
    }
    setMitfahrerDialog(false);
    setMitfahrerEditIndex(null);
  };

  const handleMitfahrerBearbeiten = (index) => {
    setMitfahrerEditIndex(index);
    setMitfahrerDialog(true);
  };

  const handleMitfahrerEntfernen = (index) => {
    setMitfahrer(mitfahrer.filter((_, i) => i !== index));
  };

  const handleSpeichern = async () => {
    // Der Ort-POST laeuft vor dem Schliessen des Sheets - ohne Sperre legt ein
    // zweiter Tap Fahrt und Ort ein zweites Mal an.
    if (speichertRef.current) return;
    speichertRef.current = true;
    setSpeichert(true);

    const anlassClean = anlass.trim();

    // „Anlass merken": Freitext dauerhaft in die Liste übernehmen. Die Fahrt
    // hängt nicht daran — schlägt es fehl, wird nur der Merker verworfen.
    if (freiAnlassAktiv && anlassMerken && anlassClean) {
      try {
        await addAnlass(anlassClean);
      } catch (err) {
        console.error('Anlass konnte nicht gemerkt werden:', err);
        toast.error('Der Anlass konnte nicht gemerkt werden — die Fahrt wird trotzdem angelegt.');
      }
    }

    // „Ort dauerhaft speichern": Adresse vor der Fahrt als Ort anlegen, damit
    // sie beim nächsten Mal in der eigenen Liste steht (inkl. Distanz).
    let gemerkteZielId = null;
    if (zielAdresse && zielMerken) {
      try {
        const res = await axios.post('/api/orte', {
          name: zielAdresse.text.split(',')[0].trim(),
          adresse: zielAdresse.text,
        });
        gemerkteZielId = res.data?.id ?? null;
      } catch (err) {
        // Fahrt trotzdem speichern, aber nicht so tun, als sei der Ort da
        console.error('Ort konnte nicht gespeichert werden:', err);
        toast.error('Der Ort konnte nicht dauerhaft gespeichert werden — die Fahrt wird trotzdem angelegt.');
      }
    }

    const zielId = gemerkteZielId ?? (zielAdresse ? null : parseInt(zielOrtId, 10));
    const hinfahrt = {
      datum,
      anlass: anlassClean,
      kilometer: km,
      abrechnung: parseInt(effTraegerId, 10),
      vonOrtId: effStartOrtId ? parseInt(effStartOrtId, 10) : null,
      nachOrtId: zielId,
      einmaligerVonOrt: freierStart ? freierStart.text : null,
      einmaligerNachOrt: zielId ? null : zielAdresse?.text ?? null,
      // Ohne Rückfahrt gehören alle an diese eine Fahrt. Mit Rückfahrt bleiben
      // die reinen „nur zurück"-Einträge der Gegenfahrt vorbehalten.
      mitfahrer: rueckfahrt ? mitfahrer.filter((m) => m.richtung !== 'rueck') : mitfahrer,
    };
    const trips = [hinfahrt];
    if (rueckfahrt) {
      // Rückfahrt = zweite, eigenständige Fahrt: vertauschte Orte,
      // gleiches Datum, gleicher Träger. Die Verknüpfung als Paar setzt der
      // POST-Lauf unten, sobald die ID der Hinfahrt bekannt ist.
      trips.push({
        ...hinfahrt,
        vonOrtId: hinfahrt.nachOrtId,
        nachOrtId: hinfahrt.vonOrtId,
        einmaligerVonOrt: hinfahrt.einmaligerNachOrt,
        einmaligerNachOrt: hinfahrt.einmaligerVonOrt,
        // Mitfahrer nicht doppelt anlegen: Wer für beide Richtungen gilt, wird
        // vom Backend auf die Partnerfahrt gespiegelt
        mitfahrer: mitfahrer.filter((m) => m.richtung === 'rueck'),
      });
    }

    // Optimistisch: Sheet schließt sofort, Einträge erscheinen sofort in der Liste
    onClose();

    const stamp = Date.now();
    const tempIds = trips.map((_, i) => `optimistisch-${stamp}-${i}`);
    const optimistisch = trips.map((t, i) => ({
      id: tempIds[i],
      datum: t.datum,
      anlass: t.anlass,
      kilometer: t.kilometer,
      abrechnung: t.abrechnung,
      von_ort_id: t.vonOrtId,
      nach_ort_id: t.nachOrtId,
      einmaliger_von_ort: t.einmaligerVonOrt,
      einmaliger_nach_ort: t.einmaligerNachOrt,
      von_ort_name: t.vonOrtId ? ortName(orte.find((o) => o.id === t.vonOrtId)) : t.einmaligerVonOrt,
      nach_ort_name: t.nachOrtId
        ? ortName(orte.find((o) => o.id === t.nachOrtId))
        : t.einmaligerNachOrt,
      mitfahrer: [],
      _optimistisch: true,
    }));
    setFahrten((prev) => [...optimistisch, ...prev]);

    // Undo funktioniert auch, wenn die POSTs noch laufen: Flag + spätere Löschung
    const op = { abgebrochen: false, ids: [], laeuft: null };
    const entferneAngelegte = async () => {
      // Laeuft schon ein Aufraeumen, auf dieses warten statt ein zweites zu
      // starten. Frueher lief "Rückgängig" mitten in den POSTs und der
      // Abschluss der Schleife gleichzeitig: der zweite Lauf traf auf bereits
      // geloeschte IDs, brach am 404 ab, und was danach kam blieb stehen.
      if (op.laeuft) return op.laeuft;
      op.laeuft = (async () => {
      try {
        // So lange loeschen, bis nichts mehr nachkommt: Ein POST, der waehrend
        // des Aufraeumens noch durchlaeuft, haengt seine ID an die geleerte
        // Liste. Genau die Fahrt sollte der Abbruch verhindern - ohne diese
        // Schleife bliebe sie unverknuepft stehen und liefe in die Abrechnung.
        while (op.ids.length > 0) {
          const zuLoeschen = [...op.ids];
          op.ids.length = 0;
          for (const id of zuLoeschen) {
            try {
              await axios.delete(`/api/fahrten/${id}`);
            } catch (delErr) {
              // 404 heisst: schon weg. Kein Grund, den Rest stehen zu lassen.
              if (delErr?.response?.status !== 404) throw delErr;
            }
          }
        }
        // Auch den eigens angelegten Ort zuruecknehmen - sonst bleibt er nach
        // "Rueckgaengig" als Waise in der Ortsliste stehen.
        if (gemerkteZielId) {
          try {
            await axios.delete(`/api/orte/${gemerkteZielId}`);
          } catch (ortErr) {
            console.error('Gemerkter Ort konnte nicht entfernt werden:', ortErr);
          }
        }
        setFahrten((prev) => prev.filter((f) => !tempIds.includes(f.id)));
        await refreshAllData();
        toast.success(trips.length > 1 ? 'Fahrten wieder entfernt.' : 'Fahrt wieder entfernt.');
      } catch (error) {
        console.error('Fehler beim Rückgängigmachen:', error);
        toast.error('Rückgängig machen fehlgeschlagen.');
      }
      })();
      return op.laeuft;
    };

    toast.success(trips.length > 1 ? 'Fahrt und Rückfahrt gespeichert' : 'Fahrt gespeichert', {
      undo: () => {
        op.abgebrochen = true;
        if (op.ids.length > 0) {
          entferneAngelegte();
        } else {
          // POSTs laufen noch — Abbruch wird nach deren Abschluss ausgeführt
          setFahrten((prev) => prev.filter((f) => !tempIds.includes(f.id)));
        }
      },
    });

    (async () => {
      try {
        for (const t of trips) {
          // Vor JEDEM POST pruefen, nicht erst nach allen: Wer waehrend des
          // Speicherns "Rückgängig" tippt, bekam sonst die Rueckfahrt noch
          // angelegt, nachdem die Hinfahrt bereits geloescht war — sie blieb
          // unverknuepft zurueck und lief in die Abrechnung.
          if (op.abgebrochen) break;
          // Die zweite Fahrt ist die Rückfahrt zur ersten — als Paar anlegen,
          // damit „Hin- und Rückfahrt"-Mitfahrer für beide gelten und beim
          // Löschen aufgeräumt wird
          const nutzlast = op.ids.length > 0 ? { ...t, partnerFahrtId: op.ids[0] } : t;
          const res = await axios.post('/api/fahrten', nutzlast);
          op.ids.push(res.data.id);
        }
        if (op.abgebrochen) {
          // Erst ein laufendes Aufraeumen abwarten, dann pruefen, ob dieser
          // Lauf noch eine ID nachgereicht hat. Die Sperre gibt sonst sofort
          // zurueck, und die zuletzt angelegte Fahrt bliebe stehen.
          await entferneAngelegte();
          if (op.ids.length > 0) {
            op.laeuft = null;
            await entferneAngelegte();
          }
          return;
        }
        // Ein Refresh für alles — ersetzt auch die optimistischen Einträge
        await refreshAllData();
      } catch (error) {
        console.error('Fehler beim Speichern der Fahrt(en):', error);
        // Rollback der optimistischen Einträge + bereits angelegter Fahrten
        setFahrten((prev) => prev.filter((f) => !tempIds.includes(f.id)));
        for (const id of op.ids) {
          axios.delete(`/api/fahrten/${id}`).catch(() => {});
        }
        if (!op.abgebrochen) {
          toast.error('Fahrt konnte nicht gespeichert werden.');
        }
      } finally {
        // Sperre loesen: das Sheet ist zwar schon zu, wird es aber erneut
        // geoeffnet (Wiederholen), muss Speichern wieder moeglich sein.
        speichertRef.current = false;
        setSpeichert(false);
      }
    })();
  };

  // ---- Rendering ---------------------------------------------------------

  if (!isOpen) return null;

  if (step === 1) {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} title="Wohin?">
        {/* Datum zuerst — gleiche Reihenfolge wie im Bearbeiten-Formular */}
        <div className="erf-feld">
          <span className="erf-feld-label">Wann</span>
          <DatumsFeld datum={datum} setDatum={setDatum} />
        </div>

        {/* Ab-Ort dauerhaft sichtbar: es muss immer klar sein, von wo es losgeht */}
        <div className="erf-feld">
          <span className="erf-feld-label">Von</span>
          <div className="erf-von-zeile">
            <button
              type="button"
              className="erf-von-btn"
              onClick={() => setEditStart((v) => !v)}
              aria-expanded={editStart}
            >
              <MapPin size={16} aria-hidden="true" />
              <span className="erf-von-name">{startLabel || 'Startort wählen'}</span>
            </button>
            <button
              type="button"
              className="erf-standort-btn"
              onClick={handleStandort}
              disabled={ortenStatus === 'laedt'}
              title="Aktuellen Standort als Startort übernehmen"
              aria-label="Aktuellen Standort als Startort übernehmen"
            >
              <Crosshair size={17} aria-hidden="true" />
            </button>
          </div>
          {ortenStatus === 'fehler' && (
            <span className="erf-feld-hinweis">Standort nicht verfügbar — bitte Ort wählen.</span>
          )}
        </div>

        {/* Ein Tap auf „Von" öffnet ein echtes Suchfeld — Treffer ab dem
            ersten Buchstaben, eigene Orte und Live-Adressen in einer Liste. */}
        {editStart && (
          <div className="erf-start-auswahl">
            <StartSuche
              wert={startSuche}
              setWert={setStartSuche}
              orte={gefilterteStartorte}
              aktiveId={freierStart ? null : effStartOrtId}
              onOrt={(o) => {
                setStartOrtId(String(o.id));
                setFreierStart(null);
                // Manuelle km gehoeren zur alten Strecke
                setKmManuell('');
                setStartSuche('');
                setEditStart(false);
              }}
              onAdresse={(v) => {
                setFreierStart(v);
                setStartOrtId(null);
                setStartSuche('');
                setKmManuell('');
                setEditStart(false);
              }}
            />
          </div>
        )}

        {/* Eine Suche für beides: eigene Orte und Live-Adressen */}
        <span className="erf-feld-label">Nach</span>
        <div className="erf-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="text"
            ref={zielSucheRef}
            value={zielAdresse ? zielAdresse.text : suche}
            onChange={(e) => {
              setSuche(e.target.value);
              if (zielAdresse) {
                setZielAdresse(null);
                setZielMerken(false);
              }
            }}
            placeholder="Ort oder Adresse suchen"
            aria-label="Ziel suchen"
          />
        </div>

        {/* Ohne Eingabe steht hier bewusst nur ein Hinweis statt einer Wand
            aus Orten — der Nutzer soll direkt lostippen. */}
        {zielSucheClean.length === 0 && !zielAdresse ? (
          <div className="erf-ort-liste">
            <span className="erf-liste-hinweis">
              Tippen, um einen Ort oder eine Adresse zu suchen.
            </span>
          </div>
        ) : (
        <div className="erf-ort-liste">
          {gefilterteZiele.map((o) => {
            const gewaehlt = !zielAdresse && String(o.id) === String(zielOrtId);
            const dist = findDistanz(effStartOrtId, o.id);
            return (
              <button
                key={o.id}
                type="button"
                className={`erf-ort-row${gewaehlt ? ' is-selected' : ''}`}
                onClick={() => {
                  setZielOrtId(String(o.id));
                  setZielAdresse(null);
                  setZielMerken(false);
                  // Manuelle km gehoeren zum alten Ziel - sonst gilt eine
                  // eingetippte Zahl stillschweigend auch fuers neue Ziel
                  setKmManuell('');
                }}
              >
                <span className="erf-ort-main">
                  <span className="erf-ort-name">{o.name}</span>
                  {o.adresse && <span className="erf-ort-sub">{o.adresse}</span>}
                </span>
                {dist !== null && (
                  <span className={`erf-dist num${gewaehlt ? ' is-selected' : ''}`}>
                    {formatKm(dist)} km
                  </span>
                )}
              </button>
            );
          })}

          {/* Live-Adressen direkt in derselben Liste — kein Extra-Klick nötig */}
          {neueAdressen.length > 0 && (
            <>
              <span className="erf-liste-trenner">Adressen aus der Karte</span>
              {neueAdressen.map((a) => {
                const gewaehlt = zielAdresse?.id === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    className={`erf-ort-row erf-ort-row-adresse${gewaehlt ? ' is-selected' : ''}`}
                    onClick={() => {
                      setZielAdresse(a);
                      setZielOrtId(null);
                      setKmManuell('');
                      adressenLeeren();
                    }}
                  >
                    <MapPin size={16} aria-hidden="true" className="erf-adresse-icon" />
                    <span className="erf-ort-main">
                      <span className="erf-ort-name">{a.text}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}

          {adressenLaden && neueAdressen.length === 0 && (
            <span className="erf-liste-hinweis">Adressen werden gesucht…</span>
          )}

          {!adressenLaden &&
            zielSucheClean.length >= 3 &&
            gefilterteZiele.length === 0 &&
            neueAdressen.length === 0 &&
            !zielAdresse && (
              <span className="erf-liste-hinweis">Nichts gefunden — Schreibweise prüfen.</span>
            )}
        </div>
        )}

        {/* Nur bei frisch gewählter Adresse: dauerhaft in die eigene Liste */}
        {zielAdresse && (
          <button
            type="button"
            className={`erf-merken${zielMerken ? ' is-active' : ''}`}
            onClick={() => setZielMerken((v) => !v)}
            aria-pressed={zielMerken}
          >
            <span className="erf-merken-box" aria-hidden="true">
              {zielMerken && <Check size={13} strokeWidth={3} />}
            </span>
            <span>Ort dauerhaft speichern</span>
          </button>
        )}

        <button
          type="button"
          className="btn-sheet-primary"
          onClick={handleWeiter}
          disabled={!kannWeiter}
        >
          Weiter
        </button>
        {fehltWeiter && <FehltHinweis text={fehltWeiter} />}
      </Sheet>
    );
  }

  // Schritt 2 — Bestätigen
  return (
    <Sheet isOpen={isOpen} onClose={onClose} ariaLabel="Fahrt bestätigen">
      {/* Zurück zur Zielauswahl. Vorher war der Klick auf die Route der
          einzige Weg — als Schaltfläche aber nicht erkennbar. */}
      <button type="button" className="erf-zurueck" onClick={() => setStep(1)}>
        <ChevronLeft size={16} aria-hidden="true" />
        <span>Zurück</span>
      </button>
      <div className="erf-kopf">
        <div className="erf-kopf-text">
          <button
            type="button"
            className="erf-route-btn"
            onClick={() => setStep(1)}
            title="Ziel ändern"
          >
            {startLabel} → {zielLabel}
          </button>
          <div className="erf-betrag num">
            {kmGueltig ? (
              <>
                {formatKm(km)} km · {formatEuro(betrag)} €
                {satz === null && <span className="erf-betrag-hinweis"> (Standardsatz)</span>}
              </>
            ) : (
              'Kilometer eingeben'
            )}
          </div>
        </div>
        <button
          type="button"
          className="erf-edit-btn"
          onClick={() => (kmEdit ? setKmEdit(false) : oeffneKmEdit())}
          aria-label="Kilometer korrigieren"
          title="Kilometer korrigieren"
        >
          <Pencil size={16} />
        </button>
      </div>

      {/* Für welchen Tag wird gespeichert? Bei „Wiederholen" startet der Flow
          direkt hier — ohne diese Zeile bliebe das Datum ungesehen. */}
      <div className="erf-feld">
        <span className="erf-feld-label">Wann</span>
        <DatumsFeld datum={datum} setDatum={setDatum} />
      </div>

      {kmEdit && (
        <div className="erf-km-edit">
          <label className="form-label" htmlFor="erf-km-input">
            Kilometer (einfache Strecke)
          </label>
          <input
            id="erf-km-input"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.1"
            className="form-input"
            value={kmManuell}
            onChange={(e) => setKmManuell(e.target.value)}
            placeholder="km"
          />
        </div>
      )}

      {/* Anlass wie der Abrechnungsträger: kleine Beschriftung, gewählter Wert
          groß darunter, Auswahl klappt in der Zeile auf. Als Chip-Reihe wurde
          die Liste mit jedem weiteren Anlass unübersichtlicher. */}
      <button
        type="button"
        className="erf-traeger-zeile"
        onClick={() => setAnlassAuswahlOffen((v) => !v)}
        aria-expanded={anlassAuswahlOffen}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="erf-feld-label" style={{ display: 'block' }}>
            Anlass
          </span>
          <span className="erf-traeger-name" style={{ display: 'block' }}>
            {anlass.trim() || 'Wählen'}
          </span>
          {!anlass.trim() && (
            <span className="erf-row-hinweis" style={{ display: 'block' }}>
              Pflichtangabe
            </span>
          )}
        </span>
        <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>

      {anlassAuswahlOffen && (
        <>
          {anlassSucheZeigen && (
            <div className="erf-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="text"
                value={anlassSuche}
                onChange={(e) => setAnlassSuche(e.target.value)}
                placeholder="Anlass suchen"
                aria-label="Anlass suchen"
              />
            </div>
          )}

          <div className="erf-ort-liste">
            {/* Die ziel-bezogenen Vorschläge sind der schnellste Weg — sie
                stehen abgesetzt oben, nicht irgendwo in der Gesamtliste. */}
            {gefilterteVorschlaege.length > 0 && (
              <>
                <span className="erf-liste-trenner">Häufig für dieses Ziel</span>
                {gefilterteVorschlaege.map((a) => (
                  <button
                    key={`vorschlag-${a}`}
                    type="button"
                    className={`erf-ort-row${!freiAnlassAktiv && anlass === a ? ' is-selected' : ''}`}
                    onClick={() => {
                      setAnlass(a);
                      setFreiAnlassAktiv(false);
                      setAnlassMerken(false);
                      setAnlassAuswahlOffen(false);
                      setAnlassSuche('');
                    }}
                  >
                    <span className="erf-ort-main">
                      <span className="erf-ort-name">{a}</span>
                    </span>
                  </button>
                ))}
              </>
            )}

            {gefilterteAnlaesse.length > 0 && (
              <>
                {gefilterteVorschlaege.length > 0 && (
                  <span className="erf-liste-trenner">Alle Anlässe</span>
                )}
                {gefilterteAnlaesse.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`erf-ort-row${
                      !freiAnlassAktiv && anlass === a.name ? ' is-selected' : ''
                    }`}
                    onClick={() => {
                      setAnlass(a.name);
                      setFreiAnlassAktiv(false);
                      setAnlassMerken(false);
                      setAnlassAuswahlOffen(false);
                      setAnlassSuche('');
                    }}
                  >
                    <span className="erf-ort-main">
                      <span className="erf-ort-name">{a.name}</span>
                    </span>
                  </button>
                ))}
              </>
            )}

            {/* Direkt aus der Suche heraus anlegen — spart den Umweg über die
                Stammdaten. Der POST ist idempotent, doppelt geht nicht. */}
            {anlassSucheClean.length > 0 && !anlassExistiert && (
              <button
                type="button"
                className="erf-ort-row erf-ort-row-adresse"
                onClick={() => handleAnlassAnlegen(anlassSucheClean)}
                disabled={anlassSpeichert}
              >
                <Plus size={16} aria-hidden="true" className="erf-adresse-icon" />
                <span className="erf-ort-main">
                  <span className="erf-ort-name">
                    „{anlassSucheClean}" als neuen Anlass anlegen
                  </span>
                </span>
              </button>
            )}

            {gefilterteVorschlaege.length === 0 &&
              gefilterteAnlaesse.length === 0 &&
              anlassSucheClean.length === 0 && (
                <span className="erf-liste-hinweis">
                  Noch keine Anlässe gespeichert — unten frei eingeben.
                </span>
              )}

            {/* Nicht jeder einmalige Anlass gehört in die Liste */}
            <button
              type="button"
              className={`erf-ort-row erf-ort-row-frei${freiAnlassAktiv ? ' is-selected' : ''}`}
              onClick={() => {
                setFreiAnlassAktiv(true);
                setAnlassAuswahlOffen(false);
                setAnlassSuche('');
                if (
                  anlassVorschlaege.includes(anlass) ||
                  alleAnlaesse.some((a) => a.name === anlass)
                ) {
                  setAnlass('');
                }
              }}
            >
              <Pencil size={16} aria-hidden="true" className="erf-adresse-icon" />
              <span className="erf-ort-main">
                <span className="erf-ort-name">Einmaligen Anlass frei eingeben…</span>
              </span>
            </button>
          </div>
        </>
      )}

      {/* Freitext bleibt möglich, ohne dass der Anlass gespeichert wird —
          der Schalter darunter macht den Unterschied sichtbar. */}
      {freiAnlassAktiv && (
        <>
          <input
            type="text"
            ref={anlassInputRef}
            className="form-input erf-anlass-input"
            value={anlass}
            onChange={(e) => setAnlass(e.target.value)}
            placeholder="z. B. Dienstbesprechung, Hausbesuch…"
            aria-label="Anlass frei eingeben"
          />
          <button
            type="button"
            className={`erf-merken${anlassMerken ? ' is-active' : ''}`}
            onClick={() => setAnlassMerken((v) => !v)}
            aria-pressed={anlassMerken}
            disabled={!anlass.trim()}
          >
            <span className="erf-merken-box" aria-hidden="true">
              {anlassMerken && <Check size={13} strokeWidth={3} />}
            </span>
            <span>Anlass dauerhaft speichern</span>
          </button>
        </>
      )}

      <div className="erf-row">
        <div>
          <div className="erf-row-titel">Rückfahrt</div>
          <div className="erf-row-hinweis">Legt eine zweite Fahrt an</div>
        </div>
        <button
          type="button"
          className="erf-switch"
          role="switch"
          aria-checked={rueckfahrt}
          aria-label="Rückfahrt anlegen"
          onClick={() => setRueckfahrtWahl(!rueckfahrt)}
        >
          <span className="erf-switch-knob" aria-hidden="true" />
        </button>
      </div>

      {/* Der Trägername ist die Information, nicht das Wort „Abrechnungsträger" —
          deshalb Label klein, Name groß und mehrzeilig. */}
      <button
        type="button"
        className="erf-traeger-zeile"
        onClick={() => setTraegerAuswahlOffen((v) => !v)}
        aria-expanded={traegerAuswahlOffen}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="erf-feld-label" style={{ display: 'block' }}>
            Abrechnungsträger
          </span>
          <span className="erf-traeger-name" style={{ display: 'block' }}>
            {effTraeger ? effTraeger.name : 'Wählen'}
          </span>
          <span className="erf-row-hinweis" style={{ display: 'block' }}>
            {defaultTraegerId && traegerWahl === null ? 'Zuletzt für dieses Ziel' : 'Ausgewählt'}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>

      {/* Auswahl klappt in der Zeile auf, statt Schritt 2 zu ersetzen —
          sonst geht Scrollposition und Rückweg verloren. */}
      {traegerAuswahlOffen && (
        <div className="erf-ort-liste">
          {aktiveTraeger.map((t) => {
            const gewaehlt = String(t.id) === String(effTraegerId);
            return (
              <button
                key={t.id}
                type="button"
                className={`erf-ort-row${gewaehlt ? ' is-selected' : ''}`}
                onClick={() => {
                  setTraegerWahl(String(t.id));
                  setTraegerAuswahlOffen(false);
                }}
              >
                <span className="erf-ort-main">
                  <span className="erf-ort-name">{t.name}</span>
                  {t.kostenstelle && <span className="erf-ort-sub">{t.kostenstelle}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Mitfahrer:innen direkt hier — vorher liessen sie sich erst
          nachtraeglich ueber „Bearbeiten" eintragen. Gleiche Bedienung wie im
          vollen Formular: Name antippen bearbeitet, Kreuz entfernt. */}
      <div className="erf-mitfahrer">
        {mitfahrer.length > 0 && (
          <ul className="mitfahrer-liste">
            {mitfahrer.map((person, index) => (
              <li key={index} className="mitfahrer-eintrag">
                <button
                  type="button"
                  onClick={() => handleMitfahrerBearbeiten(index)}
                  className="mitfahrer-eintrag-haupt"
                  title={`${person.name} bearbeiten`}
                >
                  <span className="mitfahrer-eintrag-name">{person.name}</span>
                  <span className="mitfahrer-eintrag-sub">
                    {[person.arbeitsstaette, RICHTUNG_TEXT[person.richtung] || RICHTUNG_TEXT.hin]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleMitfahrerEntfernen(index)}
                  className="mitfahrer-eintrag-weg"
                  aria-label={`${person.name} entfernen`}
                  title={`${person.name} entfernen`}
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => {
            setMitfahrerEditIndex(null);
            setMitfahrerDialog(true);
          }}
          className="mitfahrer-add"
        >
          <Plus size={16} aria-hidden="true" />
          <span>
            {mitfahrer.length > 0 ? 'Weitere:n hinzufügen' : 'Mitfahrer:in hinzufügen'}
          </span>
        </button>
      </div>

      <button
        type="button"
        className="btn-sheet-primary"
        onClick={handleSpeichern}
        disabled={!kannSpeichern || speichert}
      >
        {fahrtenAnzahl === 1 ? '1 Fahrt speichern' : '2 Fahrten speichern'}
        {gesamtKm !== null && <span className="num"> · {formatKm(gesamtKm)} km</span>}
      </button>
      {fehltSpeichern && <FehltHinweis text={fehltSpeichern} />}

      {mitfahrerDialog && (
        <MitfahrerModal
          isOpen
          onClose={() => {
            setMitfahrerDialog(false);
            setMitfahrerEditIndex(null);
          }}
          onSave={handleMitfahrerSpeichern}
          initialData={mitfahrerEditIndex !== null ? mitfahrer[mitfahrerEditIndex] : null}
        />
      )}
    </Sheet>
  );
}

// Ein-Tap-Datumswahl: das native Datumsfeld liegt unsichtbar über dem Button.
// Vorher brauchte es zwei Taps — einen zum Einblenden, einen zum Öffnen.
function DatumsFeld({ datum, setDatum }) {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="erf-von-btn" tabIndex={-1} aria-hidden="true">
        {formatDatumZeile(datum)}
      </button>
      <input
        type="date"
        value={datum}
        onChange={(e) => {
          if (e.target.value) setDatum(e.target.value);
        }}
        aria-label="Datum ändern"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          border: 0,
          padding: 0,
          margin: 0,
          background: 'transparent',
          cursor: 'pointer',
          zIndex: 1,
        }}
      />
    </div>
  );
}

// Begründung unter einem ausgegrauten Button
function FehltHinweis({ text }) {
  return (
    <div className="erf-fehlt-hinweis" role="status">
      {text}
    </div>
  );
}

// Startort-Suche: ein Feld für beides — eigene Orte und Live-Adressen. Die
// Liste erscheint erst beim Tippen; ohne Eingabe steht nur der Hinweis da,
// damit kein leerer Block entsteht. Autofokus, weil das Feld erst auf einen
// Tap auf „Von" erscheint — der zweite Tap ins Feld wäre überflüssig.
function StartSuche({ wert, setWert, orte, aktiveId, onOrt, onAdresse }) {
  const { vorschlaege, laedt } = useAdressSuche(wert);
  const feldRef = useRef(null);

  useEffect(() => {
    const id = window.setTimeout(() => feldRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, []);

  // Adressen ausblenden, die bereits als eigener Ort getroffen wurden
  const bekannt = new Set(orte.map((o) => o.name.toLowerCase()));
  const neueAdressen = vorschlaege.filter((v) => !bekannt.has(v.text.toLowerCase()));
  const q = wert.trim();

  return (
    <div className="erf-start-suche">
      <div className="erf-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="text"
          ref={feldRef}
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder="Ort oder Adresse suchen"
          aria-label="Startort suchen"
        />
      </div>

      {q.length === 0 ? (
        <span className="erf-liste-hinweis">Tippen, um einen Ort oder eine Adresse zu suchen.</span>
      ) : (
        <div className="erf-ort-liste">
          {orte.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`erf-ort-row${String(o.id) === String(aktiveId) ? ' is-selected' : ''}`}
              onClick={() => onOrt(o)}
            >
              <span className="erf-ort-main">
                <span className="erf-ort-name">{o.name}</span>
                {o.adresse && <span className="erf-ort-sub">{o.adresse}</span>}
              </span>
            </button>
          ))}

          {neueAdressen.length > 0 && (
            <>
              <span className="erf-liste-trenner">Adressen aus der Karte</span>
              {neueAdressen.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className="erf-ort-row erf-ort-row-adresse"
                  onClick={() => onAdresse(v)}
                >
                  <MapPin size={16} aria-hidden="true" className="erf-adresse-icon" />
                  <span className="erf-ort-main">
                    <span className="erf-ort-name">{v.text}</span>
                  </span>
                </button>
              ))}
            </>
          )}

          {laedt && neueAdressen.length === 0 && (
            <span className="erf-liste-hinweis">Adressen werden gesucht…</span>
          )}

          {!laedt && orte.length === 0 && neueAdressen.length === 0 && q.length >= 3 && (
            <span className="erf-liste-hinweis">Nichts gefunden — Schreibweise prüfen.</span>
          )}
        </div>
      )}
    </div>
  );
}

export default ErfassungsFlow;
