// src/screens/Dashboard/DashboardScreen.tsx
/**
 * Enhanced Dashboard with 3D Memory Crystal and AI Insights
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Components
import { MemoryCrystal } from '../../components/3D/MemoryCrystal';
import { GlassCard } from '../../components/GlassCard';
import { ProactiveInsightCard } from '../../components/ProactiveInsightCard';
import { StreakCounter } from '../../components/StreakCounter';
import { QuickActionButton } from '../../components/QuickActionButton';
import { MemoryPreviewCard } from '../../components/MemoryPreviewCard';
import { HolographicBackground } from '../../components/HolographicBackground';
import { LoadingShimmer } from '../../components/LoadingShimmer';

// Store
import { useMemoryStore } from '../../store/memoryStore';
import { useAuthStore } from '../../store/authStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';

// Services
import { analyticsService } from '../../services/analytics';
import { aiOrchestrator } from '../../services/ai/AIProvider';

// Theme
import theme from '../../theme/enhancedTheme';

const { colors, spacing, typography, borderRadius, shadows } = theme;

// ============================================================================
// TYPES
// ============================================================================

interface ProactiveInsight {
  id: string;
  type: 'pattern' | 'reminder' | 'connection' | 'suggestion';
  title: string;
  description: string;
  memoryId?: string;
  actionLabel?: string;
  priority: number;
  createdAt: Date;
}

interface DashboardStats {
  totalMemories: number;
  todayMemories: number;
  weekMemories: number;
  streak: number;
  recallRate: number;
  categories: Record<string, number>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  
  // Store
  const { memories, fetchMemories, isLoading } = useMemoryStore();
  const { user } = useAuthStore();
  const { isPro } = useSubscriptionStore();
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [proactiveInsights, setProactiveInsights] = useState<ProactiveInsight[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalMemories: 0,
    todayMemories: 0,
    weekMemories: 0,
    streak: 0,
    recallRate: 0,
    categories: {},
  });
  
  // Animations
  const crystalRotation = useSharedValue(0);
  const floatAnimation = useSharedValue(0);
  const headerOpacity = useSharedValue(1);

  // ========================================================================
  // EFFECTS
  // ========================================================================

  useEffect(() => {
    initializeDashboard();
    startAnimations();
    
    // Track screen view
    analyticsService.trackEvent('dashboard_viewed', {
      memoryCount: memories.length,
      isPro,
    });
  }, []);

  useEffect(() => {
    calculateStats();
  }, [memories]);

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  const initializeDashboard = async () => {
    try {
      // Fetch latest memories
      await fetchMemories(true);
      
      // Generate proactive insights
      await generateProactiveInsights();
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
    }
  };

  const startAnimations = () => {
    // Crystal rotation
    crystalRotation.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );
    
    // Floating animation
    floatAnimation.value = withRepeat(
      withSpring(1, {
        damping: 2,
        stiffness: 100,
      }),
      -1,
      true
    );
  };

  // ========================================================================
  // DATA PROCESSING
  // ========================================================================

  const calculateStats = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayMemories = memories.filter(
      m => new Date(m.createdAt) >= todayStart
    ).length;

    const weekMemories = memories.filter(
      m => new Date(m.createdAt) >= weekStart
    ).length;

    // Calculate streak
    const streak = calculateStreak(memories);

    // Calculate recall rate (simplified)
    const recallRate = memories.length > 0 ? 85 : 0;

    // Category distribution
    const categories: Record<string, number> = {};
    memories.forEach(m => {
      if (m.category) {
        categories[m.category] = (categories[m.category] || 0) + 1;
      }
    });

    setStats({
      totalMemories: memories.length,
      todayMemories,
      weekMemories,
      streak,
      recallRate,
      categories,
    });
  };

  const calculateStreak = (memories: any[]): number => {
    if (memories.length === 0) return 0;

    const sortedDates = memories
      .map(m => new Date(m.createdAt).toDateString())
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 0;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (sortedDates[0] === today || sortedDates[0] === yesterday) {
      streak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const current = new Date(sortedDates[i]);
        const previous = new Date(sortedDates[i - 1]);
        const diffDays = Math.floor(
          (previous.getTime() - current.getTime()) / 86400000
        );
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }

    return streak;
  };

  const generateProactiveInsights = async () => {
    try {
      // Get recent memories for context
      const recentMemories = memories.slice(0, 10);

      if (recentMemories.length === 0) {
        setProactiveInsights([]);
        return;
      }

      // Use AI to generate insights
      const insight = await aiOrchestrator.generateProactiveInsight(recentMemories);

      if (insight) {
        const newInsight: ProactiveInsight = {
          id: crypto.randomUUID(),
          type: 'suggestion',
          title: 'AI Insight',
          description: insight,
          priority: 1,
          createdAt: new Date(),
        };

        setProactiveInsights([newInsight]);
      }
    } catch (error) {
      console.error('Failed to generate proactive insights:', error);
    }
  };

  // ========================================================================
  // HANDLERS
  // ========================================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    await initializeDashboard();
    
    setRefreshing(false);
  };

  const handleCrystalPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Memories' as never);
  };

  const handleQuickCapture = (type: 'voice' | 'text' | 'image') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Capture' as never, { mode: type } as never);
    
    analyticsService.trackEvent('quick_capture_pressed', { type });
  };

  const handleMemoryPress = (memoryId: string) => {
    Haptics.selectionAsync();
    navigation.navigate('MemoryDetail' as never, { memoryId } as never);
  };

  const handleInsightAction = (insight: ProactiveInsight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (insight.memoryId) {
      navigation.navigate('MemoryDetail' as never, { memoryId: insight.memoryId } as never);
    }
    
    analyticsService.trackEvent('insight_actioned', {
      insightType: insight.type,
      insightId: insight.id,
    });
  };

  // ========================================================================
  // ANIMATED STYLES
  // ========================================================================

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatAnimation.value, [0, 1], [0, -10]) },
    ],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  // ========================================================================
  // RENDER HELPERS
  // ========================================================================

  const renderGreeting = () => {
    const hour = new Date().getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';

    const firstName = user?.email?.split('@')[0] || 'Memory Keeper';

    return (
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <StreakCounter days={stats.streak} />
      </Animated.View>
    );
  };

  const renderMemoryCrystal = () => (
    <Animated.View entering={FadeInUp.delay(200)} style={[styles.crystalContainer, floatStyle]}>
      <MemoryCrystal
        count={stats.totalMemories}
        rotation={crystalRotation}
        onPress={handleCrystalPress}
      />
    </Animated.View>
  );

  const renderQuickStats = () => (
    <Animated.View entering={FadeInDown.delay(300)} style={styles.statsRow}>
      <GlassCard style={styles.statCard}>
        <LinearGradient
          colors={['rgba(0, 245, 255, 0.1)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.statNumber}>{stats.totalMemories}</Text>
        <Text style={styles.statLabel}>Total</Text>
      </GlassCard>

      <GlassCard style={styles.statCard}>
        <LinearGradient
          colors={['rgba(176, 38, 255, 0.1)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.statNumber}>{stats.todayMemories}</Text>
        <Text style={styles.statLabel}>Today</Text>
      </GlassCard>

      <GlassCard style={styles.statCard}>
        <LinearGradient
          colors={['rgba(255, 0, 128, 0.1)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.statNumber}>{stats.recallRate}%</Text>
        <Text style={styles.statLabel}>Recall</Text>
      </GlassCard>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <QuickActionButton
        icon="mic"
        label="Voice"
        color={colors.primary.cyan}
        onPress={() => handleQuickCapture('voice')}
      />
      <QuickActionButton
        icon="create"
        label="Text"
        color={colors.primary.purple}
        onPress={() => handleQuickCapture('text')}
      />
      <QuickActionButton
        icon="camera"
        label="Image"
        color={colors.primary.pink}
        onPress={() => handleQuickCapture('image')}
      />
    </View>
  );

  const renderProactiveInsights = () => {
    if (proactiveInsights.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="bulb" size={20} color={colors.accent.warning} />
          <Text style={styles.sectionTitle}>Insights for You</Text>
        </View>

        {proactiveInsights.map((insight, index) => (
          <Animated.View
            key={insight.id}
            entering={FadeInDown.delay(400 + index * 100)}
          >
            <ProactiveInsightCard
              insight={insight}
              onPress={() => handleInsightAction(insight)}
            />
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderRecentMemories = () => {
    const recentMemories = memories.slice(0, 5);

    if (recentMemories.length === 0) {
      return (
        <GlassCard style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyStateText}>No memories yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap the microphone to create your first memory
          </Text>
        </GlassCard>
      );
    }

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color={colors.primary.cyan} />
          <Text style={styles.sectionTitle}>Recent Memories</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Memories' as never)}>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentMemories.map((memory, index) => (
          <Animated.View
            key={memory.id}
            entering={FadeInDown.delay(500 + index * 100)}
          >
            <MemoryPreviewCard
              memory={memory}
              onPress={() => handleMemoryPress(memory.id)}
            />
          </Animated.View>
        ))}
      </View>
    );
  };

  // ========================================================================
  // MAIN RENDER
  // ========================================================================

  if (isLoading && memories.length === 0) {
    return (
      <View style={styles.container}>
        <HolographicBackground />
        <LoadingShimmer />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <HolographicBackground />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.cyan}
            colors={[colors.primary.cyan, colors.primary.purple]}
          />
        }
      >
        {renderGreeting()}
        {renderMemoryCrystal()}
        {renderQuickStats()}
        {renderQuickActions()}
        {renderProactiveInsights()}
        {renderRecentMemories()}

        {/* Bottom padding */}
        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.deep,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? spacing.xxxl + spacing.lg : spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: colors.text.secondary,
    fontFamily: typography.families.primary,
  },
  name: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    fontFamily: typography.families.display,
  },
  crystalContainer: {
    alignItems: 'center',
    marginVertical: spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    overflow: 'hidden',
  },
  statNumber: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.primary.cyan,
    fontFamily: typography.families.display,
  },
  statLabel: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontFamily: typography.families.primary,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    flex: 1,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    fontFamily: typography.families.primary,
  },
  seeAllText: {
    fontSize: typography.sizes.sm,
    color: colors.primary.cyan,
    fontFamily: typography.families.primary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyStateText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginTop: spacing.md,
    fontFamily: typography.families.primary,
  },
  emptyStateSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    fontFamily: typography.families.primary,
  },
});
