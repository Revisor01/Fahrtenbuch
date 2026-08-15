import React from 'react';
import { ChevronRight } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from './zeitraumUtils';

// Fahrt-Zeile mobil (< 768px).
//
// Layout nach dem Vorbild der Dashboard-Liste „Zuletzt" (User-Feedback 14.08.):
// dort steht der Anlass zuoberst, darunter die Route, darunter eine leise
// Zeile aus Datum und Traeger — km rechts, Chevron als Hinweis auf das
// Aktions-Sheet. Die frueheren Einzelkarten wiederholten dieselben Angaben in
// vier Zeilen mit eigenem Rahmen: mehr Flaeche, weniger Uebersicht.
//
// Anders als das Dashboard traegt die Fahrtenliste zusaetzlich Status, Betrag,
// Mitfahrer und den Hin-/Rueckfahrt-Hinweis. Die kommen in dieselbe leise
// Zeile bzw. rechts unter die Kilometer, statt eigene Zeilen zu belegen.
//
// Ein Tipp oeffnet das Aktions-Sheet (Details + Bearbeiten/Loeschen). Eine
// Wischgeste gibt es hier bewusst nicht — sie konkurrierte mit dem Scrollen
// und war nicht auffindbar.

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
  // Anlass führt, darunter die Route, darunter Datum + Träger
  const titel = fahrt.anlass || ziel;
  const route = von ? `${von} → ${ziel}` : ziel;
  const mitfahrer = fahrt.mitfahrer || [];

  // Leise Zeile: Datum · Träger · Mitfahrer — dieselbe Reihenfolge wie im
  // Dashboard, nur um die Angaben ergänzt, die es dort nicht gibt.
  const subTeile = [datumKurz(fahrt.datum), traegerName];
  if (mitfahrer.length > 0) {
    subTeile.push(
      `${mitfahrer.length} Mitfahrer:in${mitfahrer.length > 1 ? 'nen' : ''}`
    );
  }

  return (
    <button
      type="button"
      className="fl-zeile fl-zeile-tap"
      onClick={() => onOeffnen(fahrt)}
      aria-label={`Fahrt ${von ? `${von} nach ` : 'nach '}${ziel}, ${datumKurz(fahrt.datum)} — Aktionen öffnen`}
      title={mitfahrer.length > 0 ? `Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}` : route}
    >
      <span className="fl-zeile-main">
        <span className="fl-zeile-titel">
          <span className="fl-zeile-anlass">{titel}</span>
          {fahrt.partner_fahrt_id && (
            <span className="fl-paar-hinweis" title="Gehört zu einer Hin- und Rückfahrt">
              <span aria-hidden="true">⇄</span>
              <span className="sr-only">Teil einer Hin- und Rückfahrt</span>
            </span>
          )}
        </span>
        <span className="fl-zeile-route">{route}</span>
        {/* Der Text braucht ein eigenes Span: Ein Flex-Container kuerzt nur
            sich selbst, nicht eine lose Textnode darin — der Traegername lief
            sonst unter die Kilometerspalte. */}
        <span className="fl-zeile-sub">
          <span className="fl-zeile-sub-text">{subTeile.join(' · ')}</span>
          <StatusBadge status={status} variant="dot" className="fl-zeile-status" />
        </span>
      </span>
      <span className="fl-zeile-werte">
        <span className="fl-zeile-km num">{rundeKilometer(fahrt.kilometer)} km</span>
        <span className="fl-zeile-betrag num">
          {formatBetrag(fahrt.erstattung)} €
          {fahrt.mitfahrerErstattung > 0 && (
            <span className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
              +{formatBetrag(fahrt.mitfahrerErstattung)} €
            </span>
          )}
        </span>
      </span>
      <ChevronRight size={16} className="fl-zeile-chevron" aria-hidden="true" />
    </button>
  );
}

export default FahrtKarte;
