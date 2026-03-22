import React from 'react';
import Modal from '../Modal';
import { CheckSquare } from 'lucide-react';

const NewFeaturesModal = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Neuigkeiten</span>
        </div>
      }
      size="wide"
    >
      <div className="space-y-6">
        <div className="card-container">
          <h3 className="text-value font-medium mb-3">PDF-Export</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Beim Export wählen: Excel, PDF oder beides gleichzeitig</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>PDF ist druckfertig im offiziellen Formular-Layout (A4 Querformat)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Nach dem Export: optional als eingereicht markieren</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Zeitraum-Auswahl</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Von/Bis-Auswahl in der Monatsübersicht — auch jahresübergreifend</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Fahrten, Erstattungen und Export passen sich dem Zeitraum an</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Excel-Export verbessert</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Datum im Format TT.MM.JJJJ (echtes Excel-Datum, frei formatierbar)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Unterschriftsbereich und Genehmigungszeile im Export</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Kostenstelle im Header neben dem Kostenträger</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Weitere Verbesserungen</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Kostenstelle-Feld beim Abrechnungsträger</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Distanzänderungen aktualisieren automatisch alle betroffenen Fahrten</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Verbesserte Sicherheit und Eingabevalidierung</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="btn-primary">
            Verstanden
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default NewFeaturesModal;
