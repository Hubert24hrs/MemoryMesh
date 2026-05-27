// src/screens/Memory/MemoryDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import { useMemoryStore } from '../../store/memoryStore';
import { useAuthStore } from '../../store/authStore';
import { encryptionService } from '../../services/encryption';
import { useHaptics } from '../../hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';

type DetailRouteProp = RouteProp<RootStackParamList, 'MemoryDetail'>;

export const MemoryDetailScreen: React.FC = () => {
  const route = useRoute<DetailRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { memoryId } = route.params;

  const { memories, deleteMemory } = useMemoryStore();
  const { user } = useAuthStore();
  const { triggerLight, triggerMedium, triggerSuccess } = useHaptics();

  const [decryptedContent, setDecryptedContent] = useState('');
  const [loading, setLoading] = useState(true);

  const memory = memories.find((m) => m.id === memoryId);

  useEffect(() => {
    const decryptData = async () => {
      if (!memory || !user) return;
      try {
        const plaintext = await encryptionService.decrypt(memory.content, user.id);
        setDecryptedContent(plaintext);
      } catch (e) {
        console.error('Failed to decrypt memory content:', e);
        setDecryptedContent('System: [Decryption Error - Invalid Access Key]');
      } finally {
        setLoading(false);
      }
    };
    decryptData();
  }, [memory, user]);

  if (!memory) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#white' }}>Memory not found</Text>
      </View>
    );
  }

  const handleDelete = async () => {
    triggerMedium();
    await deleteMemory(memory.id);
    triggerSuccess();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <HolographicBackground />

      {/* Header Row */}
      <View style={styles.header}>
        <Pressable onPress={() => { triggerLight(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#00F5FF" />
        </Pressable>
        <Text style={styles.headerText}>Cognitive Record</Text>
        <Pressable onPress={handleDelete} style={styles.trashBtn}>
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#00F5FF" />
        ) : (
          <View style={{ gap: 16 }}>
            {/* Top Insight Card */}
            <GlassCard glowColor="#00F5FF">
              <View style={styles.metaRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{memory.category.toUpperCase()}</Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(memory.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Text>
              </View>

              <Text style={styles.titleText}>{memory.summary}</Text>
              
              <View style={styles.tagsContainer}>
                {memory.tags.map((tag, idx) => (
                  <Text key={idx} style={styles.tagText}>#{tag}</Text>
                ))}
              </View>
            </GlassCard>

            {/* Decrypted Plaintext Body Card */}
            <GlassCard glowColor="#B026FF">
              <Text style={styles.sectionLabel}>DECRYPTED PLAIN CONTEXT</Text>
              <Text style={styles.bodyText}>{decryptedContent}</Text>
            </GlassCard>

            {/* Key Insights bullets */}
            {memory.keyPoints && memory.keyPoints.length > 0 && (
              <GlassCard glowColor="#FF0080">
                <Text style={styles.sectionLabel}>KEY METADATA DISCOVERIES</Text>
                {memory.keyPoints.map((point: string, idx: number) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bulletIcon}>✦</Text>
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            {/* Performance Indicators */}
            <GlassCard glowColor="rgba(255,255,255,0.1)">
              <View style={styles.detailsRow}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailTitle}>SENTIMENT</Text>
                  <Text style={styles.detailValue}>
                    {memory.sentiment === 'positive' ? '🟢 POSITIVE' : memory.sentiment === 'negative' ? '🔴 NEGATIVE' : '🟡 NEUTRAL'}
                  </Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailTitle}>NEURAL PIPELINE</Text>
                  <Text style={styles.detailValue}>🤖 {memory.aiProvider.toUpperCase()}</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0A1A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtn: {
    padding: 6,
  },
  trashBtn: {
    padding: 6,
  },
  headerText: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    letterSpacing: 1.0,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderColor: '#00F5FF',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#00F5FF',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: 'bold',
  },
  dateText: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'Inter-Medium',
  },
  titleText: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    lineHeight: 28,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  sectionLabel: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 2.0,
    marginBottom: 12,
  },
  bodyText: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    color: '#FF0080',
    fontSize: 14,
    marginRight: 8,
    lineHeight: 18,
  },
  bulletText: {
    flex: 1,
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailCol: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
  },
});
export default MemoryDetailScreen;
