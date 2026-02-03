import { Resource } from '../types';

export interface Citation {
  id: number;
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
 * Parses response text for citations and matches them to resources
 * Supports formats:
 * - [Source:ID:Title] - new format with resource ID for guaranteed matching
 * - [Source: Title] - legacy format with title-based matching
 * @param text - The response text containing citations
 * @param resources - Available resources to match against
 * @returns ParsedResponse with citation markers and matched resources
 */
export function parseCitations(text: string, resources: Resource[]): ParsedResponse {
  // Build a map of resource IDs for quick lookup
  const resourceById = new Map<string, Resource>();
  resources.forEach(r => resourceById.set(r.id, r));

  // Regex to match both formats:
  // [Source:ID:Title] - new format with ID
  // [Source: Title] - legacy format
  const citationRegex = /\[Source:([^:\]]+):([^\]]+)\]|\[Source:\s*([^\]]+)\]/gi;
  const foundCitations: Map<string, Citation> = new Map();
  let citationCounter = 0;

  // Find all citations and match to resources
  let match;
  while ((match = citationRegex.exec(text)) !== null) {
    let resourceId: string | null = null;
    let citationTitle: string;

    if (match[1] && match[2]) {
      // New format: [Source:ID:Title]
      resourceId = match[1].trim();
      citationTitle = decodeHtmlEntities(match[2].trim());
    } else {
      // Legacy format: [Source: Title] OR malformed [Source:ID] without title
      const rawTitle = decodeHtmlEntities((match[3] || '').trim());

      // Check if this looks like just an ID (e.g., wp-12345)
      if (/^wp-\d+$/i.test(rawTitle)) {
        // It's an ID without title - look up the resource
        resourceId = rawTitle;
        const resource = resourceById.get(rawTitle);
        citationTitle = resource?.title || rawTitle;
      } else {
        citationTitle = rawTitle;
      }
    }

    // Skip empty citations
    if (!citationTitle) continue;

    // Use ID as key if available, otherwise use title
    const citationKey = resourceId || citationTitle;

    // Check if we've already seen this citation
    if (foundCitations.has(citationKey)) {
      continue;
    }

    citationCounter++;

    let matchedResource: Resource | null = null;

    // Try ID-based lookup first (guaranteed match)
    if (resourceId && resourceById.has(resourceId)) {
      matchedResource = resourceById.get(resourceId)!;
      console.log(`Citation ${citationCounter}: ID match found for ${resourceId}`);
    }

    // Fall back to title matching
    if (!matchedResource) {
      matchedResource = resources.find(r =>
        decodeHtmlEntities(r.title).toLowerCase() === citationTitle.toLowerCase()
      ) || null;
      if (matchedResource) {
        console.log(`Citation ${citationCounter}: Title match found for "${citationTitle}"`);
      }
    }

    if (matchedResource) {
      foundCitations.set(citationKey, {
        id: citationCounter,
        title: matchedResource.title, // Use the actual resource title
        resource: matchedResource,
        alternates: []
      });
    } else {
      // Try fuzzy matching - find resources containing citation words
      const alternates = findSimilarResources(citationTitle, resources, 3);
      console.log(`Citation ${citationCounter}: No match for "${citationTitle}", found ${alternates.length} alternates`);
      foundCitations.set(citationKey, {
        id: citationCounter,
        title: citationTitle,
        resource: null,
        alternates
      });
    }
  }

  // Replace citations with markers, maintaining order
  let parsedText = text;

  // Build citation key mapping (ID or title -> citation number)
  const citationMap = new Map<string, number>();
  foundCitations.forEach((citation, key) => {
    citationMap.set(key, citation.id);
  });

  // Replace all citations with numbered markers
  // Handles both [Source:ID:Title] and [Source: Title] formats
  parsedText = parsedText.replace(citationRegex, (match, id, idTitle, legacyTitle) => {
    let citationKey: string;

    if (id && idTitle) {
      // New format: [Source:ID:Title] - use ID as key
      citationKey = id.trim();
    } else {
      // Legacy format: [Source: Title] - use title as key
      citationKey = decodeHtmlEntities((legacyTitle || '').trim());
    }

    if (!citationKey) return match;

    const citationId = citationMap.get(citationKey);
    return citationId ? `[CITE:${citationId}]` : match;
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

    // Count how many words from citation appear in resource title
    titleWords.forEach(word => {
      if (resourceTitle.includes(word)) {
        score += 2; // Increased weight for word matches
      }
    });

    // Bonus for substring matches (either direction)
    if (resourceTitle.includes(citationTitle.toLowerCase())) {
      score += 20; // Strong match - resource contains citation
    } else if (citationTitle.toLowerCase().includes(resourceTitle)) {
      score += 15; // Good match - citation contains resource
    }

    // Check if citation starts with resource title or vice versa
    if (resourceTitle.startsWith(citationTitle.toLowerCase()) ||
        citationTitle.toLowerCase().startsWith(resourceTitle)) {
      score += 10;
    }

    // Calculate similarity percentage
    const matchedWords = titleWords.filter(word => resourceTitle.includes(word)).length;
    const similarityPercent = titleWords.length > 0 ? (matchedWords / titleWords.length) : 0;

    // If more than 60% of words match, give a strong bonus
    if (similarityPercent > 0.6) {
      score += 15;
    } else if (similarityPercent > 0.4) {
      score += 8;
    }

    return { resource, score };
  });

  // Sort by score and return top matches (require minimum score of 10)
  return scored
    .filter(item => item.score >= 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(item => item.resource);
}
