import React from 'react';
import { Users, ChevronRight } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from './zeitraumUtils';

// Fahrt-Karte mobil (< 768px):
// Kopfzeile Datum Mono 13px + Status Punkt+Wort, dann Anlass 17px/600 + km Mono,
// darunter die Route „von → nach", darunter Träger + Betrag Mono;
// Mitfahrer als kompakte Zusatzzeile.
//
// Ein Tipp auf die Karte oeffnet das Aktions-Sheet (Details + Bearbeiten/
// Loeschen). Frueher legte ein Wisch nach links die Aktionen frei - die Geste
// konkurrierte mit dem Scrollen, war nicht auffindbar und sah zusammen mit den
// halb hervorlugenden Buttons unruhig aus.

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

const datumKurz = (datum) => {
  const d = new Date(datum);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${WOCHENTAGE[d.getDay()]} ${dd}.${mm}.`;
};

function FahrtKarte({ fahrt, status, traegerName, onOeffnen }) {
  const ziel = fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';
  const von = fahrt.von_ort_name || fahrt.einmaliger_von_ort || '';
  // Anlass führt, darunter die Route, darunter der Träger
  const titel = fahrt.anlass || ziel;
  const route = von ? `${von} → ${ziel}` : ziel;
  const mitfahrer = fahrt.mitfahrer || [];

  return (
    <button
      type="button"
      className="fl-card fl-card-tap"
      onClick={() => onOeffnen(fahrt)}
      aria-label={`Fahrt ${von ? `${von} nach ` : 'nach '}${ziel}, ${datumKurz(fahrt.datum)} — Aktionen öffnen`}
      title={von ? `${von} → ${ziel}` : ziel}
    >
      <span className="fl-card-kopf">
        <span className="fl-card-datum num">{datumKurz(fahrt.datum)}</span>
        <StatusBadge status={status} variant="dot" />
      </span>
      <span className="fl-card-zeile">
        <span className="fl-card-ziel">{titel}</span>
        <span className="fl-card-km num">{rundeKilometer(fahrt.kilometer)} km</span>
      </span>
      <span className="fl-card-zeile">
        <span className="fl-card-route">{route}</span>
        {fahrt.partner_fahrt_id && (
          <span className="fl-paar-hinweis" title="Gehört zu einer Hin- und Rückfahrt">
            <span aria-hidden="true">⇄</span>
            <span className="sr-only">Teil einer Hin- und Rückfahrt</span>
          </span>
        )}
      </span>
      <span className="fl-card-zeile">
        <span className="fl-card-sub">{traegerName}</span>
        <span className="fl-betrag-mit-mf">
          <span className="fl-card-betrag num">{formatBetrag(fahrt.erstattung)} €</span>
          {fahrt.mitfahrerErstattung > 0 && (
            <span className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
              +{formatBetrag(fahrt.mitfahrerErstattung)} €
            </span>
          )}
        </span>
      </span>
      {mitfahrer.length > 0 && (
        <span className="fl-card-mitfahrer">
          <Users size={12} aria-hidden="true" />
          <span>{mitfahrer.map((m) => m.name).join(', ')}</span>
        </span>
      )}
      <ChevronRight size={16} className="fl-card-chevron" aria-hidden="true" />
    </button>
  );
}

export default FahrtKarte;
