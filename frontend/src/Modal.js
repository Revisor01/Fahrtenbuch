import React from 'react';

function Modal({ isOpen, onClose, title, children, size = 'compact' }) {
  if (!isOpen) return null;
  
  // Bestimme die Breiten-Klasse basierend auf der size prop
  const widthClass = {
    'compact': 'w-[95%] sm:w-[30rem]', // Profil, Benutzer erstellen/bearbeiten
    'wide': 'w-[95%] sm:w-[80%]',      // Benutzerverwaltung, Orte, Distanzen
  }[size];
  
  return (
    <div className="fixed inset-0 bg-primary-950/50 dark:bg-primary-950/70 overflow-y-auto h-full w-full" onClick={onClose}>
    <div 
    className={`relative top-20 mx-auto p-6 card-container ${widthClass}`}
    onClick={e => e.stopPropagation()}
    >
    <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-medium text-value">{title}</h2>
    <button 
    onClick={onClose} 
    className="text-muted hover:text-value transition-colors duration-200"
    >
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
    </button>
    </div>
    {children}
    </div>
    </div>
  );
}

export default Modal;