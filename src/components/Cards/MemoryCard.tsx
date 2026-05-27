// src/components/Cards/MemoryCard.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { GlassCard } from '../GlassCard';
import { Memory } from '../../types/memory';
import { useHaptics } from '../../hooks/useHaptics';

interface MemoryCardProps {
  memory: Memory;
  onPress: () => void;
  onDelete: () => void;
  onEdit: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  personal: '#00F5FF', // Cyan
  work: '#B026FF',     // Purple
  idea: '#fbbf24',     // Warning Amber
  task: '#FF7F00',     // Orange
  learning: '#FF0080', // Pink
  social: '#3b82f6',   // Blue
  health: '#10b981',   // Green
  finance: '#22c55e',  // Emerald Green
};

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onPress,
  onDelete,
  onEdit,
}) => {
  const { triggerLight, triggerMedium } = useHaptics();
  const categoryColor = CATEGORY_COLORS[memory.category] || '#00F5FF';

  // Swipe Action Renders
  const renderLeftActions = () => (
    <Pressable 
      onPress={() => {
        triggerMedium();
        onDelete();
      }} 
      style={[styles.actionButton, styles.deleteAction]}
    >
      <Text style={styles.actionText}>Delete</Text>
    </Pressable>
  );

  const renderRightActions = () => (
    <Pressable 
      onPress={() => {
        triggerLight();
        onEdit();
      }} 
      style={[styles.actionButton, styles.editAction]}
    >
      <Text style={styles.actionText}>Edit</Text>
    </Pressable>
  );

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={triggerLight}
    >
      <GlassCard 
        onPress={onPress} 
        style={[styles.card, { borderLeftColor: categoryColor }]}
        glowColor={categoryColor}
      >
        <View style={styles.row}>
          {/* Category Tag */}
          <View style={[styles.badge, { backgroundColor: `${categoryColor}20` }]}>
            <Text style={[styles.badgeText, { color: categoryColor }]}>
              {memory.category.toUpperCase()}
            </Text>
          </View>
          {/* Importance Indicator dots */}
          <View style={styles.dotsRow}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <View 
                key={idx} 
                style={[
                  styles.dot, 
                  { 
                    backgroundColor: idx < Math.ceil(memory.importance / 2) 
                      ? categoryColor 
                      : 'rgba(255,255,255,0.2)' 
                  }
                ]} 
              />
            ))}
          </View>
        </View>

        {/* Memory Content Summary */}
        <Text style={styles.summaryText} numberOfLines={2}>
          {memory.summary}
        </Text>

        {/* Tag row */}
        <View style={styles.footer}>
          <View style={styles.tagsContainer}>
            {memory.tags.slice(0, 3).map((tag, idx) => (
              <Text key={idx} style={styles.tagText}>
                #{tag}
              </Text>
            ))}
          </View>
          <Text style={styles.providerText}>
            🤖 {memory.aiProvider.toUpperCase()}
          </Text>
        </View>
      </GlassCard>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 6,
    marginHorizontal: 12,
    borderLeftWidth: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: 'bold',
  },
  dotsRow: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 3,
  },
  summaryText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    marginRight: 8,
  },
  providerText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
  },
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '90%',
    alignSelf: 'center',
    borderRadius: 16,
    marginVertical: 6,
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    marginRight: -10,
    marginLeft: 12,
  },
  editAction: {
    backgroundColor: '#3b82f6',
    marginLeft: -10,
    marginRight: 12,
  },
  actionText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
export default MemoryCard;
