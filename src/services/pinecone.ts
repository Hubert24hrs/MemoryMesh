// src/services/pinecone.ts

const PINECONE_API_KEY = process.env.EXPO_PUBLIC_PINECONE_API_KEY || '';
const PINECONE_INDEX_URL = process.env.EXPO_PUBLIC_PINECONE_INDEX_URL || ''; // Format: https://your-index-name.svc.us-west2-gcp.pinecone.io

// Local in-memory mock vector store to allow standard functionality without keys
class LocalVectorStore {
  private vectors: Map<string, { vector: number[]; metadata: any }> = new Map();

  upsert(id: string, vector: number[], metadata: any) {
    this.vectors.set(id, { vector, metadata });
  }

  delete(id: string) {
    this.vectors.delete(id);
  }

  query(queryVector: number[], topK: number): { id: string; score: number }[] {
    const results: { id: string; score: number }[] = [];
    
    this.vectors.forEach((val, key) => {
      // Calculate Cosine Similarity
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < queryVector.length; i++) {
        dotProduct += queryVector[i] * val.vector[i];
        normA += queryVector[i] * queryVector[i];
        normB += val.vector[i] * val.vector[i];
      }
      const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
      results.push({ id: key, score: similarity });
    });

    // Sort by descending score
    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

const localVectors = new LocalVectorStore();

export const pineconeService = {
  /**
   * Upsert a memory vector embedding with metadata into Pinecone
   */
  upsertVector: async (id: string, vector: number[], metadata: Record<string, any>): Promise<void> => {
    // Keep local in-memory store updated for immediate hybrid/mock fallback queries
    localVectors.upsert(id, vector, metadata);

    if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) {
      console.log('🌲 [Pinecone] Saved to local offline mock vector storage');
      return;
    }

    try {
      const response = await fetch(`${PINECONE_INDEX_URL}/vectors/upsert`, {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vectors: [
            {
              id,
              values: vector,
              metadata,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinecone upsert failed with status ${response.status}`);
      }
      console.log(`🌲 [Pinecone] Vector upsert successful for: ${id}`);
    } catch (e) {
      console.error('Pinecone upsert failed:', e);
    }
  },

  /**
   * Search for similar vectors (semantic search)
   */
  querySimilar: async (vector: number[], topK: number = 10): Promise<{ id: string; score: number }[]> => {
    if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) {
      console.log('🌲 [Pinecone] Executing offline mock vector lookup');
      return localVectors.query(vector, topK);
    }

    try {
      const response = await fetch(`${PINECONE_INDEX_URL}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector,
          topK,
          includeMetadata: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinecone query failed with status ${response.status}`);
      }

      const data = (await response.json()) as any;
      return (data.matches || []).map((match: any) => ({
        id: match.id,
        score: match.score,
      }));
    } catch (e) {
      console.error('Pinecone query failed, falling back to offline matching:', e);
      return localVectors.query(vector, topK);
    }
  },

  /**
   * Delete a vector from Pinecone index
   */
  deleteVector: async (id: string): Promise<void> => {
    localVectors.delete(id);

    if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) {
      console.log('🌲 [Pinecone] Deleted vector from offline storage');
      return;
    }

    try {
      const response = await fetch(`${PINECONE_INDEX_URL}/vectors/delete`, {
        method: 'POST',
        headers: {
          'Api-Key': PINECONE_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ids: [id],
        }),
      });

      if (!response.ok) {
        throw new Error(`Pinecone delete failed with status ${response.status}`);
      }
      console.log(`🌲 [Pinecone] Deleted vector for: ${id}`);
    } catch (e) {
      console.error('Pinecone delete failed:', e);
    }
  },
};
export default pineconeService;
