import { Resource } from '../types';

/**
 * Singleton manager for robust modal backdrop cleanup
 * Handles detection, removal, and verification of WordPress modal backdrops
 */
class ModalCleanupManager {
  private static instance: ModalCleanupManager;
  private isObserving = false;
  private observer: MutationObserver | null = null;
  private closeHandlersRegistered = false;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  private constructor() {}

  static getInstance(): ModalCleanupManager {
    if (!ModalCleanupManager.instance) {
      ModalCleanupManager.instance = new ModalCleanupManager();
    }
    return ModalCleanupManager.instance;
  }

  /**
   * Find ALL backdrop elements using multiple detection strategies
   * This runs AFTER modal close, so be aggressive
   */
  detectBackdropElements(): HTMLElement[] {
    const backdrops: HTMLElement[] = [];

    // Strategy 1: Search by ID patterns for backdrop-like elements
    const idPatterns = ['backdrop', 'overlay', 'dimmer', 'modal-bg'];
    idPatterns.forEach(pattern => {
      const elements = document.querySelectorAll(`[id*="${pattern}"]`);
      elements.forEach(el => {
        if (el instanceof HTMLElement && !backdrops.includes(el)) {
          // Exclude only NaVi's own UI elements (not the WordPress container)
          if (!el.id.startsWith('navi-') || el.id === 'navi-dynamic-modal-container') {
            backdrops.push(el);
          }
        }
      });
    });

    // Strategy 2: Search by class patterns
    const classPatterns = ['backdrop', 'overlay', 'dimmer', 'modal-bg'];
    classPatterns.forEach(pattern => {
      const elements = document.querySelectorAll(`[class*="${pattern}"]`);
      elements.forEach(el => {
        if (el instanceof HTMLElement && !backdrops.includes(el)) {
          const classes = el.className.toString();
          // Exclude NaVi's mobile backdrop and references panel
          if (!classes.includes('navi-mobile-backdrop') &&
              !classes.includes('navi-references-panel-overlay')) {
            backdrops.push(el);
          }
        }
      });
    });

    // Strategy 3: Detect by computed styles (semi-transparent dark backgrounds)
    const potentialBackdrops = document.querySelectorAll('div[style*="position: fixed"], div[style*="position:fixed"]');
    potentialBackdrops.forEach(el => {
      if (el instanceof HTMLElement && !backdrops.includes(el)) {
        // Skip NaVi elements
        if (el.id.startsWith('navi-') && el.id !== 'navi-dynamic-modal-container') {
          return;
        }
        if (el.className.toString().includes('navi-mobile-backdrop') ||
            el.className.toString().includes('navi-references-panel-overlay')) {
          return;
        }

        const styles = getComputedStyle(el);
        const bg = styles.backgroundColor;

        // Check for dark semi-transparent backgrounds
        if (bg.includes('rgba') && (bg.includes('0, 0, 0') || bg.includes('0,0,0'))) {
          const match = bg.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
          if (match) {
            const opacity = parseFloat(match[4]);
            // Dark semi-transparent overlay
            if (opacity > 0.3 && opacity < 0.9) {
              backdrops.push(el);
            }
          }
        }
      }
    });

    console.log('🔍 Detected backdrops:', backdrops.map(el => el.id || el.className || el.tagName));
    return backdrops;
  }

  /**
   * Remove all detected backdrop elements and restore document state
   * When this is called, the modal is already closed, so be aggressive
   * IMPORTANT: Clear the container but DON'T remove it - WordPress needs it for future modals
   */
  removeAllBackdrops(): void {
    let removedCount = 0;

    // Strategy 1: Clear the main WordPress modal container contents (but keep the container!)
    const mainContainer = document.getElementById('navi-dynamic-modal-container');
    if (mainContainer) {
      // Remove all children (modal content + backdrop) but keep the container itself
      while (mainContainer.firstChild) {
        mainContainer.removeChild(mainContainer.firstChild);
      }
      // Clear ALL inline styles (WordPress uses inline styles for the backdrop!)
      mainContainer.removeAttribute('style');
      // Remove the 'show' class if present
      mainContainer.classList.remove('show');
      // Hide the container
      mainContainer.style.display = 'none';
      console.log('🗑️ Cleared main container contents and styles (kept container for reuse)');
      removedCount++;
    }

    // Strategy 2: Remove any other detected backdrops (outside the main container)
    const backdrops = this.detectBackdropElements();
    backdrops.forEach(backdrop => {
      // Don't remove the main container itself (we already handled it)
      if (backdrop.id !== 'navi-dynamic-modal-container') {
        console.log('🗑️ Removing backdrop:', backdrop.id || backdrop.className || backdrop.tagName);
        backdrop.remove();
        removedCount++;
      }
    });

    // Remove body/html overflow locks
    document.body.style.removeProperty('overflow');
    document.documentElement.style.removeProperty('overflow');

    // Remove common modal-open classes
    document.body.classList.remove('modal-open', 'no-scroll');
    document.documentElement.classList.remove('modal-open', 'no-scroll');

    if (removedCount > 0) {
      console.log(`✅ Cleaned up ${removedCount} backdrop element(s)`);
    }
  }

  /**
   * Verify cleanup succeeded - returns true if no backdrops remain
   */
  verifyCleanup(): boolean {
    const remaining = this.detectBackdropElements();
    if (remaining.length === 0) {
      console.log('✅ Cleanup verified: all backdrops removed');
      return true;
    } else {
      console.warn('⚠️ Cleanup incomplete:', remaining.length, 'backdrop(s) remain');
      return false;
    }
  }

  /**
   * Set up mutation observer to watch for new backdrop elements
   */
  setupObserver(): void {
    if (this.isObserving) return;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // Check if added node looks like a backdrop
            const id = node.id || '';
            const className = node.className.toString() || '';

            if (
              id.includes('modal') || id.includes('backdrop') || id.includes('overlay') ||
              className.includes('modal') || className.includes('backdrop') || className.includes('overlay')
            ) {
              console.log('👁️ MutationObserver detected new backdrop element:', id || className);
            }
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.isObserving = true;
    console.log('👁️ MutationObserver started watching for backdrops');
  }

  /**
   * Stop observing for new backdrop elements
   */
  stopObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      this.isObserving = false;
      console.log('👁️ MutationObserver stopped');
    }
  }

  /**
   * Register close handlers for modal cleanup
   * Handles: Escape key, backdrop clicks
   */
  registerCloseHandlers(): void {
    if (this.closeHandlersRegistered) {
      console.log('⚠️ Close handlers already registered, skipping');
      return;
    }

    // Escape key handler
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        console.log('⌨️ Escape key pressed, triggering cleanup...');
        setTimeout(() => {
          cleanupWordPressModalBackdrop();
          this.cleanupHandlers();
        }, 300);
      }
    };

    document.addEventListener('keydown', this.escapeHandler);
    this.closeHandlersRegistered = true;
    console.log('✅ Close handlers registered (Escape key)');
  }

  /**
   * Clean up registered event handlers
   */
  cleanupHandlers(): void {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }
    this.closeHandlersRegistered = false;
    console.log('✅ Close handlers cleaned up');
  }
}

/**
 * Removes orphaned WordPress modal backdrop container
 * Uses robust multi-strategy detection and cleanup
 */
function cleanupWordPressModalBackdrop(): void {
  const manager = ModalCleanupManager.getInstance();

  // Primary cleanup
  manager.removeAllBackdrops();

  // Verify and retry if needed
  setTimeout(() => {
    if (!manager.verifyCleanup()) {
      console.warn('⚠️ Backdrop still present, retrying cleanup...');
      manager.removeAllBackdrops();

      // Final verification
      setTimeout(() => {
        if (!manager.verifyCleanup()) {
          console.error('❌ Backdrop cleanup failed after retries');
        }
      }, 200);
    }
  }, 100);
}

/**
 * Track if WordPress modal API has been enhanced with cleanup logic
 */
let isWordPressModalEnhanced = false;

/**
 * Enhance WordPress modal API with proper backdrop cleanup
 * This monkey-patches the close() method to ensure backdrop removal
 */
function enhanceWordPressModalAPI(): void {
  if (isWordPressModalEnhanced || !window.DimeResourceModal) return;

  const originalClose = window.DimeResourceModal.close;
  const manager = ModalCleanupManager.getInstance();

  // Wrap close() to add cleanup
  window.DimeResourceModal.close = function() {
    // Call original close method
    originalClose.call(this);

    // Stop mutation observer
    manager.stopObserving();

    // Clean up event handlers
    manager.cleanupHandlers();

    // Cleanup with retry logic
    setTimeout(() => {
      cleanupWordPressModalBackdrop();
    }, 100);
  };

  isWordPressModalEnhanced = true;
  console.log('✅ WordPress modal API enhanced with backdrop cleanup');
}

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
  // Enhance WordPress modal API with cleanup on first use
  enhanceWordPressModalAPI();

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

          // Use cleanup manager for robust backdrop handling
          const manager = ModalCleanupManager.getInstance();
          manager.setupObserver(); // Watch for backdrop elements
          manager.registerCloseHandlers(); // Handle Escape key and other close methods

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
