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
          <h3 className="text-value font-medium mb-3">Dashboard</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Neues Dashboard als Startseite mit Übersicht über Erstattungen, Kilometer und Fahrten</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Jahres-Statistik mit Balkendiagramm (km pro Monat) und Erstattungsübersicht</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Neue Tab-Navigation: Dashboard, Fahrten & Export, Monatsübersicht, Einstellungen</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Favoriten & Schnelleingabe</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Wiederkehrende Fahrten als Favoriten speichern (unter Einstellungen → Favoriten)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Ein Klick auf einen Favoriten trägt die Fahrt mit heutigem Datum ein</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>"Nochmal"-Button bei den letzten Fahrten — kopiert die Fahrt für heute</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Adress-Vervollständigung</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Bei der Eingabe von Adressen erscheinen automatisch Vorschläge aus OpenStreetMap</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Funktioniert bei neuen Orten und einmaligen Orten im Fahrt-Formular</p>
            </div>
          </div>
        </div>

        <div className="card-container">
          <h3 className="text-value font-medium mb-3">Weitere Verbesserungen</h3>
          <div className="space-y-2 text-sm text-label">
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>PDF-Export neben Excel — mit Format-Auswahl (Excel, PDF oder beides als ZIP)</p>
            </div>
            <div className="flex items-start gap-2">
              <CheckSquare size={16} className="text-primary-500 mt-0.5" />
              <p>Verbesserte Sicherheit, Eingabevalidierung und mobile Darstellung</p>
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
