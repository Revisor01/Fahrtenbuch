import React, { useRef, useEffect } from 'react';

function Modal({ isOpen, onClose, title, children, size = 'compact' }) {
    const widthClass = {
        'compact': 'w-[95%] sm:w-[30rem]',
        'wide': 'w-[95%] sm:w-[80%]',
    }[size];
    
    const modalRef = useRef(null);
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 z-50">
        <div className="fixed inset-0 bg-primary-950/30 dark:bg-primary-950/40 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
        <div className="pointer-events-none fixed inset-y-0 right-0 flex pl-10">
        <div className={`pointer-events-auto ${widthClass}`}>
        <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
        {/* Fixer Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-primary-100 dark:border-primary-800 px-6 py-4">
        <div className="flex items-center justify-between">
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
        </div>
        
        {/* Scrollbarer Content */}
        <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-4">
        {children}
        </div>
        </div>
        </div>
        </div>
        </div>
        </div>
        </div>
        </div>
    );
}

export default Modal;