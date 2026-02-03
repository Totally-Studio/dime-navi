import React from 'react';
import { Resource } from '../../../types';

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({ isOpen, onClose, resource }) => {
  if (!isOpen || !resource) return null;

  // Construct full URL for external link
  const getFullUrl = (url: string | undefined): string | null => {
    if (!url) return null;

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fullUrl = getFullUrl(resource.url);

  return (
    <div
      className="fixed z-50 overflow-y-scroll w-full h-full top-0 bottom-0 left-0 right-0 bg-[#244A51A1]"
      onClick={onClose}
    >
      <div className="my-20" onClick={(e) => e.stopPropagation()}>
        <div className="relative m-auto max-w-[1220px] bg-white p-6 md:p-10 rounded-lg shadow-lg">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="cursor-pointer inline-block absolute top-10 right-10 w-6 h-6 text-slate-600 hover:text-slate-900"
            aria-label="Close modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Title */}
          <h3 className="!text-brand-secondary lg:text-4xl !leading-[1.1] md:pr-16 text-[#244A51] font-bold">
            {resource.title}
          </h3>

          {/* Organization & Type */}
          {(resource.organization || resource.type) && (
            <div className="flex flex-row gap-[30px] mt-7 border-b border-[#4DC8BF] pb-7 text-xl">
              {resource.organization && <div>{resource.organization}</div>}
              {resource.type && <div>{resource.type}</div>}
            </div>
          )}

          {/* Authors */}
          {resource.authors && resource.authors.length > 0 && (
            <div className="flex flex-row gap-4 border-b border-[#4DC8BF] mt-7 pb-7">
              <strong className="text-xl font-semibold !text-[#244A51]">Authors</strong>
              <div className="text-xl font-medium">
                {resource.authors.join(', ')}
              </div>
            </div>
          )}

          {/* Description */}
          {resource.description && (
            <div className="mt-7 pb-7 text-base leading-relaxed">
              {resource.description}
            </div>
          )}

          {/* Keywords */}
          {resource.keywords && resource.keywords.length > 0 && (
            <div className="mt-7 border-b border-[#4DC8BF] pb-7 flex flex-col gap-4">
              <strong className="text-xl">Keywords</strong>
              <div className="flex flex-row flex-wrap gap-2">
                {resource.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="text-[#244A51] inline-block p-1 px-2 rounded-sm bg-[#E8F5F4] text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-4 inline-flex gap-10 flex-col md:flex-row items-center">
            {fullUrl && (
              <a
                href={fullUrl}
                className="btn btn-blue block bg-[#4DC8BF] hover:bg-[#3ab8af] text-white px-6 py-3 rounded-md font-semibold transition-colors no-underline inline-flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg className="inline-block mr-2" width="21" height="21" viewBox="0 0 21 31" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.125 5.25C12.5016 5.25 12 4.74609 12 4.125C12 3.50391 12.5016 3 13.125 3H19.875C20.4984 3 21 3.50391 21 4.125V10.875C21 11.4984 20.4984 12 19.875 12C19.2516 12 18.75 11.4984 18.75 10.875V6.83906L9.37969 16.1297C8.98125 16.6078 8.26875 16.6078 7.82812 16.1297C7.39219 15.7313 7.39219 15.0188 7.82812 14.5781L17.1609 5.25H13.125ZM0 7.125C0 5.67516 1.17516 4.5 2.625 4.5H7.875C8.49844 4.5 9 5.00391 9 5.625C9 6.24609 8.49844 6.75 7.875 6.75H2.625C2.41781 6.75 2.25 6.91875 2.25 7.125V21.375C2.25 21.5812 2.41781 21.75 2.625 21.75H16.875C17.0812 21.75 17.25 21.5812 17.25 21.375V16.125C17.25 15.5016 17.7516 15 18.375 15C18.9984 15 19.5 15.5016 19.5 16.125V21.375C19.5 22.8234 18.3234 24 16.875 24H2.625C1.17516 24 0 22.8234 0 21.375V7.125Z" fill="white"/>
                </svg>
                Open Resource
              </a>
            )}
            <div className="text-sm italic text-gray-600">
              <p>Some summaries are generated with the help of a large language model; always view the linked primary source of a resource you are interested in.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceModal;
