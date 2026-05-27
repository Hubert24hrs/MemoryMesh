// src/screens/Capture/ProcessingScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import { useHaptics } from '../../hooks/useHaptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

type ProcessingRouteProp = RouteProp<RootStackParamList, 'Processing'>;

const STEPS = [
  { label: 'Transcribing neural frequencies...', provider: 'KIMI' },
  { label: 'Analyzing emotional context...', provider: 'CLAUDE' },
  { label: 'Extracting key point indices...', provider: 'CLAUDE' },
  { label: 'Generating semantic tags...', provider: 'OPENAI' },
  { label: 'Upserting vectors into Pinecone...', provider: 'SYSTEM' },
];

export const ProcessingScreen: React.FC = () => {
  const route = useRoute<ProcessingRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { tempMemoryId } = route.params;
  
  console.log(`🧠 [Processing] Active Neural Pipeline for temporary memory: ${tempMemoryId}`);

  const [activeStep, setActiveStep] = useState(0);
  const { triggerSuccess, triggerLight } = useHaptics();
  
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    // Spin the processing crystal
    rotateValue.value = withRepeat(
      withTiming(360, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );

    // Dynamic processing checklist simulator
    const stepInterval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev < STEPS.length - 1) {
          triggerLight();
          return prev + 1;
        } else {
          clearInterval(stepInterval);
          triggerSuccess();
          // Short delay for final success checkmark visibility
          setTimeout(() => {
            navigation.navigate('MainTabs');
          }, 800);
          return prev;
        }
      });
    }, 1200);

    return () => clearInterval(stepInterval);
  }, []);

  const animatedCrystal = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.content}>
        {/* Core Processing Crystal */}
        <Animated.View style={[styles.crystalShape, animatedCrystal]}>
          <View style={styles.innerCore} />
        </Animated.View>

        <Text style={styles.title}>Neural Pipeline Active</Text>
        <Text style={styles.subtitle}>ORCHESTRATING MULTI-AI COGNITIVE EXPANSION</Text>

        {/* Steps Card */}
        <GlassCard style={styles.card} glowColor="#00F5FF">
          {STEPS.map((step, idx) => {
            const completed = activeStep > idx;
            const current = activeStep === idx;
            
            return (
              <View key={idx} style={[styles.stepRow, completed && styles.completedRow]}>
                {completed ? (
                  <Ionicons name="checkmark-circle" size={18} color="#00F5FF" style={styles.checkIcon} />
                ) : current ? (
                  <Ionicons name="sync-circle" size={18} color="#FF0080" style={styles.checkIcon} />
                ) : (
                  <Ionicons name="ellipse-outline" size={18} color="rgba(255,255,255,0.2)" style={styles.checkIcon} />
                )}
                
                <View style={styles.stepTextContainer}>
                  <Text style={[
                    styles.stepLabel, 
                    current && styles.currentLabel,
                    completed && styles.completedLabel
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={[styles.providerTag, current && styles.currentProviderTag]}>
                    {step.provider}
                  </Text>
                </View>
              </View>
            );
          })}
        </GlassCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  crystalShape: {
    width: 64,
    height: 64,
    borderWidth: 2,
    borderColor: '#00F5FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ rotate: '45deg' }],
    shadowColor: '#00F5FF',
    shadowRadius: 10,
    shadowOpacity: 0.5,
    elevation: 8,
    marginBottom: 20,
  },
  innerCore: {
    width: 24,
    height: 24,
    backgroundColor: '#FF0080',
    borderRadius: 6,
  },
  title: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 8,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 2,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    padding: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    opacity: 0.4,
  },
  completedRow: {
    opacity: 0.8,
  },
  checkIcon: {
    marginRight: 12,
  },
  stepTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter-Regular',
  },
  currentLabel: {
    color: '#ffffff',
    fontFamily: 'Inter-Medium',
  },
  completedLabel: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  providerTag: {
    fontSize: 8,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#64748b',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentProviderTag: {
    color: '#FF0080',
    backgroundColor: 'rgba(255, 0, 128, 0.1)',
  },
});
export default ProcessingScreen;
