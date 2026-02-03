import React, { useRef, useEffect, useState, useMemo } from 'react';
import StreamingMarkdown from '../../StreamingMarkdown';
import { Resource } from '../../../types';
import { Citation, parseCitations } from '../../../utils/citationParser';
import { WIDGET_VERSION } from '../../../constants';
import SignInPrompt from '../../../src/components/SignInPrompt';
import { openResourceInModal, prefetchLibraryResources } from '../../../utils/resourceModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export type ThemeType = 'dark' | 'light' | 'accessible';

interface ResourcePreview {
  resource: Resource;
  citationId: number;
}

interface ChatAreaProps {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  onNewChat?: () => void;
  isLoading: boolean;
  streamingContent: string;
  welcomeSubtitle: string;
  resources?: Resource[];
  selectedResources?: ResourcePreview[];
  onViewResource?: (resource: Resource, citationId?: number) => void;
  onOpenResourceUrl?: (resource: Resource) => void;
  onPromptSelect?: (prompt: string) => void;
  theme?: ThemeType;
  onThemeChange?: (theme: ThemeType) => void;
  showMetadata?: boolean;
  // Mobile panel props
  isMobile?: boolean;
  onToggleMobileChats?: () => void;
  onToggleMobileBookmarks?: () => void;
  activeMobilePanel?: 'chats' | 'bookmarks' | null;
  chatHistoryCount?: number;
  bookmarksCount?: number;
  // Sign-in prompt props
  showSignInPrompt?: boolean;
  onSignIn?: () => void;
  onDismissSignInPrompt?: () => void;
  isSigningIn?: boolean;
  // Progress for ticker
  reasoningSteps?: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  input,
  setInput,
  onSend,
  onStop,
  onNewChat,
  isLoading,
  streamingContent,
  welcomeSubtitle,
  resources = [],
  selectedResources = [],
  onViewResource,
  onOpenResourceUrl,
  onPromptSelect,
  theme = 'dark',
  onThemeChange,
  showMetadata = false,
  // Mobile props
  isMobile = false,
  onToggleMobileChats,
  onToggleMobileBookmarks,
  activeMobilePanel,
  chatHistoryCount = 0,
  bookmarksCount = 0,
  // Sign-in prompt props
  showSignInPrompt = false,
  onSignIn,
  onDismissSignInPrompt,
  isSigningIn = false,
  // Progress for ticker
  reasoningSteps = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [streamingCitations, setStreamingCitations] = useState<Citation[]>([]);
  const [filteredCitationIds, setFilteredCitationIds] = useState<number[] | null>(null);
  const [selectedCitations, setSelectedCitations] = useState<Set<number>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prefetchedPostIds = useRef<Set<number>>(new Set());

  const lastUserMessage = messages.filter((m) => m.role === 'user').pop();

  // Parse citations from all assistant messages
  const allCitations = useMemo(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const allParsed: Citation[] = [];

    assistantMessages.forEach(msg => {
      const { citations: msgCitations } = parseCitations(msg.content, resources);
      allParsed.push(...msgCitations);
    });

    // Add streaming citations
    if (streamingCitations.length > 0) {
      allParsed.push(...streamingCitations);
    }

    // Deduplicate by citation id
    const uniqueCitations = allParsed.reduce((acc, citation) => {
      if (!acc.find(c => c.id === citation.id && c.title === citation.title)) {
        acc.push(citation);
      }
      return acc;
    }, [] as Citation[]);

    return uniqueCitations;
  }, [messages, resources, streamingCitations]);

  // Pre-fetch library resources as soon as citations are detected during streaming
  // Only prefetch NEW resources that haven't been prefetched yet
  useEffect(() => {
    if (streamingCitations.length > 0) {
      // Extract only the resources that are cited (not all resources)
      const citedResources = streamingCitations
        .map(citation => citation.resource)
        .filter(Boolean) as Resource[];

      // Filter out resources we've already prefetched
      const newResources = citedResources.filter(resource => {
        const postId = resource.wpPostId;
        if (!postId) {
          // Try to extract from ID
          const match = resource.id?.match(/wp-(\d+)/);
          if (match) {
            const extractedId = parseInt(match[1], 10);
            return !prefetchedPostIds.current.has(extractedId);
          }
          return false;
        }
        return !prefetchedPostIds.current.has(postId);
      });

      if (newResources.length > 0) {
        console.log(`🚀 ${newResources.length} NEW library resources detected - pre-fetching NOW`);

        // Track which resources we're prefetching
        newResources.forEach(resource => {
          const postId = resource.wpPostId;
          if (postId) {
            prefetchedPostIds.current.add(postId);
          } else {
            const match = resource.id?.match(/wp-(\d+)/);
            if (match) {
              prefetchedPostIds.current.add(parseInt(match[1], 10));
            }
          }
        });

        prefetchLibraryResources(newResources);
      }
    }
  }, [streamingCitations]);

  // Reset prefetch tracking when starting a new conversation
  useEffect(() => {
    if (!isLoading && streamingContent === '') {
      prefetchedPostIds.current.clear();
    }
  }, [isLoading, streamingContent]);

  // Auto-scroll within chat container only (not the page)
  useEffect(() => {
    if (messagesContainerRef.current && messagesEndRef.current) {
      const container = messagesContainerRef.current;
      // Only scroll within the chat container, not the whole page
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Gentle scroll for streaming content - only if near bottom
  useEffect(() => {
    if (streamingContent && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [streamingContent]);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = () => {
    const content = streamingContent || messages.filter(m => m.role === 'assistant').pop()?.content || '';
    navigator.clipboard.writeText(content);
    setCopied(true);
  };

  const handleDownload = () => {
    // Get the last user message (prompt) and assistant response
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const lastAssistantMsg = streamingContent || messages.filter(m => m.role === 'assistant').pop()?.content || '';

    // Combine prompt and response in markdown format
    const content = `# User Prompt\n\n${lastUserMsg}\n\n---\n\n# NaVi Response\n\n${lastAssistantMsg}`;

    // Create filename from truncated prompt and timestamp
    const truncatedPrompt = lastUserMsg
      .substring(0, 50)
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
      || 'response';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timestamp = `${day}.${month}.${year}-${hours}:${minutes}`;
    const filename = `${truncatedPrompt} - ${timestamp}.md`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    // Get the rendered HTML from the last assistant message
    const messageElements = document.querySelectorAll('.navi-message.assistant');
    const lastMessage = messageElements[messageElements.length - 1];

    if (!lastMessage) return;

    const contentElement = lastMessage.querySelector('.smd-content');
    if (!contentElement) return;

    // Complete CSS from ResponseContent.css - embedded directly
    const completeCSS = `
/* Container for all response content */
.smd-content {
  font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--navi-text-primary);
}

/* Paragraphs */
.smd-content p {
  margin: 0 0 1rem 0;
  line-height: 1.65;
  display: block;
}

.smd-content > p:last-child {
  margin-bottom: 0;
}

/* Headings */
.smd-content h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--navi-accent);
  margin: 1.5rem 0 0.75rem 0;
  line-height: 1.3;
  letter-spacing: -0.01em;
  display: block;
}

.smd-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--navi-accent);
  margin: 1.75rem 0 0.75rem 0;
  line-height: 1.3;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--navi-border);
  display: block;
}

.smd-content h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--navi-accent);
  margin: 1.25rem 0 0.5rem 0;
  line-height: 1.4;
  display: block;
}

.smd-content h4 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--navi-text-primary);
  margin: 1.25rem 0 0.5rem 0;
  line-height: 1.4;
  display: block;
}

.smd-content h5,
.smd-content h6 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--navi-text-primary);
  margin: 0.875rem 0 0.375rem 0;
  line-height: 1.4;
  display: block;
}

/* First heading shouldn't have top margin */
.smd-content > h1:first-child,
.smd-content > h2:first-child,
.smd-content > h3:first-child,
.smd-content > h4:first-child {
  margin-top: 0;
}

/* Text Emphasis */
.smd-content strong {
  font-weight: 700;
  color: var(--navi-text-primary);
  display: inline;
}

.smd-content em {
  font-style: italic;
  color: var(--navi-text-secondary);
  display: inline;
}

/* Lists - CRITICAL */
.smd-content ul {
  list-style-type: disc;
  list-style-position: outside;
  margin: 0.75rem 0;
  padding-left: 1.5rem;
  display: block;
}

.smd-content ol {
  list-style-type: decimal;
  list-style-position: outside;
  margin: 0.75rem 0;
  padding-left: 1.5rem;
  display: block;
}

.smd-content li {
  display: list-item;
  margin: 0.5rem 0;
  line-height: 1.6;
  padding-left: 0.25rem;
}

/* Definition-style list items: **Term**: Description */
.smd-content li > strong:first-child {
  color: var(--navi-accent);
  font-weight: 600;
  display: inline;
}

/* Nested lists */
.smd-content ul ul,
.smd-content ol ul {
  list-style-type: circle;
  margin: 0.25rem 0 0.5rem 0;
  padding-left: 1.25rem;
}

.smd-content ul ul ul,
.smd-content ol ul ul {
  list-style-type: square;
}

.smd-content ul ol,
.smd-content ol ol {
  margin: 0.25rem 0 0.5rem 0;
  padding-left: 1.25rem;
}

/* Paragraphs inside list items */
.smd-content li p {
  margin: 0;
  display: inline;
}

/* Blockquotes - Key Takeaways with larger text */
.smd-content blockquote {
  border-left: 4px solid var(--navi-accent);
  background: rgba(77, 200, 191, 0.1);
  margin: 1.25rem 0;
  padding: 1rem 1.25rem;
  border-radius: 0 8px 8px 0;
  display: block;
  font-size: 1.0625rem;
}

.smd-content blockquote p {
  margin: 0;
  color: var(--navi-text-primary);
  font-size: 1.0625rem;
  line-height: 1.6;
}

.smd-content blockquote strong {
  color: var(--navi-accent);
  font-size: 1.0625rem;
}

/* Horizontal Rules */
.smd-content hr {
  border: none;
  border-top: 1px solid var(--navi-border-light);
  margin: 1.5rem 0;
  display: block;
}

/* Code */
.smd-content code {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.875em;
  background: rgba(77, 200, 191, 0.15);
  color: var(--navi-accent-light);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  display: inline;
}

.smd-content pre {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1rem 0;
  display: block;
}

.smd-content pre code {
  background: none;
  padding: 0;
  font-size: 0.875rem;
  color: var(--navi-text-primary);
}

/* Tables */
.smd-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.875rem;
  display: table;
}

.smd-content th,
.smd-content td {
  border: 1px solid var(--navi-border);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.smd-content th {
  background: rgba(77, 200, 191, 0.2);
  font-weight: 600;
  color: var(--navi-text-primary);
}

.smd-content tr:nth-child(even) {
  background: rgba(0, 0, 0, 0.1);
}

/* Links */
.smd-content a {
  color: var(--navi-accent);
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
  transition: all 0.15s ease;
}

.smd-content a:hover {
  color: var(--navi-accent-hover);
  text-decoration-style: solid;
}

/* Citations (superscript) */
.smd-content sup,
.smd-content .citation-link {
  font-size: 0.7em;
  font-weight: 600;
  color: var(--navi-accent);
  vertical-align: super;
  line-height: 0;
  cursor: pointer;
  padding: 0 0.125rem;
  transition: all 0.15s ease;
  display: inline;
}

.smd-content sup:hover,
.smd-content .citation-link:hover {
  color: var(--navi-text-dark);
  background: var(--navi-accent);
  border-radius: 3px;
  padding: 0.125rem 0.25rem;
}

.citation-group {
  display: inline;
  white-space: nowrap;
}

/* First paragraph special styling */
.smd-content > p:first-child {
  font-size: 1.0625rem;
  line-height: 1.7;
}

/* Equation Inline (LaTeX support) */
.smd-content equation-inline {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  color: #77D5CD;
  padding: 0 0.25rem;
}`;

    // Create standalone HTML document
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NaVi Response</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --navi-accent: #4dc8bf;
            --navi-accent-hover: #5AC1BA;
            --navi-accent-light: #A8E6E1;
            --navi-text-primary: #e0e0e0;
            --navi-text-secondary: #77D5CD;
            --navi-text-dark: #163C38;
            --navi-border: rgba(41, 113, 112, .3);
            --navi-border-light: rgba(41, 113, 112, .5);
        }

        * {
            box-sizing: border-box;
        }

        body {
            font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: #234646;
            color: #e0e0e0;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
            line-height: 1.6;
        }

        h1 {
            color: #4dc8bf;
            font-size: 1.75rem;
            margin-bottom: 1rem;
        }

        .user-prompt {
            background: rgba(77, 200, 191, 0.1);
            border-left: 4px solid #4dc8bf;
            padding: 1rem 1.5rem;
            margin: 1.5rem 0;
            border-radius: 4px;
        }

        .user-prompt h2 {
            color: #4dc8bf;
            font-size: 1.125rem;
            margin: 0 0 0.5rem 0;
        }

        hr {
            border: none;
            border-top: 2px solid rgba(41, 113, 112, .3);
            margin: 2rem 0;
        }

        ${completeCSS}
    </style>
</head>
<body>
    <h1>NaVi Response</h1>
    <div class="user-prompt">
        <h2>User Prompt</h2>
        <p>${lastUserMsg}</p>
    </div>
    <hr>
    <div class="smd-content">
        ${contentElement.innerHTML}
    </div>
</body>
</html>`;

    // Create filename and download
    const truncatedPrompt = lastUserMsg
      .substring(0, 50)
      .replace(/[^a-z0-9\s]/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
      || 'response';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const timestamp = `${day}.${month}.${year}-${hours}:${minutes}`;
    const filename = `${truncatedPrompt} - ${timestamp}.html`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    // Get the rendered HTML
    const messageElements = document.querySelectorAll('.navi-message.assistant');
    const lastMessage = messageElements[messageElements.length - 1];

    if (!lastMessage) return;

    const contentElement = lastMessage.querySelector('.smd-content');
    if (!contentElement) return;

    // Use browser's print functionality to generate PDF
    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

    // Create a temporary print-friendly page
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to download PDF');
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NaVi Response</title>
    <style>
        @media print {
            body {
                margin: 0;
                padding: 20mm;
            }
        }
        :root {
            --navi-accent: #4dc8bf;
            --navi-text-primary: #2c3e50;
            --navi-text-secondary: #5a6c7d;
            --navi-border: #cbd5e0;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: white;
            color: #2c3e50;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #2c3e50;
            font-size: 1.75rem;
            margin-bottom: 1rem;
            page-break-after: avoid;
        }
        .user-prompt {
            background: #f7f9fc;
            border-left: 4px solid #4dc8bf;
            padding: 1rem 1.5rem;
            margin: 1.5rem 0;
            border-radius: 4px;
            page-break-inside: avoid;
        }
        .user-prompt h2 {
            color: #4dc8bf;
            font-size: 1.125rem;
            margin: 0 0 0.5rem 0;
        }
        hr {
            border: none;
            border-top: 2px solid #cbd5e0;
            margin: 2rem 0;
            page-break-after: avoid;
        }
        .smd-content {
            font-size: 0.9375rem;
            line-height: 1.65;
            color: #2c3e50;
        }
        .smd-content h2 {
            color: #4dc8bf;
            font-size: 1.5rem;
            font-weight: 700;
            margin: 1.375rem 0 0.75rem 0;
            page-break-after: avoid;
        }
        .smd-content h3 {
            color: #2c3e50;
            font-size: 1.25rem;
            font-weight: 700;
            margin: 1.125rem 0 0.625rem 0;
            page-break-after: avoid;
        }
        .smd-content p {
            margin: 0.75rem 0;
        }
        .smd-content strong {
            font-weight: 700;
            color: #2c3e50;
        }
        .smd-content ul {
            margin: 0.75rem 0;
            padding-left: 1.75rem;
            list-style-type: disc;
        }
        .smd-content li {
            margin: 0.375rem 0;
            line-height: 1.6;
        }
        .citation-link {
            color: #4dc8bf;
            font-size: 0.75em;
            font-weight: 600;
            vertical-align: super;
        }
    </style>
</head>
<body>
    <h1>NaVi Response</h1>
    <div class="user-prompt">
        <h2>User Prompt</h2>
        <p>${lastUserMsg}</p>
    </div>
    <hr>
    <div class="smd-content">
        ${contentElement.innerHTML}
    </div>
    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() { window.close(); }, 500);
            }, 500);
        };
    </script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Handle citation clicks - open references panel and filter to clicked citations
  const handleShowCitations = (citationIds: number[]) => {
    setFilteredCitationIds(citationIds);
    setShowReferences(true);
  };

  // Toggle references panel - clear filter when toggling manually
  const handleToggleReferences = () => {
    if (showReferences) {
      setShowReferences(false);
      setFilteredCitationIds(null);
    } else {
      setShowReferences(true);
      setFilteredCitationIds(null); // Show all when manually opened
    }
  };

  // Get citations to display (filtered or all)
  const displayedCitations = filteredCitationIds
    ? allCitations.filter(c => filteredCitationIds.includes(c.id))
    : allCitations;

  const hasMessages = messages.length > 0 || streamingContent.length > 0;

  return (
    <main className="navi-chat-area">
      {/* Mobile Header with toggle icons and labels - only shown on mobile */}
      {isMobile && (
        <div className="navi-mobile-header">
          <button
            className={`navi-mobile-toggle ${activeMobilePanel === 'chats' ? 'active' : ''}`}
            onClick={onToggleMobileChats}
            aria-label="Toggle chat history"
          >
            {/* Chat history icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="navi-toggle-label">Chats</span>
            {chatHistoryCount > 0 && (
              <span className="navi-toggle-badge">{chatHistoryCount}</span>
            )}
          </button>

          <span className="navi-mobile-title">NaVi</span>

          <button
            className={`navi-mobile-toggle ${activeMobilePanel === 'bookmarks' ? 'active' : ''}`}
            onClick={onToggleMobileBookmarks}
            aria-label="Toggle bookmarks"
          >
            {/* Bookmark icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
            <span className="navi-toggle-label">Saved</span>
            {bookmarksCount > 0 && (
              <span className="navi-toggle-badge">{bookmarksCount}</span>
            )}
          </button>
        </div>
      )}

      {/* Panel Header Bar - Centered layout with theme toggle */}
      <div className="navi-panel-header navi-panel-header-center">
        <div className="navi-header-title-group">
          <svg className="navi-header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="20" height="20" fill="currentColor">
            <path fillRule="evenodd" d="M880 912H144c-17.7 0-32-14.3-32-32V144c0-17.7 14.3-32 32-32h360c4.4 0 8 3.6 8 8v56c0 4.4-3.6 8-8 8H184v656h656V520c0-4.4 3.6-8 8-8h56c4.4 0 8 3.6 8 8v360c0 17.7-14.3 32-32 32M770.87 199.131l-52.2-52.2c-4.7-4.7-1.9-12.8 4.7-13.6l179.4-21c5.1-.6 9.5 3.7 8.9 8.9l-21 179.4c-.8 6.6-8.9 9.4-13.6 4.7l-52.4-52.4l-256.2 256.2c-3.1 3.1-8.2 3.1-11.3 0l-42.4-42.4c-3.1-3.1-3.1-8.2 0-11.3z"/>
          </svg>
          <h2>Ask NaVi</h2>
        </div>
        {onThemeChange && (
          <div className="navi-theme-toggle-container">
            <div className="navi-theme-toggle">
              {/* Dark theme button */}
              <button
                className={`navi-theme-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => onThemeChange('dark')}
                title="Dark theme"
                aria-label="Dark theme"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* Light theme button */}
              <button
                className={`navi-theme-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => onThemeChange('light')}
                title="Light theme"
                aria-label="Light theme"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {/* Accessible theme button */}
              <button
                className={`navi-theme-btn ${theme === 'accessible' ? 'active' : ''}`}
                onClick={() => onThemeChange('accessible')}
                title="High contrast (WCAG AA)"
                aria-label="High contrast accessible theme"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="navi-chat-content">
        <div className={`navi-chat-messages ${showReferences ? 'blurred' : ''}`} ref={messagesContainerRef}>
          {!hasMessages ? (
            <WelcomeState subtitle={welcomeSubtitle} onPromptSelect={onPromptSelect} />
          ) : (
            <div className="navi-messages-container">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  resources={resources}
                  onViewResource={onViewResource}
                  onOpenResourceUrl={onOpenResourceUrl}
                  onShowCitations={handleShowCitations}
                  showMetadata={showMetadata}
                />
              ))}
              {isLoading && streamingContent && (
                <div className="navi-message assistant">
                  <div className="navi-message-avatar">
                    <span>NaVi</span>
                  </div>
                  <div className="navi-message-bubble">
                    <StreamingMarkdown
                      text={streamingContent}
                      onCitationsReady={setStreamingCitations}
                      resources={resources}
                      onCitationClick={onViewResource}
                      onShowCitations={handleShowCitations}
                    />
                    {showMetadata && streamingContent && (
                      <ResponseMetadataDisplay metadata={calculateMetadata(streamingContent, resources)} />
                    )}
                  </div>
                </div>
              )}
              {isLoading && !streamingContent && (
                <ThinkingState query={lastUserMessage?.content} progressSteps={reasoningSteps} />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Sign-in prompt - positioned above action buttons */}
        {showSignInPrompt && onSignIn && onDismissSignInPrompt && (
          <div className="navi-sign-in-prompt-container">
            <SignInPrompt
              onSignIn={onSignIn}
              onDismiss={onDismissSignInPrompt}
              isLoading={isSigningIn}
            />
          </div>
        )}

        {/* References Panel - Redesigned overlay */}
        {showReferences && (
          <div className="navi-references-panel-overlay">
            <div className="navi-references-panel">
              {/* Header with title, color key, and close button */}
              <div className="navi-references-panel-header">
                <span className="navi-references-title">References</span>
                {/* Color key legend */}
                <div className="navi-references-tabs">
                  <span className="navi-references-tab roadmap-key">ROADMAP</span>
                  <span className="navi-references-tab library-key">LIBRARY</span>
                </div>
                <button
                  onClick={handleToggleReferences}
                  className="navi-references-close-btn"
                  aria-label="Close references"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              {/* Reference list content */}
              <div className="navi-references-panel-content">
                {displayedCitations.length === 0 ? (
                  <p className="navi-references-empty">
                    No references found in this response.
                  </p>
                ) : (
                  <ul className="navi-references-list">
                    {displayedCitations.map(citation => {
                      const isLibrary = citation.resource?.contentType === 'library';
                      const isRoadmap = citation.resource?.contentType === 'roadmap';
                      const isSelected = selectedCitations.has(citation.id);
                      const contentTypeClass = isRoadmap ? 'roadmap' : isLibrary ? 'library' : '';

                      return (
                        <li key={citation.id} className={`navi-references-item ${contentTypeClass}`}>
                          {/* Checkbox */}
                          <button
                            className={`navi-references-checkbox ${isSelected ? 'checked' : ''}`}
                            onClick={() => {
                              const newSelected = new Set(selectedCitations);
                              if (isSelected) {
                                newSelected.delete(citation.id);
                              } else {
                                newSelected.add(citation.id);
                                // Also add to bookmarks
                                if (onViewResource && citation.resource) {
                                  onViewResource(citation.resource, citation.id);
                                }
                              }
                              setSelectedCitations(newSelected);
                            }}
                            aria-label={isSelected ? "Deselect reference" : "Select reference"}
                          >
                            {isSelected && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                          {/* Reference number */}
                          <span className="navi-references-id">[{citation.id}]</span>
                          {/* Title */}
                          <span className="navi-references-title-text">
                            {citation.resource?.title || citation.title}
                          </span>
                          {/* External link icon */}
                          {citation.resource && (
                            <button
                              className="navi-references-external-btn"
                              onClick={(e) => {
                                if (!citation.resource) return;
                                // Stop propagation to prevent modal overlay click handler from immediately closing
                                e.stopPropagation();
                                e.preventDefault();
                                // Use shared modal utility
                                openResourceInModal(citation.resource);
                              }}
                              aria-label={citation.resource.wpPostId ? "Open in modal" : "Open in new tab"}
                              title={citation.resource.wpPostId ? "Opens in modal" : "Opens in new tab"}
                            >
                              {citation.resource.wpPostId ? (
                                // Modal icon for library resources with wpPostId
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                // External link icon for roadmap resources or no wpPostId
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Action Buttons - Below references panel when expanded */}
        {hasMessages && (
          <div className="navi-chat-actions">
            {!isLoading && (
              <>
                {/* Download dropdown */}
                <div className="navi-download-dropdown">
                  <button
                    className="navi-action-btn"
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    title="Download options"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Save
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  {showDownloadMenu && (
                    <div className="navi-download-menu">
                      <button onClick={() => { handleDownload(); setShowDownloadMenu(false); }}>
                        Markdown (.md)
                      </button>
                      <button onClick={() => { handleDownloadPDF(); setShowDownloadMenu(false); }}>
                        PDF (print)
                      </button>
                      <button onClick={() => { handleCopy(); setShowDownloadMenu(false); }}>
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                      </button>
                    </div>
                  )}
                </div>
                {/* References button with badge */}
                <button
                  className={`navi-action-btn navi-references-btn ${showReferences ? 'active' : ''}`}
                  onClick={handleToggleReferences}
                >
                  {showReferences ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  References
                  {allCitations.length > 0 && (
                    <span className="navi-references-badge">{allCitations.length}</span>
                  )}
                </button>
                {/* Back to top button */}
                <button
                  className="navi-action-btn navi-back-to-top"
                  onClick={() => messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  title="Back to top"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Top
                </button>
              </>
            )}
            {isLoading && onStop && (
              <button
                className="navi-action-btn stop"
                onClick={onStop}
                aria-label="Stop generating"
                title="Stop generating"
              >
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="2" width="10" height="10" rx="1" fill="currentColor"/>
                </svg>
                Stop
              </button>
            )}
          </div>
        )}
      </div>

      {/* Input Footer Area - Differentiated from chat */}
      <div className="navi-input-footer">
        <div className="navi-input-footer-inner">
          {/* Textarea Input */}
          <div className="navi-input-row">
            <div className="navi-input-wrapper">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask NaVi anything about digital health technologies..."
                className="navi-input-field"
                disabled={isLoading}
                rows={1}
              />
              <button
                onClick={onSend}
                disabled={!input.trim() || isLoading}
                className="navi-send-btn"
                title="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

function WelcomeState({ subtitle, onPromptSelect }: { subtitle: string; onPromptSelect?: (prompt: string) => void }) {
  const [showPrompts, setShowPrompts] = useState(false);
  const [promptPage, setPromptPage] = useState(0);

  const allPrompts = [
    [
      {
        category: "Developers",
        prompt: "What evidence do pharmaceutical sponsors need to see before adopting an sDHT for a pivotal clinical trial?",
      },
      {
        category: "Developers",
        prompt: "How do I define and document context of use for my digital health technology in a way that satisfies FDA expectations?",
      },
      {
        category: "Developers",
        prompt: "What are the V3+ framework domains and how should I demonstrate performance across each?",
      },
      {
        category: "Adopters",
        prompt: "How can I demonstrate ROI to decision makers when proposing an sDHT for our clinical trial?",
      },
    ],
    [
      {
        category: "Adopters",
        prompt: "What steps should I take to determine if a digital endpoint reflects a meaningful aspect of health for my patient population?",
      },
      {
        category: "Adopters",
        prompt: "What are best practices for managing continuous sensor data and mitigating operational risks in multi-site trials?",
      },
      {
        category: "Regulators",
        prompt: "Summarize FDA guidance from CDER, CBER, and CDRH on using sDHT-generated data as primary or secondary endpoints.",
      },
      {
        category: "Regulators",
        prompt: "What are the most common evidentiary gaps in sponsor submissions involving digital measurement?",
      },
    ],
    [
      {
        category: "Cross-Persona",
        prompt: "What regulatory precedents exist for FDA approval of digital endpoints, and what made those submissions successful?",
      },
      {
        category: "Cross-Persona",
        prompt: "How do I address wear-time adherence and data missingness challenges when using wearable sensors?",
      },
      {
        category: "General",
        prompt: "Give me an overview of the sDHT Adoption Roadmap and how it helps developers, adopters, and regulators.",
      },
      {
        category: "General",
        prompt: "What are the key differences between verification, analytical validation, and clinical validation for sDHTs?",
      },
    ],
  ];

  const currentPrompts = allPrompts[promptPage];

  const handleRefresh = () => {
    setPromptPage((prev) => (prev + 1) % allPrompts.length);
  };

  return (
    <div className="navi-welcome-state">
      <p className="navi-welcome-subtitle">{subtitle}</p>

      {/* Version number */}
      <div style={{
        fontSize: '0.75rem',
        opacity: 0.5,
        marginTop: '0.5rem',
        fontFamily: 'monospace'
      }}>
        v{WIDGET_VERSION}
      </div>

      {/* Need inspiration? toggle */}
      <button
        onClick={() => setShowPrompts(!showPrompts)}
        className="navi-inspiration-toggle"
      >
        <svg className="navi-sparkles-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>Need inspiration?</span>
        <svg className={`navi-chevron-icon ${showPrompts ? 'expanded' : ''}`} width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div className={`navi-prompts-container ${showPrompts ? 'expanded' : ''}`}>
        {/* 2x2 grid layout */}
        <div className="navi-prompts-grid">
          {currentPrompts.map((item, index) => (
            <button
              key={`${promptPage}-${index}`}
              onClick={() => onPromptSelect?.(item.prompt)}
              className="navi-prompt-card"
            >
              <p className="navi-prompt-text">{item.prompt}</p>
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <button onClick={handleRefresh} className="navi-refresh-prompts">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Show more prompts</span>
        </button>
      </div>
    </div>
  );
}

function ThinkingState({ query, progressSteps }: { query?: string; progressSteps?: string }) {
  // Use real progress steps if available, otherwise fallback to generic messages
  const displayText = useMemo(() => {
    if (progressSteps) {
      return progressSteps;
    }
    return query
      ? `thinking about "${query.substring(0, 40)}${query.length > 40 ? '...' : ''}"`
      : 'thinking about your request';
  }, [progressSteps, query]);

  return (
    <div className="navi-message assistant">
      <div className="navi-thinking-row">
        <div className="navi-message-avatar">
          <span>NaVi</span>
        </div>
        <div className="navi-thinking">
          <span className="navi-thinking-text" style={{
            fontSize: '1.05rem',
            fontWeight: 600,
            letterSpacing: '0.01em'
          }}>
            {displayText}
          </span>
          <span className="navi-thinking-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </div>
      </div>
    </div>
  );
}

interface ResponseMetadata {
  wordCount: number;
  citationCount: number;
  libraryCount: number;
  roadmapCount: number;
}

function calculateMetadata(content: string, resources: Resource[]): ResponseMetadata {
  // Word count (approximate - counts words in plain text)
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

  // Parse citations from content
  const { citations } = parseCitations(content, resources);
  const citationCount = citations.length;

  // Count library vs roadmap references
  let libraryCount = 0;
  let roadmapCount = 0;

  citations.forEach(citation => {
    const resource = resources.find(r => r.id === citation.resourceId);
    if (resource) {
      if (resource.contentType === 'library') {
        libraryCount++;
      } else if (resource.contentType === 'roadmap') {
        roadmapCount++;
      }
    }
  });

  return {
    wordCount,
    citationCount,
    libraryCount,
    roadmapCount
  };
}

function ResponseMetadataDisplay({ metadata }: { metadata: ResponseMetadata }) {
  return (
    <div className="navi-response-metadata">
      <span className="metadata-item">
        <strong>{metadata.wordCount}</strong> words
      </span>
      <span className="metadata-divider">•</span>
      <span className="metadata-item">
        <strong>{metadata.citationCount}</strong> references
      </span>
      {(metadata.libraryCount > 0 || metadata.roadmapCount > 0) && (
        <>
          <span className="metadata-divider">•</span>
          <span className="metadata-item">
            📚 <strong>{metadata.libraryCount}</strong> library
          </span>
          <span className="metadata-divider">•</span>
          <span className="metadata-item">
            🗺️ <strong>{metadata.roadmapCount}</strong> roadmap
          </span>
        </>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  resources?: Resource[];
  onViewResource?: (resource: Resource) => void;
  onOpenResourceUrl?: (resource: Resource) => void;
  onShowCitations?: (citationIds: number[]) => void;
  showMetadata?: boolean;
}

function MessageBubble({ message, resources = [], onViewResource, onOpenResourceUrl, onShowCitations, showMetadata = false }: MessageBubbleProps) {
  if (message.role === 'user') {
    return (
      <div className="navi-message user">
        <div className="navi-message-bubble user">
          <p>{message.content}</p>
        </div>
      </div>
    );
  }

  const metadata = showMetadata ? calculateMetadata(message.content, resources) : null;

  return (
    <div className="navi-message assistant">
      <div className="navi-message-avatar">
        <span>NaVi</span>
      </div>
      <div className="navi-message-bubble">
        <StreamingMarkdown
          text={message.content}
          resources={resources}
          onCitationClick={onViewResource}
          onShowCitations={onShowCitations}
        />
        {metadata && <ResponseMetadataDisplay metadata={metadata} />}
      </div>
    </div>
  );
}

export default ChatArea;
