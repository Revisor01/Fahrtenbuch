mport React from 'react';

function Modal({ isOpen, onClose, title, children, size = 'compact' }) {
  if (!isOpen) return null;
  
  const widthClass = {
    'compact': 'w-[95%] sm:w-[30rem]',
    'wide': 'w-[95%] sm:w-[80%]',
  }[size];
  
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50" onClick={handleBackdropClick}>
      <div 
        className="fixed inset-0 bg-primary-950/30 dark:bg-primary-950/40 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      <div className="relative min-h-full flex items-center">
        <div 
          className={`relative mx-auto p-6 card-container ${widthClass} my-20 max-h-[80vh] overflow-y-auto`}
        >
          <div className="flex justify-between items-center mb-4 sticky top-0 bg-white dark:bg-gray-800 z-10 py-2">
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
    </div>
  );
}

export default Modal;