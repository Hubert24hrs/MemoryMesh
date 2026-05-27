// src/screens/Onboarding/OnboardingScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import MemoryCrystal from '../../components/3D/MemoryCrystal';
import { useHaptics } from '../../hooks/useHaptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  FadeInDown 
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export const OnboardingScreen: React.FC = () => {
  const [step, setStep] = useState(0);
  const { triggerLight, triggerSuccess } = useHaptics();
  const setPreferredAI = useSettingsStore((state) => state.setPreferredAIProvider);
  const initializeAuth = useAuthStore((state) => state.initialize);

  // Shared slide offset
  const slideOffset = useSharedValue(0);

  const handleNextStep = async () => {
    if (step < 2) {
      triggerLight();
      setStep(step + 1);
      slideOffset.value = withTiming(-width * (step + 1), { duration: 400 });
    } else {
      // Complete Onboarding
      triggerSuccess();
      try {
        await AsyncStorage.setItem('memorymesh_onboarding_completed', 'true');
        // Refresh auth state in RootNavigator to trigger MainTabs transition
        await initializeAuth();
      } catch (e) {
        console.error('Failed to complete onboarding:', e);
      }
    }
  };

  const animatedSlide = useAnimatedStyle(() => ({
    transform: [{ translateX: slideOffset.value }],
  }));

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.header}>
        <Text style={styles.headerTag}>ONBOARDING CHANNEL {step + 1}/3</Text>
      </View>

      <Animated.View style={[styles.slidesContainer, animatedSlide]}>
        {/* SLIDE 1: Your AI Memory Assistant */}
        <View style={styles.slide}>
          <View style={styles.visualContainer}>
            <MemoryCrystal />
          </View>
          <GlassCard style={styles.card} glowColor="#00F5FF">
            <Text style={styles.slideTitle}>Your AI Memory Assistant</Text>
            <Text style={styles.slideDesc}>
              MemoryMesh captures and deciphers raw voice transcripts or captured media into premium knowledge constellations.
            </Text>
          </GlassCard>
        </View>

        {/* SLIDE 2: Three AIs, One Brain */}
        <View style={styles.slide}>
          <View style={styles.cardsGrid}>
            <Animated.View entering={FadeInDown.delay(100)} style={styles.miniCard}>
              <Text style={styles.aiTag}>CLAUDE SONNET</Text>
              <Text style={styles.aiText}>Nuanced context extraction & causal connection analysis.</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300)} style={styles.miniCard}>
              <Text style={styles.aiTag}>KIMI CODE 2.5</Text>
              <Text style={styles.aiText}>Ultra-fast real-time speech-to-text translations.</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(500)} style={styles.miniCard}>
              <Text style={styles.aiTag}>OPENAI GPT-4</Text>
              <Text style={styles.aiText}>Generating semantic vector embeddings & proactive insights.</Text>
            </Animated.View>
          </View>
          <GlassCard style={styles.card} glowColor="#B026FF">
            <Text style={styles.slideTitle}>Three AIs, One Brain</Text>
            <Text style={styles.slideDesc}>
              Our Smart Router pipelines your queries to Claude, OpenAI, and Kimi depending on the optimal cognitive fit.
            </Text>
          </GlassCard>
        </View>

        {/* SLIDE 3: Choose Your AI Personality (PersonalityQuiz inline!) */}
        <View style={styles.slide}>
          <GlassCard style={styles.card} glowColor="#FF0080">
            <Text style={styles.slideTitle}>Select Primary Neural Core</Text>
            <Text style={styles.quizQuestion}>Which cognitive focus matches your style best?</Text>

            <Pressable 
              onPress={() => { triggerLight(); setPreferredAI('claude'); }}
              style={styles.quizBtn}
            >
              <Text style={styles.quizBtnTitle}>🧠 CONTEXT & REASONING</Text>
              <Text style={styles.quizBtnDesc}>Powered primarily by Claude Sonnet (Highly Recommended)</Text>
            </Pressable>

            <Pressable 
              onPress={() => { triggerLight(); setPreferredAI('kimi'); }}
              style={styles.quizBtn}
            >
              <Text style={styles.quizBtnTitle}>⚡ REAL-TIME & SPEED</Text>
              <Text style={styles.quizBtnDesc}>Powered primarily by Kimi AI Multi-lingual streaming</Text>
            </Pressable>

            <Pressable 
              onPress={() => { triggerLight(); setPreferredAI('openai'); }}
              style={styles.quizBtn}
            >
              <Text style={styles.quizBtnTitle}>🎨 CREATIVE PATTERNS</Text>
              <Text style={styles.quizBtnDesc}>Powered primarily by OpenAI GPT-4 insights generator</Text>
            </Pressable>
          </GlassCard>
        </View>
      </Animated.View>

      {/* Footer Navigation */}
      <View style={styles.footer}>
        <View style={styles.indicatorContainer}>
          {Array.from({ length: 3 }).map((_, idx) => (
            <View 
              key={idx} 
              style={[
                styles.indicatorDot,
                step === idx ? styles.activeDot : styles.inactiveDot
              ]} 
            />
          ))}
        </View>

        <Pressable onPress={handleNextStep} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>
            {step === 2 ? 'ESTABLISH INTEGRATION' : 'NEXT STAGE'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    alignItems: 'center',
    zIndex: 2,
  },
  headerTag: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 2,
  },
  slidesContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * 3,
    zIndex: 1,
  },
  slide: {
    width: width,
    height: '100%',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualContainer: {
    height: 240,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  card: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  slideTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  slideDesc: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
  },
  cardsGrid: {
    width: '100%',
    marginBottom: 20,
  },
  miniCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  aiTag: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  aiText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'Inter-Regular',
  },
  quizQuestion: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Medium',
    marginBottom: 16,
    textAlign: 'center',
  },
  quizBtn: {
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  quizBtnTitle: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    marginBottom: 2,
  },
  quizBtnDesc: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'Inter-Regular',
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  indicatorContainer: {
    flexDirection: 'row',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  activeDot: {
    backgroundColor: '#00F5FF',
    width: 14,
  },
  inactiveDot: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  nextBtn: {
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    borderColor: '#00F5FF',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtnText: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
export default OnboardingScreen;
