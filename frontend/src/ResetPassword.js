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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
    <div className="max-w-md w-full p-6 bg-white rounded-lg shadow">
    <h2 className="text-2xl font-semibold text-center mb-6">Passwort zurücksetzen</h2>
    
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="block text-sm font-medium text-gray-700">Neues Passwort</label>
    <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
    required
    disabled={isSubmitting}
    />
    </div>
    
    <div>
    <label className="block text-sm font-medium text-gray-700">Passwort bestätigen</label>
    <input
    type="password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2"
    required
    disabled={isSubmitting}
    />
    </div>
    
    {status.message && (
      <div className={`p-3 rounded ${
        status.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
      }`}>
      {status.message}
      </div>
    )}
    
    <button
    type="submit"
    className={`w-full bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600 ${
      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
    }`}
    disabled={isSubmitting}
    >
    {isSubmitting ? 'Wird verarbeitet...' : 'Passwort zurücksetzen'}
    </button>
    </form>
    </div>
    </div>
  );
}