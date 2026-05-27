// src/components/LoadingScreen.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { HolographicBackground } from './HolographicBackground';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

export const LoadingScreen: React.FC = () => {
  const rotateValue = useSharedValue(0);
  const pulseValue = useSharedValue(1);

  useEffect(() => {
    // Spin the central neon core continuously
    rotateValue.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );

    // Pulse the core glow
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedCrystal = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotateValue.value}deg` },
      { scale: pulseValue.value }
    ],
  }));

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.content}>
        {/* Reanimated Spinning Neon Core */}
        <Animated.View style={[styles.crystalShape, animatedCrystal]}>
          <View style={styles.innerCore} />
        </Animated.View>

        <Text style={styles.title}>MemoryMesh</Text>
        <Text style={styles.subtitle}>SYNCHRONIZING BRAIN CHANNELS</Text>
        
        {/* Animated Progress indicator dots */}
        <View style={styles.dotsRow}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  crystalShape: {
    width: 80,
    height: 80,
    borderWidth: 3,
    borderColor: '#00F5FF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#00F5FF',
    shadowRadius: 15,
    shadowOpacity: 0.5,
    elevation: 10,
    marginBottom: 24,
  },
  innerCore: {
    width: 30,
    height: 30,
    backgroundColor: '#FF0080',
    borderRadius: 8,
    shadowColor: '#FF0080',
    shadowRadius: 10,
    shadowOpacity: 0.8,
  },
  title: {
    fontSize: 32,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    textShadowColor: '#00F5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 3,
    marginBottom: 20,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F5FF',
    marginHorizontal: 4,
    opacity: 0.8,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 0.9,
  },
});
export default LoadingScreen;
