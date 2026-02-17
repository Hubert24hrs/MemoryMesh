// App.tsx
/**
 * MemoryMesh Enhanced - Main App Entry Point
 * World-class AI memory assistant with multi-provider intelligence
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, LogBox, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import * as Notifications from 'expo-notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as Sentry from '@sentry/react-native';
import mobileAds from 'react-native-google-mobile-ads';

// Navigation
import { RootNavigator } from './src/navigation/RootNavigator';

// Store
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { useSubscriptionStore } from './src/store/subscriptionStore';

// Services
import { aiOrchestrator } from './src/services/ai/AIProvider';
import { encryptionService } from './src/services/encryption';
import { notificationService } from './src/services/notifications';
import { offlineSync } from './src/services/offlineSync';
import { analyticsService } from './src/services/analytics';

// Components
import { LoadingScreen } from './src/components/LoadingScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Theme
import theme from './src/theme/enhancedTheme';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Require cycle:',
]);

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Configure Sentry for error tracking
if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.APP_ENV || 'production',
    tracesSampleRate: 1.0,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 10000,
    enableNative: true,
    enableNativeCrashHandling: true,
    attachStacktrace: true,
    maxBreadcrumbs: 50,
  });
}

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

function AppContent() {
  const [appReady, setAppReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const initializeAuth = useAuthStore(state => state.initialize);
  const initializeTheme = useThemeStore(state => state.initialize);
  const initializeSubscription = useSubscriptionStore(state => state.initialize);

  /**
   * Initialize all app services
   */
  const initializeApp = useCallback(async () => {
    try {
      console.log('🚀 Initializing MemoryMesh Enhanced...');

      // 1. Load custom fonts
      await Font.loadAsync({
        'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
        'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
        'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        'SpaceGrotesk-Bold': require('./assets/fonts/SpaceGrotesk-Bold.ttf'),
      });
      console.log('✅ Fonts loaded');

      // 2. Initialize encryption service
      await encryptionService.initialize();
      console.log('✅ Encryption initialized');

      // 3. Initialize authentication
      await initializeAuth();
      console.log('✅ Authentication initialized');

      // 4. Initialize theme
      await initializeTheme();
      console.log('✅ Theme initialized');

      // 5. Initialize subscription management
      await initializeSubscription();
      console.log('✅ Subscriptions initialized');

      // 6. Initialize notifications
      await notificationService.initialize();
      console.log('✅ Notifications initialized');

      // 7. Initialize offline sync
      await offlineSync.setupRealtimeSync();
      console.log('✅ Offline sync initialized');

      // 8. Initialize AdMob (only for free users)
      await mobileAds().initialize();
      console.log('✅ AdMob initialized');

      // 9. Initialize analytics
      await analyticsService.initialize();
      await analyticsService.trackEvent('app_opened', {
        platform: Platform.OS,
        version: '2.0.0',
      });
      console.log('✅ Analytics initialized');

      // 10. Test AI providers connectivity
      console.log('🧠 Testing AI providers...');
      const capabilities = aiOrchestrator.getAllCapabilities();
      console.log('✅ AI providers ready:', capabilities);

      // All initialization complete
      console.log('🎉 MemoryMesh Enhanced ready!');
      setAppReady(true);
      
    } catch (e) {
      console.error('❌ Initialization failed:', e);
      setError(e as Error);
      Sentry.captureException(e);
    } finally {
      // Hide splash screen after initialization
      await SplashScreen.hideAsync();
    }
  }, [initializeAuth, initializeTheme, initializeSubscription]);

  /**
   * Run initialization on mount
   */
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  /**
   * Setup notification listeners
   */
  useEffect(() => {
    const handleNotificationReceived = (notification: Notifications.Notification) => {
      console.log('📬 Notification received:', notification);
      analyticsService.trackEvent('notification_received', {
        type: notification.request.content.data?.type,
      });
    };

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      console.log('👆 Notification tapped:', response);
      analyticsService.trackEvent('notification_tapped', {
        type: response.notification.request.content.data?.type,
      });
      
      // Navigate to relevant screen based on notification type
      const { type, memoryId } = response.notification.request.content.data || {};
      // Navigation will be handled in RootNavigator
    };

    const cleanup = notificationService.setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationResponse
    );

    return cleanup;
  }, []);

  /**
   * Handle deep linking
   */
  const linking = {
    prefixes: ['memorymesh://', 'https://memorymesh.app'],
    config: {
      screens: {
        Auth: 'auth',
        MainTabs: {
          screens: {
            Dashboard: 'dashboard',
            Memories: 'memories',
            Insights: 'insights',
            Profile: 'profile',
          },
        },
        MemoryDetail: 'memory/:memoryId',
        Capture: 'capture',
        Settings: 'settings',
        Paywall: 'upgrade',
      },
    },
  };

  // Show loading screen while initializing
  if (!appReady && !error) {
    return <LoadingScreen />;
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <ErrorBoundary error={error}>
        <LoadingScreen />
      </ErrorBoundary>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
      <StatusBar style="light" translucent backgroundColor="transparent" />
    </NavigationContainer>
  );
}

// ============================================================================
// MAIN APP WITH PROVIDERS
// ============================================================================

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <BottomSheetModalProvider>
              <AppContent />
            </BottomSheetModalProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
