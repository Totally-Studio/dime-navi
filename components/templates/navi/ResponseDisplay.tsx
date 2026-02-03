import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Resource } from '../../../types';

interface ResponseDisplayProps {
  content: string;
  resources?: Resource[];
}

/**
 * ResponseDisplay component renders AI responses with markdown support
 * Features:
 * - Clickable citations with content type icons
 * - Opens links in new tab with security attributes
 * - Supports cross-domain URLs
 */
export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ content, resources = [] }) => {
  return (
    <div className="response-display">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Custom link renderer with content type icons
          a: ({ href, children, ...props }) => {
            // Find resource by matching title in link text
            const linkText = children?.toString() || '';
            const resource = resources.find(r =>
              linkText.includes(r.title) || href?.includes(r.id)
            );

            // Determine content type icon
            const icon = resource?.contentType === 'library' ? '📚' :
                        resource?.contentType === 'roadmap' ? '🗺️' : '';

            // Check if this is a citation link (has href)
            const isClickable = href && href !== '#';

            return (
              <a
                href={href}
                target={isClickable ? "_blank" : undefined}
                rel={isClickable ? "noopener noreferrer" : undefined}
                className={`
                  ${isClickable ? 'text-teal-600 hover:text-teal-800 dark:text-teal-400 dark:hover:text-teal-300 underline cursor-pointer' : ''}
                  inline-flex items-center gap-1
                `}
                onClick={(e) => {
                  // If no valid href, prevent default
                  if (!isClickable) {
                    e.preventDefault();
                  }
                }}
                {...props}
              >
                {icon && <span className="text-xs not-italic" aria-label={`${resource?.contentType} content`}>{icon}</span>}
                {children}
              </a>
            );
          },
          // Style paragraphs for better readability
          p: ({ children }) => (
            <p className="mb-4 last:mb-0 leading-relaxed">
              {children}
            </p>
          ),
          // Style lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2">
              {children}
            </ol>
          ),
          // Style headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mb-3 mt-5 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium mb-2 mt-4 first:mt-0">
              {children}
            </h3>
          ),
          // Style code blocks
          code: ({ inline, children, ...props }: any) => {
            if (inline) {
              return (
                <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-sm" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-slate-100 dark:bg-slate-800 p-4 rounded-lg mb-4 text-sm overflow-x-auto" {...props}>
                {children}
              </code>
            );
          },
          // Style blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-teal-500 pl-4 italic my-4 text-slate-600 dark:text-slate-400">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default ResponseDisplay;
