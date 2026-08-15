import React from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './index.css';
// Muss vor der ersten Anfrage geladen sein: setzt axios.defaults.baseURL.
import './api/client';
import { PLATTFORM } from './utils/plattform';
// Setzt beim Laden die Startflaeche des Dokuments — muss vor dem ersten
// Zeichnen passieren, sonst blitzen die Systemraender kurz in der falschen
// Farbe auf.
import './utils/systemflaeche';
import App from './App';

// Plattform-Schalter fuer das CSS. Bewusst vor dem ersten Rendern und nur in
// der nativen Huelle: im Browser bleibt das Attribut ungesetzt, damit keine
// einzige Regel der Weboberflaeche anders greift als bisher.
if (PLATTFORM !== 'web') {
  document.documentElement.setAttribute('data-platform', PLATTFORM);
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
