import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdBanner } from '../components/AdBanner';
import { Composer } from '../components/Composer';
import { NoteCard } from '../components/NoteCard';
import { AppText, Card, EmptyState, Field, IconButton } from '../components/ui';
import { getLinkCounts, getTagsForNotes } from '../db/graph';
import { listRecentNotes } from '../db/notes';
import { haptic } from '../lib/haptics';
import { useDb } from '../lib/useDb';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { FREE_MONTHLY_NOTES, notesLeftThisMonth } from '../services/capture';
import { dateKey, getOrCreateDailyNote, quickAddToToday } from '../services/daily';
import { space, useTheme } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Notes'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function NotesScreen({ navigation }: Props) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const [quick, setQuick] = useState('');

  const feed = useDb(['feed'], async () => {
    const notes = await listRecentNotes(100);
    const ids = notes.map((n) => n.id);
    const [tags, links, left] = await Promise.all([getTagsForNotes(ids), getLinkCounts(ids), notesLeftThisMonth()]);
    return { notes, tags, links, left };
  });

  const openToday = async () => {
    const note = await getOrCreateDailyNote();
    navigation.navigate('Editor', { noteId: note.id });
  };

  const addQuick = async () => {
    if (!quick.trim()) return;
    try {
      await quickAddToToday(quick);
      setQuick('');
      haptic.success();
    } catch (error) {
      Alert.alert(t('common.error'), String(error));
    }
  };

  const left = feed.data?.left;

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <AppText variant="title">{t('tabs.notes')}</AppText>
        <View style={styles.headerIcons}>
          <IconButton icon="bar-chart-2" label={t('insights.title')} onPress={() => navigation.navigate('Insights')} />
          <IconButton icon="layers" label={t('collections.title')} onPress={() => navigation.navigate('Collections')} />
          <IconButton icon="settings" label={t('settings.title')} onPress={() => navigation.navigate('Settings')} />
        </View>
      </View>
      <FlatList
        data={feed.data?.notes ?? []}
        keyExtractor={(n) => n.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Composer onLimit={() => navigation.navigate('Paywall')} />
            {left !== null && left !== undefined && left <= 10 && (
              <Card onPress={() => navigation.navigate('Paywall')}>
                <AppText variant="small" tone={left === 0 ? 'danger' : 'muted'}>
                  {left === 0
                    ? t('home.limitReached', { limit: FREE_MONTHLY_NOTES })
                    : `${left} / ${FREE_MONTHLY_NOTES} · ${t('common.upgrade')}`}
                </AppText>
              </Card>
            )}
            <Card style={{ gap: space.sm }}>
              <View style={styles.todayRow}>
                <AppText variant="label" tone="faint">
                  {t('home.todayCard')} · {dateKey()}
                </AppText>
                <IconButton icon="arrow-right" size={18} label={t('home.todayCard')} onPress={openToday} />
              </View>
              <Field
                value={quick}
                onChangeText={setQuick}
                placeholder={t('home.quickAdd')}
                returnKeyType="done"
                onSubmitEditing={addQuick}
                style={{ backgroundColor: c.bg }}
              />
            </Card>
          </View>
        }
        ListEmptyComponent={feed.isFetched ? <EmptyState icon="feather" text={t('home.empty')} /> : undefined}
        renderItem={({ item }) => (
          <NoteCard
            note={item}
            tags={feed.data?.tags.get(item.id)}
            relatedCount={feed.data?.links.get(item.id) ?? 0}
            onPress={() => navigation.navigate('Editor', { noteId: item.id })}
            onTagPress={(tag) => navigation.navigate('Search', { tagId: tag.id, tagName: tag.name })}
          />
        )}
      />
      <AdBanner />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
  },
  headerIcons: { flexDirection: 'row', gap: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: space.xxl },
  todayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
