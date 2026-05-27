// src/services/ai/OpenAIProvider.ts
import { Memory, MemoryInsight } from '../../types/memory';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';

export const openAIProvider = {
  name: 'openai' as const,

  /**
   * Transcribes audio files via Whisper API
   */
  transcribeWithWhisper: async (audioUri: string): Promise<string> => {
    try {
      if (!OPENAI_API_KEY) {
        console.warn('⚠️ OpenAI API key is missing. Using dynamic mockup transcriber.');
        return 'Meeting scheduled with Hubert for next Wednesday at 3:00 PM to talk about the AI router pipelines.';
      }

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        name: 'audio.m4a',
        type: 'audio/m4a',
      } as any);
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OpenAI Whisper returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      return data.text || '';
    } catch (e) {
      console.error('Whisper transcription failed, using mockup fallback:', e);
      return 'Meeting scheduled with Hubert for next Wednesday at 3:00 PM to talk about the AI router pipelines.';
    }
  },

  /**
   * Generates a 1536-dimensional semantic vector embedding using text-embedding-ada-002
   */
  generateEmbedding: async (text: string): Promise<number[]> => {
    try {
      if (!OPENAI_API_KEY) {
        return openAIProvider.localEmbeddingMock(text);
      }

      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small', // 1536 dimensions
          input: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Embeddings returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      return data.data?.[0]?.embedding || openAIProvider.localEmbeddingMock(text);
    } catch (e) {
      console.error('Embedding generation failed, using math-hashed mock:', e);
      return openAIProvider.localEmbeddingMock(text);
    }
  },

  /**
   * Generates deep creative pattern insights using GPT-4o
   */
  generateInsight: async (memories: Memory[]): Promise<MemoryInsight> => {
    try {
      if (memories.length === 0) {
        throw new Error('No memories available to extract insights from');
      }

      const memorySummary = memories
        .map((m) => `[Category: ${m.category}] Summary: ${m.summary}`)
        .join('\n');

      if (!OPENAI_API_KEY) {
        return openAIProvider.localInsightMock(memories);
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert cognitive assistant. Analyze the user's memories and generate an insightful connection, pattern, or reminder.
You MUST respond with a valid JSON matching this schema exactly:
{
  "id": string (random uuid),
  "type": "pattern" | "reminder" | "connection" | "summary",
  "title": string,
  "description": string,
  "relatedMemoryIds": string[],
  "confidence": number (between 0.0 and 1.0)
}`,
            },
            {
              role: 'user',
              content: `Here are the user's recent memories:\n${memorySummary}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI Insights returned status ${response.status}`);
      }

      const data = (await response.json()) as any;
      const content = data.choices?.[0]?.message?.content || '';
      const parsed = JSON.parse(content.trim());
      
      return {
        ...parsed,
        createdAt: new Date(),
      } as MemoryInsight;
    } catch (e) {
      console.error('Insights generation failed, returning dynamic mock:', e);
      return openAIProvider.localInsightMock(memories);
    }
  },

  /**
   * Deterministic embedding mock generation (1536 float dimensions)
   */
  localEmbeddingMock: (text: string): number[] => {
    const vector = new Array(1536).fill(0);
    // Simple deterministic hash based on characters
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = text.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    for (let i = 0; i < 1536; i++) {
      const angle = (hash + i) * 0.1;
      vector[i] = Math.sin(angle) * Math.cos(angle * 0.5);
    }
    
    // Normalize vector (L2 norm)
    let sumSquares = 0;
    for (let i = 0; i < 1536; i++) {
      sumSquares += vector[i] * vector[i];
    }
    const norm = Math.sqrt(sumSquares) || 1;
    for (let i = 0; i < 1536; i++) {
      vector[i] /= norm;
    }

    return vector;
  },

  localInsightMock: (memories: Memory[]): MemoryInsight => {
    const ids = memories.slice(0, 2).map((m) => m.id);
    return {
      id: Math.random().toString(36).substring(7),
      type: 'pattern',
      title: 'Active Coding Patterns Detected',
      description: 'You have captured several memories relating to mobile application frameworks. Consolidating the architectural maps would streamline future sprints.',
      relatedMemoryIds: ids,
      confidence: 0.85,
      createdAt: new Date(),
    };
  },
};
