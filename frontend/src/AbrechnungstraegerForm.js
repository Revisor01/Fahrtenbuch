// AbrechnungstraegerForm.js
import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AppContext } from './App';

export default function AbrechnungstraegerForm() {
    const { showNotification } = useContext(AppContext);
    const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);

    // Formular für neuen Eintrag
    const [newEntry, setNewEntry] = useState({
        name: '',
        kennzeichen: '',
        betrag: '0.30'
    });

    useEffect(() => {
        fetchAbrechnungstraeger();
    }, []);

    const fetchAbrechnungstraeger = async () => {
        try {
            const response = await axios.get('/api/abrechnungstraeger');
            setAbrechnungstraeger(response.data);
        } catch (error) {
            console.error('Fehler beim Laden der Abrechnungsträger:', error);
            showNotification('Fehler', 'Abrechnungsträger konnten nicht geladen werden');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddNew = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/abrechnungstraeger', newEntry);
            showNotification('Erfolg', 'Abrechnungsträger wurde hinzugefügt');
            setNewEntry({ name: '', kennzeichen: '', betrag: '0.30' });
            fetchAbrechnungstraeger();
        } catch (error) {
            console.error('Fehler beim Hinzufügen:', error);
            showNotification('Fehler', 'Abrechnungsträger konnte nicht hinzugefügt werden');
        }
    };

    const handleUpdateBetrag = async (id, newBetrag) => {
        try {
            await axios.put(`/api/abrechnungstraeger/${id}`, {
                betrag: newBetrag,
                gueltig_ab: new Date().toISOString().split('T')[0]
            });
            showNotification('Erfolg', 'Erstattungsbetrag wurde aktualisiert');
            fetchAbrechnungstraeger();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Betrags:', error);
            showNotification('Fehler', 'Erstattungsbetrag konnte nicht aktualisiert werden');
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

    // Drag & Drop Funktionen
    const handleDragStart = (e, item) => {
        setDraggedItem(item);
        setIsDragging(true);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e, targetItem) => {
        e.preventDefault();
        setIsDragging(false);

        if (!draggedItem || draggedItem.id === targetItem.id) return;

        const newOrder = [...abrechnungstraeger];
        const draggedIndex = newOrder.findIndex(item => item.id === draggedItem.id);
        const targetIndex = newOrder.findIndex(item => item.id === targetItem.id);

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedItem);

        // Update sort_order für alle Einträge
        const sortOrderUpdates = newOrder.map((item, index) => ({
            id: item.id,
            sort_order: index + 1
        }));

        try {
            await axios.put('/api/abrechnungstraeger/sort', { sortOrder: sortOrderUpdates });
            fetchAbrechnungstraeger();
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Reihenfolge:', error);
            showNotification('Fehler', 'Reihenfolge konnte nicht aktualisiert werden');
        }
    };

    if (isLoading) return <div>Laden...</div>;

    return (
        <div className="space-y-6">
            {/* Formular für neue Einträge */}
            <form onSubmit={handleAddNew} className="card-container-highlight space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        value={newEntry.name}
                        onChange={e => setNewEntry({...newEntry, name: e.target.value})}
                        placeholder="Name"
                        className="form-input flex-1"
                        required
                    />
                    <input
                        type="text"
                        value={newEntry.kennzeichen}
                        onChange={e => setNewEntry({...newEntry, kennzeichen: e.target.value})}
                        placeholder="Kennzeichen"
                        className="form-input w-40"
                        required
                    />
                    <input
                        type="number"
                        value={newEntry.betrag}
                        onChange={e => setNewEntry({...newEntry, betrag: e.target.value})}
                        step="0.01"
                        min="0"
                        className="form-input w-32"
                        required
                    />
                    <button type="submit" className="btn-primary">
                        Hinzufügen
                    </button>
                </div>
            </form>

            {/* Liste der Abrechnungsträger */}
            <div className="space-y-2">
                {abrechnungstraeger.map((traeger) => (
                    <div
                        key={traeger.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, traeger)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, traeger)}
                        className={`card-container flex items-center justify-between p-4 ${
                            isDragging ? 'cursor-move' : ''
                        } ${traeger.active ? '' : 'opacity-50'}`}
                    >
                        <div className="flex items-center gap-4 flex-1">
                            <div className="flex-1">
                                <div className="font-medium text-value">{traeger.name}</div>
                                <div className="text-xs text-label">{traeger.kennzeichen}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={traeger.aktueller_betrag}
                                    onChange={(e) => handleUpdateBetrag(traeger.id, e.target.value)}
                                    step="0.01"
                                    min="0"
                                    className="form-input w-24"
                                />
                                <span className="text-sm text-label">€/km</span>
                            </div>
                            <button
                                onClick={() => handleToggleActive(traeger.id, traeger.active)}
                                className={`btn-secondary text-sm ${traeger.active ? '' : 'opacity-50'}`}
                            >
                                {traeger.active ? 'Aktiv' : 'Inaktiv'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}