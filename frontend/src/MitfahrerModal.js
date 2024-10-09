import React, { useState, useEffect, useRef } from 'react';

function MitfahrerModal({ onClose, onSave, initialData }) {
  const [name, setName] = useState(initialData?.name || '');
  const [arbeitsstaette, setArbeitsstaette] = useState(initialData?.arbeitsstaette || '');
  const [richtung, setRichtung] = useState(initialData?.richtung || 'hin');
  const modalRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, arbeitsstaette, richtung, ...initialData });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" ref={modalRef}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Mitfahrer hinzufügen/bearbeiten</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Schließen</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <input
            type="text"
            value={arbeitsstaette}
            onChange={(e) => setArbeitsstaette(e.target.value)}
            placeholder="Arbeitsstätte"
            className="mt-2 p-2 w-full border rounded"
            required
          />
          <select
            value={richtung}
            onChange={(e) => setRichtung(e.target.value)}
            className="mt-2 p-2 w-full border rounded"
          >
            <option value="hin">Hin</option>
            <option value="rueck">Zurück</option>
            <option value="hin_rueck">Hin und zurück</option>
          </select>
          <div className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Speichern
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MitfahrerModal;