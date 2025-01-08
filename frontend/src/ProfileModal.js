import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';

function ProfileModal({ isOpen, onClose }) {
    const { token, user, setUser } = useContext(AppContext);
    const [profile, setProfile] = useState({});
    const [originalProfile, setOriginalProfile] = useState({});
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);

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
        <Modal isOpen={isOpen} onClose={onClose} title="Profil" wide={false}>
            <div className="max-w-md mx-auto">
                <form onSubmit={handleProfileUpdate}>
                   <div className="relative">
                      <input
                        type="email"
                        placeholder="E-Mail"
                        value={profile.email || ''}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className={`mt-2 px-3 py-2 bg-white border shadow-sm ${
                          profile.email_verified 
                          ? 'border-green-300' 
                          : 'border-yellow-300'
                         } placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1`}
                      />
                       <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                          {profile.email_verified ? (
                              <span className="text-green-500 text-sm">✓ Verifiziert</span>
                          ) : (
                            <>
                              <span className="text-yellow-500 text-sm">Nicht verifiziert</span>
                              <button
                                type="button"
                                onClick={handleResendVerification}
                                className="text-blue-500 hover:text-blue-700 text-sm"
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
                         // Wir verwenden nun fullName und nicht full_name
                        value={profile.fullName || ''}
                        onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <input
                        type="text"
                        placeholder="IBAN"
                        value={profile.iban || ''}
                        onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <input
                        type="text"
                        placeholder="Kirchengemeinde"
                        value={profile.kirchengemeinde || ''}
                        onChange={(e) => setProfile({ ...profile, kirchengemeinde: e.target.value })}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <input
                        type="text"
                        placeholder="Kirchspiel"
                        value={profile.kirchspiel || ''}
                        onChange={(e) => setProfile({ ...profile, kirchspiel: e.target.value })}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                     <input
                        type="text"
                        placeholder="Kirchenkreis"
                        value={profile.kirchenkreis || ''}
                        onChange={(e) => setProfile({ ...profile, kirchenkreis: e.target.value })}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <button type="submit" className="mt-4 w-full bg-blue-500 text-white p-2 rounded-md">Profil aktualisieren</button>
                </form>
                <form onSubmit={handlePasswordChange} className="mt-4">
                    <input
                        type="password"
                        placeholder="Altes Passwort"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <input
                        type="password"
                        placeholder="Neues Passwort"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <input
                        type="password"
                        placeholder="Neues Passwort bestätigen"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
                    />
                    <button type="submit" className="mt-4 w-full bg-green-500 text-white p-2 rounded-md">Passwort ändern</button>
                </form>
            </div>
            <div className="mt-4 text-center">
                {profile.wohnort && (
                    <p className="text-sm text-gray-500">Heimatort: {profile.wohnort_adresse}</p>
                )}
                  {!profile.wohnort && (
                      <p className="text-sm text-red-500">Bitte Heimatort festlegen</p>
                  )}
                 {profile.dienstort && (
                  <p className="text-sm text-gray-500">Dienstort: {profile.dienstort_adresse}</p>
              )}
                  {!profile.dienstort && (
                      <p className="text-sm text-red-500">Bitte Dienstort festlegen</p>
                  )}
             </div>
              {showMessage && (
              <MessageOverlay 
              message={message}
              onClose={() => setShowMessage(false)}
              />
              )}
        </Modal>
    );
}

export default ProfileModal;