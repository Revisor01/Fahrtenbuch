import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import { renderOrteOptions } from '../utils';
import MitfahrerModal from '../MitfahrerModal';
import Modal from '../Modal';
import { AlertCircle, Circle, CheckCircle2 } from 'lucide-react';

const API_BASE_URL = '/api';

function FahrtenListe() {
  const { fahrten, selectedMonth, setSelectedMonth, fetchFahrten, deleteFahrt, updateFahrt, orte, fetchMonthlyData, showNotification, summary, setFahrten, refreshAllData, abrechnungstraeger, setAbrechnungstraeger, abrechnungsStatusModal, handleAbrechnungsStatus, setAbrechnungsStatusModal, selectedVonMonth, setSelectedVonMonth, updateAbrechnungsStatus } = useContext(AppContext);
  const [expandedFahrten, setExpandedFahrten] = useState({});
  const [isMitfahrerModalOpen, setIsMitfahrerModalOpen] = useState(false);
  const [viewingMitfahrer, setViewingMitfahrer] = useState(null);
  const [editingMitfahrer, setEditingMitfahrer] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthName, setSelectedMonthName] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [editingFahrt, setEditingFahrt] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'datum', direction: 'descending' });
  const [rückfahrtDialog, setRückfahrtDialog] = useState({
    isOpen: false,
    aktuellefahrt: null,
    ergänzendeFahrt: null,
    updatedData: null,
    istRückfahrt: false
  });
  useEffect(() => {
    fetchFahrten();
  }, [selectedMonth, selectedVonMonth]);

  useEffect(() => {
    if (fahrten.length > 0) {
      setSortConfig({ key: 'datum', direction: 'descending' });
    }
  }, [fahrten]);

  const handleVonMonthChange = (e) => {
    setSelectedVonMonth(e.target.value); // '' or 'YYYY-MM'
  };

  const handleBisMonthChange = (e) => {
    const monthIndex = e.target.value;
    const date = new Date(selectedYear, monthIndex);
    setSelectedMonthName(date.toLocaleString('default', { month: 'long' }));
    setSelectedMonth(`${selectedYear}-${(parseInt(monthIndex) + 1).toString().padStart(2, '0')}`);
  };

  const handleBisYearChange = (e) => {
    const year = e.target.value;
    setSelectedYear(year);
    setSelectedMonth(`${year}-${selectedMonth.split('-')[1]}`);
  };

  const toggleFahrtDetails = (id) => {
    setExpandedFahrten(prev => ({...prev, [id]: !prev[id]}));
  };

  const getDistance = async (vonOrtId, nachOrtId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/distanzen/between`, {
        params: { vonOrtId, nachOrtId }
      });
      return response.data.distanz;
    } catch (error) {
      console.error('Fehler beim Abrufen der Distanz:', error);
      return null;
    }
  };

  const handleDelete = async (id) => {
    showNotification(
      "Fahrt löschen",
      "Sind Sie sicher, dass Sie diese Fahrt löschen möchten?",
      async () => {
        try {
          await deleteFahrt(id);
          fetchFahrten();
          fetchMonthlyData();
          showNotification("Erfolg", "Die Fahrt wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen der Fahrt:', error);
          showNotification("Fehler", "Beim Löschen der Fahrt ist ein Fehler aufgetreten.");
        }
      },
      true // showCancel
    );
  };

  const handleEditChange = async (field, value) => {
    const updatedFahrt = { ...editingFahrt, [field]: value };

    if (field === 'von_ort_id' || field === 'nach_ort_id') {
      const distance = await getDistance(updatedFahrt.von_ort_id, updatedFahrt.nach_ort_id);
      if (distance !== null) {
        updatedFahrt.kilometer = distance;
      }
    }

    setEditingFahrt(updatedFahrt);
  };

  const formatDateForInput = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  const getOrtTyp = (fahrt, isVon) => {
    if (isVon) {
      return fahrt.von_ort_id ? 'gespeichert' : 'einmalig';
    } else {
      return fahrt.nach_ort_id ? 'gespeichert' : 'einmalig';
    }
  };

  const handleEdit = (fahrt) => {
    setEditingFahrt({
      ...fahrt,
      datum: formatDateForInput(fahrt.datum),
      vonOrtTyp: getOrtTyp(fahrt, true),
      nachOrtTyp: getOrtTyp(fahrt, false),
      abrechnung: fahrt.abrechnung,
      kilometer: fahrt.kilometer
    });
  };

  const handleExportToExcel = async (type) => {
    try {
      const [bisYear, bisMonth] = selectedMonth.split('-');
      const formattedBisMonth = bisMonth.padStart(2, '0');

      let response;
      let defaultFilename;

      if (selectedVonMonth && selectedVonMonth !== selectedMonth) {
        // Zeitraum-Export: nutze Range-Route
        const [vonYear, vonMonth] = selectedVonMonth.split('-');
        const formattedVonMonth = vonMonth.padStart(2, '0');

        // Validierung: Bis >= Von
        const vonDate = new Date(parseInt(vonYear), parseInt(vonMonth) - 1);
        const bisDate = new Date(parseInt(bisYear), parseInt(bisMonth) - 1);
        if (bisDate < vonDate) {
          showNotification("Fehler", "Der Bis-Monat muss gleich oder nach dem Von-Monat liegen.");
          return;
        }

        response = await axios.get(
          `/api/fahrten/export-range/${type}/${vonYear}/${formattedVonMonth}/${bisYear}/${formattedBisMonth}`,
          { responseType: 'blob' }
        );
        defaultFilename = `fahrtenabrechnung_${type}_${vonYear}_${formattedVonMonth}_bis_${bisYear}_${formattedBisMonth}`;
      } else {
        // Einzelmonat-Export: nutze alte Route
        response = await axios.get(
          `/api/fahrten/export/${type}/${bisYear}/${formattedBisMonth}`,
          { responseType: 'blob' }
        );
        defaultFilename = `fahrtenabrechnung_${type}_${bisYear}_${formattedBisMonth}`;
      }

      const contentType = response.headers['content-type'];
      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="?(.+)"?/i);
      let filename = filenameMatch ? filenameMatch[1] : defaultFilename;

      if (contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        filename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      } else if (contentType === 'application/zip') {
        filename = filename.endsWith('.zip') ? filename : `${filename}.zip`;
      } else {
        throw new Error('Unerwarteter Dateityp vom Server erhalten');
      }

      const blob = new Blob([response.data], { type: contentType });
      if (blob.size === 22) {
        throw new Error('Die heruntergeladene Datei scheint leer oder fehlerhaft zu sein');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      askMarkAsSubmitted(type);
    } catch (error) {
      console.error('Fehler beim Exportieren nach Excel:', error);
      if (error.response && error.response.status === 404) {
        showNotification("Hinweis", "Keine Daten fuer den ausgewaehlten Zeitraum gefunden.");
      } else {
        showNotification("Fehler", "Export konnte nicht erstellt werden.");
      }
    }
  };

  const handleExportToPdf = async (type) => {
    try {
      const [bisYear, bisMonth] = selectedMonth.split('-');
      const formattedBisMonth = bisMonth.padStart(2, '0');

      let response;
      let defaultFilename;

      if (selectedVonMonth && selectedVonMonth !== selectedMonth) {
        // Zeitraum-Export: nutze Range-Route
        const [vonYear, vonMonth] = selectedVonMonth.split('-');
        const formattedVonMonth = vonMonth.padStart(2, '0');

        // Validierung: Bis >= Von
        const vonDate = new Date(parseInt(vonYear), parseInt(vonMonth) - 1);
        const bisDate = new Date(parseInt(bisYear), parseInt(bisMonth) - 1);
        if (bisDate < vonDate) {
          showNotification("Fehler", "Der Bis-Monat muss gleich oder nach dem Von-Monat liegen.");
          return;
        }

        response = await axios.get(
          `/api/fahrten/export-pdf-range/${type}/${vonYear}/${formattedVonMonth}/${bisYear}/${formattedBisMonth}`,
          { responseType: 'blob' }
        );
        defaultFilename = `fahrtenabrechnung_${type}_${vonYear}_${formattedVonMonth}_bis_${bisYear}_${formattedBisMonth}.pdf`;
      } else {
        // Einzelmonat-Export
        response = await axios.get(
          `/api/fahrten/export-pdf/${type}/${bisYear}/${formattedBisMonth}`,
          { responseType: 'blob' }
        );
        defaultFilename = `fahrtenabrechnung_${type}_${bisYear}_${formattedBisMonth}.pdf`;
      }

      const contentDisposition = response.headers['content-disposition'];
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="?(.+)"?/i);
      let filename = filenameMatch ? filenameMatch[1] : defaultFilename;

      if (!filename.endsWith('.pdf')) {
        filename = `${filename}.pdf`;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (blob.size === 0) {
        throw new Error('Die heruntergeladene Datei scheint leer oder fehlerhaft zu sein');
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      askMarkAsSubmitted(type);
    } catch (error) {
      console.error('Fehler beim Exportieren als PDF:', error);
      if (error.response && error.response.status === 404) {
        showNotification("Hinweis", "Keine Daten fuer den ausgewaehlten Zeitraum gefunden.");
      } else {
        showNotification("Fehler", "PDF-Export konnte nicht erstellt werden.");
      }
    }
  };

  const askMarkAsSubmitted = (type) => {
    const [bisYear, bisMonth] = selectedMonth.split('-');
    const formattedBisMonth = bisMonth.padStart(2, '0');
    showNotification(
      "Export erfolgreich",
      "Soll der Zeitraum als eingereicht markiert werden?",
      async () => {
        if (selectedVonMonth && selectedVonMonth !== selectedMonth) {
          const [vonYear, vonMonth] = selectedVonMonth.split('-');
          let current = new Date(parseInt(vonYear), parseInt(vonMonth) - 1);
          const end = new Date(parseInt(bisYear), parseInt(bisMonth) - 1);
          while (current <= end) {
            const y = current.getFullYear().toString();
            const m = (current.getMonth() + 1).toString().padStart(2, '0');
            await updateAbrechnungsStatus(y, m, type, 'eingereicht', new Date().toISOString().split('T')[0]);
            current.setMonth(current.getMonth() + 1);
          }
        } else {
          await updateAbrechnungsStatus(bisYear, formattedBisMonth, type, 'eingereicht', new Date().toISOString().split('T')[0]);
        }
        await fetchMonthlyData();
        await fetchFahrten();
      },
      true
    );
  };

  const findErgänzendeFahrt = (aktuellefahrt) => {
    // Bestimmen, ob aktuelle Fahrt eine Hinfahrt oder Rückfahrt ist
    const istRückfahrt = aktuellefahrt.anlass?.toLowerCase().includes('rückfahrt');

    // Normalize the date format to YYYY-MM-DD for comparison
    const normalizeDatum = (datum) => {
      if (!datum) return '';
      // Wenn es ein String ist, versuchen wir es zu normalisieren
      if (typeof datum === 'string') {
        // Format YYYY-MM-DD extrahieren
        return datum.split('T')[0];
      }
      // Falls es bereits ein Date-Objekt ist
      if (datum instanceof Date) {
        return datum.toISOString().split('T')[0];
      }
      return datum;
    };

    const aktuellDatum = normalizeDatum(aktuellefahrt.datum);

    // Filtere Fahrten mit normalisiertem Datum
    const fahrtenAmSelbenTag = fahrten.filter(f =>
      normalizeDatum(f.datum) === aktuellDatum &&
      f.id !== aktuellefahrt.id
    );

    if (istRückfahrt) {
      // Aktuelle Fahrt ist Rückfahrt, suche Hinfahrt mit umgekehrten Orten
      const hinfahrt = fahrtenAmSelbenTag.find(f =>
        !f.anlass?.toLowerCase().includes('rückfahrt') &&
        parseInt(f.von_ort_id) === parseInt(aktuellefahrt.nach_ort_id) &&
        parseInt(f.nach_ort_id) === parseInt(aktuellefahrt.von_ort_id)
      );

      if (hinfahrt) return hinfahrt;

      // Fallback: Matching ueber Orts-Namen
      const hinfahrtByName = fahrtenAmSelbenTag.find(f =>
        !f.anlass?.toLowerCase().includes('rückfahrt') &&
        f.von_ort_name?.toLowerCase() === aktuellefahrt.nach_ort_name?.toLowerCase() &&
        f.nach_ort_name?.toLowerCase() === aktuellefahrt.von_ort_name?.toLowerCase()
      );
      if (hinfahrtByName) return hinfahrtByName;
    } else {
      // Aktuelle Fahrt ist Hinfahrt, suche Rückfahrt mit umgekehrten Orten
      const rückfahrt = fahrtenAmSelbenTag.find(f =>
        f.anlass?.toLowerCase().includes('rückfahrt') &&
        parseInt(f.von_ort_id) === parseInt(aktuellefahrt.nach_ort_id) &&
        parseInt(f.nach_ort_id) === parseInt(aktuellefahrt.von_ort_id)
      );

      if (rückfahrt) return rückfahrt;

      // Fallback: Matching ueber Orts-Namen
      const rückfahrtByName = fahrtenAmSelbenTag.find(f =>
        f.anlass?.toLowerCase().includes('rückfahrt') &&
        f.von_ort_name?.toLowerCase() === aktuellefahrt.nach_ort_name?.toLowerCase() &&
        f.nach_ort_name?.toLowerCase() === aktuellefahrt.von_ort_name?.toLowerCase()
      );
      if (rückfahrtByName) return rückfahrtByName;
    }

    return null;
  };

  const handleSave = async () => {
    try {
      // Validierung
      if (!editingFahrt.anlass || !editingFahrt.datum || !editingFahrt.kilometer || !editingFahrt.abrechnung) {
        showNotification("Fehler", "Bitte füllen Sie alle erforderlichen Felder aus.");
        return;
      }

      const kilometer = parseFloat(editingFahrt.kilometer);
      if (isNaN(kilometer) || kilometer <= 0) {
        showNotification("Fehler", "Bitte geben Sie eine gültige Kilometerzahl ein.");
        return;
      }

      const abrechnung = parseInt(editingFahrt.abrechnung);
      if (isNaN(abrechnung)) {
        showNotification("Fehler", "Bitte wählen Sie einen Abrechnungsträger aus.");
        return;
      }

      const updatedFahrt = {
        datum: editingFahrt.datum,
        vonOrtId: editingFahrt.vonOrtTyp === 'gespeichert' ? parseInt(editingFahrt.von_ort_id) : null,
        nachOrtId: editingFahrt.nachOrtTyp === 'gespeichert' ? parseInt(editingFahrt.nach_ort_id) : null,
        einmaligerVonOrt: editingFahrt.vonOrtTyp === 'einmalig' ? editingFahrt.einmaliger_von_ort : null,
        einmaligerNachOrt: editingFahrt.nachOrtTyp === 'einmalig' ? editingFahrt.einmaliger_nach_ort : null,
        anlass: editingFahrt.anlass,
        kilometer: kilometer.toFixed(2),
        abrechnung: parseInt(editingFahrt.abrechnung)
      };

      // Prüfen, ob es eine zugehörige Fahrt gibt (egal ob Hin- oder Rückfahrt)
      const ergänzendeFahrt = findErgänzendeFahrt(editingFahrt);

      if (ergänzendeFahrt) {
        // Dialog mit der erkannten Fahrt anzeigen
        setRückfahrtDialog({
          isOpen: true,
          aktuellefahrt: editingFahrt,
          ergänzendeFahrt: ergänzendeFahrt,
          updatedData: updatedFahrt,  // hier verwenden wir die korrekte Variable
          istRückfahrt: editingFahrt.anlass.toLowerCase().includes('rückfahrt')
        });
        setEditingFahrt(null);
        return; // Die Funktion hier beenden, der Rest erfolgt über den Dialog
      }

      // Normale Verarbeitung, wenn keine ergänzende Fahrt gefunden wurde
      await updateFahrt(editingFahrt.id, updatedFahrt);
      setEditingFahrt(null);
      showNotification("Erfolg", "Die Fahrt wurde erfolgreich aktualisiert.");
      await fetchFahrten();
    } catch (error) {
      showNotification("Fehler", "Beim Aktualisieren der Fahrt ist ein Fehler aufgetreten.");
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  const handleViewMitfahrer = (mitfahrer, event) => {
    event.stopPropagation(); // Verhindert das Bubbling zum Bearbeitungs-Handler
    setViewingMitfahrer(mitfahrer);
  };

  const resetToCurrentMonth = () => {
    const date = new Date();
    setSelectedYear(date.getFullYear().toString());
    setSelectedMonthName(date.toLocaleString('default', { month: 'long' }));
    setSelectedMonth(`${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`);
    setSelectedVonMonth('');
  };

  const getKategorienMitErstattung = () => {
    const kategorien = [];

    // Ist das aktuelle Monats-Summary
    const erstattungen = summary.erstattungen || {};

    // Erst sortierte Abrechnungsträger
    abrechnungstraeger.forEach(traeger => {
      const betrag = erstattungen[traeger.id];
      if (betrag > 0) {
        kategorien.push([
          traeger.id.toString(),
          traeger.name,
          betrag // Hier direkt den Betrag verwenden, nicht data.original/ausstehend
        ]);
      }
    });

    // Dann Mitfahrer am Ende
    const mitfahrerBetrag = erstattungen['mitfahrer'];
    if (mitfahrerBetrag > 0) {
      kategorien.push(['mitfahrer', 'Mitfahrer:innen', mitfahrerBetrag]);
    }

    return kategorien;
  };

  const allCategories = () => {
    // Sammle alle einzigartigen Kategorien
    const categories = new Set([
      ...Object.keys(summary.erstattungen || {}),
      ...Object.keys(summary.mitfahrerErstattungen || {})
    ]);
    return categories.size; // Gibt die tatsächliche Anzahl der Kategorien zurück
  };

  const renderAbrechnungsStatus = (summary) => {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;

    const getAbrechnungTraegerName = (id) => {
      const traeger = abrechnungstraeger?.find(t => t.id === id);
      return traeger ? traeger.name : 'Unbekannt';
    }

    return (
      <div className="card-container-highlight mb-4">
      <div className="space-y-6">
      {/* Header mit Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="w-full flex justify-between items-center">
      <h2 className="text-lg font-medium text-value">
        {selectedVonMonth && selectedVonMonth !== selectedMonth ? 'Zeitraum-Übersicht' : 'Monatsübersicht'}
      </h2>
      {(selectedMonth !== currentMonth || selectedVonMonth) && (
        <button onClick={resetToCurrentMonth} className="btn-secondary sm:hidden">
        Aktueller Monat
        </button>
      )}
      </div>

      <div className="w-full sm:w-auto flex flex-col sm:flex-row items-end gap-3">
      <div className="flex items-center justify-end gap-2 w-full">
      {(selectedMonth !== currentMonth || selectedVonMonth) && (
        <button onClick={resetToCurrentMonth} className="btn-secondary hidden sm:block">
        Aktueller Monat
        </button>
      )}
      {/* Von-Dropdown (Monat + Jahr) */}
      <label className="text-xs text-label">Von:</label>
      <select
      value={selectedVonMonth ? new Date(`${selectedVonMonth}-01`).getMonth().toString() : ''}
      onChange={(e) => {
        if (e.target.value === '') {
          setSelectedVonMonth('');
        } else {
          const vonYear = selectedVonMonth ? selectedVonMonth.split('-')[0] : selectedYear;
          const m = (parseInt(e.target.value) + 1).toString().padStart(2, '0');
          setSelectedVonMonth(`${vonYear}-${m}`);
        }
      }}
      className="form-select w-32">
      <option value="">---</option>
      {[...Array(12)].map((_, i) => (
        <option key={`von-${i}`} value={i}>
        {new Date(0, i).toLocaleString("default", { month: "long" })}
        </option>
      ))}
      </select>
      {selectedVonMonth && (
      <select
      value={selectedVonMonth.split('-')[0]}
      onChange={(e) => {
        const m = selectedVonMonth.split('-')[1];
        setSelectedVonMonth(`${e.target.value}-${m}`);
      }}
      className="form-select w-24">
      {[...Array(6)].map((_, i) => {
        const year = 2024 + i;
        return (
          <option key={`von-year-${year}`} value={year}>{year}</option>
        );
      })}
      </select>
      )}
      {/* Bis-Dropdown */}
      <label className="text-xs text-label">Bis:</label>
      <select
      value={new Date(`${selectedMonth}-01`).getMonth().toString()}
      onChange={handleBisMonthChange}
      className="form-select w-32">
      {[...Array(12)].map((_, i) => (
        <option key={i} value={i}>
        {new Date(0, i).toLocaleString("default", { month: "long" })}
        </option>
      ))}
      </select>
      <select
      value={selectedYear}
      onChange={handleBisYearChange}
      className="form-select w-24">
      {[...Array(6)].map((_, i) => {
        const year = 2024 + i;
        return (
          <option key={year} value={year}>
          {year}
          </option>
        );
      })}
      </select>
      </div>
      </div>
      </div>

      {/* Cards Grid */}
      <div className={`grid grid-cols-1 gap-4 ${
        allCategories() === 1
        ? 'sm:grid-cols-1'
        : allCategories() === 2
        ? 'sm:grid-cols-2'
        : allCategories() === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'
      }`}>
      {getKategorienMitErstattung().map(([key, displayName, value]) => (
        <div key={key} className="card-container">
        <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-label">{displayName}</span>
        <span className={summary.abrechnungsStatus?.[key]?.erhalten_am ? "font-medium text-muted" : "font-medium text-value"}>
        {Number(value).toFixed(2)} €
        </span>
        </div>

        {value > 0 && (
          <div className="text-xs space-y-1">
          <div className="flex items-center justify-between">
          <span className="text-label">Status</span>
          {summary.abrechnungsStatus?.[key]?.erhalten_am ? (
            <span
            className="status-badge-primary cursor-pointer"
            onClick={() => setAbrechnungsStatusModal({
              open: true,
              traegerId: key,
              aktion: 'reset',
              jahr: selectedYear,
              monat: selectedMonth.split('-')[1]
            })}
            >
            <CheckCircle2 size={14} />
            <span>Erhalten am: {new Date(summary.abrechnungsStatus[key].erhalten_am).toLocaleDateString()}</span>
            </span>
          ) : summary.abrechnungsStatus?.[key]?.eingereicht_am ? (
            <span
            className="status-badge-secondary cursor-pointer"
            onClick={() => setAbrechnungsStatusModal({
              open: true,
              traegerId: key,
              aktion: 'erhalten',
              jahr: selectedYear,
              monat: selectedMonth.split('-')[1]
            })}
            >
            <Circle size={14} />
            <span>Eingereicht am: {new Date(summary.abrechnungsStatus[key].eingereicht_am).toLocaleDateString()}</span>
            </span>
          ) : (
            <span
            className="status-badge-secondary cursor-pointer"
            onClick={() => setAbrechnungsStatusModal({
              open: true,
              traegerId: key,
              aktion: 'eingereicht',
              jahr: selectedYear,
              monat: selectedMonth.split('-')[1]
            })}
            >
            <AlertCircle size={14} />
            <span>Nicht eingereicht</span>
            </span>
          )}
          </div>
          </div>
        )}
        </div>
      ))}

      {/* Gesamt Card */}
      <div className="card-container col-span-full">
      <div className="flex justify-between items-center mb-2">
      <span className="text-sm text-label">Gesamt</span>
      <span className="font-medium text-value">
      {Object.entries(summary.erstattungen || {}).reduce((sum, [id, betrag]) => {
        const received = summary.abrechnungsStatus?.[id]?.erhalten_am;
        return sum + (received ? 0 : Number(betrag || 0));
      }, 0).toFixed(2)} €
      </span>
      </div>
      {Object.entries(summary.erstattungen || {}).some(([id, betrag]) =>
        summary.abrechnungsStatus?.[id]?.erhalten_am
      ) && (
        <div className="text-muted text-xs text-right">
        Ursprünglich: {Object.values(summary.erstattungen || {}).reduce((sum, betrag) =>
          sum + Number(betrag || 0), 0
        ).toFixed(2)} €
        </div>
      )}
      </div>
      </div>

      {/* Export */}
      <div className="flex flex-col sm:flex-row justify-end gap-2 mt-6">
      {getKategorienMitErstattung().map(([key, displayName]) => (
        <button
        key={key}
        onClick={() => {
          showNotification(
            "Export " + displayName,
            "In welchem Format möchten Sie exportieren?",
            () => handleExportToExcel(key.toLowerCase()),
            true,
            "Excel",
            () => handleExportToPdf(key.toLowerCase()),
            "PDF"
          );
        }}
        className="btn-primary">
        Export {displayName}
        </button>
      ))}
      </div>
      </div>
      </div>
    );
    };

  const roundKilometers = (value) => {
    const numValue = Number(value ?? 0);
    return numValue % 1 < 0.5 ? Math.floor(numValue) : Math.ceil(numValue);
  };

  const sortedFahrten = React.useMemo(() => {
    let sortableFahrten = [...fahrten];
    if (sortConfig.key !== null) {
      sortableFahrten.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableFahrten;
  }, [fahrten, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const formatValue = (value) => {
    return value == null ? "" : value;
  };

  const handleEditMitfahrer = (fahrtId, mitfahrer) => {
    setEditingMitfahrer({ fahrtId, ...mitfahrer });
  };

  const handleAddMitfahrer = (fahrtId) => {
    const fahrt = fahrten.find(f => f.id === fahrtId);
    const isHinfahrt = !fahrt.anlass.toLowerCase().includes('rückfahrt');
    const suggestedRichtung = isHinfahrt ? 'hin' : 'rueck';
    setEditingMitfahrer({ fahrtId, isNew: true, richtung: suggestedRichtung });
    setIsMitfahrerModalOpen(true);
  };

  const handleDeleteMitfahrer = async (fahrtId, mitfahrerId) => {
    showNotification(
      "Mitfahrer löschen",
      "Sind Sie sicher, dass Sie diesen Mitfahrer löschen möchten?",
      async () => {
        try {
          await axios.delete(`${API_BASE_URL}/fahrten/${fahrtId}/mitfahrer/${mitfahrerId}`);
          fetchFahrten();
          await refreshAllData(); // Hier hinzufügen
          showNotification("Erfolg", "Der Mitfahrer wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen des Mitfahrers:', error);
          showNotification("Fehler", "Beim Löschen des Mitfahrers ist ein Fehler aufgetreten.");
        }
      },
      true // showCancel
    );
  };

  const handleSaveMitfahrer = async (updatedMitfahrer) => {
    try {
      if (!updatedMitfahrer.fahrtId) {
        throw new Error('Fahrt ID ist nicht definiert');
      }
      if (updatedMitfahrer.isNew) {
        await axios.post(`${API_BASE_URL}/fahrten/${updatedMitfahrer.fahrtId}/mitfahrer`, updatedMitfahrer);
      } else {
        if (!updatedMitfahrer.id) {
          throw new Error('Mitfahrer ID ist nicht definiert');
        }
        await axios.put(`${API_BASE_URL}/fahrten/${updatedMitfahrer.fahrtId}/mitfahrer/${updatedMitfahrer.id}`, updatedMitfahrer);
      }
      setEditingMitfahrer(null);
      fetchFahrten();
      await refreshAllData(); // Hier hinzufügen
    } catch (error) {
      console.error('Fehler beim Speichern des Mitfahrers:', error);
      showNotification("Fehler", `Fehler beim Speichern des Mitfahrers: ${error.message}`);
    }
  };

  const renderMitfahrer = (fahrt) => {
    if (!fahrt.mitfahrer || fahrt.mitfahrer.length === 0) {
      return null;
    }

    const isHinfahrt = !fahrt.anlass.toLowerCase().includes('rückfahrt');

    return (
      <div className="flex flex-wrap gap-2">
      {fahrt.mitfahrer.map((person, index) => {
        const shouldDisplay =
        (isHinfahrt && (person.richtung === 'hin' || person.richtung === 'hin_rueck')) ||
        (!isHinfahrt && (person.richtung === 'rueck' || person.richtung === 'hin_rueck'));

        if (!shouldDisplay) return null;

        return (
          <span
          key={index}
          className="status-badge-primary cursor-pointer"
          onClick={() => handleEditMitfahrer(fahrt.id, person)}
          >
          {person.name}
          <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteMitfahrer(fahrt.id, person.id);
          }}
          className="text-secondary-500 hover:text-secondary-600"
          >
          ×
          </button>
          </span>
        );
      })}
      </div>
    );
  };

  const renderFahrtRow = (fahrt, detail = null) => {
    // Finde den Namen des Abrechnungsträgers
    const traeger = abrechnungstraeger?.find(at => at.id === parseInt(fahrt.abrechnung));
    const abrechnungstraegerName = traeger ? traeger.name : 'Unbekannt';

    return (
      <tr key={fahrt.id} className="table-row">
      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <input
        type="date"
        value={editingFahrt.datum}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, datum: e.target.value })}
        className="form-input"
        />
      ) : (
        <span className="text-value">{new Date(fahrt.datum).toLocaleDateString()}</span>
      )}
      </td>

      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <div className="space-y-2">
        <label className="checkbox-label">
        <input
        type="checkbox"
        checked={editingFahrt.vonOrtTyp === 'einmalig'}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          vonOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
          von_ort_id: e.target.checked ? null : editingFahrt.von_ort_id,
          einmaliger_von_ort: e.target.checked ? editingFahrt.einmaliger_von_ort : null
        })}
        className="checkbox-input"
        />
        <span className="text-xs text-label">Einmaliger Von-Ort</span>
        </label>
        {editingFahrt.vonOrtTyp === 'gespeichert' ? (
          <select
          value={editingFahrt.von_ort_id || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, von_ort_id: e.target.value })}
          className="form-select"
          >
          <option value="">Bitte wählen</option>
          {renderOrteOptions(orte)}
          </select>
        ) : (
          <input
          type="text"
          value={editingFahrt.einmaliger_von_ort || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_von_ort: e.target.value })}
          className="form-input"
          placeholder="Von (einmalig)"
          />
        )}
        </div>
      ) : (
        <div className="table-address">
        <div className="table-address-main">
        {fahrt.von_ort_name || fahrt.einmaliger_von_ort || ""}
        </div>
        {fahrt.von_ort_adresse && (
          <div className="table-address-sub">
          {fahrt.von_ort_adresse}
          </div>
        )}
        </div>
      )}
      </td>

      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <div className="space-y-2">
        <label className="checkbox-label">
        <input
        type="checkbox"
        checked={editingFahrt.nachOrtTyp === 'einmalig'}
        onChange={(e) => setEditingFahrt({
          ...editingFahrt,
          nachOrtTyp: e.target.checked ? 'einmalig' : 'gespeichert',
          nach_ort_id: e.target.checked ? null : editingFahrt.nach_ort_id,
          einmaliger_nach_ort: e.target.checked ? editingFahrt.einmaliger_nach_ort : null
        })}
        className="checkbox-input"
        />
        <span className="text-xs text-label">Einmaliger Nach-Ort</span>
        </label>
        {editingFahrt.nachOrtTyp === 'gespeichert' ? (
          <select
          value={editingFahrt.nach_ort_id || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, nach_ort_id: e.target.value })}
          className="form-select"
          >
          <option value="">Bitte wählen</option>
          {renderOrteOptions(orte)}
          </select>
        ) : (
          <input
          type="text"
          value={editingFahrt.einmaliger_nach_ort || ''}
          onChange={(e) => setEditingFahrt({ ...editingFahrt, einmaliger_nach_ort: e.target.value })}
          className="form-input"
          placeholder="Nach (einmalig)"
          />
        )}
        </div>
      ) : (
        <div className="table-address">
        <div className="table-address-main">
        {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || ""}
        </div>
        {fahrt.nach_ort_adresse && (
          <div className="table-address-sub">
          {fahrt.nach_ort_adresse}
          </div>
        )}
        </div>
      )}
      </td>

      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <input
        type="text"
        value={editingFahrt.anlass}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, anlass: e.target.value })}
        className="form-input"
        />
      ) : (
        <span className="text-value">{fahrt.anlass}</span>
      )}
      </td>

      <td className="table-cell text-right">
      {editingFahrt?.id === fahrt.id ? (
        <input
        type="number"
        value={editingFahrt.kilometer}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, kilometer: parseFloat(e.target.value) })}
        className="form-input"
        />
      ) : (
        <span className="text-value">
        {formatValue(roundKilometers(fahrt.kilometer))}
        </span>
      )}
      </td>

      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <select
        value={editingFahrt.abrechnung}
        onChange={(e) => setEditingFahrt({ ...editingFahrt, abrechnung: e.target.value })}
        className="form-select"
        >
        {abrechnungstraeger?.map(traeger => (
          <option key={traeger.id} value={traeger.id}>
          {traeger.name}
          </option>
        ))}
        </select>
      ) : (
        <span className="text-value">
        {abrechnungstraegerName}
        </span>
      )}
      </td>

      <td className="table-cell">
      {editingFahrt?.id === fahrt.id ? (
        <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
        {fahrt.mitfahrer?.map((person, index) => (
          <span key={index} className="status-badge-primary">
          {person.name}
          <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleDeleteMitfahrer(fahrt.id, person.id);
          }}
          className="text-secondary-500 hover:text-secondary-600"
          >
          ×
          </button>
          </span>
        ))}
        </div>
        <button
        onClick={() => handleAddMitfahrer(fahrt.id)}
        className="btn-primary text-xs w-full"
        >
        + Mitfahrer:in
        </button>
        </div>
      ) : (
        renderMitfahrer(fahrt)
      )}
      </td>

      <td className="table-cell">
      <div className="flex gap-2 justify-end">
      {editingFahrt?.id === fahrt.id ? (
        <>
        <button
        onClick={handleSave}
        className="table-action-button-primary"
        title="Speichern"
        >
        ✓
        </button>
        <button
        onClick={() => setEditingFahrt(null)}
        className="table-action-button-secondary"
        title="Abbrechen"
        >
        ×
        </button>
        </>
      ) : (
        <>
        <button
        onClick={() => handleEdit(fahrt)}
        className="table-action-button-primary"
        title="Bearbeiten"
        >
        ✎
        </button>
        <button
        onClick={() => handleDelete(fahrt.id)}
        className="table-action-button-secondary"
        title="Löschen"
        >
        ×
        </button>
        </>
      )}
      </div>
      </td>
      </tr>
    );
  };

  return (
    <div>
    {renderAbrechnungsStatus(summary)}

    {/* Desktop View */}
    <div className="hidden md:block">
    <div className="table-container">
    <table className="w-full">
    <thead>
    <tr className="table-head-row">
    <th className="table-header" onClick={() => requestSort('datum')}>
    <div className="flex items-center gap-1">
    Datum {sortConfig.key === 'datum' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('von_ort_name')}>
    <div className="flex items-center gap-1">
    Von {sortConfig.key === 'von_ort_name' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('nach_ort_name')}>
    <div className="flex items-center gap-1">
    Nach {sortConfig.key === 'nach_ort_name' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('anlass')}>
    <div className="flex items-center gap-1">
    Anlass {sortConfig.key === 'anlass' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header text-right" onClick={() => requestSort('kilometer')}>
    <div className="flex items-center justify-end gap-1">
    km {sortConfig.key === 'kilometer' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header" onClick={() => requestSort('abrechnung')}>
    <div className="flex items-center gap-1">
    Träger {sortConfig.key === 'abrechnung' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </div>
    </th>
    <th className="table-header">Mit*</th>
    <th className="table-header text-right">Aktionen</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50 dark:divide-primary-800">
    {sortedFahrten.map((fahrt) => (
      <React.Fragment key={fahrt.id}>
      {renderFahrtRow(fahrt)}
      </React.Fragment>
    ))}
    </tbody>
    </table>
    </div>
    </div>

    {/* Mobile View */}
    <div className="md:hidden space-y-4">
    {sortedFahrten.map((fahrt) => {
      const traeger = abrechnungstraeger?.find(at => at.id === parseInt(fahrt.abrechnung));
      const abrechnungstraegerName = traeger ? traeger.name : 'Unbekannt';

      return (
        <div key={fahrt.id} className="mobile-card">
        {editingFahrt?.id === fahrt.id ? (
          // Edit Mode
          <div className="space-y-4">
          <div>
          <label className="form-label">Datum</label>
          <input
          type="date"
          value={editingFahrt.datum}
          onChange={(e) => handleEditChange('datum', e.target.value)}
          className="form-input w-full"
          />
          </div>

          {/* Von-Ort */}
          <div>
          <label className="checkbox-label mb-2">
          <input
          type="checkbox"
          checked={editingFahrt.vonOrtTyp === 'einmalig'}
          onChange={(e) => handleEditChange('vonOrtTyp', e.target.checked ? 'einmalig' : 'gespeichert')}
          className="checkbox-input"
          />
          <span className="text-xs text-label">Einmaliger Von-Ort</span>
          </label>
          {editingFahrt.vonOrtTyp === 'einmalig' ? (
            <input
            type="text"
            value={editingFahrt.einmaliger_von_ort || ''}
            onChange={(e) => handleEditChange('einmaliger_von_ort', e.target.value)}
            className="form-input w-full"
            placeholder="Von (einmalig)"
            />
          ) : (
            <select
            value={editingFahrt.von_ort_id || ''}
            onChange={(e) => handleEditChange('von_ort_id', e.target.value)}
            className="form-select w-full"
            >
            <option value="">Bitte wählen</option>
            {renderOrteOptions(orte)}
            </select>
          )}
          </div>

          {/* Nach-Ort */}
          <div>
          <label className="checkbox-label mb-2">
          <input
          type="checkbox"
          checked={editingFahrt.nachOrtTyp === 'einmalig'}
          onChange={(e) => handleEditChange('nachOrtTyp', e.target.checked ? 'einmalig' : 'gespeichert')}
          className="checkbox-input"
          />
          <span className="text-xs text-label">Einmaliger Nach-Ort</span>
          </label>
          {editingFahrt.nachOrtTyp === 'einmalig' ? (
            <input
            type="text"
            value={editingFahrt.einmaliger_nach_ort || ''}
            onChange={(e) => handleEditChange('einmaliger_nach_ort', e.target.value)}
            className="form-input w-full"
            placeholder="Nach (einmalig)"
            />
          ) : (
            <select
            value={editingFahrt.nach_ort_id || ''}
            onChange={(e) => handleEditChange('nach_ort_id', e.target.value)}
            className="form-select w-full"
            >
            <option value="">Bitte wählen</option>
            {renderOrteOptions(orte)}
            </select>
          )}
          </div>

          {/* Anlass */}
          <div>
          <label className="form-label">Anlass</label>
          <input
          type="text"
          value={editingFahrt.anlass}
          onChange={(e) => handleEditChange('anlass', e.target.value)}
          className="form-input w-full"
          />
          </div>

          {/* Kilometer */}
          <div>
          <label className="form-label">Kilometer</label>
          <input
          type="number"
          value={editingFahrt.kilometer}
          onChange={(e) => handleEditChange('kilometer', e.target.value)}
          className="form-input w-full"
          />
          </div>

          {/* Abrechnung */}
          <div>
          <label className="form-label">Abrechnung</label>
          <select
          value={editingFahrt.abrechnung}
          onChange={(e) => handleEditChange('abrechnung', e.target.value)}
          className="form-select w-full"
          >
          {abrechnungstraeger?.map(traeger => (
            <option key={traeger.id} value={traeger.id}>
            {traeger.name}
            </option>
          ))}
          </select>
          </div>

          {/* Mitfahrer */}
          <div>
          <label className="form-label">Mitfahrer:innen</label>
          <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
          {fahrt.mitfahrer?.map((person, index) => (
            <span key={index} className="status-badge-primary">
            {person.name}
            <button
            onClick={(e) => {
              e.preventDefault();
              handleDeleteMitfahrer(fahrt.id, person.id);
            }}
            className="text-secondary-500 hover:text-secondary-600"
            >
            ×
            </button>
            </span>
          ))}
          </div>
          <button
          onClick={() => handleAddMitfahrer(fahrt.id)}
          className="btn-primary text-xs w-full"
          >
          + Mitfahrer:in
          </button>
          </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary flex-1">
          Speichern
          </button>
          <button onClick={() => setEditingFahrt(null)} className="btn-secondary flex-1">
          Abbrechen
          </button>
          </div>
          </div>
        ) : (
          // View Mode
          <div>
          {/* Header */}
          <div className="mobile-card-header mb-4">
          <div>
          <div className="mobile-card-title">
          {new Date(fahrt.datum).toLocaleDateString()}
          </div>
          <div className="mobile-card-subtitle">
          {abrechnungstraegerName}
          </div>
          </div>
          <div className="mobile-action-buttons">
          <button
          onClick={() => handleEdit(fahrt)}
          className="mobile-icon-button-primary"
          >
          ✎
          </button>
          <button
          onClick={() => handleDelete(fahrt.id)}
          className="mobile-icon-button-secondary"
          >
          ×
          </button>
          </div>
          </div>

          <div className="space-y-4">
          {/* Route */}
          <div className="grid grid-cols-1 gap-2">
          <div>
          <div className="mobile-card-label">Von</div>
          <div className="mobile-card-content">
          {fahrt.von_ort_name || fahrt.einmaliger_von_ort || ""}
          </div>
          {fahrt.von_ort_adresse && (
            <div className="mobile-card-label">
            {fahrt.von_ort_adresse}
            </div>
          )}
          </div>
          <div>
          <div className="mobile-card-label">Nach</div>
          <div className="mobile-card-content">
          {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort || ""}
          </div>
          {fahrt.nach_ort_adresse && (
            <div className="mobile-card-label">
            {fahrt.nach_ort_adresse}
            </div>
          )}
          </div>
          </div>

          {/* Anlass & Kilometer */}
          <div className="grid grid-cols-2 gap-4">
          <div>
          <div className="mobile-card-label">Anlass</div>
          <div className="mobile-card-content">{fahrt.anlass}</div>
          </div>
          <div>
          <div className="mobile-card-label">Kilometer</div>
          <div className="mobile-card-content">
          {formatValue(roundKilometers(fahrt.kilometer))} km
          </div>
          </div>
          </div>

          {/* Mitfahrer */}
          {fahrt.mitfahrer?.length > 0 && (
            <div>
            <div className="mobile-card-label mb-1">Mitfahrer:innen</div>
            {renderMitfahrer(fahrt)}
            </div>
          )}
          </div>
          </div>
        )}
        </div>
      );
    })}
    </div>

    {/* Modals */}
    <Modal
    isOpen={rückfahrtDialog.isOpen}
    onClose={() => setRückfahrtDialog({ isOpen: false })}
    title={rückfahrtDialog.istRückfahrt ? "Hinfahrt erkannt" : "Rückfahrt erkannt"}
    >
    <div className="space-y-4">
    <p className="text-sm text-value">
    {rückfahrtDialog.istRückfahrt
      ? "Es wurde eine zugehörige Hinfahrt erkannt."
      : "Es wurde eine zugehörige Rückfahrt erkannt."}
    Möchten Sie die Änderungen auch auf diese Fahrt anwenden?
    </p>

    {/* Details der betroffenen Fahrten und Änderungen anzeigen */}
    {rückfahrtDialog.ergänzendeFahrt && rückfahrtDialog.updatedData && (
      <div className="space-y-4">
      {/* Aktuelle Fahrt - Originaldaten */}
      <div className="bg-primary-25 dark:bg-primary-900/30 p-4 rounded-lg">
      <h4 className="text-sm font-medium text-value mb-2">
      {rückfahrtDialog.istRückfahrt ? "Aktuelle Rückfahrt:" : "Aktuelle Hinfahrt:"}
      </h4>
      <div className="text-xs space-y-1">
      <div className="flex justify-between">
      <span className="text-label">Datum:</span>
      <span className="text-value">{rückfahrtDialog.aktuellefahrt && new Date(rückfahrtDialog.aktuellefahrt.datum).toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Von:</span>
      <span className="text-value">{rückfahrtDialog.aktuellefahrt?.von_ort_name || rückfahrtDialog.aktuellefahrt?.einmaliger_von_ort}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Nach:</span>
      <span className="text-value">{rückfahrtDialog.aktuellefahrt?.nach_ort_name || rückfahrtDialog.aktuellefahrt?.einmaliger_nach_ort}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Kilometer:</span>
      <span className="text-value">{rückfahrtDialog.aktuellefahrt?.kilometer}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Abrechnungsträger:</span>
      <span className="text-value">
      {abrechnungstraeger?.find(t => t.id === parseInt(rückfahrtDialog.aktuellefahrt?.abrechnung))?.name || 'Unbekannt'}
      </span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Anlass:</span>
      <span className="text-value">{rückfahrtDialog.aktuellefahrt?.anlass}</span>
      </div>
      </div>
      </div>

      {/* Erkannte Fahrt */}
      <div className="bg-primary-25 dark:bg-primary-900/30 p-4 rounded-lg">
      <h4 className="text-sm font-medium text-value mb-2">
      {rückfahrtDialog.istRückfahrt ? "Erkannte Hinfahrt:" : "Erkannte Rückfahrt:"}
      </h4>
      <div className="text-xs space-y-1">
      <div className="flex justify-between">
      <span className="text-label">Datum:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt && new Date(rückfahrtDialog.ergänzendeFahrt.datum).toLocaleDateString()}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Von:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.von_ort_name || rückfahrtDialog.ergänzendeFahrt?.einmaliger_von_ort}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Nach:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.nach_ort_name || rückfahrtDialog.ergänzendeFahrt?.einmaliger_nach_ort}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Kilometer:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.kilometer}</span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Abrechnungsträger:</span>
      <span className="text-value">
      {abrechnungstraeger?.find(t => t.id === parseInt(rückfahrtDialog.ergänzendeFahrt?.abrechnung))?.name || 'Unbekannt'}
      </span>
      </div>
      <div className="flex justify-between">
      <span className="text-label">Anlass:</span>
      <span className="text-value">{rückfahrtDialog.ergänzendeFahrt?.anlass}</span>
      </div>
      </div>
      </div>

      {/* Anstehende Änderungen - NUR für die aktuelle Fahrt */}
      <div className="bg-secondary-50 dark:bg-secondary-900/30 p-4 rounded-lg border border-secondary-100 dark:border-secondary-800">
      <h4 className="text-sm font-medium text-value mb-2">Anstehende Änderungen:</h4>
      <div className="space-y-3">
      {/* Änderungen für aktuelle Fahrt - nur wenn sich etwas ändert */}
      <div>
      <h5 className="text-xs font-medium text-value">
      {rückfahrtDialog.istRückfahrt ? "Änderungen Rückfahrt:" : "Änderungen Hinfahrt:"}
      </h5>
      <div className="text-xs space-y-2 pl-2 mt-2">
      {Number(rückfahrtDialog.aktuellefahrt?.kilometer) !== Number(rückfahrtDialog.updatedData.kilometer) && (
        <div className="flex justify-between">
        <span className="text-label">Kilometer:</span>
        <div>
        <span className="text-secondary-600 line-through">{rückfahrtDialog.aktuellefahrt?.kilometer}</span>
        <span className="text-primary-600"> → {rückfahrtDialog.updatedData.kilometer}</span>
        </div>
        </div>
      )}
      {parseInt(rückfahrtDialog.aktuellefahrt?.abrechnung) !== parseInt(rückfahrtDialog.updatedData.abrechnung) && (
        <div className="flex justify-between">
        <span className="text-label">Abrechnungsträger:</span>
        <div>
        <span className="text-secondary-600 line-through">
        {abrechnungstraeger?.find(t => t.id === parseInt(rückfahrtDialog.aktuellefahrt?.abrechnung))?.name || 'Unbekannt'}
        </span>
        <span className="text-primary-600 block"> → {
          abrechnungstraeger?.find(t => t.id === parseInt(rückfahrtDialog.updatedData.abrechnung))?.name || 'Unbekannt'
        }</span>
        </div>
        </div>
      )}
      {rückfahrtDialog.aktuellefahrt?.anlass !== rückfahrtDialog.updatedData.anlass && (
        <div className="flex justify-between">
        <span className="text-label">Anlass:</span>
        <div>
        <span className="text-secondary-600 line-through">{rückfahrtDialog.aktuellefahrt?.anlass}</span>
        <span className="text-primary-600 block"> → {rückfahrtDialog.updatedData.anlass}</span>
        </div>
        </div>
      )}
      </div>
      </div>
      </div>
      </div>
      </div>
    )}

    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="button"
    onClick={() => {
      // Nur aktuelle Fahrt aktualisieren
      if (rückfahrtDialog.aktuellefahrt && rückfahrtDialog.updatedData) {
        updateFahrt(rückfahrtDialog.aktuellefahrt.id, rückfahrtDialog.updatedData)
        .then(() => {
          fetchFahrten();
          showNotification("Erfolg", "Die Fahrt wurde erfolgreich aktualisiert.");
          setRückfahrtDialog({ isOpen: false });
        })
        .catch(error => {
          console.error('Fehler:', error);
          showNotification("Fehler", "Es ist ein Fehler aufgetreten.");
          setRückfahrtDialog({ isOpen: false });
        });
      }
    }}
    className="btn-secondary w-full"
    >
    Nur {rückfahrtDialog.istRückfahrt ? "Rückfahrt" : "Hinfahrt"} aktualisieren
    </button>
    <button
    type="button"
    onClick={async () => {
      try {
        if (!rückfahrtDialog.aktuellefahrt || !rückfahrtDialog.ergänzendeFahrt || !rückfahrtDialog.updatedData) {
          throw new Error("Ungültige Daten");
        }

        // Aktuelle Fahrt aktualisieren
        await updateFahrt(rückfahrtDialog.aktuellefahrt.id, rückfahrtDialog.updatedData);

        // Ergänzende Fahrt anpassen
        const basisAnlass = rückfahrtDialog.updatedData.anlass.replace(/^(rückfahrt\s*)/i, "").trim();

        let ergänzendesFahrtUpdate = {
          ...rückfahrtDialog.updatedData,
          vonOrtId: rückfahrtDialog.updatedData.nachOrtId,
          nachOrtId: rückfahrtDialog.updatedData.vonOrtId,
          einmaligerVonOrt: rückfahrtDialog.updatedData.einmaligerNachOrt,
          einmaligerNachOrt: rückfahrtDialog.updatedData.einmaligerVonOrt
        };

        // Anlass richtig setzen
        if (rückfahrtDialog.istRückfahrt) {
          // Bei Bearbeitung einer Rückfahrt - die Hinfahrt bekommt den Basis-Anlass
          ergänzendesFahrtUpdate.anlass = basisAnlass;
        } else {
          // Bei Bearbeitung einer Hinfahrt - die Rückfahrt bekommt "Rückfahrt" + Basis-Anlass
          ergänzendesFahrtUpdate.anlass = `Rückfahrt ${basisAnlass}`;
        }

        await updateFahrt(rückfahrtDialog.ergänzendeFahrt.id, ergänzendesFahrtUpdate);

        showNotification("Erfolg", "Beide Fahrten wurden erfolgreich aktualisiert.");
        await fetchFahrten();
        setRückfahrtDialog({ isOpen: false });
      } catch (error) {
        console.error('Fehler:', error);
        showNotification("Fehler", "Es ist ein Fehler aufgetreten.");
        setRückfahrtDialog({ isOpen: false });
      }
    }}

    className="btn-primary w-full"
    >
    Beide Fahrten aktualisieren
    </button>
    </div>
    </div>
    </Modal>


    <MitfahrerModal
    isOpen={!!viewingMitfahrer}
    onClose={() => setViewingMitfahrer(null)}
    initialData={viewingMitfahrer}
    readOnly={true}
    />

    <MitfahrerModal
    isOpen={!!editingMitfahrer}
    onClose={() => setEditingMitfahrer(null)}
    onSave={handleSaveMitfahrer}
    initialData={editingMitfahrer}
    readOnly={false}
    />
    </div>
  );
  }

export default FahrtenListe;
