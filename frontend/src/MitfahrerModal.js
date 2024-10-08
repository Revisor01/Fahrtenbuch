import React, { useState } from 'react';

function MitfahrerModal({ onClose, onSave, initialData }) {
  const [name, setName] = useState(initialData?.name || '');
  const [arbeitsstaette, setArbeitsstaette] = useState(initialData?.arbeitsstaette || '');
  const [richtung, setRichtung] = useState(initialData?.richtung || 'hin');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, arbeitsstaette, richtung });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Mitfahrer hinzufügen/bearbeiten</h3>
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
            <div className="items-center px-4 py-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Speichern
              </button>
            </div>
          </form>
          <button
            onClick={onClose}
            className="mt-2 px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
}

export default MitfahrerModal;