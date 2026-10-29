import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Note, Tag } from '../db/types';
import { noteExcerpt, noteTitle, relativeDay } from '../lib/format';
import { radius, space, useTheme } from '../theme/theme';
import { AppText, Chip, type IconName } from './ui';

const KIND_ICON: Record<Note['kind'], IconName> = {
  text: 'file-text',
  voice: 'mic',
  clip: 'link',
  daily: 'sun',
  digest: 'book-open',
};

export const NoteCard = memo(function NoteCard({
  note,
  tags,
  relatedCount = 0,
  onPress,
  onTagPress,
  badge,
}: {
  note: Note;
  tags?: Tag[];
  relatedCount?: number;
  onPress: () => void;
  onTagPress?: (tag: Tag) => void;
  badge?: string;
}) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const excerpt = noteExcerpt(note);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { borderBottomColor: c.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <View style={styles.meta}>
        <Feather name={KIND_ICON[note.kind]} size={12} color={c.textFaint} />
        <AppText variant="caption" tone="faint">
          {relativeDay(note.created_at)}
        </AppText>
        {note.ai_status === 'pending' && (
          <AppText variant="caption" tone="accent">
            · {t('home.aiPending')}
          </AppText>
        )}
        {note.ai_status === 'failed' && (
          <AppText variant="caption" tone="danger">
            · {t('home.aiFailed')}
          </AppText>
        )}
        {badge && (
          <View style={[styles.badge, { backgroundColor: c.accentSoft }]}>
            <AppText variant="caption" tone="accent">
              {badge}
            </AppText>
          </View>
        )}
      </View>
      <AppText variant="heading" numberOfLines={2}>
        {noteTitle(note)}
      </AppText>
      {excerpt ? (
        <AppText tone="muted" numberOfLines={3} style={{ marginTop: 2 }}>
          {excerpt}
        </AppText>
      ) : null}
      {(tags?.length || relatedCount > 0) && (
        <View style={styles.chips}>
          {tags?.slice(0, 3).map((tag) => (
            <Chip key={tag.id} label={`#${tag.name}`} onPress={onTagPress ? () => onTagPress(tag) : undefined} />
          ))}
          {relatedCount > 0 && <Chip icon="share-2" label={t('home.related', { count: relatedCount })} />}
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { paddingVertical: space.lg, borderBottomWidth: StyleSheet.hairlineWidth, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm },
  badge: { borderRadius: radius.pill, paddingHorizontal: 8, marginLeft: 'auto' },
});
