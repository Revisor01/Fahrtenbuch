import React, { useContext, useState } from 'react';
import { FileArchive, FileDown, FileSpreadsheet } from 'lucide-react';
import Sheet from '../ui/Sheet';
import Spinner from '../ui/Spinner';
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

  // Welcher Knopf gerade wartet: "<traeger>:<format>" oder null.
  const [laeuft, setLaeuft] = useState(null);

  // Auf den Export WARTEN, statt das Sheet sofort zu schliessen.
  //
  // Der PDF-Export dauert gemessene ~4,3 s (LibreOffice auf dem Server).
  // Bisher verschwand das Sheet beim Klick und bis zum Toast passierte
  // sichtbar nichts — nicht zu unterscheiden von „Knopf hat nicht
  // reagiert". Jetzt bleibt das Sheet stehen, der Knopf zeigt den Lauf,
  // und geschlossen wird erst, wenn die Datei da ist.
  //
  // Bei einem Fehler bleibt das Sheet offen: Der Fehler-Toast kommt aus
  // dem Export-Hook, und der naechste Versuch ist einen Tipp entfernt.
  const starte = async (fn, key, format) => {
    if (laeuft) return;
    setLaeuft(`${key}:${format}`);
    try {
      const ok = await fn(key.toLowerCase());
      if (ok) onClose();
    } finally {
      setLaeuft(null);
    }
  };

  const wartet = (key, format) => laeuft === `${key}:${format}`;

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
                onClick={() => starte(exportExcel, key, 'excel')}
                disabled={!!laeuft}
              >
                {wartet(key, 'excel') ? <Spinner /> : <FileSpreadsheet size={16} />}
                {wartet(key, 'excel') ? 'Erstellt …' : 'Excel'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportPdf, key, 'pdf')}
                disabled={!!laeuft}
              >
                {wartet(key, 'pdf') ? <Spinner /> : <FileDown size={16} />}
                {wartet(key, 'pdf') ? 'Erstellt …' : 'PDF'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => starte(exportBeides, key, 'beides')}
                disabled={!!laeuft}
              >
                {wartet(key, 'beides') ? <Spinner /> : <FileArchive size={16} />}
                {wartet(key, 'beides') ? 'Erstellt …' : 'Beide'}
              </button>
            </div>
          </div>
        ))
      )}
    </Sheet>
  );
}

export default ExportSheet;
