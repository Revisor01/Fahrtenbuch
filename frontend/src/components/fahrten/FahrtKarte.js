import React from 'react';
import StatusBadge from '../ui/StatusBadge';
import { formatBetrag, rundeKilometer } from './zeitraumUtils';

// Fahrt-Zeile mobil (< 768px).
//
// Layout nach dem Vorbild der Dashboard-Liste „Zuletzt" (User-Feedback 14.08.):
// dort steht der Anlass zuoberst, darunter die Route, darunter eine leise
// Zeile aus Datum und Traeger — km rechts. Die frueheren Einzelkarten
// wiederholten dieselben Angaben in vier Zeilen mit eigenem Rahmen: mehr
// Flaeche, weniger Uebersicht.
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

// `gesperrt`: Solange eine gerade angelegte Fahrt nur optimistisch in der
// Liste steht, hat sie noch keine Server-ID. Das Aktions-Sheet bietet aber
// „Rueckfahrt hinzufuegen" und „Wiederholen" an — beides braeuchte sie. Bis
// die Antwort da ist, bleibt die Karte deshalb nicht antippbar.
function FahrtKarte({ fahrt, status, onOeffnen, gesperrt = false }) {
  const ziel = fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';
  const von = fahrt.von_ort_name || fahrt.einmaliger_von_ort || '';
  const titel = fahrt.anlass || ziel;
  const route = von ? `${von} → ${ziel}` : ziel;
  const mitfahrer = fahrt.mitfahrer || [];

  return (
    <button
      type="button"
      className={`fl-zeile fl-zeile-tap${gesperrt ? ' is-neu' : ''}`}
      onClick={() => onOeffnen(fahrt)}
      disabled={gesperrt}
      aria-label={`Fahrt ${von ? `${von} nach ` : 'nach '}${ziel}, ${datumKurz(fahrt.datum)} — Aktionen öffnen`}
      title={mitfahrer.length > 0 ? `Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}` : route}
    >
      {/* Links der Text in drei Zeilen — Anlass, Weg, Datum —, rechts die
          Zahlen. Jede Zeile hat die volle Breite fuer sich; alles in einer
          Zeile war nicht mehr zu lesen (Simon 16.08.). */}
      <span className="fl-zeile-main">
        {/* Das Datum fuehrt die Karte an — es ist der Orientierungsmarker beim
            Durchsehen (Simon 16.08.). Als eigene Zeile, nicht als Spalte
            daneben: dort nahm es dem Anlass die Breite. Mitfahrer-Marke und
            ein abweichender Status stehen daneben; in der Anlasszeile kosteten
            sie genau den Platz, den lange Anlaesse brauchen. */}
        <span className="fl-zeile-kopf">
          <span className="fl-zeile-datum num">{datumKurz(fahrt.datum)}</span>
          {mitfahrer.length > 0 && (
            <span className="fl-zeile-mf" title={`Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}`}>
              <span aria-hidden="true">+{mitfahrer.length}</span>
              <span className="sr-only">
                {mitfahrer.length} Mitfahrer:in{mitfahrer.length > 1 ? 'nen' : ''}
              </span>
            </span>
          )}
          {/* „Erfasst" sagte an jeder Karte nichts — der Status haengt am
              Traeger und Monat, nicht an der Fahrt. Sichtbar nur, wo er
              abweicht (Zeitraum ueber mehrere Monate). */}
          {status && status !== 'offen' && (
            <StatusBadge status={status} variant="dot" className="fl-zeile-status" />
          )}
        </span>
        <span className="fl-zeile-titel">
          <span className="fl-zeile-anlass">{titel}</span>
          {fahrt.partner_fahrt_id && (
            <span className="fl-paar-hinweis" title="Gehört zu einer Hin- und Rückfahrt">
              <span aria-hidden="true">⇄</span>
              <span className="sr-only">Teil einer Hin- und Rückfahrt</span>
            </span>
          )}
        </span>
        <span className="fl-zeile-route">
          {von && <span className="fl-zeile-ort">{von}</span>}
          <span className="fl-zeile-ort">
            {von && <span className="fl-zeile-pfeil" aria-hidden="true">→</span>}
            {ziel}
          </span>
        </span>
      </span>

      {/* Rechts, rechtsbuendig untereinander: Summe zuerst — die Zahl, auf die
          es bei einer Abrechnung ankommt —, darunter klein die
          Mitfahrer-Erstattung (nur wenn es sie gibt), darunter die Kilometer. */}
      <span className="fl-zeile-werte">
        <span className="fl-zeile-betrag num">{formatBetrag(fahrt.erstattung)} €</span>
        {fahrt.mitfahrerErstattung > 0 && (
          <span className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
            +{formatBetrag(fahrt.mitfahrerErstattung)} €
          </span>
        )}
        <span className="fl-zeile-km num">{rundeKilometer(fahrt.kilometer)} km</span>
      </span>
    </button>
  );
}

export default FahrtKarte;
