// src/services/notifications.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Memory } from '../types/memory';
import { supabase } from './supabase';

export const notificationService = {
  /**
   * Request device push permissions and register the token with Supabase
   */
  initialize: async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00F5FF',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('⚠️ Push notification permissions denied');
        return null;
      }

      // Generate device token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'memorymesh-project',
      });
      const token = tokenData.data;
      console.log('📬 Registered Device Expo Push Token:', token);

      // Save token to Supabase if authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('users')
          .update({ push_token: token })
          .eq('id', session.user.id);
      }

      return token;
    } catch (e) {
      console.error('Failed to initialize push notifications:', e);
      return null;
    }
  },

  /**
   * Schedules a proactive memory recall reminder
   */
  scheduleProactiveReminder: async (memory: Memory, fireAt: Date): Promise<void> => {
    try {
      const timeDiff = fireAt.getTime() - Date.now();
      if (timeDiff <= 0) return;

      const triggerSeconds = Math.max(1, Math.floor(timeDiff / 1000));

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🧠 Memory Recall: ${memory.category.toUpperCase()}`,
          body: memory.summary || 'Tap to review this connection in your MemoryMesh.',
          data: { type: 'memory_recall', memoryId: memory.id },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          seconds: triggerSeconds,
        } as any,
      });

      console.log(`📬 Scheduled reminder for memory: ${memory.id} in ${triggerSeconds}s`);
    } catch (e) {
      console.error('Failed to schedule local notification:', e);
    }
  },

  /**
   * Hook up dynamic listeners to handle incoming/tapped alerts
   */
  setupNotificationListeners: (
    onReceive: (notification: Notifications.Notification) => void,
    onResponse: (response: Notifications.NotificationResponse) => void
  ) => {
    const receiveSubscription = Notifications.addNotificationReceivedListener(onReceive);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onResponse);

    return () => {
      receiveSubscription.remove();
      responseSubscription.remove();
    };
  },

  /**
   * Cancels all scheduled local reminders
   */
  cancelAllScheduled: async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('📬 Cancelled all scheduled local reminders');
  },
};
export default notificationService;
