// src/screens/Search/SearchScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import { useAuthStore } from '../../store/authStore';
import { useHaptics } from '../../hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_SEARCHES_KEY = 'memorymesh_recent_queries_cache';

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { user } = useAuthStore();
  const { triggerLight, triggerSuccess } = useHaptics();

  const { results, isSearching } = useDebouncedSearch(query, user?.id || '');

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recent searches:', e);
    }
  };

  const handleSearchSubmit = async (text: string) => {
    if (!text.trim()) return;
    triggerSuccess();
    
    let updated = [text.trim(), ...recentSearches.filter((s) => s !== text.trim())].slice(0, 10);
    setRecentSearches(updated);
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const handleClearRecents = async () => {
    triggerLight();
    setRecentSearches([]);
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleResultPress = (id: string) => {
    triggerLight();
    navigation.navigate('MemoryDetail', { memoryId: id });
  };

  return (
    <View style={styles.container}>
      <HolographicBackground />

      {/* Header Search Box */}
      <View style={styles.header}>
        <Pressable onPress={() => { triggerLight(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#00F5FF" />
        </Pressable>
        
        <View style={styles.searchBarBox}>
          <TextInput
            autoFocus
            style={styles.searchInput}
            placeholder="Search your brain semantic constellation..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearchSubmit(query)}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Recent Searches */}
      {query.length === 0 && (
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>RECENT NEURAL INQUIRIES</Text>
            {recentSearches.length > 0 && (
              <Pressable onPress={handleClearRecents}>
                <Text style={styles.clearText}>CLEAR</Text>
              </Pressable>
            )}
          </View>
          
          {recentSearches.length === 0 ? (
            <Text style={styles.emptyText}>No recent semantic queries.</Text>
          ) : (
            <View style={styles.recentTagsContainer}>
              {recentSearches.map((item, idx) => (
                <Pressable 
                  key={idx} 
                  onPress={() => { triggerLight(); setQuery(item); }}
                  style={styles.recentTag}
                >
                  <Text style={styles.tagText}>{item}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Search results list */}
      {query.length > 0 && (
        <View style={{ flex: 1 }}>
          {isSearching ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#00F5FF" />
            </View>
          ) : results.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={40} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyResultsTitle}>Zero Semantic Vector Matches</Text>
              <Text style={styles.emptyResultsDesc}>Refine query phrases or capture fresh memories.</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item: any) => item.memory.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }: any) => (
                <GlassCard 
                  onPress={() => handleResultPress(item.memory.id)}
                  style={styles.resultCard}
                  glowColor={`rgba(0, 245, 255, ${item.score})`}
                >
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultSummary}>{item.memory.summary}</Text>
                    {/* Visual Confidence Score */}
                    <View style={styles.scoreRow}>
                      <Text style={styles.scoreText}>MATCH: {Math.round(item.score * 100)}%</Text>
                      <View style={styles.scoreBarContainer}>
                        <View style={[styles.scoreBar, { width: `${item.score * 100}%` }]} />
                      </View>
                    </View>
                  </View>
                </GlassCard>
              )}
            />
          )}
        </View>
      )}
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
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  searchBarBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  recentSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 1.5,
  },
  clearText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ef4444',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  recentTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentTag: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyResultsTitle: {
    fontSize: 15,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginTop: 16,
  },
  emptyResultsDesc: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  resultCard: {
    marginVertical: 6,
  },
  resultHeader: {
    gap: 8,
  },
  resultSummary: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#00F5FF',
  },
  scoreBarContainer: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreBar: {
    height: '100%',
    backgroundColor: '#00F5FF',
  },
});
export default SearchScreen;
