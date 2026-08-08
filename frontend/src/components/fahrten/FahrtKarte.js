import React, { useRef, useState } from 'react';
import { Pencil, Trash2, Users } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from './zeitraumUtils';

// Fahrt-Karte mobil (< 768px):
// Kopfzeile Datum Mono 13px + Status Punkt+Wort, dann Anlass 17px/600 + km Mono,
// darunter die Route „von → nach", darunter Träger + Betrag Mono;
// Mitfahrer als kompakte Zusatzzeile.
//
// Wischen nach links legt Bearbeiten/Löschen frei (Buttons ≥ 44px).
// Ohne Swipe (A11y/Tastatur): Tipp bzw. Enter/Leertaste auf die Karte
// schaltet dieselben Aktionen frei — es ist immer nur eine Karte offen
// (Zustand liegt beim Eltern-Element).

const AKTIONEN_BREITE = 112; // 2 Buttons à 52px + 8px Lücke

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const datumKurz = (datum) => {
  const d = new Date(datum);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${WOCHENTAGE[d.getDay()]} ${dd}.${mm}.`;
};

function FahrtKarte({ fahrt, status, traegerName, istOffen, onOeffnen, onEdit, onDelete }) {
  const [drag, setDrag] = useState(null);
  const touch = useRef(null);
  const klickUnterdruecken = useRef(false);

  const basis = istOffen ? -AKTIONEN_BREITE : 0;
  const offset = drag !== null ? drag : basis;

  const handleTouchStart = (e) => {
    touch.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      richtung: null,
    };
  };

  const handleTouchMove = (e) => {
    const t = touch.current;
    if (!t) return;
    const dx = e.touches[0].clientX - t.x;
    const dy = e.touches[0].clientY - t.y;
    // Erst die Geste festlegen: horizontal = Swipe, vertikal = Scrollen
    if (t.richtung === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      t.richtung = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (t.richtung !== 'h') return;
    setDrag(Math.min(0, Math.max(-AKTIONEN_BREITE, basis + dx)));
  };

  const handleTouchEnd = () => {
    const t = touch.current;
    touch.current = null;
    if (!t || t.richtung !== 'h' || drag === null) {
      setDrag(null);
      return;
    }
    const offen = drag < -AKTIONEN_BREITE / 2;
    onOeffnen(offen ? fahrt.id : null);
    // Ein echter Swipe soll keinen Tipp auslösen
    if (Math.abs(drag - basis) > 6) {
      klickUnterdruecken.current = true;
    }
    setDrag(null);
  };

  const toggleAktionen = () => {
    if (klickUnterdruecken.current) {
      klickUnterdruecken.current = false;
      return;
    }
    onOeffnen(istOffen ? null : fahrt.id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOeffnen(istOffen ? null : fahrt.id);
    }
  };

  const ziel = fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';
  const von = fahrt.von_ort_name || fahrt.einmaliger_von_ort || '';
  // Anlass führt, darunter die Route, darunter der Träger
  const titel = fahrt.anlass || ziel;
  const route = von ? `${von} → ${ziel}` : ziel;
  const mitfahrer = fahrt.mitfahrer || [];

  return (
    <div className="fl-swipe">
      <div className="fl-swipe-actions">
        <button
          type="button"
          className="fl-swipe-btn fl-swipe-btn-edit"
          onClick={onEdit}
          tabIndex={istOffen ? 0 : -1}
          aria-hidden={!istOffen}
          aria-label={`Fahrt nach ${ziel} am ${datumKurz(fahrt.datum)} bearbeiten`}
        >
          <Pencil size={18} />
        </button>
        <button
          type="button"
          className="fl-swipe-btn fl-swipe-btn-delete"
          onClick={onDelete}
          tabIndex={istOffen ? 0 : -1}
          aria-hidden={!istOffen}
          aria-label={`Fahrt nach ${ziel} am ${datumKurz(fahrt.datum)} löschen`}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div
        className="fl-card"
        style={{
          transform: `translateX(${offset}px)`,
          transition: drag !== null ? 'none' : 'transform 200ms ease',
        }}
        role="button"
        tabIndex={0}
        aria-expanded={istOffen}
        aria-label={`Fahrt ${von ? `${von} nach ` : 'nach '}${ziel}, ${datumKurz(fahrt.datum)} — Aktionen anzeigen`}
        title={von ? `${von} → ${ziel}` : ziel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={toggleAktionen}
        onKeyDown={handleKeyDown}
      >
        <div className="fl-card-kopf">
          <span className="fl-card-datum num">{datumKurz(fahrt.datum)}</span>
          <StatusBadge status={status} variant="dot" />
        </div>
        <div className="fl-card-zeile">
          <span className="fl-card-ziel">{titel}</span>
          <span className="fl-card-km num">{rundeKilometer(fahrt.kilometer)} km</span>
        </div>
        <div className="fl-card-zeile">
          <span className="fl-card-route">{route}</span>
        </div>
        <div className="fl-card-zeile">
          <span className="fl-card-sub">{traegerName}</span>
          <span className="fl-betrag-mit-mf">
            <span className="fl-card-betrag num">{formatBetrag(fahrt.erstattung)} €</span>
            {fahrt.mitfahrerErstattung > 0 && (
              <span className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
                +{formatBetrag(fahrt.mitfahrerErstattung)} €
              </span>
            )}
          </span>
        </div>
        {mitfahrer.length > 0 && (
          <div className="fl-card-mitfahrer">
            <Users size={12} aria-hidden="true" />
            <span>{mitfahrer.map((m) => m.name).join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default FahrtKarte;
