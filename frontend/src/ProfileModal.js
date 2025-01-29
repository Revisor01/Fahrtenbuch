import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';
import AbrechnungstraegerForm from './AbrechnungstraegerForm';
import ErstattungssaetzeForm from './ErstattungssaetzeForm';

function ProfileModal({ isOpen, onClose }) {
    const { token, user, setUser, showNotification } = useContext(AppContext);
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
        { id: 'abrechnungen', name: 'Abrechnungsträger' },
        { id: 'erstattungssaetze', name: 'Erstattungssätze' },
        { id: 'security', name: 'Sicherheit' },
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
    
    const handleDeleteKey = async (keyId) => {
        try {
            await axios.delete(`/api/keys/${keyId}/permanent`);
            await fetchApiKeys();
            showNotification('Erfolg', 'API Key wurde permanent gelöscht');
        } catch (error) {
            console.error('Fehler beim Löschen des API Keys:', error);
            showNotification('Fehler', 'API Key konnte nicht gelöscht werden');
        }
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
            <div className="space-y-6">
                {/* Tab Navigation */}
                <div className="border-b border-primary-100 dark:border-primary-800">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    py-2 px-1 border-b-2 font-medium text-sm
                                    ${activeTab === tab.id
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-muted hover:text-value hover:border-primary-300'
                                    }
                                `}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Inhalte */}
                <div className="mt-6">
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div className="relative">
                                <input
                                    type="email"
                                    placeholder="E-Mail"
                                    value={profile.email || ''}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className={`form-input ${
                                        profile.email_verified
                                            ? 'border-primary-200 dark:border-primary-700 bg-primary-25 dark:bg-primary-900'
                                            : 'border-secondary-200 dark:border-secondary-700 bg-secondary-25 dark:bg-secondary-900'
                                    }`}
                                />
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                                    {profile.email_verified ? (
                                        <span className="text-label text-xs">● Verifiziert</span>
                                    ) : (
                                        <>
                                            <span className="text-muted text-xs">○ Ausstehend</span>
                                            <button
                                                type="button"
                                                onClick={handleResendVerification}
                                                className="text-label hover:text-value text-xs"
                                            >
                                                Erneut senden
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="Voller Name"
                                value={profile.fullName || ''}
                                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                className="form-input"
                            />

                            <input
                                type="text"
                                placeholder="IBAN"
                                value={profile.iban || ''}
                                onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
                                className="form-input"
                            />

                            <input
                                type="text"
                                placeholder="Kirchengemeinde"
                                value={profile.kirchengemeinde || ''}
                                onChange={(e) => setProfile({ ...profile, kirchengemeinde: e.target.value })}
                                className="form-input"
                            />

                            <input
                                type="text"
                                placeholder="Kirchspiel"
                                value={profile.kirchspiel || ''}
                                onChange={(e) => setProfile({ ...profile, kirchspiel: e.target.value })}
                                className="form-input"
                            />

                            <input
                                type="text"
                                placeholder="Kirchenkreis"
                                value={profile.kirchenkreis || ''}
                                onChange={(e) => setProfile({ ...profile, kirchenkreis: e.target.value })}
                                className="form-input"
                            />

                            <button type="submit" className="btn-primary w-full">
                                Profil aktualisieren
                            </button>
                        </form>
                    )}

                    {activeTab === 'abrechnungen' && (
                        <div>
                            <div className="text-sm text-muted mb-4">
                                Hier können Sie Ihre Abrechnungsträger verwalten. Ein Abrechnungsträger 
                                ist eine Organisation oder Institution, die Ihre Fahrtkosten erstattet.
                            </div>
                            <AbrechnungstraegerForm />
                        </div>
                    )}

        {activeTab === 'erstattungssaetze' && (
            <div>
            <div className="text-sm text-muted mb-4">
            Hier können Sie die Erstattungssätze für alle Abrechnungsarten verwalten.
            </div>
            <ErstattungssaetzeForm />
            </div>
        )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <h3 className="text-lg font-medium text-value mb-4">Passwort ändern</h3>
                                
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
                                
                                <button type="submit" className="btn-primary w-full">
                                    Passwort ändern
                                </button>
                            </form>
                        </div>
                    )}

        {activeTab === 'api' && (
            <div className="space-y-6">
            <div className="space-y-4">
            <h3 className="text-lg font-medium text-value">API Keys für Kurzbefehle</h3>
            <div className="text-sm text-muted">
            Mit API Keys können Sie Ihre Fahrten über externe Anwendungen oder Kurzbefehle verwalten.
            </div>
            
            {/* API Key Generator */}
            <div className="space-y-4 mb-6">
            <div className="flex gap-2">
            <input
            type="text"
            placeholder="Beschreibung (optional)"
            value={newKeyDescription}
            onChange={(e) => setNewKeyDescription(e.target.value)}
            className="form-input flex-1"
            />
            <button
            onClick={handleGenerateKey}
            disabled={isGeneratingKey}
            className="btn-primary whitespace-nowrap"
            >
            {isGeneratingKey ? 'Generiere...' : 'Neuer API Key'}
            </button>
            </div>
            
            {/* Zeige neu generierten Key an */}
            {generatedKey && (
                <div className="bg-primary-25 dark:bg-primary-900 p-4 rounded-lg space-y-2">
                <p className="text-sm text-label">
                Dein neuer API Key (kopiere ihn jetzt - er wird nur einmal angezeigt):
                </p>
                <div className="flex gap-2 items-center">
                <code className="flex-1 bg-white dark:bg-gray-800 p-2 rounded text-sm break-all">
                {generatedKey}
                </code>
                <button
                onClick={() => {
                    navigator.clipboard.writeText(generatedKey);
                    showNotification('Erfolg', 'API Key wurde kopiert');
                }}
                className="btn-secondary"
                >
                Kopieren
                </button>
                </div>
                </div>
            )}
            </div>
            
            {/* API Key Liste */}
            <div className="space-y-2">
            {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-primary-25 dark:bg-primary-900 rounded">
                <div className="flex-1">
                <p className="text-sm text-value font-medium">
                {key.description}
                </p>
                <p className="text-xs text-label">
                Erstellt: {new Date(key.created_at).toLocaleDateString()}
                {key.last_used_at && ` • Zuletzt verwendet: ${new Date(key.last_used_at).toLocaleDateString()}`}
                </p>
                </div>
                <button
                onClick={() => handleDeleteKey(key.id)}
                className="btn-secondary text-xs"
                >
                Löschen
                </button>
                </div>
            ))}
            
            {apiKeys.length === 0 && (
                <p className="text-sm text-muted text-center py-4">
                Noch keine API Keys generiert!
                </p>
            )}
            </div>
            </div>
            </div>
        )}
        </div>
        </div>
        </Modal>
    );
}

export default ProfileModal;