import { create } from 'zustand';
import { encryptionService } from '../services/encryption';
import { authService } from '../services/auth';

interface User {
    email: string;
    id: string;
    name?: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    initialize: () => Promise<void>;
    login: (email: string) => Promise<void>;
    logout: () => Promise<void>;
}

const USER_STORAGE_KEY = 'auth_user_session';

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true, // Start loading on mount to check persistence
    error: null,

    initialize: async () => {
        set({ isLoading: true });
        try {
            const storedUser = await encryptionService.getItem(USER_STORAGE_KEY);
            if (storedUser) {
                set({ user: JSON.parse(storedUser), isAuthenticated: true, isLoading: false });
            } else {
                set({ isAuthenticated: false, isLoading: false });
            }
        } catch (error) {
            console.error('Failed to restore session', error);
            set({ isAuthenticated: false, isLoading: false });
        }
    },

    login: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
            const user = await authService.login(email);

            await encryptionService.setItem(USER_STORAGE_KEY, JSON.stringify(user));
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (e: any) {
            set({ error: e.message || 'Login failed', isLoading: false });
        }
    },

    logout: async () => {
        set({ isLoading: true });
        try {
            await authService.logout();
            await encryptionService.deleteItem(USER_STORAGE_KEY);
            set({ user: null, isAuthenticated: false, isLoading: false });
        } catch (error) {
            console.error('Logout failed', error);
            set({ isLoading: false, error: 'Logout failed' });
        }
    },
}));
