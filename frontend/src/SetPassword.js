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

  const validatePassword = (value) => {
    // Mindestens 8 Zeichen, ein Großbuchstabe, ein Kleinbuchstabe, eine Zahl
    const hasMinLength = value.length >= 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);

    return hasMinLength && hasUpperCase && hasLowerCase && hasNumber;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
    <div className="card-container-highlight w-full max-w-md">
    <h2 className="text-lg font-medium text-value text-center mb-6">
    {location.pathname.includes('reset-password') 
      ? 'Neues Passwort setzen' 
      : 'Passwort festlegen'}
    </h2>
    
    <form onSubmit={handleSubmit} className="space-y-4">
    <div>
    <label className="form-label">
    Neues Passwort
    </label>
    <input
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="form-input"
    required
    disabled={isSubmitting || !token}
    />
    {password && !validatePassword(password) && (
      <p className="mt-1 text-muted text-xs">
      Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, 
      einen Kleinbuchstaben und eine Zahl enthalten.
      </p>
    )}
    </div>
    
    <div>
    <label className="form-label">
    Passwort bestätigen
    </label>
    <input
    type="password"
    value={confirmPassword}
    onChange={(e) => setConfirmPassword(e.target.value)}
    className="form-input"
    required
    disabled={isSubmitting || !token}
    />
    {confirmPassword && password !== confirmPassword && (
      <p className="mt-1 text-muted text-xs">
      Die Passwörter stimmen nicht überein.
      </p>
    )}
    </div>
    
    {status.message && (
      <div className={status.type === 'success' ? 'status-success' : 'status-error'}>
      {status.message}
      </div>
    )}
    
    <div className="flex flex-col sm:flex-row gap-2">
    <button
    type="submit"
    className="btn-primary w-full"
    disabled={isSubmitting || !token || !validatePassword(password) || password !== confirmPassword}
    >
    {isSubmitting ? 'Wird verarbeitet...' : 'Passwort setzen'}
    </button>
    </div>
    </form>
    </div>
    </div>
  );
}