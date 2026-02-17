// src/store/memoryStore.ts
/**
 * Enhanced Memory Store with Multi-AI Provider Support
 * Manages memory CRUD, search, sync, and AI processing
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { aiOrchestrator, AIProvider } from '../services/ai/AIProvider';
import { memoryService } from '../services/memory';
import { offlineSync } from '../services/offlineSync';
import { analyticsService } from '../services/analytics';

// ============================================================================
// TYPES
// ============================================================================

export interface Memory {
  id: string;
  userId: string;
  contentEncrypted: string;
  transcription?: string;
  transcriptionLanguage?: string;
  transcriptionConfidence?: number;
  
  // AI-generated metadata
  aiSummary?: string;
  aiTitle?: string;
  aiProvider: AIProvider;
  aiConfidence: number;
  
  // Context extraction
  contextTags: string[];
  people: string[];
  places: string[];
  dates: string[];
  tasks: string[];
  emotions: string[];
  
  // Advanced AI analysis
  category?: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  priority: number;
  emotionIntensity?: number;
  
  // Code-specific
  codeLanguage?: string;
  codePurpose?: string;
  
  // Media
  mediaType: 'voice' | 'text' | 'image' | 'code';
  audioUrl?: string;
  audioDuration?: number;
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
  customTags: string[];
  
  // Metadata
  viewCount: number;
  editCount: number;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
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

// ============================================================================
// STORE STATE
// ============================================================================

interface MemoryState {
  // Data
  memories: Memory[];
  selectedMemory: Memory | null;
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  isSyncing: boolean;
  
  // Error handling
  error: string | null;
  
  // Pagination
  hasMore: boolean;
  page: number;
  perPage: number;
  
  // Search & Filters
  searchQuery: string;
  activeFilters: SearchFilters;
  searchResults: Memory[];
  
  // AI Processing
  processingProgress: number;
  aiProviderStats: Record<AIProvider, { requests: number; tokens: number; cost: number }>;
  
  // Offline queue
  pendingOperations: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    data: any;
    timestamp: Date;
  }>;
  
  // Usage limits (for free tier)
  monthlyCount: number;
  monthlyLimit: number;
  lastResetDate: Date;
}

// ============================================================================
// STORE ACTIONS
// ============================================================================

interface MemoryActions {
  // CRUD Operations
  fetchMemories: (reset?: boolean) => Promise<void>;
  fetchMemoryById: (id: string) => Promise<Memory | null>;
  createMemory: (input: MemoryInput) => Promise<Memory>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  
  // Batch operations
  deleteMultiple: (ids: string[]) => Promise<void>;
  archiveMultiple: (ids: string[]) => Promise<void>;
  
  // Search & Filter
  searchMemories: (query: string, filters?: SearchFilters) => Promise<void>;
  searchSemantic: (query: string) => Promise<Memory[]>;
  setFilters: (filters: SearchFilters) => void;
  clearFilters: () => void;
  
  // AI Processing
  transcribeAudio: (audioUrl: string, provider?: AIProvider) => Promise<string>;
  extractContext: (text: string, useEnsemble?: boolean) => Promise<any>;
  generateEmbedding: (text: string) => Promise<number[]>;
  translateMemory: (id: string, targetLanguage: string) => Promise<string>;
  analyzeCode: (code: string) => Promise<any>;
  
  // Organization
  toggleArchive: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  addCustomTag: (id: string, tag: string) => Promise<void>;
  removeCustomTag: (id: string, tag: string) => Promise<void>;
  setColorTag: (id: string, color: string) => Promise<void>;
  
  // Selection
  setSelectedMemory: (memory: Memory | null) => void;
  
  // Sync
  syncOfflineChanges: () => Promise<void>;
  clearSyncQueue: () => void;
  
  // Usage tracking
  canCreateMemory: () => boolean;
  incrementMonthlyCount: () => void;
  resetMonthlyCount: () => void;
  
  // Utilities
  clearError: () => void;
  reset: () => void;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: MemoryState = {
  memories: [],
  selectedMemory: null,
  isLoading: false,
  isProcessing: false,
  isSyncing: false,
  error: null,
  hasMore: true,
  page: 0,
  perPage: 20,
  searchQuery: '',
  activeFilters: {},
  searchResults: [],
  processingProgress: 0,
  aiProviderStats: {
    claude: { requests: 0, tokens: 0, cost: 0 },
    kimi: { requests: 0, tokens: 0, cost: 0 },
    openai: { requests: 0, tokens: 0, cost: 0 },
    ensemble: { requests: 0, tokens: 0, cost: 0 },
  },
  pendingOperations: [],
  monthlyCount: 0,
  monthlyLimit: 50,
  lastResetDate: new Date(),
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useMemoryStore = create<MemoryState & MemoryActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // ======================================================================
      // CRUD Operations
      // ======================================================================

      fetchMemories: async (reset = false) => {
        const { page, perPage, activeFilters, isLoading } = get();
        
        if (isLoading) return;
        
        set({ isLoading: true, error: null });

        try {
          const currentPage = reset ? 0 : page;
          
          const fetchedMemories = await memoryService.fetchMemories({
            limit: perPage,
            offset: currentPage * perPage,
            filters: activeFilters,
          });

          set((state) => {
            state.memories = reset 
              ? fetchedMemories 
              : [...state.memories, ...fetchedMemories];
            state.page = currentPage + 1;
            state.hasMore = fetchedMemories.length === perPage;
            state.isLoading = false;
          });

          analyticsService.trackEvent('memories_fetched', {
            count: fetchedMemories.length,
            reset,
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          console.error('Failed to fetch memories:', error);
        }
      },

      fetchMemoryById: async (id: string) => {
        try {
          const memory = await memoryService.fetchMemoryById(id);
          return memory;
        } catch (error: any) {
          set({ error: error.message });
          return null;
        }
      },

      createMemory: async (input: MemoryInput) => {
        set({ isProcessing: true, processingProgress: 0, error: null });

        try {
          // Check usage limits
          if (!get().canCreateMemory()) {
            throw new Error('Monthly memory limit reached. Please upgrade to Pro.');
          }

          // Step 1: Transcribe audio if voice input (10%)
          let transcription = input.transcription || input.content;
          if (input.mediaType === 'voice' && input.audioUrl) {
            set({ processingProgress: 10 });
            transcription = await aiOrchestrator.transcribeAudio(
              input.audioUrl,
              input.aiProvider
            );
          }

          // Step 2: Extract context with AI (40%)
          set({ processingProgress: 40 });
          const context = await aiOrchestrator.extractContext(
            transcription,
            input.useEnsemble ?? true
          );

          // Step 3: Generate embedding (60%)
          set({ processingProgress: 60 });
          const embedding = await aiOrchestrator.generateEmbedding(transcription);

          // Step 4: Create memory in database (80%)
          set({ processingProgress: 80 });
          const memory = await memoryService.createMemory({
            ...input,
            transcription,
            aiSummary: context.summary,
            aiTitle: context.title,
            contextTags: context.tags,
            people: context.people,
            places: context.places,
            dates: context.dates,
            tasks: context.tasks,
            emotions: context.emotions,
            category: context.category,
            sentiment: context.sentiment,
            priority: context.priority,
            aiProvider: input.aiProvider || 'ensemble',
            aiConfidence: context.confidence,
            embedding,
          });

          // Step 5: Update local state (100%)
          set((state) => {
            state.memories.unshift(memory);
            state.monthlyCount += 1;
            state.processingProgress = 100;
            state.isProcessing = false;
          });

          // Track analytics
          analyticsService.trackEvent('memory_created', {
            mediaType: input.mediaType,
            aiProvider: input.aiProvider || 'ensemble',
            hasLocation: !!input.location,
            hasReminder: !!input.reminderAt,
          });

          return memory;
        } catch (error: any) {
          set({ 
            error: error.message, 
            isProcessing: false,
            processingProgress: 0,
          });
          
          // Queue for offline sync if network error
          if (error.message.includes('network') || error.message.includes('offline')) {
            set((state) => {
              state.pendingOperations.push({
                id: crypto.randomUUID(),
                type: 'create',
                data: input,
                timestamp: new Date(),
              });
            });
          }
          
          throw error;
        }
      },

      updateMemory: async (id: string, updates: Partial<Memory>) => {
        set({ isLoading: true, error: null });

        try {
          await memoryService.updateMemory(id, updates);

          set((state) => {
            const index = state.memories.findIndex(m => m.id === id);
            if (index !== -1) {
              state.memories[index] = { ...state.memories[index], ...updates };
            }
            state.isLoading = false;
          });

          analyticsService.trackEvent('memory_updated', { memoryId: id });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          
          // Queue for offline sync
          set((state) => {
            state.pendingOperations.push({
              id: crypto.randomUUID(),
              type: 'update',
              data: { id, updates },
              timestamp: new Date(),
            });
          });
        }
      },

      deleteMemory: async (id: string) => {
        set({ isLoading: true, error: null });

        try {
          await memoryService.deleteMemory(id);

          set((state) => {
            state.memories = state.memories.filter(m => m.id !== id);
            if (state.selectedMemory?.id === id) {
              state.selectedMemory = null;
            }
            state.isLoading = false;
          });

          analyticsService.trackEvent('memory_deleted', { memoryId: id });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          
          // Queue for offline sync
          set((state) => {
            state.pendingOperations.push({
              id: crypto.randomUUID(),
              type: 'delete',
              data: { id },
              timestamp: new Date(),
            });
          });
        }
      },

      // ======================================================================
      // Batch Operations
      // ======================================================================

      deleteMultiple: async (ids: string[]) => {
        set({ isLoading: true, error: null });

        try {
          await Promise.all(ids.map(id => memoryService.deleteMemory(id)));

          set((state) => {
            state.memories = state.memories.filter(m => !ids.includes(m.id));
            state.isLoading = false;
          });

          analyticsService.trackEvent('memories_deleted_batch', { count: ids.length });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      archiveMultiple: async (ids: string[]) => {
        set({ isLoading: true, error: null });

        try {
          await Promise.all(
            ids.map(id => memoryService.updateMemory(id, { isArchived: true }))
          );

          set((state) => {
            state.memories = state.memories.map(m =>
              ids.includes(m.id) ? { ...m, isArchived: true } : m
            );
            state.isLoading = false;
          });

          analyticsService.trackEvent('memories_archived_batch', { count: ids.length });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      // ======================================================================
      // Search & Filter
      // ======================================================================

      searchMemories: async (query: string, filters?: SearchFilters) => {
        set({ isLoading: true, searchQuery: query, error: null });

        try {
          const results = await memoryService.searchMemories(query, filters);

          set({
            searchResults: results,
            isLoading: false,
          });

          analyticsService.trackEvent('memories_searched', {
            query,
            resultCount: results.length,
          });
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
        }
      },

      searchSemantic: async (query: string) => {
        set({ isLoading: true, error: null });

        try {
          // Generate embedding for query
          const queryEmbedding = await aiOrchestrator.generateEmbedding(query);

          // Search Pinecone
          const results = await memoryService.semanticSearch(queryEmbedding);

          set({ searchResults: results, isLoading: false });

          analyticsService.trackEvent('semantic_search', {
            query,
            resultCount: results.length,
          });

          return results;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return [];
        }
      },

      setFilters: (filters: SearchFilters) => {
        set({ activeFilters: filters });
      },

      clearFilters: () => {
        set({ activeFilters: {}, searchQuery: '', searchResults: [] });
      },

      // ======================================================================
      // AI Processing
      // ======================================================================

      transcribeAudio: async (audioUrl: string, provider?: AIProvider) => {
        const result = await aiOrchestrator.transcribeAudio(audioUrl, provider);
        return result.text;
      },

      extractContext: async (text: string, useEnsemble = true) => {
        return await aiOrchestrator.extractContext(text, useEnsemble);
      },

      generateEmbedding: async (text: string) => {
        return await aiOrchestrator.generateEmbedding(text);
      },

      translateMemory: async (id: string, targetLanguage: string) => {
        const memory = get().memories.find(m => m.id === id);
        if (!memory) throw new Error('Memory not found');

        const translated = await aiOrchestrator.translateMemory(
          memory.transcription || memory.aiSummary || '',
          targetLanguage
        );

        return translated;
      },

      analyzeCode: async (code: string) => {
        return await aiOrchestrator.analyzeCode(code);
      },

      // ======================================================================
      // Organization
      // ======================================================================

      toggleArchive: async (id: string) => {
        const memory = get().memories.find(m => m.id === id);
        if (memory) {
          await get().updateMemory(id, { isArchived: !memory.isArchived });
        }
      },

      toggleFavorite: async (id: string) => {
        const memory = get().memories.find(m => m.id === id);
        if (memory) {
          await get().updateMemory(id, { isFavorite: !memory.isFavorite });
        }
      },

      togglePin: async (id: string) => {
        const memory = get().memories.find(m => m.id === id);
        if (memory) {
          await get().updateMemory(id, { isPinned: !memory.isPinned });
        }
      },

      addCustomTag: async (id: string, tag: string) => {
        const memory = get().memories.find(m => m.id === id);
        if (memory) {
          const customTags = [...new Set([...memory.customTags, tag])];
          await get().updateMemory(id, { customTags });
        }
      },

      removeCustomTag: async (id: string, tag: string) => {
        const memory = get().memories.find(m => m.id === id);
        if (memory) {
          const customTags = memory.customTags.filter(t => t !== tag);
          await get().updateMemory(id, { customTags });
        }
      },

      setColorTag: async (id: string, color: string) => {
        await get().updateMemory(id, { colorTag: color });
      },

      // ======================================================================
      // Selection
      // ======================================================================

      setSelectedMemory: (memory: Memory | null) => {
        set({ selectedMemory: memory });
      },

      // ======================================================================
      // Sync
      // ======================================================================

      syncOfflineChanges: async () => {
        const { pendingOperations } = get();
        
        if (pendingOperations.length === 0) return;

        set({ isSyncing: true });

        try {
          await offlineSync.syncPendingMemories();
          set({ pendingOperations: [], isSyncing: false });
        } catch (error: any) {
          set({ error: error.message, isSyncing: false });
        }
      },

      clearSyncQueue: () => {
        set({ pendingOperations: [] });
      },

      // ======================================================================
      // Usage Tracking
      // ======================================================================

      canCreateMemory: () => {
        const { monthlyCount, monthlyLimit } = get();
        // TODO: Check subscription tier from auth store
        return monthlyCount < monthlyLimit;
      },

      incrementMonthlyCount: () => {
        set((state) => {
          state.monthlyCount += 1;
        });
      },

      resetMonthlyCount: () => {
        set({
          monthlyCount: 0,
          lastResetDate: new Date(),
        });
      },

      // ======================================================================
      // Utilities
      // ======================================================================

      clearError: () => {
        set({ error: null });
      },

      reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'memory-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        monthlyCount: state.monthlyCount,
        lastResetDate: state.lastResetDate,
        pendingOperations: state.pendingOperations,
      }),
    }
  )
);
