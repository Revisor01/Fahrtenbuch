import React, { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { AppContext } from '../contexts/AppContext';
import MitfahrerModal from '../MitfahrerModal';
import Modal from '../Modal';
import FahrtForm from '../FahrtForm';
import { AlertCircle, Circle, CheckCircle2, Pencil, Trash2, RotateCcw, Users, Clock, CreditCard, FileDown, CalendarRange, FileSpreadsheet } from 'lucide-react';

const API_BASE_URL = '/api';

function FahrtenListe() {
  const { fahrten, selectedMonth, setSelectedMonth, fetchFahrten, deleteFahrt, fetchMonthlyData, showNotification, summary, setFahrten, refreshAllData, abrechnungstraeger, setAbrechnungstraeger, abrechnungsStatusModal, handleAbrechnungsStatus, setAbrechnungsStatusModal, selectedVonMonth, setSelectedVonMonth, updateAbrechnungsStatus } = useContext(AppContext);
  const [expandedFahrten, setExpandedFahrten] = useState({});
  const [isMitfahrerModalOpen, setIsMitfahrerModalOpen] = useState(false);
  const [viewingMitfahrer, setViewingMitfahrer] = useState(null);
  const [editingMitfahrer, setEditingMitfahrer] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonthName, setSelectedMonthName] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [editingFahrtId, setEditingFahrtId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'datum', direction: 'descending' });
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

  const handleEditComplete = () => {
    setEditingFahrtId(null);
    refreshAllData();
  };

  const handleEditCancel = () => {
    setEditingFahrtId(null);
  };

  const handleNochmal = async (fahrt) => {
    try {
      await axios.post(`${API_BASE_URL}/fahrten`, {
        vonOrtId: fahrt.von_ort_id || null,
        nachOrtId: fahrt.nach_ort_id || null,
        datum: new Date().toISOString().slice(0, 10),
        anlass: fahrt.anlass,
        abrechnung: fahrt.abrechnung,
        einmaligerVonOrt: fahrt.einmaliger_von_ort || null,
        einmaligerNachOrt: fahrt.einmaliger_nach_ort || null,
        kilometer: fahrt.kilometer
      });
      showNotification('Fahrt erstellt', `Fahrt ${fahrt.von_ort_name || fahrt.einmaliger_von_ort} \u2192 ${fahrt.nach_ort_name || fahrt.einmaliger_nach_ort} wurde f\u00FCr heute eingetragen.`);
      refreshAllData();
    } catch (error) {
      console.error('Fehler beim Duplizieren der Fahrt:', error);
      showNotification('Fehler', 'Fahrt konnte nicht erstellt werden.');
    }
  };

  const handleNochmalAndereRichtung = async (fahrt) => {
    await handleNochmal({
      ...fahrt,
      von_ort_id: fahrt.nach_ort_id,
      nach_ort_id: fahrt.von_ort_id,
      von_ort_name: fahrt.nach_ort_name,
      nach_ort_name: fahrt.von_ort_name,
      einmaliger_von_ort: fahrt.einmaliger_nach_ort,
      einmaliger_nach_ort: fahrt.einmaliger_von_ort
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

  const handleExportBoth = async (type) => {
    try {
      const [bisYear, bisMonth] = selectedMonth.split('-');
      const formattedBisMonth = bisMonth.padStart(2, '0');
      let excelUrl, pdfUrl, baseFilename;

      if (selectedVonMonth && selectedVonMonth !== selectedMonth) {
        const [vonYear, vonMonth] = selectedVonMonth.split('-');
        const formattedVonMonth = vonMonth.padStart(2, '0');
        const vonDate = new Date(parseInt(vonYear), parseInt(vonMonth) - 1);
        const bisDate = new Date(parseInt(bisYear), parseInt(bisMonth) - 1);
        if (bisDate < vonDate) {
          showNotification("Fehler", "Der Bis-Monat muss gleich oder nach dem Von-Monat liegen.");
          return;
        }
        excelUrl = `/api/fahrten/export-range/${type}/${vonYear}/${formattedVonMonth}/${bisYear}/${formattedBisMonth}`;
        pdfUrl = `/api/fahrten/export-pdf-range/${type}/${vonYear}/${formattedVonMonth}/${bisYear}/${formattedBisMonth}`;
        baseFilename = `fahrtenabrechnung_${type}_${vonYear}_${formattedVonMonth}_bis_${bisYear}_${formattedBisMonth}`;
      } else {
        excelUrl = `/api/fahrten/export/${type}/${bisYear}/${formattedBisMonth}`;
        pdfUrl = `/api/fahrten/export-pdf/${type}/${bisYear}/${formattedBisMonth}`;
        baseFilename = `fahrtenabrechnung_${type}_${bisYear}_${formattedBisMonth}`;
      }

      const [excelRes, pdfRes] = await Promise.all([
        axios.get(excelUrl, { responseType: 'blob' }),
        axios.get(pdfUrl, { responseType: 'blob' })
      ]);

      const zip = new JSZip();
      zip.file(`${baseFilename}.xlsx`, excelRes.data);
      zip.file(`${baseFilename}.pdf`, pdfRes.data);
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${baseFilename}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      askMarkAsSubmitted(type);
    } catch (error) {
      console.error('Fehler beim Exportieren:', error);
      showNotification("Fehler", "Export konnte nicht erstellt werden.");
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
      <div className="section-header" style={{marginBottom: 0}}>
        <CreditCard size={18} className="text-emerald-500" />
        <h2>{selectedVonMonth && selectedVonMonth !== selectedMonth ? 'Zeitraum-Übersicht' : 'Monatsübersicht'}</h2>
      </div>
      {(selectedMonth !== currentMonth || selectedVonMonth) && (
        <button onClick={resetToCurrentMonth} className="btn-secondary sm:hidden">
        Aktueller Monat
        </button>
      )}
      </div>

      <div className="w-full sm:w-auto flex flex-col gap-2">
      {(selectedMonth !== currentMonth || selectedVonMonth) && (
        <button onClick={resetToCurrentMonth} className="btn-secondary hidden sm:block self-end">
        Aktueller Monat
        </button>
      )}
      <div className="section-header" style={{marginBottom: 0}}>
        <CalendarRange size={18} className="text-blue-500" />
        <h2>Zeitraum</h2>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
      {/* Von-Dropdown (Monat + Jahr) */}
      <div className="flex items-center gap-1">
      <label className="text-xs text-label shrink-0">Von:</label>
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
      className="form-select min-w-0 flex-1">
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
      className="form-select w-20">
      {[...Array(6)].map((_, i) => {
        const year = 2024 + i;
        return (
          <option key={`von-year-${year}`} value={year}>{year}</option>
        );
      })}
      </select>
      )}
      </div>
      {/* Bis-Dropdown */}
      <div className="flex items-center gap-1">
      <label className="text-xs text-label shrink-0">Bis:</label>
      <select
      value={new Date(`${selectedMonth}-01`).getMonth().toString()}
      onChange={handleBisMonthChange}
      className="form-select min-w-0 flex-1">
      {[...Array(12)].map((_, i) => (
        <option key={i} value={i}>
        {new Date(0, i).toLocaleString("default", { month: "long" })}
        </option>
      ))}
      </select>
      <select
      value={selectedYear}
      onChange={handleBisYearChange}
      className="form-select w-20">
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
      </div>

      {/* Cards Grid */}
      <div className="section-header">
        <CreditCard size={18} className="text-emerald-500" />
        <h2>Erstattungen</h2>
        <span className="section-count">({getKategorienMitErstattung().length})</span>
      </div>
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
      <div className="pt-4 border-t border-card">
      <div className="section-header">
        <FileDown size={18} className="text-purple-500" />
        <h2>Export</h2>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
      {getKategorienMitErstattung().map(([key, displayName]) => (
        <button
        key={key}
        onClick={() => {
          const typeKey = key.toLowerCase();
          showNotification(
            "Export " + displayName,
            "In welchem Format möchten Sie exportieren?",
            () => handleExportToExcel(typeKey),
            true,
            "Excel",
            () => handleExportToPdf(typeKey),
            "PDF",
            () => handleExportBoth(typeKey),
            "Beide"
          );
        }}
        className="btn-primary flex items-center gap-1.5">
        <FileSpreadsheet size={14} />
        Export {displayName}
        </button>
      ))}
      </div>
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



  return (
    <div>
    {renderAbrechnungsStatus(summary)}

    {/* Fahrtenliste als Cards */}
    {sortedFahrten.length === 0 ? (
      <div className="card-container text-center py-12">
        <p className="text-sm font-medium text-value">Keine Fahrten im gewaehlten Zeitraum</p>
        <p className="text-xs text-muted mt-1">Erfasse deine erste Fahrt ueber das Dashboard.</p>
      </div>
    ) : (
      <div className="card-container">
        <div className="section-header">
          <Clock size={18} className="text-orange-500" />
          <h2>Fahrten</h2>
          <span className="section-count">({sortedFahrten.length})</span>
        </div>
        <div className="space-y-2">
          {sortedFahrten.map((fahrt) => {
            const traeger = abrechnungstraeger?.find(at => at.id === parseInt(fahrt.abrechnung));
            const abrechnungstraegerName = traeger ? traeger.name : 'Unbekannt';

            if (editingFahrtId === fahrt.id) {
              return (
                <div key={fahrt.id} className="rounded-card border border-card p-4 animate-tab-content-fade">
                  <FahrtForm
                    editData={fahrt}
                    onUpdate={handleEditComplete}
                    onCancel={handleEditCancel}
                  />
                </div>
              );
            }

            return (
              <div
                key={fahrt.id}
                className="flex items-center justify-between rounded-card border border-card p-3 gap-2 hover:shadow-card-hover transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted text-xs whitespace-nowrap">
                      {new Date(fahrt.datum).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    <span className="text-value font-medium truncate">
                      {fahrt.von_ort_name || fahrt.einmaliger_von_ort} &rarr; {fahrt.nach_ort_name || fahrt.einmaliger_nach_ort}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted">
                    <span>{formatValue(roundKilometers(fahrt.kilometer))} km</span>
                    {fahrt.anlass && <span>&middot; <em>{fahrt.anlass}</em></span>}
                    {abrechnungstraegerName && <span>&middot; {abrechnungstraegerName}</span>}
                    {fahrt.mitfahrer && fahrt.mitfahrer.length > 0 && (
                      <span className="relative group inline-flex items-center gap-1 cursor-help">
                        <span>&middot;</span>
                        <Users size={11} />
                        <span className="underline decoration-dotted underline-offset-2">
                          {fahrt.mitfahrer.length} Mitfahrer:in{fahrt.mitfahrer.length > 1 ? 'nen' : ''}
                        </span>
                        <span className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-10 bg-card shadow-card-hover border border-card rounded-card px-3 py-2 text-xs text-value whitespace-nowrap">
                          {fahrt.mitfahrer.map((m, i) => (
                            <span key={i} className="block">{m.name}{m.arbeitsstaette ? ` (${m.arbeitsstaette})` : ''}</span>
                          ))}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleNochmal(fahrt)}
                    className="btn-primary flex items-center gap-1 text-xs"
                    aria-label="Fahrt kopieren"
                    title="Nochmal fuer heute"
                  >
                    <RotateCcw size={12} />
                    <span className="hidden sm:inline">Nochmal</span>
                  </button>
                  <button
                    onClick={() => handleNochmalAndereRichtung(fahrt)}
                    className="btn-secondary flex items-center gap-1 text-xs"
                    aria-label="Rueckfahrt erstellen"
                    title="Rueckfahrt fuer heute eintragen"
                  >
                    <RotateCcw size={12} className="scale-x-[-1]" />
                    <span className="hidden sm:inline">Rueckfahrt</span>
                  </button>
                  <button
                    onClick={() => setEditingFahrtId(fahrt.id)}
                    className="p-1.5 rounded-card text-muted hover:text-value hover:bg-primary-50 dark:hover:bg-primary-900 transition-colors"
                    aria-label="Fahrt bearbeiten"
                    title="Bearbeiten"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(fahrt.id)}
                    className="p-1.5 rounded-card text-muted hover:text-secondary-500 hover:bg-secondary-50 dark:hover:bg-secondary-900 transition-colors"
                    aria-label="Fahrt loeschen"
                    title="Loeschen"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}

    {/* Modals */}
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
