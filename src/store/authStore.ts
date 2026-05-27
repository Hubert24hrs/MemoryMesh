// src/store/authStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { encryptionService } from '../services/encryption';
import { analyticsService } from '../services/analytics';
import * as LocalAuthentication from 'expo-local-authentication';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  session: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricEnabled: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  enableBiometric: (enabled: boolean) => Promise<void>;
  authenticateWithBiometric: () => Promise<boolean>;
}

const BIOMETRICS_PREF_KEY = 'memorymesh_biometrics_preference';

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  biometricEnabled: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      // Check current Supabase session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      // Check biometric preference
      const bioPref = await encryptionService.getItem(BIOMETRICS_PREF_KEY);
      const biometricEnabled = bioPref === 'true';

      if (session?.user) {
        const userObj: User = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
        };
        
        set({
          user: userObj,
          session,
          isAuthenticated: true,
          biometricEnabled,
          isLoading: false,
        });

        await analyticsService.identify(userObj.id, { email: userObj.email });
      } else {
        set({ user: null, session: null, isAuthenticated: false, biometricEnabled, isLoading: false });
      }
    } catch (e: any) {
      console.error('Failed to initialize session:', e);
      set({ error: e.message || 'Initialization failed', isLoading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.session && data?.user) {
        const userObj: User = {
          id: data.user.id,
          email: data.user.email || '',
          name: data.user.user_metadata?.name || '',
        };

        set({
          user: userObj,
          session: data.session,
          isAuthenticated: true,
          isLoading: false,
        });

        await analyticsService.identify(userObj.id, { email: userObj.email });
        await analyticsService.trackEvent('auth_login_success');
      }
    } catch (e: any) {
      set({ error: e.message || 'Login failed', isLoading: false });
      await analyticsService.trackEvent('auth_login_failed', { error: e.message });
    }
  },

  signUp: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        const userObj: User = {
          id: data.user.id,
          email: data.user.email || '',
        };

        set({
          user: userObj,
          session: data.session,
          isAuthenticated: !!data.session,
          isLoading: false,
        });

        await analyticsService.trackEvent('auth_signup_success');
      }
    } catch (e: any) {
      set({ error: e.message || 'Registration failed', isLoading: false });
      await analyticsService.trackEvent('auth_signup_failed', { error: e.message });
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      await analyticsService.trackEvent('auth_logout');
      await analyticsService.reset();
      set({ user: null, session: null, isAuthenticated: false, isLoading: false });
    } catch (e: any) {
      console.error('Logout failed:', e);
      set({ isLoading: false, error: e.message || 'Logout failed' });
    }
  },

  enableBiometric: async (enabled: boolean) => {
    try {
      await encryptionService.setItem(BIOMETRICS_PREF_KEY, enabled ? 'true' : 'false');
      set({ biometricEnabled: enabled });
    } catch (e) {
      console.error('Failed to set biometric preferences:', e);
    }
  },

  authenticateWithBiometric: async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock MemoryMesh',
        fallbackLabel: 'Enter Passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await analyticsService.trackEvent('biometric_auth_success');
        return true;
      }
      return false;
    } catch (e) {
      console.error('Biometric authentication crashed:', e);
      return false;
    }
  },
}));
