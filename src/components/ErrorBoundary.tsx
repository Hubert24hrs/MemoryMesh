// src/components/ErrorBoundary.tsx
import React, { ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';
import { HolographicBackground } from './HolographicBackground';
import { GlassCard } from './GlassCard';

interface Props {
  children: ReactNode;
  error?: Error | null;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught a rendering crash:', error, errorInfo);
    
    // Automatically report crash telemetry to Sentry in production
    if (!__DEV__) {
      Sentry.captureException(error, { extra: { errorInfo } });
    }
  }

  private handleRestart = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Updates.reloadAsync();
      } else {
        const win = (global as any).window;
        if (win && win.location) {
          win.location.reload();
        }
      }
    } catch (e) {
      console.error('Failed to trigger local app update reload:', e);
      // Hard fallback
      this.setState({ hasError: false, error: null });
    }
  };

  public override render() {
    // If an error state exists, render our premium safety recovery UI
    if (this.state.hasError || this.props.error) {
      const err = this.state.error || this.props.error;

      return (
        <View style={styles.container}>
          <HolographicBackground />
          
          <GlassCard style={styles.card} glowColor="#FF0080">
            <View style={styles.iconContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>
            
            <Text style={styles.title}>System Desync</Text>
            
            <Text style={styles.description}>
              MemoryMesh encountered a rendering anomaly in the neural pipeline.
            </Text>

            {__DEV__ && err && (
              <View style={styles.debugBox}>
                <Text style={styles.debugText}>{err.message}</Text>
                <Text style={styles.debugStack}>{err.stack?.slice(0, 150)}</Text>
              </View>
            )}

            <Pressable onPress={this.handleRestart} style={styles.btn}>
              <Text style={styles.btnText}>REBOOT COGNITIVE ENGINE</Text>
            </Pressable>
          </GlassCard>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
    borderColor: '#FF0080',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  debugBox: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  debugText: {
    color: '#FF0080',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  debugStack: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  btn: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderColor: '#00F5FF',
    borderWidth: 1.5,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F5FF',
    shadowRadius: 8,
    shadowOpacity: 0.3,
  },
  btnText: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
export default ErrorBoundary;
