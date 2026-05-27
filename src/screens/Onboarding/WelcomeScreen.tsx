// src/screens/Onboarding/WelcomeScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import MemoryCrystal from '../../components/3D/MemoryCrystal';
import { useHaptics } from '../../hooks/useHaptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { triggerSuccess } = useHaptics();

  const handleNext = () => {
    triggerSuccess();
    navigation.navigate('AuthScreen');
  };

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.content}>
        {/* Animated 3D Crystal Showcase */}
        <View style={styles.crystalWrapper}>
          <MemoryCrystal />
        </View>

        <GlassCard style={styles.card} glowColor="#00F5FF">
          <Text style={styles.title}>MemoryMesh</Text>
          <Text style={styles.subtitle}>YOUR COGNITIVE SECOND BRAIN</Text>
          
          <Text style={styles.description}>
            Capture voice, text, or visual memories instantly. Orchestrated by Claude, OpenAI, and Kimi AI networks into a structured multi-vector constellation.
          </Text>

          <Pressable onPress={handleNext} style={styles.btn}>
            <Text style={styles.btnText}>INITIALIZE INTERFACE</Text>
          </Pressable>
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
  crystalWrapper: {
    width: '100%',
    height: 250,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    textShadowColor: '#00F5FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 3,
    marginBottom: 16,
  },
  description: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  btn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00F5FF',
    shadowRadius: 10,
    shadowOpacity: 0.4,
    elevation: 8,
  },
  btnText: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    letterSpacing: 2.0,
  },
});
export default WelcomeScreen;
