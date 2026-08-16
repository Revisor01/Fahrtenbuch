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

function FahrtKarte({ fahrt, status, onOeffnen }) {
  const ziel = fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || '—';
  const von = fahrt.von_ort_name || fahrt.einmaliger_von_ort || '';
  const titel = fahrt.anlass || ziel;
  const route = von ? `${von} → ${ziel}` : ziel;
  const mitfahrer = fahrt.mitfahrer || [];

  return (
    <button
      type="button"
      className="fl-zeile fl-zeile-tap"
      onClick={() => onOeffnen(fahrt)}
      aria-label={`Fahrt ${von ? `${von} nach ` : 'nach '}${ziel}, ${datumKurz(fahrt.datum)} — Aktionen öffnen`}
      title={mitfahrer.length > 0 ? `Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}` : route}
    >
      {/* Zwei Zeilen statt vier (Simon 16.08.): Das Datum fuehrt oben links,
          weil es beim Durchsehen die Ordnung gibt; der Anlass steht daneben.
          Darunter die Route einzeilig. Der Traeger ist raus — er steht in der
          Erstattungs-Karte darueber, und im Monat hat er ohnehin fast jede
          Fahrt gleich. Alles Weitere zeigt das Aktions-Sheet. */}
      <span className="fl-zeile-main">
        <span className="fl-zeile-kopf">
          <span className="fl-zeile-datum num">{datumKurz(fahrt.datum)}</span>
          {/* Titel und Rueckfahrt-Zeichen in einer eigenen Huelle: Der Anlass
              nimmt als flex:1 sonst die ganze Breite und schiebt das Zeichen
              an den rechten Rand — es soll aber direkt am Titel kleben
              (Simon 16.08.). */}
          <span className="fl-zeile-titel">
            <span className="fl-zeile-anlass">{titel}</span>
            {fahrt.partner_fahrt_id && (
              <span className="fl-paar-hinweis" title="Gehört zu einer Hin- und Rückfahrt">
                <span aria-hidden="true">⇄</span>
                <span className="sr-only">Teil einer Hin- und Rückfahrt</span>
              </span>
            )}
          </span>
          {mitfahrer.length > 0 && (
            <span className="fl-zeile-mf" title={`Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}`}>
              <span aria-hidden="true">+{mitfahrer.length}</span>
              <span className="sr-only">
                {mitfahrer.length} Mitfahrer:in{mitfahrer.length > 1 ? 'nen' : ''}
              </span>
            </span>
          )}
          {/* „Erfasst" sagte an jeder Zeile nichts — der Status haengt am
              Traeger und Monat, nicht an der Fahrt. Sichtbar nur, wo er
              abweicht (Zeitraum ueber mehrere Monate). */}
          {status && status !== 'offen' && (
            <StatusBadge status={status} variant="dot" className="fl-zeile-status" />
          )}
          {/* Kilometer und Betrag in der Titelzeile, nicht rechts ueber beide
              Zeilen (Simon 16.08.): So steht die Summe jeder Fahrt immer oben
              auf gleicher Hoehe, statt je nach Zeilenhoehe zu wandern. */}
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
        </span>
        {/* Zwei Zeilen fuer den Weg, aber ohne „von"/„nach" (Simon 16.08.):
            Einzeilig blieb vom Ziel nur ein Stummel, und die Marken kosteten
            Platz, den die Adressen brauchen. Der Pfeil fuehrt die zweite
            Zeile an — damit ist die Richtung ohne Wort klar. */}
        <span className="fl-zeile-route">
          {von && <span className="fl-zeile-ort">{von}</span>}
          <span className="fl-zeile-ort">
            {von && <span className="fl-zeile-pfeil" aria-hidden="true">→</span>}
            {ziel}
          </span>
        </span>
      </span>
    </button>
  );
}

export default FahrtKarte;
