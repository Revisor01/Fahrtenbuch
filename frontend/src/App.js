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


function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
  }, []);

  return (
    <ThemeProvider>
    <BrowserRouter>
    <ToastProvider>
    <AppProvider>
    <ErfassungProvider>
    <Routes>
    <Route path="/help" element={<LandingPage />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<SetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/*" element={<AppContent />} />
    </Routes>
    </ErfassungProvider>
    </AppProvider>
    </ToastProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
