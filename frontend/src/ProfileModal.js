import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';

function ProfileModal({ isOpen, onClose }) {
  const { token } = useContext(AppContext);
  const [profile, setProfile] = useState({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);
  
  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Fehler beim Abrufen des Profils:', error);
    }
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const cleanProfile = Object.fromEntries(
        Object.entries(profile).map(([key, value]) => [key, value === undefined ? null : value])
      );
      console.log('Sending profile update:', cleanProfile);
      await axios.put('/api/profile', cleanProfile, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Profil erfolgreich aktualisiert');
    } catch (error) {
      console.error('Fehler beim Aktualisieren des Profils:', error.response?.data || error);
      setMessage('Fehler beim Aktualisieren des Profils');
    }
  };
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('Neue Passwörter stimmen nicht überein');
      return;
    }
    try {
      await axios.put('/api/profile/change-password', {
        oldPassword,
        newPassword,
        confirmPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Passwort erfolgreich geändert');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Fehler beim Ändern des Passworts:', error);
      setMessage('Fehler beim Ändern des Passworts');
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
    <div className="mt-3 text-center">
    <h3 className="text-lg leading-6 font-medium text-gray-900">Profil</h3>
    <div className="mt-2 px-7 py-3">
    <form onSubmit={handleProfileUpdate}>
    <input
    type="email"
    placeholder="E-Mail"
    value={profile.email || ''}
    onChange={(e) => setProfile({...profile, email: e.target.value})}
    className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
    />
    <input
    type="text"
    placeholder="Voller Name"
    value={profile.fullName || ''}
    onChange={(e) => setProfile({...profile, fullName: e.target.value})}
    className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
    />
    <input
    type="text"
    placeholder="IBAN"
    value={profile.iban || ''}
    onChange={(e) => setProfile({...profile, iban: e.target.value})}
    className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
    />
    <input
    type="text"
    placeholder="Kirchengemeinde"
    value={profile.kirchengemeinde || ''}
    onChange={(e) => setProfile({...profile, kirchengemeinde: e.target.value})}
    className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
    />
    <input
    type="text"
    placeholder="Kirchspiel"
    value={profile.kirchspiel || ''}
    onChange={(e) => setProfile({...profile, kirchspiel: e.target.value})}
    className="mt-2 px-3 py-2 bg-white border shadow-sm border-slate-300 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-sky-500 block w-full rounded-md sm:text-sm focus:ring-1"
    />
    <input
    type="text"
    placeholder="Kirchenkreis"
    value={profile.kirchenkreis || ''}
    onChange={(e) => setProfile({...profile, kirchenkreis: e.target.value})}
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
          {message && <p className="mt-2 text-sm text-blue-500">{message}</p>}
          <div className="items-center px-4 py-3">
            <button
    id="ok-btn"
    className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
    onClick={onClose}
    >
    Schließen
    </button>
    </div>
    </div>
    </div>
    </div>
  );
}

export default ProfileModal;