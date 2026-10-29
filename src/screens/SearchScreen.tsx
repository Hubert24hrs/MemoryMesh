import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoteCard } from '../components/NoteCard';
import { AppText, Chip, EmptyState, Field } from '../components/ui';
import { getTagsForNotes, listTagsWithCounts } from '../db/graph';
import { keywordSearch } from '../db/notes';
import type { NoteKind } from '../db/types';
import { useDb } from '../lib/useDb';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { searchNotes, type SearchHit } from '../services/search';
import { space, useTheme } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Search'>,
  NativeStackScreenProps<RootStackParamList>
>;

const DAY = 86_400_000;
const RANGES = [
  { key: 'anyTime', days: null },
  { key: 'last7', days: 7 },
  { key: 'last30', days: 30 },
  { key: 'lastYear', days: 365 },
] as const;
const KINDS: (NoteKind | 'all')[] = ['all', 'text', 'voice', 'clip', 'daily', 'digest'];

export function SearchScreen({ navigation, route }: Props) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [range, setRange] = useState<number | null>(null);
  const [kind, setKind] = useState<NoteKind | 'all'>('all');
  const [tagIds, setTagIds] = useState<string[]>([]);

  // A tag tapped elsewhere arrives as a route param; apply it when it changes.
  const paramTag = route.params?.tagId;
  const [appliedParamTag, setAppliedParamTag] = useState<string | undefined>(undefined);
  if (paramTag !== appliedParamTag) {
    setAppliedParamTag(paramTag);
    if (paramTag) setTagIds([paramTag]);
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 400);
    return () => clearTimeout(timer);
  }, [query]);

  const tags = useDb(['tags'], () => listTagsWithCounts(30));
  const hasFilters = tagIds.length > 0 || kind !== 'all' || range !== null;

  const results = useDb(
    ['search', debounced, range, kind, tagIds.join(',')],
    async () => {
      const filters = {
        tagIds,
        kinds: kind === 'all' ? undefined : [kind],
        since: range ? Date.now() - range * DAY : null,
      };
      const hits: SearchHit[] = debounced.trim()
        ? await searchNotes(debounced, filters)
        : (await keywordSearch('', filters, 60)).map((note) => ({ note, via: 'keyword' as const }));
      const tagMap = await getTagsForNotes(hits.map((h) => h.note.id));
      return { hits, tagMap };
    },
    debounced.trim().length > 0 || hasFilters,
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.top}>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {RANGES.map((r) => (
            <Chip key={r.key} label={t(`search.${r.key}`)} selected={range === r.days} onPress={() => setRange(r.days)} />
          ))}
          <View style={[styles.sep, { backgroundColor: c.border }]} />
          {KINDS.map((k) => (
            <Chip
              key={k}
              label={k === 'all' ? t('search.allTypes') : k}
              selected={kind === k}
              onPress={() => setKind(k)}
            />
          ))}
        </ScrollView>
        {(tags.data?.length ?? 0) > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {tags.data!.map((tag) => {
              const selected = tagIds.includes(tag.id);
              return (
                <Chip
                  key={tag.id}
                  label={`#${tag.name}`}
                  selected={selected}
                  onPress={() => setTagIds(selected ? tagIds.filter((id) => id !== tag.id) : [...tagIds, tag.id])}
                />
              );
            })}
          </ScrollView>
        )}
      </View>
      <FlatList
        data={results.data?.hits ?? []}
        keyExtractor={(h) => h.note.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !debounced.trim() && !hasFilters ? (
            <EmptyState icon="search" text={t('search.hint')} />
          ) : results.isFetched ? (
            <EmptyState icon="inbox" text={t('search.noResults')} />
          ) : undefined
        }
        renderItem={({ item }) => (
          <NoteCard
            note={item.note}
            tags={results.data?.tagMap.get(item.note.id)}
            badge={debounced.trim() ? (item.via === 'meaning' ? t('search.byMeaning') : t('search.byKeyword')) : undefined}
            onPress={() => navigation.navigate('Editor', { noteId: item.note.id })}
          />
        )}
      />
      {results.isFetching && (
        <AppText variant="caption" tone="faint" style={styles.fetching}>
          …
        </AppText>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { paddingHorizontal: space.lg, paddingTop: space.sm, gap: space.sm },
  filterRow: { gap: 6, alignItems: 'center', paddingVertical: 2 },
  sep: { width: 1, height: 18, marginHorizontal: 4 },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  fetching: { position: 'absolute', top: 8, right: 16 },
});
