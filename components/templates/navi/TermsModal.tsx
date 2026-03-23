import React from 'react';
import './TermsModal.css';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  termsContent?: string;
  termsTitle?: string;
}

const DEFAULT_TERMS = `
<p>
  NaVi is designed to help you quickly identify relevant materials for further review.
  Responses are for informational purposes only and are not a substitute for:
</p>
<ul>
  <li>Independent review of original source documents.</li>
  <li>Sponsor-led technical or clinical assessments.</li>
  <li>Direct engagement with regulatory authorities.</li>
</ul>
<p>
  For further information please visit:
  <a href="https://dimesociety.org/privacy-policy/" target="_blank" rel="noopener noreferrer" style="color: #4DC8BF;">Privacy Policy</a>
  |
  <a href="https://dimesociety.org/terms-of-use/" target="_blank" rel="noopener noreferrer" style="color: #4DC8BF;">Terms of Use</a>
</p>
`;

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose, termsContent, termsTitle }) => {
  if (!isOpen) return null;

  const htmlContent = termsContent || DEFAULT_TERMS;

  return (
    <div className="navi-terms-modal-overlay" onClick={onClose}>
      <div className="navi-terms-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button
          className="navi-terms-modal-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div className="navi-terms-content">
          <div className="navi-terms-accordion active">
            <div className="navi-terms-title-bar">
              <h4>{termsTitle || 'NaVi Use Notice'}</h4>
            </div>
            <div className="navi-terms-divider"></div>
            <div
              className="navi-terms-content-wrap"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
