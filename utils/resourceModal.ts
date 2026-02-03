import { Resource } from '../types';

/**
 * Open a resource in WordPress modal (library) or new tab (roadmap)
 *
 * @param resource - The resource to open
 * @param fallbackUrl - Optional fallback URL if resource.url is not available
 * @returns Promise<boolean> - True if resource was opened successfully
 */
export const openResourceInModal = async (
  resource: Resource,
  fallbackUrl?: string
): Promise<boolean> => {
  // Library resources: Try modal first
  if (resource.contentType === 'library') {
    // Get post ID from wpPostId or extract from id (e.g., "wp-138" -> 138)
    let postId = resource.wpPostId;
    if (!postId && resource.id) {
      const match = resource.id.match(/wp-(\d+)/);
      if (match) {
        postId = parseInt(match[1], 10);
      }
    }

    // Check if WordPress modal API exists and we have a valid post ID
    if (postId && window.DimeResourceModal) {
      try {
        console.log(`Opening library resource ${resource.id} (post ID: ${postId}) in modal...`);
        const success = await window.DimeResourceModal.open(postId);
        if (success) {
          console.log(`✓ Modal opened successfully for ${resource.title}`);
          return true;
        }
      } catch (error) {
        console.warn('Modal open failed, falling back to URL:', error);
      }
    } else {
      if (!window.DimeResourceModal) {
        console.warn('DimeResourceModal API not available, falling back to new tab');
      }
      if (!postId) {
        console.warn(`Could not extract post ID from resource: ${resource.id}`);
      }
    }
  }

  // Roadmap resources or modal fallback: Open in new tab
  const url = resource.url || fallbackUrl;
  if (url) {
    console.log(`Opening ${resource.contentType} resource in new tab: ${url}`);
    window.open(url, '_blank', 'noopener,noreferrer');
    showNewTabNotification(resource.title);
    return true;
  }

  console.error('No valid URL or post ID for resource:', resource);
  return false;
};

/**
 * Show notification when resource opens in new tab
 *
 * @param resourceTitle - The title of the resource being opened
 */
export const showNewTabNotification = (resourceTitle: string): void => {
  const toast = document.createElement('div');
  toast.className = 'navi-toast-notification';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <svg class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3.5 2A1.5 1.5 0 002 3.5v9A1.5 1.5 0 003.5 14h9a1.5 1.5 0 001.5-1.5V8a.5.5 0 00-1 0v4.5a.5.5 0 01-.5.5h-9a.5.5 0 01-.5-.5v-9a.5.5 0 01.5-.5H8a.5.5 0 000-1H3.5z"/>
      <path d="M15 1a1 1 0 00-1-1h-4a.5.5 0 000 1h2.793L7.146 6.646a.5.5 0 10.708.708L13.5 1.707V4.5a.5.5 0 001 0v-4z"/>
    </svg>
    <span class="toast-message">Opened "${resourceTitle}" in new tab</span>
  `;

  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

/**
 * Pre-fetch library resources in background for instant modal opens
 * Call this when citations are detected in the response
 *
 * @param resources - Array of resources to pre-fetch
 */
export const prefetchLibraryResources = (resources: Resource[]): void => {
  // Extract post IDs from library resources first
  const postIds: number[] = [];
  resources.forEach(resource => {
    if (resource.contentType === 'library') {
      // Get post ID from wpPostId or extract from id (e.g., "wp-138" -> 138)
      let postId = resource.wpPostId;
      if (!postId && resource.id) {
        const match = resource.id.match(/wp-(\d+)/);
        if (match) {
          postId = parseInt(match[1], 10);
        }
      }
      if (postId) {
        postIds.push(postId);
      }
    }
  });

  if (postIds.length === 0) {
    return;
  }

  // Function to do the actual prefetch
  const doPrefetch = () => {
    if (window.DimeResourceModal && typeof window.DimeResourceModal.prefetchMultiple === 'function') {
      console.log(`🚀 Pre-fetching ${postIds.length} library resources for instant modal opens`);
      window.DimeResourceModal.prefetchMultiple(postIds);
      return true;
    }
    return false;
  };

  // Try immediately
  if (doPrefetch()) {
    return;
  }

  // If modal API not ready yet, retry every 100ms for up to 3 seconds
  console.log('⏳ Modal API not ready yet, will retry...');
  let attempts = 0;
  const maxAttempts = 30; // 3 seconds total
  const retryInterval = setInterval(() => {
    attempts++;
    if (doPrefetch()) {
      console.log(`✓ Modal API ready after ${attempts * 100}ms`);
      clearInterval(retryInterval);
    } else if (attempts >= maxAttempts) {
      console.warn('❌ Modal API never became available - prefetch skipped');
      clearInterval(retryInterval);
    }
  }, 100);
};

// Global type declaration
declare global {
  interface Window {
    DimeResourceModal?: {
      open: (postId: number) => Promise<boolean>;
      close: () => void;
      prefetch: (postId: number) => Promise<void>;
      prefetchMultiple: (postIds: number[]) => void;
      clearCache: (postId?: number) => void;
    };
  }
}
