import { useContext } from 'react';
import axios from 'axios';
import { heuteISO } from '../../utils/datum';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import { monateImZeitraum } from './zeitraumUtils';
import { IST_NATIVE } from '../../utils/plattform';
import logFehler from '../../utils/logFehler';

// Filesystem erwartet Base64 ohne data:-Kopf.
function blobZuBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Datei konnte nicht gelesen werden'));
    reader.onload = () => {
      const ergebnis = String(reader.result);
      resolve(ergebnis.slice(ergebnis.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

// Den Abbruch melden die Plattformen unterschiedlich, daher der Textvergleich.
function istAbbruch(error) {
  const text = String(error?.message || error || '').toLowerCase();
  return text.includes('canceled') || text.includes('cancelled') || text.includes('abort');
}

// Export der Fahrtenliste; Optionen { von, bis } und { erfolg: 'aktion' | 'einfach' | 'keiner' }, Rückgabe true oder false.
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

  // Einzelmonat "jahr/monat", Zeitraum "vonJahr/vonMonat/bisJahr/bisMonat".
  const pfadTeile = (opts = {}) => {
    const von = opts.von && opts.bis ? opts.von : (istZeitraum ? selectedVonMonth : selectedMonth);
    const bis = opts.von && opts.bis ? opts.bis : selectedMonth;
    const range = von !== bis;
    const [bisYear, bisMonth] = bis.split('-');
    const bisPfad = `${bisYear}/${bisMonth.padStart(2, '0')}`;
    if (!range) {
      return { range, pfad: bisPfad, dateiname: `${bisYear}_${bisMonth.padStart(2, '0')}` };
    }
    const [vonYear, vonMonth] = von.split('-');
    return {
      range,
      pfad: `${vonYear}/${vonMonth.padStart(2, '0')}/${bisPfad}`,
      dateiname: `${vonYear}_${vonMonth.padStart(2, '0')}_bis_${bisYear}_${bisMonth.padStart(2, '0')}`,
    };
  };

  // Zeitraum-Overrides bekommen nie den Einreichen-Toast.
  const erfolgsToast = (type, opts = {}) => {
    if (opts.erfolg === 'keiner') return;
    if (opts.erfolg === 'einfach' || (opts.von && opts.bis)) {
      toast.success('Export erstellt.');
      return;
    }
    markAlsEingereichtToast(type);
  };

  // Im Web <a download>, in der App über Cache und Teilen-Blatt, weil WKWebView den Klick ignoriert.
  const downloadBlob = async (blob, filename) => {
    if (!IST_NATIVE) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      return;
    }

    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');

    const base64 = await blobZuBase64(blob);
    await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });

    try {
      await Share.share({ title: filename, files: [uri] });
    } catch (error) {
      // Abbruch ist kein fehlgeschlagener Export.
      if (istAbbruch(error)) return;
      throw error;
    }
  };

  // Auf appStateChange warten, bis das Blatt oben liegt, sonst blitzt die nackte Liste auf; kurze Zeitgrenze.
  const wartenBisVerdeckt = async () => {
    if (!IST_NATIVE) return;
    const { App } = await import('@capacitor/app');

    // Listener per await holen, `.then` auf dem Proxy löst nie auf.
    let melden = null;
    const warten = new Promise((fertig) => {
      melden = fertig;
    });

    let handle = null;
    try {
      handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) melden();
      });
    } catch (error) {
      return; // Ohne Listener nicht warten — der Export ist fertig.
    }

    try {
      // Etwa nach Abbruch bleibt die App im Vordergrund.
      await Promise.race([warten, new Promise((f) => setTimeout(f, 600))]);
    } finally {
      try {
        handle.remove();
      } catch (error) {
        /* schon weg */
      }
    }
  };

  const dateinameAusHeader = (response, fallback) => {
    const contentDisposition = response.headers['content-disposition'];
    const filenameMatch = contentDisposition && contentDisposition.match(/filename="?(.+)"?/i);
    return filenameMatch ? filenameMatch[1] : fallback;
  };

  const fehlerToast = (error, was) => {
    logFehler(`Fehler beim Exportieren (${was}):`, error);
    if (error.response && error.response.status === 404) {
      toast.error('Keine Daten für den gewählten Zeitraum gefunden.');
    } else {
      toast.error('Export konnte nicht erstellt werden.');
    }
  };

  // Im Zeitraum nur für die offenen Monate.
  const markAlsEingereichtToast = (type) => {
    const [bisYear, bisMonth] = selectedMonth.split('-');
    const formattedBisMonth = bisMonth.padStart(2, '0');

    let exportedMonths = [];
    if (istZeitraum) {
      const traegerStatus = summary.abrechnungsStatus?.[type] || {};
      const betraegeProMonat = summary.erstattungenProMonat?.[type] || {};
      exportedMonths = monateImZeitraum(selectedVonMonth, selectedMonth).filter((mk) => {
        // Monate ohne Fahrten überspringen, sonst stünden sie dauerhaft auf „eingereicht“.
        if (!(betraegeProMonat[mk] > 0)) return false;
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
          const today = heuteISO();
          // refresh=false in der Schleife, aktualisiert wird einmal danach.
          if (istZeitraum) {
            for (const mk of exportedMonths) {
              const [y, m] = mk.split('-');
              await updateAbrechnungsStatus(y, m, type, 'eingereicht', today, true, false);
            }
          } else {
            await updateAbrechnungsStatus(bisYear, formattedBisMonth, type, 'eingereicht', today, true, false);
          }
          await fetchMonthlyData();
          await fetchFahrten();
          toast.success('Als eingereicht markiert.');
        } catch (error) {
          logFehler('Fehler beim Markieren als eingereicht:', error);
          toast.error('Status konnte nicht aktualisiert werden.');
        }
      },
    });
  };

  const exportExcel = async (type, opts = {}) => {
    if (!opts.von && !zeitraumGueltig()) return false;
    try {
      const { range, pfad, dateiname } = pfadTeile(opts);
      const route = range ? 'export-range' : 'export';
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
      await downloadBlob(blob, filename);
      await wartenBisVerdeckt();
      erfolgsToast(type, opts);
      return true;
    } catch (error) {
      fehlerToast(error, 'Excel');
      return false;
    }
  };

  const exportPdf = async (type, opts = {}) => {
    if (!opts.von && !zeitraumGueltig()) return false;
    try {
      const { range, pfad, dateiname } = pfadTeile(opts);
      const route = range ? 'export-pdf-range' : 'export-pdf';
      const response = await axios.get(`/api/fahrten/${route}/${type}/${pfad}`, { responseType: 'blob' });

      // Immer eine Datei.
      let filename = dateinameAusHeader(response, `fahrtenabrechnung_${type}_${dateiname}.pdf`);
      if (!filename.endsWith('.pdf')) filename = `${filename}.pdf`;

      const blob = new Blob([response.data], { type: 'application/pdf' });
      if (blob.size === 0) {
        throw new Error('Die heruntergeladene Datei scheint leer oder fehlerhaft zu sein');
      }
      await downloadBlob(blob, filename);
      await wartenBisVerdeckt();
      erfolgsToast(type, opts);
      return true;
    } catch (error) {
      fehlerToast(error, 'PDF');
      return false;
    }
  };

  const exportBeides = async (type, opts = {}) => {
    if (!opts.von && !zeitraumGueltig()) return false;
    try {
      const { range, pfad, dateiname } = pfadTeile(opts);
      const excelUrl = `/api/fahrten/${range ? 'export-range' : 'export'}/${type}/${pfad}`;
      const pdfUrl = `/api/fahrten/${range ? 'export-pdf-range' : 'export-pdf'}/${type}/${pfad}`;
      const baseFilename = `fahrtenabrechnung_${type}_${dateiname}`;

      const [excelRes, pdfRes] = await Promise.all([
        axios.get(excelUrl, { responseType: 'blob' }),
        axios.get(pdfUrl, { responseType: 'blob' }),
      ]);

      // JSZip erst hier laden, nicht im Startbündel.
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      // Bei mehreren Blättern ist die Excel-Antwort schon ein ZIP, dann wandert die Endung mit.
      const istZip = excelRes.headers['content-type'] === 'application/zip';
      zip.file(`${baseFilename}.${istZip ? 'zip' : 'xlsx'}`, excelRes.data);
      zip.file(`${baseFilename}.pdf`, pdfRes.data);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadBlob(zipBlob, `${baseFilename}.zip`);
      await wartenBisVerdeckt();
      erfolgsToast(type, opts);
      return true;
    } catch (error) {
      fehlerToast(error, 'ZIP');
      return false;
    }
  };

  return { exportExcel, exportPdf, exportBeides };
}
