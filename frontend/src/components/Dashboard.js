import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import { useErfassung } from '../contexts/ErfassungContext';
import EmptyState from './ui/EmptyState';
import { useToast } from './ui/Toast';
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

function Dashboard({ onNavigate }) {
  const {
    monthlyData,
    favoriten,
    distanzen,
    abrechnungstraeger,
    user,
    executeFavorit,
    refreshAllData,
  } = useContext(AppContext);
  const toast = useToast();
  const erfassung = useErfassung();

  const currentYM = new Date().toISOString().slice(0, 7);

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

  // ---- „Zuletzt": eigener, ungefilterter Abruf ----------------------------
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

  const heroErfolg = (
    <section className="dash-hero-ok" aria-label="Alles abgerechnet">
      <span className="dash-hero-ok-icon" aria-hidden="true">✓</span>
      <span>
        <span className="dash-hero-ok-titel">Alles abgerechnet</span>
        <span className="dash-hero-ok-text">Kein Monat wartet auf die Abrechnung.</span>
      </span>
    </section>
  );

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
          <div className="dash-fav-grid">
            {favoriten.map((fav) => {
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
            })}
          </div>
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
    </div>
  );
}

export default Dashboard;
