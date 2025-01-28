// MitfahrerErstattungForm.js
import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AppContext } from './App';

export default function MitfahrerErstattungForm() {
    const { showNotification } = useContext(AppContext);
    const [currentBetrag, setCurrentBetrag] = useState(null);
    const [historie, setHistorie] = useState([]);
    const [newBetrag, setNewBetrag] = useState('');
    const [gueltigAb, setGueltigAb] = useState(
        new Date().toISOString().split('T')[0]
    );

    const getDefaultBetrag = (currentBetrag) => {
        if (!currentBetrag) return 0.05;
        const betrag = parseFloat(currentBetrag.betrag);
        return isNaN(betrag) ? 0.05 : betrag;
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [currentResponse, historieResponse] = await Promise.all([
                axios.get('/api/mitfahrer-erstattung/current'),
                axios.get('/api/mitfahrer-erstattung/historie')
            ]);
            setCurrentBetrag(currentResponse.data);
            setHistorie(historieResponse.data);
        } catch (error) {
            console.error('Fehler beim Laden der Mitfahrer-Erstattung:', error);
            showNotification('Fehler', 'Daten konnten nicht geladen werden');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/mitfahrer-erstattung', {
                betrag: parseFloat(newBetrag),
                gueltig_ab: gueltigAb
            });
            showNotification('Erfolg', 'Erstattungssatz wurde aktualisiert');
            setNewBetrag('');
            fetchData();
        } catch (error) {
            console.error('Fehler beim Setzen des Erstattungssatzes:', error);
            showNotification('Fehler', 'Erstattungssatz konnte nicht aktualisiert werden');
        }
    };

    return (
        <div className="space-y-6">
            {/* Aktueller Erstattungssatz */}
            <div className="card-container">
                <h3 className="text-sm font-medium text-value mb-4">
                    Aktueller Mitfahrer-Erstattungssatz
                </h3>
                <div className="flex items-baseline space-x-2">
        <span className="text-2xl font-bold text-value">
        {getDefaultBetrag(currentBetrag).toFixed(2)}
        </span>
                    <span className="text-sm text-label">€ pro km und Mitfahrer:in</span>
                </div>
                {currentBetrag?.gueltig_ab && (
                    <div className="mt-2 text-xs text-label">
                        Gültig seit: {new Date(currentBetrag.gueltig_ab).toLocaleDateString()}
                    </div>
                )}
            </div>

            {/* Neuer Erstattungssatz */}
            <form onSubmit={handleSubmit} className="card-container-highlight space-y-4">
                <h3 className="text-sm font-medium text-value mb-2">
                    Neuen Erstattungssatz festlegen
                </h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs text-label mb-1">
                            Betrag pro km und Mitfahrer:in
                        </label>
                        <input
                            type="number"
                            value={newBetrag}
                            onChange={(e) => setNewBetrag(e.target.value)}
                            step="0.01"
                            min="0"
                            className="form-input"
                            placeholder="z.B. 0.05"
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs text-label mb-1">
                            Gültig ab
                        </label>
                        <input
                            type="date"
                            value={gueltigAb}
                            onChange={(e) => setGueltigAb(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="flex items-end">
                        <button type="submit" className="btn-primary w-full sm:w-auto">
                            Speichern
                        </button>
                    </div>
                </div>
            </form>

            {/* Historie */}
            {historie.length > 0 && (
                <div className="card-container">
                    <h3 className="text-sm font-medium text-value mb-4">
                        Bisherige Erstattungssätze
                    </h3>
                    <div className="space-y-2">
                        {historie.map((eintrag, index) => (
                            <div 
                                key={index}
                                className="flex justify-between items-center py-2 border-b last:border-0 border-primary-100 dark:border-primary-800"
                            >
                                <div className="text-value">
                                    {eintrag.betrag.toFixed(2)} €
                                </div>
                                <div className="text-xs text-label">
                                    Gültig ab: {new Date(eintrag.gueltig_ab).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}