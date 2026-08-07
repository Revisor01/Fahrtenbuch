import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthLogo } from './components/LoginPage';

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
    <div className="auth-page">
    <div className="auth-box">
    <AuthLogo />
    <h1 className="auth-titel">E-Mail-Verifizierung</h1>
    <div className="auth-sub">Fahrtenbuch</div>

    <div className="auth-card">
    {status.message && (
      <div className={status.type === 'success' ? 'status-success' : 'status-error'}>
      {status.message}
      </div>
    )}

    {status.type === 'error' && (
      <button
      onClick={() => navigate('/')}
      className="auth-btn"
      style={{ marginTop: 16 }}>
      Zurück zur Anmeldung
      </button>
    )}
    </div>
    </div>
    </div>
  );
}