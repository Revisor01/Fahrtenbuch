import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../../contexts/AppContext';
import Sheet from '../ui/Sheet';
import { useToast } from '../ui/Toast';
import { useAdressSuche, adresseZuKoordinaten } from '../useAdressSuche';
import { Pencil, Search, ChevronRight, MapPin, Crosshair, Check } from 'lucide-react';

// Zweistufiger Erfassungsflow nach Design-Spec (Redesign 2026, Screen 2):
// Schritt 1 „Wohin?" — Startort/Datum vorbelegt und antippbar, Ortsliste nach
// Häufigkeit sortiert (Distanz vom Startort rechts), „Anderes Ziel eingeben".
// Schritt 2 „Bestätigen" — Route + „km · €" (Erstattungssatz des Trägers),
// Anlass-Chips aus dem Verlauf für dieses Ziel, Rückfahrt-Switch,
// Abrechnungsträger-Zeile, mitzählender Speichern-Button.
// Speichern läuft optimistisch: Sheet schließt sofort, Toast mit „Rückgängig";
// bei API-Fehler Fehler-Toast und Rollback der optimistischen Einträge.

const STANDARD_SATZ = 0.3; // Fallback, wenn kein Erstattungssatz gepflegt ist

const heute = () => new Date().toISOString().slice(0, 10);

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
  const { orte, distanzen, abrechnungstraeger, setFahrten, refreshAllData } =
    useContext(AppContext);
  const toast = useToast();

  // prefill mit Ziel springt direkt in Schritt 2 („Wiederholen"-Signatur)
  const [step, setStep] = useState(prefill?.nachOrtId ? 2 : 1);
  const [startOrtId, setStartOrtId] = useState(prefill?.vonOrtId ? String(prefill.vonOrtId) : null);
  const [datum, setDatum] = useState(prefill?.datum || heute());
  const [zielOrtId, setZielOrtId] = useState(prefill?.nachOrtId ? String(prefill.nachOrtId) : null);
  const [suche, setSuche] = useState('');
  const [anlass, setAnlass] = useState(prefill?.anlass || '');
  const [freiAnlassAktiv, setFreiAnlassAktiv] = useState(false);
  // null = automatisch (Heuristik/Verlauf), Nutzerwahl überschreibt
  const [rueckfahrtWahl, setRueckfahrtWahl] = useState(
    prefill?.mitRueckfahrt !== undefined ? !!prefill.mitRueckfahrt : null
  );
  const [traegerWahl, setTraegerWahl] = useState(
    prefill?.abrechnung ? String(prefill.abrechnung) : null
  );
  const [traegerAuswahlOffen, setTraegerAuswahlOffen] = useState(false);
  const [kmManuell, setKmManuell] = useState(
    prefill?.kilometer !== undefined && prefill?.kilometer !== null ? String(prefill.kilometer) : ''
  );
  const [kmEdit, setKmEdit] = useState(false);
  const [editStart, setEditStart] = useState(false);
  const [editDatum, setEditDatum] = useState(false);
  // Freier Startort (per Standort ermittelt oder aus der Adresssuche gewählt)
  const [freierStart, setFreierStart] = useState(null);
  const [startSuche, setStartSuche] = useState('');
  const [ortenStatus, setOrtenStatus] = useState(null); // 'laedt' | 'fehler' | null
  // Gewählte Live-Adresse als Ziel + ob sie dauerhaft gespeichert werden soll
  const [zielAdresse, setZielAdresse] = useState(null);
  const [zielMerken, setZielMerken] = useState(false);

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

  const gefilterteZiele = useMemo(() => {
    const q = suche.trim().toLowerCase();
    if (!q) return sortierteZiele;
    return sortierteZiele.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.adresse && o.adresse.toLowerCase().includes(q))
    );
  }, [sortierteZiele, suche]);

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

  const handleWeiter = () => {
    setStep(2);
    // Ohne bekannte Distanz (freies Ziel oder ungepflegtes Paar) km direkt editierbar
    if (!kmGueltig) setKmEdit(true);
  };

  const handleSpeichern = async () => {
    const anlassClean = anlass.trim();

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
        // Nicht blockieren: die Fahrt wird trotzdem mit freiem Ziel gespeichert
        console.error('Ort konnte nicht gespeichert werden:', err);
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
      mitfahrer: [],
    };
    const trips = [hinfahrt];
    if (rueckfahrt) {
      // Rückfahrt = zweite, eigenständige Fahrt: vertauschte Orte,
      // gleiches Datum, gleicher Träger
      trips.push({
        ...hinfahrt,
        vonOrtId: hinfahrt.nachOrtId,
        nachOrtId: hinfahrt.vonOrtId,
        einmaligerVonOrt: hinfahrt.einmaligerNachOrt,
        einmaligerNachOrt: hinfahrt.einmaligerVonOrt,
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
    const op = { abgebrochen: false, ids: [] };
    const entferneAngelegte = async () => {
      try {
        for (const id of op.ids) {
          await axios.delete(`/api/fahrten/${id}`);
        }
        setFahrten((prev) => prev.filter((f) => !tempIds.includes(f.id)));
        await refreshAllData();
        toast.success(op.ids.length > 1 ? 'Fahrten wieder entfernt.' : 'Fahrt wieder entfernt.');
      } catch (error) {
        console.error('Fehler beim Rückgängigmachen:', error);
        toast.error('Rückgängig machen fehlgeschlagen.');
      }
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
          const res = await axios.post('/api/fahrten', t);
          op.ids.push(res.data.id);
        }
        if (op.abgebrochen) {
          await entferneAngelegte();
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
      }
    })();
  };

  // ---- Rendering ---------------------------------------------------------

  if (!isOpen) return null;

  // Träger-Auswahl als eigene Sheet-Ansicht
  if (traegerAuswahlOffen) {
    return (
      <Sheet isOpen={isOpen} onClose={() => setTraegerAuswahlOffen(false)} title="Abrechnungsträger">
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
      </Sheet>
    );
  }

  if (step === 1) {
    return (
      <Sheet isOpen={isOpen} onClose={onClose} title="Wohin?">
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

        {editStart && (
          <div className="erf-start-auswahl">
            <select
              className="form-select"
              value={effStartOrtId || ''}
              onChange={(e) => {
                setStartOrtId(e.target.value);
                setFreierStart(null);
                setEditStart(false);
              }}
              aria-label="Startort ändern"
            >
              <option value="" disabled>
                Ort wählen…
              </option>
              {orte.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <StartAdressSuche
              wert={startSuche}
              setWert={setStartSuche}
              onWahl={(v) => {
                setFreierStart(v);
                setStartOrtId(null);
                setStartSuche('');
                setEditStart(false);
              }}
            />
          </div>
        )}

        <div className="erf-feld">
          <span className="erf-feld-label">Wann</span>
          <button
            type="button"
            className="erf-von-btn"
            onClick={() => setEditDatum((v) => !v)}
            aria-expanded={editDatum}
          >
            {formatDatumZeile(datum)}
          </button>
        </div>

        {editDatum && (
          <input
            type="date"
            className="form-input mb-3"
            value={datum}
            onChange={(e) => {
              if (e.target.value) setDatum(e.target.value);
            }}
            onBlur={() => setEditDatum(false)}
            aria-label="Datum ändern"
          />
        )}

        {/* Eine Suche für beides: eigene Orte und Live-Adressen */}
        <span className="erf-feld-label">Nach</span>
        <div className="erf-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="text"
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
            suche.trim().length >= 3 &&
            gefilterteZiele.length === 0 &&
            neueAdressen.length === 0 &&
            !zielAdresse && (
              <span className="erf-liste-hinweis">Nichts gefunden — Schreibweise prüfen.</span>
            )}
        </div>

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
      </Sheet>
    );
  }

  // Schritt 2 — Bestätigen
  return (
    <Sheet isOpen={isOpen} onClose={onClose} ariaLabel="Fahrt bestätigen">
      <div className="erf-kopf">
        <div className="erf-kopf-text">
          <button
            type="button"
            className="erf-route-btn"
            onClick={() => setStep(1)}
            title="Ziel ändern"
          >
            {ortName(startOrt)} → {zielLabel}
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
          onClick={() => setKmEdit((v) => !v)}
          aria-label="Kilometer korrigieren"
          title="Kilometer korrigieren"
        >
          <Pencil size={16} />
        </button>
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
            value={kmManuell !== '' ? kmManuell : distanzKm ?? ''}
            onChange={(e) => setKmManuell(e.target.value)}
            placeholder="km"
          />
        </div>
      )}

      <div className="erf-label">Anlass</div>
      <div className="erf-chips">
        {anlassVorschlaege.map((a) => (
          <button
            key={a}
            type="button"
            className={`erf-chip${!freiAnlassAktiv && anlass === a ? ' is-active' : ''}`}
            onClick={() => {
              setAnlass(a);
              setFreiAnlassAktiv(false);
            }}
          >
            {a}
          </button>
        ))}
        <button
          type="button"
          className={`erf-chip erf-chip-dashed${freiAnlassAktiv ? ' is-active' : ''}`}
          onClick={() => {
            setFreiAnlassAktiv(true);
            if (anlassVorschlaege.includes(anlass)) setAnlass('');
          }}
        >
          Frei eingeben…
        </button>
      </div>
      {(freiAnlassAktiv || anlassVorschlaege.length === 0) && (
        <input
          type="text"
          className="form-input erf-anlass-input"
          value={anlass}
          onChange={(e) => setAnlass(e.target.value)}
          placeholder="z. B. Dienstbesprechung, Hausbesuch…"
          aria-label="Anlass frei eingeben"
        />
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

      <div className="erf-row erf-row-letzte">
        <div className="erf-row-text">
          <div className="erf-row-titel">Abrechnungsträger</div>
          <div className="erf-row-hinweis">
            {defaultTraegerId && traegerWahl === null ? 'Zuletzt für dieses Ziel' : 'Ausgewählt'}
          </div>
        </div>
        <button
          type="button"
          className="erf-traeger-btn"
          onClick={() => setTraegerAuswahlOffen(true)}
          title={effTraeger ? effTraeger.name : 'Wählen'}
        >
          <span>{effTraeger ? effTraeger.name : 'Wählen'}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>

      <button
        type="button"
        className="btn-sheet-primary"
        onClick={handleSpeichern}
        disabled={!kannSpeichern}
      >
        {fahrtenAnzahl === 1 ? '1 Fahrt speichern' : '2 Fahrten speichern'}
        {gesamtKm !== null && <span className="num"> · {formatKm(gesamtKm)} km</span>}
      </button>
    </Sheet>
  );
}

// Adresssuche für den Startort — nur nötig, wenn der Ab-Ort nicht in der
// eigenen Ortsliste steht (z. B. unterwegs gestartet).
function StartAdressSuche({ wert, setWert, onWahl }) {
  const { vorschlaege, laedt } = useAdressSuche(wert);
  return (
    <div className="erf-start-suche">
      <div className="erf-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="text"
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder="oder Adresse suchen"
          aria-label="Startadresse suchen"
        />
      </div>
      {vorschlaege.length > 0 && (
        <ul className="adr-liste adr-liste-inline" role="listbox">
          {vorschlaege.map((v) => (
            <li key={v.id} role="option" aria-selected="false">
              <button type="button" className="adr-option" onClick={() => onWahl(v)}>
                <MapPin size={15} aria-hidden="true" />
                <span>{v.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {laedt && vorschlaege.length === 0 && (
        <span className="erf-liste-hinweis">Adressen werden gesucht…</span>
      )}
    </div>
  );
}

export default ErfassungsFlow;
