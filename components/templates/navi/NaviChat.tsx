import React, { useState, useEffect, useRef, useMemo } from 'react';
import StreamingMarkdown from '../../StreamingMarkdown';
import ReferencesPanel from '../../ReferencesPanel';
import { Resource } from '../../../types';
import { Citation } from '../../../utils/citationParser';
import { Reasoning, ReasoningTrigger, ReasoningContent } from '../../Reasoning';

interface NaViChatProps {
  query: string;
  setQuery: (query: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  response: string;
  error: string | null;
  onStop?: () => void;
  onNewChat?: () => void;
  lastQuery?: string;
  resources?: Resource[];
  onViewResource?: (resource: Resource) => void;
  onShowPersonas?: () => void;
  hasMessages: boolean;
  welcomeTitle: string;
  welcomeSubtitle: string;
  reasoningSteps?: string;
  isShowingReasoning?: boolean;
}

const NaViChat: React.FC<NaViChatProps> = ({
  query,
  setQuery,
  onSubmit,
  isLoading,
  response,
  error,
  onStop,
  onNewChat,
  lastQuery,
  resources = [],
  onViewResource,
  onShowPersonas,
  hasMessages,
  welcomeTitle,
  welcomeSubtitle,
  reasoningSteps = '',
  isShowingReasoning = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [typedText, setTypedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Progressive thinking messages
  const thinkingMessages = useMemo(() => {
    return lastQuery ? [
      `thinking about "${lastQuery.substring(0, 40)}${lastQuery.length > 40 ? '...' : ''}"`,
      `researching knowledge sources`,
      `formulating response`
    ] : [
      'thinking about your request',
      'researching knowledge sources',
      'formulating response'
    ];
  }, [lastQuery]);

  // Reset thinking state
  useEffect(() => {
    if (!isLoading || !response.trim().endsWith('**NaVi Assistant:**')) {
      setThinkingStep(0);
      setTypedText('');
    }
  }, [isLoading, response]);

  // Typing animation effect for thinking
  useEffect(() => {
    if (isLoading && response.trim().endsWith('**NaVi Assistant:**')) {
      const currentMessage = thinkingMessages[thinkingStep];
      let charIndex = 0;
      setTypedText('');

      const typingInterval = setInterval(() => {
        if (charIndex < currentMessage.length) {
          setTypedText(currentMessage.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typingInterval);
          const nextTimeout = setTimeout(() => {
            if (thinkingStep < thinkingMessages.length - 1) {
              setThinkingStep(prev => prev + 1);
            }
          }, 1500);
          return () => clearTimeout(nextTimeout);
        }
      }, 50);

      return () => clearInterval(typingInterval);
    }
  }, [isLoading, response, thinkingStep, thinkingMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [response]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  // Check if we're in thinking state (waiting for first response chunk)
  const isThinking = isLoading && response.trim().endsWith('**NaVi Assistant:**');

  return (
    <div className="navi-center-content-wrapper">
      <div className="navi-chat-messages">
        {!hasMessages ? (
          /* Welcome State */
          <div className="navi-welcome-state">
            <h1 className="navi-welcome-title">{welcomeTitle}</h1>
            <p className="navi-welcome-subtitle">{welcomeSubtitle}</p>
          </div>
        ) : (
          /* Chat Conversation */
          <div className="navi-chat-conversation">
            {/* Streaming Markdown Response */}
            <div className="navi-message assistant">
              <div className="navi-message-header">
                <div className="navi-message-avatar">NaVi</div>
                {isThinking && (
                  <div className="navi-thinking-indicator">
                    <span>{typedText}</span>
                    <div className="navi-thinking-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
              <div className="navi-message-content">
                {/* Reasoning Component - shows AI thinking process */}
                {(isLoading || reasoningSteps) && (
                  <Reasoning isStreaming={isShowingReasoning} className="mb-4">
                    <ReasoningTrigger />
                    <ReasoningContent>{reasoningSteps}</ReasoningContent>
                  </Reasoning>
                )}

                <StreamingMarkdown
                  content={response}
                  onCitationsFound={setCitations}
                  resources={resources}
                  onViewResource={onViewResource}
                />
              </div>
            </div>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="navi-error">
          <span className="navi-error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Chat Actions - shown when there are messages */}
      {hasMessages && (
        <div className="navi-chat-actions">
          <button
            className="navi-action-btn"
            onClick={handleCopy}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5.5 2.5H10.5C11.0523 2.5 11.5 2.94772 11.5 3.5V10.5C11.5 11.0523 11.0523 11.5 10.5 11.5H5.5C4.94772 11.5 4.5 11.0523 4.5 10.5V3.5C4.5 2.94772 4.94772 2.5 5.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2.5 5.5H3.5V12.5C3.5 13.0523 3.94772 13.5 4.5 13.5H11.5V12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="navi-action-btn"
            onClick={() => setShowReferences(!showReferences)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M2 8H14M2 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            References ({citations.length})
          </button>
          {isLoading && (
            <button
              className="navi-action-btn stop-btn"
              onClick={onStop}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor"/>
              </svg>
            </button>
          )}
        </div>
      )}

      {/* References Panel */}
      {showReferences && citations.length > 0 && (
        <div className="navi-references-panel">
          <ReferencesPanel
            citations={citations}
            resources={resources}
            onViewResource={onViewResource}
            onClose={() => setShowReferences(false)}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="navi-input-area">
        <div className="navi-input-container">
          <div className="navi-input-wrapper">
            <textarea
              ref={inputRef}
              className="navi-input-field"
              placeholder="Ask NaVi anything about digital health technologies..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              disabled={isLoading}
            />
          </div>
          <button
            className="navi-send-btn"
            onClick={onSubmit}
            disabled={!query.trim() || isLoading}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M18 2L9 11M18 2L12 18L9 11M18 2L2 8L9 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NaViChat;
