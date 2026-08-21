import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import { Plus, X, Pencil, Search, ChevronRight, MapPin } from 'lucide-react';
import { AppContext } from './contexts/AppContext';
import MitfahrerModal from './MitfahrerModal';
import axios from 'axios';
import Sheet from './components/ui/Sheet';
import AddressAutocomplete from './components/AddressAutocomplete';

// Klartext statt der internen Schluessel ('hin_rueck' sagt niemandem etwas)
// Auch vom Erfassungsflow genutzt — eine Quelle, damit die Beschriftung der
// Mitfahrer-Eintraege ueberall gleich lautet
export const RICHTUNG_TEXT = {
  hin: 'Hinfahrt',
  rueck: 'Rückfahrt',
  hin_rueck: 'Hin- und Rückfahrt',
};

// Ein-Tap-Datumswahl wie im Erfassungsflow: das native Datumsfeld liegt
// unsichtbar ueber dem Knopf. Vorher brauchte es zwei Taps.
function DatumsFeld({ datum, setDatum }) {
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" className="erf-von-btn" tabIndex={-1} aria-hidden="true">
        {datum ? formatDatumZeile(datum) : 'Datum wählen'}
      </button>
      <input
        type="date"
        value={datum}
        onChange={(e) => {
          if (e.target.value) setDatum(e.target.value);
        }}
        aria-label="Datum ändern"
        required
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

// Lokales Datum, nicht UTC: toISOString() liefert zwischen Mitternacht und
// 2 Uhr (Sommerzeit) noch den Vortag.
const heute = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

function formatDatumZeile(datum) {
  const d = new Date(`${datum}T00:00:00`);
  if (Number.isNaN(d.getTime())) return datum;
  const label = d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return datum === heute() ? `heute, ${label}` : label;
}

// Bearbeiten einer bestehenden Fahrt (Edit-Modal). Das Anlegen neuer Fahrten
// läuft seit dem Redesign 2026 ausschließlich über den zweistufigen
// Erfassungsflow (components/erfassung/ErfassungsFlow.js, useErfassung()).
// Bedienkonzept hier bewusst identisch zum Flow: aufklappende Ortsliste,
// Ein-Tap-Datum, Traeger-/Anlasszeile statt <select>.
function FahrtForm({ editData, onUpdate, onCancel }) {
  const {
    orte,
    showNotification,
    abrechnungstraeger,
    addOrt,
    refreshAllData,
    anlaesse,
    addAnlass,
  } = useContext(AppContext);
  const [mitfahrer, setMitfahrer] = useState([]);
  const [showMitfahrerModal, setShowMitfahrerModal] = useState(false);
  const [editingMitfahrerIndex, setEditingMitfahrerIndex] = useState(null);
  const [isKilometerLocked, setIsKilometerLocked] = useState(false);
  // Der Nutzer hat die gepflegte Distanz bewusst uebersteuert („Aendern")
  const [kmEntsperrt, setKmEntsperrt] = useState(false);
  // Fehlermarkierung am Kilometerfeld statt eines nativen alert()
  const [kmFehler, setKmFehler] = useState(false);
  const [ortSpeichernModal, setOrtSpeichernModal] = useState({
    isOpen: false,
    adresse: '',
    name: '',
    typ: '',
    ortTyp: 'sonstiger'
  });
  const [formData, setFormData] = useState({
    datum: '',
    vonOrtId: '',
    nachOrtId: '',
    einmaligerVonOrt: '',
    einmaligerNachOrt: '',
    anlass: '',
    manuelleKilometer: '',
    abrechnung: ''
  });
  const [useEinmaligenVonOrt, setUseEinmaligenVonOrt] = useState(false);
  const [useEinmaligenNachOrt, setUseEinmaligenNachOrt] = useState(false);

  // Aufklappzustaende der Zeilen (wie im Erfassungsflow inline, nicht als
  // eigener Screen — sonst gehen Scrollposition und Rueckweg verloren)
  const [vonAuswahlOffen, setVonAuswahlOffen] = useState(false);
  const [nachAuswahlOffen, setNachAuswahlOffen] = useState(false);
  const [traegerAuswahlOffen, setTraegerAuswahlOffen] = useState(false);
  const [anlassAuswahlOffen, setAnlassAuswahlOffen] = useState(false);
  const [vonSuche, setVonSuche] = useState('');
  const [nachSuche, setNachSuche] = useState('');
  const [anlassSuche, setAnlassSuche] = useState('');
  // Freitext-Anlass: bewusst getrennt von der Liste, damit der Unterschied
  // zwischen „einmalig eintippen" und „dauerhaft merken" sichtbar bleibt
  const [freiAnlassAktiv, setFreiAnlassAktiv] = useState(false);
  const [anlassSpeichert, setAnlassSpeichert] = useState(false);
  // Frisch angelegte Anlaesse sofort zeigen, auch vor dem Context-Refresh
  const [neueAnlaesse, setNeueAnlaesse] = useState([]);
  const anlassInputRef = useRef(null);
  // Kilometerfeld: nur sichtbar, wenn keine Distanz bekannt ist oder der
  // Nutzer den Stift antippt (ausdruecklicher Wunsch — wie im Flow)
  const [kmEdit, setKmEdit] = useState(false);

  // Pre-fill form when editData is provided (edit mode)
  useEffect(() => {
    if (editData) {
      setFormData({
        datum: editData.datum ? editData.datum.slice(0, 10) : '',
        vonOrtId: editData.von_ort_id ? String(editData.von_ort_id) : '',
        nachOrtId: editData.nach_ort_id ? String(editData.nach_ort_id) : '',
        einmaligerVonOrt: editData.einmaliger_von_ort || '',
        einmaligerNachOrt: editData.einmaliger_nach_ort || '',
        anlass: editData.anlass || '',
        manuelleKilometer: editData.kilometer ? String(editData.kilometer) : '',
        abrechnung: editData.abrechnung ? String(editData.abrechnung) : ''
      });
      setUseEinmaligenVonOrt(!!editData.einmaliger_von_ort);
      setUseEinmaligenNachOrt(!!editData.einmaliger_nach_ort);
      if (editData.mitfahrer) setMitfahrer(editData.mitfahrer);
    }
  }, [editData]);

  // Die Strecke, mit der die Fahrt geladen wurde. Solange von- und Zielort
  // unveraendert sind, bleiben die gespeicherten Kilometer stehen.
  const ausgangsStrecke = useMemo(
    () => ({
      von: editData?.von_ort_id ? String(editData.von_ort_id) : '',
      nach: editData?.nach_ort_id ? String(editData.nach_ort_id) : '',
    }),
    [editData]
  );

  // Zuletzt gepflegte Distanz der aktuellen Strecke — fuer „Distanz übernehmen"
  const [gepflegteDistanz, setGepflegteDistanz] = useState(null);

  useEffect(() => {
    const unveraendert =
      formData.vonOrtId === ausgangsStrecke.von && formData.nachOrtId === ausgangsStrecke.nach;

    const fetchDistanz = async () => {
      if (formData.vonOrtId && formData.nachOrtId && !useEinmaligenVonOrt && !useEinmaligenNachOrt) {
        try {
          const response = await axios.get(`/api/distanzen/between`, {
            params: {
              vonOrtId: formData.vonOrtId,
              nachOrtId: formData.nachOrtId
            }
          });
          if (response.data.distanz) {
            setGepflegteDistanz(response.data.distanz.toString());
            // Bugfix: Beim Oeffnen einer bestehenden Fahrt duerfen die
            // gespeicherten Kilometer NICHT durch die gepflegte Distanz
            // ersetzt werden. Wer einen Umweg von Hand eingetragen hat,
            // verlor ihn sonst durch blosses Oeffnen und Speichern. Erst
            // wenn Start- oder Zielort tatsaechlich gewechselt haben, zieht
            // die gepflegte Distanz.
            if (!unveraendert) {
              setFormData(prev => ({
                ...prev,
                manuelleKilometer: response.data.distanz.toString()
              }));
              setKmEntsperrt(false);
            }
            setIsKilometerLocked(true);
          } else {
            setGepflegteDistanz(null);
            setIsKilometerLocked(false);
          }
        } catch (error) {
          console.error('Fehler beim Abrufen der Distanz:', error);
          setGepflegteDistanz(null);
          setIsKilometerLocked(false);
        }
      } else {
        setGepflegteDistanz(null);
        setIsKilometerLocked(false);
      }
    };

    fetchDistanz();
  }, [
    formData.vonOrtId,
    formData.nachOrtId,
    useEinmaligenVonOrt,
    useEinmaligenNachOrt,
    ausgangsStrecke,
  ]);

  useEffect(() => {
    setKmFehler(false);
  }, [formData.manuelleKilometer]);

  // Freitext-Anlass fokussieren, sobald „frei eingeben" gewaehlt wurde
  useEffect(() => {
    if (freiAnlassAktiv) anlassInputRef.current?.focus();
  }, [freiAnlassAktiv]);

  // Der Wert im Feld weicht von der gepflegten Distanz ab — typisch fuer eine
  // Fahrt mit Umweg, die von Hand korrigiert wurde. Der Hinweis muss das
  // sagen, sonst behauptet er etwas Falsches.
  const kmWeichtAb =
    isKilometerLocked &&
    gepflegteDistanz !== null &&
    String(formData.manuelleKilometer) !== String(gepflegteDistanz);

  // Ohne bekannte Distanz muss das Feld sichtbar bleiben — sonst gaebe es
  // keinen Weg, die Kilometer ueberhaupt einzutragen.
  const kmFeldSichtbar = !isKilometerLocked || kmEdit;

  // Bugfix Redesign R3: Der frühere Mount-Effect setzte den Abrechnungsträger
  // asynchron auf den Default und überschrieb damit im Edit-Modus den
  // bestehenden Wert der Fahrt. Die Trägerliste kommt aus dem AppContext
  // (refreshAllData) — hier wird kein Default mehr gesetzt.

  // Nur aktive Traeger zur Auswahl — wie im Erfassungsflow. Der aktuell an
  // der Fahrt haengende Traeger bleibt aber drin, auch wenn er inzwischen
  // stillgelegt wurde: Sonst stuende das Feld beim Oeffnen leer da und die
  // Fahrt liesse sich nicht mehr unveraendert speichern.
  const waehlbareTraeger = useMemo(() => {
    const liste = (abrechnungstraeger || []).filter(
      (t) => t.active !== 0 && t.active !== false
    );
    const aktuell = formData.abrechnung;
    if (aktuell && !liste.some((t) => String(t.id) === String(aktuell))) {
      const inaktiv = (abrechnungstraeger || []).find(
        (t) => String(t.id) === String(aktuell)
      );
      if (inaktiv) return [...liste, inaktiv];
    }
    return liste;
  }, [abrechnungstraeger, formData.abrechnung]);

  const gewaehlterTraeger = waehlbareTraeger.find(
    (t) => String(t.id) === String(formData.abrechnung)
  );

  // Ortsliste: Wohnort, dann Dienstort, dann alphabetisch — wie im Flow
  const sortierteOrte = useMemo(() => {
    const rang = (o) => (o.ist_wohnort ? 0 : o.ist_dienstort ? 1 : 2);
    return [...(orte || [])].sort((a, b) => {
      const diff = rang(a) - rang(b);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'de');
    });
  }, [orte]);

  const filterOrte = (suche) => {
    const q = suche.trim().toLowerCase();
    if (!q) return sortierteOrte;
    return sortierteOrte.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.adresse && o.adresse.toLowerCase().includes(q))
    );
  };

  // Suchfeld erst ab genug Eintraegen — bei wenigen stoert es nur
  const ortSucheZeigen = sortierteOrte.length >= 8;

  const vonOrt = orte.find((o) => String(o.id) === String(formData.vonOrtId));
  const nachOrt = orte.find((o) => String(o.id) === String(formData.nachOrtId));
  const vonLabel = useEinmaligenVonOrt
    ? formData.einmaligerVonOrt || 'Adresse eingeben'
    : vonOrt
    ? vonOrt.name
    : 'Startort wählen';
  const nachLabel = useEinmaligenNachOrt
    ? formData.einmaligerNachOrt || 'Adresse eingeben'
    : nachOrt
    ? nachOrt.name
    : 'Zielort wählen';

  // Gespeicherte Anlaesse: haeufig genutzte oben, dann alphabetisch. Frisch
  // angelegte kommen dazu, solange der Context-Refresh noch laeuft.
  // Defensiv: fehlt die Liste, bleibt sie leer und der Freitext traegt.
  const alleAnlaesse = useMemo(() => {
    const nachName = new Map();
    [...(anlaesse || []), ...neueAnlaesse].forEach((a) => {
      const name = (a?.name || '').trim();
      if (!name) return;
      const vorhanden = nachName.get(name.toLowerCase());
      if (!vorhanden || (a.nutzung_anzahl ?? 0) >= (vorhanden.nutzung_anzahl ?? 0)) {
        nachName.set(name.toLowerCase(), { ...a, name });
      }
    });
    // Gleiche Reihenfolge wie im Erfassungsflow: gepflegtes sort_order vor
    // Nutzungshaeufigkeit, sonst zeigten beide Ansichten dieselbe Liste
    // unterschiedlich sortiert.
    return [...nachName.values()].sort((a, b) => {
      const rang = (a.sort_order ?? 0) - (b.sort_order ?? 0);
      if (rang !== 0) return rang;
      const diff = (b.nutzung_anzahl || 0) - (a.nutzung_anzahl || 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'de');
    });
  }, [anlaesse, neueAnlaesse]);

  const anlassSucheClean = anlassSuche.trim();

  const gefilterteAnlaesse = useMemo(() => {
    const q = anlassSucheClean.toLowerCase();
    if (!q) return alleAnlaesse;
    return alleAnlaesse.filter((a) => a.name.toLowerCase().includes(q));
  }, [alleAnlaesse, anlassSucheClean]);

  const anlassSucheZeigen = alleAnlaesse.length >= 8;

  const anlassExistiert = useMemo(
    () => alleAnlaesse.some((a) => a.name.toLowerCase() === anlassSucheClean.toLowerCase()),
    [alleAnlaesse, anlassSucheClean]
  );

  // Neuen Anlass aus der aufgeklappten Liste heraus anlegen: optimistisch
  // auswaehlen und zuklappen, bei Fehler den Eintrag zuruecknehmen.
  const handleAnlassAnlegen = async (name) => {
    const sauber = name.trim();
    if (!sauber || anlassSpeichert || typeof addAnlass !== 'function') return;
    setAnlassSpeichert(true);
    // Siehe ErfassungsFlow: neue Anlaesse haengt das Backend ans Ende, der
    // Platzhalter muss dieselbe Position vorwegnehmen.
    const platzhalter = {
      id: `neu-${Date.now()}`,
      name: sauber,
      nutzung_anzahl: 0,
      sort_order: Number.MAX_SAFE_INTEGER,
    };
    setNeueAnlaesse((prev) => [...prev, platzhalter]);
    setFormData((prev) => ({ ...prev, anlass: sauber }));
    setFreiAnlassAktiv(false);
    setAnlassAuswahlOffen(false);
    setAnlassSuche('');
    try {
      const angelegt = await addAnlass(sauber);
      const echterName = (angelegt?.name || '').trim();
      if (echterName) {
        setFormData((prev) => ({ ...prev, anlass: echterName }));
        setNeueAnlaesse((prev) =>
          prev.map((a) => (a.id === platzhalter.id ? { ...angelegt, name: echterName } : a))
        );
      }
    } catch (error) {
      console.error('Anlass konnte nicht gespeichert werden:', error);
      setNeueAnlaesse((prev) => prev.filter((a) => a.id !== platzhalter.id));
      showNotification(
        'Hinweis',
        'Der Anlass konnte nicht gespeichert werden — er gilt nur für diese Fahrt.'
      );
    } finally {
      setAnlassSpeichert(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if ((useEinmaligenVonOrt || useEinmaligenNachOrt) && !formData.manuelleKilometer) {
      setKmFehler(true);
      // Ohne sichtbares Feld liefe die Fehlermarkierung ins Leere
      setKmEdit(true);
      showNotification(
        'Fehler',
        'Bitte die Kilometer eintragen, wenn ein einmaliger Ort verwendet wird.'
      );
      return;
    }

    if (!formData.manuelleKilometer) {
      setKmFehler(true);
      setKmEdit(true);
      showNotification('Fehler', 'Bitte die Kilometer eintragen.');
      return;
    }

    if (!formData.anlass || !formData.anlass.trim()) {
      showNotification('Fehler', 'Bitte einen Anlass angeben');
      return;
    }

    if (!formData.datum) {
      showNotification('Fehler', 'Bitte ein Datum wählen');
      return;
    }

    if (useEinmaligenVonOrt ? !formData.einmaligerVonOrt.trim() : !formData.vonOrtId) {
      showNotification('Fehler', 'Bitte einen Startort wählen');
      return;
    }

    if (useEinmaligenNachOrt ? !formData.einmaligerNachOrt.trim() : !formData.nachOrtId) {
      showNotification('Fehler', 'Bitte einen Zielort wählen');
      return;
    }

    if (!formData.abrechnung) {
      showNotification("Fehler", "Bitte wählen Sie einen Abrechnungsträger aus");
      return;
    }

    const fahrtData = {
      datum: formData.datum,
      vonOrtId: useEinmaligenVonOrt ? null : parseInt(formData.vonOrtId),
      nachOrtId: useEinmaligenNachOrt ? null : parseInt(formData.nachOrtId),
      einmaligerVonOrt: useEinmaligenVonOrt ? formData.einmaligerVonOrt : null,
      einmaligerNachOrt: useEinmaligenNachOrt ? formData.einmaligerNachOrt : null,
      anlass: formData.anlass,
      kilometer: parseFloat(formData.manuelleKilometer),
      abrechnung: parseInt(formData.abrechnung),
      // Alle Mitfahrer senden. Frueher filterte diese Zeile auf 'hin' und
      // 'hin_rueck' - Mitfahrer mit Richtung 'rueck' wurden damit beim
      // Bearbeiten der Fahrt aus der Datenbank geloescht, samt ihrem
      // Erstattungsanspruch.
      mitfahrer
    };

    // Nur noch Edit-Modus: bestehende Fahrt per PUT aktualisieren
    try {
      await axios.put(`/api/fahrten/${editData.id}`, fahrtData);
      showNotification("Erfolg", "Fahrt wurde aktualisiert.");
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      showNotification("Fehler", "Aenderungen konnten nicht gespeichert werden. Bitte versuche es erneut.");
    }
  };

  const handleAddMitfahrer = (newMitfahrer) => {
    if (editingMitfahrerIndex !== null) {
      const updatedMitfahrer = [...mitfahrer];
      updatedMitfahrer[editingMitfahrerIndex] = newMitfahrer;
      setMitfahrer(updatedMitfahrer);
      setEditingMitfahrerIndex(null);
    } else {
      setMitfahrer([...mitfahrer, newMitfahrer]);
    }
    setShowMitfahrerModal(false);
  };

  const handleEditMitfahrer = (index) => {
    setEditingMitfahrerIndex(index);
    setShowMitfahrerModal(true);
  };

  const handleDeleteMitfahrer = (index) => {
    const updatedMitfahrer = mitfahrer.filter((_, i) => i !== index);
    setMitfahrer(updatedMitfahrer);
  };

  // Eine Ortszeile (Start oder Ziel) — Label klein oben, Wert gross darunter,
  // Klick klappt die Liste inline auf. Freitext-Adresse als Option UNTER der
  // Liste statt als separate Checkbox.
  const renderOrtBlock = ({
    label,
    offen,
    setOffen,
    suche,
    setSuche,
    wertLabel,
    ortId,
    einmaligAktiv,
    setEinmaligAktiv,
    einmaligWert,
    setEinmaligWert,
    setOrtId,
    typ,
  }) => (
    <>
      <button
        type="button"
        className="erf-traeger-zeile"
        onClick={() => setOffen(!offen)}
        aria-expanded={offen}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="erf-feld-label" style={{ display: 'block' }}>
            {label}
          </span>
          <span className="erf-traeger-name" style={{ display: 'block' }}>
            {wertLabel}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>

      {offen && (
        <>
          {ortSucheZeigen && (
            <div className="erf-search">
              <Search size={17} aria-hidden="true" />
              <input
                type="text"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Ort suchen"
                aria-label={`${label} suchen`}
              />
            </div>
          )}

          <div className="erf-ort-liste">
            {filterOrte(suche).map((o) => {
              const gewaehlt = !einmaligAktiv && String(o.id) === String(ortId);
              return (
                <button
                  key={o.id}
                  type="button"
                  className={`erf-ort-row${gewaehlt ? ' is-selected' : ''}`}
                  onClick={() => {
                    setOrtId(String(o.id));
                    setEinmaligAktiv(false);
                    setOffen(false);
                    setSuche('');
                  }}
                >
                  <span className="erf-ort-main">
                    <span className="erf-ort-name">{o.name}</span>
                    {o.adresse && <span className="erf-ort-sub">{o.adresse}</span>}
                  </span>
                </button>
              );
            })}

            {filterOrte(suche).length === 0 && (
              <span className="erf-liste-hinweis">
                Kein passender Ort — unten eine Adresse eingeben.
              </span>
            )}

            {/* Nicht jede Adresse gehoert in die Ortsliste: einmaliger Ort als
                Freitext, frueher eine eigene Checkbox neben dem Label. */}
            <button
              type="button"
              className={`erf-ort-row erf-ort-row-frei${einmaligAktiv ? ' is-selected' : ''}`}
              onClick={() => {
                setEinmaligAktiv(true);
                setOrtId('');
                setOffen(false);
                setSuche('');
              }}
            >
              <MapPin size={16} aria-hidden="true" className="erf-adresse-icon" />
              <span className="erf-ort-main">
                <span className="erf-ort-name">Einmalige Adresse eingeben…</span>
              </span>
            </button>
          </div>
        </>
      )}

      {einmaligAktiv && (
        <div className="relative" style={{ marginBottom: 20 }}>
          <AddressAutocomplete
            value={einmaligWert}
            onChange={setEinmaligWert}
            placeholder="Adresse eingeben"
            className="pr-12"
            required
          />
          <button
            type="button"
            onClick={() => {
              if (einmaligWert) {
                setOrtSpeichernModal({
                  isOpen: true,
                  adresse: einmaligWert,
                  name: '',
                  typ,
                  ortTyp: 'sonstiger',
                });
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-500 hover:text-primary-600"
            title="Als neuen Ort speichern"
          >
            Speichern
          </button>
        </div>
      )}
    </>
  );

  return (
    <div>
    <form onSubmit={handleSubmit} className="fahrtform">
    {/* Kopfzeile wie im Erfassungsflow: Strecke gross, Kilometer daneben.
        Das Eingabefeld erscheint nur, wenn keine Distanz gepflegt ist oder
        der Stift angetippt wurde. */}
    <div className="erf-kopf">
    <div className="erf-kopf-text">
    <div className="erf-route-btn">
    {vonLabel} → {nachLabel}
    </div>
    <div className="erf-betrag num">
    {formData.manuelleKilometer ? `${formData.manuelleKilometer} km` : 'Kilometer eingeben'}
    </div>
    </div>
    {isKilometerLocked && (
      <button
      type="button"
      className="erf-edit-btn"
      onClick={() => setKmEdit((v) => !v)}
      aria-expanded={kmEdit}
      aria-label="Kilometer korrigieren"
      title="Kilometer korrigieren"
      >
      <Pencil size={16} />
      </button>
    )}
    </div>

    <div className="erf-feld">
    <span className="erf-feld-label">Wann</span>
    <DatumsFeld
    datum={formData.datum}
    setDatum={(v) => setFormData(prev => ({ ...prev, datum: v }))}
    />
    </div>

    {/* Orte — aufklappende Liste statt <select> */}
    {renderOrtBlock({
      label: 'Startort',
      offen: vonAuswahlOffen,
      setOffen: setVonAuswahlOffen,
      suche: vonSuche,
      setSuche: setVonSuche,
      wertLabel: vonLabel,
      ortId: formData.vonOrtId,
      einmaligAktiv: useEinmaligenVonOrt,
      setEinmaligAktiv: setUseEinmaligenVonOrt,
      einmaligWert: formData.einmaligerVonOrt,
      setEinmaligWert: (val) => setFormData(prev => ({ ...prev, einmaligerVonOrt: val })),
      setOrtId: (val) => setFormData(prev => ({ ...prev, vonOrtId: val })),
      typ: 'von',
    })}

    {renderOrtBlock({
      label: 'Zielort',
      offen: nachAuswahlOffen,
      setOffen: setNachAuswahlOffen,
      suche: nachSuche,
      setSuche: setNachSuche,
      wertLabel: nachLabel,
      ortId: formData.nachOrtId,
      einmaligAktiv: useEinmaligenNachOrt,
      setEinmaligAktiv: setUseEinmaligenNachOrt,
      einmaligWert: formData.einmaligerNachOrt,
      setEinmaligWert: (val) => setFormData(prev => ({ ...prev, einmaligerNachOrt: val })),
      setOrtId: (val) => setFormData(prev => ({ ...prev, nachOrtId: val })),
      typ: 'nach',
    })}

    {/* Kilometer nur, wenn keine gepflegte Distanz existiert oder der Stift
        angetippt wurde. Das Feld bleibt readOnly mit Umschalter — nicht
        disabled, sonst waere der Wert nicht mehr vorlesbar/kopierbar. */}
    {kmFeldSichtbar && (
      <div className="erf-km-edit">
      <div className="form-label-with-checkbox">
      <label className="form-label" htmlFor="fahrt-km-input">Kilometer</label>
      {/* Statt das Feld stumm zu sperren: Es steht dran, woher der Wert kommt,
          und ein Tipp gibt ihn frei. Eine Fahrt mit Umweg liess sich vorher
          nicht mehr korrigieren. */}
      {isKilometerLocked && (
        <button
        type="button"
        onClick={() => {
          // „Distanz übernehmen": gepflegten Wert wieder eintragen.
          // „Ändern": Feld freigeben, Wert bleibt stehen.
          if ((kmEntsperrt || kmWeichtAb) && gepflegteDistanz) {
            setFormData(prev => ({ ...prev, manuelleKilometer: gepflegteDistanz }));
            setKmEntsperrt(false);
            return;
          }
          setKmEntsperrt(true);
        }}
        className="text-xs text-primary-500 hover:text-primary-600"
        title="Kilometer von Hand korrigieren"
        >
        <Pencil size={12} aria-hidden="true" className="inline-block mr-1" />
        {kmEntsperrt || kmWeichtAb ? 'Distanz übernehmen' : 'Ändern'}
        </button>
      )}
      </div>
      <input
      id="fahrt-km-input"
      type="number"
      name="manuelleKilometer"
      value={formData.manuelleKilometer}
      onChange={handleChange}
      placeholder="km"
      className="form-input"
      readOnly={isKilometerLocked && !kmEntsperrt && !kmWeichtAb}
      aria-invalid={kmFehler ? 'true' : undefined}
      aria-describedby={isKilometerLocked ? 'fahrt-km-hinweis' : undefined}
      step="1"
      />
      {isKilometerLocked && (
        <p id="fahrt-km-hinweis" className="text-xs text-muted mt-1">
        {kmWeichtAb
          ? `Eigener Wert. Gepflegte Distanz: ${gepflegteDistanz} km.`
          : kmEntsperrt
          ? 'Kann jetzt von Hand geändert werden.'
          : 'Aus der gepflegten Distanz. Über „Ändern" von Hand korrigieren.'}
        </p>
      )}
      </div>
    )}

    {/* Anlass wie der Abrechnungsträger: kleine Beschriftung, gewählter Wert
        groß darunter, Auswahl klappt in der Zeile auf. */}
    <button
    type="button"
    className="erf-traeger-zeile"
    onClick={() => setAnlassAuswahlOffen((v) => !v)}
    aria-expanded={anlassAuswahlOffen}
    >
    <span style={{ flex: 1, minWidth: 0 }}>
    <span className="erf-feld-label" style={{ display: 'block' }}>
    Anlass der Fahrt
    </span>
    <span className="erf-traeger-name" style={{ display: 'block' }}>
    {formData.anlass.trim() || 'Wählen'}
    </span>
    {!formData.anlass.trim() && (
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
      {gefilterteAnlaesse.map((a) => (
        <button
        key={a.id}
        type="button"
        className={`erf-ort-row${
          !freiAnlassAktiv && formData.anlass === a.name ? ' is-selected' : ''
        }`}
        onClick={() => {
          setFormData(prev => ({ ...prev, anlass: a.name }));
          setFreiAnlassAktiv(false);
          setAnlassAuswahlOffen(false);
          setAnlassSuche('');
        }}
        >
        <span className="erf-ort-main">
        <span className="erf-ort-name">{a.name}</span>
        </span>
        </button>
      ))}

      {/* Direkt aus der Suche heraus anlegen — spart den Umweg über die
          Stammdaten. Der POST ist idempotent, doppelt geht nicht. */}
      {anlassSucheClean.length > 0 && !anlassExistiert && typeof addAnlass === 'function' && (
        <button
        type="button"
        className="erf-ort-row erf-ort-row-adresse"
        onClick={() => handleAnlassAnlegen(anlassSucheClean)}
        disabled={anlassSpeichert}
        >
        <Plus size={16} aria-hidden="true" className="erf-adresse-icon" />
        <span className="erf-ort-main">
        <span className="erf-ort-name">„{anlassSucheClean}" als neuen Anlass anlegen</span>
        </span>
        </button>
      )}

      {gefilterteAnlaesse.length === 0 && anlassSucheClean.length === 0 && (
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
        if (alleAnlaesse.some((a) => a.name === formData.anlass)) {
          setFormData(prev => ({ ...prev, anlass: '' }));
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
      name="anlass"
      className="form-input erf-anlass-input"
      value={formData.anlass}
      onChange={handleChange}
      placeholder="z.B. Dienstbesprechung, Hausbesuch..."
      aria-label="Anlass frei eingeben"
      />
      {typeof addAnlass === 'function' && (
        <button
        type="button"
        className="erf-merken"
        onClick={() => handleAnlassAnlegen(formData.anlass)}
        disabled={!formData.anlass.trim() || anlassSpeichert}
        >
        <span className="erf-merken-box" aria-hidden="true">
        <Plus size={13} strokeWidth={3} />
        </span>
        <span>Anlass dauerhaft speichern</span>
        </button>
      )}
      </>
    )}

    {/* Der Trägername ist die Information, nicht das Wort „Abrechnungsträger" —
        deshalb Label klein, Name groß und mehrzeilig. */}
    {waehlbareTraeger.length > 0 ? (
      <>
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
      {gewaehlterTraeger ? gewaehlterTraeger.name : 'Wählen'}
      </span>
      {!gewaehlterTraeger && (
        <span className="erf-row-hinweis" style={{ display: 'block' }}>
        Pflichtangabe
        </span>
      )}
      </span>
      <ChevronRight size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
      </button>

      {traegerAuswahlOffen && (
        <div className="erf-ort-liste">
        {waehlbareTraeger.map((t) => {
          const gewaehlt = String(t.id) === String(formData.abrechnung);
          return (
            <button
            key={t.id}
            type="button"
            className={`erf-ort-row${gewaehlt ? ' is-selected' : ''}`}
            onClick={() => {
              setFormData(prev => ({ ...prev, abrechnung: String(t.id) }));
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
      </>
    ) : (
      <div className="text-secondary-600 text-sm">
      Keine Abrechnungsträger verfügbar
      </div>
    )}

    {/* Mitfahrer:innen — eigenes Feld wie Anlass, Kilometer und Abrechnung.
        Frueher stand der Knopf zwischen den Buttons und die Liste UNTER
        „Fahrt speichern", wo sie niemand vermutete. */}
    <div className="form-group">
    <label className="form-label" id="mitfahrer-label">Mitfahrer:innen</label>
    <div className="mitfahrer-feld" role="group" aria-labelledby="mitfahrer-label">
    {mitfahrer.length > 0 && (
      <ul className="mitfahrer-liste">
      {mitfahrer.map((person, index) => (
        <li key={index} className="mitfahrer-eintrag">
        {/* Name antippen bearbeitet den Eintrag */}
        <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          handleEditMitfahrer(index);
        }}
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
        onClick={(e) => {
          e.preventDefault();
          handleDeleteMitfahrer(index);
        }}
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
    onClick={() => setShowMitfahrerModal(true)}
    className="mitfahrer-add"
    >
    <Plus size={16} aria-hidden="true" />
    <span>{mitfahrer.length > 0 ? 'Weitere:n hinzufügen' : 'Mitfahrer:in hinzufügen'}</span>
    </button>
    </div>
    </div>

    {/* Buttons */}
    <div className="fahrtform-buttons flex flex-wrap items-center justify-end gap-4">
    <div className="button-group">
    <div className="button-group-stack">
    {onCancel && (
      <button type="button" onClick={onCancel} className="btn-secondary">
      Abbrechen
      </button>
    )}
    <button type="submit" className="btn-primary">
    Fahrt speichern
    </button>
    </div>
    </div>
    </div>
    </form>

    {/* Modal für Ort speichern */}
    <Sheet
    isOpen={ortSpeichernModal.isOpen}
    onClose={() => setOrtSpeichernModal({...ortSpeichernModal, isOpen: false})}
    title="Ort speichern"
    >
    <div className="set-sheet-form">
    <div>
    <label className="form-label">Adresse</label>
    <input
    type="text"
    value={ortSpeichernModal.adresse}
    readOnly
    className="form-input form-input-readonly"
    />
    </div>
    <div>
    <label className="form-label">Name des Ortes</label>
    <input
    type="text"
    value={ortSpeichernModal.name}
    onChange={(e) => setOrtSpeichernModal({...ortSpeichernModal, name: e.target.value})}
    placeholder="z.B. Rathaus Meldorf"
    className="form-input"
    autoFocus
    />
    <p className="text-xs text-muted mt-1">
    Geben Sie einen aussagekräftigen Namen für diesen Ort ein.
    </p>
    </div>

    {/* Ortstyp-Auswahl hinzufügen */}
    <div>
    <label className="form-label">Art des Ortes</label>
    <select
    value={ortSpeichernModal.ortTyp}
    onChange={(e) => setOrtSpeichernModal({...ortSpeichernModal, ortTyp: e.target.value})}
    className="form-select"
    >
    <option value="sonstiger">Sonstiger Ort</option>
    {/* Wohnort und Dienstort nur anzeigen, wenn noch keiner existiert */}
    {!orte.some(o => o.ist_wohnort) && (
      <option value="wohnort">Wohnort</option>
    )}
    <option value="dienstort">Dienstort</option>
    <option value="kirchspiel">Kirchspiel</option>
    </select>
    <p className="text-xs text-muted mt-1">
    Wohnort und Dienstort können nur einmal festgelegt werden.
    </p>
    </div>

    <div className="set-sheet-buttons">
    <button
    type="button"
    onClick={() => setOrtSpeichernModal({...ortSpeichernModal, isOpen: false})}
    className="btn-secondary"
    >
    Abbrechen
    </button>
    <button
    type="button"
    onClick={async () => {
      if (ortSpeichernModal.name) {
        // Ort mit dem ausgewählten Typ speichern
        const ortDaten = {
          name: ortSpeichernModal.name,
          adresse: ortSpeichernModal.adresse,
          istWohnort: ortSpeichernModal.ortTyp === 'wohnort',
          istDienstort: ortSpeichernModal.ortTyp === 'dienstort',
          istKirchspiel: ortSpeichernModal.ortTyp === 'kirchspiel'
        };

        try {
          // Ort speichern
          await addOrt(ortDaten);
          showNotification("Erfolg", "Ort wurde gespeichert");

          // Direkt über API die aktuelle Ortsliste abrufen
          const response = await axios.get('/api/orte');
          const aktualisierteListe = response.data;

          // Finden des neuen Ortes in der aktualisierten Liste
          const neuerOrt = aktualisierteListe.find(o =>
            o.name === ortSpeichernModal.name &&
            o.adresse === ortSpeichernModal.adresse
          );

          if (neuerOrt) {
            // Automatisch den neuen Ort auswählen und Freitext beenden
            if (ortSpeichernModal.typ === 'von') {
              setUseEinmaligenVonOrt(false);
              setFormData(prev => ({...prev, vonOrtId: neuerOrt.id.toString()}));
            } else {
              setUseEinmaligenNachOrt(false);
              setFormData(prev => ({...prev, nachOrtId: neuerOrt.id.toString()}));
            }

            // Modal schließen
            setOrtSpeichernModal({...ortSpeichernModal, isOpen: false});

            // Alle Daten aktualisieren (damit die Ortslisten aktualisiert werden)
            refreshAllData();
          } else {
            showNotification("Hinweis", "Ort wurde gespeichert, aber nicht automatisch ausgewählt.");
            setOrtSpeichernModal({...ortSpeichernModal, isOpen: false});
            refreshAllData();
          }
        } catch (error) {
          console.error('Fehler beim Speichern des Ortes:', error);
          showNotification("Fehler", "Der Ort konnte nicht gespeichert werden");
        }
      } else {
        showNotification("Fehler", "Bitte geben Sie einen Namen für den Ort ein");
      }
    }}
    className="btn-primary"
    disabled={!ortSpeichernModal.name}
    >
    Speichern
    </button>
    </div>
    </div>
    </Sheet>

    {/* Mitfahrer-Dialog */}
    {showMitfahrerModal && (
      <MitfahrerModal
      isOpen={showMitfahrerModal}
      onClose={() => {
        setShowMitfahrerModal(false);
        setEditingMitfahrerIndex(null);
      }}
      onSave={handleAddMitfahrer}
      initialData={editingMitfahrerIndex !== null ? mitfahrer[editingMitfahrerIndex] : null}
      />
    )}
    </div>
  );
}

export default FahrtForm;
