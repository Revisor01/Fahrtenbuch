import React from 'react';
import './index.css';
import './darkMode.css';
import LandingPage from './LandingPage';
import VerifyEmail from './VerifyEmail';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ResetPassword from './ResetPassword';
import SetPassword from './SetPassword';
import { ThemeProvider } from './ThemeContext';
import AppProvider from './contexts/AppContext';
import AppContent from './components/AppContent';


function App() {
  React.useEffect(() => {
    document.title = "Fahrtenbuch";
  }, []);

  return (
    <ThemeProvider>
    <BrowserRouter>
    <AppProvider>
    <Routes>
    <Route path="/help" element={<LandingPage />} />
    <Route path="/verify-email" element={<VerifyEmail />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/set-password" element={<SetPassword />} />
    <Route path="/*" element={<AppContent />} />
    </Routes>
    </AppProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
