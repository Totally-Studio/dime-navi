export enum Template {
  SUMMARY = 'SUMMARY',
  TIMELINE = 'TIMELINE',
  FAQ = 'FAQ',
  COMPARISON = 'COMPARISON',
  STUDY_GUIDE = 'STUDY_GUIDE',
  DOCUMENT = 'DOCUMENT',
  DATA_EXTRACT = 'DATA_EXTRACT',
  DETAILED = 'DETAILED',  // Comprehensive Q&A responses - no summarization constraints
  EXHAUSTIVE = 'EXHAUSTIVE',  // Maximum depth extraction from sources - structured sections
}

export interface SavedOutput {
  id: string;
  title: string;
  content: string;
  template: Template;
  timestamp: string;
  sourceCount: number;
  tags: string[];
}

export interface Resource {
  id: string;  // String ID to support both original numeric and WordPress string IDs
  title: string;
  description: string;
  summary: string;
  tags: string[];
  group: string;  // Flexible string to support different group names from WordPress
  category?: 'Library' | 'Digital';  // New field to distinguish knowledge sources
  contentType?: 'library' | 'roadmap';  // Content type from WordPress knowledge base
  url?: string;  // Optional URL for Digital resources
  wpPostId?: number;  // WordPress post ID for opening in modal
  type?: string;  - // Resource type (e.g., 'resource' for WordPress resources)
  embedding?: number[]; // Optional vector embedding
}

export interface ChatHistory {
  id: string;
  query: string;
  response: string;
  template: Template;
  timestamp: string;
  sourceCount: number;
}
