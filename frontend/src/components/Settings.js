import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from '../contexts/AppContext';
import AbrechnungstraegerForm from './AbrechnungstraegerForm';
import ErstattungssaetzeForm from './ErstattungssaetzeForm';
import OrtForm from './OrtForm';
import OrteListe from './OrteListe';
import DistanzForm from './DistanzForm';
import DistanzenListe from './DistanzenListe';

function Settings() {
    const { token, user, setUser, showNotification, refreshAllData, favoriten, orte, abrechnungstraeger, addFavorit, deleteFavorit, fetchFavoriten } = useContext(AppContext);
    const [profile, setProfile] = useState({});
    const [activeTab, setActiveTab] = useState('profile');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [apiKeys, setApiKeys] = useState([]);
    const [newKeyDescription, setNewKeyDescription] = useState('');
    const [generatedKey, setGeneratedKey] = useState(null);
    const [isGeneratingKey, setIsGeneratingKey] = useState(false);
    const [favoritForm, setFavoritForm] = useState({ vonOrtId: '', nachOrtId: '', anlass: '', abrechnungstraegerId: '' });

    const tabs = [
        { id: 'profile', name: 'Profil' },
        { id: 'orte', name: 'Orte' },
        { id: 'distanzen', name: 'Distanzen' },
        { id: 'abrechnungen', name: 'Tr\u00E4ger' },
        { id: 'favoriten', name: 'Favoriten' },
        { id: 'erstattungssaetze', name: 'Erstattungen' },
        { id: 'security', name: 'Passwort' },
        { id: 'api', name: 'API-Zugriff' }
    ];

    useEffect(() => {
        fetchProfile();
        fetchApiKeys();
        fetchFavoriten();
    }, []);

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
            'API-Key l\u00F6schen',
            'M\u00F6chten Sie diesen API-Key wirklich l\u00F6schen?',
            async () => {
                try {
                    await axios.delete(`/api/keys/${keyId}`);
                    await fetchApiKeys();
                    showNotification('Erfolg', 'API Key wurde gel\u00F6scht');
                } catch (error) {
                    console.error('Fehler beim L\u00F6schen des API Keys:', error);
                    showNotification('Fehler', 'API Key konnte nicht gel\u00F6scht werden');
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
            await refreshAllData();
        } catch (error) {
            console.error('Fehler beim Aktualisieren des Profils:', error);
            showNotification('Fehler', 'Profil konnte nicht aktualisiert werden');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            showNotification('Fehler', 'Die Passw\u00F6rter stimmen nicht \u00FCberein');
            return;
        }
        try {
            await axios.put('/api/profile/change-password', {
                oldPassword,
                newPassword,
                confirmPassword
            });
            showNotification('Erfolg', 'Passwort wurde ge\u00E4ndert');
            resetForm();
        } catch (error) {
            console.error('Fehler beim \u00C4ndern des Passworts:', error);
            showNotification('Fehler', error.response?.data?.message || 'Passwort konnte nicht ge\u00E4ndert werden');
        }
    };

    const handleGenerateKey = async () => {
        try {
            setIsGeneratingKey(true);
            const response = await axios.post('/api/keys', {
                description: newKeyDescription || 'API Key f\u00FCr Kurzbefehle'
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

    return (
        <div className="flex flex-col">
        {/* Sub-Tab Navigation */}
        <div className="mb-4 border-b border-primary-100 dark:border-primary-800">
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
            <h3 className="text-lg font-medium text-value mb-4">Pers\u00F6nliche Daten</h3>
            <p className="text-sm text-muted mb-6">
            Ihre pers\u00F6nlichen Daten werden f\u00FCr die Abrechnungen ben\u00F6tigt.
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
                <span className="text-primary-600 text-xs">{'\u25CF'} Verifiziert</span>
            ) : (
                <div className="flex items-center gap-2">
                <span className="text-secondary-600 text-xs">{'\u25CB'} Ausstehend</span>
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

        {activeTab === 'favoriten' && (
            <div className="space-y-6">
            {/* Formular zum Hinzuf\u00FCgen */}
            <div className="card-container-highlight">
            <h3 className="text-lg font-medium text-value mb-4">Neuen Favoriten anlegen</h3>
            <p className="text-sm text-muted mb-6">
            Speichern Sie h\u00E4ufig gefahrene Strecken als Favoriten, um sie sp\u00E4ter mit einem Klick zu wiederholen.
            </p>
            <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
            <label className="form-label">Von</label>
            <select
            value={favoritForm.vonOrtId}
            onChange={(e) => setFavoritForm({ ...favoritForm, vonOrtId: e.target.value })}
            className="form-select w-full"
            >
            <option value="">Bitte w\u00E4hlen</option>
            {orte.map(ort => (
                <option key={ort.id} value={ort.id}>{ort.name}</option>
            ))}
            </select>
            </div>
            <div>
            <label className="form-label">Nach</label>
            <select
            value={favoritForm.nachOrtId}
            onChange={(e) => setFavoritForm({ ...favoritForm, nachOrtId: e.target.value })}
            className="form-select w-full"
            >
            <option value="">Bitte w\u00E4hlen</option>
            {orte.map(ort => (
                <option key={ort.id} value={ort.id}>{ort.name}</option>
            ))}
            </select>
            </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
            <label className="form-label">Anlass</label>
            <input
            type="text"
            value={favoritForm.anlass}
            onChange={(e) => setFavoritForm({ ...favoritForm, anlass: e.target.value })}
            className="form-input w-full"
            placeholder="z.B. Dienstbesprechung"
            />
            </div>
            <div>
            <label className="form-label">Tr\u00E4ger</label>
            <select
            value={favoritForm.abrechnungstraegerId}
            onChange={(e) => setFavoritForm({ ...favoritForm, abrechnungstraegerId: e.target.value })}
            className="form-select w-full"
            >
            <option value="">Bitte w\u00E4hlen</option>
            {abrechnungstraeger.map(at => (
                <option key={at.id} value={at.id}>{at.name}</option>
            ))}
            </select>
            </div>
            </div>
            <div className="flex justify-end">
            <button
            type="button"
            onClick={async () => {
                if (!favoritForm.vonOrtId || !favoritForm.nachOrtId) {
                    showNotification('Fehler', 'Bitte w\u00E4hlen Sie Von- und Nach-Ort aus.');
                    return;
                }
                try {
                    await addFavorit({
                        vonOrtId: parseInt(favoritForm.vonOrtId),
                        nachOrtId: parseInt(favoritForm.nachOrtId),
                        anlass: favoritForm.anlass || '',
                        abrechnungstraegerId: favoritForm.abrechnungstraegerId ? parseInt(favoritForm.abrechnungstraegerId) : null
                    });
                    setFavoritForm({ vonOrtId: '', nachOrtId: '', anlass: '', abrechnungstraegerId: '' });
                    showNotification('Erfolg', 'Favorit wurde gespeichert.');
                } catch (error) {
                    showNotification('Fehler', 'Favorit konnte nicht gespeichert werden.');
                }
            }}
            className="btn-primary mobile-full"
            >
            Favorit speichern
            </button>
            </div>
            </div>
            </div>

            {/* Liste bestehender Favoriten */}
            {favoriten.length === 0 ? (
                <div className="card-container">
                <p className="text-sm text-muted text-center py-4">
                Noch keine Favoriten gespeichert
                </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {favoriten.map(fav => (
                    <div key={fav.id} className="card-container">
                    <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                    <div className="font-medium text-value truncate">
                    {fav.von_ort_name} {'\u2192'} {fav.nach_ort_name}
                    </div>
                    {fav.anlass && (
                        <div className="text-sm text-label mt-1">{fav.anlass}</div>
                    )}
                    {fav.traeger_name && (
                        <div className="text-xs text-muted mt-1">{fav.traeger_name}</div>
                    )}
                    </div>
                    <button
                    onClick={() => {
                        showNotification(
                            'Favorit l\u00F6schen',
                            `M\u00F6chten Sie den Favoriten "${fav.von_ort_name} \u2192 ${fav.nach_ort_name}" wirklich l\u00F6schen?`,
                            async () => {
                                try {
                                    await deleteFavorit(fav.id);
                                    showNotification('Erfolg', 'Favorit wurde gel\u00F6scht.');
                                } catch (error) {
                                    showNotification('Fehler', 'Favorit konnte nicht gel\u00F6scht werden.');
                                }
                            },
                            true
                        );
                    }}
                    className="table-action-button-secondary ml-2 flex-shrink-0"
                    title="L\u00F6schen"
                    >
                    {'\u00D7'}
                    </button>
                    </div>
                    </div>
                ))}
                </div>
            )}
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
            <h3 className="text-lg font-medium text-value mb-4">Passwort \u00E4ndern</h3>
            <p className="text-sm text-muted mb-6">
            Aus Sicherheitsgr\u00FCnden sollten Sie Ihr Passwort regelm\u00E4\u00DFig \u00E4ndern.
            W\u00E4hlen Sie ein sicheres Passwort mit mindestens 8 Zeichen.
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
                <span>{newPassword.length >= 8 ? '\u25CF' : '\u25CB'}</span>
                <span>Mindestens 8 Zeichen</span>
                </div>
                <div className={`flex items-center gap-2 ${/[A-Z]/.test(newPassword) ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{/[A-Z]/.test(newPassword) ? '\u25CF' : '\u25CB'}</span>
                <span>Gro\u00DFbuchstaben</span>
                </div>
                <div className={`flex items-center gap-2 ${/[a-z]/.test(newPassword) ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{/[a-z]/.test(newPassword) ? '\u25CF' : '\u25CB'}</span>
                <span>Kleinbuchstaben</span>
                </div>
                <div className={`flex items-center gap-2 ${/\d/.test(newPassword) ? 'text-primary-600' : 'text-secondary-600'}`}>
                <span>{/\d/.test(newPassword) ? '\u25CF' : '\u25CB'}</span>
                <span>Mindestens eine Zahl</span>
                </div>
                </div>
                </div>
            )}
            </div>

            <div>
            <label className="form-label">Passwort best\u00E4tigen</label>
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
            Passwort \u00E4ndern
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
            Mit API Keys k\u00F6nnen Sie Ihre Fahrten \u00FCber externe Anwendungen oder Kurzbefehle verwalten.
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
                    {key.is_active ? '\u25CF Aktiv' : '\u25CB Inaktiv'}
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
                    title="L\u00F6schen">
                    {'\u00D7'}
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
    );
}

export default Settings;
