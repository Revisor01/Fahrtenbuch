import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';

function OrteListe() {
  const { orte, updateOrt, deleteOrt, showNotification } = useContext(AppContext);
  const [editingOrt, setEditingOrt] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'ascending' });

  const handleEdit = (ort) => {
    setEditingOrt({ ...ort });
  };
  
  const handleSave = () => {
    updateOrt(editingOrt.id, editingOrt);
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

  const handleStatusChange = (e) => {
    const value = e.target.value;
    setEditingOrt({
      ...editingOrt,
      ist_wohnort: value === 'wohnort',
      ist_dienstort: value === 'dienstort',
      ist_kirchspiel: value === 'kirchspiel'
    });
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
  
  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block table-container">
        <table className="w-full">
          <thead>
            <tr className="table-head-row">
              <th className="table-header" onClick={() => requestSort('name')}>
                Name {sortConfig.key === 'name' && (
                  <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="table-header" onClick={() => requestSort('adresse')}>
                Adresse {sortConfig.key === 'adresse' && (
                  <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="table-header">Status</th>
              <th className="table-header text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrte.map((ort) => (
              <tr key={ort.id} className="table-row">
                <td className="table-cell">{ort.name}</td>
                <td className="table-cell">{ort.adresse}</td>
                <td className="table-cell">{getOrtStatusLabel(ort)}</td>
                <td className="table-cell">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(ort)} className="table-action-button-primary">✎</button>
                    <button onClick={() => handleDelete(ort.id)} className="table-action-button-secondary">×</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    {/* Mobile View */}
    <div className="md:hidden space-y-4">
    {sortedOrte.map((ort) => (
      <div key={ort.id} className="card-container">
      {editingOrt?.id === ort.id ? (
        <div className="mobile-edit-container">
        <div className="form-group">
        <label className="form-label">Name</label>
        <input
        type="text"
        value={editingOrt.name}
        onChange={(e) => setEditingOrt({...editingOrt, name: e.target.value})}
        className="form-input"
        />
        </div>
        <div className="form-group">
        <label className="form-label">Adresse</label>
        <input
        type="text"
        value={editingOrt.adresse}
        onChange={(e) => setEditingOrt({...editingOrt, adresse: e.target.value})}
        className="form-input"
        />
        </div>
        <div className="form-group">
        <label className="form-label">Status</label>
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
        </div>
        <div className="mobile-edit-actions">
        <button onClick={() => setEditingOrt(null)} className="btn-secondary">Abbrechen</button>
        <button onClick={handleSave} className="btn-primary">Speichern</button>
        </div>
        </div>
      ) : (
        <div className="flex justify-between items-start">
        <div>
        <div className="font-medium text-value">{ort.name}</div>
        <div className="text-sm text-label mt-1">{ort.adresse}</div>
        <div className="text-xs text-label mt-2">{getOrtStatusLabel(ort)}</div>
        </div>
        <div className="flex gap-2">
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
        </div>
        </div>
      )}
      </div>
    ))}
    </div>
    </div>
  );
}

export default OrteListe;