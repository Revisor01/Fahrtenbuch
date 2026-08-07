import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import { useErfassung } from '../contexts/ErfassungContext';
import EmptyState from './ui/EmptyState';
import StatusBadge from './ui/StatusBadge';
import { useToast } from './ui/Toast';
import { statusFromAbrechnung } from '../utils/statusLabels';
import { Star } from 'lucide-react';

// Dashboard (Redesign 2026, Phase R4).
//
// KRITISCH: Das Dashboard hängt NICHT am Monatsfilter des Fahrten-Tabs —
// `fahrten`/`summary` aus dem AppContext sind tab-gefiltert und werden hier
// bewusst nicht verwendet. Alle Daten kommen aus `monthlyData` (ungefilterte
// Monats-Aggregate) plus einem eigenen Abruf der jüngsten Monatsreports für
// die „Zuletzt"-Liste (liefert Erstattung + Mitfahrer je Fahrt).

const API_BASE_URL = '/api';

const heuteISO = () => new Date().toISOString().slice(0, 10);

const formatEuro = (betrag) => (Number(betrag) || 0).toFixed(2).replace('.', ',');

const formatKm = (km) => {
  const n = parseFloat(km) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
};

const monatName = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('de-DE', { month: 'long' });
};

const monatJahr = (ym) => `${monatName(ym)} ${ym.slice(0, 4)}`;

// Monatsstatus = Minimum der Trägerstatus (offen < eingereicht < erhalten).
// Träger ohne Erstattung zählen nicht; Monat mit Fahrten aber ohne
// Erstattungen gilt als „Erfasst".
const STATUS_RANG = { offen: 0, eingereicht: 1, erhalten: 2 };

function monatsStatus(md) {
  if (!md) return null;
  const traeger = Object.entries(md.erstattungen || {}).filter(([, b]) => b > 0);
  if (traeger.length === 0) return md.fahrtenCount > 0 ? 'offen' : null;
  let min = 'erhalten';
  traeger.forEach(([id]) => {
    const s = statusFromAbrechnung(md.abrechnungsStatus?.[id]);
    if (STATUS_RANG[s] < STATUS_RANG[min]) min = s;
  });
  return min;
}

// Offene (weder eingereichte noch erstattete) Träger eines Monats
function offeneTraeger(md) {
  return Object.entries(md.erstattungen || {}).filter(([id, betrag]) => {
    if (!(betrag > 0)) return false;
    const status = md.abrechnungsStatus?.[id];
    return !status?.eingereicht_am && !status?.erhalten_am;
  });
}

// Träger-Kürzel für die Favoriten-Kachel: Mehrwort-Namen → Initialen (max. 3),
// Einzelwort → erste zwei Buchstaben („Kirchenkreis Dithmarschen" → „KD")
function traegerKuerzel(name) {
  if (!name) return '';
  const teile = String(name).split(/[\s-]+/).filter((w) => w.length > 1);
  if (teile.length >= 2) {
    return teile.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
  }
  return String(name).slice(0, 2).toUpperCase();
}

const CHART_FARBEN = {
  erhalten: 'var(--ok)',
  eingereicht: 'var(--accent)',
  offen: 'var(--brand)',
};

function Dashboard({ onNavigate }) {
  const {
    monthlyData,
    favoriten,
    distanzen,
    abrechnungstraeger,
    user,
    executeFavorit,
    refreshAllData,
    updateAbrechnungsStatus,
    fetchMonthlyData,
    fetchFahrten,
  } = useContext(AppContext);
  const toast = useToast();
  const erfassung = useErfassung();

  const currentYM = new Date().toISOString().slice(0, 7);

  const byYM = useMemo(() => {
    const map = {};
    monthlyData.forEach((md) => { map[md.yearMonth] = md; });
    return map;
  }, [monthlyData]);

  const getTraegerName = (id) => {
    if (String(id) === 'mitfahrer') return 'Mitfahrer:innen';
    const t = (abrechnungstraeger || []).find((x) => String(x.id) === String(id));
    return t ? t.name : `Träger ${id}`;
  };

  // ---- Hero: ältester nicht eingereichter (abgeschlossener) Monat ---------
  // Der laufende Monat zählt nicht — er ist noch nicht fällig.
  const hero = useMemo(() => {
    const kandidaten = monthlyData
      .filter((md) => md.yearMonth < currentYM && offeneTraeger(md).length > 0)
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
    if (kandidaten.length === 0) return null;
    const md = kandidaten[0];
    const offen = offeneTraeger(md);
    return {
      ym: md.yearMonth,
      betrag: offen.reduce((sum, [, b]) => sum + Number(b || 0), 0),
      km: md.totalKm || 0,
      traeger: offen.map(([id, b]) => ({ id, name: getTraegerName(id), betrag: Number(b || 0) })),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyData, abrechnungstraeger, currentYM]);

  // ---- „{Monat} bisher" (Desktop) -----------------------------------------
  const aktuellerMonat = byYM[currentYM];
  const bisher = {
    km: aktuellerMonat?.totalKm || 0,
    fahrten: aktuellerMonat?.fahrtenCount || 0,
    betrag: aktuellerMonat?.totalErstattung || 0,
  };
  // Mitfahrer-Anteil getrennt ausweisen — KEIN gemischter €/km-Satz
  // (0,30 €/km Fahrt + 0,05 €/km Mitfahrer dürfen nicht verschmelzen)
  const bisherMitfahrer = Number(aktuellerMonat?.erstattungen?.mitfahrer || 0);

  // ---- „Unterwegs" (Desktop): ALLE eingereichten, nicht erstatteten Monate —
  // jeder mit Schnellaktion „erhalten" (User-Feedback 07.08.)
  const unterwegsListe = useMemo(() => {
    const istUnterwegs = (md, id) => {
      const status = md.abrechnungsStatus?.[id];
      return status?.eingereicht_am && !status?.erhalten_am;
    };
    return monthlyData
      .filter((md) =>
        Object.entries(md.erstattungen || {}).some(([id, b]) => b > 0 && istUnterwegs(md, id))
      )
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
      .map((md) => {
        const eintraege = Object.entries(md.erstattungen || {})
          .filter(([id, b]) => b > 0 && istUnterwegs(md, id))
          .map(([id]) => ({
            key: id,
            name: getTraegerName(id),
            eingereicht_am: md.abrechnungsStatus[id].eingereicht_am,
          }));
        const fruehestes = eintraege
          .map((e) => new Date(e.eingereicht_am))
          .filter((d) => !Number.isNaN(d.getTime()))
          .sort((a, b) => a - b)[0];
        return {
          ym: md.yearMonth,
          betrag: eintraege.reduce(
            (sum, e) => sum + Number(md.erstattungen[e.key] || 0),
            0
          ),
          tage: fruehestes
            ? Math.max(0, Math.floor((Date.now() - fruehestes.getTime()) / 86400000))
            : null,
          eingereichtAm: fruehestes
            ? fruehestes.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
            : null,
          traegerNamen: eintraege.map((e) => e.name).join(', '),
          eintraege,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyData, abrechnungstraeger]);

  // Schnellaktion: alle eingereichten Träger eines Monats als erstattet
  // markieren — direkt mit Undo-Toast, ein Refresh (Muster aus useEinreichen)
  const monatErhalten = async (u) => {
    const [jahr, monat] = u.ym.split('-');
    const heute = new Date().toISOString().split('T')[0];
    const datumsTeil = (w) => (w ? String(w).slice(0, 10) : null);
    try {
      for (const e of u.eintraege) {
        // eslint-disable-next-line no-await-in-loop
        await updateAbrechnungsStatus(jahr, monat, e.key, 'erhalten', heute, true, false);
      }
      await fetchMonthlyData();
      await fetchFahrten();
      toast.success(`${monatName(u.ym)} als erstattet markiert.`, {
        undo: async () => {
          try {
            for (const e of u.eintraege) {
              const alt = datumsTeil(e.eingereicht_am);
              // eslint-disable-next-line no-await-in-loop
              await updateAbrechnungsStatus(jahr, monat, e.key, 'reset', null, true, false);
              if (alt) {
                // eslint-disable-next-line no-await-in-loop
                await updateAbrechnungsStatus(jahr, monat, e.key, 'eingereicht', alt, true, false);
              }
            }
            await fetchMonthlyData();
            await fetchFahrten();
            toast.success('Rückgängig gemacht.');
          } catch (error) {
            console.error('Fehler beim Zurücknehmen:', error);
            toast.error('Status konnte nicht zurückgesetzt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Markieren als erstattet:', error);
      toast.error('Status konnte nicht aktualisiert werden.');
    }
  };

  // ---- Chart: die letzten 8 Monate, Farbe nach Monatsstatus ---------------
  const chart = useMemo(() => {
    const jetzt = new Date();
    const monate = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(jetzt.getFullYear(), jetzt.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const md = byYM[ym];
      const mf = Number(md?.erstattungen?.mitfahrer || 0);
      monate.push({
        ym,
        km: md?.totalKm || 0,
        fahrten: md?.fahrtenCount || 0,
        betrag: Number(md?.totalErstattung || 0),
        mitfahrer: mf,
        status: monatsStatus(md),
        initiale: d.toLocaleDateString('de-DE', { month: 'narrow' }),
      });
    }
    return monate;
  }, [byYM]);
  const chartMax = Math.max(...chart.map((c) => c.km), 1);

  // ---- „Zuletzt"/„Letzte Fahrten": eigener, ungefilterter Abruf -----------
  // Die jüngsten Monate mit Fahrten (aus monthlyData), bis ≥ 5 Fahrten
  // abgedeckt sind — die Monatsreports liefern Erstattung + Mitfahrer je Fahrt.
  const [recent, setRecent] = useState(null); // null = lädt

  useEffect(() => {
    let aktiv = true;
    const laden = async () => {
      try {
        const monate = [];
        let abgedeckt = 0;
        for (const md of monthlyData) { // bereits neueste zuerst sortiert
          if (md.fahrtenCount > 0) {
            monate.push(md.yearMonth);
            abgedeckt += md.fahrtenCount;
            if (abgedeckt >= 5 || monate.length >= 3) break;
          }
        }
        if (monate.length === 0) {
          if (aktiv) setRecent([]);
          return;
        }
        const antworten = await Promise.all(
          monate.map((ym) => {
            const [y, m] = ym.split('-');
            return axios.get(`${API_BASE_URL}/fahrten/report/${y}/${parseInt(m, 10)}`);
          })
        );
        const alle = antworten.flatMap((r) => r.data.fahrten || []);
        alle.sort((a, b) => {
          const diff = new Date(b.datum) - new Date(a.datum);
          return diff !== 0 ? diff : (b.id || 0) - (a.id || 0);
        });
        if (aktiv) setRecent(alle.slice(0, 5));
      } catch (error) {
        console.error('Fehler beim Laden der letzten Fahrten:', error);
        if (aktiv) setRecent([]);
      }
    };
    laden();
    return () => { aktiv = false; };
  }, [monthlyData]);

  const statusFuerFahrt = (fahrt) => {
    const md = byYM[String(fahrt.datum).slice(0, 7)];
    return statusFromAbrechnung(md?.abrechnungsStatus?.[fahrt.abrechnung]);
  };

  const zielName = (fahrt) => fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';

  // Distanz zwischen zwei gespeicherten Orten (beide Richtungen)
  const findDistanz = (vonId, nachId) => {
    if (!vonId || !nachId) return null;
    const hit = (distanzen || []).find(
      (d) =>
        (String(d.von_ort_id) === String(vonId) && String(d.nach_ort_id) === String(nachId)) ||
        (String(d.von_ort_id) === String(nachId) && String(d.nach_ort_id) === String(vonId))
    );
    return hit ? parseFloat(hit.distanz) : null;
  };

  // ---- Aktionen: sofort + optimistisch, Toast mit „Rückgängig" ------------

  const entferneOptimistisch = (tempId) => {
    setRecent((prev) => (prev || []).filter((f) => f.id !== tempId));
  };

  // Favoriten-Tipp legt die Fahrt SOFORT an — kein Zwischenschritt, kein Modal.
  const handleFavorit = (fav) => {
    const km = findDistanz(fav.von_ort_id, fav.nach_ort_id);
    const tempId = `optimistisch-fav-${Date.now()}`;
    setRecent((prev) => [
      {
        id: tempId,
        datum: heuteISO(),
        anlass: fav.anlass,
        kilometer: km || 0,
        abrechnung: fav.abrechnungstraeger_id,
        von_ort_name: fav.von_ort_name,
        nach_ort_name: fav.nach_ort_name,
        mitfahrer: [],
        _optimistisch: true,
      },
      ...(prev || []),
    ].slice(0, 5));

    const op = { abgebrochen: false, id: null };
    const entferneAngelegte = async () => {
      try {
        await axios.delete(`${API_BASE_URL}/fahrten/${op.id}`);
        entferneOptimistisch(tempId);
        await refreshAllData();
        toast.success('Fahrt wieder entfernt.');
      } catch (error) {
        console.error('Fehler beim Entfernen der Fahrt:', error);
        toast.error('Fahrt konnte nicht entfernt werden.');
      }
    };

    toast.success(`${fav.von_ort_name} → ${fav.nach_ort_name} für heute eingetragen.`, {
      undo: () => {
        op.abgebrochen = true;
        if (op.id) {
          entferneAngelegte();
        } else {
          entferneOptimistisch(tempId);
        }
      },
    });

    (async () => {
      try {
        const result = await executeFavorit(fav.id, false);
        op.id = result?.id || null;
        if (op.abgebrochen && op.id) {
          await entferneAngelegte();
        }
      } catch (error) {
        console.error('Fehler beim Ausführen des Favoriten:', error);
        entferneOptimistisch(tempId);
        if (!op.abgebrochen) toast.error('Favorit konnte nicht ausgeführt werden.');
      }
    })();
  };

  // „Wiederholen" schreibt SOFORT eine neue Fahrt mit heutigem Datum und
  // denselben Daten — INKLUSIVE Mitfahrer (das alte „Nochmal" verlor sie).
  const handleWiederholen = (fahrt) => {
    const tempId = `optimistisch-wdh-${Date.now()}`;
    setRecent((prev) => [
      { ...fahrt, id: tempId, datum: heuteISO(), _optimistisch: true },
      ...(prev || []),
    ].slice(0, 5));

    const op = { abgebrochen: false, id: null };
    const entferneAngelegte = async () => {
      try {
        await axios.delete(`${API_BASE_URL}/fahrten/${op.id}`);
        entferneOptimistisch(tempId);
        await refreshAllData();
        toast.success('Fahrt wieder entfernt.');
      } catch (error) {
        console.error('Fehler beim Entfernen der Fahrt:', error);
        toast.error('Fahrt konnte nicht entfernt werden.');
      }
    };

    toast.success(`${zielName(fahrt)} für heute eingetragen.`, {
      undo: () => {
        op.abgebrochen = true;
        if (op.id) {
          entferneAngelegte();
        } else {
          entferneOptimistisch(tempId);
        }
      },
    });

    (async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/fahrten`, {
          datum: heuteISO(),
          vonOrtId: fahrt.von_ort_id || null,
          nachOrtId: fahrt.nach_ort_id || null,
          einmaligerVonOrt: fahrt.einmaliger_von_ort || null,
          einmaligerNachOrt: fahrt.einmaliger_nach_ort || null,
          anlass: fahrt.anlass || '',
          kilometer: parseFloat(fahrt.kilometer) || 0,
          abrechnung: fahrt.abrechnung,
          mitfahrer: (fahrt.mitfahrer || []).map((m) => ({
            name: m.name,
            arbeitsstaette: m.arbeitsstaette,
            richtung: m.richtung,
          })),
        });
        op.id = res.data.id;
        if (op.abgebrochen) {
          await entferneAngelegte();
          return;
        }
        await refreshAllData();
      } catch (error) {
        console.error('Fehler beim Wiederholen der Fahrt:', error);
        entferneOptimistisch(tempId);
        if (!op.abgebrochen) toast.error('Fahrt konnte nicht erstellt werden.');
      }
    })();
  };

  // ---- Kopfdaten -----------------------------------------------------------

  // Begrüßung tageszeitabhängig — Grenzen: 5–10 Uhr Morgen, 11–17 Uhr Tag,
  // sonst Abend
  const stunde = new Date().getHours();
  const gruss = stunde >= 5 && stunde < 11
    ? 'Guten Morgen'
    : stunde >= 11 && stunde < 18
      ? 'Guten Tag'
      : 'Guten Abend';
  const vorname = (user?.full_name || '').trim().split(/\s+/)[0] || user?.username || '';
  const heuteLang = new Date().toLocaleDateString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const initialen = (() => {
    const fn = (user?.full_name || '').trim();
    if (fn) {
      const teile = fn.split(/\s+/);
      return (teile[0][0] + (teile[1]?.[0] || '')).toUpperCase();
    }
    return (user?.username || '?').slice(0, 2).toUpperCase();
  })();

  const zuletztSub = (fahrt) => {
    const d = new Date(fahrt.datum);
    const wt = d.toLocaleDateString('de-DE', { weekday: 'short' });
    const dat = d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return `${wt} ${dat} ${fahrt.anlass ? `· ${fahrt.anlass}` : ''}`.trim();
  };

  // ---- Wiederverwendete Teilstücke ----------------------------------------

  // Erfolgszustand: nichts fällig — aber eingereichte Monate, die noch auf
  // die Erstattung warten, werden ehrlich benannt (User-Feedback 07.08.)
  const nUnterwegs = unterwegsListe.length;
  const heroErfolg = (
    <section
      className="dash-hero-ok"
      aria-label={nUnterwegs > 0 ? 'Alles eingereicht' : 'Alles abgerechnet'}
    >
      <span className="dash-hero-ok-icon" aria-hidden="true">✓</span>
      <span>
        <span className="dash-hero-ok-titel">
          {nUnterwegs > 0 ? 'Alles eingereicht' : 'Alles abgerechnet'}
        </span>
        <span className="dash-hero-ok-text">
          {nUnterwegs === 0
            ? 'Kein Monat wartet auf die Abrechnung.'
            : nUnterwegs === 1
              ? '1 Monat wartet noch auf die Erstattung.'
              : `${nUnterwegs} Monate warten noch auf die Erstattung.`}
        </span>
      </span>
    </section>
  );

  // Favoriten-Kacheln — gemeinsam für mobil („Ein Tipp genügt") und Desktop
  const favTiles = favoriten.map((fav) => {
    const km = findDistanz(fav.von_ort_id, fav.nach_ort_id);
    return (
      <button
        key={fav.id}
        type="button"
        className="dash-fav-tile"
        onClick={() => handleFavorit(fav)}
      >
        <span className="dash-fav-ort">{fav.nach_ort_name}</span>
        <span>
          {fav.anlass && <span className="dash-fav-anlass">{fav.anlass}</span>}
          <span className="dash-fav-km num">
            {km !== null ? `${formatKm(km)} km · ` : ''}{traegerKuerzel(fav.traeger_name)}
          </span>
        </span>
      </button>
    );
  });

  const favoritenLeer = (
    <div className="dash-block">
      <EmptyState
        icon={<Star size={20} />}
        title="Noch keine Favoriten"
        text="Lege häufige Strecken als Favorit an — ein Tipp genügt dann zum Erfassen."
        actionLabel="Favorit anlegen"
        onAction={() => onNavigate && onNavigate('einstellungen:favoriten')}
      />
    </div>
  );

  return (
    <div className="dashboard">
      {/* ================= Mobil (<768px) ================= */}
      <div className="dash-mobile">
        <div className="dash-m-head">
          <h1 className="dash-m-monat">{monatName(currentYM)}</h1>
          <button
            type="button"
            className="dash-avatar"
            onClick={() => onNavigate && onNavigate('einstellungen')}
            title="Einstellungen"
            aria-label="Einstellungen öffnen"
          >
            {initialen}
          </button>
        </div>

        {hero ? (
          <section className="dash-hero">
            <div className="dash-hero-label">Noch nicht eingereicht</div>
            <div className="dash-hero-betrag num">{formatEuro(hero.betrag)} €</div>
            <div className="dash-hero-zeile">
              {monatJahr(hero.ym)} · <span className="num">{formatKm(hero.km)}</span> km · {hero.traeger.length} Träger
            </div>
            <button
              type="button"
              className="dash-hero-btn"
              onClick={() => onNavigate && onNavigate('abrechnungen')}
            >
              {monatName(hero.ym)} abrechnen
            </button>
          </section>
        ) : heroErfolg}

        <div className="dash-label-row">
          <span className="dash-label">Ein Tipp genügt</span>
          <button
            type="button"
            className="dash-link"
            onClick={() => onNavigate && onNavigate('einstellungen:favoriten')}
          >
            Alle
          </button>
        </div>
        {favoriten.length === 0 ? favoritenLeer : (
          <div className="dash-fav-grid">{favTiles}</div>
        )}

        <div className="dash-label-row">
          <span className="dash-label">Zuletzt</span>
        </div>
        {recent !== null && recent.length === 0 ? (
          <EmptyState
            title="Noch keine Fahrten"
            text="Erfasse deine erste Fahrt — ein Tipp auf + genügt."
            actionLabel="Fahrt erfassen"
            onAction={() => erfassung.open()}
          />
        ) : (
          <div className="dash-zuletzt-card">
            {recent === null ? (
              <div className="dash-zuletzt-laden">Fahrten werden geladen…</div>
            ) : (
              recent.map((fahrt) => (
                <div
                  key={fahrt.id}
                  className={`dash-zuletzt-row${fahrt._optimistisch ? ' is-neu' : ''}`}
                >
                  <div className="dash-zuletzt-main">
                    <div className="dash-zuletzt-ziel">{zielName(fahrt)}</div>
                    <div className="dash-zuletzt-sub">{zuletztSub(fahrt)}</div>
                  </div>
                  <div className="dash-zuletzt-km num">{formatKm(fahrt.kilometer)} km</div>
                  <button
                    type="button"
                    className="dash-repeat-btn"
                    onClick={() => handleWiederholen(fahrt)}
                    disabled={!!fahrt._optimistisch}
                    aria-label={`Fahrt nach ${zielName(fahrt)} für heute wiederholen`}
                    title="Für heute wiederholen"
                  >
                    ↻
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* FAB: gehört zum Dashboard-Screen, steht über der Bottom-Nav */}
        <button
          type="button"
          className="dash-fab"
          onClick={() => erfassung.open()}
          aria-label="Neue Fahrt erfassen"
        >
          +
        </button>
      </div>

      {/* ================= Desktop (≥768px, volles Raster ab 1024px) ================= */}
      <div className="dash-desktop">
        <div className="dash-d-head">
          <div>
            <h1 className="dash-d-gruss">{gruss}{vorname ? `, ${vorname}` : ''}</h1>
            <div className="dash-d-datum">{heuteLang}</div>
          </div>
          <button type="button" className="dash-d-btn" onClick={() => erfassung.open()}>
            + Neue Fahrt
          </button>
        </div>

        {/* Vierer-Grid: Hero · Monat bisher · Unterwegs · Kilometer (User-Feedback 07.08.) */}
        <div className="dash-d-grid4">
          {hero ? (
            <section className="dash-d-tile dash-d-tile-hero">
              <div className="dash-hero-label">Noch nicht eingereicht</div>
              <div className="dash-d-tile-hero-betrag num">{formatEuro(hero.betrag)} €</div>
              <div className="dash-d-tile-hero-aus">
                aus {monatJahr(hero.ym)} · {hero.traeger.length}{' '}
                {hero.traeger.length === 1 ? 'Träger' : 'Träger'}
              </div>
              <button
                type="button"
                className="dash-d-tile-hero-btn"
                onClick={() => onNavigate && onNavigate('abrechnungen')}
              >
                {monatName(hero.ym)} abrechnen →
              </button>
            </section>
          ) : (
            <section className="dash-d-tile dash-d-tile-ok" aria-label={nUnterwegs > 0 ? 'Alles eingereicht' : 'Alles abgerechnet'}>
              <span className="dash-hero-ok-icon" aria-hidden="true">✓</span>
              <span className="dash-hero-ok-titel">
                {nUnterwegs > 0 ? 'Alles eingereicht' : 'Alles abgerechnet'}
              </span>
              <span className="dash-hero-ok-text">
                {nUnterwegs === 0
                  ? 'Kein Monat wartet auf die Abrechnung.'
                  : nUnterwegs === 1
                    ? '1 Monat wartet noch auf die Erstattung.'
                    : `${nUnterwegs} Monate warten noch auf die Erstattung.`}
              </span>
            </section>
          )}

          <section className="dash-d-tile">
            <div className="dash-label dash-d-card-label">{monatName(currentYM)} bisher</div>
            <div className="dash-d-bisher-zeile">
              <span className="dash-d-bisher-km num">{formatKm(bisher.km)} km</span>
              <span className="dash-d-bisher-betrag num">{formatEuro(bisher.betrag)} €</span>
            </div>
            <div className="dash-d-card-sub">
              {bisher.fahrten} {bisher.fahrten === 1 ? 'Fahrt' : 'Fahrten'}
              {bisherMitfahrer > 0 && (
                <> · davon <span className="num">{formatEuro(bisherMitfahrer)}</span> € Mitfahrer</>
              )}
            </div>
          </section>

          <section className="dash-d-tile dash-d-tile-scroll">
            <div className="dash-label dash-d-card-label">Unterwegs</div>
            {unterwegsListe.length > 0 ? (
              unterwegsListe.map((u) => (
                <div key={u.ym} className="dash-uw-row">
                  <div className="dash-uw-main">
                    <div className="dash-d-unterwegs-zeile">
                      <span className="dash-d-unterwegs-dot" aria-hidden="true" />
                      <span className="dash-d-unterwegs-text">{monatName(u.ym)} eingereicht</span>
                      <span className="dash-d-unterwegs-betrag num">{formatEuro(u.betrag)} €</span>
                    </div>
                    <div className="dash-d-unterwegs-sub">
                      {u.eingereichtAm && <>am <span className="num">{u.eingereichtAm}</span></>}
                      {u.tage !== null && (
                        <>{u.eingereichtAm ? ' · ' : ''}{u.tage === 0 ? 'heute' : `seit ${u.tage} ${u.tage === 1 ? 'Tag' : 'Tagen'}`}</>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dash-uw-btn"
                    title={`${monatName(u.ym)} als erstattet markieren`}
                    aria-label={`${monatName(u.ym)} als erstattet markieren`}
                    onClick={() => monatErhalten(u)}
                  >
                    ✓
                  </button>
                </div>
              ))
            ) : (
              <div className="dash-d-card-sub">
                Kein eingereichter Monat wartet auf Erstattung.
              </div>
            )}
          </section>

          <section className="dash-d-tile">
            <div className="dash-label dash-d-card-label">Kilometer {new Date().getFullYear()}</div>
            <div className="dash-chart-bars dash-chart-bars-tile">
              {chart.map((c) => (
                <div
                  key={c.ym}
                  className="dash-chart-col"
                  tabIndex={c.km > 0 ? 0 : -1}
                  aria-label={`${monatJahr(c.ym)}: ${formatKm(c.km)} km, ${formatEuro(c.betrag)} €`}
                >
                  <div
                    className="dash-chart-bar"
                    style={{
                      height: `${Math.max(Math.round((c.km / chartMax) * 88), c.km > 0 ? 4 : 2)}px`,
                      background: c.status ? CHART_FARBEN[c.status] : 'var(--line-strong)',
                    }}
                  />
                  <div className="dash-chart-monat num">{c.initiale}</div>
                  {c.km > 0 && (
                    <div className="dash-chart-pop" role="tooltip">
                      <div className="dash-chart-pop-titel">{monatJahr(c.ym)}</div>
                      <div className="dash-chart-pop-zeile">
                        <span className="num">{formatKm(c.km)}</span> km · {c.fahrten} {c.fahrten === 1 ? 'Fahrt' : 'Fahrten'}
                      </div>
                      <div className="dash-chart-pop-zeile">
                        Erstattung <span className="num">{formatEuro(c.betrag - c.mitfahrer)} €</span>
                      </div>
                      {c.mitfahrer > 0 && (
                        <div className="dash-chart-pop-zeile">
                          Mitfahrer <span className="num">+{formatEuro(c.mitfahrer)} €</span>
                        </div>
                      )}
                      {c.status && (
                        <div className="dash-chart-pop-status">
                          <StatusBadge status={c.status} variant="dot" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="dash-chart-legende">
              <span><span className="dash-chart-swatch" style={{ background: 'var(--ok)' }} />Erstattet</span>
              <span><span className="dash-chart-swatch" style={{ background: 'var(--accent)' }} />Eingereicht</span>
              <span><span className="dash-chart-swatch" style={{ background: 'var(--brand)' }} />Erfasst</span>
            </div>
          </section>
        </div>

        {/* Favoriten auch auf dem Desktop (User-Feedback 07.08.) */}
        {favoriten.length > 0 && (
          <section className="dash-d-favsektion">
            <div className="dash-label-row">
              <span className="dash-label">Ein Tipp genügt</span>
              <button
                type="button"
                className="dash-link"
                onClick={() => onNavigate && onNavigate('einstellungen:favoriten')}
              >
                Alle
              </button>
            </div>
            <div className="dash-fav-grid dash-fav-grid-desktop">{favTiles}</div>
          </section>
        )}

        <section className="dash-d-tablecard">
          <div className="dash-d-tabletitel">
            <span>Letzte Fahrten</span>
            <button
              type="button"
              className="dash-link"
              onClick={() => onNavigate && onNavigate('fahrten')}
            >
              Alle ansehen
            </button>
          </div>
          <div className="dash-d-tablescroll">
            <div className="dash-d-tablehead">
              <div>Datum</div>
              <div>Anlass · Route</div>
              <div>Träger</div>
              <div className="dash-d-th-num">km</div>
              <div className="dash-d-th-num">Betrag</div>
              <div className="dash-d-th-num">Status</div>
              <div aria-hidden="true" />
            </div>
            {recent === null ? (
              <div className="dash-zuletzt-laden">Fahrten werden geladen…</div>
            ) : recent.length === 0 ? (
              <div className="dash-zuletzt-laden">Noch keine Fahrten erfasst.</div>
            ) : (
              recent.map((fahrt) => (
                <div key={fahrt.id} className="dash-d-tablerow">
                  <div className="dash-d-td-datum num">
                    {new Date(fahrt.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                  </div>
                  <div>
                    <div className="dash-d-td-anlass">{fahrt.anlass || '—'}</div>
                    <div className="dash-d-td-route">
                      {fahrt.von_ort_name || fahrt.einmaliger_von_ort} → {zielName(fahrt)}
                    </div>
                  </div>
                  <div className="dash-d-td-traeger">{getTraegerName(fahrt.abrechnung)}</div>
                  <div className="dash-d-td-zahl num">{formatKm(fahrt.kilometer)}</div>
                  <div className="dash-d-td-zahl">
                    <span className="num">{fahrt.erstattung !== undefined ? formatEuro(fahrt.erstattung) : '—'}</span>
                    {fahrt.mitfahrerErstattung > 0 && (
                      <div className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
                        +{formatEuro(fahrt.mitfahrerErstattung)} € Mitfahrer
                      </div>
                    )}
                  </div>
                  <div className="dash-d-td-status">
                    <StatusBadge status={statusFuerFahrt(fahrt)} variant="dot" />
                  </div>
                  <div className="dash-d-td-aktion">
                    {!fahrt._optimistisch && (
                      <button
                        type="button"
                        className="dash-d-wdh-btn"
                        title={`Fahrt nach ${zielName(fahrt)} für heute wiederholen`}
                        aria-label={`Fahrt nach ${zielName(fahrt)} für heute wiederholen`}
                        onClick={() => handleWiederholen(fahrt)}
                      >
                        ↻
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
