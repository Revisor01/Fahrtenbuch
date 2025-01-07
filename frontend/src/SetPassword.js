import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Token aus URL-Parametern holen
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
      const endpoint = location.pathname.includes('reset-password') 
        ? '/api/users/reset-password/verify'
        : '/api/users/set-password';

      await axios.post(endpoint, {
        token,
        newPassword: password
      });

      setStatus({
        type: 'success',
        message: 'Passwort wurde erfolgreich gesetzt. Sie werden zum Login weitergeleitet...'
      });

      // Nach 2 Sekunden zum Login weiterleiten
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
      });
    }
    setIsSubmitting(false);
  };

  const validatePassword = (value) => {
    // Mindestens 8 Zeichen, ein Großbuchstabe, ein Kleinbuchstabe, eine Zahl
    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);

    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full p-6 bg-white rounded-lg shadow">
        <h2 className="text-2xl font-semibold text-center mb-6">
          {location.pathname.includes('reset-password') 
            ? 'Neues Passwort setzen' 
            : 'Passwort erstellen'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Neues Passwort
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-1 block w-full rounded-md border shadow-sm p-2 ${
                password && !validatePassword(password)
                  ? 'border-red-300'
                  : 'border-gray-300'
              }`}
              required
              disabled={isSubmitting || !token}
            />
            {password && !validatePassword(password) && (
              <p className="mt-1 text-sm text-red-600">
                Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, 
                einen Kleinbuchstaben und eine Zahl enthalten.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Passwort bestätigen
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`mt-1 block w-full rounded-md border shadow-sm p-2 ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-300'
                  : 'border-gray-300'
              }`}
              required
              disabled={isSubmitting || !token}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-sm text-red-600">
                Die Passwörter stimmen nicht überein.
              </p>
            )}
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
              (isSubmitting || !token) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting || !token || !validatePassword(password) || password !== confirmPassword}
          >
            {isSubmitting ? 'Wird verarbeitet...' : 'Passwort setzen'}
          </button>
        </form>
      </div>
    </div>
  );
}