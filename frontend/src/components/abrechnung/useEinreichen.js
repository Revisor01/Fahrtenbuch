import { useContext, useState } from 'react';
import logFehler from '../../utils/logFehler';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import { useFahrtenExport } from '../fahrten/useFahrtenExport';
import { monatLabel } from './abrechnungUtils';
import { heuteISO } from '../../utils/datum';

// Statusaktionen ohne Bestätigungsdialog, mit Undo; am Ende genau ein refresh(), sonst ein Request-Sturm.
export function useEinreichen() {
  const {
    updateAbrechnungsStatus,
    fetchMonthlyData,
    fetchFahrten,
    setAbrechnungsStatusModal,
  } = useContext(AppContext);
  const { exportExcel, exportPdf, exportBeides } = useFahrtenExport();
  const toast = useToast();

  // { fertig, gesamt } oder null, für „Erstellt 2 von 3 …“.
  const [fortschritt, setFortschritt] = useState(null);

  const refresh = async () => {
    await fetchMonthlyData();
    await fetchFahrten();
  };

  const heute = () => heuteISO();

  // Datumsteil aus API-Werten ("YYYY-MM-DD" oder ISO-Datetime)
  const datumsTeil = (wert) => (wert ? String(wert).slice(0, 10) : null);

  const jahrMonat = (month) => [month.year.toString(), String(month.monatNr).padStart(2, '0')];

  // Alle Kategorien mit „Erfasst“ exportieren und einreichen; Format vom Aufrufer, Standard Excel.
  const einreichen = async (month, kategorien, format = 'excel') => {
    const offene = (kategorien || []).filter((k) => k.status === 'offen');
    if (offene.length === 0) return;
    const [jahr, monat] = jahrMonat(month);

    const exportFn =
      format === 'pdf' ? exportPdf : format === 'beides' ? exportBeides : exportExcel;

    // 1. Exporte nacheinander mit Zähler, ein PDF dauert etwa 4,3 s.
    const exportiert = [];
    setFortschritt({ fertig: 0, gesamt: offene.length });
    try {
      for (const k of offene) {
        // eslint-disable-next-line no-await-in-loop
        const ok = await exportFn(k.key, {
          von: month.yearMonth,
          bis: month.yearMonth,
          erfolg: 'keiner',
        });
        if (ok) exportiert.push(k);
        setFortschritt({ fertig: exportiert.length, gesamt: offene.length });
      }
    } finally {
      setFortschritt(null);
    }
    if (exportiert.length === 0) return; // Fehler-Toast kam aus dem Export-Hook

    // 2. Status setzen — erst nach erfolgreichem Export
    try {
      const datum = heute();
      for (const k of exportiert) {
        // eslint-disable-next-line no-await-in-loop
        await updateAbrechnungsStatus(jahr, monat, k.key, 'eingereicht', datum, true, false);
      }
      await refresh();
      const namen = exportiert.map((k) => k.name).join(', ');
      const meldung = exportiert.length === offene.length && offene.length === kategorien.length
        ? `${monatLabel(month)} eingereicht.`
        : `${monatLabel(month)}: ${namen} eingereicht.`;
      toast.success(meldung, {
        undo: async () => {
          try {
            for (const k of exportiert) {
              // eslint-disable-next-line no-await-in-loop
              await updateAbrechnungsStatus(jahr, monat, k.key, 'reset', null, true, false);
            }
            await refresh();
            toast.success('Einreichen rückgängig gemacht.');
          } catch (error) {
            logFehler('Fehler beim Zurücknehmen des Einreichens:', error);
            toast.error('Status konnte nicht zurückgesetzt werden.');
          }
        },
      });
    } catch (error) {
      logFehler('Fehler beim Einreichen:', error);
      toast.error('Status konnte nicht aktualisiert werden.');
    }
  };

  // Einreichen ohne Export, für schon anders abgegebene Abrechnungen.
  const alsEingereichtMarkieren = async (month, kategorie) => {
    const [jahr, monat] = jahrMonat(month);
    try {
      await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'eingereicht', heute(), true, false);
      await refresh();
      toast.success(`${kategorie.name} als eingereicht markiert.`, {
        undo: async () => {
          try {
            await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'reset', null, true, false);
            await refresh();
            toast.success('Rückgängig gemacht.');
          } catch (error) {
            logFehler('Fehler beim Zurücknehmen:', error);
            toast.error('Status konnte nicht zurückgesetzt werden.');
          }
        },
      });
    } catch (error) {
      logFehler('Fehler beim Markieren als eingereicht:', error);
      toast.error('Status konnte nicht aktualisiert werden.');
    }
  };

  // Undo stellt „Eingereicht“ mit dem alten Datum wieder her.
  const alsErstattetMarkieren = async (month, kategorie) => {
    const [jahr, monat] = jahrMonat(month);
    const eingereichtAm = datumsTeil(kategorie.statusData?.eingereicht_am);
    try {
      await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'erhalten', heute(), true, false);
      await refresh();
      toast.success(`${kategorie.name} als erstattet markiert.`, {
        undo: async () => {
          try {
            await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'reset', null, true, false);
            if (eingereichtAm) {
              await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'eingereicht', eingereichtAm, true, false);
            }
            await refresh();
            toast.success('Rückgängig gemacht.');
          } catch (error) {
            logFehler('Fehler beim Zurücknehmen der Erstattung:', error);
            toast.error('Status konnte nicht zurückgesetzt werden.');
          }
        },
      });
    } catch (error) {
      logFehler('Fehler beim Markieren als erstattet:', error);
      toast.error('Status konnte nicht aktualisiert werden.');
    }
  };

  // Status zurücksetzen (→ Erfasst). Undo stellt die alten Daten wieder her.
  const zuruecksetzen = async (month, kategorie) => {
    const [jahr, monat] = jahrMonat(month);
    const eingereichtAm = datumsTeil(kategorie.statusData?.eingereicht_am);
    const erhaltenAm = datumsTeil(kategorie.statusData?.erhalten_am);
    try {
      await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'reset', null, true, false);
      await refresh();
      toast.success(`${kategorie.name} zurückgesetzt.`, {
        undo: async () => {
          try {
            if (eingereichtAm) {
              await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'eingereicht', eingereichtAm, true, false);
            }
            if (erhaltenAm) {
              await updateAbrechnungsStatus(jahr, monat, kategorie.key, 'erhalten', erhaltenAm, true, false);
            }
            await refresh();
            toast.success('Status wiederhergestellt.');
          } catch (error) {
            logFehler('Fehler beim Wiederherstellen des Status:', error);
            toast.error('Status konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      logFehler('Fehler beim Zurücksetzen des Status:', error);
      toast.error('Status konnte nicht zurückgesetzt werden.');
    }
  };

  // Öffnet den Datums-Dialog.
  const datumAendern = (month, kategorie) => {
    const [jahr, monat] = jahrMonat(month);
    setAbrechnungsStatusModal({
      open: true,
      traegerId: kategorie.key,
      aktion: kategorie.status === 'erhalten' ? 'erhalten' : 'eingereicht',
      jahr,
      monat,
      singleMonth: true,
    });
  };

  // Vor dem Einreichen nach dem Format fragen.
  const [formatFrage, setFormatFrage] = useState(null);

  const einreichenFragen = (month, kategorien) => {
    const offene = (kategorien || []).filter((k) => k.status === 'offen');
    if (offene.length === 0) return;
    setFormatFrage({ month, kategorien });
  };

  const einreichenBestaetigen = async (format) => {
    const frage = formatFrage;
    setFormatFrage(null);
    if (frage) await einreichen(frage.month, frage.kategorien, format);
  };

  return {
    einreichen: einreichenFragen,
    einreichenDirekt: einreichen,
    fortschritt,
    formatFrage,
    einreichenBestaetigen,
    formatFrageSchliessen: () => setFormatFrage(null),
    alsEingereichtMarkieren,
    alsErstattetMarkieren,
    zuruecksetzen,
    datumAendern,
  };
}
