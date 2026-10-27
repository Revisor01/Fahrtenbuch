import React from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './index.css';
// Muss vor der ersten Anfrage geladen sein: setzt axios.defaults.baseURL.
import './api/client';
import { PLATTFORM } from './utils/plattform';
import App from './App';

// Plattform-Attribut vor dem ersten Rendern, nur nativ.
if (PLATTFORM !== 'web') {
  document.documentElement.setAttribute('data-platform', PLATTFORM);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
