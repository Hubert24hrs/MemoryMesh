// src/screens/Insights/InsightsScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useMemoryStore } from '../../store/memoryStore';
import { useHaptics } from '../../hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { aiOrchestrator } from '../../services/ai/AIProvider';

export const InsightsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isPro } = useSubscriptionStore();
  const { memories, fetchMemories } = useMemoryStore();
  const { triggerLight } = useHaptics();

  const [aiSummary, setAiSummary] = useState('Your memories show high productivity spikes on weekdays. Consolidating work targets early inside your sprints will yield improved retention.');

  useEffect(() => {
    fetchMemories(true);
    generateSummary();
  }, []);

  const generateSummary = async () => {
    if (memories.length === 0) return;
    try {
      const summaryText = await aiOrchestrator.generateProactiveInsightString(memories.slice(0, 5));
      setAiSummary(summaryText);
    } catch (e) {
      console.error('Failed to generate insights narrative:', e);
    }
  };

  const handleUnlockPro = () => {
    triggerLight();
    navigation.navigate('Paywall', { trigger: 'insights_gate' });
  };

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.header}>
        <Text style={styles.title}>Synaptic Insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Weekly Narrative Summaries */}
        <GlassCard glowColor="#B026FF">
          <Text style={styles.sectionLabel}>WEEKLY SYNAPSE SUMMARY</Text>
          <Text style={styles.summaryText}>{aiSummary}</Text>
        </GlassCard>

        {/* Categories Breakdown and advanced data plots */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="pie-chart" size={18} color="#FF0080" />
            <Text style={styles.sectionTitle}>Category Quantities</Text>
          </View>
          
          <GlassCard glowColor="#FF0080" style={styles.chartCard}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.colorSquare, { backgroundColor: '#00F5FF' }]} />
                <Text style={styles.categoryName}>Personal</Text>
              </View>
              <Text style={styles.categoryCount}>4 memories</Text>
            </View>
            <View style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.colorSquare, { backgroundColor: '#B026FF' }]} />
                <Text style={styles.categoryName}>Work</Text>
              </View>
              <Text style={styles.categoryCount}>3 memories</Text>
            </View>
            <View style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <View style={[styles.colorSquare, { backgroundColor: '#fbbf24' }]} />
                <Text style={styles.categoryName}>Ideas</Text>
              </View>
              <Text style={styles.categoryCount}>2 memories</Text>
            </View>
          </GlassCard>
        </View>

        {/* Heatmap & advanced details - locked behind Paywall */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={18} color="#00F5FF" />
            <Text style={styles.sectionTitle}>Cognitive Heatmap</Text>
          </View>

          {isPro ? (
            <GlassCard glowColor="#00F5FF" style={styles.lockedContainer}>
              <Text style={styles.insightLockText}>🟢 You have full access to pro insights.</Text>
              <View style={styles.calendarGrid}>
                {Array.from({ length: 28 }).map((_, idx) => (
                  <View 
                    key={idx} 
                    style={[
                      styles.calendarDay, 
                      { backgroundColor: idx % 4 === 0 ? '#00F5FF30' : idx % 5 === 0 ? '#FF008030' : 'rgba(255,255,255,0.05)' }
                    ]} 
                  />
                ))}
              </View>
            </GlassCard>
          ) : (
            <GlassCard glowColor="#FF0080" style={styles.lockedContainer}>
              <View style={styles.lockContent}>
                <Ionicons name="lock-closed" size={32} color="#FF0080" style={styles.lockIcon} />
                <Text style={styles.lockTitle}>Unlock Advanced Analytics</Text>
                <Text style={styles.lockDesc}>
                  Track your monthly memory retention maps, heatmaps, and creative narratives with Pro.
                </Text>
                <Pressable onPress={handleUnlockPro} style={styles.unlockBtn}>
                  <Text style={styles.unlockText}>UPGRADE TO PRO</Text>
                </Pressable>
              </View>
            </GlassCard>
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    textShadowColor: '#00F5FF',
    textShadowRadius: 8,
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 2.0,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
  },
  chartCard: {
    gap: 12,
    padding: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  categoryName: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  categoryCount: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  lockedContainer: {
    padding: 24,
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  lockContent: {
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    marginBottom: 8,
  },
  lockTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
  },
  lockDesc: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  unlockBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 10,
    borderColor: '#FF0080',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255, 0, 128, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unlockText: {
    color: '#FF0080',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
  },
  calendarDay: {
    width: 22,
    height: 22,
    borderRadius: 4,
  },
  insightLockText: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    marginBottom: 10,
  },
});
export default InsightsScreen;
