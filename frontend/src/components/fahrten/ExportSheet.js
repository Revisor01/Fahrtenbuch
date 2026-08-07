import React, { useContext } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { AppContext } from '../../contexts/AppContext';
import { useFahrtenExport } from './useFahrtenExport';
import {
  kategorienMitErstattung,
  offeneMonateImZeitraum,
} from './zeitraumUtils';

// Kompaktes Export-Sheet (öffnet über „Export" in der Summenzeile):
// je Abrechnungsträger die drei Formate Excel / PDF / Beide (ZIP).
// Im Zeitraum-Modus erscheinen nur Träger mit offenen Monaten —
// wie bisher; vollständig eingereichte/erstattete brauchen keinen Export.
function ExportSheet({ isOpen, onClose }) {
  const { summary, abrechnungstraeger, selectedMonth, selectedVonMonth } = useContext(AppContext);
  const { exportExcel, exportPdf, exportBeides } = useFahrtenExport();

  const istZeitraum = !!(selectedVonMonth && selectedVonMonth !== selectedMonth);

  const hatOffeneMonate = (key) => {
    if (!istZeitraum) return true;
    return offeneMonateImZeitraum(
      summary.abrechnungsStatus?.[key],
      selectedVonMonth,
      selectedMonth
    ).length > 0;
  };

  const kategorien = kategorienMitErstattung(summary, abrechnungstraeger)
    .filter(({ key }) => hatOffeneMonate(key));

  const monatLabel = (ym) => {
    const [y, m] = ym.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString('de-DE', {
      month: 'long',
      year: 'numeric',
    });
  };
  const zeitraumLabel = istZeitraum
    ? `${monatLabel(selectedVonMonth)} bis ${monatLabel(selectedMonth)}`
    : monatLabel(selectedMonth);

  const starte = (fn, key) => {
    fn(key.toLowerCase());
    onClose();
  };

  return (
    <Sheet isOpen={isOpen} onClose={onClose} title="Export">
      <p className="fl-export-sub">Abrechnung für {zeitraumLabel}</p>

      {kategorien.length === 0 ? (
        <p className="fl-export-leer">
          Für {zeitraumLabel} ist nichts zu exportieren — alles ist bereits
          eingereicht oder erstattet.
        </p>
      ) : (
        kategorien.map(({ key, name }) => (
          <div key={key} className="fl-export-row">
            <span className="fl-export-name">{name}</span>
            <div className="fl-export-btns">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportExcel, key)}
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportPdf, key)}
              >
                <FileDown size={16} />
                PDF
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => starte(exportBeides, key)}
              >
                Beide (ZIP)
              </button>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}

export default ExportSheet;
