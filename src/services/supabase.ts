// src/services/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

// Initialize Supabase Client with AsyncStorage for persistent auth sessions
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const supabaseService = {
  /**
   * Helper to retrieve data from a table with typings
   */
  from: (table: 'memories' | 'users' | 'insights' | 'sync_queue') => {
    return supabase.from(table);
  },

  /**
   * Check connection status
   */
  checkConnection: async (): Promise<boolean> => {
    try {
      const { error } = await supabase.from('memories').select('id').limit(1);
      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase ping warning:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Supabase connection failed:', e);
      return false;
    }
  },

  /**
   * Realtime subscription helper
   */
  subscribeToTable: (
    table: 'memories' | 'insights',
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: any) => void
  ) => {
    const channel = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
