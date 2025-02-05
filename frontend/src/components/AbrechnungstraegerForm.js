import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AppContext } from '../App';
import { ChevronUp, ChevronDown } from 'lucide-react';

function AbrechnungstraegerForm() {
    const { showNotification, refreshAllData } = useContext(AppContext);
    const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newEntry, setNewEntry] = useState({
        name: '',
    });

    useEffect(() => {
        fetchAbrechnungstraeger();
    }, []);

    const fetchAbrechnungstraeger = async () => {
        try {
            const response = await axios.get('/api/abrechnungstraeger');
            setAbrechnungstraeger(response.data.sort((a, b) => a.sort_order - b.sort_order));
            setIsLoading(false);
        } catch (error) {
            console.error('Fehler beim Laden der Abrechnungsträger:', error);
            showNotification('Fehler', 'Abrechnungsträger konnten nicht geladen werden');
            setIsLoading(false);
        }
    };

    const handleAddNew = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/abrechnungstraeger', {
                ...newEntry,
                sort_order: abrechnungstraeger.length + 1
            });
            showNotification('Erfolg', 'Abrechnungsträger wurde hinzugefügt');
            setNewEntry({
                name: '',
            });
            await refreshAllData(); // Hier aufrufen
        } catch (error) {
            console.error('Fehler beim Hinzufügen:', error);
            showNotification('Fehler', 'Abrechnungsträger konnte nicht hinzugefügt werden');
        }
    };

    const handleMoveItem = async (index, direction) => {
        const newOrder = [...abrechnungstraeger];
        if (direction === 'up' && index > 0) {
            [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
        } else if (direction === 'down' && index < newOrder.length - 1) {
            [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
        } else {
            return;
        }

        // Aktualisiere sort_order für alle Einträge
        const sortOrder = newOrder.map((item, idx) => ({
            id: item.id,
            sort_order: idx + 1
        }));

        try {
            await axios.put('/api/abrechnungstraeger/sort', { sortOrder });
            setAbrechnungstraeger(newOrder);
        } catch (error) {
            console.error('Fehler beim Sortieren:', error);
            showNotification('Fehler', 'Reihenfolge konnte nicht aktualisiert werden');
            fetchAbrechnungstraeger(); // Lade ursprüngliche Reihenfolge
        }
    };

    const [editingTraeger, setEditingTraeger] = useState(null);

    const handleEdit = async (id) => {
        try {
            const response = await axios.get(`/api/abrechnungstraeger/${id}`);
            setEditingTraeger(response.data);
        } catch (error) {
            console.error('Fehler beim Laden des Abrechnungsträgers:', error);
            showNotification('Fehler', 'Abrechnungsträger konnte nicht geladen werden');
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/abrechnungstraeger/${editingTraeger.id}`, {
                name: editingTraeger.name,
            });
            showNotification('Erfolg', 'Abrechnungsträger wurde aktualisiert');
            setEditingTraeger(null);
            fetchAbrechnungstraeger();
            await refreshAllData(); // Hinzufügen!
        } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
            showNotification('Fehler', 'Abrechnungsträger konnte nicht aktualisiert werden');
        }
    };

    const handleToggleActive = async (id, currentActive) => {
        try {
            await axios.put(`/api/abrechnungstraeger/${id}`, {
                active: !currentActive
            });
            showNotification('Erfolg', 'Status wurde aktualisiert');
            fetchAbrechnungstraeger();
            await refreshAllData(); // Hinzufügen!
        } catch (error) {
            console.error('Fehler beim Ändern des Status:', error);
            showNotification('Fehler', 'Status konnte nicht aktualisiert werden');
        }
    };

    const handleDelete = async (id) => {
        showNotification(
            "Abrechnungsträger löschen",
            "Möchten Sie diesen Abrechnungsträger wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
            async () => {
                try {
                    await axios.delete(`/api/abrechnungstraeger/${id}`);
                    showNotification('Erfolg', 'Abrechnungsträger wurde gelöscht');
                    fetchAbrechnungstraeger();
                    await refreshAllData(); // Hinzufügen!
                } catch (error) {
                    console.error('Fehler beim Löschen:', error);
                    showNotification(
                        'Fehler',
                        error.response?.data?.message || 'Abrechnungsträger konnte nicht gelöscht werden'
                    );
                }
            },
            true  // showCancel = true für den Bestätigungsdialog
        );
    };

    return (
        <div className="space-y-6">
            {/* Form Card */}
            <div className="card-container-highlight">
                <h3 className="text-lg font-medium text-value mb-4">Abrechnungsträger hinzufügen</h3>
                <p className="text-sm text-muted mb-6">
                    Ein Abrechnungsträger ist eine Organisation, die Ihre Fahrtkosten erstattet.
                    Häufige Abrechnungsträger sind der Kirchenkreis oder die Kirchengemeinde.
                </p>
                <form onSubmit={handleAddNew}>
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <div className="w-full">
                            <label className="form-label">Name des Abrechnungsträgers</label>
                            <input
                                type="text"
                                value={newEntry.name}
                                onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })}
                                className="form-input"
                                placeholder="z.B. Kirchenkreis Dithmarschen"
                                required
                            />
                        </div>
                        <div className="flex items-end w-full sm:w-auto">
                            <button type="submit" className="btn-primary w-full">
                                Hinzufügen
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* List Grid */}
            <div className="space-y-4">
                {abrechnungstraeger.map((traeger, index) => (
                    <div key={traeger.id} className="card-container">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                            <div className="flex-1">
                    {editingTraeger?.id === traeger.id ? (
                        <div className="flex-1">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full">
                        <label className="form-label">Name</label>
                        <input
                        type="text"
                        value={editingTraeger.name}
                        onChange={(e) => setEditingTraeger({ ...editingTraeger, name: e.target.value })}
                        className="form-input w-full"
                        placeholder="Name"
                        required
                        />
                        </div>
                        <div className="hidden sm:flex gap-2">
                        <button onClick={handleUpdate} className="table-action-button-primary" title="Speichern">✓</button>
                        <button onClick={() => setEditingTraeger(null)} className="table-action-button-secondary" title="Abbrechen">×</button>
                        </div>
                        </div>
                        <div className="sm:hidden mobile-edit-actions mt-3">
                        <button onClick={() => setEditingTraeger(null)} className="btn-secondary w-full">Abbrechen</button>
                        <button onClick={handleUpdate} className="btn-primary w-full">Speichern</button>
                        </div>
                        </div>
                    ) : (
                        <div className="font-medium text-value">{traeger.name}</div>
                    )}
                    </div>
                            {editingTraeger?.id !== traeger.id && (
                                <div className="flex gap-2">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleMoveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="table-action-button-primary"
                                            title="Nach oben">
                                            <ChevronUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleMoveItem(index, 'down')}
                                            disabled={index === abrechnungstraeger.length - 1}
                                            className="table-action-button-primary"
                                            title="Nach unten">
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleToggleActive(traeger.id, traeger.active)}
                                        className={`table-action-button-${traeger.active ? 'primary' : 'secondary'}`}
                                        title={traeger.active ? 'Aktiv' : 'Inaktiv'}>
                                        {traeger.active ? '●' : '○'}
                                    </button>
                                    <button
                                        onClick={() => handleEdit(traeger.id)}
                                        className="table-action-button-primary"
                                        title="Bearbeiten">
                                        ✎
                                    </button>
                                    <button
                                        onClick={() => handleDelete(traeger.id)}
                                        className="table-action-button-secondary"
                                        title="Löschen">
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AbrechnungstraegerForm;