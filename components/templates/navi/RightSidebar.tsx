import React from 'react';
import { Resource } from '../../../types';
import { openResourceInModal } from '../../../utils/resourceModal';

interface ResourcePreview {
  resource: Resource;
  citationId: number;
}

interface RightSidebarProps {
  selectedResources?: ResourcePreview[];
  onRemoveResource?: (citationId: number) => void;
  onViewResource?: (resource: Resource) => void;
  sourceCount?: number;
  collectionName?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenTerms?: () => void;
  showTermsLink?: boolean;
  // Mobile overlay props
  isMobileOverlay?: boolean;
  onClose?: () => void;
  // Auth state
  isAuthenticated?: boolean;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  selectedResources = [],
  onRemoveResource,
  onViewResource,
  sourceCount = 0,
  collectionName,
  isCollapsed = false,
  onToggleCollapse,
  onOpenTerms,
  showTermsLink = true,
  isMobileOverlay = false,
  onClose,
  isAuthenticated = false,
}) => {

  if (isCollapsed) {
    return (
      <aside className="navi-right-sidebar collapsed">
        <button
          onClick={onToggleCollapse}
          className="navi-sidebar-toggle"
          aria-label="Expand sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="navi-collapsed-icons">
          <button className="navi-icon-btn" aria-label="References" title="References">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="navi-icon-btn" aria-label="Bookmarks" title="Bookmarks">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="navi-collapsed-footer">
          <button className="navi-icon-btn" aria-label="Sources" title={`${sourceCount} sources`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={`navi-right-sidebar${isMobileOverlay ? ' mobile-overlay' : ''}`}>
      {/* Panel Header Bar - Mirrored layout: text right-aligned, icon far right */}
      <div className="navi-panel-header navi-panel-header-right">
        {isMobileOverlay && onClose && (
          <button
            onClick={onClose}
            className="navi-mobile-panel-close"
            aria-label="Close panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        )}
        <h2>Bookmarks</h2>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '0.5rem' }}>
          <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <div className="navi-right-sidebar-content">
        {/* Bookmarks Section */}
        <div className="navi-sidebar-section">
          <p className={`navi-section-snippet ${!isAuthenticated ? '' : selectedResources.length === 0 ? 'state-empty' : 'state-active'}`}>
            {!isAuthenticated
              ? 'Login to save your bookmarks permanently.'
              : selectedResources.length === 0
                ? 'Resources you bookmark from the reference panel will be saved here.'
                : 'Your bookmarks are saved to your account.'}
          </p>
          <div className="navi-bookmark-groups-wrapper">
            {selectedResources.length === 0 ? (
              <>
                {/* Roadmap Section - Empty State */}
                <div className="navi-bookmark-group">
                  <div className="navi-bookmark-group-label roadmap">Roadmap</div>
                  <div className="navi-resource-cards">
                    <div className="navi-bookmark-placeholder">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>No roadmap bookmarks</span>
                    </div>
                  </div>
                </div>
                <div className="navi-bookmark-spacer" />
                {/* Library Section - Empty State */}
                <div className="navi-bookmark-group">
                  <div className="navi-bookmark-group-label library">Library</div>
                  <div className="navi-resource-cards">
                    <div className="navi-bookmark-placeholder">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>No library bookmarks</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Group bookmarks by type */}
                {(() => {
                  // Separate resources by type
                  const roadmapResources = selectedResources.filter(preview => {
                    const contentType = preview.resource.contentType;
                    return contentType === 'roadmap' || (!contentType && /^\d+(\.\d+)?\.?\s/.test(preview.resource.title || ''));
                  });
                  const libraryResources = selectedResources.filter(preview => {
                    const contentType = preview.resource.contentType;
                    return contentType === 'library' || (!roadmapResources.find(r => r.citationId === preview.citationId));
                  });

                  const renderBookmarkCard = (preview: ResourcePreview) => {
                    const contentType = preview.resource.contentType;
                    const isRoadmap = contentType === 'roadmap' || (!contentType && /^\d+(\.\d+)?\.?\s/.test(preview.resource.title || ''));

                    return (
                      <div
                        key={preview.citationId}
                        className={`navi-resource-card compact clickable ${isRoadmap ? 'roadmap' : 'library'}`}
                        onClick={(e) => {
                          // Don't trigger if clicking the delete button
                          if ((e.target as HTMLElement).closest('.navi-resource-delete-btn')) return;

                          // Stop propagation to prevent modal overlay click handler from immediately closing
                          e.stopPropagation();
                          e.preventDefault();

                          // Use shared modal utility for consistent behavior
                          openResourceInModal(preview.resource);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {/* Open link icon - top right */}
                        <svg className="navi-resource-open-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <h4 className="navi-resource-title">
                          {preview.resource.title}
                        </h4>
                        <button
                          className="navi-resource-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveResource?.(preview.citationId);
                          }}
                          title="Remove bookmark"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    );
                  };

                  return (
                    <>
                      {/* Roadmap Section */}
                      <div className="navi-bookmark-group">
                        <div className="navi-bookmark-group-label roadmap">Roadmap ({roadmapResources.length})</div>
                        <div className="navi-resource-cards">
                          {roadmapResources.length > 0 ? (
                            roadmapResources.map(renderBookmarkCard)
                          ) : (
                            <div className="navi-bookmark-placeholder">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>No roadmap bookmarks</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="navi-bookmark-spacer" />
                      {/* Library Section */}
                      <div className="navi-bookmark-group">
                        <div className="navi-bookmark-group-label library">Library ({libraryResources.length})</div>
                        <div className="navi-resource-cards">
                          {libraryResources.length > 0 ? (
                            libraryResources.map(renderBookmarkCard)
                          ) : (
                            <div className="navi-bookmark-placeholder">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                              <span>No library bookmarks</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Spacer */}
        <div className="navi-sidebar-spacer" />
      </div>

      {/* Sources Panel - Static display at bottom */}
      <div className="navi-sources-panel">
        <div className="navi-sources-panel-inner">
          <div className="navi-sources-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" stroke="currentColor" strokeWidth="2"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span>{sourceCount} vetted sources indexed.{showTermsLink && (<>{' '}<a
              href="#"
              className="navi-sources-link"
              onClick={(e) => {
                e.preventDefault();
                onOpenTerms?.();
              }}
            >See Terms</a></>)}</span>
          </div>
          {collectionName && (
            <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '4px', paddingLeft: '24px', fontFamily: 'monospace' }}>
              {collectionName}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;
