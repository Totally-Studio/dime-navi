import { GoogleGenAI } from "@google/genai";
import { Template, SavedOutput, Resource, ChatHistory } from '../types';
import { SYSTEM_PROMPT_START, SYSTEM_PROMPT_END, ROADMAP_PROMPT, ENABLE_ROADMAP_RECOMMENDATION, TEMPLATE_INSTRUCTIONS, DEFAULT_TEMPLATE_INSTRUCTION } from '../constants';
import { db } from './firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { promptMetricsService } from './promptMetricsService';

// Bookmarked resource type for persisting user bookmarks
export interface BookmarkedResource {
  resource: Resource;
  citationId: number;
  timestamp: string;
}

// This service simulates a secure backend running on Cloud Run.
// It's the ONLY place that should have access to the API Key and direct database access logic.

if (!import.meta.env.VITE_GEMINI_API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY environment variable not set on the 'backend'");
}

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

// Decode HTML entities in text (e.g., &#8217; → ')
function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const entities: Record<string, string> = {
    '&#8217;': "'", '&#8216;': "'", '&#8220;': '"', '&#8221;': '"',
    '&#8211;': '–', '&#x2013;': '–', '&#8212;': '—', '&#x2014;': '—',
    '&#38;': '&', '&amp;': '&', '&ndash;': '–', '&mdash;': '—',
    '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'",
  };
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  return decoded;
}

class BackendService {
  // Knowledge resource cache for improved TTFR (Time To First Response)
  private knowledgeCache: Resource[] | null = null;
  private knowledgeCacheTimestamp: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

  // In a real backend, you would verify the ID token. Here we trust the client-side user object
  // as this is a simulation running on the client.
  private _authenticate(user: User | null): string {
    if (!user) {
      console.error("BACKEND: Authentication failed. No user provided.");
      throw new Error("Unauthorized: You must be logged in to perform this action.");
    }
    console.log(`BACKEND: User authenticated successfully with UID: ${user.uid}`);
    return user.uid;
  }

  // Logs the AI interaction to Firestore for monitoring
  private async _logAIInteraction(
    user: User | null,
    type: 'generate',
    request: { query: string; template: string; contextLength: number },
    response: { textLength: number; success: boolean; error?: string; fullText?: string },
    metadata: { model: string; durationMs: number }
  ): Promise<void> {
    try {
      if (!user) {
        console.error("BACKEND: Cannot log AI interaction - User is null");
        return;
      }

      console.log("BACKEND: Attempting to log AI interaction for user:", user.uid);
      const logsCollection = collection(db, 'ai_logs');
      await addDoc(logsCollection, {
        userId: user.uid,
        timestamp: serverTimestamp(),
        type,
        request,
        response,
        metadata
      });
      console.log("BACKEND: Logging AI interaction to 'ai_logs' collection.");
    } catch (error) {
      console.error("BACKEND: Failed to log AI interaction:", error);
    }
  }

  /**
   * Generate a fast intro paragraph with minimal context
   * Used for dual-prompt approach to show something quickly while full response processes
   */
  async generateIntro(
    query: string,
    user: User | null,
    onChunk: (chunk: string) => void,
    onProgress?: (step: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const startTime = Date.now();
    const modelName = 'gemini-2.5-flash';

    onProgress?.('Loading knowledge sources...');

    try {
      // Use cached knowledge (should be instant)
      const allResources = await this.getKnowledge();

      onProgress?.('Analyzing top resources...');

      // Select only TOP 5 most relevant resources for speed
      const selectionResult = await this._selectRelevantResources(query, allResources, 5);
      const relevantResources = selectionResult.resources;

      // Build minimal context (500 chars max per resource)
      const resourceContext = relevantResources.map((r) => {
        const content = (r.summary || r.description || '').substring(0, 500);
        return `## ${r.title}\n${content}`;
      }).join('\n\n');

      onProgress?.('Generating quick overview...');

      const systemInstruction = `You are a helpful assistant. Based on the provided context, write a brief 2-3 sentence introduction to answer the user's question. Keep it concise and engaging.\n\n${resourceContext}`;
      const fullPrompt = `USER QUERY: "${query}"\n\nProvide a brief introduction (2-3 sentences) that addresses this query.`;

      const response = await ai.models.generateContentStream({
        model: modelName,
        contents: fullPrompt,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      let fullResponse = '';
      for await (const chunk of response) {
        if (signal?.aborted) {
          throw new Error('Generation was stopped.');
        }
        const text = chunk.text || "";
        fullResponse += text;
        if (text) {
          onChunk(text);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`📊 INTRO: Generated in ${duration}ms (${fullResponse.length} chars)`);

    } catch (error) {
      console.error("BACKEND: Error generating intro:", error);
      throw error;
    }
  }

  // Handles the call to the Generative AI model
  async generate(
    query: string,
    template: Template,
    user: User | null,
    selectedResourceIds: string[],
    conversationHistory: Array<{query: string, response: string}>,
    onChunk: (chunk: string) => void,
    enableRoadmap: boolean = false,
    signal?: AbortSignal,
    sessionId?: string,
    onProgress?: (step: string) => void
  ): Promise<void> {
    console.log("BACKEND: Received generate stream request.");
    console.log("BACKEND: User authenticated with UID:", this._authenticate(user));

    const startTime = Date.now();
    let fullResponseText = "";
    const modelName = 'gemini-2.5-flash';

    // Metrics tracking
    let firstChunkTime: number | null = null;
    let streamingStartTime: number | null = null;
    let queryKeywords: string[] = [];
    let topLibraryScores: Array<{ score: number; title: string }> = [];
    let topRoadmapScores: Array<{ score: number; title: string }> = [];

    // Check if already aborted
    if (signal?.aborted) {
      throw new Error('Generation was stopped.');
    }

    try {
      // Fetch knowledge resources
      onProgress?.('Loading knowledge base...');
      const allResources = await this.getKnowledge();
      console.log(`BACKEND: Loaded ${allResources.length} total resources`);

      // Step 1: Use titles to find most relevant resources
      // Reduced from 24 to 15 for faster TTFR (less context = faster Gemini processing)
      onProgress?.(`Analyzing ${allResources.length} sources for relevance...`);
      const selectionResult = await this._selectRelevantResources(query, allResources, 15);
      const relevantResources = selectionResult.resources;
      queryKeywords = selectionResult.metrics.queryKeywords;
      topLibraryScores = selectionResult.metrics.topLibraryScores;
      topRoadmapScores = selectionResult.metrics.topRoadmapScores;
      console.log(`BACKEND: Selected ${relevantResources.length} relevant resources based on titles`);

      // Log breakdown of selected resources by type
      const selectedLibraryCount = relevantResources.filter(r => r.contentType === 'library').length;
      const selectedRoadmapCount = relevantResources.filter(r => r.contentType === 'roadmap').length;
      console.log(`BACKEND: Selected resources breakdown: ${selectedLibraryCount} library, ${selectedRoadmapCount} roadmap`);

      if (selectedRoadmapCount === 0) {
        console.warn('BACKEND: WARNING - No roadmap resources selected! Roadmap content will not be available for citations.');
      }

      // Build context from only the relevant resources - include ID for reliable citation linking
      // OPTIMIZATION: Truncate content to reduce context size and improve TTFR
      const MAX_CONTENT_LENGTH = 800; // Reduced from unlimited to 800 chars for faster processing
      const resourceContext = relevantResources.map((r) => {
        // Prefer summary over description (summaries are shorter and more focused)
        let content = r.summary || r.description || '';

        // Truncate to max length for faster Gemini processing
        if (content.length > MAX_CONTENT_LENGTH) {
          content = content.substring(0, MAX_CONTENT_LENGTH) + '...';
        }

        // Log if resource has no content (especially important for roadmap)
        if (!content && r.contentType === 'roadmap') {
          console.warn(`BACKEND: WARNING - Roadmap resource has NO CONTENT: "${r.title}" (${r.id})`);
        }
        return `## [${r.id}] ${r.title}\n\n${content}`;
      }).join('\n\n');

      // Check if any roadmap resources have actual content
      const roadmapWithContent = relevantResources.filter(r =>
        r.contentType === 'roadmap' && (r.description || r.summary)
      ).length;
      console.log(`BACKEND: Roadmap resources with content: ${roadmapWithContent}/${selectedRoadmapCount}`);

      // Build conversation history context (limit to last 3 exchanges to save tokens)
      const recentHistory = conversationHistory.slice(-3);
      const historyContext = recentHistory.length > 0
        ? '\n\n## Previous Conversation:\n' + recentHistory.map(h =>
            `User: ${h.query}\nAssistant: ${h.response.substring(0, 500)}...`
          ).join('\n\n')
        : '';

      const context = resourceContext + historyContext;

      // Get template-specific instruction (or default to DETAILED for comprehensive responses)
      const templateInstruction = TEMPLATE_INSTRUCTIONS[template] || DEFAULT_TEMPLATE_INSTRUCTION;
      const fullPrompt = `USER QUERY: "${query}"\n\nRESPONSE INSTRUCTION: ${templateInstruction}`;
      // Use UI toggle (enableRoadmap) instead of constant flag
      const roadmapSection = enableRoadmap ? ROADMAP_PROMPT : '';
      const systemInstruction = `${SYSTEM_PROMPT_START}\n\n${context}\n\n${SYSTEM_PROMPT_END}${roadmapSection}`;

      console.log("BACKEND: enableRoadmap (UI toggle) =", enableRoadmap);
      console.log("BACKEND: Roadmap section included:", enableRoadmap ? "YES" : "NO");
      console.log("BACKEND: Context length:", context.length);
      console.log("BACKEND: System instruction length:", systemInstruction.length);

      onProgress?.(`Selected ${relevantResources.length} relevant sources`);
      onProgress?.(`Building context (${Math.round(context.length / 1000)}KB)...`);
      onProgress?.(`Processing your query...`);

      console.log("BACKEND: Starting streaming request to Gemini...");

      const response = await ai.models.generateContentStream({
        model: modelName,
        contents: fullPrompt,
        config: {
          systemInstruction: systemInstruction,
        },
      });

      console.log("BACKEND: Successfully started streaming content.");
      onProgress?.('AI responded. Streaming answer...');
      streamingStartTime = Date.now();
      let chunkCount = 0;
      let lastChunk: any = null;

      for await (const chunk of response) {
        // Check for abort signal
        if (signal?.aborted) {
          console.log("BACKEND: Generation aborted by user");
          throw new Error('Generation was stopped.');
        }

        chunkCount++;
        lastChunk = chunk; // Capture last chunk (has usageMetadata)
        const text = chunk.text || "";
        fullResponseText += text;

        // Capture first chunk time
        if (chunkCount === 1 && firstChunkTime === null) {
          firstChunkTime = Date.now();
        }

        if (text) {
          onChunk(text);
        }
      }
      console.log(`BACKEND: Stream finished. Total chunks: ${chunkCount}`);

      // Extract token counts from last chunk's usageMetadata
      const usageMetadata = lastChunk?.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount || 0;
      const outputTokens = usageMetadata?.candidatesTokenCount || 0;
      const thoughtTokens = usageMetadata?.thoughtsTokenCount || 0;
      const totalTokens = usageMetadata?.totalTokenCount || 0;

      console.log(`📊 BACKEND: Input tokens: ${inputTokens}`);
      console.log(`📊 BACKEND: Output tokens: ${outputTokens}`);
      console.log(`📊 BACKEND: Thought tokens: ${thoughtTokens}`);
      console.log(`📊 BACKEND: Total tokens: ${totalTokens}`);
      console.log(`📊 BACKEND: Token counts:`, { input: inputTokens, output: outputTokens, thought: thoughtTokens, total: totalTokens });

      // Log success
      const durationMs = Date.now() - startTime;
      await this._logAIInteraction(user, 'generate',
        { query, template, contextLength: context.length },
        { textLength: fullResponseText.length, success: true, fullText: fullResponseText },
        { model: modelName, durationMs }
      );

      // Log detailed prompt metrics
      if (user) {
        const wordCount = fullResponseText.split(/\s+/).filter(w => w.length > 0).length;
        const citationCount = (fullResponseText.match(/\[Source:/g) || []).length;

        await promptMetricsService.logMetrics({
          userId: user.uid,
          sessionId: sessionId || undefined,
          query,
          queryLength: query.length,
          template,
          model: modelName,
          modelVersion: '2.5-flash',
          tokens: {
            input: inputTokens,
            thought: thoughtTokens,
            output: outputTokens,
            total: totalTokens,
          },
          resourceSelection: {
            totalResourcesAvailable: allResources.length,
            relevantResourcesSelected: relevantResources.length,
            queryKeywords,
            topLibraryScores,
            topRoadmapScores,
            libraryCount: selectedLibraryCount,
            roadmapCount: selectedRoadmapCount,
          },
          timing: {
            streamingStartTime: (streamingStartTime || startTime) - startTime,
            thinkingTime: 0, // Not measured separately
            responseTime: durationMs,
            firstChunkLatency: (firstChunkTime || streamingStartTime || startTime) - startTime,
            averageChunkInterval: chunkCount > 0 ? durationMs / chunkCount : 0,
          },
          response: {
            length: fullResponseText.length,
            wordCount,
            citationCount,
            success: true,
          },
          context: {
            conversationHistoryLength: conversationHistory.length,
            enabledRoadmap: enableRoadmap,
            selectedResourceIds,
          },
          performance: {
            wasAborted: false,
            hadErrors: false,
          },
        });
      }

    } catch (error) {
      // Log abort metrics
      if (error instanceof Error && error.message === 'Generation was stopped.' && user) {
        const durationMs = Date.now() - startTime;
        const wordCount = fullResponseText.split(/\s+/).filter(w => w.length > 0).length;
        await promptMetricsService.logMetrics({
          userId: user.uid,
          query,
          queryLength: query.length,
          template,
          model: modelName,
          modelVersion: '2.5-flash',
          tokens: { input: 0, thought: 0, output: 0, total: 0 },
          resourceSelection: {
            totalResourcesAvailable: 0,
            relevantResourcesSelected: 0,
            queryKeywords,
            topLibraryScores,
            topRoadmapScores,
            libraryCount: 0,
            roadmapCount: 0,
          },
          timing: {
            streamingStartTime: (streamingStartTime || startTime) - startTime,
            thinkingTime: 0,
            responseTime: durationMs,
            firstChunkLatency: (firstChunkTime || streamingStartTime || startTime) - startTime,
          },
          response: {
            length: fullResponseText.length,
            wordCount,
            success: false,
            error: 'Aborted by user',
          },
          context: {
            conversationHistoryLength: conversationHistory.length,
            enabledRoadmap: enableRoadmap,
            selectedResourceIds,
          },
          performance: {
            wasAborted: true,
            hadErrors: false,
          },
        });
        throw error;
      }

      console.error("BACKEND: Error generating content:", error);

      // Log failure
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this._logAIInteraction(user, 'generate',
        { query, template, contextLength: 0 },
        { textLength: fullResponseText.length, success: false, error: errorMessage, fullText: fullResponseText },
        { model: modelName, durationMs }
      );

      // Log error metrics
      if (user) {
        const wordCount = fullResponseText.split(/\s+/).filter(w => w.length > 0).length;
        await promptMetricsService.logMetrics({
          userId: user.uid,
          query,
          queryLength: query.length,
          template,
          model: modelName,
          modelVersion: '2.5-flash',
          tokens: { input: 0, thought: 0, output: 0, total: 0 },
          resourceSelection: {
            totalResourcesAvailable: 0,
            relevantResourcesSelected: 0,
            queryKeywords: [],
            topLibraryScores: [],
            topRoadmapScores: [],
            libraryCount: 0,
            roadmapCount: 0,
          },
          timing: {
            streamingStartTime: 0,
            thinkingTime: 0,
            responseTime: durationMs,
            firstChunkLatency: 0,
          },
          response: {
            length: fullResponseText.length,
            wordCount,
            success: false,
            error: errorMessage,
          },
          context: {
            conversationHistoryLength: conversationHistory.length,
            enabledRoadmap: enableRoadmap,
            selectedResourceIds,
          },
          performance: {
            wasAborted: false,
            hadErrors: true,
          },
        });
      }

      if (error instanceof Error) {
        throw new Error(`An error occurred while communicating with the API: ${error.message}`);
      }
      throw new Error("An unknown error occurred on the backend.");
    }
  }

  // Saves an output to the user's collection in Firestore
  async saveOutput(outputData: Omit<SavedOutput, 'id' | 'timestamp'>, user: User | null): Promise<SavedOutput> {
    console.log("BACKEND: Received save request.");
    const uid = this._authenticate(user);

    const userOutputsCollection = collection(db, 'users', uid, 'outputs');

    const newDocument = {
      ...outputData,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(userOutputsCollection, newDocument);
    console.log("BACKEND: Saved new output to Firestore with ID:", docRef.id);

    return { ...newDocument, id: docRef.id, timestamp: new Date().toISOString() };
  }

  // Retrieves all outputs for a user from Firestore
  async getOutputs(user: User | null): Promise<SavedOutput[]> {
    console.log("BACKEND: Received request to get all outputs.");
    const uid = this._authenticate(user);

    const userOutputsCollection = collection(db, 'users', uid, 'outputs');
    const q = query(userOutputsCollection, orderBy('timestamp', 'desc'));

    const querySnapshot = await getDocs(q);
    const outputs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString(),
    } as SavedOutput));

    console.log(`BACKEND: Returning ${outputs.length} outputs from Firestore.`);
    return outputs;
  }

  // Knowledge source collection mappings
  private knowledgeSourceCollections: Record<string, string> = {
    'original': 'knowledgeBase',
    'wordpress': 'knowledgebase_wp',
    'htg_library': 'knowledgebase_htg',
    'timestamped': 'knowledgebase_wp_2026-01-16T10-05-04',
  };

  /**
   * Clear the knowledge cache (useful after database updates)
   */
  clearKnowledgeCache(): void {
    this.knowledgeCache = null;
    this.knowledgeCacheTimestamp = 0;
    console.log('BACKEND: Knowledge cache cleared');
  }

  /**
   * Check if cache is valid (exists and not expired)
   */
  private isCacheValid(): boolean {
    if (!this.knowledgeCache) return false;
    const age = Date.now() - this.knowledgeCacheTimestamp;
    const isValid = age < this.CACHE_TTL_MS;
    if (!isValid && this.knowledgeCache) {
      console.log(`BACKEND: Cache expired (age: ${Math.round(age / 1000)}s, TTL: ${this.CACHE_TTL_MS / 1000}s)`);
    }
    return isValid;
  }

  // Retrieves knowledge from Firestore based on source or active_dataset config
  async getKnowledge(source: 'original' | 'wordpress' = 'original'): Promise<Resource[]> {
    // Check cache first
    if (this.isCacheValid()) {
      console.log(`BACKEND: Using cached knowledge (${this.knowledgeCache!.length} resources, age: ${Math.round((Date.now() - this.knowledgeCacheTimestamp) / 1000)}s)`);
      return this.knowledgeCache!;
    }

    const fetchStartTime = Date.now();
    let collectionName: string;

    // Try to read from active_dataset config for dynamic collection selection
    try {
      const configRef = doc(db, 'knowledgebase_config', 'active_dataset');
      const configDoc = await getDoc(configRef);

      if (configDoc.exists()) {
        const configData = configDoc.data();
        collectionName = configData.collectionName;
        console.log(`BACKEND: Using active_dataset config collection: '${collectionName}'`);
      } else {
        // Fallback to timestamped collection
        collectionName = 'knowledgebase_wp_2026-01-16T10-05-04';
        console.log(`BACKEND: No active_dataset config found, using fallback: '${collectionName}'`);
      }
    } catch (error) {
      console.warn(`BACKEND: Error reading active_dataset config:`, error);
      collectionName = 'knowledgebase_wp_2026-01-16T10-05-04';
      console.log(`BACKEND: Using fallback collection due to error: '${collectionName}'`);
    }

    console.log(`BACKEND: Fetching knowledge from '${collectionName}' (cache miss)`);

    const knowledgeCollection = collection(db, collectionName);
    const querySnapshot = await getDocs(knowledgeCollection);

    const knowledge = querySnapshot.docs.map(doc => {
      const data = doc.data();

      // Helper to detect roadmap URLs (don't have /resources/ in path)
      const isRoadmapUrl = (url: string | undefined): boolean => {
        if (!url) return false;
        // Roadmap pages don't have /resources/ in path
        // They're in sections like: /your-core-strategy/, /engage-regulators/, etc.
        return !url.includes('/resources/');
      };

      // ALWAYS recalculate contentType from URL (don't trust Firestore value)
      // This ensures roadmap pages are properly tagged even if Firestore has wrong value
      const calculatedContentType = isRoadmapUrl(data.url) ? 'roadmap' : 'library';

      return {
        id: doc.id,  // Use string ID for both sources
        title: decodeHtmlEntities(data.title),
        description: decodeHtmlEntities(data.description || data.content || ''),
        summary: decodeHtmlEntities(data.summary || ''),
        tags: data.tags || [],
        group: data.group || 'General',
        // Use calculated contentType based on URL (override Firestore value)
        contentType: calculatedContentType,
        url: data.url || undefined,
      } as Resource;
    });

    // Count by contentType for debugging
    const libraryCount = knowledge.filter(r => r.contentType === 'library').length;
    const roadmapCount = knowledge.filter(r => r.contentType === 'roadmap').length;
    console.log(`BACKEND: Returning ${knowledge.length} knowledge resources from '${collectionName}' (${libraryCount} library, ${roadmapCount} roadmap).`);

    // Log sample of each type for verification
    if (roadmapCount > 0) {
      const sampleRoadmap = knowledge.find(r => r.contentType === 'roadmap');
      console.log('BACKEND: Sample roadmap resource:', {
        title: sampleRoadmap?.title,
        url: sampleRoadmap?.url,
        contentType: sampleRoadmap?.contentType
      });
    }
    if (libraryCount > 0) {
      const sampleLibrary = knowledge.find(r => r.contentType === 'library');
      console.log('BACKEND: Sample library resource:', {
        title: sampleLibrary?.title,
        url: sampleLibrary?.url,
        contentType: sampleLibrary?.contentType
      });
    }

    // Store collection name for debug display
    (this as any)._lastCollectionName = collectionName;
    (this as any)._lastCollectionCount = knowledge.length;

    // Cache the results
    this.knowledgeCache = knowledge;
    this.knowledgeCacheTimestamp = Date.now();
    const fetchDuration = Date.now() - fetchStartTime;
    console.log(`BACKEND: Knowledge cached (fetch took ${fetchDuration}ms)`);

    return knowledge;
  }

  /**
   * Get info about the last loaded knowledge base collection
   * Used for debug display
   */
  getLastCollectionInfo(): { collectionName: string; count: number } | null {
    if ((this as any)._lastCollectionName) {
      return {
        collectionName: (this as any)._lastCollectionName,
        count: (this as any)._lastCollectionCount || 0
      };
    }
    return null;
  }

  /**
   * Retrieves knowledge from multiple sources based on enabled toggles
   * @param enabledSources - Array of source keys to include (e.g., ['original', 'htg_library'])
   */
  async getKnowledgeMultiSource(enabledSources: string[]): Promise<Resource[]> {
    console.log(`BACKEND: Fetching knowledge from sources: ${enabledSources.join(', ')}`);

    const allResources: Resource[] = [];

    for (const sourceKey of enabledSources) {
      const collectionName = this.knowledgeSourceCollections[sourceKey];
      if (!collectionName) {
        console.warn(`BACKEND: Unknown knowledge source: ${sourceKey}`);
        continue;
      }

      try {
        const knowledgeCollection = collection(db, collectionName);
        const querySnapshot = await getDocs(knowledgeCollection);

        const sourceResources = querySnapshot.docs.map(doc => {
          const data = doc.data();

          // Helper to detect roadmap URLs (don't have /resources/ in path)
          const isRoadmapUrl = (url: string | undefined): boolean => {
            if (!url) return false;
            return !url.includes('/resources/');
          };

          // ALWAYS recalculate contentType from URL (don't trust Firestore value)
          const calculatedContentType = isRoadmapUrl(data.url) ? 'roadmap' : 'library';

          return {
            id: doc.id,
            title: decodeHtmlEntities(data.title),
            description: decodeHtmlEntities(data.description || data.content || ''),
            summary: decodeHtmlEntities(data.summary || ''),
            tags: data.tags || [],
            group: data.group || 'General',
            category: data.category || undefined,
            contentType: calculatedContentType,
            url: data.url || undefined,
          } as Resource;
        });

        console.log(`BACKEND: Loaded ${sourceResources.length} resources from '${sourceKey}'`);
        allResources.push(...sourceResources);
      } catch (error) {
        console.error(`BACKEND: Error loading ${sourceKey}:`, error);
      }
    }

    console.log(`BACKEND: Total resources from all sources: ${allResources.length}`);
    return allResources;
  }

  /**
   * Get available knowledge sources with their configuration
   */
  async getKnowledgeSources(): Promise<Array<{
    key: string;
    name: string;
    collectionName: string;
    resourceCount: number;
    enabled: boolean;
  }>> {
    console.log('BACKEND: Fetching available knowledge sources...');

    const sources = [
      { key: 'original', name: 'Original Knowledge Base', enabled: true },
      { key: 'wordpress', name: 'WordPress Synced', enabled: false },
      { key: 'htg_library', name: 'HTG Resource Library', enabled: false },
    ];

    const result = [];

    for (const source of sources) {
      const collectionName = this.knowledgeSourceCollections[source.key];
      try {
        const collRef = collection(db, collectionName);
        const snapshot = await getDocs(collRef);
        result.push({
          ...source,
          collectionName,
          resourceCount: snapshot.size,
        });
      } catch {
        result.push({
          ...source,
          collectionName,
          resourceCount: 0,
        });
      }
    }

    console.log(`BACKEND: Found ${result.length} knowledge sources`);
    return result;
  }

  // Saves a chat to history
  async saveChatHistory(chatData: Omit<ChatHistory, 'id' | 'timestamp'>, user: User | null): Promise<ChatHistory> {
    console.log("BACKEND: Received save chat history request.");
    const uid = this._authenticate(user);

    const userChatsCollection = collection(db, 'users', uid, 'chatHistory');

    const newDocument = {
      ...chatData,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(userChatsCollection, newDocument);
    console.log("BACKEND: Saved chat to history with ID:", docRef.id);

    return { ...newDocument, id: docRef.id, timestamp: new Date().toISOString() };
  }

  // Retrieves chat history for a user
  async getChatHistory(user: User | null): Promise<ChatHistory[]> {
    console.log("BACKEND: Received request to get chat history.");
    const uid = this._authenticate(user);

    const userChatsCollection = collection(db, 'users', uid, 'chatHistory');
    const q = query(userChatsCollection, orderBy('timestamp', 'desc'));

    const querySnapshot = await getDocs(q);
    const chats = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString(),
    } as ChatHistory));

    console.log(`BACKEND: Returning ${chats.length} chats from history.`);
    return chats;
  }

  // Deletes an output from the user's collection in Firestore
  async deleteOutput(outputId: string, user: User | null): Promise<void> {
    console.log("BACKEND: Received delete request for output:", outputId);
    const uid = this._authenticate(user);

    const outputDocRef = doc(db, 'users', uid, 'outputs', outputId);
    await deleteDoc(outputDocRef);
    console.log("BACKEND: Deleted output with ID:", outputId);
  }

  // Saves bookmarked resources for a user
  async saveBookmarks(bookmarks: BookmarkedResource[], user: User | null): Promise<void> {
    console.log("BACKEND: Received save bookmarks request.");
    const uid = this._authenticate(user);

    // Use a single document to store all bookmarks for the user
    const bookmarksDocRef = doc(db, 'users', uid, 'bookmarks', 'saved');
    await setDoc(bookmarksDocRef, {
      bookmarks,
      updatedAt: serverTimestamp(),
    });
    console.log(`BACKEND: Saved ${bookmarks.length} bookmarks for user.`);
  }

  // Retrieves bookmarked resources for a user
  async getBookmarks(user: User | null): Promise<BookmarkedResource[]> {
    console.log("BACKEND: Received request to get bookmarks.");
    const uid = this._authenticate(user);

    const bookmarksDocRef = doc(db, 'users', uid, 'bookmarks', 'saved');
    const bookmarksDoc = await getDoc(bookmarksDocRef);

    if (!bookmarksDoc.exists()) {
      console.log("BACKEND: No bookmarks found for user.");
      return [];
    }

    const data = bookmarksDoc.data();
    const bookmarks = (data.bookmarks || []) as BookmarkedResource[];
    console.log(`BACKEND: Returning ${bookmarks.length} bookmarks.`);
    return bookmarks;
  }

  // Selects the most relevant resources based on keyword matching with query
  // Fast local scoring - no API call needed
  private async _selectRelevantResources(
    query: string,
    allResources: Resource[],
    maxResources: number = 15
  ): Promise<{
    resources: Resource[];
    metrics: {
      queryKeywords: string[];
      topLibraryScores: Array<{ score: number; title: string }>;
      topRoadmapScores: Array<{ score: number; title: string }>;
    };
  }> {
    console.log(`BACKEND: Selecting top ${maxResources} relevant resources from ${allResources.length} total`);

    if (allResources.length <= maxResources) {
      return allResources;
    }

    // Split into library and roadmap resources
    const libraryResources = allResources.filter(r => r.contentType === 'library');
    const roadmapResources = allResources.filter(r => r.contentType === 'roadmap');
    console.log(`BACKEND: Resource pool: ${libraryResources.length} library, ${roadmapResources.length} roadmap`);

    // Extract keywords from query (lowercase, remove common words)
    const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
      'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
      'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
      'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
      'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until',
      'while', 'about', 'against', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
      'am', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours',
      'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
      'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves']);

    const queryWords = query.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    console.log('BACKEND: Query keywords:', queryWords.join(', '));

    // Score each resource based on keyword matches in title and tags
    const scored = allResources.map((resource, index) => {
      const titleLower = (resource.title || '').toLowerCase();
      const tagsLower = (resource.tags || []).join(' ').toLowerCase();
      const groupLower = (resource.group || '').toLowerCase();
      const searchText = `${titleLower} ${tagsLower} ${groupLower}`;

      let score = 0;
      for (const word of queryWords) {
        // Exact word match in title gets highest score
        if (titleLower.includes(word)) {
          score += 10;
          // Bonus for word at start of title
          if (titleLower.startsWith(word)) score += 5;
        }
        // Match in tags
        if (tagsLower.includes(word)) score += 5;
        // Match in group
        if (groupLower.includes(word)) score += 3;
      }

      // Bonus for partial matches (substring)
      for (const word of queryWords) {
        if (word.length >= 4) {
          const stem = word.slice(0, -1); // Simple stemming
          if (searchText.includes(stem) && !searchText.includes(word)) {
            score += 2;
          }
        }
      }

      return { resource, score, index };
    });

    // Separate scored resources by type
    const scoredLibrary = scored.filter(s => s.resource.contentType === 'library');
    const scoredRoadmap = scored.filter(s => s.resource.contentType === 'roadmap');

    // Allocate resources proportionally: ~67% library, ~33% roadmap
    // This ensures roadmap content is always available for citations
    const librarySlots = Math.ceil(maxResources * 0.67);
    const roadmapSlots = maxResources - librarySlots;

    console.log(`BACKEND: Allocating ${librarySlots} slots for library, ${roadmapSlots} slots for roadmap`);

    // Sort each type by score and take top N
    scoredLibrary.sort((a, b) => b.score - a.score);
    scoredRoadmap.sort((a, b) => b.score - a.score);

    const selectedLibrary = scoredLibrary.slice(0, librarySlots);
    const selectedRoadmap = scoredRoadmap.slice(0, roadmapSlots);

    // Combine selections
    const selected = [...selectedLibrary, ...selectedRoadmap];

    console.log(`BACKEND: Top library scores: ${selectedLibrary.slice(0, 3).map(s => `${s.score}:${(s.resource.title || 'Untitled').slice(0, 30)}`).join(', ')}`);
    console.log(`BACKEND: Top roadmap scores: ${selectedRoadmap.slice(0, 3).map(s => `${s.score}:${(s.resource.title || 'Untitled').slice(0, 30)}`).join(', ')}`);
    console.log(`BACKEND: Selected ${selected.length} resources (${selectedLibrary.length} library, ${selectedRoadmap.length} roadmap)`);

    // Return resources and metrics
    return {
      resources: selected.map(s => s.resource),
      metrics: {
        queryKeywords: queryWords,
        topLibraryScores: selectedLibrary.slice(0, 5).map(s => ({
          score: s.score,
          title: s.resource.title || 'Untitled'
        })),
        topRoadmapScores: selectedRoadmap.slice(0, 5).map(s => ({
          score: s.score,
          title: s.resource.title || 'Untitled'
        }))
      }
    };
  }
}

export const backendService = new BackendService();