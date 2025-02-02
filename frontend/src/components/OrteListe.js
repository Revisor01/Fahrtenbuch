import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';

function OrteListe() {
  const { orte, updateOrt, deleteOrt, showNotification } = useContext(AppContext);
  const [editingOrt, setEditingOrt] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const handleEdit = (ort) => {
    setEditingOrt({ ...ort });
  };
  
  const handleSave = () => {
    const updatedOrt = {
      ...editingOrt,
      ist_wohnort: editingOrt.ist_wohnort !== undefined ? editingOrt.ist_wohnort : false,
      ist_dienstort: editingOrt.ist_dienstort !== undefined ? editingOrt.ist_dienstort : false,
      ist_kirchspiel: editingOrt.ist_kirchspiel !== undefined ? editingOrt.ist_kirchspiel : false
    };
    updateOrt(editingOrt.id, updatedOrt);
    setEditingOrt(null);
    showNotification("Erfolg", "Der Ort wurde erfolgreich aktualisiert.");
  };
  
  const handleDelete = async (id) => {
    showNotification(
      "Ort löschen",
      "Sind Sie sicher, dass Sie diesen Ort löschen möchten?",
      async () => {
        try {
          await deleteOrt(id);
          showNotification("Erfolg", "Der Ort wurde erfolgreich gelöscht.");
        } catch (error) {
          console.error('Fehler beim Löschen des Ortes:', error);
          showNotification("Fehler", "Dieser Ort kann nicht gelöscht werden, da er in Fahrten verwendet wird.");
        }
      },
      true
    );
  };
  
    const sortedOrte = useMemo(() => {
        let sortableOrte = [...orte];
        if (sortConfig.key !== null) {
            sortableOrte.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableOrte;
    }, [orte, sortConfig]);
    
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

  const getOrtStatus = (ort) => {
    if (ort.ist_wohnort) return 'wohnort';
    if (ort.ist_dienstort) return 'dienstort';
    if (ort.ist_kirchspiel) return 'kirchspiel';
    return '';
  };
  
  const getOrtStatusLabel = (ort) => {
    if (ort.ist_wohnort) return 'Wohnort';
    if (ort.ist_dienstort) return 'Dienstort';
    if (ort.ist_kirchspiel) return 'Kirchspiel';
    return 'Sonstiger Ort';
  };
  
  const handleStatusChange = (e) => {
    const value = e.target.value;
    setEditingOrt({
      ...editingOrt,
      ist_wohnort: value === 'wohnort',
      ist_dienstort: value === 'dienstort',
      ist_kirchspiel: value === 'kirchspiel'
    });
  };
  
  return (
    <div className="hidden md:block">
    <div className="table-container">
    <table className="w-full">
    <thead>
    <tr className="table-head-row">
    <th className="table-header" onClick={() => requestSort('name')}>
    Name {sortConfig.key === 'name' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </th>
    <th className="table-header-sm" onClick={() => requestSort('adresse')}>
    Adresse {sortConfig.key === 'adresse' && (
      <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
    )}
    </th>
    <th className="table-header">Status</th>
    <th className="table-header text-right">Aktionen</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-primary-50 dark:divide-primary-700">
    {sortedOrte.map((ort) => (
      <tr key={ort.id} className="table-row">
      <td className="table-cell">
      {editingOrt?.id === ort.id ? (
        <input
        value={editingOrt.name}
        onChange={(e) => setEditingOrt({ ...editingOrt, name: e.target.value })}
        className="form-input"
        />
      ) : (
        <div className="flex flex-col">
        <span className="text-value">{ort.name}</span>
        <span className="text-muted text-xs sm:hidden">
        {ort.adresse}
        </span>
        </div>
      )}
      </td>
      <td className="table-cell hidden md:table-cell">
      {editingOrt?.id === ort.id ? (
        <input
        value={editingOrt.adresse}
        onChange={(e) => setEditingOrt({ ...editingOrt, adresse: e.target.value })}
        className="form-input"
        />
      ) : (
        <span className="text-value">{ort.adresse}</span>
      )}
      </td>
      <td className="table-cell">
      {editingOrt?.id === ort.id ? (
        <select
        value={getOrtStatus(editingOrt)}
        onChange={handleStatusChange}
        className="form-select"
        >
        <option value="">Sonstiger Ort</option>
        <option value="wohnort">Wohnort</option>
        <option value="dienstort">Dienstort</option>
        <option value="kirchspiel">Kirchspiel</option>
        </select>
      ) : (
        <span className="text-value">{getOrtStatusLabel(ort)}</span>
      )}
      </td>
      <td className="table-cell">
      <div className="flex justify-end gap-2">
      {editingOrt?.id === ort.id ? (
        <button
        onClick={handleSave}
        className="table-action-button-primary"
        title="Speichern"
        >
        ✓
        </button>
      ) : (
        <>
        <button
        onClick={() => handleEdit(ort)}
        className="table-action-button-primary"
        title="Bearbeiten"
        >
        ✎
        </button>
        <button
        onClick={() => handleDelete(ort.id)}
        className="table-action-button-secondary"
        title="Löschen"
        >
        ×
        </button>
        </>
      )}
      </div>
      </td>
      </tr>
    ))}
    </tbody>
    </table>
    </div>
    </div>
    
    {/* Mobile View */}
    <div className="md:hidden space-y-4">
    {sortedOrte.map((ort) => (
      <div key={ort.id} className="card-container">
      <div className="flex justify-between items-start">
      <div>
      <div className="font-medium text-value">{ort.name}</div>
      <div className="text-sm text-label mt-1">{ort.adresse}</div>
      <div className="text-xs text-label mt-2">
      {getOrtStatusLabel(ort)}
      </div>
      </div>
      <div className="flex gap-2">
      <button
      onClick={() => handleEdit(ort)}
      className="btn-secondary">
      Bearbeiten
      </button>
      <button
      onClick={() => handleDelete(ort.id)}
      className="btn-secondary">
      Löschen
      </button>
      </div>
      </div>
      </div>
    ))}
    </div>
    </>
  );
}


export default OrteListe;