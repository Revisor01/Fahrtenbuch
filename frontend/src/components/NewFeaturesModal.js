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
          <span>Neue Funktionen in Version 1.3.0</span>
        </div>
      }
      size="wide"
    >
      <div className="space-y-6">
        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Excel-Export verbessert</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Datum wird jetzt im Format TT.MM.JJJJ exportiert (als echtes Excel-Datum)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Unterschriftsbereich mit Genehmigungszeile im Export ergänzt</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Kostenstelle wird im Excel-Header neben dem Kostenträger angezeigt</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Mehrmonats-Export</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Neuer Zeitraum-Export: Von-Monat und Bis-Monat wählbar</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Excel-Header zeigt den gewählten Zeitraum korrekt an</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Eingereicht-Status wird für jeden Monat im Zeitraum gesetzt</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Kostenstelle & Distanzen</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Abrechnungsträger haben jetzt ein optionales Kostenstelle-Feld</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Distanzänderungen aktualisieren automatisch alle bestehenden Fahrten mit dieser Strecke</p>
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
