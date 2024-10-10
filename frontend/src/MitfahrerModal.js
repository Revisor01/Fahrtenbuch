import React, { useState, useEffect } from 'react';
import Modal from './Modal'; // Importieren Sie die neue Modal-Komponente

function MitfahrerModal({ isOpen, onClose, onSave, initialData, readOnly = false }) {
  const [name, setName] = useState(initialData?.name || '');
  const [arbeitsstaette, setArbeitsstaette] = useState(initialData?.arbeitsstaette || '');
  const [richtung, setRichtung] = useState(initialData?.richtung || 'hin');
  
  useEffect(() => {
    if (isOpen && initialData) {
      setName(initialData.name || '');
      setArbeitsstaette(initialData.arbeitsstaette || '');
      setRichtung(initialData.richtung || 'hin');
    }
  }, [isOpen, initialData]);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!readOnly) {
      onSave({ name, arbeitsstaette, richtung });
    }
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={readOnly ? "Mitfahrer:in Details" : "Mitfahrer:in hinzufügen/bearbeiten"}>
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
    <input
    type="text"
    id="name"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    required
    readOnly={readOnly}
    />
    </div>
    <div>
    <label htmlFor="arbeitsstaette" className="block text-sm font-medium text-gray-700">Arbeitsstätte</label>
    <input
    type="text"
    id="arbeitsstaette"
    value={arbeitsstaette}
    onChange={(e) => setArbeitsstaette(e.target.value)}
    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    required
    readOnly={readOnly}
    />
    </div>
    <div>
    <label htmlFor="richtung" className="block text-sm font-medium text-gray-700">Richtung</label>
    <select
    id="richtung"
    value={richtung}
    onChange={(e) => setRichtung(e.target.value)}
    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
    disabled={readOnly}
    >
    <option value="hin">Hin</option>
    <option value="rueck">Rück</option>
    <option value="hin_rueck">Hin & Rück</option>
    </select>
    </div>
    {!readOnly && (
      <div>
      <button
      type="submit"
      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
      >
      Speichern
      </button>
      </div>
    )}
    </form>
    </Modal>
  );
}

export default MitfahrerModal;