import React from 'react';
import './index.css';
import LandingPage from './LandingPage';
import VerifyEmail from './VerifyEmail';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SetPassword from './SetPassword';
import { ThemeProvider } from './ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import AppProvider from './contexts/AppContext';
import { ErfassungProvider } from './contexts/ErfassungContext';
import AppContent from './components/AppContent';
import PwaUpdater from './components/PwaUpdater';
import Fehlergrenze from './components/Fehlergrenze';


function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
    // Der native Startbildschirm wird NICHT hier ausgeblendet: Er zeigt nur
    // das Zeichen, der eigene zusaetzlich den Namen. Wer hier ausblendet,
    // sieht beide nacheinander. Das Ausblenden passiert deshalb erst, wenn
    // der erste eigene Bildschirm steht — siehe AppContent.
  }, []);

  return (
    <ThemeProvider>
    <BrowserRouter>
    <ToastProvider>
    <PwaUpdater />
    <AppProvider>
    <ErfassungProvider>
    <Routes>
    <Route path="/help" element={<LandingPage />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<SetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/*" element={<Fehlergrenze><AppContent /></Fehlergrenze>} />
    </Routes>
    </ErfassungProvider>
    </AppProvider>
    </ToastProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
