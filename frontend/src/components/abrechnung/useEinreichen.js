import { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { useToast } from '../ui/Toast';
import { useFahrtenExport } from '../fahrten/useFahrtenExport';
import { monatLabel } from './abrechnungUtils';

// Statusaktionen der Abrechnung (Phase R6) — alle ohne Bestätigungs-Modal:
// direkt ausführen, Toast mit „Rückgängig" (Design-Spec).
//
// Einreichen folgt der bestehenden Export-Reihenfolge (erst Export-Download,
// dann Status — wie der Erfolgs-Toast der Fahrtenliste, nur ohne Zwischenklick):
// je offenem Träger ein Excel-Export, danach alle Status auf „eingereicht"
// mit heutigem Datum. Undo setzt genau diese Träger per Reset zurück.
//
// Alle Status-Calls laufen mit refresh=false; am Ende lädt genau ein
// refresh() nach (fetchMonthlyData wäre sonst ein Request-Sturm je Schleife).
export function useEinreichen() {
  const {
    updateAbrechnungsStatus,
    fetchMonthlyData,
    fetchFahrten,
    setAbrechnungsStatusModal,
  } = useContext(AppContext);
  const { exportExcel } = useFahrtenExport();
  const toast = useToast();

  const refresh = async () => {
    await fetchMonthlyData();
    await fetchFahrten();
  };

  const heute = () => new Date().toISOString().split('T')[0];

  // Datumsteil aus API-Werten ("YYYY-MM-DD" oder ISO-Datetime)
  const datumsTeil = (wert) => (wert ? String(wert).slice(0, 10) : null);

  const jahrMonat = (month) => [month.year.toString(), String(month.monatNr).padStart(2, '0')];

  // Einreichen: alle übergebenen Kategorien mit Status „Erfasst" exportieren
  // (Excel, bestehende Export-Logik) und auf „eingereicht" setzen.
  // Für die Zeilen-Aktion einzelner Träger einfach [kategorie] übergeben.
  const einreichen = async (month, kategorien) => {
    const offene = (kategorien || []).filter((k) => k.status === 'offen');
    if (offene.length === 0) return;
    const [jahr, monat] = jahrMonat(month);

    // 1. Export-Downloads anstoßen (sequentiell, je Träger eine Datei)
    const exportiert = [];
    for (const k of offene) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await exportExcel(k.key, {
        von: month.yearMonth,
        bis: month.yearMonth,
        erfolg: 'keiner',
      });
      if (ok) exportiert.push(k);
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
            console.error('Fehler beim Zurücknehmen des Einreichens:', error);
            toast.error('Status konnte nicht zurückgesetzt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Einreichen:', error);
      toast.error('Status konnte nicht aktualisiert werden.');
    }
  };

  // Eingereicht → Erstattet (heute). Undo stellt „Eingereicht" mit dem
  // alten Datum wieder her (erhalten_am lässt sich nur per Reset löschen).
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
            console.error('Fehler beim Zurücknehmen der Erstattung:', error);
            toast.error('Status konnte nicht zurückgesetzt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Markieren als erstattet:', error);
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
            console.error('Fehler beim Wiederherstellen des Status:', error);
            toast.error('Status konnte nicht wiederhergestellt werden.');
          }
        },
      });
    } catch (error) {
      console.error('Fehler beim Zurücksetzen des Status:', error);
      toast.error('Status konnte nicht zurückgesetzt werden.');
    }
  };

  // Nachträgliches Ändern des Einreich-/Erstattungsdatums — öffnet den
  // Datums-Dialog (einziger verbliebener Einsatz des Status-Dialogs)
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

  return { einreichen, alsErstattetMarkieren, zuruecksetzen, datumAendern };
}
