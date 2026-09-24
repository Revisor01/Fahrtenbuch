import React from 'react';
import './index.css';
import LandingPage from './LandingPage';
import RechtlichesSeite from './components/RechtlichesSeite';
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
    {/* Die Fehlergrenze umschliesst den ganzen Baum, nicht nur AppContent.
        Vorher lag sie innerhalb der Routen, und alles darueber war
        ungeschuetzt: PwaUpdater, ErfassungsFlow und StatusDatumSheet (beide
        werden von ihren Providern gerendert, nicht hier), die oeffentlichen
        Routen /help, /rechtliches, /verify-email, /reset-password,
        /set-password — und die Provider-Ruempfe selbst. Ein Render-Fehler an
        einer dieser Stellen ergab eine weisse Seite.
        Besonders heikel: /rechtliches rufen Apple-Pruefer:innen ohne Konto
        auf. Innerhalb des ThemeProviders, damit die Meldung im richtigen
        Farbschema erscheint. */}
    <Fehlergrenze>
    <BrowserRouter>
    <ToastProvider>
    <PwaUpdater />
    <AppProvider>
    <ErfassungProvider>
    <Routes>
    <Route path="/help" element={<LandingPage />} />
    {/* Oeffentlich, ohne Anmeldung: Apple 5.1.1 (i) verlangt, dass die
        Datenschutzerklaerung in der App erreichbar ist — auch fuer eine
        Pruefer:in ohne Konto. */}
    <Route path="/rechtliches" element={<RechtlichesSeite />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<SetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/*" element={<AppContent />} />
    </Routes>
    </ErfassungProvider>
    </AppProvider>
    </ToastProvider>
    </BrowserRouter>
    </Fehlergrenze>
    </ThemeProvider>
  );
}

export default App;
