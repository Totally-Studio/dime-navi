import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onDownloadPDF?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, onDownloadPDF }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl w-[600px] max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <header className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-100 dark:bg-slate-800/70">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <div className="flex items-center gap-2">
            {onDownloadPDF && (
              <button
                onClick={onDownloadPDF}
                className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Download as PDF"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors p-1 rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </header>
        <main className="p-6 overflow-y-auto flex-grow">
          {children}
        </main>
        <footer className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 bg-slate-50 dark:bg-slate-900/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-white hover:bg-slate-50 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-md transition-colors border border-slate-300 dark:border-slate-600 shadow-sm"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};

export default Modal;