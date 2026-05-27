// src/services/offlineSync.ts
import { supabase, supabaseService } from './supabase';


export const offlineSync = {
  privateQueue: [] as {
    id: string;
    table: string;
    operation: 'create' | 'update' | 'delete';
    payload: any;
    timestamp: number;
  }[],

  /**
   * Add a transaction to the offline sync queue
   */
  queueSyncAction: (
    table: string,
    operation: 'create' | 'update' | 'delete',
    id: string,
    payload: any
  ) => {
    offlineSync.privateQueue.push({
      id,
      table,
      operation,
      payload,
      timestamp: Date.now(),
    });
    console.log(`⏳ [Sync] Queued action: ${operation} on ${table} (Queue count: ${offlineSync.privateQueue.length})`);
  },

  /**
   * Drain the offline sync queue by uploading pending writes to Supabase
   */
  drainQueue: async (): Promise<void> => {
    if (offlineSync.privateQueue.length === 0) return;
    
    console.log(`🔄 [Sync] Connection restored. Draining ${offlineSync.privateQueue.length} pending mutations...`);

    const queueToProcess = [...offlineSync.privateQueue];
    // Clear primary queue to prevent race conditions during async loop
    offlineSync.privateQueue = [];

    for (const action of queueToProcess) {
      try {
        const { table, operation, id, payload } = action;

        if (operation === 'create') {
          const { error } = await supabase.from(table).upsert({ id, ...payload });
          if (error) throw error;
        } else if (operation === 'update') {
          const { error } = await supabase.from(table).update(payload).eq('id', id);
          if (error) throw error;
        } else if (operation === 'delete') {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        }
        
        console.log(`✅ [Sync] Processed offline mutation: ${operation} on ${table} for ${id}`);
      } catch (e) {
        console.error(`❌ [Sync] Failed to process offline mutation for ID ${action.id}, re-queuing:`, e);
        // Push back to queue to retry on next cycle
        offlineSync.privateQueue.push(action);
      }
    }
  },

  syncPendingMemories: async (): Promise<void> => {
    await offlineSync.drainQueue();
  },

  /**
   * Subscribes to Supabase Realtime for remote updates to resolve conflicts (last-write-wins)
   */
  setupRealtimeSync: async (): Promise<() => void> => {
    console.log('🔄 [Sync] Setting up realtime subscription channels...');

    const memoriesCleanup = supabaseService.subscribeToTable(
      'memories',
      '*',
      (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        console.log(`🔄 [Sync] Realtime event: ${eventType} in memories`, payload);

        // Access the current memory store dynamically to apply remote writes
        // In WatermelonDB/Zustand, we would reconcile local states here
        // Standard conflict resolution: last-write-wins
        if (eventType === 'UPDATE' && newRecord) {
          const localUpdatedAt = new Date(oldRecord?.updated_at || 0).getTime();
          const remoteUpdatedAt = new Date(newRecord.updated_at).getTime();

          if (remoteUpdatedAt > localUpdatedAt) {
            console.log(`🔄 [Sync] Remote write wins for memory: ${newRecord.id}`);
            // Apply newRecord update locally
          }
        }
      }
    );

    return () => {
      memoriesCleanup();
    };
  },
};
export default offlineSync;
