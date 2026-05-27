// src/components/Visualizations/WaveformVisualizer.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming 
} from 'react-native-reanimated';

interface WaveformVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  barCount?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioLevel,
  isActive,
  barCount = 30,
}) => {
  // Shared value array for individual bar scales
  const barHeights = Array.from({ length: barCount }).map(() => useSharedValue(5));

  useEffect(() => {
    if (!isActive) {
      barHeights.forEach((h) => {
        h.value = withTiming(5, { duration: 150 });
      });
      return;
    }

    barHeights.forEach((h, idx) => {
      // Dynamic height responding to decibel levels with randomized delay variations
      const factor = 1 - Math.abs(idx - barCount / 2) / (barCount / 2);
      const randomBoost = Math.random() * 0.4 + 0.6;
      const targetHeight = Math.max(5, audioLevel * factor * 50 * randomBoost);
      
      h.value = withTiming(targetHeight, { duration: 120 });
    });
  }, [audioLevel, isActive]);

  return (
    <View style={styles.container}>
      {barHeights.map((h, idx) => {
        const animatedBar = useAnimatedStyle(() => ({
          height: h.value,
        }));

        return (
          <Animated.View 
            key={idx} 
            style={[
              styles.bar, 
              animatedBar, 
              { backgroundColor: isActive ? '#00F5FF' : 'rgba(255, 255, 255, 0.2)' }
            ]} 
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 60,
    paddingHorizontal: 8,
  },
  bar: {
    width: 3.5,
    borderRadius: 2,
  },
});
export default WaveformVisualizer;
