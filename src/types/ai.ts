// src/types/ai.ts
import { MemoryCategory } from './memory';

export type AIProvider = 'claude' | 'kimi' | 'openai';

export type AICapability = 'transcription' | 'extraction' | 'embeddings' | 'insights' | 'multilingual';

export interface AIRequest {
  provider: AIProvider;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface AIResponse {
  provider: AIProvider;
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProcessingResult {
  category: MemoryCategory;
  tags: string[];
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  importance: number; // 1-10
  causalConnections?: string[];
}
