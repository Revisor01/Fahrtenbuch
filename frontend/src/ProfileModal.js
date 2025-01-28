import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';
import AbrechnungstraegerForm from './AbrechnungstraegerForm';
import MitfahrerErstattungForm from './MitfahrerErstattungForm';

function ProfileModal({ isOpen, onClose }) {
    const { token, user, setUser } = useContext(AppContext);
    const [profile, setProfile] = useState({});
    const inputClasses = "w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-sm";
    const buttonClasses = "w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition duration-200 text-sm";


    const [activeTab, setActiveTab] = useState('profile');
    const [originalProfile, setOriginalProfile] = useState({});
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);
    const [apiKeys, setApiKeys] = useState([]);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [newKeyDescription, setNewKeyDescription] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);

    const tabs = [
        { id: 'profile', name: 'Profil' },
        { id: 'abrechnungen', name: 'Abrechnungsträger' },
        { id: 'erstattung', name: 'Erstattungssätze' },
        { id: 'security', name: 'Sicherheit' },
        { id: 'api', name: 'API-Zugriff' }
    ];

    useEffect(() => {
        if (isOpen) {
            fetchProfile();
        } else {
            resetPasswordFields();
        }
    }, [isOpen]);

    const fetchProfile = async () => {
        try {
            const response = await axios.get('/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Hier das full_name korrekt zuweisen
            const profileData = {
                ...response.data,
                fullName: response.data.full_name
            };
            setProfile(profileData);
            setOriginalProfile(profileData);
            setUser({ ...user, email_verified: profileData.email_verified });
        } catch (error) {
            console.error('Fehler beim Abrufen des Profils:', error);
            showErrorMessage('Fehler beim Abrufen des Profils.');
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

            const response = await axios.put('/api/profile', cleanProfile, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(response.data.message);
            setShowMessage(true);
            // Profil neu laden nach dem Update
            fetchProfile();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Profils:', error);
            setMessage(error.response?.data?.message || 'Fehler beim Aktualisieren des Profils.');
            setShowMessage(true);
        }
    };

    // Füge diese Funktion hinzu um API Keys zu laden
    const fetchApiKeys = async () => {
        try {
            const response = await axios.get('/api/keys');
            setApiKeys(response.data);
        } catch (error) {
            console.error('Fehler beim Laden der API Keys:', error);
            showErrorMessage('Fehler beim Laden der API Keys');
        }
    };

    // Füge diese useEffect hinzu
    useEffect(() => {
        if (isOpen) {
            fetchApiKeys();
        }
    }, [isOpen]);

    // Füge diese Funktionen für API Key Management hinzu
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
            showErrorMessage('Fehler beim Generieren des API Keys');
        } finally {
            setIsGeneratingKey(false);
        }
    };

    const handleRevokeKey = async (keyId) => {
        try {
            await axios.delete(`/api/keys/${keyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchApiKeys(); // Liste neu laden
            showNotification("Erfolg", "API-Key wurde widerrufen");
        } catch (error) {
            console.error('Fehler beim Widerrufen des API Keys:', error);
            showNotification("Fehler", "API-Key konnte nicht widerrufen werden");
        }
    };


    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage('Neue Passwörter stimmen nicht überein.');
            setShowMessage(true);
            return;
        }
        try {
            const response = await axios.put('/api/profile/change-password', {
                oldPassword,
                newPassword,
                confirmPassword
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(response.data.message);
            setShowMessage(true);
            resetPasswordFields();
        } catch (error) {
            console.error('Fehler beim Ändern des Passworts:', error);
            setMessage(error.response?.data?.message || 'Fehler beim Ändern des Passworts.');
            setShowMessage(true);
        }
    };

    const resetPasswordFields = () => {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const showSuccessMessage = (msg) => {
        setMessage(msg);
        setShowMessage(true);
    };

    const showErrorMessage = (msg) => {
        setMessage(msg);
        setShowMessage(true);
    };

    const handleResendVerification = async () => {
        try {
            await axios.post('/api/users/resend-verification', {
                email: profile.email
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showSuccessMessage('Verifizierungs-E-Mail wurde erneut gesendet.');
        } catch (error) {
            console.error('Fehler beim Senden der Verifizierungs-E-Mail:', error);
            showErrorMessage(
                error.response?.data?.message ||
                'Fehler beim Senden der Verifizierungs-E-Mail.'
            );
        }
    };

    const MessageOverlay = ({ message, onClose }) => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-lg relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
                    ✕
                </button>
                <p className="mb-4">{message}</p>
                <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded">OK</button>
            </div>
        </div>
    );

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
                        <div className="space-y-6">
                           {/* Profil-Formular */}
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
                            <div className="border-t border-primary-100 dark:border-primary-800"></div>
                            {/* Passwort-Formular */}
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <input
                                    type="password"
                                    placeholder="Altes Passwort"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    className="form-input"
                                />
                                <input
                                    type="password"
                                    placeholder="Neues Passwort"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="form-input"
                                />
                                <input
                                    type="password"
                                    placeholder="Neues Passwort bestätigen"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="form-input"
                                />
                                <button type="submit" className="btn-secondary w-full">
                                    Passwort ändern
                                </button>
                            </form>
                            <div className="border-t border-primary-100 dark:border-primary-800"></div>
                            {/* Ortsinfos */}
                            <div className="space-y-2">
                                {profile.wohnort ? (
                                    <p className="text-sm text-label">Heimatort: {profile.wohnort_adresse}</p>
                                ) : (
                                    <p className="text-sm text-muted">● Bitte Heimatort festlegen</p>
                                )}
                                {profile.dienstort ? (
                                    <p className="text-sm text-label">Dienstort: {profile.dienstort_adresse}</p>
                                ) : (
                                    <p className="text-sm text-muted">● Bitte Dienstort festlegen</p>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'abrechnungen' && (
                        <AbrechnungstraegerForm />
                    )}

                    {activeTab === 'erstattung' && (
                        <div>
                            {/* Mitfahrer-Erstattungssatz Form */}
                            <MitfahrerErstattungForm />
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
            
            {/* Optional: Zusätzliche Sicherheitseinstellungen */}
            <div className="border-t border-primary-100 dark:border-primary-800 pt-6">
            <h3 className="text-lg font-medium text-value mb-4">E-Mail-Verifizierung</h3>
            <div className="space-y-4">
            <div className="flex items-center justify-between">
            <span className="text-sm text-label">
            Status:
            {profile.email_verified ? (
                <span className="text-green-500 ml-2">● Verifiziert</span>
            ) : (
                <span className="text-yellow-500 ml-2">○ Ausstehend</span>
            )}
            </span>
            {!profile.email_verified && (
                <button
                onClick={handleResendVerification}
                className="btn-secondary text-sm"
                >
                Verifizierung erneut senden
                </button>
            )}
            </div>
            </div>
            </div>
            </div>
        )}

                     {activeTab === 'api' && (
                        <div className="space-y-6">
                            <div className="border-t border-primary-100 dark:border-primary-800 pt-4">
                                <h3 className="text-lg font-medium text-value mb-4">API Keys für Kurzbefehle</h3>

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
                                            <p className="text-sm text-label">Dein neuer API Key (kopiere ihn jetzt - er wird nur einmal angezeigt):</p>
                                            <div className="flex gap-2 items-center">
                                                <code className="flex-1 bg-white dark:bg-gray-800 p-2 rounded text-sm break-all">
                                                    {generatedKey}
                                                </code>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(generatedKey);
                                                        showSuccessMessage('API Key kopiert!');
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
                                        <div key={key.id} className="flex items-center justify-between p-2 bg-primary-25 dark:bg-primary-900 rounded">
                                            <div className="flex-1">
                                                <p className="text-sm text-value font-medium">{key.description}</p>
                                                <p className="text-xs text-label">
                                                    Erstellt: {new Date(key.created_at).toLocaleDateString()}
                                                    {key.last_used_at && ` • Zuletzt verwendet: ${new Date(key.last_used_at).toLocaleDateString()}`}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRevokeKey(key.id)}
                                                className="btn-secondary text-xs"
                                            >
                                                Widerrufen
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
          {/* Benachrichtigung */}
          {showMessage && (
                <div className="fixed inset-0 bg-primary-950/50 dark:bg-primary-950/70 flex items-center justify-center z-50" onClick={() => setShowMessage(false)}>
                    <div className="card-container max-w-sm mx-4">
                        <p className="mb-4 text-value">{message}</p>
                        <button onClick={() => setShowMessage(false)} className="btn-primary w-full">
                            OK
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default ProfileModal;