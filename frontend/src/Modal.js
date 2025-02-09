import React, { useRef, useEffect, useContext } from 'react';
import { AppContext } from './App';

function Modal({ isOpen, onClose, title, children, size = 'compact', preventOutsideClick = false }) {
    const { hasActiveNotification } = useContext(AppContext);
    const modalRef = useRef(null);
    
    const widthClass = {
        'compact': 'w-[95%] sm:w-[30rem]',
        'wide': 'w-[95%] sm:w-[80%]',
    }[size];
    
    useEffect(() => {
        if (preventOutsideClick || hasActiveNotification) return;
        
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target) && isOpen) {
                onClose();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, isOpen, preventOutsideClick, hasActiveNotification]);
    
    if (!isOpen) return null;

    // Event handler für den Backdrop
    const handleBackdropClick = (e) => {
        if (!preventOutsideClick && e.target === e.currentTarget) {
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 z-50" onClick={handleBackdropClick}>
            <div className="fixed inset-0 bg-primary-950/30 dark:bg-primary-950/40 backdrop-blur-sm" />
            <div className="fixed inset-0 flex justify-center pt-20">
                <div 
                    ref={modalRef}
                    className={`${widthClass} card-container h-fit max-h-[calc(100vh-10rem)] overflow-hidden flex flex-col`}
                >
                    <div className="sticky top-0 z-20 bg-white dark:bg-gray-800">
                        <div className="flex justify-between items-center pb-4">
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
                        <div className="h-px bg-gradient-to-b from-primary-100/50 to-transparent dark:from-primary-800/50"></div>
                    </div>
                    <div className="overflow-y-auto">
                        <div className="pt-4">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Modal;