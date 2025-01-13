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
    <div className="min-h-screen flex items-center justify-center bg-primary-25">
    <div className="table-container w-full max-w-md">
    <div className="bg-white p-6 rounded-lg border border-primary-100 space-y-6">
    <h2 className="text-2xl font-medium text-primary-900 text-center">
    E-Mail Verifizierung
    </h2>
    
    {status.message && (
      <div className={`p-4 rounded ${
        status.type === 'success' 
        ? 'bg-primary-25 text-primary-600' 
        : 'bg-secondary-25 text-secondary-600'
      }`}>
      <p className="text-center">{status.message}</p>
      </div>
    )}
    
    {status.type === 'error' && (
      <div className="text-center border-t border-primary-200 pt-4">
      <a href="/" className="btn-primary inline-block">
      Zurück zum Dashboard
      </a>
      </div>
    )}
    </div>
    </div>
    </div>
  );
}