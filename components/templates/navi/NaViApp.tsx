import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Template, Resource, ChatHistory } from '../../../types';
import { generateContent, generateIntro, getKnowledge, saveChatHistory, getChatHistory, saveBookmarks, getBookmarks, getLastCollectionInfo } from '../../../services/apiClient';
import { BookmarkedResource } from '../../../services/backendService';
import { DEFAULT_RESPONSE_TEMPLATE, ENABLE_PERMANENT_CITATIONS, SHOW_DEV_UI } from '../../../constants';
import { LeftSidebar } from './LeftSidebar';
import { ChatArea } from './ChatArea';
import { RightSidebar } from './RightSidebar';
import Modal from '../../Modal';
import { ResourceModal } from './ResourceModal';
import { TermsModal } from './TermsModal';
import { auth, signInAnonymouslyIfNeeded, linkAnonymousToGoogle } from '../../../services/firebaseConfig';
import { onAuthStateChanged, User } from 'firebase/auth';
import { flushSync } from 'react-dom';
import './NaViStyles.css'; // Updated: placeholder widths reduced to 75%
import './ResponseContent.css'; // Clean response content styles
import { logger } from '../../../utils/logger';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ResourcePreview {
  resource: Resource;
  citationId: number;
}

interface PageContext {
  url?: string;
  path?: string;
  title?: string;
  postId?: number;
  postType?: string;
  excerpt?: string;
  siteUrl?: string;
  siteName?: string;
  categories?: string[];
  customFields?: Record<string, string | number>;
  termsContent?: string;
  termsTitle?: string;
  termsEnabled?: boolean;
}

interface NaViAppProps {
  welcomeSubtitle?: string;
  embedded?: boolean;
  pageContext?: PageContext;
  hideSidebars?: boolean;
  neutralTheme?: boolean;
  showMetadata?: boolean;
  sharedInput?: string;
  onSharedInputChange?: (value: string) => void;
  triggerSend?: boolean;
  onSendComplete?: () => void;
}

// Storage key for persisting selected resources
const SELECTED_RESOURCES_STORAGE_KEY = 'navi-selected-resources';
// Storage key for persisting chat history (session storage - survives refresh but not browser close)
const CHAT_HISTORY_STORAGE_KEY = 'navi-chat-history';

// Helper to detect mobile viewport
const getIsMobile = () => typeof window !== 'undefined' && window.innerWidth < 700;

const NaViApp: React.FC<NaViAppProps> = ({
  welcomeSubtitle = 'NaVi is your personal navigator, indexing only vetted sources in the sDHT Adoption Library and Roadmap.',
  embedded = false,
  pageContext,
  hideSidebars = false,
  neutralTheme = false,
  showMetadata = false,
  sharedInput,
  onSharedInputChange,
  triggerSend = false,
  onSendComplete,
}) => {
  // Log page context when component mounts or updates
  useEffect(() => {
    if (pageContext) {
      logger.debug('NaViApp: Page context received:', pageContext);
    }
  }, [pageContext]);
  const [user, setUser] = useState<User | null>(null);
  const [input, setInput] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastStoppedQuery, setLastStoppedQuery] = useState<string | null>(null);
  // Session ID for tracking conversation threads in metrics
  const [sessionId, setSessionId] = useState<string>(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  // Progress steps for showing in NaVi ticker
  const [reasoningSteps, setReasoningSteps] = useState<string>('');

  // Sign-in prompt state - show when user clicks login button (for anonymous users)
  const [showSignInPromptManual, setShowSignInPromptManual] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  const [resources, setResources] = useState<Resource[]>([]);
  const [collectionName, setCollectionName] = useState<string>('');
  // Initialize from sessionStorage on mount (for anonymous session persistence)
  // This ensures chat history persists across page refreshes within the same tab
  const [chatHistoryList, setChatHistoryList] = useState<ChatHistory[]>(() => {
    try {
      const stored = sessionStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        logger.debug('[NaViApp] Initialized chatHistoryList from sessionStorage:', parsed.length, 'chats');
        return parsed;
      }
    } catch (e) {
      logger.error('Failed to load chat history from sessionStorage on init:', e);
    }
    return [];
  });
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  // Mobile: Start with sidebars collapsed for clean mobile UX
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(getIsMobile);
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(getIsMobile);
  const [isMobile, setIsMobile] = useState(getIsMobile);

  // Mobile panel overlay state - track which panel is open (only one at a time)
  const [activeMobilePanel, setActiveMobilePanel] = useState<'chats' | 'bookmarks' | null>(null);

  // Citation mode: 'legacy' (original bug), 'suffix' (query-aware fix), 'permanent' (Firestore IDs)
  type CitationMode = 'legacy' | 'suffix' | 'permanent';
  const citationMode: CitationMode = 'permanent';
  const usePermanentCitations = true;

  // Initialize from localStorage on mount (for anonymous session persistence)
  // This ensures bookmarks persist across page refreshes within the browser
  const [selectedResources, setSelectedResources] = useState<ResourcePreview[]>(() => {
    try {
      const stored = localStorage.getItem(SELECTED_RESOURCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        logger.debug('[NaViApp] Initialized selectedResources from localStorage:', parsed.length, 'bookmarks');
        return parsed;
      }
    } catch (e) {
      logger.error('Failed to load bookmarks from localStorage on init:', e);
    }
    return [];
  });

  // AbortController for stopping generation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Ref for container to enable ResizeObserver
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track previous user ID to detect user changes (anonymous -> Google login)
  const previousUserIdRef = useRef<string | null>(null);

  // Track if we've loaded chat history for this authenticated user in this session
  const hasLoadedAuthUserHistoryRef = useRef<boolean>(false);

  // Track if we've loaded bookmarks for this authenticated user in this session
  const hasLoadedBookmarksRef = useRef<boolean>(false);

  // Terms modal state (hard-coded modal)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

  // Resource modal state
  const [isResourceModalOpen, setIsResourceModalOpen] = useState<boolean>(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // ResizeObserver for responsive CSS custom properties and mobile detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSizeProperties = () => {
      const { width, height } = container.getBoundingClientRect();

      // Set CSS custom properties based on container size
      container.style.setProperty('--container-width', `${width}px`);
      container.style.setProperty('--container-height', `${height}px`);

      // Calculate responsive scale factors (0.7 to 1.2 range)
      const widthScale = Math.min(Math.max(width / 1200, 0.7), 1.2);
      const heightScale = Math.min(Math.max(height / 600, 0.7), 1.2);

      container.style.setProperty('--width-scale', widthScale.toString());
      container.style.setProperty('--height-scale', heightScale.toString());

      // Responsive font base (14px to 20px range based on container width)
      const baseFontSize = Math.min(Math.max(width * 0.014, 14), 20);
      container.style.setProperty('--responsive-font-base', `${baseFontSize}px`);

      // Update mobile state based on container width
      const nowMobile = width < 700;
      if (nowMobile !== isMobile) {
        setIsMobile(nowMobile);
        // Auto-collapse sidebars when switching to mobile
        if (nowMobile) {
          setIsLeftSidebarCollapsed(true);
          setIsRightSidebarCollapsed(true);
        }
      }
    };

    const resizeObserver = new ResizeObserver(updateSizeProperties);
    resizeObserver.observe(container);
    updateSizeProperties(); // Initial call

    return () => resizeObserver.disconnect();
  }, [isMobile]);

  // Persist bookmarks (localStorage for anonymous, Firestore for authenticated)
  useEffect(() => {
    const saveBookmarksAsync = async () => {
      try {
        const currentUser = auth.currentUser;
        const isAuthenticatedUser = currentUser && !currentUser.isAnonymous;

        logger.debug('[NaViApp] Bookmark save triggered:', {
          isAuthenticatedUser,
          hasLoadedBookmarks: hasLoadedBookmarksRef.current,
          bookmarkCount: selectedResources.length,
          uid: currentUser?.uid,
        });

        if (isAuthenticatedUser && hasLoadedBookmarksRef.current) {
          // Save to Firestore for authenticated users (only after initial load to prevent overwriting)
          logger.debug('[NaViApp] Saving', selectedResources.length, 'bookmarks to Firestore...');
          const bookmarksToSave: BookmarkedResource[] = selectedResources.map(sr => ({
            resource: sr.resource,
            citationId: sr.citationId,
            timestamp: new Date().toISOString(),
          }));
          await saveBookmarks(bookmarksToSave);
          logger.debug('[NaViApp] Bookmarks saved successfully to Firestore');
        } else if (!isAuthenticatedUser) {
          // Save to localStorage for anonymous users as fallback
          logger.debug('[NaViApp] Saving to localStorage (anonymous user)');
          localStorage.setItem(SELECTED_RESOURCES_STORAGE_KEY, JSON.stringify(selectedResources));
        } else {
          logger.debug('[NaViApp] Skipping bookmark save - hasLoadedBookmarksRef is false (initial load not complete)');
        }
      } catch (e) {
        logger.error('[NaViApp] Failed to save bookmarks:', e);
      }
    };

    saveBookmarksAsync();
  }, [selectedResources]);

  // Persist chat history to sessionStorage (for deletions and updates)
  useEffect(() => {
    try {
      sessionStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatHistoryList));
    } catch (e) {
      logger.error('Failed to save chat history to storage:', e);
    }
  }, [chatHistoryList]);

  // Apply style overrides to ensure CSS isolation from WordPress themes
  // Using CSS variables for responsive font sizes (set by ResizeObserver)
  useEffect(() => {
    const styleOverrides: Record<string, Record<string, string>> = {
      '.navi-welcome-title': {
        'font-size': 'var(--font-2xl)',
        'font-weight': '700',
        'line-height': '1.3',
        'font-family': '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        'color': '#E8F5F4',
        'margin': '0 0 16px 0',
        'padding': '0',
        'text-transform': 'none'
      },
      '.navi-welcome-subtitle': {
        'font-size': 'var(--font-lg)',
        'font-weight': '400',
        'line-height': '1.6',
        'font-family': '"DM Sans", -apple-system, BlinkMacSystemFont, sans-serif',
        'color': '#77D5CD',
        'max-width': '600px',
        'margin': '0 0 8px 0',
        'padding': '0',
        'text-transform': 'none'
      },
      '.navi-inspiration-toggle': {
        'font-size': 'var(--font-base)',
        'font-weight': '500',
        'margin-top': 'var(--space-lg)'
      },
      '.navi-input-field': {
        'font-size': '15px'
      },
      '.navi-prompt-text': {
        'font-size': 'var(--font-sm)',
        'line-height': '1.5'
      }
    };

    const applyStyles = () => {
      Object.entries(styleOverrides).forEach(([selector, styles]) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          Object.entries(styles).forEach(([prop, value]) => {
            htmlEl.style.setProperty(prop, value, 'important');
          });
        });
      });
    };

    // Apply immediately
    applyStyles();

    // Apply after delays for React hydration
    const timeouts = [100, 500, 1000, 2000].map(delay =>
      setTimeout(applyStyles, delay)
    );

    // MutationObserver for dynamically added elements
    const observer = new MutationObserver((mutations) => {
      if (mutations.some(m => m.addedNodes.length > 0)) {
        applyStyles();
      }
    });

    const container = document.querySelector('.navi-container');
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, []);

  // Load knowledge sources and handle auth
  useEffect(() => {
    const loadKnowledge = async () => {
      try {
        const knowledge = await getKnowledge();
        setResources(knowledge);
        const info = getLastCollectionInfo();
        if (info) setCollectionName(info.collectionName);
      } catch (e) {
        logger.error("Could not fetch data:", e);
        toast.error("Could not load knowledge base.", { autoClose: false });
      }
    };

    const loadChatHistory = async (forceReload = false) => {
      try {
        logger.debug('[NaViApp] loadChatHistory called, forceReload:', forceReload);

        const currentUser = auth.currentUser;
        const isAuthenticatedUser = currentUser && !currentUser.isAnonymous;

        logger.debug('[NaViApp] Current user status:', {
          uid: currentUser?.uid,
          isAnonymous: currentUser?.isAnonymous,
          isAuthenticatedUser,
          hasLoadedAuthUserHistory: hasLoadedAuthUserHistoryRef.current,
        });

        // If forcing reload, clear session storage first
        if (forceReload) {
          logger.debug('[NaViApp] Force reload - clearing session storage');
          sessionStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
          hasLoadedAuthUserHistoryRef.current = false;
        }

        // For anonymous users, sessionStorage is already loaded in useState initializer
        // So we don't need to do anything unless forcing a reload
        if (!isAuthenticatedUser) {
          if (!forceReload) {
            logger.debug('[NaViApp] Anonymous user - using already initialized sessionStorage data');
            return;
          } else {
            // Force reload for anonymous means clear everything
            logger.debug('[NaViApp] Force reload for anonymous user - clearing chat history');
            setChatHistoryList([]);
            return;
          }
        }

        // For authenticated users, only use cached data if we've already loaded it once in this session
        const storedHistory = sessionStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
        logger.debug('[NaViApp] Session storage has data?', !!storedHistory);

        const shouldUseCached = storedHistory && !forceReload && hasLoadedAuthUserHistoryRef.current;

        if (shouldUseCached) {
          logger.debug('[NaViApp] Using cached session storage data');
          return;
        }

        // Fetch from Firebase for authenticated users
        logger.debug('[NaViApp] Fetching chat history from Firebase...');
        const history = await getChatHistory();
        logger.debug('[NaViApp] Received chat history:', history.length, 'chats');
        setChatHistoryList(history);

        // Mark that we've loaded history for this authenticated user
        hasLoadedAuthUserHistoryRef.current = true;
        logger.debug('[NaViApp] Marked authenticated user history as loaded');
      } catch (e) {
        logger.error("Could not load chat history:", e);
      }
    };

    const loadBookmarksFromFirestore = async (forceReload = false) => {
      try {
        logger.debug('[NaViApp] loadBookmarksFromFirestore called, forceReload:', forceReload);

        const currentUser = auth.currentUser;
        const isAuthenticatedUser = currentUser && !currentUser.isAnonymous;

        logger.debug('[NaViApp] Bookmark load - user status:', {
          uid: currentUser?.uid,
          isAnonymous: currentUser?.isAnonymous,
          isAuthenticatedUser,
          hasLoadedBookmarks: hasLoadedBookmarksRef.current,
        });

        // For authenticated users, load from Firestore
        if (isAuthenticatedUser) {
          // Only fetch if we haven't loaded yet in this session or forcing reload
          if (!hasLoadedBookmarksRef.current || forceReload) {
            logger.debug('[NaViApp] Fetching bookmarks from Firestore...');
            const bookmarks = await getBookmarks();
            logger.debug('[NaViApp] Received bookmarks:', bookmarks.length, 'bookmarks');

            // Convert BookmarkedResource[] to ResourcePreview[]
            const firestoreBookmarks: ResourcePreview[] = bookmarks.map(b => ({
              resource: b.resource,
              citationId: b.citationId,
            }));

            // Merge localStorage bookmarks with Firestore bookmarks
            // This preserves bookmarks accumulated during anonymous session
            let mergedBookmarks = firestoreBookmarks;
            try {
              const stored = localStorage.getItem(SELECTED_RESOURCES_STORAGE_KEY);
              if (stored) {
                const localBookmarks: ResourcePreview[] = JSON.parse(stored);
                if (localBookmarks.length > 0) {
                  // Deduplicate by resource id, preferring Firestore versions
                  const existingIds = new Set(firestoreBookmarks.map(b => b.resource.id));
                  const newFromLocal = localBookmarks.filter(b => !existingIds.has(b.resource.id));
                  if (newFromLocal.length > 0) {
                    mergedBookmarks = [...firestoreBookmarks, ...newFromLocal];
                    logger.debug(`[NaViApp] Merged ${newFromLocal.length} localStorage bookmarks with ${firestoreBookmarks.length} Firestore bookmarks`);
                  }
                }
              }
            } catch (e) {
              logger.error('[NaViApp] Failed to merge localStorage bookmarks:', e);
            }

            // CRITICAL: Set the ref BEFORE updating state to prevent race condition
            // This allows the save useEffect to know we've loaded and can now save changes
            hasLoadedBookmarksRef.current = true;
            setSelectedResources(mergedBookmarks);
            // Clear localStorage after successful merge to Firestore
            localStorage.removeItem(SELECTED_RESOURCES_STORAGE_KEY);
            logger.debug('[NaViApp] Bookmarks loaded and merged (enabling saves)');
          } else {
            logger.debug('[NaViApp] Bookmarks already loaded in this session');
          }
        } else {
          // For anonymous users, localStorage is already loaded in useState initializer
          // So we don't need to do anything
          logger.debug('[NaViApp] Anonymous user - using already initialized localStorage data for bookmarks');
        }
      } catch (e) {
        logger.error("Could not load bookmarks:", e);
      }
    };

    signInAnonymouslyIfNeeded().then((anonUser) => {
      if (anonUser) {
        setUser(anonUser);
        previousUserIdRef.current = anonUser.uid;
        loadChatHistory();
        loadKnowledge(); // ✅ Now runs AFTER auth completes
      }
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      logger.debug('[NaViApp] Auth state changed:', {
        currentUserId: currentUser?.uid,
        previousUserId: previousUserIdRef.current,
        isAnonymous: currentUser?.isAnonymous,
      });

      setUser(currentUser);

      // If user changed (e.g., anonymous -> Google login), force reload chat history
      // Don't treat initial load (previousUserIdRef is null) as a user change
      const isInitialLoad = previousUserIdRef.current === null;
      const userChanged = currentUser && currentUser.uid !== previousUserIdRef.current && !isInitialLoad;
      logger.debug('[NaViApp] User changed?', userChanged, '(isInitialLoad:', isInitialLoad, ')');

      if (currentUser) {
        logger.debug('[NaViApp] Loading chat history and bookmarks, forceReload:', userChanged);

        // Small delay to ensure auth.currentUser is fully updated in apiClient
        if (userChanged) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        await loadChatHistory(userChanged);
        await loadBookmarksFromFirestore(userChanged);
        previousUserIdRef.current = currentUser.uid;
      } else {
        // User logged out - reset tracking refs and clear all chat state
        logger.debug('[NaViApp] User logged out - resetting all state and storage');
        hasLoadedAuthUserHistoryRef.current = false;
        hasLoadedBookmarksRef.current = false;
        previousUserIdRef.current = null;
        setChatHistoryList([]);
        setSelectedResources([]);
        setMessages([]); // Clear active chat conversation
        setStreamingContent(''); // Clear any streaming content
        setActiveChatId(null); // Reset active chat
        setInput(''); // Clear input field
        sessionStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
        // Clear localStorage bookmarks on logout for a fresh state
        localStorage.removeItem(SELECTED_RESOURCES_STORAGE_KEY);

        // Re-authenticate anonymously so user can continue using the widget
        logger.debug('[NaViApp] Re-authenticating anonymously after logout...');
        signInAnonymouslyIfNeeded().then((anonUser) => {
          if (anonUser) {
            logger.debug('[NaViApp] Anonymous re-authentication successful:', anonUser.uid);
            // Note: onAuthStateChanged will fire again with the new anonymous user
          }
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync with shared input if provided (for comparison view)
  useEffect(() => {
    if (sharedInput !== undefined && sharedInput !== input) {
      setInput(sharedInput);
    }
  }, [sharedInput]);

  // Notify parent when local input changes (for comparison view)
  useEffect(() => {
    if (onSharedInputChange && sharedInput !== undefined) {
      onSharedInputChange(input);
    }
  }, [input, onSharedInputChange, sharedInput]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentQuery = input.trim();
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    setLastStoppedQuery(null); // Clear any previous stopped query

    abortControllerRef.current = new AbortController();

    // Check if knowledge base is loaded
    if (!resources || resources.length === 0) {
      toast.warning("Knowledge base is not loaded yet. Please try again.");
      setIsLoading(false);
      return;
    }

    // Build selected resource IDs (all resources for NaVi widget)
    const selectedResourceIds = resources.map(r => r.id);

    // Build conversation history for context
    // Truncate responses to 500 chars (matches backend's prompt construction)
    // This reduces payload size and avoids validation issues
    const conversationHistory: Array<{query: string, response: string}> = [];
    for (let i = 0; i < messages.length - 1; i += 2) {
      const userMsg = messages[i];
      const assistantMsg = messages[i + 1];
      if (userMsg?.role === 'user' && assistantMsg?.role === 'assistant') {
        conversationHistory.push({
          query: userMsg.content,
          response: assistantMsg.content.substring(0, 500) // Truncate before sending
        });
      }
    }

    let fullResponse = '';
    try {
      // Clear previous progress
      setReasoningSteps('');

      // Single-phase streaming (two-phase disabled to prevent duplicate intro)
      setReasoningSteps('Analyzing your question...');
      await generateContent(
        currentQuery,
        DEFAULT_RESPONSE_TEMPLATE,
        user,
        selectedResourceIds,
        conversationHistory,
        (chunk) => {
          fullResponse += chunk;
          flushSync(() => {
            setStreamingContent(fullResponse);
          });
        },
        true, // enableRoadmap - set to true to include roadmap recommendations
        abortControllerRef.current.signal,
        sessionId, // Pass session ID to track conversation thread
        (progressStep) => {
          // Update ticker with real progress
          setReasoningSteps(progressStep);
        }
      );

      if (fullResponse) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: fullResponse,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent('');

        // Auto-save chat history
        if (user) {
          try {
            const savedChat = await saveChatHistory({
              query: currentQuery,
              response: fullResponse,
              template: DEFAULT_RESPONSE_TEMPLATE,
              sourceCount: resources.length
            });
            setChatHistoryList(prev => [savedChat, ...prev]);
          } catch (saveErr) {
            logger.error('Failed to save chat history:', saveErr);
          }
        }
      }
    } catch (err) {
      const isAborted = err instanceof Error && (
        err.name === 'AbortError' ||
        err.message === 'Generation was stopped.' ||
        abortControllerRef.current?.signal.aborted
      );

      if (isAborted) {
        logger.debug('Generation was stopped by user');
        // Save the query so user can retry
        setLastStoppedQuery(currentQuery);
        // Keep partial response if any was received
        if (fullResponse) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: fullResponse + '\n\n*[Response stopped by user]*',
          };
          setMessages((prev) => [...prev, assistantMessage]);
        }
        // Reload the query into the input field for easy retry
        setInput(currentQuery);
      } else {
        toast.error(err instanceof Error ? err.message : 'An unexpected error occurred.', { autoClose: false });
      }
    } finally {
      setIsLoading(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  }, [input, isLoading, resources, messages, user]);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleNewChat = useCallback(() => {
    // Generate new session ID for the new conversation
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setMessages([]);
    setInput('');
    setStreamingContent('');
    setActiveChatId(null);
  }, []);

  const handleLoadChat = useCallback((chat: ChatHistory) => {
    setMessages([
      { id: `${chat.id}-user`, role: 'user', content: chat.query },
      { id: `${chat.id}-assistant`, role: 'assistant', content: chat.response },
    ]);
    setActiveChatId(chat.id);
    setStreamingContent('');
  }, []);

  // Delete a single conversation
  const handleDeleteChat = useCallback((chatId: string) => {
    setChatHistoryList((prev) => prev.filter((chat) => chat.id !== chatId));
    // If the deleted chat was active, clear the chat area
    if (activeChatId === chatId) {
      setMessages([]);
      setActiveChatId(null);
    }
  }, [activeChatId]);

  // Trigger send when parent requests it (for comparison view)
  const triggerSendRef = useRef(false);
  useEffect(() => {
    if (triggerSend && !triggerSendRef.current && input.trim() && !isLoading) {
      triggerSendRef.current = true;
      handleSend().finally(() => {
        triggerSendRef.current = false;
        onSendComplete?.();
      });
    }
  }, [triggerSend, input, isLoading, handleSend, onSendComplete]);

  // Widget visibility event listeners removed - widget now permanently visible

  // Delete all conversations
  const handleDeleteAllChats = useCallback(() => {
    setChatHistoryList([]);
    setMessages([]);
    setActiveChatId(null);
  }, []);

  const handlePromptClick = useCallback((question: string) => {
    setInput(question);
  }, []);

  // Mobile panel toggle handlers
  const handleToggleMobileChats = useCallback(() => {
    setActiveMobilePanel(prev => prev === 'chats' ? null : 'chats');
  }, []);

  const handleToggleMobileBookmarks = useCallback(() => {
    setActiveMobilePanel(prev => prev === 'bookmarks' ? null : 'bookmarks');
  }, []);

  const handleCloseMobilePanel = useCallback(() => {
    // Add closing class for animation
    const panel = document.querySelector('.navi-mobile-panel');
    const backdrop = document.querySelector('.navi-mobile-backdrop');

    if (panel) panel.classList.add('closing');
    if (backdrop) backdrop.classList.add('closing');

    // Wait for animation before removing from DOM
    setTimeout(() => {
      setActiveMobilePanel(null);
    }, 250);
  }, []);

  // Sign-in prompt: show when user clicks login button (for anonymous users)
  const shouldShowSignInPrompt = user?.isAnonymous === true && showSignInPromptManual;

  // Show the sign-in prompt (called from login button)
  const handleShowSignInPrompt = useCallback(() => {
    if (user?.isAnonymous) {
      setShowSignInPromptManual(true);
    }
  }, [user]);

  // Handle sign-in from prompt - links anonymous account to Google or signs in with existing
  const handleSignInFromPrompt = useCallback(async () => {
    if (!user?.isAnonymous) return;

    setIsSigningIn(true);
    try {
      const result = await linkAnonymousToGoogle();
      setShowSignInPromptManual(false);
      if (result) {
        toast.success('Signed in successfully! Your data is now synced.');
      }
    } catch (error: any) {
      logger.error('Error signing in:', error);
      // Handle popup closed by user
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        // User closed the popup, no error message needed
        return;
      }
      toast.error('Unable to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }, [user]);

  // Dismiss the sign-in prompt
  const handleDismissSignInPrompt = useCallback(() => {
    setShowSignInPromptManual(false);
  }, []);

  // Handle clicking on a citation reference - add to selected resources
  const handleSelectResource = useCallback((resource: Resource, citationId?: number) => {
    // Check if already selected
    const existingIndex = selectedResources.findIndex(
      (sr) => sr.resource.id === resource.id || sr.resource.title === resource.title
    );

    if (existingIndex === -1) {
      // Add to selected resources
      setSelectedResources((prev) => [
        ...prev,
        { resource, citationId: citationId || prev.length + 1 }
      ]);
    }
  }, [selectedResources]);

  // Remove a resource from selected
  const handleRemoveResource = useCallback((citationId: number) => {
    setSelectedResources((prev) => prev.filter((sr) => sr.citationId !== citationId));
  }, []);

  // View full resource - open in modal
  const handleViewResource = useCallback((resource: Resource) => {
    logger.debug('[NaViApp] handleViewResource called with resource:', resource);
    setSelectedResource(resource);
    setIsResourceModalOpen(true);
  }, []);

  // Handle opening terms modal (hard-coded content)
  const handleOpenTerms = useCallback(() => {
    logger.debug('[NaViApp] Opening terms modal');
    setIsTermsModalOpen(true);
  }, []);

  // Handle closing terms modal
  const handleCloseTerms = useCallback(() => {
    logger.debug('[NaViApp] Closing terms modal');
    setIsTermsModalOpen(false);
  }, []);

  // handleCloseTerms removed - WordPress modal API handles closing

  const handleCloseResourceModal = useCallback(() => {
    setIsResourceModalOpen(false);
    setSelectedResource(null);
  }, []);

  return (
    <div ref={containerRef} className={`navi-container expanded ${embedded ? 'embedded' : ''} ${hideSidebars ? 'no-sidebars' : ''} ${neutralTheme ? 'neutral-theme' : ''}`}>
      {!hideSidebars && (
        <LeftSidebar
          conversations={chatHistoryList}
          onNewChat={handleNewChat}
          onLoadChat={handleLoadChat}
          onDeleteChat={handleDeleteChat}
          onDeleteAllChats={handleDeleteAllChats}
          activeChatId={activeChatId}
          isCollapsed={isLeftSidebarCollapsed}
          onToggleCollapse={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
          sourceCount={resources.length}
                collectionName={undefined}
          hasMessages={messages.length > 0}
          onShowSignInPrompt={handleShowSignInPrompt}
        />
      )}

      <ChatArea
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onStop={handleStop}
        onNewChat={handleNewChat}
        isLoading={isLoading}
        streamingContent={streamingContent}
        welcomeSubtitle={welcomeSubtitle}
        resources={resources}
        selectedResources={selectedResources}
        onViewResource={handleSelectResource}
        onOpenResourceUrl={handleViewResource}
        onPromptSelect={handlePromptClick}
        showMetadata={showMetadata}
        // Mobile props
        isMobile={isMobile}
        onToggleMobileChats={handleToggleMobileChats}
        onToggleMobileBookmarks={handleToggleMobileBookmarks}
        activeMobilePanel={activeMobilePanel}
        chatHistoryCount={chatHistoryList.length}
        bookmarksCount={selectedResources.length}
        // Sign-in prompt props
        showSignInPrompt={shouldShowSignInPrompt}
        onSignIn={handleSignInFromPrompt}
        // Progress for ticker
        reasoningSteps={reasoningSteps}
        onDismissSignInPrompt={handleDismissSignInPrompt}
        isSigningIn={isSigningIn}
        usePermanentCitations={usePermanentCitations}
        citationMode={citationMode}
        onToggleCitationMode={undefined}
        onSetCitationMode={SHOW_DEV_UI ? (mode: 'legacy' | 'suffix' | 'permanent') => setCitationMode(mode) : undefined}
      />

      {/* Mobile Panel Overlay - only renders on mobile when a panel is open */}
      {isMobile && activeMobilePanel && (
        <>
          <div
            className="navi-mobile-backdrop"
            onClick={handleCloseMobilePanel}
          />
          <div className={`navi-mobile-panel navi-mobile-panel-${activeMobilePanel}`}>
            {activeMobilePanel === 'chats' ? (
              <LeftSidebar
                conversations={chatHistoryList}
                onNewChat={() => { handleNewChat(); handleCloseMobilePanel(); }}
                onLoadChat={(chat) => { handleLoadChat(chat); handleCloseMobilePanel(); }}
                onDeleteChat={handleDeleteChat}
                onDeleteAllChats={handleDeleteAllChats}
                activeChatId={activeChatId}
                isCollapsed={false}
                onToggleCollapse={handleCloseMobilePanel}
                sourceCount={resources.length}
                collectionName={undefined}
                hasMessages={messages.length > 0}
                isMobileOverlay={true}
                onClose={handleCloseMobilePanel}
                onShowSignInPrompt={() => { handleShowSignInPrompt(); handleCloseMobilePanel(); }}
              />
            ) : (
              <RightSidebar
                selectedResources={selectedResources}
                onRemoveResource={handleRemoveResource}
                onViewResource={(resource) => { handleViewResource(resource); handleCloseMobilePanel(); }}
                sourceCount={resources.length}
                collectionName={undefined}
                isCollapsed={false}
                onToggleCollapse={handleCloseMobilePanel}
                onOpenTerms={handleOpenTerms}
                showTermsLink={pageContext?.termsEnabled !== false}
                isMobileOverlay={true}
                onClose={handleCloseMobilePanel}
                isAuthenticated={!!(user && !user.isAnonymous)}
              />
            )}
          </div>
        </>
      )}

      {!hideSidebars && (
        <RightSidebar
          selectedResources={selectedResources}
          onRemoveResource={handleRemoveResource}
          onViewResource={handleViewResource}
          sourceCount={resources.length}
          collectionName={undefined}
          isCollapsed={isRightSidebarCollapsed}
          onToggleCollapse={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
          onOpenTerms={handleOpenTerms}
          showTermsLink={pageContext?.termsEnabled !== false}
          isAuthenticated={!!(user && !user.isAnonymous)}
        />
      )}

      {/* Resource Modal */}
      <ResourceModal
        isOpen={isResourceModalOpen}
        onClose={handleCloseResourceModal}
        resource={selectedResource}
      />

      {/* Terms Modal - uses content from WordPress plugin if available */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={handleCloseTerms}
        termsContent={pageContext?.termsContent}
        termsTitle={pageContext?.termsTitle}
      />

      {/* Toast Container - positioned within widget */}
      <ToastContainer
        position="bottom-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        style={{ position: 'absolute', bottom: '80px' }}
        toastStyle={{ fontSize: '14px' }}
      />
    </div>
  );
};

export default NaViApp;
