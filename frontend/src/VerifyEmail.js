import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function VerifyEmail() {
  const [status, setStatus] = useState({ type: '', message: '' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = new URLSearchParams(location.search).get('token');
      
      if (!token) {
        setStatus({
          type: 'error',
          message: 'Ungültiger oder fehlender Verifizierungstoken.'
        });
        return;
      }

      try {
        await axios.post('/api/users/verify-email', { token });
        setStatus({
          type: 'success',
          message: 'Ihre E-Mail-Adresse wurde erfolgreich verifiziert. Sie werden weitergeleitet...'
        });

        // Nach erfolgreicher Verifizierung zum Dashboard weiterleiten
        setTimeout(() => {
          navigate('/');
        }, 3000);

      } catch (error) {
        setStatus({
          type: 'error',
          message: error.response?.data?.message || 
            'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
        });
      }
    };

    verifyEmail();
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="card-container-highlight w-full max-w-md">
    <h2 className="text-lg font-medium text-value text-center mb-6">
    E-Mail Verifizierung
    </h2>
    
    {status.message && (
      <div className={status.type === 'success' ? 'status-success' : 'status-error'}>
      {status.message}
      </div>
    )}
    
    {status.type === 'error' && (
      <div className="flex justify-center mt-6">
      <button
      onClick={() => navigate('/')}
      className="btn-primary">
      Zurück zum Dashboard
      </button>
      </div>
    )}
    </div>
    </div>
  );
}