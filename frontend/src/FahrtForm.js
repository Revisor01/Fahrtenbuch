import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Plus, X, Pencil } from 'lucide-react';
import { AppContext } from './contexts/AppContext';
import { renderOrteOptions } from './utils';
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

// Bearbeiten einer bestehenden Fahrt (Edit-Modal). Das Anlegen neuer Fahrten
// läuft seit dem Redesign 2026 ausschließlich über den zweistufigen
// Erfassungsflow (components/erfassung/ErfassungsFlow.js, useErfassung()).
function FahrtForm({ editData, onUpdate, onCancel }) {
  const { orte, showNotification, abrechnungstraeger, addOrt, refreshAllData } = useContext(AppContext);
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

  // Der Wert im Feld weicht von der gepflegten Distanz ab — typisch fuer eine
  // Fahrt mit Umweg, die von Hand korrigiert wurde. Der Hinweis muss das
  // sagen, sonst behauptet er etwas Falsches.
  const kmWeichtAb =
    isKilometerLocked &&
    gepflegteDistanz !== null &&
    String(formData.manuelleKilometer) !== String(gepflegteDistanz);

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
      showNotification(
        'Fehler',
        'Bitte die Kilometer eintragen, wenn ein einmaliger Ort verwendet wird.'
      );
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
  
  return (
    <div>
    <form onSubmit={handleSubmit} className="space-y-6">
    {/* Basis-Informationen */}
    <div className="form-row">
    <div className="form-group-fixed">
    <label className="form-label">Datum</label>
    <input
    type="date"
    name="datum"
    value={formData.datum}
    onChange={handleChange}
    className="form-input"
    required
    />
    </div>
    
    <div className="form-group">
    <label className="form-label">Anlass der Fahrt</label>
    <input
    type="text"
    name="anlass"
    value={formData.anlass}
    onChange={handleChange}
    placeholder="z.B. Dienstbesprechung, Hausbesuch..."
    className="form-input"
    required
    />
    </div>
    </div>
    
    {/* Orte und Kilometer */}
    <div className="form-row">
    <div className="form-group">
    <div className="form-label-with-checkbox">
    <label className="form-label">Startort</label>
    <label className="checkbox-label">
    <input
    type="checkbox"
    checked={useEinmaligenVonOrt}
    onChange={(e) => setUseEinmaligenVonOrt(e.target.checked)}
    className="checkbox-input"
    />
    <span className="text-xs text-label">Einmaliger Ort</span>
    </label>
    </div>
    {useEinmaligenVonOrt ? (
      <div className="relative">
      <AddressAutocomplete
      value={formData.einmaligerVonOrt}
      onChange={(val) => setFormData(prev => ({ ...prev, einmaligerVonOrt: val }))}
      placeholder="Adresse eingeben"
      className="pr-12"
      required
      />
      <button
      type="button"
      onClick={() => {
        if (formData.einmaligerVonOrt) {
          setOrtSpeichernModal({
            isOpen: true,
            adresse: formData.einmaligerVonOrt,
            name: '',
            typ: 'von'
          });
        }
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-500 hover:text-primary-600"
      title="Als neuen Ort speichern"
      >
      Speichern
      </button>
      </div>
    ) : (
      <select
      name="vonOrtId"
      value={formData.vonOrtId}
      onChange={handleChange}
      className="form-select"
      required
      >
      <option value="">Ort auswählen</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    <div className="form-group">
    <div className="form-label-with-checkbox">
    <label className="form-label">Zielort</label>
    <label className="checkbox-label">
    <input
    type="checkbox"
    checked={useEinmaligenNachOrt}
    onChange={(e) => setUseEinmaligenNachOrt(e.target.checked)}
    className="checkbox-input"
    />
    <span className="text-xs text-label">Einmaliger Ort</span>
    </label>
    </div>
    {useEinmaligenNachOrt ? (
      <div className="relative">
      <AddressAutocomplete
      value={formData.einmaligerNachOrt}
      onChange={(val) => setFormData(prev => ({ ...prev, einmaligerNachOrt: val }))}
      placeholder="Adresse eingeben"
      className="pr-12"
      required
      />
      <button
      type="button"
      onClick={() => {
        if (formData.einmaligerNachOrt) {
          setOrtSpeichernModal({
            isOpen: true,
            adresse: formData.einmaligerNachOrt,
            name: '',
            typ: 'nach'
          });
        }
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-500 hover:text-primary-600"
      title="Als neuen Ort speichern"
      >
      Speichern
      </button>
      </div>
    ) : (
      <select
      name="nachOrtId"
      value={formData.nachOrtId}
      onChange={handleChange}
      className="form-select"
      required
      >
      <option value="">Ort auswählen</option>
      {renderOrteOptions(orte)}
      </select>
    )}
    </div>
    
    </div>

    {/* Kilometer und Abrechnung */}
    <div className="form-row">
    <div className="form-group-fixed">
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
    required
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
    
    <div className="form-group">
    <label className="form-label">Abrechnungsträger</label>
    {waehlbareTraeger.length > 0 ? (
      <select
      name="abrechnung"
      value={formData.abrechnung}
      onChange={handleChange}
      className="form-select"
      required
      >
      <option value="">Bitte wählen</option>
      {waehlbareTraeger.map(traeger => (
        <option key={traeger.id} value={traeger.id}>{traeger.name}</option>
      ))}
      </select>
    ) : (
      <div className="text-secondary-600 text-sm">
      Keine Abrechnungsträger verfügbar
      </div>
    )}
    </div>
    </div>
    
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
    <div className="flex flex-wrap items-center justify-end gap-4">
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
            // Automatisch den neuen Ort auswählen und Checkbox deaktivieren
            if (ortSpeichernModal.typ === 'von') {
              setUseEinmaligenVonOrt(false);
              setFormData(prev => ({...prev, vonOrtId: neuerOrt.id.toString()}));
            } else {
              setUseEinmaligenNachOrt(false);
              setFormData(prev => ({...prev, nachOrtId: neuerOrt.id.toString()}));
            }
            
            // Modal schließen
            setOrtSpeichernModal({...ortSpeichernModal, isOpen: false});
            
            // Alle Daten aktualisieren (damit die Dropdown-Listen aktualisiert werden)
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