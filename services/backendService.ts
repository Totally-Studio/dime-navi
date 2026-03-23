import { Template, SavedOutput, Resource, ChatHistory } from '../types';
import { SYSTEM_PROMPT_START, SYSTEM_PROMPT_END, ROADMAP_PROMPT, ENABLE_ROADMAP_RECOMMENDATION, TEMPLATE_INSTRUCTIONS, DEFAULT_TEMPLATE_INSTRUCTION, WIDGET_VERSION, DEFAULT_RESPONSE_TEMPLATE } from '../constants';
import { db, ai } from './firebaseConfig';
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, getDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { getGenerativeModel } from 'firebase/ai';
import { User } from 'firebase/auth';
import { promptMetricsService, captureSourceInfo, createPromptConfig } from './promptMetricsService';
import { ChatQuerySchema } from '../utils/validation';
import { logger } from '../utils/logger';

// Bookmarked resource type for persisting user bookmarks
export interface BookmarkedResource {
  resource: Resource;
  citationId: number;
  timestamp: string;
}

// SECURITY: This service uses Firebase Vertex AI which keeps API keys server-side.
// Authentication is handled by Firebase, preventing unauthorized access and API key exposure.

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

  // SECURITY: Rate limiting to prevent API abuse
  private rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  private readonly RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute

  // In a real backend, you would verify the ID token. Here we trust the client-side user object
  // as this is a simulation running on the client.
  private _authenticate(user: User | null): string {
    if (!user) {
      logger.error("BACKEND: Authentication failed. No user provided.");
      throw new Error("Unauthorized: You must be logged in to perform this action.");
    }
    logger.debug(`BACKEND: User authenticated successfully with UID: ${user.uid}`);
    return user.uid;
  }

  // SECURITY: Check rate limit before API calls
  private _checkRateLimit(userId: string): void {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetAt) {
      // First request or window expired - reset counter
      this.rateLimitMap.set(userId, { count: 1, resetAt: now + this.RATE_LIMIT_WINDOW_MS });
      logger.debug(`BACKEND: Rate limit initialized for user ${userId}: 1/${this.RATE_LIMIT_MAX_REQUESTS}`);
      return;
    }

    if (userLimit.count >= this.RATE_LIMIT_MAX_REQUESTS) {
      const waitSeconds = Math.ceil((userLimit.resetAt - now) / 1000);
      logger.error(`BACKEND: Rate limit exceeded for user ${userId}`);
      throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds before trying again.`);
    }

    userLimit.count++;
    logger.debug(`BACKEND: Rate limit check passed for user ${userId}: ${userLimit.count}/${this.RATE_LIMIT_MAX_REQUESTS}`);
  }

  // Logs the AI interaction to Firestore for monitoring
  private async _logAIInteraction(
    user: User | null,
    type: 'generate',
    request: { query: string; template: string; contextLength: number },
    response: { textLength: number; success: boolean; error?: string },
    metadata: { model: string; durationMs: number }
  ): Promise<void> {
    try {
      if (!user) {
        logger.error("BACKEND: Cannot log AI interaction - User is null");
        return;
      }

      logger.debug("BACKEND: Attempting to log AI interaction for user:", user.uid);
      const logsCollection = collection(db, 'ai_logs');
      await addDoc(logsCollection, {
        userId: user.uid,
        timestamp: serverTimestamp(),
        type,
        request,
        response,
        metadata
      });
      logger.debug("BACKEND: Logging AI interaction to 'ai_logs' collection.");
    } catch (error) {
      logger.error("BACKEND: Failed to log AI interaction:", error);
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
    // SECURITY: Authenticate and check rate limit
    const uid = this._authenticate(user);
    this._checkRateLimit(uid);

    // SECURITY: Validate input
    try {
      ChatQuerySchema.parse({ query, resourceIds: [], conversationHistory: [] });
    } catch (error) {
      logger.error('BACKEND: Input validation failed:', error);
      throw new Error('Invalid query. Please check your input and try again.');
    }

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

      // SECURITY: Using Firebase AI - API key stays server-side
      const model = getGenerativeModel(ai, {
        model: modelName,
        systemInstruction: systemInstruction,
      });

      const response = await model.generateContentStream(fullPrompt);

      let fullResponse = '';
      for await (const chunk of response.stream) {
        if (signal?.aborted) {
          throw new Error('Generation was stopped.');
        }
        const text = chunk.text();
        fullResponse += text;
        if (text) {
          onChunk(text);
        }
      }

      const duration = Date.now() - startTime;
      logger.debug(`📊 INTRO: Generated in ${duration}ms (${fullResponse.length} chars)`);

    } catch (error) {
      logger.error("BACKEND: Error generating intro:", error);
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
    logger.debug("BACKEND: Received generate stream request.");
    // SECURITY: Authenticate and check rate limit
    const uid = this._authenticate(user);
    this._checkRateLimit(uid);

    // SECURITY: Validate input to prevent malicious/oversized requests
    try {
      ChatQuerySchema.parse({
        query,
        resourceIds: selectedResourceIds,
        conversationHistory: conversationHistory.map(h => ({
          role: 'user' as const,
          content: h.query + h.response
        }))
      });
    } catch (error) {
      logger.error('BACKEND: Input validation failed:', error);
      throw new Error('Invalid input. Please check your query and try again.');
    }

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
      logger.debug(`BACKEND: Loaded ${allResources.length} total resources`);

      // Step 1: Use titles to find most relevant resources
      // Reduced from 24 to 15 for faster TTFR (less context = faster Gemini processing)
      onProgress?.(`Analyzing ${allResources.length} sources for relevance...`);
      const selectionResult = await this._selectRelevantResources(query, allResources, 15);
      const relevantResources = selectionResult.resources;
      queryKeywords = selectionResult.metrics.queryKeywords;
      topLibraryScores = selectionResult.metrics.topLibraryScores;
      topRoadmapScores = selectionResult.metrics.topRoadmapScores;
      logger.debug(`BACKEND: Selected ${relevantResources.length} relevant resources based on titles`);

      // Log breakdown of selected resources by type
      const selectedLibraryCount = relevantResources.filter(r => r.contentType === 'library').length;
      const selectedRoadmapCount = relevantResources.filter(r => r.contentType === 'roadmap').length;
      logger.debug(`BACKEND: Selected resources breakdown: ${selectedLibraryCount} library, ${selectedRoadmapCount} roadmap`);

      if (selectedRoadmapCount === 0) {
        logger.warn('BACKEND: WARNING - No roadmap resources selected! Roadmap content will not be available for citations.');
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
          logger.warn(`BACKEND: WARNING - Roadmap resource has NO CONTENT: "${r.title}" (${r.id})`);
        }
        // Use wpPostId for modal compatibility (numeric ID for citation matching)
        const resourceId = r.wpPostId || r.id;
        return `## [${resourceId}] ${r.title}\n\n${content}`;
      }).join('\n\n');

      // Check if any roadmap resources have actual content
      const roadmapWithContent = relevantResources.filter(r =>
        r.contentType === 'roadmap' && (r.description || r.summary)
      ).length;
      logger.debug(`BACKEND: Roadmap resources with content: ${roadmapWithContent}/${selectedRoadmapCount}`);

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

      logger.debug("BACKEND: enableRoadmap (UI toggle) =", enableRoadmap);
      logger.debug("BACKEND: Roadmap section included:", enableRoadmap ? "YES" : "NO");
      logger.debug("BACKEND: Context length:", context.length);
      logger.debug("BACKEND: System instruction length:", systemInstruction.length);

      onProgress?.(`Selected ${relevantResources.length} relevant sources`);
      onProgress?.(`Building context (${Math.round(context.length / 1000)}KB)...`);
      onProgress?.(`Processing your query...`);

      logger.debug("BACKEND: Starting streaming request to Gemini...");

      // SECURITY: Using Firebase AI - API key stays server-side
      const model = getGenerativeModel(ai, {
        model: modelName,
        systemInstruction: systemInstruction,
      });

      const response = await model.generateContentStream(fullPrompt);

      logger.debug("BACKEND: Successfully started streaming content.");
      onProgress?.('AI responded. Streaming answer...');
      streamingStartTime = Date.now();
      let chunkCount = 0;
      let lastChunk: any = null;

      for await (const chunk of response.stream) {
        // Check for abort signal
        if (signal?.aborted) {
          logger.debug("BACKEND: Generation aborted by user");
          throw new Error('Generation was stopped.');
        }

        chunkCount++;
        lastChunk = chunk; // Capture last chunk (has usageMetadata)
        const text = chunk.text();
        fullResponseText += text;

        // Capture first chunk time
        if (chunkCount === 1 && firstChunkTime === null) {
          firstChunkTime = Date.now();
        }

        if (text) {
          onChunk(text);
        }
      }
      logger.debug(`BACKEND: Stream finished. Total chunks: ${chunkCount}`);

      // Extract token counts from last chunk's usageMetadata
      const usageMetadata = lastChunk?.usageMetadata;
      const inputTokens = usageMetadata?.promptTokenCount || 0;
      const outputTokens = usageMetadata?.candidatesTokenCount || 0;
      const thoughtTokens = usageMetadata?.thoughtsTokenCount || 0;
      const totalTokens = usageMetadata?.totalTokenCount || 0;

      logger.debug(`📊 BACKEND: Input tokens: ${inputTokens}`);
      logger.debug(`📊 BACKEND: Output tokens: ${outputTokens}`);
      logger.debug(`📊 BACKEND: Thought tokens: ${thoughtTokens}`);
      logger.debug(`📊 BACKEND: Total tokens: ${totalTokens}`);
      logger.debug(`📊 BACKEND: Token counts:`, { input: inputTokens, output: outputTokens, thought: thoughtTokens, total: totalTokens });

      // Log success
      const durationMs = Date.now() - startTime;
      await this._logAIInteraction(user, 'generate',
        { query, template, contextLength: context.length },
        { textLength: fullResponseText.length, success: true},
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
          source: captureSourceInfo(WIDGET_VERSION),
          promptConfig: createPromptConfig(
            `${WIDGET_VERSION}-single-phase`,
            'single-phase',
            template,
            enableRoadmap ? ['roadmap', 'citations'] : ['citations']
          ),
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
          source: captureSourceInfo(WIDGET_VERSION),
          promptConfig: createPromptConfig(
            `${WIDGET_VERSION}-single-phase`,
            'single-phase',
            template,
            enableRoadmap ? ['roadmap', 'citations'] : ['citations']
          ),
        });
        throw error;
      }

      logger.error("BACKEND: Error generating content:", error);

      // Log failure
      const durationMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this._logAIInteraction(user, 'generate',
        { query, template, contextLength: 0 },
        { textLength: fullResponseText.length, success: false, error: errorMessage},
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
          source: captureSourceInfo(WIDGET_VERSION),
          promptConfig: createPromptConfig(
            `${WIDGET_VERSION}-single-phase`,
            'single-phase',
            template,
            enableRoadmap ? ['roadmap', 'citations'] : ['citations']
          ),
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
    logger.debug("BACKEND: Received save request.");
    const uid = this._authenticate(user);

    const userOutputsCollection = collection(db, 'users', uid, 'outputs');

    const newDocument = {
      ...outputData,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(userOutputsCollection, newDocument);
    logger.debug("BACKEND: Saved new output to Firestore with ID:", docRef.id);

    return { ...newDocument, id: docRef.id, timestamp: new Date().toISOString() };
  }

  // Retrieves all outputs for a user from Firestore
  async getOutputs(user: User | null): Promise<SavedOutput[]> {
    logger.debug("BACKEND: Received request to get all outputs.");
    const uid = this._authenticate(user);

    const userOutputsCollection = collection(db, 'users', uid, 'outputs');
    const q = query(userOutputsCollection, orderBy('timestamp', 'desc'));

    const querySnapshot = await getDocs(q);
    const outputs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString(),
    } as SavedOutput));

    logger.debug(`BACKEND: Returning ${outputs.length} outputs from Firestore.`);
    return outputs;
  }

  // Knowledge source collection mappings
  private knowledgeSourceCollections: Record<string, string> = {
    'original': 'knowledgeBase',
    'wordpress': 'knowledgebase_wp',
    'htg_library': 'knowledgebase_htg',
    'timestamped': 'knowledgebase_wp_2026-03-06',
  };

  /**
   * Clear the knowledge cache (useful after database updates)
   */
  clearKnowledgeCache(): void {
    this.knowledgeCache = null;
    this.knowledgeCacheTimestamp = 0;
    logger.debug('BACKEND: Knowledge cache cleared');
  }

  /**
   * Check if cache is valid (exists and not expired)
   */
  private isCacheValid(): boolean {
    if (!this.knowledgeCache) return false;
    const age = Date.now() - this.knowledgeCacheTimestamp;
    const isValid = age < this.CACHE_TTL_MS;
    if (!isValid && this.knowledgeCache) {
      logger.debug(`BACKEND: Cache expired (age: ${Math.round(age / 1000)}s, TTL: ${this.CACHE_TTL_MS / 1000}s)`);
    }
    return isValid;
  }

  // Retrieves knowledge from Firestore based on source or active_dataset config
  async getKnowledge(source: 'original' | 'wordpress' = 'original'): Promise<Resource[]> {
    // Check cache first
    if (this.isCacheValid()) {
      logger.debug(`BACKEND: Using cached knowledge (${this.knowledgeCache!.length} resources, age: ${Math.round((Date.now() - this.knowledgeCacheTimestamp) / 1000)}s)`);
      return this.knowledgeCache!;
    }

    const fetchStartTime = Date.now();
    let collectionName: string;

    // Cleanup: Check if page has staging mode, clear flag if not
    const pageHasStagingMode = document.querySelector('[data-staging-mode="true"]') !== null;
    const storedStagingMode = localStorage.getItem('navi_staging_mode') === 'true';
    if (!pageHasStagingMode && storedStagingMode) {
      logger.debug('BACKEND: Clearing staging mode flag (page does not have data-staging-mode)');
      localStorage.removeItem('navi_staging_mode');
    }

    // Check for staging mode — also treat non-production domains as staging
    const isProductionDomain = typeof window !== 'undefined' && window.location.hostname === 'navigator.dimesociety.org';
    const isStaging = !isProductionDomain || (localStorage.getItem('navi_staging_mode') === 'true' && pageHasStagingMode);

    // Try to read collection name based on staging/production mode
    try {
      if (isStaging) {
        // STAGING MODE: Check for collection override from data attribute first
        logger.debug('🚀 BACKEND: STAGING MODE ENABLED');

        const stagingContainer = document.querySelector('[data-staging-collection]');
        const overrideCollection = stagingContainer?.getAttribute('data-staging-collection');

        if (overrideCollection) {
          collectionName = overrideCollection;
          logger.debug(`🚀 STAGING MODE: Using collection from data-staging-collection attribute: '${collectionName}'`);
        } else {
          try {
            // Try reading from active_collections document
            const activeCollectionsRef = doc(db, 'knowledgebase_config', 'active_collections');
            const activeCollectionsDoc = await getDoc(activeCollectionsRef);

            if (activeCollectionsDoc.exists()) {
              const activeCollectionsData = activeCollectionsDoc.data();
              const stagingCollection = activeCollectionsData.staging || activeCollectionsData.latest;

              if (stagingCollection) {
                collectionName = stagingCollection;
                logger.debug(`🚀 STAGING MODE: Using staging collection from active_collections: '${collectionName}'`);
              } else {
                throw new Error('No staging collection found in active_collections');
              }
            } else {
              throw new Error('active_collections document does not exist');
            }
          } catch (stagingError) {
            logger.warn('🚀 STAGING MODE: Could not read from active_collections, falling back to active_dataset:', stagingError);

            // Fallback: Use active_dataset (production collection) in staging mode
            const configRef = doc(db, 'knowledgebase_config', 'active_dataset');
            const configDoc = await getDoc(configRef);

            if (configDoc.exists()) {
              const configData = configDoc.data();
              collectionName = configData.collectionName;
              logger.debug(`🚀 STAGING MODE (FALLBACK): Using active_dataset collection: '${collectionName}'`);
            } else {
              collectionName = 'knowledgebase_wp_2026-03-06';
              logger.debug(`🚀 STAGING MODE (FALLBACK): Using hardcoded fallback: '${collectionName}'`);
            }
          }
        }
      } else {
        // PRODUCTION MODE: Use active_dataset
        const configRef = doc(db, 'knowledgebase_config', 'active_dataset');
        const configDoc = await getDoc(configRef);

        if (configDoc.exists()) {
          const configData = configDoc.data();
          collectionName = configData.collectionName;
          logger.debug(`BACKEND: Using active_dataset config collection: '${collectionName}'`);
        } else {
          // Try reading from active_collections.production as backup
          try {
            const activeCollectionsRef = doc(db, 'knowledgebase_config', 'active_collections');
            const activeCollectionsDoc = await getDoc(activeCollectionsRef);

            if (activeCollectionsDoc.exists()) {
              const activeCollectionsData = activeCollectionsDoc.data();
              collectionName = activeCollectionsData.production || 'knowledgebase_wp_2026-03-06';
              logger.debug(`BACKEND: Using production collection from active_collections: '${collectionName}'`);
            } else {
              throw new Error('No active_dataset or active_collections found');
            }
          } catch (backupError) {
            // Fallback to timestamped collection
            collectionName = 'knowledgebase_wp_2026-03-06';
            logger.debug(`BACKEND: No active_dataset config found, using fallback: '${collectionName}'`);
          }
        }
      }
    } catch (error) {
      logger.warn(`BACKEND: Error reading collection config:`, error);
      collectionName = 'knowledgebase_wp_2026-03-06';
      logger.debug(`BACKEND: Using fallback collection due to error: '${collectionName}'`);
    }
    logger.debug(`BACKEND: Fetching knowledge from '${collectionName}' (cache miss)`);

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
        wpPostId: data.wpPostId || undefined,
        citationId: data.citationId || undefined,
      } as Resource;
    });

    // Count by contentType for debugging
    const libraryCount = knowledge.filter(r => r.contentType === 'library').length;
    const roadmapCount = knowledge.filter(r => r.contentType === 'roadmap').length;
    logger.debug(`BACKEND: Returning ${knowledge.length} knowledge resources from '${collectionName}' (${libraryCount} library, ${roadmapCount} roadmap).`);

    // Log sample of each type for verification
    if (roadmapCount > 0) {
      const sampleRoadmap = knowledge.find(r => r.contentType === 'roadmap');
      logger.debug('BACKEND: Sample roadmap resource:', {
        title: sampleRoadmap?.title,
        url: sampleRoadmap?.url,
        contentType: sampleRoadmap?.contentType
      });
    }
    if (libraryCount > 0) {
      const sampleLibrary = knowledge.find(r => r.contentType === 'library');
      logger.debug('BACKEND: Sample library resource:', {
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
    logger.debug(`BACKEND: Knowledge cached (fetch took ${fetchDuration}ms)`);

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
    logger.debug(`BACKEND: Fetching knowledge from sources: ${enabledSources.join(', ')}`);

    const allResources: Resource[] = [];

    for (const sourceKey of enabledSources) {
      const collectionName = this.knowledgeSourceCollections[sourceKey];
      if (!collectionName) {
        logger.warn(`BACKEND: Unknown knowledge source: ${sourceKey}`);
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
            wpPostId: data.wpPostId,
            category: data.category || undefined,
            contentType: calculatedContentType,
            url: data.url || undefined,
            citationId: data.citationId || undefined,
          } as Resource;
        });

        logger.debug(`BACKEND: Loaded ${sourceResources.length} resources from '${sourceKey}'`);
        allResources.push(...sourceResources);
      } catch (error) {
        logger.error(`BACKEND: Error loading ${sourceKey}:`, error);
      }
    }

    logger.debug(`BACKEND: Total resources from all sources: ${allResources.length}`);
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
    logger.debug('BACKEND: Fetching available knowledge sources...');

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

    logger.debug(`BACKEND: Found ${result.length} knowledge sources`);
    return result;
  }

  // Saves a chat to history
  async saveChatHistory(chatData: Omit<ChatHistory, 'id' | 'timestamp'>, user: User | null): Promise<ChatHistory> {
    logger.debug("BACKEND: Received save chat history request.");
    const uid = this._authenticate(user);

    const userChatsCollection = collection(db, 'users', uid, 'chatHistory');

    const newDocument = {
      ...chatData,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(userChatsCollection, newDocument);
    logger.debug("BACKEND: Saved chat to history with ID:", docRef.id);

    return { ...newDocument, id: docRef.id, timestamp: new Date().toISOString() };
  }

  // Retrieves chat history for a user
  async getChatHistory(user: User | null): Promise<ChatHistory[]> {
    logger.debug("BACKEND: Received request to get chat history.");
    const uid = this._authenticate(user);

    const userChatsCollection = collection(db, 'users', uid, 'chatHistory');
    const q = query(userChatsCollection, orderBy('timestamp', 'desc'));

    const querySnapshot = await getDocs(q);
    const chats = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp.toDate().toISOString(),
    } as ChatHistory));

    logger.debug(`BACKEND: Returning ${chats.length} chats from history.`);
    return chats;
  }

  // Deletes an output from the user's collection in Firestore
  async deleteOutput(outputId: string, user: User | null): Promise<void> {
    logger.debug("BACKEND: Received delete request for output:", outputId);
    const uid = this._authenticate(user);

    const outputDocRef = doc(db, 'users', uid, 'outputs', outputId);
    await deleteDoc(outputDocRef);
    logger.debug("BACKEND: Deleted output with ID:", outputId);
  }

  // Saves bookmarked resources for a user
  async saveBookmarks(bookmarks: BookmarkedResource[], user: User | null): Promise<void> {
    logger.debug("BACKEND: Received save bookmarks request.");
    const uid = this._authenticate(user);

    // Use a single document to store all bookmarks for the user
    const bookmarksDocRef = doc(db, 'users', uid, 'bookmarks', 'saved');
    await setDoc(bookmarksDocRef, {
      bookmarks,
      updatedAt: serverTimestamp(),
    });
    logger.debug(`BACKEND: Saved ${bookmarks.length} bookmarks for user.`);
  }

  // Retrieves bookmarked resources for a user
  async getBookmarks(user: User | null): Promise<BookmarkedResource[]> {
    logger.debug("BACKEND: Received request to get bookmarks.");
    const uid = this._authenticate(user);

    const bookmarksDocRef = doc(db, 'users', uid, 'bookmarks', 'saved');
    const bookmarksDoc = await getDoc(bookmarksDocRef);

    if (!bookmarksDoc.exists()) {
      logger.debug("BACKEND: No bookmarks found for user.");
      return [];
    }

    const data = bookmarksDoc.data();
    const bookmarks = (data.bookmarks || []) as BookmarkedResource[];
    logger.debug(`BACKEND: Returning ${bookmarks.length} bookmarks.`);
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
    logger.debug(`BACKEND: Selecting top ${maxResources} relevant resources from ${allResources.length} total`);

    if (allResources.length <= maxResources) {
      return {
        resources: allResources,
        metrics: {
          queryKeywords: [],
          topLibraryScores: [],
          topRoadmapScores: []
        }
      };
    }

    // Split into library and roadmap resources
    const libraryResources = allResources.filter(r => r.contentType === 'library');
    const roadmapResources = allResources.filter(r => r.contentType === 'roadmap');
    logger.debug(`BACKEND: Resource pool: ${libraryResources.length} library, ${roadmapResources.length} roadmap`);

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

    logger.debug('BACKEND: Query keywords:', queryWords.join(', '));

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

    logger.debug(`BACKEND: Allocating ${librarySlots} slots for library, ${roadmapSlots} slots for roadmap`);

    // Sort each type by score and take top N
    scoredLibrary.sort((a, b) => b.score - a.score);
    scoredRoadmap.sort((a, b) => b.score - a.score);

    const selectedLibrary = scoredLibrary.slice(0, librarySlots);
    const selectedRoadmap = scoredRoadmap.slice(0, roadmapSlots);

    // Combine selections
    const selected = [...selectedLibrary, ...selectedRoadmap];

    logger.debug(`BACKEND: Top library scores: ${selectedLibrary.slice(0, 3).map(s => `${s.score}:${(s.resource.title || 'Untitled').slice(0, 30)}`).join(', ')}`);
    logger.debug(`BACKEND: Top roadmap scores: ${selectedRoadmap.slice(0, 3).map(s => `${s.score}:${(s.resource.title || 'Untitled').slice(0, 30)}`).join(', ')}`);
    logger.debug(`BACKEND: Selected ${selected.length} resources (${selectedLibrary.length} library, ${selectedRoadmap.length} roadmap)`);

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