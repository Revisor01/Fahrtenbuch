import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AppContext } from './App';

function ErstattungssatzEditor({ satz, onSave, onCancel }) {
    const [betrag, setBetrag] = useState(satz.betrag);
    const [gueltigAb, setGueltigAb] = useState(satz.gueltig_ab);

    return (
        <div className="flex items-center gap-2 p-2">
            <input
                type="number"
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
                step="0.01"
                min="0"
                className="form-input w-24"
            />
            <input
                type="date"
                value={gueltigAb}
                onChange={(e) => setGueltigAb(e.target.value)}
                className="form-input w-32"
            />
            <button 
                onClick={() => onSave({ betrag, gueltig_ab: gueltigAb })}
                className="btn-primary text-xs"
            >
                ✓
            </button>
            <button 
                onClick={onCancel}
                className="btn-secondary text-xs"
            >
                ×
            </button>
        </div>
    );
}

export default function AbrechnungstraegerForm() {
    const { showNotification } = useContext(AppContext);
    const [abrechnungstraeger, setAbrechnungstraeger] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showHistorie, setShowHistorie] = useState({});
    const [editingSatz, setEditingSatz] = useState(null);
    const [newEntry, setNewEntry] = useState({
        name: '',
        kennzeichen: '',
        betrag: '0.30',
        gueltig_ab: new Date().toISOString().split('T')[0]
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

    const fetchHistorie = async (traegerId) => {
        try {
            const response = await axios.get(`/api/abrechnungstraeger/${traegerId}/historie`);
            return response.data;
        } catch (error) {
            console.error('Fehler beim Laden der Historie:', error);
            showNotification('Fehler', 'Historie konnte nicht geladen werden');
        }
    };

    const handleAddNew = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/abrechnungstraeger', newEntry);
            showNotification('Erfolg', 'Abrechnungsträger wurde hinzugefügt');
            setNewEntry({
                name: '',
                kennzeichen: '',
                betrag: '0.30',
                gueltig_ab: new Date().toISOString().split('T')[0]
            });
            fetchAbrechnungstraeger();
        } catch (error) {
            console.error('Fehler beim Hinzufügen:', error);
            showNotification('Fehler', 'Abrechnungsträger konnte nicht hinzugefügt werden');
        }
    };
    
    const handleUpdateSatz = async (traegerId, satzId, daten) => {
        try {
            await axios.put(`/api/abrechnungstraeger/${traegerId}/erstattung/${satzId}`, daten);
            const historie = await fetchHistorie(traegerId);
            setShowHistorie(prev => ({
                ...prev,
                [traegerId]: historie
            }));
            setEditingSatz(null);
            showNotification('Erfolg', 'Erstattungssatz aktualisiert');
        } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
            showNotification('Fehler', error.response?.data?.message || 'Fehler beim Aktualisieren');
        }
    };
    
    const handleDeleteSatz = async (traegerId, satzId) => {
        try {
            await axios.delete(`/api/abrechnungstraeger/${traegerId}/erstattung/${satzId}`);
            const historie = await fetchHistorie(traegerId);
            setShowHistorie(prev => ({
                ...prev,
                [traegerId]: historie
            }));
            showNotification('Erfolg', 'Erstattungssatz gelöscht');
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            showNotification('Fehler', error.response?.data?.message || 'Fehler beim Löschen');
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
    
    if (isLoading) return <div>Laden...</div>;
    
    return (
        <div className="space-y-6">
        {/* Formular für neue Einträge */}
        <form onSubmit={handleAddNew} className="card-container-highlight space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
        <label className="block text-xs text-label mb-1">Name</label>
        <input
        type="text"
        value={newEntry.name}
        onChange={e => setNewEntry({...newEntry, name: e.target.value})}
        placeholder="z.B. Kirchenkreis"
        className="form-input"
        required
        />
        </div>
        <div className="w-32">
        <label className="block text-xs text-label mb-1">Kennzeichen</label>
        <input
        type="text"
        value={newEntry.kennzeichen}
        onChange={e => setNewEntry({...newEntry, kennzeichen: e.target.value})}
        placeholder="z.B. kk"
        className="form-input"
        required
        />
        </div>
        <div className="w-32">
        <label className="block text-xs text-label mb-1">€/km</label>
        <input
        type="number"
        value={newEntry.betrag}
        onChange={e => setNewEntry({...newEntry, betrag: e.target.value})}
        step="0.01"
        min="0"
        className="form-input"
        required
        />
        </div>
        <div>
        <label className="block text-xs text-label mb-1">Gültig ab</label>
        <input
        type="date"
        value={newEntry.gueltig_ab}
        onChange={e => setNewEntry({...newEntry, gueltig_ab: e.target.value})}
        className="form-input"
        required
        />
        </div>
        <div className="flex items-end">
        <button type="submit" className="btn-primary">
        Hinzufügen
        </button>
        </div>
        </div>
        </form>
        
        {/* Liste der Abrechnungsträger */}
        <div className="space-y-2">
        {abrechnungstraeger.map((traeger) => (
            <div key={traeger.id} className="card-container flex flex-col p-4">
            <div className="flex items-center justify-between">
            <div className="flex-1">
            <div className="font-medium text-value">{traeger.name}</div>
            <div className="text-xs text-label">{traeger.kennzeichen}</div>
            </div>
            <div className="flex items-center gap-2">
            <div className="relative">
            {/* Aktueller Betrag mit Historie-Toggle */}
            <div className="flex items-center gap-2">
            <input
            type="number"
            value={traeger.aktueller_betrag}
            onChange={(e) => handleUpdateSatz(traeger.id, e.target.value)}
            step="0.01"
            min="0"
            className="form-input w-24"
            />
            <span className="text-sm text-label">€/km</span>
            <button
            onClick={async () => {
                if (!showHistorie[traeger.id]) {
                    const historie = await fetchHistorie(traeger.id);
                    setShowHistorie(prev => ({
                        ...prev,
                        [traeger.id]: historie
                    }));
                } else {
                    setShowHistorie(prev => ({
                        ...prev,
                        [traeger.id]: null
                    }));
                }
            }}
            className="btn-secondary text-xs"
            >
            Historie
            </button>
            </div>
            
            {/* Historie Dropdown */}
            {showHistorie[traeger.id] && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-primary-100 dark:border-primary-700 z-10">
                <div className="p-4">
                <h4 className="text-sm font-medium text-value mb-2">Erstattungshistorie</h4>
                <div className="space-y-2">
                {showHistorie[traeger.id].map((eintrag) => (
                    <div key={eintrag.id} className="flex items-center justify-between text-xs p-2 hover:bg-primary-50 dark:hover:bg-primary-900">
                    {editingSatz === eintrag.id ? (
                        <ErstattungssatzEditor
                        satz={eintrag}
                        onSave={(daten) => handleUpdateSatz(traeger.id, eintrag.id, daten)}
                        onCancel={() => setEditingSatz(null)}
                        />
                    ) : (
                        <>
                        <div>
                        <div className="text-value font-medium">
                        {eintrag.betrag.toFixed(2)} €/km
                        </div>
                        <div className="text-label">
                        ab {new Date(eintrag.gueltig_ab).toLocaleDateString()}
                        </div>
                        </div>
                        <div className="flex gap-1">
                        <button
                        onClick={() => setEditingSatz(eintrag.id)}
                        className="text-primary-500 hover:text-primary-700"
                        >
                        ✎
                        </button>
                        {showHistorie[traeger.id].length > 1 && (
                            <button
                            onClick={() => handleDeleteSatz(traeger.id, eintrag.id)}
                            className="text-secondary-500 hover:text-secondary-700"
                            >
                            ×
                            </button>
                        )}
                        </div>
                        </>
                    )}
                    </div>
                ))}
                </div>
                </div>
                </div>
            )}
            </div>
            <button
            onClick={() => handleToggleActive(traeger.id, traeger.active)}
            className={`btn-secondary text-sm ${traeger.active ? '' : 'opacity-50'}`}
            >
            {traeger.active ? 'Aktiv' : 'Inaktiv'}
            </button>
            </div>
            </div>
            </div>
        ))}
        </div>
        </div>
    );
}