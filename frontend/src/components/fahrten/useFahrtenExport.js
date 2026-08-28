import { useContext } from 'react';
import axios from 'axios';
import { heuteISO } from '../../utils/datum';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import { monateImZeitraum } from './zeitraumUtils';
import { IST_NATIVE } from '../../utils/plattform';

// Filesystem erwartet reines Base64 ohne den "data:...;base64,"-Kopf, den
// readAsDataURL voranstellt.
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

// Das Teilen-Blatt meldet den Abbruch je nach Plattform unterschiedlich —
// iOS/Android liefern hier keine einheitliche Fehlerklasse, deshalb der
// Textvergleich.
function istAbbruch(error) {
  const text = String(error?.message || error || '').toLowerCase();
  return text.includes('canceled') || text.includes('cancelled') || text.includes('abort');
}

// Export-Logik der Fahrtenliste (Excel / PDF / Beide als ZIP je Träger).
// Verhalten unverändert aus dem Bestand: Einzelmonat- vs. Zeitraum-Routen,
// Dateiname aus Content-Disposition, danach Erfolgs-Toast mit der Aktion
// „Als eingereicht markieren" (nur für offene Monate, bleibt bis zum Klick).
//
// Seit Phase R6 nimmt jede Export-Funktion optional Optionen:
//   { von, bis }   Monats-Keys "YYYY-MM" — überschreiben den Kontext-Zeitraum
//                  (von === bis → Einzelmonat-Route). Für die Abrechnung,
//                  die unabhängig vom Fahrten-Tab exportiert.
//   { erfolg }     'aktion' (Default: Toast mit „Als eingereicht markieren"),
//                  'einfach' (nur „Export erstellt."), 'keiner' (kein Toast —
//                  der Aufrufer übernimmt, z. B. der Einreichen-Flow).
// Rückgabe: true bei Erfolg, false bei Fehler (Fehler-Toast kommt von hier).
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

  // URL-Teile: Einzelmonat "jahr/monat", Zeitraum "vonJahr/vonMonat/bisJahr/bisMonat".
  // Mit opts.von/opts.bis wird der Kontext-Zeitraum überschrieben.
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

  // Erfolgs-Meldung je nach opts.erfolg; Zeitraum-Overrides bekommen nie den
  // „Als eingereicht markieren"-Toast (der hängt an den Kontext-Daten des Tabs)
  const erfolgsToast = (type, opts = {}) => {
    if (opts.erfolg === 'keiner') return;
    if (opts.erfolg === 'einfach' || (opts.von && opts.bis)) {
      toast.success('Export erstellt.');
      return;
    }
    markAlsEingereichtToast(type);
  };

  // Web: unveraendert der bisherige <a download>-Klick.
  //
  // App: In WKWebView (iOS) tut derselbe Klick schlicht nichts — kein Fehler,
  // keine Datei. Deshalb schreibt der native Zweig die Datei in den Cache und
  // reicht sie ans System-Teilen-Blatt weiter. Directory.Cache braucht keine
  // Berechtigung, und das System raeumt selbst auf.
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
      // Abbruch des Teilen-Blatts ist eine normale Nutzerentscheidung und darf
      // nicht als fehlgeschlagener Export gemeldet werden. Die Datei liegt
      // geschrieben im Cache — der Export selbst hat funktioniert.
      if (istAbbruch(error)) return;
      throw error;
    }
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
      const betraegeProMonat = summary.erstattungenProMonat?.[type] || {};
      exportedMonths = monateImZeitraum(selectedVonMonth, selectedMonth).filter((mk) => {
        // Monate ohne Fahrten dieses Trägers überspringen: Sie standen sonst
        // dauerhaft als „eingereicht" in der Übersicht, obwohl es dort nichts
        // einzureichen gab — und liessen sich nie abschliessen.
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

      // Ab 30 Fahrten im Monat teilt der Server die Abrechnung auf mehrere
      // Formularblätter auf und liefert sie als ZIP. Das früher fest gesetzte
      // application/pdf machte daraus eine .pdf mit ZIP-Inhalt — die kein
      // Betrachter öffnen konnte („Datei beschädigt").
      const contentType = response.headers['content-type'];
      const istZip = contentType === 'application/zip';
      const endung = istZip ? '.zip' : '.pdf';
      let filename = dateinameAusHeader(response, `fahrtenabrechnung_${type}_${dateiname}${endung}`);
      if (!filename.endsWith(endung)) filename = `${filename}${endung}`;

      const blob = new Blob([response.data], { type: istZip ? 'application/zip' : 'application/pdf' });
      if (blob.size === 0) {
        throw new Error('Die heruntergeladene Datei scheint leer oder fehlerhaft zu sein');
      }
      await downloadBlob(blob, filename);
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

      // Erst hier laden statt beim Start: JSZip wird nur fuer „Beides" als
      // ZIP gebraucht und lag sonst im Startbuendel, das die App vor dem
      // ersten Bild komplett parsen muss (Simon 16.08.: schneller starten).
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      // Bei vielen Fahrten ist die Antwort selbst schon ein ZIP mit mehreren
      // Formularblaettern. Dann wandert die Endung mit — sonst laege in der
      // Sammel-ZIP eine .xlsx/.pdf, die sich nicht oeffnen laesst — und beide
      // brauchen einen eigenen Namen, sonst ueberschreiben sie sich.
      const eintrag = (res, standard) =>
        res.headers['content-type'] === 'application/zip'
          ? `${baseFilename}_${standard}.zip`
          : `${baseFilename}.${standard}`;
      zip.file(eintrag(excelRes, 'xlsx'), excelRes.data);
      zip.file(eintrag(pdfRes, 'pdf'), pdfRes.data);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await downloadBlob(zipBlob, `${baseFilename}.zip`);
      erfolgsToast(type, opts);
      return true;
    } catch (error) {
      fehlerToast(error, 'ZIP');
      return false;
    }
  };

  return { exportExcel, exportPdf, exportBeides };
}
