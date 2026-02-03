import React, { useState } from 'react';

interface ReasoningProps {
  className?: string;
  isStreaming: boolean;
  children: React.ReactNode;
}

interface ReasoningTriggerProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

interface ReasoningContentProps {
  children: React.ReactNode;
}

// Context for managing reasoning state
const ReasoningContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isStreaming: boolean;
}>({
  isOpen: false,
  setIsOpen: () => {},
  isStreaming: false,
});

export const Reasoning: React.FC<ReasoningProps> = ({ className = '', isStreaming, children }) => {
  const [isOpen, setIsOpen] = useState(isStreaming);

  // Auto-open when streaming starts, auto-close when done
  React.useEffect(() => {
    if (isStreaming) {
      setIsOpen(true);
    } else {
      // Keep open briefly after streaming ends so user can see final state
      const timer = setTimeout(() => setIsOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  return (
    <ReasoningContext.Provider value={{ isOpen, setIsOpen, isStreaming }}>
      <div className={`reasoning-container ${className}`}>
        {children}
      </div>
    </ReasoningContext.Provider>
  );
};

export const ReasoningTrigger: React.FC<ReasoningTriggerProps> = () => {
  const { isOpen, setIsOpen, isStreaming } = React.useContext(ReasoningContext);

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors border border-gray-700/50"
      aria-expanded={isOpen}
    >
      <svg
        className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span>{isStreaming ? 'Thinking...' : 'View reasoning'}</span>
      {isStreaming && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
    </button>
  );
};

export const ReasoningContent: React.FC<ReasoningContentProps> = ({ children }) => {
  const { isOpen } = React.useContext(ReasoningContext);

  if (!isOpen) return null;

  return (
    <div className="mt-2 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
      <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
};
