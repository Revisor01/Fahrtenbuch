import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const token = new URLSearchParams(location.search).get('token');
  
  useEffect(() => {
    if (!token) {
      setStatus({
        type: 'error',
        message: 'Ungültiger oder fehlender Token.'
      });
    }
  }, [token]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setStatus({
        type: 'error',
        message: 'Die Passwörter stimmen nicht überein.'
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Hier die korrekte API-Route verwenden
      await axios.post('/api/users/reset-password/verify', {
        token,
        newPassword: password
      });
      
      setStatus({
        type: 'success',
        message: 'Passwort wurde erfolgreich zurückgesetzt. Sie werden zum Login weitergeleitet...'
      });
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      });
    }
    setIsSubmitting(false);
  };
    
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-25">
    <div className="table-container w-full max-w-md">
    <div className="bg-primary-25 p-6 rounded-lg space-y-6">
    <h2 className="text-2xl font-medium text-primary-900 text-center">
    Passwort zurücksetzen
    </h2>
    
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="block text-sm font-medium text-primary-600">
    Neues Passwort
    </label>
    <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="form-input"
    required
    disabled={isSubmitting}
    />
    </div>
    
    <div>
    <label className="block text-sm font-medium text-primary-600">
    Passwort bestätigen
    </label>
    <input
    type="password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="form-input"
    required
    disabled={isSubmitting}
    />
    </div>
    
    {status.message && (
      <div className={`p-4 rounded ${
        status.type === 'success' 
        ? 'bg-primary-25 text-primary-600 text-xs' 
        : 'bg-secondary-25 text-secondary-600 text-xs'
      }`}>
      {status.message}
      </div>
    )}
    
    <button
    type="submit"
    className="btn-primary w-full"
    disabled={isSubmitting}
    >
    {isSubmitting ? 'Wird verarbeitet...' : 'Passwort zurücksetzen'}
    </button>
    </form>
    </div>
    </div>
    </div>
  );
}