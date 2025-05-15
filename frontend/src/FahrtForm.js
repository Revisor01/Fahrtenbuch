import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './App';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import axios from 'axios';
import Modal from './Modal';

function FahrtForm() {
  const { orte, addFahrt, fetchMonthlyData, showNotification, setFahrten, fahrten, abrechnungstraeger, setAbrechnungstraeger, addOrt, fetchOrte, refreshAllData } = useContext(AppContext);
  const [mitfahrer, setMitfahrer] = useState([]);
  const [showMitfahrerModal, setShowMitfahrerModal] = useState(false);
  const [editingMitfahrerIndex, setEditingMitfahrerIndex] = useState(null);
  const [isKilometerLocked, setIsKilometerLocked] = useState(false);
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
  const [addRueckfahrt, setAddRueckfahrt] = useState(false);
  const [useEinmaligenVonOrt, setUseEinmaligenVonOrt] = useState(false);
  const [useEinmaligenNachOrt, setUseEinmaligenNachOrt] = useState(false);

  useEffect(() => {
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
            setFormData(prev => ({ 
              ...prev, 
              manuelleKilometer: response.data.distanz.toString() 
            }));
            setIsKilometerLocked(true);
          } else {
            setIsKilometerLocked(false);
          }
        } catch (error) {
          console.error('Fehler beim Abrufen der Distanz:', error);
          setIsKilometerLocked(false);
        }
      } else {
        setIsKilometerLocked(false);
      }
    };
    fetchDistanz();
  }, [formData.vonOrtId, formData.nachOrtId, useEinmaligenVonOrt, useEinmaligenNachOrt]);

  useEffect(() => {
    const fetchAbrechnungstraeger = async () => {
      try {
        const response = await axios.get('/api/abrechnungstraeger/simple');
        setAbrechnungstraeger(response.data.data.sort((a, b) => a.sort_order - b.sort_order));
        // Setze den ersten Abrechnungsträger als Default, falls vorhanden
        if (response.data.data.length > 0) {
          setFormData(prev => ({...prev, abrechnung: response.data.data[0].id}));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Abrechnungsträger:', error);
        showNotification('Fehler', 'Abrechnungsträger konnten nicht geladen werden');
      }
    };
    fetchAbrechnungstraeger();
  }, []);
  
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
      alert('Bitte geben Sie die Kilometer manuell ein, wenn Sie einen einmaligen Ort verwenden.');
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
      mitfahrer: mitfahrer.filter(m => m.richtung === 'hin' || m.richtung === 'hin_rueck')
    };
    
    try {
      await addFahrt(fahrtData);
      
      if (addRueckfahrt) {
        const rueckfahrtData = {
          ...fahrtData,
          vonOrtId: fahrtData.nachOrtId,
          nachOrtId: fahrtData.vonOrtId,
          einmaligerVonOrt: fahrtData.einmaligerNachOrt,
          einmaligerNachOrt: fahrtData.einmaligerVonOrt,
          anlass: `Rückfahrt: ${fahrtData.anlass}`,
          mitfahrer: mitfahrer.filter(m => m.richtung === 'rueck' || m.richtung === 'hin_rueck')
        };
        await addFahrt(rueckfahrtData);
      }
      
      // Reset form data and states
      setFormData({
        datum: '',
        vonOrtId: '',
        nachOrtId: '',
        einmaligerVonOrt: '',
        einmaligerNachOrt: '',
        anlass: '',
        manuelleKilometer: '',
        abrechnung: abrechnungstraeger.length > 0 ? abrechnungstraeger[0].id : ''
      });
      setUseEinmaligenVonOrt(false);
      setUseEinmaligenNachOrt(false);
      setAddRueckfahrt(false);
      setMitfahrer([]);
      showNotification("Erfolg", "Die neue Fahrt wurde erfolgreich hinzugefügt.");
    } catch (error) {
      console.error('Fehler beim Hinzufügen der Fahrt:', error);
      showNotification("Fehler", "Beim Hinzufügen der Fahrt ist ein Fehler aufgetreten.");
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
    <div className="card-container-highlight">
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
    <label className="text-xs text-label">Startort</label>
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
      <input
      type="text"
      name="einmaligerVonOrt"
      value={formData.einmaligerVonOrt}
      onChange={handleChange}
      placeholder="Adresse eingeben"
      className="form-input pr-12"
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
    <label className="text-xs text-label">Zielort</label>
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
      <input
      type="text"
      name="einmaligerNachOrt"
      value={formData.einmaligerNachOrt}
      onChange={handleChange}
      placeholder="Adresse eingeben"
      className="form-input pr-12"
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
    
    {/* Kilometer und Abrechnung */}
    <div className="form-row">
    <div className="form-group-fixed">
    <label className="form-label">Kilometer</label>
    <input
    type="number"
    name="manuelleKilometer"
    value={formData.manuelleKilometer}
    onChange={handleChange}
    placeholder="km"
    className="form-input"
    required
    disabled={isKilometerLocked}
    step="1"
    />
    </div>
    
    <div className="form-group">
    <label className="form-label">Abrechnung</label>
    {abrechnungstraeger.length > 0 ? (
      <select
      name="abrechnung"
      value={formData.abrechnung}
      onChange={handleChange}
      className="form-select"
      required
      >
      <option value="">Bitte wählen</option>
      {abrechnungstraeger.map(traeger => (
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
    </div>
    
    {/* Checkboxen und Buttons */}
    <div className="flex flex-wrap items-center gap-4">
    <label className="checkbox-label">
    <input
    type="checkbox"
    checked={addRueckfahrt}
    onChange={(e) => setAddRueckfahrt(e.target.checked)}
    className="checkbox-input"
    />
    <span className="text-xs text-label">Rückfahrt anlegen</span>
    </label>
    
    <div className="button-group">
    <div className="button-group-stack">
    <button
    type="button"
    onClick={() => setShowMitfahrerModal(true)}
    className="btn-secondary"
    >
    Mitfahrer:in
    </button>
    <button type="submit" className="btn-primary">
    Speichern
    </button>
    </div>
    </div>
    </div>
    
    {/* Mitfahrer Liste */}
    {mitfahrer.length > 0 && (
      <div className="flex flex-wrap gap-2">
      {mitfahrer.map((person, index) => (
        <span key={index} className="status-badge-primary">
        {person.name}
        <button
        onClick={(e) => {
          e.preventDefault();
          handleDeleteMitfahrer(index);
        }}
        className="text-secondary-500 hover:text-secondary-600"
        >
        ×
        </button>
        </span>
      ))}
      </div>
    )}
    </form>
    
    {/* Modal für Ort speichern */}
    <Modal
    isOpen={ortSpeichernModal.isOpen}
    onClose={() => setOrtSpeichernModal({...ortSpeichernModal, isOpen: false})}
    title="Ort speichern"
    >
    <div className="space-y-4">
    <div>
    <label className="form-label">Adresse</label>
    <input
    type="text"
    value={ortSpeichernModal.adresse}
    readOnly
    className="form-input bg-primary-25 dark:bg-primary-900/50"
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
    
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => setOrtSpeichernModal({...ortSpeichernModal, isOpen: false})}
    className="btn-secondary w-full"
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
    className="btn-primary w-full"
    disabled={!ortSpeichernModal.name}
    >
    Speichern
    </button>
    </div>
    </div>
    </Modal>
    
    {/* Mitfahrer Modal */}
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