// src/services/ai/AIProvider.ts
/**
 * Multi-AI Provider Abstraction Layer
 * Supports: Claude AI (Anthropic), Kimi AI (Moonshot), OpenAI (GPT-4)
 */

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import OpenAI from 'openai';

export enum AIProvider {
  CLAUDE = 'claude',
  KIMI = 'kimi',
  OPENAI = 'openai',
}

export enum AICapability {
  TRANSCRIPTION = 'transcription',
  CONTEXT_EXTRACTION = 'context_extraction',
  SUMMARIZATION = 'summarization',
  SEARCH = 'search',
  TRANSLATION = 'translation',
  CODE_ANALYSIS = 'code_analysis',
  CREATIVE = 'creative',
  CONVERSATION = 'conversation',
}

interface AIProviderConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

interface TranscriptionResult {
  text: string;
  language: string;
  confidence: number;
  duration?: number;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
}

interface ContextExtractionResult {
  summary: string;
  title: string;
  tags: string[];
  people: string[];
  places: string[];
  dates: string[];
  tasks: string[];
  emotions: string[];
  priority: number;
  category: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
}

// ============================================================================
// CLAUDE AI PROVIDER (Anthropic)
// ============================================================================

class ClaudeAIProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  async extractContext(text: string): Promise<ContextExtractionResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2000,
      temperature: 0.3,
      system: `You are an expert memory analyst. Extract structured information from the user's memory.
      
Focus on:
- Nuanced emotional context
- Relationship dynamics
- Implicit meaning and subtext
- Cultural sensitivity
- Temporal relationships
- Actionable insights

Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence summary",
  "title": "5-7 word descriptive title",
  "tags": ["keyword1", "keyword2"],
  "people": ["Name1", "Name2"],
  "places": ["Location1"],
  "dates": ["relative or absolute dates"],
  "tasks": ["action items"],
  "emotions": ["primary emotion", "secondary emotion"],
  "priority": 0-5,
  "category": "work|personal|ideas|learning|health|finance|social",
  "sentiment": "positive|negative|neutral",
  "confidence": 0.0-1.0
}`,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Extract JSON from markdown code blocks if present
    let jsonText = content.text;
    const jsonMatch = jsonText.match(/```json\n([\s\S]+?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    return JSON.parse(jsonText);
  }

  async generateSummary(text: string, maxLength: number = 100): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxLength * 2,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: `Summarize this memory in ${maxLength} characters or less. Focus on key facts and emotional significance:\n\n${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text.trim();
  }

  async detectEmotion(text: string): Promise<string[]> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 200,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: `Analyze the emotional tone of this text. Return ONLY a JSON array of emotions in order of prominence: ${text}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return JSON.parse(content.text);
  }

  async conversationalQuery(query: string, memories: any[]): Promise<string> {
    const context = memories.map(m => m.summary || m.content).join('\n\n');

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      temperature: 0.7,
      system: `You are MemoryMesh, a helpful AI assistant that helps users recall and understand their memories. 
      Be conversational, empathetic, and insightful. Reference specific memories when relevant.`,
      messages: [
        {
          role: 'user',
          content: `Based on these memories:\n\n${context}\n\nUser asks: ${query}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text;
  }

  // Claude's strength: Ethical, nuanced, context-aware analysis
  getCapabilities(): AICapability[] {
    return [
      AICapability.CONTEXT_EXTRACTION,
      AICapability.SUMMARIZATION,
      AICapability.CONVERSATION,
      AICapability.CODE_ANALYSIS,
    ];
  }
}

// ============================================================================
// KIMI AI PROVIDER (Moonshot AI)
// ============================================================================

class KimiAIProvider {
  private apiKey: string;
  private baseURL: string;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL || 'https://api.moonshot.cn/v1';
    this.model = config.model || 'moonshot-v1-128k';
  }

  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    // Kimi excels at real-time, streaming transcription
    const response = await axios.post(
      `${this.baseURL}/audio/transcriptions`,
      {
        file: audioUrl,
        model: 'whisper-large-v3', // Kimi's enhanced Whisper
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
        language: 'auto', // Supports 100+ languages
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return {
      text: response.data.text,
      language: response.data.language,
      confidence: response.data.confidence || 0.95,
      duration: response.data.duration,
      segments: response.data.segments,
    };
  }

  async translateContext(text: string, targetLanguage: string): Promise<string> {
    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following text to ${targetLanguage}, preserving context and emotional nuance.`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  async analyzeCode(code: string): Promise<{
    language: string;
    purpose: string;
    tags: string[];
    documentation: string;
  }> {
    const response = await axios.post(
      `${this.baseURL}/chat/completions`,
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Analyze this code snippet. Return JSON with: language, purpose, tags[], documentation.`,
          },
          {
            role: 'user',
            content: code,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  }

  async semanticSearch(query: string, documents: string[]): Promise<number[]> {
    // Kimi's advanced semantic understanding
    const response = await axios.post(
      `${this.baseURL}/embeddings`,
      {
        model: 'kimi-embedding-v1',
        input: [query, ...documents],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const queryEmbedding = response.data.data[0].embedding;
    const docEmbeddings = response.data.data.slice(1).map((d: any) => d.embedding);

    // Calculate cosine similarity
    return docEmbeddings.map((docEmb: number[]) =>
      this.cosineSimilarity(queryEmbedding, docEmb)
    );
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Kimi's strength: Real-time processing, multi-lingual, code intelligence
  getCapabilities(): AICapability[] {
    return [
      AICapability.TRANSCRIPTION,
      AICapability.TRANSLATION,
      AICapability.CODE_ANALYSIS,
      AICapability.SEARCH,
      AICapability.CONTEXT_EXTRACTION,
    ];
  }
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: AIProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'gpt-4-turbo-preview';
  }

  async transcribe(audioUrl: string): Promise<TranscriptionResult> {
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();

    const transcription = await this.client.audio.transcriptions.create({
      file: audioBlob as any,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    return {
      text: transcription.text,
      language: transcription.language || 'en',
      confidence: 0.9,
      duration: (transcription as any).duration,
      segments: (transcription as any).segments,
    };
  }

  async extractContext(text: string): Promise<ContextExtractionResult> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `Extract structured information from this memory. Return JSON with: summary, title, tags, people, places, dates, tasks, emotions, priority (0-5), category, sentiment, confidence.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0].message.content || '{}');
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
      dimensions: 1536,
    });

    return {
      embedding: response.data[0].embedding,
      model: 'text-embedding-3-large',
      dimensions: 1536,
    };
  }

  async createMemoryStory(memories: any[]): Promise<string> {
    const memoryTexts = memories.map(m => m.summary || m.content).join('\n\n');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a creative writer. Transform these memories into a cohesive narrative. Make it engaging and personal.`,
        },
        {
          role: 'user',
          content: memoryTexts,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || '';
  }

  // OpenAI's strength: Broad knowledge, creative tasks, natural conversation
  getCapabilities(): AICapability[] {
    return [
      AICapability.TRANSCRIPTION,
      AICapability.CONTEXT_EXTRACTION,
      AICapability.CREATIVE,
      AICapability.CONVERSATION,
      AICapability.SUMMARIZATION,
    ];
  }
}

// ============================================================================
// AI ORCHESTRATOR - Smart Router & Result Fusion
// ============================================================================

export class AIOrchestrator {
  private claude: ClaudeAIProvider;
  private kimi: KimiAIProvider;
  private openai: OpenAIProvider;
  private preferredProvider: AIProvider;

  constructor(configs: {
    claude: AIProviderConfig;
    kimi: AIProviderConfig;
    openai: AIProviderConfig;
  }) {
    this.claude = new ClaudeAIProvider(configs.claude);
    this.kimi = new KimiAIProvider(configs.kimi);
    this.openai = new OpenAIProvider(configs.openai);
    this.preferredProvider = AIProvider.CLAUDE; // Default
  }

  /**
   * Smart routing: Choose best AI provider for the task
   */
  private selectProvider(capability: AICapability, userPreference?: AIProvider): AIProvider {
    if (userPreference) return userPreference;

    const capabilityMap: Record<AICapability, AIProvider> = {
      [AICapability.TRANSCRIPTION]: AIProvider.KIMI, // Best real-time
      [AICapability.CONTEXT_EXTRACTION]: AIProvider.CLAUDE, // Best nuance
      [AICapability.SUMMARIZATION]: AIProvider.CLAUDE, // Best conciseness
      [AICapability.SEARCH]: AIProvider.KIMI, // Best semantic
      [AICapability.TRANSLATION]: AIProvider.KIMI, // Best multi-lingual
      [AICapability.CODE_ANALYSIS]: AIProvider.KIMI, // Best code understanding
      [AICapability.CREATIVE]: AIProvider.OPENAI, // Best creativity
      [AICapability.CONVERSATION]: AIProvider.OPENAI, // Best natural language
    };

    return capabilityMap[capability] || this.preferredProvider;
  }

  /**
   * Transcribe audio using best provider
   */
  async transcribeAudio(audioUrl: string, provider?: AIProvider): Promise<TranscriptionResult> {
    const selectedProvider = provider || this.selectProvider(AICapability.TRANSCRIPTION);

    switch (selectedProvider) {
      case AIProvider.KIMI:
        return this.kimi.transcribe(audioUrl);
      case AIProvider.OPENAI:
        return this.openai.transcribe(audioUrl);
      default:
        return this.openai.transcribe(audioUrl); // Fallback
    }
  }

  /**
   * Extract context using ensemble approach (multiple AIs for better results)
   */
  async extractContext(
    text: string,
    useEnsemble: boolean = true
  ): Promise<ContextExtractionResult> {
    if (!useEnsemble) {
      return this.claude.extractContext(text);
    }

    // Use multiple AI providers and fuse results
    const [claudeResult, openaiResult] = await Promise.allSettled([
      this.claude.extractContext(text),
      this.openai.extractContext(text),
    ]);

    // Fusion strategy: Combine best parts from each
    const claudeData = claudeResult.status === 'fulfilled' ? claudeResult.value : null;
    const openaiData = openaiResult.status === 'fulfilled' ? openaiResult.value : null;

    if (!claudeData && !openaiData) {
      throw new Error('All AI providers failed to extract context');
    }

    return this.fuseContextResults(claudeData, openaiData);
  }

  /**
   * Fuse results from multiple AI providers
   */
  private fuseContextResults(
    claude: ContextExtractionResult | null,
    openai: ContextExtractionResult | null
  ): ContextExtractionResult {
    if (!claude) return openai!;
    if (!openai) return claude;

    // Combine unique tags
    const allTags = [...new Set([...claude.tags, ...openai.tags])];
    
    // Combine unique people
    const allPeople = [...new Set([...claude.people, ...openai.people])];
    
    // Combine unique places
    const allPlaces = [...new Set([...claude.places, ...openai.places])];
    
    // Use Claude's summary (better nuance) and OpenAI's title (more creative)
    return {
      summary: claude.summary,
      title: openai.title || claude.title,
      tags: allTags.slice(0, 10), // Limit to 10
      people: allPeople,
      places: allPlaces,
      dates: [...new Set([...claude.dates, ...openai.dates])],
      tasks: [...new Set([...claude.tasks, ...openai.tasks])],
      emotions: [...new Set([...claude.emotions, ...openai.emotions])],
      priority: Math.max(claude.priority, openai.priority),
      category: claude.category,
      sentiment: claude.sentiment,
      confidence: (claude.confidence + openai.confidence) / 2,
    };
  }

  /**
   * Generate embedding (use OpenAI by default)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.openai.generateEmbedding(text);
    return result.embedding;
  }

  /**
   * Conversational query (use Claude for depth or OpenAI for breadth)
   */
  async conversationalQuery(
    query: string,
    memories: any[],
    preferDepth: boolean = true
  ): Promise<string> {
    if (preferDepth) {
      return this.claude.conversationalQuery(query, memories);
    } else {
      // OpenAI for broader, more casual conversation
      const context = memories.map(m => m.summary || m.content).join('\n\n');
      const completion = await this.openai.client.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'You are MemoryMesh, a friendly AI that helps recall memories.',
          },
          {
            role: 'user',
            content: `Based on: ${context}\n\nUser: ${query}`,
          },
        ],
      });
      return completion.choices[0].message.content || '';
    }
  }

  /**
   * Translate memory to another language (use Kimi)
   */
  async translateMemory(text: string, targetLanguage: string): Promise<string> {
    return this.kimi.translateContext(text, targetLanguage);
  }

  /**
   * Analyze code snippet (use Kimi)
   */
  async analyzeCode(code: string) {
    return this.kimi.analyzeCode(code);
  }

  /**
   * Create memory story (use OpenAI for creativity)
   */
  async createMemoryStory(memories: any[]): Promise<string> {
    return this.openai.createMemoryStory(memories);
  }

  /**
   * Set preferred provider
   */
  setPreferredProvider(provider: AIProvider) {
    this.preferredProvider = provider;
  }

  /**
   * Get all capabilities across providers
   */
  getAllCapabilities(): Record<AIProvider, AICapability[]> {
    return {
      [AIProvider.CLAUDE]: this.claude.getCapabilities(),
      [AIProvider.KIMI]: this.kimi.getCapabilities(),
      [AIProvider.OPENAI]: this.openai.getCapabilities(),
    };
  }
}

// Export singleton instance
export const aiOrchestrator = new AIOrchestrator({
  claude: {
    apiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '',
  },
  kimi: {
    apiKey: process.env.EXPO_PUBLIC_KIMI_API_KEY || '',
  },
  openai: {
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  },
});
