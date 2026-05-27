// src/types/memory.ts

export type MemoryType = 'voice' | 'text' | 'image' | 'code' | 'mixed';
export type MemoryCategory = 'personal' | 'work' | 'idea' | 'task' | 'learning' | 'social' | 'health' | 'finance';
export type AIProvider = 'claude' | 'kimi' | 'openai' | 'ensemble';

export interface Memory {
  id: string;
  userId: string;
  content: string;
  contentEncrypted?: string;
  transcription?: string;
  transcriptionLanguage?: string;
  transcriptionConfidence?: number;
  
  // AI-generated metadata
  summary: string;
  aiSummary?: string;
  title?: string;
  aiTitle?: string;
  aiProvider: AIProvider;
  aiConfidence: number;
  importance: number; // 1-10
  priority?: number;
  emotionIntensity?: number;
  
  // Context extraction
  tags: string[];
  contextTags: string[];
  customTags: string[];
  people: string[];
  places: string[];
  dates: string[];
  tasks: string[];
  keyPoints?: string[];
  emotions: string[];
  
  // Advanced AI analysis
  category: MemoryCategory;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  
  // Code-specific
  codeLanguage?: string;
  codePurpose?: string;
  
  // Media
  mediaType: 'voice' | 'text' | 'image' | 'code';
  type?: MemoryType;
  audioUrl?: string;
  audioDuration?: number;
  imageUrl?: string;
  imageUrls?: string[];
  
  // Location
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    name?: string;
  };
  
  // Reminders
  reminderAt?: Date;
  reminderSent: boolean;
  
  // Organization
  isArchived: boolean;
  isFavorite: boolean;
  isPinned: boolean;
  colorTag?: string;
  
  // Metadata
  viewCount: number;
  editCount: number;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
  syncedAt?: Date;
  isDeleted: boolean;
  isEncrypted: boolean;
}

export interface MemoryInput {
  content: string;
  transcription?: string;
  mediaType: Memory['mediaType'];
  audioUrl?: string;
  imageUrls?: string[];
  location?: Memory['location'];
  reminderAt?: Date;
  customTags?: string[];
  aiProvider?: AIProvider;
  useEnsemble?: boolean;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  sentiment?: Memory['sentiment'];
  priority?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  people?: string[];
  places?: string[];
  isArchived?: boolean;
  isFavorite?: boolean;
}

export interface MemoryInsight {
  id: string;
  type: 'pattern' | 'reminder' | 'connection' | 'summary';
  title: string;
  description: string;
  relatedMemoryIds: string[];
  confidence: number;
  createdAt: Date;
}

export interface MemorySearchResult {
  memory: Memory;
  score: number;
  highlights: string[];
}
