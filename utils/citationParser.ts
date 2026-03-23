import { Resource } from '../types';
import { logger } from './logger';

export interface Citation {
  id: number;
  displayId: string;  // Display label: e.g., "1", "3a", "2.1b"
  title: string;
  resource: Resource | null;
  alternates: Resource[]; // Up to 3 if no exact match
}

export interface ParsedResponse {
  parsedText: string;
  citations: Citation[];
}

// Decode HTML entities in text (e.g., &#8217; → ')
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#x2013;': '–',
    '&#8212;': '—',
    '&#x2014;': '—',
    '&#38;': '&',
    '&amp;': '&',
    '&ndash;': '–',
    '&mdash;': '—',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
  };

  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  return decoded;
}

/**
 * Generate a citation display suffix based on query index.
 *
 * Scheme:
 *   Query 0:  ""       → citations: 1, 2, 3
 *   Query 1:  "a"      → citations: 1a, 2a, 3a
 *   Query 2:  "b"      → citations: 1b, 2b, 3b
 *   ...
 *   Query 26: "z"      → citations: 1z, 2z, 3z
 *   Query 27: "2."+""  → citations: 2.1, 2.2, 2.3
 *   Query 28: "2."+"a" → citations: 2.1a, 2.2a
 *   ...
 *   Query 53: "2."+"z" → citations: 2.1z, 2.2z
 *   Query 54: "3."+""  → citations: 3.1, 3.2
 *   etc.
 */
function getQuerySuffix(queryIndex: number): { prefix: string; suffix: string } {
  if (queryIndex === 0) {
    return { prefix: '', suffix: '' };
  }

  // Cycle of 27: first query in cycle has no letter suffix, rest have a-z
  const cycle = Math.floor((queryIndex - 1) / 26);  // 0 for queries 1-26, 1 for 27-52, etc.
  const posInCycle = (queryIndex - 1) % 26;          // 0-25

  const suffix = String.fromCharCode(97 + posInCycle); // a-z
  const prefix = cycle === 0 ? '' : `${cycle + 1}.`;

  return { prefix, suffix };
}

export interface ParseOptions {
  usePermanentIds?: boolean;
  queryIndex?: number; // 0-based index of which query this is in the session
}

/**
 * Parses response text for citations and matches them to resources
 * Supports formats:
 * - [Source:ID:Title] - new format with resource ID for guaranteed matching
 * - [Source: Title] - legacy format with title-based matching
 * @param text - The response text containing citations
 * @param resources - Available resources to match against
 * @param options - Parse options including queryIndex for session-unique IDs
 * @returns ParsedResponse with citation markers and matched resources
 */
export function parseCitations(text: string, resources: Resource[], options?: ParseOptions): ParsedResponse {
  const usePermanentIds = options?.usePermanentIds ?? false;
  const queryIndex = options?.queryIndex ?? 0;
  const { prefix, suffix } = getQuerySuffix(queryIndex);

  const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown';
  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 700;
  logger.debug(`[CitationParser] Starting parse - Viewport: ${viewport} (mobile: ${isMobileViewport}), Resources: ${resources.length}, QueryIndex: ${queryIndex}`);

  // Build a map of resource IDs for quick lookup (support multiple ID formats)
  const resourceById = new Map<string, Resource>();
  resources.forEach(r => {
    resourceById.set(r.id, r);
    if (r.wpPostId) {
      const postIdStr = String(r.wpPostId);
      resourceById.set(postIdStr, r);
      const contentType = r.contentType || 'library';
      resourceById.set(`wp_${contentType}_${postIdStr}`, r);
    }
  });

  if (isMobileViewport && resourceById.size > 0) {
    logger.debug(`[CitationParser MOBILE] Mapped ${resourceById.size} resource keys. Sample:`, Array.from(resourceById.keys()).slice(0, 10));
  }

  const citationRegex = /\[Source:\s*([^:\]]+):([^\]]+)\]|\[Source:\s*([^\]]+)\]/gi;
  const foundCitations: Map<string, Citation> = new Map();
  let citationCounter = 0;

  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown';
    logger.debug(`[CitationParser ${viewport}] Raw citation match: "${match[0]}"`, {
      fullMatch: match[0],
      group1_ID: match[1] || 'undefined',
      group2_Title: match[2] || 'undefined',
      group3_LegacyTitle: match[3] || 'undefined'
    });

    let resourceId: string | null = null;
    let citationTitle: string;

    if (match[1] && match[2]) {
      resourceId = match[1].trim();
      citationTitle = decodeHtmlEntities(match[2].trim());
      logger.debug(`[CitationParser ${viewport}] Using NEW format - ID: "${resourceId}", Title: "${citationTitle}"`);
    } else {
      const rawTitle = decodeHtmlEntities((match[3] || '').trim());
      logger.debug(`[CitationParser ${viewport}] Using LEGACY format - RawTitle: "${rawTitle}"`);

      if (/^wp[-_](library|roadmap)[-_]\d+$/i.test(rawTitle) || /^wp-\d+$/i.test(rawTitle) || /^\d+$/.test(rawTitle)) {
        resourceId = rawTitle;
        const resource = resourceById.get(rawTitle);
        citationTitle = resource?.title || rawTitle;
        logger.debug(`[CitationParser ${viewport}] LEGACY: Detected ID-only citation "${resourceId}", resolved to: "${resource?.title || 'NOT FOUND'}"`);
      } else {
        citationTitle = rawTitle;
      }
    }

    if (!citationTitle) continue;

    const citationKey = resourceId || citationTitle;

    if (foundCitations.has(citationKey)) {
      continue;
    }

    citationCounter++;

    let matchedResource: Resource | null = null;

    if (resourceId && resourceById.has(resourceId)) {
      matchedResource = resourceById.get(resourceId)!;
      logger.debug(`Citation ${citationCounter}: ID match found for "${resourceId}" -> "${matchedResource.title}"`);
    } else if (resourceId) {
      const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown';
      logger.warn(`Citation ${citationCounter} [${viewport}]: No resource found for ID "${resourceId}". Resources available: ${resourceById.size}. Available keys sample:`, Array.from(resourceById.keys()).slice(0, 10));
    }

    if (!matchedResource) {
      matchedResource = resources.find(r =>
        decodeHtmlEntities(r.title).toLowerCase() === citationTitle.toLowerCase()
      ) || null;
      if (matchedResource) {
        logger.debug(`Citation ${citationCounter}: Title match found for "${citationTitle}"`);
      }
    }

    // Generate display ID based on mode
    let displayId: string;
    if (usePermanentIds && matchedResource?.citationId) {
      displayId = matchedResource.citationId;
    } else {
      // Session-unique sequential: prefix + number + suffix
      // e.g., "1", "3a", "2.1b"
      displayId = `${prefix}${citationCounter}${suffix}`;
    }

    if (matchedResource) {
      foundCitations.set(citationKey, {
        id: citationCounter,
        displayId,
        title: matchedResource.title,
        resource: matchedResource,
        alternates: []
      });
    } else {
      const alternates = findSimilarResources(citationTitle, resources, 3);
      const viewport = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown';
      logger.debug(`Citation ${citationCounter} [${viewport}]: No match for "${citationTitle}", found ${alternates.length} alternates from ${resources.length} resources. ResourceID was: ${resourceId || 'none'}`);
      foundCitations.set(citationKey, {
        id: citationCounter,
        displayId,
        title: citationTitle,
        resource: null,
        alternates
      });
    }
  }

  // Replace citations with markers
  let parsedText = text;

  const citationMap = new Map<string, string>();
  foundCitations.forEach((citation, key) => {
    citationMap.set(key, citation.displayId);
  });

  parsedText = parsedText.replace(citationRegex, (match, id, idTitle, legacyTitle) => {
    let citationKey: string;

    if (id && idTitle) {
      citationKey = id.trim();
    } else {
      citationKey = decodeHtmlEntities((legacyTitle || '').trim());
    }

    if (!citationKey) return match;

    const displayId = citationMap.get(citationKey);
    return displayId ? `[CITE:${displayId}]` : match;
  });

  return {
    parsedText,
    citations: Array.from(foundCitations.values())
  };
}

/**
 * Find resources similar to the citation title using fuzzy matching
 */
function findSimilarResources(citationTitle: string, resources: Resource[], maxResults: number): Resource[] {
  const titleWords = citationTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const scored = resources.map(resource => {
    const resourceTitle = resource.title.toLowerCase();
    let score = 0;

    titleWords.forEach(word => {
      if (resourceTitle.includes(word)) {
        score += 2;
      }
    });

    if (resourceTitle.includes(citationTitle.toLowerCase())) {
      score += 20;
    } else if (citationTitle.toLowerCase().includes(resourceTitle)) {
      score += 15;
    }

    if (resourceTitle.startsWith(citationTitle.toLowerCase()) ||
        citationTitle.toLowerCase().startsWith(resourceTitle)) {
      score += 10;
    }

    const matchedWords = titleWords.filter(word => resourceTitle.includes(word)).length;
    const similarityPercent = titleWords.length > 0 ? (matchedWords / titleWords.length) : 0;

    if (similarityPercent > 0.6) {
      score += 15;
    } else if (similarityPercent > 0.4) {
      score += 8;
    }

    return { resource, score };
  });

  return scored
    .filter(item => item.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.resource);
}
