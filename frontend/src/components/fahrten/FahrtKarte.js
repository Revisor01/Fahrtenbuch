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
      {/* Zwei Bereiche nebeneinander statt allem in einer Zeile (Simon 16.08.):
          Links der Text, rechts die Zahlen. Vorher teilten sich Datum, Anlass,
          ⇄, „+1", Kilometer und Betrag dieselbe Zeile — vom Anlass blieb
          „Die…", und zu erkennen war nichts mehr. */}
      <span className="fl-zeile-main">
        {/* Datum fuehrt oben links, davor nichts — es gibt beim Durchsehen die
            Ordnung (Simon 16.08.). Der Anlass steht daneben und hat die Zeile
            sonst fuer sich; nur das Rueckfahrt-Zeichen klebt an ihm. Kilometer
            und Betrag standen bis 16.08. ebenfalls hier und drueckten den
            Anlass auf „Die…" — sie stehen jetzt rechts. */}
        <span className="fl-zeile-kopf">
          <span className="fl-zeile-datum num">{datumKurz(fahrt.datum)}</span>
          <span className="fl-zeile-titel">
            <span className="fl-zeile-anlass">{titel}</span>
            {fahrt.partner_fahrt_id && (
              <span className="fl-paar-hinweis" title="Gehört zu einer Hin- und Rückfahrt">
                <span aria-hidden="true">⇄</span>
                <span className="sr-only">Teil einer Hin- und Rückfahrt</span>
              </span>
            )}
          </span>
        </span>
        {/* Der Weg auf zwei Zeilen, ohne „von"/„nach": Der Pfeil fuehrt die
            zweite Zeile an, damit die Richtung ohne Wort klar ist und die
            Adressen den Platz bekommen. Die Kilometer stehen rechts in der
            Zielzeile — oben neben dem Anlass nahmen sie ihm die Breite, bis er
            auf „Dienstbespr…" kuerzte (Simon 16.08.). */}
        <span className="fl-zeile-route">
          {von && <span className="fl-zeile-ort">{von}</span>}
          <span className="fl-zeile-zielzeile">
            <span className="fl-zeile-ort">
              {von && <span className="fl-zeile-pfeil" aria-hidden="true">→</span>}
              {ziel}
            </span>
            <span className="fl-zeile-km num">{rundeKilometer(fahrt.kilometer)} km</span>
          </span>
        </span>
        {/* Leise Fusszeile — nur wenn es etwas zu sagen gibt. „Erfasst" steht
            hier bewusst nicht: Der Status haengt am Traeger und Monat, nicht
            an der Fahrt, und erscheint nur, wo er abweicht (Zeitraum ueber
            mehrere Monate). */}
        {(mitfahrer.length > 0 || (status && status !== 'offen')) && (
          <span className="fl-zeile-fuss">
            {mitfahrer.length > 0 && (
              <span className="fl-zeile-mf" title={`Mitfahrer:innen: ${mitfahrer.map((m) => m.name).join(', ')}`}>
                <span aria-hidden="true">+{mitfahrer.length}</span>
                <span className="sr-only">
                  {mitfahrer.length} Mitfahrer:in{mitfahrer.length > 1 ? 'nen' : ''}
                </span>
              </span>
            )}
            {status && status !== 'offen' && (
              <StatusBadge status={status} variant="dot" className="fl-zeile-status" />
            )}
          </span>
        )}
      </span>
      {/* Der Betrag rechts oben, auf Hoehe des Anlasses — die Zahl, auf die es
          bei einer Abrechnung ankommt. Die Mitfahrer-Erstattung steht darunter
          statt daneben: nebeneinander lasen sich beide wie eine Zahl
          (Simon 16.08.). */}
      <span className="fl-zeile-werte">
        <span className="fl-zeile-betrag num">{formatBetrag(fahrt.erstattung)} €</span>
        {fahrt.mitfahrerErstattung > 0 && (
          <span className="fl-mf-betrag num" title="Mitfahrer-Erstattung">
            +{formatBetrag(fahrt.mitfahrerErstattung)} €
          </span>
        )}
      </span>
    </button>
  );
}

export default FahrtKarte;
