// src/services/memory.ts
import { Memory, SearchFilters } from '../types/memory';
import { aiOrchestrator } from './ai/AIProvider';
import { encryptionService } from './encryption';
import { pineconeService } from './pinecone';
import { offlineSync } from './offlineSync';
import { analyticsService } from './analytics';
import { useAuthStore } from '../store/authStore';

// In-memory memory database for local persistence fallback
let inMemoryMemories: Memory[] = [];

export const memoryService = {
  /**
   * Fetch active memories list decrypted and filtered
   */
  fetchMemories: async ({ limit = 20, offset = 0, filters }: { limit?: number; offset?: number; filters?: SearchFilters }): Promise<Memory[]> => {
    const userId = useAuthStore.getState().user?.id || 'default_user';
    const active = inMemoryMemories.filter((m) => !m.isDeleted);
    
    // Apply filters if present
    let filtered = active;
    if (filters) {
      if (filters.category) {
        filtered = filtered.filter(m => m.category === filters.category);
      }
      if (filters.sentiment) {
        filtered = filtered.filter(m => m.sentiment === filters.sentiment);
      }
      if (filters.isArchived !== undefined) {
        filtered = filtered.filter(m => m.isArchived === filters.isArchived);
      }
      if (filters.isFavorite !== undefined) {
        filtered = filtered.filter(m => m.isFavorite === filters.isFavorite);
      }
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(m => filters.tags!.some(t => m.tags.includes(t)));
      }
    }

    const sliced = filtered.slice(offset, offset + limit);
    const decryptedList: Memory[] = [];

    for (const m of sliced) {
      try {
        const decrypted = await encryptionService.decrypt(m.content, userId);
        decryptedList.push({
          ...m,
          content: decrypted,
        });
      } catch (err) {
        // Fallback if decryption fails
        decryptedList.push({
          ...m,
          content: '[Decryption Failed]',
        });
      }
    }

    return decryptedList;
  },

  /**
   * Fetch a single memory by ID and decrypt it
   */
  fetchMemoryById: async (id: string): Promise<Memory | null> => {
    const userId = useAuthStore.getState().user?.id || 'default_user';
    const found = inMemoryMemories.find((m) => m.id === id && !m.isDeleted);
    if (!found) return null;

    try {
      const decrypted = await encryptionService.decrypt(found.content, userId);
      return {
        ...found,
        content: decrypted,
      };
    } catch (err) {
      return {
        ...found,
        content: '[Decryption Failed]',
      };
    }
  },

  /**
   * Complete memory creation pipeline called by memoryStore
   */
  createMemory: async (input: any): Promise<Memory> => {
    const userId = useAuthStore.getState().user?.id || 'default_user';
    console.log(`🧠 [Memory Service] Starting creation pipeline for user: ${userId}`);

    try {
      const encryptedContent = await encryptionService.encrypt(input.content, userId);
      
      const newMemory: Memory = {
        id: Math.random().toString(36).substring(7),
        userId,
        content: encryptedContent,
        contentEncrypted: encryptedContent,
        transcription: input.transcription || input.content,
        transcriptionLanguage: input.transcriptionLanguage || 'en',
        transcriptionConfidence: input.transcriptionConfidence || 0.95,
        
        // AI-generated metadata
        summary: input.aiSummary || input.summary || '',
        aiSummary: input.aiSummary || input.summary || '',
        title: input.aiTitle || input.title || 'Untitled',
        aiTitle: input.aiTitle || input.title || 'Untitled',
        aiProvider: input.aiProvider || 'ensemble',
        aiConfidence: input.aiConfidence || 0.9,
        importance: input.priority || input.importance || 5,
        priority: input.priority || input.importance || 5,
        emotionIntensity: input.emotionIntensity || 0.5,

        // Context extraction
        tags: input.contextTags || input.tags || [],
        contextTags: input.contextTags || input.tags || [],
        customTags: input.customTags || [],
        people: input.people || [],
        places: input.places || [],
        dates: input.dates || [],
        tasks: input.tasks || [],
        emotions: input.emotions || [],

        // Advanced AI analysis
        category: input.category || 'personal',
        sentiment: input.sentiment || 'neutral',

        // Code-specific
        codeLanguage: input.codeLanguage,
        codePurpose: input.codePurpose,

        // Media
        mediaType: input.mediaType || 'text',
        type: input.type || input.mediaType || 'text',
        audioUrl: input.audioUrl,
        audioDuration: input.audioDuration,
        imageUrl: input.imageUrl,
        imageUrls: input.imageUrls || (input.imageUrl ? [input.imageUrl] : []),

        // Location
        location: input.location,

        // Reminders
        reminderAt: input.reminderAt,
        reminderSent: false,

        // Organization
        isArchived: false,
        isFavorite: false,
        isPinned: false,

        // Metadata
        viewCount: 0,
        editCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: new Date(),
        isDeleted: false,
        isEncrypted: true,
      };

      // Store locally
      inMemoryMemories.unshift(newMemory);

      // Queue Supabase sync
      offlineSync.queueSyncAction('memories', 'create', newMemory.id, {
        ...newMemory,
        content: encryptedContent,
      });

      // Background Pinecone vector indexing
      if (input.embedding) {
        setTimeout(async () => {
          try {
            await pineconeService.upsertVector(newMemory.id, input.embedding, {
              userId,
              category: newMemory.category,
            });
            console.log(`🌲 [Memory Service] Vector index completed for memory: ${newMemory.id}`);
          } catch (e) {
            console.error('Vector indexing failed in background:', e);
          }
        }, 50);
      }

      // Log Analytics
      await analyticsService.trackEvent('memory_created', {
        mediaType: newMemory.mediaType,
        category: newMemory.category,
        aiProvider: newMemory.aiProvider,
      });

      return {
        ...newMemory,
        content: input.content, // Return decrypted version to active store
      };
    } catch (e) {
      console.error('Memory creation pipeline failed in service:', e);
      throw e;
    }
  },

  /**
   * Update memory record locally and sync remote update
   */
  updateMemory: async (id: string, updates: Partial<Memory>): Promise<void> => {
    const userId = useAuthStore.getState().user?.id || 'default_user';
    const index = inMemoryMemories.findIndex((m) => m.id === id);
    if (index === -1) {
      throw new Error(`Memory ID ${id} not found`);
    }

    const currentMemory = inMemoryMemories[index];
    let updatedContent = currentMemory.content;

    // Encrypt if content is changing
    if (updates.content) {
      updatedContent = await encryptionService.encrypt(updates.content, userId);
    }

    const updatedMemory: Memory = {
      ...currentMemory,
      ...updates,
      content: updatedContent,
      contentEncrypted: updatedContent,
      updatedAt: new Date(),
      editCount: currentMemory.editCount + 1,
    };

    inMemoryMemories[index] = updatedMemory;

    // Queue background remote sync
    offlineSync.queueSyncAction('memories', 'update', id, {
      ...updates,
      content: updatedContent,
      updated_at: new Date().toISOString(),
    });

    // Log Analytics
    await analyticsService.trackEvent('memory_updated', { id });
  },

  /**
   * Soft delete memory record locally and trigger remote cleanups
   */
  deleteMemory: async (id: string): Promise<void> => {
    const index = inMemoryMemories.findIndex((m) => m.id === id);
    if (index !== -1) {
      inMemoryMemories[index].isDeleted = true;
    }

    // Queue sync delete action
    offlineSync.queueSyncAction('memories', 'update', id, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
    });

    // Background Pinecone vector removal
    setTimeout(async () => {
      try {
        await pineconeService.deleteVector(id);
      } catch (e) {
        console.error('Vector deletion failed in background:', e);
      }
    }, 10);

    // Log Analytics
    await analyticsService.trackEvent('memory_deleted', { id });
  },

  /**
   * Perform pure semantic search via Pinecone
   */
  semanticSearch: async (embedding: number[]): Promise<Memory[]> => {
    const userId = useAuthStore.getState().user?.id || 'default_user';
    try {
      const pineconeMatches = await pineconeService.querySimilar(embedding, 10);
      const results: Memory[] = [];

      for (const match of pineconeMatches) {
        const found = inMemoryMemories.find((m) => m.id === match.id && !m.isDeleted);
        if (found) {
          try {
            const decrypted = await encryptionService.decrypt(found.content, userId);
            results.push({
              ...found,
              content: decrypted,
            });
          } catch (err) {
            results.push({
              ...found,
              content: '[Decryption Failed]',
            });
          }
        }
      }
      return results;
    } catch (e) {
      console.error('Semantic search failed:', e);
      return [];
    }
  },

  /**
   * Perform hybrid search: combining local keyword matches and Pinecone semantic matching
   */
  searchMemories: async (query: string, filters?: SearchFilters): Promise<Memory[]> => {
    const userId = useAuthStore.getState().user?.id || 'default_user';
    if (!query.trim()) return [];

    try {
      console.log(`🔎 [Memory] Executing hybrid search for: "${query}"`);

      // 1. Semantic search matches (Pinecone)
      const embedding = await aiOrchestrator.generateEmbedding(query);
      const semanticResults = await memoryService.semanticSearch(embedding);

      // 2. Local fallback keywords checks
      const keywordResults: Memory[] = [];
      for (const m of inMemoryMemories) {
        if (m.isDeleted) continue;

        try {
          const decrypted = await encryptionService.decrypt(m.content, userId);
          const matchesKeyword = decrypted.toLowerCase().includes(query.toLowerCase()) ||
            (m.summary && m.summary.toLowerCase().includes(query.toLowerCase())) ||
            m.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));

          if (matchesKeyword && !semanticResults.some((s) => s.id === m.id)) {
            keywordResults.push({
              ...m,
              content: decrypted,
            });
          }
        } catch (err) {
          // Skip if decryption fails
        }
      }

      const combined = [...semanticResults, ...keywordResults];
      
      // Apply filters if any
      let filtered = combined;
      if (filters) {
        if (filters.category) {
          filtered = filtered.filter(m => m.category === filters.category);
        }
        if (filters.sentiment) {
          filtered = filtered.filter(m => m.sentiment === filters.sentiment);
        }
      }

      // Log Analytics
      await analyticsService.trackEvent('memories_searched', { query });

      return filtered;
    } catch (e) {
      console.error('Hybrid search failed:', e);
      return [];
    }
  },

  /**
   * Retrieve active memories list decrypted
   */
  getMemories: async (userId: string): Promise<Memory[]> => {
    const active = inMemoryMemories.filter((m) => !m.isDeleted);
    const decryptedList: Memory[] = [];

    for (const m of active) {
      try {
        const decrypted = await encryptionService.decrypt(m.content, userId);
        decryptedList.push({
          ...m,
          content: decrypted,
        });
      } catch (err) {
        decryptedList.push({
          ...m,
          content: '[Decryption Failed]',
        });
      }
    }

    return decryptedList;
  },

  // Feed in memory list for test setups
  seedMemories: (seeded: Memory[]) => {
    inMemoryMemories = seeded;
  },
};

export default memoryService;
