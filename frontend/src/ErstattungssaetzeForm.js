import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';

function ErstattungssaetzeForm() {
    const { showNotification } = useContext(AppContext);
    const [erstattungssaetze, setErstattungssaetze] = useState({
        mitfahrer: [],
        abrechnungstraeger: []
    });
    const [showHistorie, setShowHistorie] = useState({});
    const [editingSatz, setEditingSatz] = useState(null);
    const [newErstattung, setNewErstattung] = useState({
        typ: 'mitfahrer',
        betrag: '',
        gueltig_ab: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchAllErstattungssaetze();
    }, []);

    const fetchAllErstattungssaetze = async () => {
        try {
            const [mitfahrerRes, traegerRes] = await Promise.all([
                axios.get('/api/mitfahrer-erstattung/historie'),
                axios.get('/api/abrechnungstraeger')
            ]);

            setErstattungssaetze({
                mitfahrer: mitfahrerRes.data,
                abrechnungstraeger: traegerRes.data
            });
        } catch (error) {
            console.error('Fehler beim Laden der Erstattungssätze:', error);
            showNotification('Fehler', 'Erstattungssätze konnten nicht geladen werden');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (newErstattung.typ === 'mitfahrer') {
                await axios.post('/api/mitfahrer-erstattung', {
                    betrag: parseFloat(newErstattung.betrag),
                    gueltig_ab: newErstattung.gueltig_ab
                });
            } else {
                const id = newErstattung.typ; // ID des Abrechnungsträgers
                await axios.post(`/api/abrechnungstraeger/${id}/erstattung`, {
                    betrag: parseFloat(newErstattung.betrag),
                    gueltig_ab: newErstattung.gueltig_ab
                });
            }
            
            showNotification('Erfolg', 'Erstattungssatz wurde gespeichert');
            setNewErstattung({
                typ: 'mitfahrer',
                betrag: '',
                gueltig_ab: new Date().toISOString().split('T')[0]
            });
            fetchAllErstattungssaetze();
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            showNotification('Fehler', 'Erstattungssatz konnte nicht gespeichert werden');
        }
    };

    const handleEdit = (satz, typ) => {
        setEditingSatz({
            id: satz.id,
            typ: typ,
            betrag: parseFloat(satz.betrag),
            gueltig_ab: new Date(satz.gueltig_ab).toISOString().split('T')[0]  // Datum korrekt formatieren
        });
    };

    const handleSaveEdit = async () => {
        try {
            if (editingSatz.typ === 'mitfahrer') {
                await axios.put(`/api/mitfahrer-erstattung/${editingSatz.id}`, {
                    betrag: parseFloat(editingSatz.betrag),
                    gueltig_ab: editingSatz.gueltig_ab
                });
            } else {
                await axios.put(`/api/abrechnungstraeger/${editingSatz.id}/erstattung/${editingSatz.erstattungssatzId}`, {
                    betrag: parseFloat(editingSatz.betrag),
                    gueltig_ab: editingSatz.gueltig_ab
                });
            }
            
            showNotification('Erfolg', 'Erstattungssatz wurde aktualisiert');
            setEditingSatz(null);
            fetchAllErstattungssaetze();
        } catch (error) {
            console.error('Fehler beim Aktualisieren:', error);
            showNotification('Fehler', 'Erstattungssatz konnte nicht aktualisiert werden');
        }
    };

    const handleDelete = async (id, typ) => {
        try {
            if (typ === 'mitfahrer') {
                await axios.delete(`/api/mitfahrer-erstattung/${id}`);
            } else {
                await axios.delete(`/api/abrechnungstraeger/${typ}/erstattung/${id}`);
            }
            showNotification('Erfolg', 'Erstattungssatz wurde gelöscht');
            fetchAllErstattungssaetze();
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            showNotification('Fehler', error.response?.data?.message || 'Erstattungssatz konnte nicht gelöscht werden');
        }
    };

    return (
        <div className="space-y-6">
            {/* Formular für neue Erstattungssätze */}
            <form onSubmit={handleSubmit} className="card-container-highlight space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                        <label className="form-label">Typ</label>
                        <select
                            value={newErstattung.typ}
                            onChange={(e) => setNewErstattung({...newErstattung, typ: e.target.value})}
                            className="form-select"
                        >
                            <option value="mitfahrer">Mitfahrer:innen</option>
                            {erstattungssaetze.abrechnungstraeger.map(traeger => (
                                <option key={traeger.id} value={traeger.id}>
                                    {traeger.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-32">
                        <label className="form-label">Betrag (€/km)</label>
                        <input
                            type="number"
                            value={newErstattung.betrag}
                            onChange={(e) => setNewErstattung({...newErstattung, betrag: e.target.value})}
                            step="0.01"
                            min="0"
                            className="form-input"
                            required
                        />
                    </div>
                    <div className="w-40">
                        <label className="form-label">Gültig ab</label>
                        <input
                            type="date"
                            value={newErstattung.gueltig_ab}
                            onChange={(e) => setNewErstattung({...newErstattung, gueltig_ab: e.target.value})}
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

            {/* Mitfahrer Erstattungssätze */}
            <div className="card-container">
                <h3 className="text-lg font-medium text-value mb-4">Mitfahrer:innen Erstattungssätze</h3>
                <div className="space-y-2">
                    {erstattungssaetze.mitfahrer.map((satz) => (
                        <div key={satz.id} className="flex items-center justify-between p-2 bg-primary-25 dark:bg-primary-900 rounded">
                            {editingSatz?.id === satz.id && editingSatz?.typ === 'mitfahrer' ? (
                                <div className="flex items-center gap-4 w-full">
                                    <input
                                        type="number"
                                        value={editingSatz.betrag}
                                        onChange={(e) => setEditingSatz({...editingSatz, betrag: e.target.value})}
                                        step="0.01"
                                        min="0"
                                        className="form-input w-24"
                                    />
                                    <input
                                        type="date"
                                        value={editingSatz.gueltig_ab}
                                        onChange={(e) => setEditingSatz({...editingSatz, gueltig_ab: e.target.value})}
                                        className="form-input w-40"
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={handleSaveEdit} className="table-action-button-primary">
                                            ✓
                                        </button>
                                        <button onClick={() => setEditingSatz(null)} className="table-action-button-secondary">
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <div className="text-value font-medium">
                                            {parseFloat(satz.betrag).toFixed(2)} € pro km
                                        </div>
                                        <div className="text-xs text-label">
                                            Gültig ab: {new Date(satz.gueltig_ab).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleEdit(satz, 'mitfahrer')} className="table-action-button-primary">
                                            ✎
                                        </button>
                                        <button onClick={() => handleDelete(satz.id, 'mitfahrer')} className="table-action-button-secondary">
                                            ×
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Abrechnungsträger Erstattungssätze */}
        {erstattungssaetze.abrechnungstraeger.map(traeger => (
            <div key={traeger.id} className="card-container">
            <h3 className="text-lg font-medium text-value mb-4">
            {traeger.name}
            <span className="text-sm text-label ml-2">
            Aktuell: {parseFloat(traeger.aktueller_betrag || 0).toFixed(2)} €/km
            </span>
            </h3>
            <div className="space-y-2">
            {traeger.erstattungsbetraege?.map((satz) => (
                <div key={satz.id} className="flex items-center justify-between p-2 bg-primary-25 dark:bg-primary-900 rounded">
                {editingSatz?.id === satz.id && editingSatz?.typ === traeger.id ? (
                    <div className="flex items-center gap-4 w-full">
                    <input
                    type="number"
                    value={editingSatz.betrag}
                    onChange={(e) => setEditingSatz({...editingSatz, betrag: e.target.value})}
                    step="0.01"
                    min="0"
                    className="form-input w-24"
                    />
                    <input
                    type="date"
                    value={editingSatz.gueltig_ab}
                    onChange={(e) => setEditingSatz({...editingSatz, gueltig_ab: e.target.value})}
                    className="form-input w-40"
                    />
                    <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="table-action-button-primary">
                    ✓
                    </button>
                    <button onClick={() => setEditingSatz(null)} className="table-action-button-secondary">
                    ×
                    </button>
                    </div>
                    </div>
                ) : (
                    <>
                    <div className="flex-1">
                    <div className="text-value font-medium">
                    {parseFloat(satz.betrag).toFixed(2)} € pro km
                    </div>
                    <div className="text-xs text-label">
                    Gültig ab: {new Date(satz.gueltig_ab).toLocaleDateString()}
                    </div>
                    </div>
                    <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(satz, traeger.id)} className="table-action-button-primary">
                    ✎
                    </button>
                    <button onClick={() => handleDelete(satz.id, traeger.id)} className="table-action-button-secondary">
                    ×
                    </button>
                    </div>
                    </>
                )}
                </div>
            ))}
            </div>
            </div>
        ))}
        </div>
    );
}

export default ErstattungssaetzeForm;