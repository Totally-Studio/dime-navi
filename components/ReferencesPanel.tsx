import React from 'react';
import { Citation } from '../utils/citationParser';
import { Resource } from '../types';
import { openResourceInModal } from '../utils/resourceModal';

interface ReferencesPanelProps {
  citations: Citation[];
  resources?: Resource[];
  onViewResource?: (resource: Resource) => void;
  onClose?: () => void;
}

const ReferencesPanel: React.FC<ReferencesPanelProps> = ({
  citations,
  resources = [],
  onViewResource,
  onClose
}) => {
  if (citations.length === 0) {
    return null;
  }

  // Count library vs roadmap citations
  const libraryCount = citations.filter(c => c.resource?.contentType === 'library').length;
  const roadmapCount = citations.filter(c => c.resource?.contentType === 'roadmap').length;

  return (
    <div className="navi-references-panel-wrapper">
      <div className="navi-references-panel-header">
        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2" style={{ textAlign: 'left' }}>
          References ({citations.length})
          {roadmapCount > 0 && (
            <span className="ml-1 font-normal text-slate-600 dark:text-slate-400">
              ({roadmapCount} roadmap)
            </span>
          )}
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="navi-close-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '20px', lineHeight: 1 }}
            title="Close references"
          >
            ×
          </button>
        )}
      </div>
      <div className="bg-white dark:bg-slate-800 px-3 py-3 overflow-y-auto max-h-96">
        <div className="navi-references-list">
          <ol className="text-xs text-slate-600 dark:text-slate-400" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {citations.map(citation => {
              // Color-code citation numbers: teal for library, orange for roadmap
              const isRoadmap = citation.resource?.contentType === 'roadmap';
              const citationColor = isRoadmap ? '#e17909' : '#0891b2'; // Orange for roadmap, teal for library

              return (
                <li key={citation.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '4px', textAlign: 'left' }}>
                  <span style={{ fontWeight: 600, color: citationColor, fontSize: '10px', minWidth: '28px', flexShrink: 0, textAlign: 'left' }}>[{citation.id}]</span>
                {citation.resource ? (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <button
                      onClick={() => {
                        openResourceInModal(citation.resource!);
                        onViewResource?.(citation.resource!);
                      }}
                      style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 'inherit', textDecoration: 'none' }}
                      className="hover:text-cyan-600 dark:hover:text-cyan-400"
                    >
                      {citation.resource.title}
                    </button>
                    {/* Show modal icon if wpPostId available, external link icon otherwise */}
                    {citation.resource.wpPostId ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        style={{ width: '12px', height: '12px', flexShrink: 0, marginTop: '2px', opacity: 0.5 }}
                        title="Opens in modal"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        style={{ width: '12px', height: '12px', flexShrink: 0, marginTop: '2px', opacity: 0.5 }}
                        title="Opens in new tab"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'left' }}>
                    <div className="text-slate-500 dark:text-slate-500 italic">
                      Source not found: "{citation.title}"
                    </div>
                    {citation.alternates.length > 0 && (
                      <div className="mt-1 text-[10px]">
                        <span className="text-slate-400">Similar sources ({citation.alternates.length}):</span>
                        <ul className="ml-4 mt-1">
                          {citation.alternates.map((alt, idx) => (
                            <li key={idx}>
                              <button
                                onClick={() => {
                                  openResourceInModal(alt);
                                  onViewResource?.(alt);
                                }}
                                style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'inherit', fontSize: 'inherit', textDecoration: 'none' }}
                                className="hover:text-cyan-600 dark:hover:text-cyan-400"
                              >
                                {alt.title}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ReferencesPanel;
