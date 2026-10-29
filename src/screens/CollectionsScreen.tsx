import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import { NoteCard } from '../components/NoteCard';
import { AppText, Button, Card, EmptyState, Field, IconButton, SectionHeader } from '../components/ui';
import {
  createCollection,
  deleteCollection,
  getCollectionNotes,
  getTagsForNotes,
  listCollections,
  suggestCollections,
} from '../db/graph';
import { haptic } from '../lib/haptics';
import { useDb } from '../lib/useDb';
import type { RootScreenProps } from '../navigation/types';
import { space, useTheme } from '../theme/theme';

export function CollectionsScreen({ navigation }: RootScreenProps<'Collections'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const data = useDb(['collections'], async () => {
    const [collections, suggestions] = await Promise.all([listCollections(), suggestCollections()]);
    return { collections, suggestions };
  });

  const create = async () => {
    if (!name.trim()) return;
    await createCollection(name);
    setName('');
    haptic.success();
  };

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.content}
      data={data.data?.collections ?? []}
      keyExtractor={(col) => col.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: space.sm, marginBottom: space.md }}>
          <View style={styles.newRow}>
            <Field value={name} onChangeText={setName} placeholder={t('collections.namePlaceholder')} style={{ flex: 1 }} onSubmitEditing={create} />
            <Button label={t('collections.create')} onPress={create} disabled={!name.trim()} />
          </View>
          {(data.data?.suggestions.length ?? 0) > 0 && (
            <>
              <SectionHeader title={t('collections.suggested')} />
              {data.data!.suggestions.map((s) => (
                <Card key={s.name} style={styles.suggestion}>
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyMedium">{s.name}</AppText>
                    <AppText variant="caption" tone="faint">
                      {t('collections.notes', { count: s.noteIds.length })}
                    </AppText>
                  </View>
                  <Button kind="secondary" icon="plus" label={t('collections.create')} onPress={() => createCollection(s.name, true, s.noteIds)} />
                </Card>
              ))}
            </>
          )}
          <SectionHeader title={t('collections.title')} />
        </View>
      }
      ListEmptyComponent={data.isFetched ? <EmptyState icon="layers" text={t('collections.empty')} /> : undefined}
      renderItem={({ item }) => (
        <Card
          style={styles.item}
          onPress={() => navigation.navigate('Collection', { id: item.id, name: item.name })}
        >
          <View style={{ flex: 1 }}>
            <AppText variant="bodyMedium">{item.name}</AppText>
            <AppText variant="caption" tone="faint">
              {t('collections.notes', { count: item.count })}
              {item.ai_suggested ? ' · AI' : ''}
            </AppText>
          </View>
          <IconButton
            icon="trash-2"
            size={18}
            label={t('common.delete')}
            onPress={() =>
              Alert.alert(t('collections.deleteConfirm'), undefined, [
                { text: t('common.cancel'), style: 'cancel' },
                { text: t('common.delete'), style: 'destructive', onPress: () => deleteCollection(item.id) },
              ])
            }
          />
        </Card>
      )}
    />
  );
}

export function CollectionScreen({ route, navigation }: RootScreenProps<'Collection'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const { id } = route.params;
  const data = useDb(['collection', id], async () => {
    const notes = await getCollectionNotes(id);
    return { notes, tags: await getTagsForNotes(notes.map((n) => n.id)) };
  });
  useLayoutEffect(() => navigation.setOptions({ title: route.params.name }), [navigation, route.params.name]);

  return (
    <FlatList
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.content}
      data={data.data?.notes ?? []}
      keyExtractor={(n) => n.id}
      ListEmptyComponent={data.isFetched ? <EmptyState icon="inbox" text={t('collections.empty')} /> : undefined}
      renderItem={({ item }) => (
        <NoteCard note={item} tags={data.data?.tags.get(item.id)} onPress={() => navigation.navigate('Editor', { noteId: item.id })} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.sm },
  newRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
});
