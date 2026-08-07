import { useContext } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import { monateImZeitraum } from './zeitraumUtils';

// Export-Logik der Fahrtenliste (Excel / PDF / Beide als ZIP je Träger).
// Verhalten unverändert aus dem Bestand: Einzelmonat- vs. Zeitraum-Routen,
// Dateiname aus Content-Disposition, danach Erfolgs-Toast mit der Aktion
// „Als eingereicht markieren" (nur für offene Monate, bleibt bis zum Klick).
export function useFahrtenExport() {
  const {
    selectedMonth,
    selectedVonMonth,
    summary,
    updateAbrechnungsStatus,
    fetchMonthlyData,
    fetchFahrten,
  } = useContext(AppContext);
  const toast = useToast();

  const istZeitraum = !!(selectedVonMonth && selectedVonMonth !== selectedMonth);

  const zeitraumGueltig = () => {
    if (!istZeitraum) return true;
    const [vonYear, vonMonth] = selectedVonMonth.split('-');
    const [bisYear, bisMonth] = selectedMonth.split('-');
    const vonDate = new Date(parseInt(vonYear), parseInt(vonMonth) - 1);
    const bisDate = new Date(parseInt(bisYear), parseInt(bisMonth) - 1);
    if (bisDate < vonDate) {
      toast.error('Der Bis-Monat muss gleich oder nach dem Von-Monat liegen.');
      return false;
    }
    return true;
  };

  // URL-Teile: Einzelmonat "jahr/monat", Zeitraum "vonJahr/vonMonat/bisJahr/bisMonat"
  const pfadTeile = () => {
    const [bisYear, bisMonth] = selectedMonth.split('-');
    const bis = `${bisYear}/${bisMonth.padStart(2, '0')}`;
    if (!istZeitraum) {
      return { pfad: bis, dateiname: `${bisYear}_${bisMonth.padStart(2, '0')}` };
    }
    const [vonYear, vonMonth] = selectedVonMonth.split('-');
    const von = `${vonYear}/${vonMonth.padStart(2, '0')}`;
    return {
      pfad: `${von}/${bis}`,
      dateiname: `${vonYear}_${vonMonth.padStart(2, '0')}_bis_${bisYear}_${bisMonth.padStart(2, '0')}`,
    };
  };

  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const dateinameAusHeader = (response, fallback) => {
    const contentDisposition = response.headers['content-disposition'];
    const filenameMatch = contentDisposition && contentDisposition.match(/filename="?(.+)"?/i);
    return filenameMatch ? filenameMatch[1] : fallback;
  };

  const fehlerToast = (error, was) => {
    console.error(`Fehler beim Exportieren (${was}):`, error);
    if (error.response && error.response.status === 404) {
      toast.error('Keine Daten für den gewählten Zeitraum gefunden.');
    } else {
      toast.error('Export konnte nicht erstellt werden.');
    }
  };

  // Erfolgs-Toast mit „Als eingereicht markieren" — im Zeitraum-Modus nur
  // für die offenen Monate des Trägers (bereits eingereichte/erstattete
  // bleiben unangetastet)
  const markAlsEingereichtToast = (type) => {
    const [bisYear, bisMonth] = selectedMonth.split('-');
    const formattedBisMonth = bisMonth.padStart(2, '0');

    let exportedMonths = [];
    if (istZeitraum) {
      const traegerStatus = summary.abrechnungsStatus?.[type] || {};
      exportedMonths = monateImZeitraum(selectedVonMonth, selectedMonth).filter((mk) => {
        const sd = traegerStatus[mk];
        return !sd?.eingereicht_am && !sd?.erhalten_am;
      });
      if (exportedMonths.length === 0) {
        toast.success('Export erstellt.');
        return;
      }
    }

    const monthNames = exportedMonths.map((mk) => {
      const [y, m] = mk.split('-');
      return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('de-DE', { month: 'long' });
    });
    const message = istZeitraum
      ? `Export erstellt (${monthNames.join(', ')}).`
      : 'Export erstellt.';

    toast.success(message, {
      actionLabel: 'Als eingereicht markieren',
      onAction: async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          if (istZeitraum) {
            for (const mk of exportedMonths) {
              const [y, m] = mk.split('-');
              await updateAbrechnungsStatus(y, m, type, 'eingereicht', today, true);
            }
          } else {
            await updateAbrechnungsStatus(bisYear, formattedBisMonth, type, 'eingereicht', today, true);
          }
          await fetchMonthlyData();
          await fetchFahrten();
          toast.success('Als eingereicht markiert.');
        } catch (error) {
          console.error('Fehler beim Markieren als eingereicht:', error);
          toast.error('Status konnte nicht aktualisiert werden.');
        }
      },
    });
  };

  const exportExcel = async (type) => {
    if (!zeitraumGueltig()) return;
    try {
      const { pfad, dateiname } = pfadTeile();
      const route = istZeitraum ? 'export-range' : 'export';
      const response = await axios.get(`/api/fahrten/${route}/${type}/${pfad}`, { responseType: 'blob' });

      const contentType = response.headers['content-type'];
      let filename = dateinameAusHeader(response, `fahrtenabrechnung_${type}_${dateiname}`);
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
      downloadBlob(blob, filename);
      markAlsEingereichtToast(type);
    } catch (error) {
      fehlerToast(error, 'Excel');
    }
  };

  const exportPdf = async (type) => {
    if (!zeitraumGueltig()) return;
    try {
      const { pfad, dateiname } = pfadTeile();
      const route = istZeitraum ? 'export-pdf-range' : 'export-pdf';
      const response = await axios.get(`/api/fahrten/${route}/${type}/${pfad}`, { responseType: 'blob' });

      let filename = dateinameAusHeader(response, `fahrtenabrechnung_${type}_${dateiname}.pdf`);
      if (!filename.endsWith('.pdf')) filename = `${filename}.pdf`;

      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (blob.size === 0) {
        throw new Error('Die heruntergeladene Datei scheint leer oder fehlerhaft zu sein');
      }
      downloadBlob(blob, filename);
      markAlsEingereichtToast(type);
    } catch (error) {
      fehlerToast(error, 'PDF');
    }
  };

  const exportBeides = async (type) => {
    if (!zeitraumGueltig()) return;
    try {
      const { pfad, dateiname } = pfadTeile();
      const excelUrl = `/api/fahrten/${istZeitraum ? 'export-range' : 'export'}/${type}/${pfad}`;
      const pdfUrl = `/api/fahrten/${istZeitraum ? 'export-pdf-range' : 'export-pdf'}/${type}/${pfad}`;
      const baseFilename = `fahrtenabrechnung_${type}_${dateiname}`;

      const [excelRes, pdfRes] = await Promise.all([
        axios.get(excelUrl, { responseType: 'blob' }),
        axios.get(pdfUrl, { responseType: 'blob' }),
      ]);

      const zip = new JSZip();
      zip.file(`${baseFilename}.xlsx`, excelRes.data);
      zip.file(`${baseFilename}.pdf`, pdfRes.data);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(zipBlob, `${baseFilename}.zip`);
      markAlsEingereichtToast(type);
    } catch (error) {
      fehlerToast(error, 'ZIP');
    }
  };

  return { exportExcel, exportPdf, exportBeides };
}
