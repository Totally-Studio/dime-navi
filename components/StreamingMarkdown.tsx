import React, { useEffect, useRef, useMemo } from 'react';
import * as smd from 'streaming-markdown';
import DOMPurify from 'dompurify';
import { Resource } from '../types';
import { parseCitations, Citation } from '../utils/citationParser';
import { openResourceInModal } from '../utils/resourceModal';
import { logger } from '../utils/logger';

interface StreamingMarkdownProps {
  text: string;
  resources?: Resource[];
  onCitationClick?: (resource: Resource) => void;
  onCitationsReady?: (citations: Citation[]) => void;
  onShowCitations?: (citationIds: string[]) => void;
  usePermanentCitations?: boolean;
  queryIndex?: number;
}

const StreamingMarkdown: React.FC<StreamingMarkdownProps> = ({
  text,
  resources = [],
  onCitationClick,
  onCitationsReady,
  onShowCitations,
  usePermanentCitations,
  queryIndex
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<ReturnType<typeof smd.parser> | null>(null);

  // Parse citations from text
  const { parsedText, citations } = useMemo(() => {
    const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown';
    const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 700;

    logger.debug(`[StreamingMarkdown ${viewport}] Parsing citations - Resources available: ${resources.length}${isMobileViewport ? ' (MOBILE)' : ''}`);

    if (resources.length === 0) {
      logger.warn(`[StreamingMarkdown ${viewport}] WARNING: Resources array is EMPTY! Citations will not match.`);
    } else if (isMobileViewport) {
      logger.debug(`[StreamingMarkdown MOBILE] First 3 resources:`, resources.slice(0, 3).map(r => ({
        id: r.id,
        wpPostId: r.wpPostId,
        contentType: r.contentType,
        title: r.title.substring(0, 50)
      })));
    }

    const result = parseCitations(text, resources, { usePermanentIds: usePermanentCitations, queryIndex });
    logger.debug('StreamingMarkdown: Parsed', result.citations.length, 'citations from', resources.length, 'resources');
    if (result.citations.length > 0) {
      logger.debug('StreamingMarkdown: First 3 citations:', result.citations.slice(0, 3).map(c => ({
        id: c.id,
        title: c.title,
        hasResource: !!c.resource,
        resourceTitle: c.resource?.title
      })));
    }
    return result;
  }, [text, resources, usePermanentCitations, queryIndex]);

  // Notify parent of parsed citations
  useEffect(() => {
    if (onCitationsReady) {
      onCitationsReady(citations);
    }
  }, [citations, onCitationsReady]);

  // Pre-process text: convert citation markers to HTML before markdown parsing
  const preprocessText = (input: string): string => {
    let processed = input;

    // Replace citation markers with temporary placeholders that won't be affected by markdown
    // We'll post-process these after markdown rendering
    processed = processed.replace(/\[CITE:([a-z0-9.]+)\]/g, '⟦CITE:$1⟧');

    // Wrap user message (from **You:** to before **NaVi Assistant:**) in a styled block
    // This captures the user's question for special styling
    processed = processed.replace(
      /\*\*You:\*\*\s*([^]*?)(?=\n\n\*\*(?:NaVi Assistant|Assistant):\*\*|$)/g,
      '⟦USER_MSG_START⟧$1⟦USER_MSG_END⟧'
    );

    // Handle our special labels - convert to placeholders
    processed = processed.replace(/\*\*NaVi Assistant:\*\*/g, '⟦NAVI_LABEL⟧');
    processed = processed.replace(/\*\*Assistant:\*\*/g, '⟦ASSISTANT_LABEL⟧');

    return processed;
  };

  // Post-process the rendered HTML
  const postProcessHtml = (container: HTMLElement, citationList: Citation[]) => {
    // Build a map of displayId to contentType for color-coding
    const citationTypeMap = new Map<string, string>();
    citationList.forEach(c => {
      if (c.resource?.contentType) {
        citationTypeMap.set(c.displayId, c.resource.contentType);
      }
    });

    // Replace citation placeholders
    let html = container.innerHTML;

    // Strip <code> wrappers around citation placeholders (markdown parser sometimes wraps them)
    html = html.replace(/<code>([^<]*⟦CITE:[^⟧]+⟧[^<]*)<\/code>/g, '$1');

    // Group consecutive citations (2 or more) into a single [+] element
    let processed = html.replace(/(⟦CITE:[a-z0-9.]+⟧){2,}/g, (match) => {
      const ids = match.match(/⟦CITE:([a-z0-9.]+)⟧/g)?.map(m => m.replace(/⟦CITE:|⟧/g, '')) || [];
      return `<sup class="citation-link citation-group" data-citation-ids="${ids.join(',')}" title="Citations: ${ids.join(', ')}">[+]</sup>`;
    });

    // Replace remaining single citations with color-coding based on contentType
    processed = processed.replace(/⟦CITE:([a-z0-9.]+)⟧/g, (match, idStr) => {
      const contentType = citationTypeMap.get(idStr) || '';
      const typeClass = contentType === 'roadmap' ? 'roadmap' : contentType === 'library' ? 'library' : '';

      // Inline citations are just anchor links to References Panel - no external icon
      return `<sup class="citation-link ${typeClass}" data-citation-id="${idStr}">[${idStr}]</sup>`;
    });

    // Replace user message wrapper placeholders
    processed = processed.replace(/⟦USER_MSG_START⟧/g,
      '<div class="navi-user-message"><span class="navi-label navi-label-you">You:</span><span class="navi-user-question">');
    processed = processed.replace(/⟦USER_MSG_END⟧/g, '</span></div>');

    // Replace label placeholders
    processed = processed.replace(/⟦NAVI_LABEL⟧/g,
      '<span class="assistant-label-container"><span class="navi-label navi-label-assistant">NaVi Assistant:</span></span>');
    processed = processed.replace(/⟦ASSISTANT_LABEL⟧/g,
      '<span class="assistant-label-container"><span class="navi-label navi-label-assistant">Assistant:</span></span>');

    // SECURITY: Sanitize HTML before setting innerHTML to prevent XSS
    const sanitized = DOMPurify.sanitize(processed, {
      ALLOWED_TAGS: ['p', 'strong', 'em', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'blockquote', 'span', 'div', 'br', 'sup', 'sub', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
      ALLOWED_ATTR: ['href', 'class', 'data-citation-id', 'data-citation-ids', 'data-resource-id', 'data-title', 'target', 'rel', 'id', 'style']
    });
    container.innerHTML = sanitized;
  };

  // Render markdown using streaming-markdown library
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    // Clear previous content
    container.innerHTML = '';

    // Create renderer and parser
    const renderer = smd.default_renderer(container);
    const parser = smd.parser(renderer);
    parserRef.current = parser;

    // Pre-process and write the text
    const processedText = preprocessText(parsedText);
    smd.parser_write(parser, processedText);

    // End parsing (finalizes any pending content)
    smd.parser_end(parser);

    // Post-process for citations and labels
    postProcessHtml(container, citations);

    return () => {
      parserRef.current = null;
    };
  }, [parsedText, citations]);

  // Attach native DOM event listeners for citation links and regular links
  useEffect(() => {
    const container = contentRef.current;
    if (!container) {
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check for roadmap recommendation blockquote click (click anywhere on the card)
      const blockquote = target.tagName === 'BLOCKQUOTE' ? target : target.closest('blockquote');
      if (blockquote) {
        // Check if this is the roadmap recommendation (follows an hr)
        const previousSibling = blockquote.previousElementSibling;
        if (previousSibling && previousSibling.tagName === 'HR') {
          // Find the link inside the blockquote
          const link = blockquote.querySelector('a');
          if (link) {
            e.preventDefault();
            e.stopPropagation();
            const href = link.getAttribute('href') || '';
            if (href && !href.startsWith('#')) {
              window.open(href, '_blank', 'noopener,noreferrer');
            }
            return;
          }
        }
      }

      // Check for grouped citations [+]
      if (target.classList.contains('citation-group') || target.closest('.citation-group')) {
        e.preventDefault();
        e.stopPropagation();

        const groupElement = target.classList.contains('citation-group') ? target : target.closest('.citation-group') as HTMLElement;
        const idsString = groupElement?.getAttribute('data-citation-ids') || '';
        const ids = idsString.split(',').filter(id => id.length > 0);

        if (ids.length > 0 && onShowCitations) {
          onShowCitations(ids);
        }
        return;
      }

      // Check for single citation
      if (target.classList.contains('citation-link')) {
        e.preventDefault();
        e.stopPropagation();

        const citationId = target.getAttribute('data-citation-id') || '';

        if (citationId && onShowCitations) {
          onShowCitations([citationId]);
        }
        return;
      }

      // Check for regular anchor links
      const anchor = target.tagName === 'A' ? target as HTMLAnchorElement : target.closest('a') as HTMLAnchorElement;
      if (anchor) {
        const href = anchor.getAttribute('href') || '';

        // Check if this is a resource link (contains navi_resource parameter)
        if (href.includes('navi_resource=')) {
          e.preventDefault();
          e.stopPropagation();

          // Extract resource ID from the URL
          const urlParams = new URLSearchParams(href.split('?')[1] || '');
          const resourceId = urlParams.get('navi_resource');

          if (resourceId) {
            // Find the resource by ID
            const resource = resources.find(r => r.id === resourceId);
            if (resource) {
              // Try to open in modal, callback is optional
              openResourceInModal(resource, href);
              if (onCitationClick) {
                onCitationClick(resource);
              }
            }
          }
          return;
        }

        // Check if this is an internal resource link (matches /resources/ pattern)
        if (href.includes('/resources/')) {
          e.preventDefault();
          e.stopPropagation();

          // Try to find matching resource by URL
          const resource = resources.find(r => r.url && href.includes(r.url));
          if (resource) {
            // Try to open in modal
            openResourceInModal(resource, href);
            if (onCitationClick) {
              onCitationClick(resource);
            }
          } else {
            // No matching resource found, open in new tab
            window.open(href, '_blank', 'noopener,noreferrer');
          }
          return;
        }

        // For all other links, open in new tab
        if (href && !href.startsWith('#')) {
          e.preventDefault();
          e.stopPropagation();
          window.open(href, '_blank', 'noopener,noreferrer');
        }
      }
    };

    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('click', handleClick);
    };
  }, [parsedText, resources, onCitationClick, onShowCitations]);

  return (
    <div className="relative">
      <div
        ref={contentRef}
        className="prose-custom smd-content text-slate-700 dark:text-slate-300"
      />
    </div>
  );
};

export default StreamingMarkdown;
