import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../App';

function DistanzenListe() {
    const { distanzen, orte, updateDistanz, deleteDistanz, showNotification } = useContext(AppContext);
    const [editingDistanz, setEditingDistanz] = useState(null);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'von_ort_id', direction: 'ascending' });
    
    const handleEdit = (distanz) => {
        setEditingDistanz({ ...distanz });
    };
    
    const handleSave = () => {
        updateDistanz(editingDistanz.id, editingDistanz);
        setEditingDistanz(null);
        showNotification("Erfolg", "Die Distanz wurde erfolgreich aktualisiert.");
    };
    
    const getOrtName = (id) => {
        const ort = orte.find(o => o.id === id);
        return ort ? ort.name : 'Unbekannt';
    };
    
    const handleDelete = async (id) => {
        showNotification(
        "Distanz löschen",
        "Sind Sie sicher, dass Sie diese Distanz löschen möchten?",
        async () => {
            try {
            await deleteDistanz(id);
            showNotification("Erfolg", "Die Distanz wurde erfolgreich gelöscht.");
            } catch (error) {
            console.error('Fehler beim Löschen der Distanz:', error);
            showNotification("Fehler", "Beim Löschen der Distanz ist ein Fehler aufgetreten.");
            }
        },
        true
        );
    };
    
    const sortedDistanzen = useMemo(() => {
        let sortableDistanzen = [...distanzen];
        if (sortConfig.key !== null) {
            sortableDistanzen.sort((a, b) => {
                if (sortConfig.key === 'von_ort_id' || sortConfig.key === 'nach_ort_id') {
                const ortA = orte.find(o => o.id === a[sortConfig.key]);
                const ortB = orte.find(o => o.id === b[sortConfig.key]);
                return sortConfig.direction === 'ascending' 
                    ? ortA.name.localeCompare(ortB.name)
                    : ortB.name.localeCompare(ortA.name);
                } else {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
                }
            });
        }
        return sortableDistanzen;
    }, [distanzen, sortConfig, orte]);
    
    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    return (
      <div className="space-y-6">
      {/* Desktop View */}
      <div className="hidden md:block">
        <div className="table-container">
        <table className="w-full">
        <thead>
        <tr className="table-head-row">
            <th className="table-header" onClick={() => requestSort('von_ort_id')}>
                Von {sortConfig.key === 'von_ort_id' && (
                <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
            </th>
            <th className="table-header-sm" onClick={() => requestSort('nach_ort_id')}>
                Nach {sortConfig.key === 'nach_ort_id' && (
                <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
            </th>
            <th className="table-header" onClick={() => requestSort('distanz')}>
                <span className="sm:hidden">km</span>
                <span className="hidden sm:inline">Distanz (km)</span>
                {sortConfig.key === 'distanz' && (
                    <span className="text-muted">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                )}
            </th>
            <th className="table-header text-right">Aktionen</th>
        </tr>
        </thead>
        <tbody className="divide-y divide-primary-50 dark:divide-primary-700">
            {sortedDistanzen.map((distanz) => (
            <tr key={distanz.id} className="table-row">
                <td className="table-cell">
                    <div className="flex flex-col">
                    <span className="text-value">{getOrtName(distanz.von_ort_id)}</span>
                        <span className="text-muted text-xs sm:hidden">
                        → {getOrtName(distanz.nach_ort_id)}
                        </span>
                    </div>
                </td>
                <td className="table-cell hidden md:table-cell">
                    <span className="text-value">{getOrtName(distanz.nach_ort_id)}</span>
                </td>
                <td className="table-cell text-right">
                    {editingDistanz?.id === distanz.id ? (
                        <input
                            type="number"
                            value={editingDistanz.distanz}
                            onChange={(e) =>
                                setEditingDistanz({
                                    ...editingDistanz,
                                    distanz: parseInt(e.target.value),
                                })
                            }
                            className="form-input w-16"
                        />
                    ) : (
                        <span className="text-value">{distanz.distanz}</span>
                    )}
                </td>
                <td className="table-cell">
                    <div className="flex justify-end gap-2">
                        {editingDistanz?.id === distanz.id ? (
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
                                    onClick={() => handleEdit(distanz)}
                                    className="table-action-button-primary"
                                    title="Bearbeiten"
                                >
                                    ✎
                                </button>
                                <button
                                    onClick={() => handleDelete(distanz.id)}
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
      {sortedDistanzen.map((distanz) => (
        <div key={distanz.id} className="card-container">
        {editingDistanz?.id === distanz.id ? (
          <div className="space-y-4">
          <div>
          <label className="form-label">Von</label>
          <div className="text-value">{getOrtName(distanz.von_ort_id)}</div>
          </div>
          <div>
          <label className="form-label">Nach</label>
          <div className="text-value">{getOrtName(distanz.nach_ort_id)}</div>
          </div>
          <div>
          <label className="form-label">Kilometer</label>
          <input
          type="number"
          value={editingDistanz.distanz}
          onChange={(e) => setEditingDistanz({
            ...editingDistanz,
            distanz: parseInt(e.target.value),
          })}
          className="form-input"
          />
          </div>
          <div className="flex justify-end gap-2">
          <button onClick={handleSave} className="btn-primary">Speichern</button>
          <button onClick={() => setEditingDistanz(null)} className="btn-secondary">Abbrechen</button>
          </div>
          </div>
        ) : (
          <div className="flex flex-col">
          <div className="flex justify-between items-start">
          <div>
          <div className="text-lg font-medium text-value">
          {getOrtName(distanz.von_ort_id)} → {getOrtName(distanz.nach_ort_id)}
          </div>
          <div className="mt-1 text-sm text-label">
          {distanz.distanz} km
          </div>
          </div>
          <div className="flex gap-2">
          <button
          onClick={() => handleEdit(distanz)}
          className="table-action-button-primary"
          title="Bearbeiten"
          >
          ✎
          </button>
          <button
          onClick={() => handleDelete(distanz.id)}
          className="table-action-button-secondary"
          title="Löschen"
          >
          ×
          </button>
          </div>
          </div>
          </div>
        )}
        </div>
      ))}
      </div>
      </div>
    );
}

export default DistanzenListe;