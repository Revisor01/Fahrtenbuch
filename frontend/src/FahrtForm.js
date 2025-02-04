import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from './App';
import { renderOrteOptions } from './utils';
import MitfahrerModal from './MitfahrerModal';
import axios from 'axios';

function FahrtForm() {
  const { orte, addFahrt, fetchMonthlyData, showNotification } = useContext(AppContext);
  const [mitfahrer, setMitfahrer] = useState([]);
  const [showMitfahrerModal, setShowMitfahrerModal] = useState(false);
  const [editingMitfahrerIndex, setEditingMitfahrerIndex] = useState(null);
  const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
  const [isKilometerLocked, setIsKilometerLocked] = useState(false);
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
        const traeger = response.data.data.sort((a, b) => a.sort_order - b.sort_order);
        setAbrechnungstraeger(traeger);
        // Setze den ersten Abrechnungsträger als Default, falls vorhanden
        if (traeger.length > 0) {
          setFormData(prev => ({...prev, abrechnung: traeger[0].kennzeichen}));
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
      abrechnung: formData.abrechnung,
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
        abrechnung: abrechnungstraeger.length > 0 ? abrechnungstraeger[0].kennzeichen : ''
      });
      setUseEinmaligenVonOrt(false);
      setUseEinmaligenNachOrt(false);
      setAddRueckfahrt(false);
      fetchMonthlyData();
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
              <input
                type="text"
                name="einmaligerVonOrt"
                value={formData.einmaligerVonOrt}
                onChange={handleChange}
                placeholder="Adresse eingeben"
                className="form-input"
                required
              />
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
              <input
                type="text"
                name="einmaligerNachOrt"
                value={formData.einmaligerNachOrt}
                onChange={handleChange}
                placeholder="Adresse eingeben"
                className="form-input"
                required
              />
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
    {isKilometerLocked && (
      <button
      type="button"
      onClick={() => setIsKilometerLocked(false)}
      className="text-xs text-secondary-600 hover:text-secondary-700 mt-1"
      >
      Kilometer manuell eingeben
      </button>
    )}
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
      {abrechnungstraeger.map(traeger => (
        <option key={traeger.id} value={traeger.kennzeichen}>
        {traeger.name}
        </option>
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