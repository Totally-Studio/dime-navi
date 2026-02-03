import { db } from './firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * Detailed Prompt Metrics Service
 * Tracks comprehensive metrics for AI prompt processing including:
 * - Token usage (input, thought, output, total)
 * - Response times (streaming start, thinking time, response duration)
 * - Resource selection (relevant resources, keywords, scores)
 * - Model information
 */

export interface PromptMetrics {
  // Basic info
  userId: string;
  timestamp: Timestamp | Date;
  sessionId?: string; // Optional: group metrics by session

  // Query information
  query: string;
  queryLength: number;
  template: string;

  // Model information
  model: string; // e.g., "gemini-2.5-flash"
  modelVersion?: string;

  // Token usage
  tokens: {
    input: number;
    thought: number;
    output: number;
    total: number;
  };

  // Resource selection
  resourceSelection: {
    totalResourcesAvailable: number;
    relevantResourcesSelected: number;
    queryKeywords: string[];
    topLibraryScores: Array<{ score: number; title: string }>;
    topRoadmapScores: Array<{ score: number; title: string }>;
    libraryCount: number;
    roadmapCount: number;
  };

  // Timing metrics (all in milliseconds)
  timing: {
    streamingStartTime: number; // Time from request to first chunk
    thinkingTime: number; // Time spent in "thinking" phase
    responseTime: number; // Total time to complete response
    firstChunkLatency: number; // Latency to first token
    averageChunkInterval?: number; // Average time between chunks
  };

  // Response information
  response: {
    length: number; // Character count
    wordCount: number;
    citationCount?: number;
    success: boolean;
    error?: string;
  };

  // Context information
  context: {
    conversationHistoryLength: number; // Number of previous exchanges
    enabledRoadmap: boolean;
    selectedResourceIds: string[];
  };

  // Performance flags
  performance: {
    wasAborted: boolean;
    hadErrors: boolean;
    cacheHit?: boolean; // If using caching
  };
}

export class PromptMetricsService {
  private collectionName = 'prompt_metrics';

  /**
   * Log comprehensive prompt metrics
   */
  async logMetrics(metrics: Omit<PromptMetrics, 'timestamp'>): Promise<void> {
    try {
      const metricsCollection = collection(db, this.collectionName);
      await addDoc(metricsCollection, {
        ...metrics,
        timestamp: serverTimestamp(),
      });
      console.log(`✅ Prompt metrics logged for user: ${metrics.userId}`);
    } catch (error) {
      console.error('❌ Failed to log prompt metrics:', error);
      // Don't throw - metrics logging shouldn't break the app
    }
  }

  /**
   * Get metrics for a specific user
   */
  async getUserMetrics(
    userId: string,
    limit: number = 100
  ): Promise<PromptMetrics[]> {
    try {
      const metricsCollection = collection(db, this.collectionName);
      const q = query(
        metricsCollection,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        // Firestore limit: limit(limit) - but limit is a number, not a function
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        ...(doc.data() as Omit<PromptMetrics, 'timestamp'>),
        timestamp: doc.data().timestamp as Timestamp,
      }));
    } catch (error) {
      console.error('Failed to get user metrics:', error);
      return [];
    }
  }

  /**
   * Get aggregate metrics (for analytics dashboard)
   */
  async getAggregateMetrics(timeRange: {
    startDate: Date;
    endDate: Date;
  }): Promise<{
    totalPrompts: number;
    averageTokens: number;
    averageResponseTime: number;
    successRate: number;
    modelUsage: Record<string, number>;
  }> {
    try {
      const metricsCollection = collection(db, this.collectionName);
      const q = query(
        metricsCollection,
        where('timestamp', '>=', timeRange.startDate),
        where('timestamp', '<=', timeRange.endDate)
      );

      const querySnapshot = await getDocs(q);
      const metrics = querySnapshot.docs.map(doc => doc.data() as PromptMetrics);

      const totalPrompts = metrics.length;
      const averageTokens = metrics.reduce((sum, m) => sum + m.tokens.total, 0) / totalPrompts;
      const averageResponseTime = metrics.reduce((sum, m) => sum + m.timing.responseTime, 0) / totalPrompts;
      const successCount = metrics.filter(m => m.response.success).length;
      const successRate = successCount / totalPrompts;

      const modelUsage: Record<string, number> = {};
      metrics.forEach(m => {
        modelUsage[m.model] = (modelUsage[m.model] || 0) + 1;
      });

      return {
        totalPrompts,
        averageTokens,
        averageResponseTime,
        successRate,
        modelUsage,
      };
    } catch (error) {
      console.error('Failed to get aggregate metrics:', error);
      return {
        totalPrompts: 0,
        averageTokens: 0,
        averageResponseTime: 0,
        successRate: 0,
        modelUsage: {},
      };
    }
  }
}

export const promptMetricsService = new PromptMetricsService();
