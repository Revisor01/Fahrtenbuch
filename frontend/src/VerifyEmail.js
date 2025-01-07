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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-center mb-6">
          E-Mail Verifizierung
        </h2>

        {status.message && (
          <div className={`p-4 rounded ${
            status.type === 'success' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            <p className="text-center">{status.message}</p>
          </div>
        )}

        {status.type === 'error' && (
          <div className="text-center mt-4">
            <a href="/" className="text-blue-500 hover:text-blue-700">
              Zurück zum Dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}