/**
 * DiMe NaVi Widget - Streamlined Version
 * Version: v2026.01.27.14
 * Build: 2026-01-27T18:15
 * Last Updated: 2026-01-27
 *
 * This is the streamlined NaVi-only widget entry point.
 * Legacy embedded templates (sidebar, embedded-top, embedded-inline) have been removed.
 * For legacy widget, see widget.tsx (v2026.01.20.93 - deprecated).
 *
 * Changes in v2026.01.27.14 (References Panel UI):
 * - Color-coded citation numbers: Teal (#0891b2) for library, Orange (#e17909) for roadmap
 * - Smaller header text: text-xs (was text-sm)
 * - Added roadmap count in header: "References (15) (5 roadmap)"
 * - Visual distinction makes it easy to identify roadmap vs library citations
 *
 * v2026.01.27.13:
 * - 24 resources sent to AI (16 library + 8 roadmap)
 * - Strengthened citation requirement: "YOU MUST INCLUDE 12-20"
 * - Increased sources per section: 4-5 different sources
 * - Roadmap citations working in response body
 */

const WIDGET_BUILD_VERSION = import.meta.env.VITE_WIDGET_VERSION || 'v2026.01.27.14-color-coded-refs';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { NaViApp } from './components/templates/navi';
import { WIDGET_VERSION } from './constants';
import './index.css';
import { logger } from './utils/logger';

// Page context from WordPress or other CMS
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
  termsEnabled?: boolean;
}

// NaVi widget configuration
interface NaviConfig {
  pageContext?: PageContext;
  container?: string | HTMLElement;
  buttonColor?: string;
}

// Function to inject Google Fonts (async for faster initial load)
function injectGoogleFonts() {
  logger.debug(`DiMe NaVi Widget DIME.v${WIDGET_VERSION}`);

  // Check if Google Fonts is already loaded
  if (document.getElementById('dime-navi-fonts')) {
    return;
  }

  // Add preconnect for better performance
  const preconnect1 = document.createElement('link');
  preconnect1.rel = 'preconnect';
  preconnect1.href = 'https://fonts.googleapis.com';
  document.head.appendChild(preconnect1);

  const preconnect2 = document.createElement('link');
  preconnect2.rel = 'preconnect';
  preconnect2.href = 'https://fonts.gstatic.com';
  preconnect2.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect2);

  // Add DM Sans font stylesheet with async loading trick
  const fontLink = document.createElement('link');
  fontLink.id = 'dime-navi-fonts';
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
  fontLink.media = 'print'; // Load async
  fontLink.onload = function() { (this as any).media = 'all'; }; // Switch to all after load
  document.head.appendChild(fontLink);
  logger.debug('DiMe NaVi: Google Fonts (DM Sans) loading async');
}

// Store the base URL for CSS files globally so we can re-inject if needed
let widgetBaseUrl: string | null = null;

// Function to get the widget script base URL
function getWidgetBaseUrl(): string | null {
  if (widgetBaseUrl) return widgetBaseUrl;

  const scripts = document.getElementsByTagName('script');
  for (let i = 0; i < scripts.length; i++) {
    const src = scripts[i].src;
    if (src && (src.includes('navi-widget.js') || src.includes('widget.js'))) {
      widgetBaseUrl = src.substring(0, src.lastIndexOf('/') + 1);
      return widgetBaseUrl;
    }
  }
  return null;
}

// Function to ensure a CSS file is loaded (idempotent - won't duplicate)
function ensureCssLoaded(id: string, filename: string): void {
  if (document.getElementById(id)) {
    return; // Already loaded
  }

  const baseUrl = getWidgetBaseUrl();
  if (!baseUrl) {
    logger.warn('DiMe NaVi: Could not find widget script URL for CSS injection');
    return;
  }

  const cssUrl = baseUrl + filename;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = cssUrl;
  document.head.appendChild(link);
  logger.debug(`DiMe NaVi: CSS loaded from ${cssUrl}`);
}

// Function to inject CSS dynamically when loaded as external script
function injectWidgetCSS() {
  // Remove old CSS if exists (force reload)
  const oldWidgetCss = document.getElementById('dime-navi-widget-css');
  if (oldWidgetCss) {
    oldWidgetCss.remove();
    logger.debug('DiMe NaVi: Removed old widget CSS');
  }
  const oldResponseCss = document.getElementById('dime-navi-response-stream-css');
  if (oldResponseCss) {
    oldResponseCss.remove();
    logger.debug('DiMe NaVi: Removed old response stream CSS');
  }

  // Get the script URL to determine CSS URL
  const baseUrl = getWidgetBaseUrl();

  if (baseUrl) {
    // Load navi-widget.css first (critical - load immediately)
    const widgetCssUrl = baseUrl + 'navi-widget.css';
    const widgetLink = document.createElement('link');
    widgetLink.id = 'dime-navi-widget-css';
    widgetLink.rel = 'stylesheet';
    widgetLink.href = widgetCssUrl;
    document.head.appendChild(widgetLink);
    logger.debug('DiMe NaVi: Widget CSS loaded from', widgetCssUrl);

    // Load response-stream.css second (less critical - can load async)
    const responseStreamUrl = baseUrl + 'response-stream.css';
    const responseLink = document.createElement('link');
    responseLink.id = 'dime-navi-response-stream-css';
    responseLink.rel = 'stylesheet';
    responseLink.href = responseStreamUrl;
    responseLink.media = 'print'; // Load async
    responseLink.onload = function() { (this as any).media = 'all'; }; // Switch after load
    document.head.appendChild(responseLink);
    logger.debug('DiMe NaVi: Response Stream CSS loading async from', responseStreamUrl);
  } else {
    logger.warn('DiMe NaVi: Could not find widget script URL');
  }
}

// Set up MutationObserver to watch for CSS being removed from <head>
// This protects against WordPress themes or AJAX systems that clear/rebuild the head
function setupCssProtection() {
  if (typeof MutationObserver === 'undefined') return;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
        // Check if our CSS was removed
        let needsReinjection = false;
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLLinkElement) {
            if (node.id === 'dime-navi-widget-css' ||
                node.id === 'dime-navi-response-stream-css' ||
                node.id === 'dime-navi-fonts') {
              logger.debug('DiMe NaVi: CSS was removed from head, will re-inject:', node.id);
              needsReinjection = true;
            }
          }
        });

        if (needsReinjection) {
          // Re-inject CSS after a small delay to avoid conflicts
          setTimeout(() => {
            ensureCssLoaded('dime-navi-widget-css', 'navi-widget.css');
            ensureCssLoaded('dime-navi-response-stream-css', 'response-stream.css');
            // Re-inject Google Fonts if needed
            if (!document.getElementById('dime-navi-fonts')) {
              injectGoogleFonts();
            }
          }, 10);
        }
      }
    }
  });

  observer.observe(document.head, { childList: true });
  logger.debug('DiMe NaVi: CSS protection observer installed');
}

// Scroll behavior and WordPress button listener removed - widget now permanently visible

// Inject fonts and CSS immediately (protection deferred to init for faster load)
if (typeof document !== 'undefined') {
  injectGoogleFonts();
  injectWidgetCSS();
}

// Global widget API
declare global {
  interface Window {
    DimeNaviWidget: {
      init: (config?: NaviConfig) => void;
      reinit: (newPageContext: PageContext) => void;
      destroy: () => void;
      pageContext: PageContext | null;
    };
  }
}

// Single widget instance
let naviRoot: ReactDOM.Root | null = null;
let naviContainer: HTMLElement | null = null;
let currentPageContext: PageContext | null = null;

const DimeNaviWidget = {
  init: (config: NaviConfig = {}) => {
    logger.debug('DiMe NaVi Widget: init() called with config:', config);

    // Check if already initialized
    if (naviRoot) {
      logger.warn('DiMe NaVi Widget is already initialized');
      return;
    }

    // Store page context
    currentPageContext = config.pageContext || null;

    // Find or use provided container
    if (config.container) {
      naviContainer = typeof config.container === 'string'
        ? document.querySelector(config.container) as HTMLElement
        : config.container;
    } else {
      // Look for auto-init container
      naviContainer = document.querySelector('[data-dime-navi-auto-init="true"]') as HTMLElement;
    }

    if (!naviContainer) {
      logger.error('DiMe NaVi: Container not found');
      return;
    }

    // Add necessary attributes and classes
    naviContainer.setAttribute('data-widget-template', 'navi');
    naviContainer.classList.add('dime-navi-widget-root');

    // Style for full container
    naviContainer.style.position = 'relative';
    naviContainer.style.width = '100%';
    naviContainer.style.height = 'auto';
    naviContainer.style.minHeight = '500px';
    naviContainer.style.zIndex = 'auto';
    naviContainer.style.pointerEvents = 'auto';

    logger.debug('DiMe NaVi: Rendering into container. Parent:', naviContainer.parentElement?.tagName, naviContainer.parentElement?.className);

    // Apply custom button color if provided
    if (config.buttonColor) {
      naviContainer.style.setProperty('--dime-button-color', config.buttonColor);
    }

    // Create React root and render
    logger.debug('DiMe NaVi: Creating React root');
    naviRoot = ReactDOM.createRoot(naviContainer);

    try {
      logger.debug('DiMe NaVi: Rendering NaViApp with pageContext:', config.pageContext);
      naviRoot.render(
        <React.StrictMode>
          <NaViApp key={config.pageContext?.url || 'initial'} pageContext={config.pageContext} />
        </React.StrictMode>
      );
      logger.debug('DiMe NaVi: NaViApp rendered successfully');
    } catch (renderError) {
      logger.error('DiMe NaVi: Failed to render NaViApp:', renderError);
    }

    // Scroll behavior removed - widget now permanently visible

    // Set up CSS protection when browser is idle (non-critical)
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => setupCssProtection(), { timeout: 2000 });
    } else {
      setTimeout(() => setupCssProtection(), 1000);
    }

    logger.debug('DiMe NaVi Widget initialized', { ...config, pageContext: currentPageContext });
  },

  reinit: (newPageContext: PageContext) => {
    logger.debug('DiMe NaVi: reinit() called with context:', newPageContext);

    if (!naviRoot || !naviContainer) {
      logger.warn('DiMe NaVi: Widget not initialized, cannot reinit');
      return;
    }

    // CRITICAL: Ensure CSS is still present before re-rendering
    // WordPress AJAX navigation may have removed our stylesheets
    ensureCssLoaded('dime-navi-widget-css', 'navi-widget.css');
    ensureCssLoaded('dime-navi-response-stream-css', 'response-stream.css');
    if (!document.getElementById('dime-navi-fonts')) {
      injectGoogleFonts();
    }

    // Update current page context
    currentPageContext = newPageContext;

    // Update the container's data-page-context attribute
    naviContainer.setAttribute('data-page-context', JSON.stringify(newPageContext));

    // Re-render the React component with new context
    logger.debug('DiMe NaVi: Re-rendering NaViApp with new URL:', newPageContext.url);
    naviRoot.render(
      <React.StrictMode>
        <NaViApp key={newPageContext.url} pageContext={newPageContext} />
      </React.StrictMode>
    );

    logger.debug('DiMe NaVi: NaViApp re-rendered successfully');
  },

  destroy: () => {
    if (naviRoot) {
      naviRoot.unmount();
      naviRoot = null;
    }
    if (naviContainer && naviContainer.parentNode) {
      naviContainer.parentNode.removeChild(naviContainer);
      naviContainer = null;
    }
    currentPageContext = null;
    logger.debug('DiMe NaVi Widget destroyed');
  },

  // Getter for page context
  get pageContext() {
    return currentPageContext;
  }
};

// Immediately assign to window
if (typeof window !== 'undefined') {
  window.DimeNaviWidget = DimeNaviWidget;
  logger.debug('DiMe NaVi Widget loaded and available as window.DimeNaviWidget');

  // Listen for URL change events from WordPress plugin
  window.addEventListener('dime-navi-reinit', (event: Event) => {
    const customEvent = event as CustomEvent<PageContext>;
    if (customEvent.detail) {
      logger.debug('DiMe NaVi: Received dime-navi-reinit event', customEvent.detail);
      DimeNaviWidget.reinit(customEvent.detail);
    }
  });

  logger.debug('DiMe NaVi: URL change listener registered');
}

// Auto-init function
function autoInit() {
  logger.debug('DiMe NaVi: autoInit() called');

  // Find container with auto-init attribute
  const containerDiv = document.querySelector('[data-dime-navi-auto-init="true"]');

  if (!containerDiv) {
    logger.debug('DiMe NaVi: No auto-init container found');
    return;
  }

  logger.debug('DiMe NaVi: Found auto-init container:', {
    id: containerDiv.id,
    autoInit: containerDiv.getAttribute('data-dime-navi-auto-init')
  });

  // Parse full config from data-config attribute (WordPress v2 plugin approach)
  let fullConfig: Record<string, unknown> = {};
  const configAttr = containerDiv.getAttribute('data-config');
  if (configAttr) {
    try {
      fullConfig = JSON.parse(configAttr);
      logger.debug('DiMe NaVi: Parsed config from data-config:', fullConfig);
    } catch (e) {
      logger.warn('DiMe NaVi: Could not parse data-config', e);
    }
  }

  // Get button color
  const buttonColor = containerDiv.getAttribute('data-button-color') || undefined;

  // Parse page context from full config or data attribute
  let pageContext: PageContext | undefined;
  if (fullConfig.pageContext) {
    pageContext = fullConfig.pageContext as PageContext;
  } else {
    const pageContextAttr = containerDiv.getAttribute('data-page-context');
    if (pageContextAttr) {
      try {
        pageContext = JSON.parse(pageContextAttr);
      } catch (e) {
        logger.warn('DiMe NaVi: Could not parse page context', e);
      }
    }
  }

  logger.debug('DiMe NaVi: Initializing widget');

  // Initialize widget
  try {
    DimeNaviWidget.init({
      buttonColor,
      pageContext,
      container: containerDiv as HTMLElement
    });
    logger.debug('DiMe NaVi: Widget initialized successfully');
  } catch (error) {
    logger.error('DiMe NaVi: Widget initialization FAILED:', error);
  }
}

// Run auto-init when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
}
