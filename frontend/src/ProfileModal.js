  import React, { useState, useEffect, useContext } from 'react';
  import axios from 'axios';
  import { AppContext } from './App';
  import Modal from './Modal';
  
  function ProfileModal({ isOpen, onClose }) {
      const { token, user, setUser } = useContext(AppContext);
  const [profile, setProfile] = useState({});
        const inputClasses = "w-full p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 text-sm";
        const buttonClasses = "w-full bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition duration-200 text-sm";

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
            <Modal isOpen={isOpen} onClose={onClose} title="Profil">
            <div className="space-y-4">
            <form onSubmit={handleProfileUpdate} className="space-y-3">
            <div className="relative">
            <input
            type="email"
            placeholder="E-Mail"
            value={profile.email || ''}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            className={`${inputClasses} ${
                profile.email_verified 
                ? 'border-green-200 bg-green-50' 
                : 'border-yellow-200 bg-yellow-50'
            }`}
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {profile.email_verified ? (
                <span className="text-green-600 text-xs">● Verifiziert</span>
            ) : (
                <>
                <span className="text-yellow-600 text-xs">○ Ausstehend</span>
                <button
                type="button"
                onClick={handleResendVerification}
                className="text-blue-600 hover:text-blue-800 text-xs"
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
            className={inputClasses}
            />
            
            <input
            type="text"
            placeholder="IBAN"
            value={profile.iban || ''}
            onChange={(e) => setProfile({ ...profile, iban: e.target.value })}
            className={inputClasses}
            />
            
            <input
            type="text"
            placeholder="Kirchengemeinde"
            value={profile.kirchengemeinde || ''}
            onChange={(e) => setProfile({ ...profile, kirchengemeinde: e.target.value })}
            className={inputClasses}
            />
            
            <input
            type="text"
            placeholder="Kirchspiel"
            value={profile.kirchspiel || ''}
            onChange={(e) => setProfile({ ...profile, kirchspiel: e.target.value })}
            className={inputClasses}
            />
            
            <input
            type="text"
            placeholder="Kirchenkreis"
            value={profile.kirchenkreis || ''}
            onChange={(e) => setProfile({ ...profile, kirchenkreis: e.target.value })}
            className={inputClasses}
            />
            
            <button type="submit" className={buttonClasses}>
            Profil aktualisieren
            </button>
            </form>
            
            <div className="border-t border-gray-200 my-6"></div>
            
            <form onSubmit={handlePasswordChange} className="space-y-3">
            <input
            type="password"
            placeholder="Altes Passwort"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            className={inputClasses}
            />
            <input
            type="password"
            placeholder="Neues Passwort"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClasses}
            />
            <input
            type="password"
            placeholder="Neues Passwort bestätigen"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClasses}
            />
            <button type="submit" className={`${buttonClasses} bg-green-100 text-green-700 hover:bg-green-200`}>
            Passwort ändern
            </button>
            </form>
            
            <div className="border-t border-gray-200 my-6"></div>
            
            <div className="space-y-2">
            {profile.wohnort ? (
                <p className="text-sm text-gray-500">Heimatort: {profile.wohnort_adresse}</p>
            ) : (
                <p className="text-sm text-yellow-600">● Bitte Heimatort festlegen</p>
            )}
            {profile.dienstort ? (
                <p className="text-sm text-gray-500">Dienstort: {profile.dienstort_adresse}</p>
            ) : (
                <p className="text-sm text-yellow-600">● Bitte Dienstort festlegen</p>
            )}
            </div>
            </div>
            
            {showMessage && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMessage(false)}>
                <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm mx-4">
                <p className="mb-4">{message}</p>
                <button onClick={() => setShowMessage(false)} className={buttonClasses}>
                OK
                </button>
                </div>
                </div>
            )}
            </Modal>
        );
    }

export default ProfileModal;