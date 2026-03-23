import { Template, SavedOutput, Resource, ChatHistory } from '../types';
import { backendService, BookmarkedResource } from './backendService';
import { auth } from './firebaseConfig';
import { User } from 'firebase/auth';
import { logger } from '../utils/logger';

// This file simulates the client-side API layer (e.g., using fetch).
// The React components will only interact with this client, not the backend directly.

// Gets the current authenticated user from Firebase
const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Generate a fast intro paragraph (2-3 seconds)
 * Used for dual-prompt approach to show something quickly
 */
export const generateIntro = async (
  query: string,
  user: User | null,
  onChunk: (chunk: string) => void,
  onProgress?: (step: string) => void,
  signal?: AbortSignal
): Promise<void> => {
  logger.debug("API CLIENT: Sending fast intro request to backend...");
  return backendService.generateIntro(query, user, onChunk, onProgress, signal);
};

/**
 * Generate full comprehensive response (10+ seconds)
 */
export const generateContent = async (
  query: string,
  template: Template,
  user: User | null,
  selectedResourceIds: string[],
  conversationHistory: Array<{query: string, response: string}>,
  onChunk: (chunk: string) => void,
  enableRoadmap: boolean = true,
  signal?: AbortSignal,
  sessionId?: string,
  onProgress?: (step: string) => void
): Promise<void> => {
  logger.debug("API CLIENT: Sending generate stream request to backend...");
  logger.debug("API CLIENT: enableRoadmap =", enableRoadmap);
  logger.debug("API CLIENT: selectedResourceIds count =", selectedResourceIds.length);
  logger.debug("API CLIENT: conversationHistory count =", conversationHistory.length);
  logger.debug("API CLIENT: sessionId =", sessionId);

  return backendService.generate(
    query,
    template,
    user,
    selectedResourceIds,
    conversationHistory,
    onChunk,
    enableRoadmap,
    signal,
    sessionId,
    onProgress
  );
};

export const saveOutput = async (outputData: Omit<SavedOutput, 'id' | 'timestamp'>): Promise<SavedOutput> => {
  logger.debug("API CLIENT: Sending save request to backend...");
  const user = getCurrentUser();
  return backendService.saveOutput(outputData, user);
};

export const getOutputs = async (): Promise<SavedOutput[]> => {
  logger.debug("API CLIENT: Sending request to get all outputs from backend...");
  const user = getCurrentUser();
  return backendService.getOutputs(user);
};

export const deleteOutput = async (outputId: string): Promise<void> => {
  logger.debug("API CLIENT: Sending delete request to backend for output:", outputId);
  const user = getCurrentUser();
  return backendService.deleteOutput(outputId, user);
};

export const getKnowledge = async (source: 'original' | 'wordpress' = 'original'): Promise<Resource[]> => {
  logger.debug(`API CLIENT: Sending request to get knowledge from '${source}' source...`);
  return backendService.getKnowledge(source);
};

export const getLastCollectionInfo = (): { collectionName: string; count: number } | null => {
  return backendService.getLastCollectionInfo();
};

export const saveChatHistory = async (chatData: Omit<ChatHistory, 'id' | 'timestamp'>): Promise<ChatHistory> => {
  logger.debug("API CLIENT: Sending save chat history request to backend...");
  const user = getCurrentUser();
  return backendService.saveChatHistory(chatData, user);
};

export const getChatHistory = async (): Promise<ChatHistory[]> => {
  logger.debug("API CLIENT: Sending request to get chat history from backend...");
  const user = getCurrentUser();
  logger.debug("API CLIENT: Current user:", {
    uid: user?.uid,
    isAnonymous: user?.isAnonymous,
    email: user?.email,
    displayName: user?.displayName,
  });
  const history = await backendService.getChatHistory(user);
  logger.debug(`API CLIENT: Received ${history.length} chats from backend`);
  return history;
};

/**
 * Get knowledge from multiple sources based on enabled toggles
 * @param enabledSources - Array of source keys to include (e.g., ['original', 'htg_library'])
 */
export const getKnowledgeMultiSource = async (enabledSources: string[]): Promise<Resource[]> => {
  logger.debug(`API CLIENT: Fetching knowledge from sources: ${enabledSources.join(', ')}`);
  return backendService.getKnowledgeMultiSource(enabledSources);
};

/**
 * Get available knowledge sources with their configuration
 */
export const getKnowledgeSources = async (): Promise<Array<{
  key: string;
  name: string;
  description: string;
  collectionName: string;
  type: 'resources' | 'roadmap';
  resourceCount: number;
  enabled: boolean;
}>> => {
  logger.debug("API CLIENT: Fetching available knowledge sources...");
  return backendService.getKnowledgeSources();
};

/**
 * Save bookmarked resources for the current user
 */
export const saveBookmarks = async (bookmarks: BookmarkedResource[]): Promise<void> => {
  logger.debug("API CLIENT: Sending save bookmarks request to backend...");
  const user = getCurrentUser();
  return backendService.saveBookmarks(bookmarks, user);
};

/**
 * Get bookmarked resources for the current user
 */
export const getBookmarks = async (): Promise<BookmarkedResource[]> => {
  logger.debug("API CLIENT: Sending request to get bookmarks from backend...");
  const user = getCurrentUser();
  const bookmarks = await backendService.getBookmarks(user);
  logger.debug(`API CLIENT: Received ${bookmarks.length} bookmarks from backend`);
  return bookmarks;
};

/**
 * Fetch terms page content from WordPress via REST API
 * @param pageId - WordPress page ID containing terms content
 */
export const getTermsContent = async (pageId: number): Promise<{
  title: string;
  content: string;
}> => {
  logger.debug("[API CLIENT] Fetching terms content for page ID:", pageId);

  try {
    // Get site URL from page context (passed from WordPress)
    const naviContainer = document.querySelector('[data-page-context]');
    logger.debug("[API CLIENT] Container element:", naviContainer);

    const pageContext = naviContainer
      ? JSON.parse(naviContainer.getAttribute('data-page-context') || '{}')
      : {};

    logger.debug("[API CLIENT] Full page context:", pageContext);

    const siteUrl = pageContext.siteUrl || '';
    logger.debug("[API CLIENT] Site URL:", siteUrl);

    if (!siteUrl) {
      throw new Error('Site URL not available in page context');
    }

    // Fetch from WordPress REST API
    const apiUrl = `${siteUrl}/wp-json/wp/v2/pages/${pageId}`;
    logger.debug("[API CLIENT] Fetching from REST API:", apiUrl);

    const response = await fetch(apiUrl);
    logger.debug("[API CLIENT] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("[API CLIENT] Response error body:", errorText);
      throw new Error(`Failed to fetch terms page: ${response.statusText}`);
    }

    const data = await response.json();
    logger.debug("[API CLIENT] Response data:", data);
    logger.debug("[API CLIENT] Title:", data.title?.rendered);
    logger.debug("[API CLIENT] Content length:", data.content?.rendered?.length);

    return {
      title: data.title.rendered,
      content: data.content.rendered
    };
  } catch (error) {
    logger.error('[API CLIENT] Error fetching terms content:', error);
    throw error;
  }
};