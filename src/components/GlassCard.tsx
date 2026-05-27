// src/components/GlassCard.tsx
import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

interface GlassCardProps {
  children?: React.ReactNode;
  style?: any;
  intensity?: number;
  onPress?: () => void;
  glowColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 20,
  onPress,
  glowColor = 'rgba(0, 245, 255, 0.3)',
  ...props
}) => {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const cardContent = (
    <View style={StyleSheet.absoluteFill}>
      {/* Dynamic Border Gradient */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.1)', 'transparent', glowColor]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Background glass blur */}
      <BlurView intensity={intensity} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, animatedStyle, style]}
        {...props}
      >
        {cardContent}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.container, style]} {...props}>
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 245, 255, 0.2)',
    minHeight: 50,
  },
  content: {
    padding: 16,
    zIndex: 1,
  },
});
export default GlassCard;
