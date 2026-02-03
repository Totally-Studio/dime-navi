import React, { useEffect, useRef, useMemo } from 'react';
import * as smd from 'streaming-markdown';
import { Resource } from '../types';
import { parseCitations, Citation } from '../utils/citationParser';
import { openResourceInModal } from '../utils/resourceModal';

interface StreamingMarkdownProps {
  text: string;
  resources?: Resource[];
  onCitationClick?: (resource: Resource) => void;
  onCitationsReady?: (citations: Citation[]) => void;
  onShowCitations?: (citationIds: number[]) => void;
}

const StreamingMarkdown: React.FC<StreamingMarkdownProps> = ({
  text,
  resources = [],
  onCitationClick,
  onCitationsReady,
  onShowCitations
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const parserRef = useRef<ReturnType<typeof smd.parser> | null>(null);

  // Parse citations from text
  const { parsedText, citations } = useMemo(() => {
    const result = parseCitations(text, resources);
    console.log('StreamingMarkdown: Parsed', result.citations.length, 'citations from', resources.length, 'resources');
    if (result.citations.length > 0) {
      console.log('StreamingMarkdown: First 3 citations:', result.citations.slice(0, 3).map(c => ({
        id: c.id,
        title: c.title,
        hasResource: !!c.resource,
        resourceTitle: c.resource?.title
      })));
    }
    return result;
  }, [text, resources]);

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
    processed = processed.replace(/\[CITE:(\d+)\]/g, '⟦CITE:$1⟧');

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
    // Build a map of citation ID to contentType for color-coding
    const citationTypeMap = new Map<number, string>();
    citationList.forEach(c => {
      if (c.resource?.contentType) {
        citationTypeMap.set(c.id, c.resource.contentType);
      }
    });

    // Replace citation placeholders
    const html = container.innerHTML;

    // Group consecutive citations (2 or more) into a single [+] element
    let processed = html.replace(/(⟦CITE:\d+⟧){2,}/g, (match) => {
      const ids = match.match(/\d+/g) || [];
      return `<sup class="citation-link citation-group" data-citation-ids="${ids.join(',')}" title="Citations: ${ids.join(', ')}">[+]</sup>`;
    });

    // Replace remaining single citations with color-coding based on contentType
    processed = processed.replace(/⟦CITE:(\d+)⟧/g, (match, idStr) => {
      const id = parseInt(idStr);
      const contentType = citationTypeMap.get(id) || '';
      const typeClass = contentType === 'roadmap' ? 'roadmap' : contentType === 'library' ? 'library' : '';

      // Inline citations are just anchor links to References Panel - no external icon
      return `<sup class="citation-link ${typeClass}" data-citation-id="${id}">[${id}]</sup>`;
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

    container.innerHTML = processed;
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

      // Check for grouped citations [+]
      if (target.classList.contains('citation-group') || target.closest('.citation-group')) {
        e.preventDefault();
        e.stopPropagation();

        const groupElement = target.classList.contains('citation-group') ? target : target.closest('.citation-group') as HTMLElement;
        const idsString = groupElement?.getAttribute('data-citation-ids') || '';
        const ids = idsString.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));

        if (ids.length > 0 && onShowCitations) {
          onShowCitations(ids);
        }
        return;
      }

      // Check for single citation
      if (target.classList.contains('citation-link')) {
        e.preventDefault();
        e.stopPropagation();

        const citationId = parseInt(target.getAttribute('data-citation-id') || '0');

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
