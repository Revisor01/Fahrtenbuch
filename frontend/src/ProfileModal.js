import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';
import AbrechnungstraegerForm from './components/AbrechnungstraegerForm';
import ErstattungssaetzeForm from './components/ErstattungssaetzeForm';
import OrtForm from './components/OrtForm';
import OrteListe from './components/OrteListe';
import DistanzForm from './components/DistanzForm';
import DistanzenListe from './components/DistanzenListe';
    
function ProfileModal({ isOpen, onClose }) {
    const { token, user, setUser, showNotification, refreshAllData } = useContext(AppContext);
    const [profile, setProfile] = useState({});
    const [activeTab, setActiveTab] = useState('profile');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [apiKeys, setApiKeys] = useState([]);
    const [newKeyDescription, setNewKeyDescription] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);

    const tabs = [
        { id: 'profile', name: 'Profil' },
        { id: 'orte', name: 'Orte' },
        { id: 'distanzen', name: 'Distanzen' },
        { id: 'abrechnungen', name: 'Träger' },
        { id: 'erstattungssaetze', name: 'Erstattungen' },
        { id: 'security', name: 'Passwort' },
        { id: 'api', name: 'API-Zugriff' }
    ];

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
            fetchApiKeys();
        } else {
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setGeneratedKey(null);
        setNewKeyDescription('');
    };

    const fetchProfile = async () => {
        try {
            const response = await axios.get('/api/profile');
            const profileData = {
                ...response.data,
                fullName: response.data.full_name
            };
            setProfile(profileData);
            setUser({ ...user, email_verified: profileData.email_verified });
        } catch (error) {
            console.error('Fehler beim Abrufen des Profils:', error);
            showNotification('Fehler', 'Profil konnte nicht geladen werden');
        }
    };

    const fetchApiKeys = async () => {
        try {
            const response = await axios.get('/api/keys');
            setApiKeys(response.data);
        } catch (error) {
            console.error('Fehler beim Laden der API Keys:', error);
            showNotification('Fehler', 'API Keys konnten nicht geladen werden');
        }
    };
    
    const handleDeleteKey = (keyId) => {
        showNotification(
            'API-Key löschen',
            'Möchten Sie diesen API-Key wirklich löschen?',
            async () => {
                try {
                    await axios.delete(`/api/keys/${keyId}`);
                    await fetchApiKeys();
                    showNotification('Erfolg', 'API Key wurde gelöscht');
                } catch (error) {
                    console.error('Fehler beim Löschen des API Keys:', error);
                    showNotification('Fehler', 'API Key konnte nicht gelöscht werden');
                }
            },
            true
        );
    };
    
    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const cleanProfile = { ...profile };
            delete cleanProfile.wohnort;
            delete cleanProfile.wohnort_adresse;
            delete cleanProfile.dienstort;
            delete cleanProfile.dienstort_adresse;
            delete cleanProfile.username;

            await axios.put('/api/profile', cleanProfile);
            showNotification('Erfolg', 'Profil wurde aktualisiert');
            fetchProfile();
            await refreshAllData(); // Hier aufrufen
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Profils:', error);
            showNotification('Fehler', 'Profil konnte nicht aktualisiert werden');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('Fehler', 'Die Passwörter stimmen nicht überein');
            return;
        }
        try {
            await axios.put('/api/profile/change-password', {
                oldPassword,
                newPassword,
                confirmPassword
            });
            showNotification('Erfolg', 'Passwort wurde geändert');
            resetForm();
        } catch (error) {
            console.error('Fehler beim Ändern des Passworts:', error);
            showNotification('Fehler', error.response?.data?.message || 'Passwort konnte nicht geändert werden');
        }
    };

    const handleGenerateKey = async () => {
        try {
            setIsGeneratingKey(true);
            const response = await axios.post('/api/keys', {
                description: newKeyDescription || 'API Key für Kurzbefehle'
            });
            setGeneratedKey(response.data.key);
            fetchApiKeys();
            setNewKeyDescription('');
        } catch (error) {
            console.error('Fehler beim Generieren des API Keys:', error);
            showNotification('Fehler', 'API Key konnte nicht generiert werden');
        } finally {
            setIsGeneratingKey(false);
        }
    };



    const handleResendVerification = async () => {
        try {
            await axios.post('/api/users/resend-verification', {
                email: profile.email
            });
            showNotification('Erfolg', 'Verifizierungs-E-Mail wurde erneut gesendet');
        } catch (error) {
            console.error('Fehler beim Senden der Verifizierungs-E-Mail:', error);
            showNotification('Fehler', 'Verifizierungs-E-Mail konnte nicht gesendet werden');
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Einstellungen" size="wide">
        <div className="flex flex-col h-full">
        {/* Sticky Navigation */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 -mt-4 mb-4 border-b border-primary-100 dark:border-primary-800">
        {/* Tabs Desktop */}
        <div className="hidden sm:flex space-x-1">
        {tabs.map(tab => (
            <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
                                py-2 px-4 text-sm font-medium 
                                border-b-2 -mb-px
                                ${activeTab === tab.id
                ? 'border-primary-500 text-primary-600 dark:text-primary-100'
                : 'border-transparent text-muted hover:text-value hover:border-primary-200'
                }
                            `}
            >
            {tab.name}
            </button>
        ))}
        </div>
        
        {/* Tabs Mobile */}
        <div className="sm:hidden py-2">
        <select
        value={activeTab}
        onChange={(e) => setActiveTab(e.target.value)}
        className="form-select w-full"
        >
        {tabs.map(tab => (
            <option key={tab.id} value={tab.id}>
            {tab.name}
            </option>
        ))}
        </select>
        </div>
        </div>
        
        {/* Content-Bereich */}
        <div className="flex-1">
        {activeTab === 'profile' && (
            <div className="space-y-4">
            <div className="card-container-highlight">
            <h3 className="text-lg font-medium text-value mb-4">Persönliche Daten</h3>
            <p className="text-sm text-muted mb-6">
            Ihre persönlichen Daten werden für die Abrechnungen benötigt. 
            Bitte stellen Sie sicher, dass diese Daten aktuell sind.
            </p>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="relative w-full">
            <label className="form-label">E-Mail</label>
            <input
            type="email"
            value={profile.email || ''}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className={`form-input ${
                profile.email_verified
                ? 'border-primary-200 bg-primary-25'
                : 'border-secondary-200 bg-secondary-25'
            }`}
            />
            <div className="flex justify-end mt-1">
            {profile.email_verified ? (
                <span className="text-primary-600 text-xs">● Verifiziert</span>
            ) : (
                <div className="flex items-center gap-2">
                <span className="text-secondary-600 text-xs">○ Ausstehend</span>
                <button
                type="button"
                onClick={handleResendVerification}
                className="text-secondary-600 hover:text-secondary-700 text-xs underline"
                >
                Erneut senden
                </button>
                </div>
            )}
            </div>
            </div>
            
            <div>
            <label className="form-label">Voller Name</label>
            <input
            type="text"
            value={profile.fullName || ''}
            onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            className="form-input"
            placeholder="z.B. Max Mustermann"
            />
            </div>
            
            <div>
            <label className="form-label">IBAN</label>
            <input
            type="text"
            value={profile.iban || ''}
            onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
            className="form-input"
            placeholder="DE12 3456 7890 1234 5678 90"
            />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
            <label className="form-label">Kirchengemeinde</label>
            <input
            type="text"
            value={profile.kirchengemeinde || ''}
            onChange={(e) => setProfile({ ...profile, kirchengemeinde: e.target.value })}
            className="form-input"
            />
            </div>
            
            <div>
            <label className="form-label">Kirchspiel</label>
            <input
            type="text"
            value={profile.kirchspiel || ''}
            onChange={(e) => setProfile({ ...profile, kirchspiel: e.target.value })}
            className="form-input"
            />
            </div>
            
            <div>
            <label className="form-label">Kirchenkreis</label>
            <input
            type="text"
            value={profile.kirchenkreis || ''}
            onChange={(e) => setProfile({ ...profile, kirchenkreis: e.target.value })}
            className="form-input"
            />
            </div>
            </div>
            
            <div className="flex justify-end">
            <button type="submit" className="btn-primary mobile-full">
            Speichern
            </button>
            </div>
            </form>
            </div>
            </div>
        )}
        
        {activeTab === 'orte' && (
            <div>
            <OrtForm />
            <div className="mt-6">
            <OrteListe />
            </div>
            </div>
        )}
        
        {activeTab === 'distanzen' && (
            <div>
            <DistanzForm />
            <div className="mt-6">
            <DistanzenListe />
            </div>
            </div>
        )}
        
        {activeTab === 'abrechnungen' && (
            <div>
            <AbrechnungstraegerForm />
            </div>
        )}
        
        {activeTab === 'erstattungssaetze' && (
            <div>
            <ErstattungssaetzeForm />
            </div>
        )}
        
        {activeTab === 'security' && (
            <div className="space-y-6">
            <div className="card-container-highlight">
            <h3 className="text-lg font-medium text-value mb-4">Passwort ändern</h3>
            <p className="text-sm text-muted mb-6">
            Aus Sicherheitsgründen sollten Sie Ihr Passwort regelmäßig ändern. 
            Wählen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
            </p>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
            <label className="form-label">Aktuelles Passwort</label>
            <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className="form-input"
            required
            />
            </div>
            
            <div>
            <label className="form-label">Neues Passwort</label>
            <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="form-input"
            required
            />
            {newPassword && (
                <div className="mt-2">
                <div className="text-xs space-y-1">
                <div className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{newPassword.length >= 8 ? '●' : '○'}</span>
                <span>Mindestens 8 Zeichen</span>
                </div>
                <div className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{/[A-Z]/.test(newPassword) ? '●' : '○'}</span>
                <span>Großbuchstaben</span>
                </div>
                <div className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{/[a-z]/.test(newPassword) ? '●' : '○'}</span>
                <span>Kleinbuchstaben</span>
                </div>
                <div className={`flex items-center gap-2 ${/\d/.test(newPassword) ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{/\d/.test(newPassword) ? '●' : '○'}</span>
                <span>Mindestens eine Zahl</span>
                </div>
                </div>
                </div>
            )}
            </div>
            
            <div>
            <label className="form-label">Passwort bestätigen</label>
            <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="form-input"
            required
            />
            </div>
            
            <div className="flex justify-end">
            <button type="submit" className="btn-primary w-full sm:w-auto">
            Passwort ändern
            </button>
            </div>
            </form>
            </div>
            </div>
        )}
        
        {activeTab === 'api' && (
            <div className="space-y-6">
            {/* Form Card */}
            <div className="card-container-highlight">
            <h3 className="text-lg font-medium text-value mb-4">API Key erstellen</h3>
            <p className="text-sm text-muted mb-6">
            Mit API Keys können Sie Ihre Fahrten über externe Anwendungen oder Kurzbefehle verwalten.
            Jeder Key sollte einen eindeutigen Verwendungszweck haben.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="w-full">
            <label className="form-label">Beschreibung</label>
            <input
            type="text"
            placeholder="z.B. iOS Shortcuts"
            value={newKeyDescription}
            onChange={(e) => setNewKeyDescription(e.target.value)}
            className="form-input"
            />
            </div>
            <div className="flex items-end w-full sm:w-1/6">
            <button
            type="button"
            onClick={handleGenerateKey}
            disabled={isGeneratingKey}
            className="btn-primary w-full">
            {isGeneratingKey ? 'Generiere...' : 'Neuer API Key'}
            </button>
            </div>
            </div>
            
            {generatedKey && (
                <div className="mt-6 p-4 bg-primary-25 dark:bg-primary-900 rounded-lg border border-primary-100 dark:border-primary-800">
                <p className="text-sm text-value font-medium mb-2">Neuer API Key erstellt</p>
                <p className="text-sm text-label mb-4">Kopieren Sie den Key jetzt - er wird nur einmal angezeigt!</p>
                <div className="flex gap-2 items-center">
                <code className="flex-1 bg-white dark:bg-gray-800 p-3 rounded text-sm break-all">
                {generatedKey}
                </code>
                <button
                onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                    showNotification('Erfolg', 'API Key wurde kopiert');
                }}
                className="btn-secondary whitespace-nowrap">
                Kopieren
                </button>
                </div>
                </div>
            )}
            </div>
            
            {/* List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {apiKeys.length === 0 ? (
                <div className="card-container col-span-2">
                <p className="text-sm text-muted text-center py-4">
                Noch keine API Keys generiert
                </p>
                </div>
            ) : (
                apiKeys.map(key => (
                    <div key={key.id} className="card-container">
                    <div className="flex items-start justify-between">
                    <div>
                    <div className="font-medium text-value">
                    {key.description || 'API Key'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                        key.is_active 
                        ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300' 
                        : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900 dark:text-secondary-300'
                    }`}>
                    {key.is_active ? '● Aktiv' : '○ Inaktiv'}
                    </span>
                    </div>
                    <div className="text-xs text-label mt-2">
                    <div>Erstellt: {new Date(key.created_at).toLocaleDateString()}</div>
                    {key.last_used_at && (
                        <div>Zuletzt verwendet: {new Date(key.last_used_at).toLocaleDateString()}</div>
                    )}
                    </div>
                    </div>
                    <div>
                    <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="table-action-button-secondary"
                    title="Löschen">
                    ×
                    </button>
                    </div>
                    </div>
                    </div>
                ))
            )}
            </div>
            </div>

        )}
        </div>
        </div>
        </Modal>
    );
}

export default ProfileModal;