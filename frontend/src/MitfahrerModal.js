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
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full" onClick={onClose}>
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" ref={modalRef} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Mitfahrer hinzufügen/bearbeiten</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <span className="sr-only">Schließen</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
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
            />
          </div>
          <div>
            <label htmlFor="richtung" className="block text-sm font-medium text-gray-700">Richtung</label>
            <select
              id="richtung"
              value={richtung}
              onChange={(e) => setRichtung(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="hin">Hin</option>
              <option value="rueck">Zurück</option>
              <option value="hin_rueck">Hin und zurück</option>
            </select>
          </div>
          <div>
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
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