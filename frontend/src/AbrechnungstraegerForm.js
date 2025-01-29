import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import { ChevronUp, ChevronDown } from 'lucide-react';

function AbrechnungstraegerForm() {
    const { showNotification } = useContext(AppContext);
    const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newEntry, setNewEntry] = useState({
        name: '',
        kennzeichen: '',
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
                kennzeichen: ''
            });
            fetchAbrechnungstraeger();
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
                kennzeichen: editingTraeger.kennzeichen
            });
            showNotification('Erfolg', 'Abrechnungsträger wurde aktualisiert');
            setEditingTraeger(null);
            fetchAbrechnungstraeger();
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
        } catch (error) {
            console.error('Fehler beim Ändern des Status:', error);
            showNotification('Fehler', 'Status konnte nicht aktualisiert werden');
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/abrechnungstraeger/${id}`);
            showNotification('Erfolg', 'Abrechnungsträger wurde gelöscht');
            fetchAbrechnungstraeger();
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            showNotification('Fehler', error.response?.data?.message || 'Abrechnungsträger konnte nicht gelöscht werden');
        }
    };

    if (isLoading) {
        return <div className="text-center">Laden...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Formular für neue Einträge */}
            <form onSubmit={handleAddNew} className="card-container-highlight">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="form-label">Name des Abrechnungsträgers</label>
                        <input
                            type="text"
                            value={newEntry.name}
                            onChange={e => setNewEntry({...newEntry, name: e.target.value})}
                            className="form-input"
                            placeholder="z.B. Kirchenkreis Dithmarschen"
                            required
                        />
                    </div>
                    <div className="w-32">
                        <label className="form-label">Kennzeichen</label>
                        <input
                            type="text"
                            value={newEntry.kennzeichen}
                            onChange={e => setNewEntry({...newEntry, kennzeichen: e.target.value})}
                            className="form-input"
                            placeholder="z.B. kkdith"
                            required
                        />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="btn-primary w-full sm:w-auto">
                            Hinzufügen
                        </button>
                    </div>
                </div>
            </form>

            {/* Liste der Abrechnungsträger */}
            <div className="space-y-2">
        {abrechnungstraeger.map((traeger, index) => (
            <div key={traeger.id} className="card-container flex items-center justify-between p-4">
            <div className="flex-1">
            {editingTraeger?.id === traeger.id ? (
                // Edit Form
                <form onSubmit={handleUpdate} className="flex gap-4">
                <input
                type="text"
                value={editingTraeger.name}
                onChange={(e) => setEditingTraeger({...editingTraeger, name: e.target.value})}
                className="form-input flex-1"
                placeholder="Name"
                required
                />
                <input
                type="text"
                value={editingTraeger.kennzeichen}
                onChange={(e) => setEditingTraeger({...editingTraeger, kennzeichen: e.target.value})}
                className="form-input w-32"
                placeholder="Kennzeichen"
                required
                />
                <button type="submit" className="btn-primary">Speichern</button>
                <button type="button" onClick={() => setEditingTraeger(null)} className="btn-secondary">Abbrechen</button>
                </form>
            ) : (
                // Display
                <div className="flex items-center gap-4">
                <div>
                <div className="font-medium text-value">{traeger.name}</div>
                <div className="text-xs text-label">{traeger.kennzeichen}</div>
                </div>
                </div>
            )}
            </div>
            
            <div className="flex items-center gap-2">
            <div className="flex gap-1">
            <button
            onClick={() => handleMoveItem(index, 'up')}
            disabled={index === 0}
            className="table-action-button-primary p-1"
            title="Nach oben"
            >
            <ChevronUp size={16} />
            </button>
            <button
            onClick={() => handleMoveItem(index, 'down')}
            disabled={index === abrechnungstraeger.length - 1}
            className="table-action-button-primary p-1"
            title="Nach unten"
            >
            <ChevronDown size={16} />
            </button>
            </div>
            
            {!editingTraeger && (
                <>
                <button
                onClick={() => handleEdit(traeger.id)}
                className="table-action-button-primary"
                title="Bearbeiten"
                >
                ✎
                </button>
                <button
                onClick={() => handleToggleActive(traeger.id, traeger.active)}
                className={`table-action-button-${traeger.active ? 'primary' : 'secondary'}`}
                title={traeger.active ? 'Aktiv' : 'Inaktiv'}
                >
                {traeger.active ? '●' : '○'}
                </button>
                <button
                onClick={() => handleDelete(traeger.id)}
                className="table-action-button-secondary"
                title="Löschen"
                >
                ×
                </button>
                </>
            )}
            </div>
            </div>
        ))}
        </div>
        </div>
    );
}

export default AbrechnungstraegerForm;