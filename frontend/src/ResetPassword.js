import React, { useState } from 'react';
  import axios from 'axios';

  export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
          await axios.post('/api/users/reset-password/request', { email });
            setStatus({
                type: 'success',
                message: 'Wenn ein Account mit dieser E-Mail existiert, erhalten Sie in Kürze weitere Anweisungen.'
              });
            setEmail('');
        } catch (error) {
            setStatus({
                type: 'error',
                message: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'
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
                <label className="block text-sm font-medium text-gray-700">
                    E-Mail-Adresse
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                {isSubmitting ? 'Wird verarbeitet...' : 'Anweisungen senden'}
            </button>
        
            <div className="text-center mt-4">
                <a href="/login" className="text-sm text-blue-500 hover:text-blue-700">
                    Zurück zum Login
                </a>
            </div>
        </form>
        </div>
        </div>
    );
  }