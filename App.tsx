import './src/i18n';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { addNetworkStateListener } from 'expo-network';
import { ShareIntentProvider } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LockGate } from './src/components/LockGate';
import { ShareHandler } from './src/components/ShareHandler';
import { initDatabase } from './src/db/database';
import { queryClient } from './src/lib/useDb';
import { navigationRef } from './src/navigation/ref';
import { RootNavigator } from './src/navigation/RootNavigator';
import { onSignedIn } from './src/services/account';
import { kickWorker } from './src/services/jobs';
import { startBackgroundWork } from './src/services/organizer';
import { initPurchases } from './src/services/purchases';
import { initSession } from './src/store/session';
import { font, useTheme } from './src/theme/theme';

void SplashScreen.preventAutoHideAsync();

const WORKER_INTERVAL_MS = 60_000;

export default function App() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [ready, setReady] = useState(false);
  const { dark, c } = useTheme();

  useEffect(() => {
    void (async () => {
      try {
        await initDatabase();
        startBackgroundWork();
        initPurchases();
        await initSession((userId) => void onSignedIn(userId));
      } finally {
        setReady(true);
        kickWorker(0);
      }
    })();

    // Drain queued AI/sync jobs when connectivity returns, on foreground, and periodically.
    const net = addNetworkStateListener((state) => {
      if (state.isConnected) kickWorker(500);
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') kickWorker(0);
    });
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') kickWorker(0);
    }, WORKER_INTERVAL_MS);
    return () => {
      net.remove();
      appState.remove();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && ready) void SplashScreen.hideAsync();
  }, [fontsLoaded, ready]);

  const navTheme: NavTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, primary: c.accentText, background: c.bg, card: c.bg, text: c.text, border: c.border },
      fonts: {
        regular: { fontFamily: font.regular, fontWeight: '400' },
        medium: { fontFamily: font.medium, fontWeight: '500' },
        bold: { fontFamily: font.semibold, fontWeight: '600' },
        heavy: { fontFamily: font.bold, fontWeight: '700' },
      },
    };
  }, [dark, c]);

  if (!fontsLoaded || !ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ShareIntentProvider>
          <NavigationContainer ref={navigationRef} theme={navTheme}>
            <LockGate>
              <RootNavigator />
            </LockGate>
            <ShareHandler />
          </NavigationContainer>
          <StatusBar style={dark ? 'light' : 'dark'} />
        </ShareIntentProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
