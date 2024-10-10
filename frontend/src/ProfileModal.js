import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AppContext } from './App';
import Modal from './Modal';

function ProfileModal({ isOpen, onClose }) {
  const { token } = useContext(AppContext);
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
      const profileData = {
        ...response.data,
        fullName: response.data.full_name
      };
      setProfile(profileData);
      setOriginalProfile(profileData);
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
  
  const MessageOverlay = ({ message, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-white p-6 rounded-lg relative" onClick={e => e.stopPropagation()}>
    <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">
    &#x2715;
    </button>
    <p className="mb-4">{message}</p>
    <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded">OK</button>
    </div>
    </div>
  );
  
  if (!isOpen) return null;
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Profil">
    <div className="w-96 mx-auto">
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