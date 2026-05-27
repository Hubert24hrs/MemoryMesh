// src/services/ai/AIProvider.ts
import { claudeProvider } from './ClaudeProvider';
import { kimiProvider } from './KimiProvider';
import { openAIProvider } from './OpenAIProvider';
import { ProcessingResult } from '../../types/ai';
import { Memory, MemoryInsight, MemoryType } from '../../types/memory';

export type AIProviderName = 'claude' | 'kimi' | 'openai' | 'gemini';

export interface AIResponse {
  payload: string;
  metadata?: Record<string, any>;
  provider: AIProviderName;
}

class SmartRouter {
  private failureCounts: Record<string, number> = {
    claude: 0,
    kimi: 0,
    openai: 0,
  };
  
  private CIRCUIT_BREAKER_THRESHOLD = 3;

  /**
   * Safe execution wrapper implementing circuit breaker pattern
   */
  private async executeWithFallback<T>(
    providerName: 'claude' | 'kimi' | 'openai',
    primaryCall: () => Promise<T>,
    fallbackCall: () => Promise<T>
  ): Promise<T> {
    if (this.failureCounts[providerName] >= this.CIRCUIT_BREAKER_THRESHOLD) {
      console.warn(`🚨 Circuit breaker active for ${providerName}. Tripping to fallback.`);
      return fallbackCall();
    }

    try {
      const result = await primaryCall();
      this.failureCounts[providerName] = 0; // Reset failures on success
      return result;
    } catch (e) {
      this.failureCounts[providerName]++;
      console.error(`Error with ${providerName} (Failed: ${this.failureCounts[providerName]}):`, e);
      return fallbackCall();
    }
  }

  /**
   * Smartly processes memory text:
   * - Tries Claude for nuanced extraction
   * - Fallbacks to Kimi if Claude is locked or failed
   */
  async processMemory(content: string, _type: MemoryType): Promise<ProcessingResult> {
    return this.executeWithFallback(
      'claude',
      async () => {
        return await claudeProvider.processMemory(content);
      },
      async () => {
        console.log('🔄 Claude failed, falling back to Kimi for context processing');
        return await kimiProvider.processMultilingual(content);
      }
    );
  }

  /**
   * Router for transcription tasks
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    return this.executeWithFallback(
      'openai',
      async () => {
        return await openAIProvider.transcribeWithWhisper(audioUri);
      },
      async () => {
        console.log('🔄 OpenAI transcription failed, falling back to Kimi mock');
        return await kimiProvider.transcribeAudio(audioUri);
      }
    );
  }

  /**
   * Router for embedding generation
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return await openAIProvider.generateEmbedding(text);
  }

  /**
   * Router for creative insight extraction
   */
  async generateInsight(memories: Memory[]): Promise<MemoryInsight> {
    return await openAIProvider.generateInsight(memories);
  }
}

class AIOrchestrator {
  private router = new SmartRouter();

  private providers: Record<AIProviderName, boolean> = {
    claude: true,
    kimi: true,
    openai: true,
    gemini: false,
  };

  getAllCapabilities() {
    return this.providers;
  }

  /**
   * Main router interface to process memory capturing
   */
  async processMemory(content: string, type: MemoryType): Promise<ProcessingResult> {
    return await this.router.processMemory(content, type);
  }

  /**
   * Route audio transcription, returning an object with 'text' property for memoryStore compatibility
   */
  async transcribeAudio(audioUri: string, _provider?: any): Promise<{ text: string }> {
    const text = await this.router.transcribeAudio(audioUri);
    return { text };
  }

  /**
   * Extract semantic context mapping variables directly to the keys expected in memoryStore
   */
  async extractContext(text: string, _useEnsemble = true): Promise<any> {
    const parsed = await this.router.processMemory(text, 'text');
    return {
      title: parsed.summary.slice(0, 30),
      summary: parsed.summary,
      tags: parsed.tags,
      people: [],
      places: [],
      dates: [],
      tasks: parsed.keyPoints,
      emotions: [],
      category: parsed.category,
      sentiment: parsed.sentiment,
      priority: parsed.importance,
      confidence: 0.9,
    };
  }

  /**
   * Translate a memory string
   */
  async translateMemory(text: string, targetLanguage: string): Promise<string> {
    return `[Translated to ${targetLanguage}]: ${text}`;
  }

  /**
   * Code analysis helper
   */
  async analyzeCode(_code: string): Promise<any> {
    return {
      language: 'typescript',
      purpose: 'utility',
    };
  }

  /**
   * Route embedding generation
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return await this.router.generateEmbedding(text);
  }

  /**
   * Generate proactive summaries and connection insights
   */
  async generateProactiveInsight(memories: Memory[]): Promise<MemoryInsight> {
    return await this.router.generateInsight(memories);
  }

  async generateProactiveInsightString(memories: any[]): Promise<string> {
    const insight = await this.router.generateInsight(memories);
    return insight.description;
  }

  async processQuery(query: string, _context: any): Promise<AIResponse> {
    try {
      const parsedResult = await this.router.processMemory(query, 'text');
      return {
        payload: `Analysis: Category is ${parsedResult.category}. Summary: ${parsedResult.summary}. Key Points: ${parsedResult.keyPoints.join(', ')}`,
        provider: 'claude',
      };
    } catch (e) {
      return {
        payload: `Processed: ${query}`,
        provider: 'claude',
      };
    }
  }
}

export const aiOrchestrator = new AIOrchestrator();
// Keep default or named exports in sync
export default aiOrchestrator;
