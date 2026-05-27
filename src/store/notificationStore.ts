// src/store/notificationStore.ts
import { create } from 'zustand';
import { notificationService } from '../services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationState {
  pushToken: string | null;
  permissionGranted: boolean;
  unreadCount: number;
  initialize: () => Promise<void>;
  markAllRead: () => Promise<void>;
  incrementUnread: () => void;
}

const UNREAD_COUNT_KEY = 'memorymesh_unread_notification_count';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  pushToken: null,
  permissionGranted: false,
  unreadCount: 0,

  initialize: async () => {
    try {
      const storedCount = await AsyncStorage.getItem(UNREAD_COUNT_KEY);
      const initialCount = storedCount ? parseInt(storedCount, 10) : 0;
      
      const token = await notificationService.initialize();
      
      set({
        pushToken: token,
        permissionGranted: !!token,
        unreadCount: initialCount,
      });
    } catch (e) {
      console.error('Failed to initialize notifications store:', e);
      set({ permissionGranted: false });
    }
  },

  markAllRead: async () => {
    try {
      await AsyncStorage.setItem(UNREAD_COUNT_KEY, '0');
      set({ unreadCount: 0 });
    } catch (e) {
      console.error('Failed to reset unread notifications:', e);
    }
  },

  incrementUnread: () => {
    const nextCount = get().unreadCount + 1;
    AsyncStorage.setItem(UNREAD_COUNT_KEY, nextCount.toString()).catch(console.error);
    set({ unreadCount: nextCount });
  },
}));
export default useNotificationStore;
