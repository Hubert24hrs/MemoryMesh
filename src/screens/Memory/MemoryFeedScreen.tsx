// src/screens/Memory/MemoryFeedScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { MemoryCard } from '../../components/Cards/MemoryCard';
import { BannerAd } from '../../components/Ads/BannerAd';
import { useMemoryStore } from '../../store/memoryStore';
import { useAuthStore } from '../../store/authStore';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import { useHaptics } from '../../hooks/useHaptics';
import { MemoryCategory } from '../../types/memory';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

const CATEGORIES: (MemoryCategory | 'all')[] = ['all', 'personal', 'work', 'idea', 'task', 'learning', 'social', 'health', 'finance'];

export const MemoryFeedScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { memories, fetchMemories, deleteMemory, isLoading } = useMemoryStore();
  const { user } = useAuthStore();
  const { triggerLight } = useHaptics();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');

  // Debounced search results
  const { results: searchResults, isSearching } = useDebouncedSearch(searchQuery, user?.id || '');

  useEffect(() => {
    fetchMemories(true);
  }, []);

  const handleRefresh = async () => {
    triggerLight();
    await fetchMemories(true);
  };

  const handleCardPress = (id: string) => {
    triggerLight();
    navigation.navigate('MemoryDetail', { memoryId: id });
  };

  const handleEditPress = (id: string) => {
    triggerLight();
    navigation.navigate('MemoryEdit', { memoryId: id });
  };

  const handleDeletePress = async (id: string) => {
    triggerLight();
    await deleteMemory(id);
  };

  // Filter local memories
  const displayMemories = searchQuery.trim().length > 0 
    ? searchResults.map(r => r.memory)
    : memories.filter((m) => {
        if (selectedCategory === 'all') return true;
        return m.category === selectedCategory;
      });

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.header}>
        <Text style={styles.title}>Your Memories</Text>
        <Pressable onPress={() => navigation.navigate('Search')} style={styles.searchIcon}>
          <Ionicons name="search" size={24} color="#00F5FF" />
        </Pressable>
      </View>

      {/* Embedded Search Input */}
      <View style={styles.searchBarBox}>
        <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.searchIconLeft} />
        <TextInput
          style={styles.searchInput}
          placeholder="Semantic neural search..."
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94a3b8" />
          </Pressable>
        )}
      </View>

      {/* Filter Horizontal Row */}
      <View style={styles.filterOuter}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item: any) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }: any) => {
            const active = selectedCategory === item;
            return (
              <Pressable
                onPress={() => { triggerLight(); setSelectedCategory(item); }}
                style={[styles.filterChip, active && styles.activeChip]}
              >
                <Text style={[styles.filterText, active && styles.activeFilterText]}>
                  {item.toUpperCase()}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Feed List */}
      {isLoading || isSearching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00F5FF" />
        </View>
      ) : displayMemories.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="file-tray-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>Zero Synaptic Memories Recorded</Text>
          <Text style={styles.emptySub}>Capture a new memory via voice or text input.</Text>
        </View>
      ) : (
        <FlatList
          data={displayMemories}
          keyExtractor={(item: any) => item.id}
          refreshing={isLoading}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }: any) => (
            <MemoryCard
              memory={item}
              onPress={() => handleCardPress(item.id)}
              onEdit={() => handleEditPress(item.id)}
              onDelete={() => handleDeletePress(item.id)}
            />
          )}
        />
      )}

      {/* Ad Banner gates */}
      <BannerAd />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    textShadowColor: '#00F5FF',
    textShadowRadius: 8,
  },
  searchIcon: {
    padding: 6,
  },
  searchBarBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchIconLeft: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontFamily: 'Inter-Regular',
    fontSize: 14,
  },
  filterOuter: {
    marginBottom: 12,
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: 'rgba(0, 245, 255, 0.15)',
    borderColor: '#00F5FF',
  },
  filterText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    letterSpacing: 1.0,
  },
  activeFilterText: {
    color: '#00F5FF',
  },
  listContent: {
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 4,
  },
});
export default MemoryFeedScreen;
