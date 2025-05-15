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
          <span>Neue Funktionen in Version 1.2.0</span>
        </div>
      }
      size="wide"
    >
      <div className="space-y-6">
        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Einmalige Orte speichern</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Neue "Speichern"-Funktion neben einmaligen Orten</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Dialog zur Eingabe eines aussagekräftigen Namens für den Ort</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Automatische Übernahme des gespeicherten Orts in das aktuelle Formular</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Aktualisierung von verknüpften Hin- bzw. Rückfahrten</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Bei Bearbeitung einer Hinfahrt wird automatisch nach zugehöriger Rückfahrt gesucht</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Option zum gleichzeitigen Aktualisieren der Rückfahrt (z.B. bei Änderung des Abrechnungsträgers)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Abfrage erscheint nur, wenn tatsächlich eine Rückfahrt gefunden wurde</p>
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