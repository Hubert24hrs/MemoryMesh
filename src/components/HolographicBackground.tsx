// src/components/HolographicBackground.tsx
import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

export const HolographicBackground: React.FC = () => {
  // Shared values for floats
  const orb1X = useSharedValue(width * 0.1);
  const orb1Y = useSharedValue(height * 0.2);
  const orb2X = useSharedValue(width * 0.6);
  const orb2Y = useSharedValue(height * 0.6);
  const orb3X = useSharedValue(width * 0.3);
  const orb3Y = useSharedValue(height * 0.4);

  useEffect(() => {
    // Orb 1 Animation Loop
    orb1X.value = withRepeat(
      withSequence(
        withTiming(width * 0.4, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
        withTiming(width * 0.1, { duration: 9000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    orb1Y.value = withRepeat(
      withSequence(
        withTiming(height * 0.4, { duration: 11000, easing: Easing.inOut(Easing.ease) }),
        withTiming(height * 0.2, { duration: 11000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Orb 2 Animation Loop
    orb2X.value = withRepeat(
      withSequence(
        withTiming(width * 0.3, { duration: 10000, easing: Easing.inOut(Easing.ease) }),
        withTiming(width * 0.7, { duration: 10000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    orb2Y.value = withRepeat(
      withSequence(
        withTiming(height * 0.3, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(height * 0.7, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Orb 3 Animation Loop
    orb3X.value = withRepeat(
      withSequence(
        withTiming(width * 0.6, { duration: 8500, easing: Easing.inOut(Easing.ease) }),
        withTiming(width * 0.2, { duration: 8500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    orb3Y.value = withRepeat(
      withSequence(
        withTiming(height * 0.6, { duration: 10500, easing: Easing.inOut(Easing.ease) }),
        withTiming(height * 0.3, { duration: 10500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, []);

  const animatedOrb1 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb1X.value }, { translateY: orb1Y.value }],
  }));

  const animatedOrb2 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb2X.value }, { translateY: orb2Y.value }],
  }));

  const animatedOrb3 = useAnimatedStyle(() => ({
    transform: [{ translateX: orb3X.value }, { translateY: orb3Y.value }],
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Base Deep Night Sky Gradient */}
      <LinearGradient
        colors={['#0A0A1A', '#0D0D2B', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating Holographic Orb 1: Cyan */}
      <Animated.View style={[styles.orb, styles.orbCyan, animatedOrb1]} />

      {/* Floating Holographic Orb 2: Purple */}
      <Animated.View style={[styles.orb, styles.orbPurple, animatedOrb2]} />

      {/* Floating Holographic Orb 3: Pink */}
      <Animated.View style={[styles.orb, styles.orbPink, animatedOrb3]} />
    </View>
  );
};

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  orbCyan: {
    backgroundColor: '#00F5FF',
    opacity: 0.08,
    shadowColor: '#00F5FF',
    shadowRadius: 100,
    shadowOpacity: 0.8,
  },
  orbPurple: {
    backgroundColor: '#B026FF',
    opacity: 0.06,
    shadowColor: '#B026FF',
    shadowRadius: 100,
    shadowOpacity: 0.8,
  },
  orbPink: {
    backgroundColor: '#FF0080',
    opacity: 0.05,
    shadowColor: '#FF0080',
    shadowRadius: 100,
    shadowOpacity: 0.8,
  },
});
export default HolographicBackground;
