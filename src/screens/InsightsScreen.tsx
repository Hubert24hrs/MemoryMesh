import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { NoteCard } from '../components/NoteCard';
import { AppText, Button, Card, Chip, SectionHeader } from '../components/ui';
import type { Mood } from '../db/types';
import { deviceLocale } from '../i18n';
import { haptic } from '../lib/haptics';
import { useDb } from '../lib/useDb';
import type { RootScreenProps } from '../navigation/types';
import { AIError } from '../services/ai';
import { generateWeeklyDigest, weekKey } from '../services/daily';
import { computeInsights } from '../services/insights';
import { canUseAI } from '../services/online';
import { useSettings } from '../store/settings';
import { radius, space, useTheme } from '../theme/theme';

const MOOD_ORDER: Mood[] = ['positive', 'neutral', 'mixed', 'negative'];

export function InsightsScreen({ navigation }: RootScreenProps<'Insights'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const lastDigestWeek = useSettings((s) => s.lastDigestWeek);
  const [busy, setBusy] = useState(false);
  const insights = useDb(['insights'], () => computeInsights());
  const data = insights.data;
  const max = Math.max(1, ...(data?.perDay.map((d) => d.count) ?? [1]));
  const moodTotal = data ? MOOD_ORDER.reduce((sum, m) => sum + data.moods[m], 0) : 0;
  const moodColor: Record<Mood, string> = { positive: c.accent, neutral: c.textFaint, mixed: c.textMuted, negative: c.danger };

  const digest = async () => {
    if (!(await canUseAI())) {
      Alert.alert(t('common.signInRequired'));
      return;
    }
    setBusy(true);
    try {
      const note = await generateWeeklyDigest();
      if (!note) Alert.alert(t('insights.digestEmpty'));
      else {
        haptic.success();
        navigation.navigate('Editor', { noteId: note.id });
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof AIError ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <Card style={{ gap: space.md }}>
        <View style={styles.rowBetween}>
          <AppText variant="heading">{t('insights.thisWeek')}</AppText>
          <AppText variant="title">{data.weekTotal}</AppText>
        </View>
        <AppText variant="caption" tone="faint">
          {t('insights.notesPerDay')} · {t('insights.lastWeek', { count: data.previousWeekTotal })}
        </AppText>
        <View style={styles.bars} accessibilityLabel={t('insights.notesPerDay')}>
          {data.perDay.map((d) => (
            <View key={d.date.toISOString()} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: c.surfaceAlt }]}>
                <View style={[styles.bar, { height: `${(d.count / max) * 100}%`, backgroundColor: c.accent }]} />
              </View>
              <AppText variant="caption" tone="faint">
                {d.date.toLocaleDateString(deviceLocale, { weekday: 'narrow' })}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <SectionHeader title={t('insights.digest')} />
      <Button
        icon="book-open"
        kind={lastDigestWeek === weekKey() ? 'secondary' : 'primary'}
        label={t('insights.digestButton')}
        loading={busy}
        onPress={digest}
      />

      {data.topTags.length > 0 && (
        <>
          <SectionHeader title={t('insights.topTags')} />
          <View style={styles.wrap}>
            {data.topTags.map((tag) => (
              <Chip key={tag.name} label={`#${tag.name} · ${tag.count}`} />
            ))}
          </View>
        </>
      )}

      <SectionHeader title={t('insights.mood')} />
      {moodTotal === 0 ? (
        <AppText variant="small" tone="faint">
          {t('insights.moodNone')}
        </AppText>
      ) : (
        <View style={{ gap: space.sm }}>
          <View style={[styles.moodBar, { backgroundColor: c.surfaceAlt }]}>
            {MOOD_ORDER.filter((m) => data.moods[m] > 0).map((m) => (
              <View key={m} style={{ flex: data.moods[m], backgroundColor: moodColor[m] }} />
            ))}
          </View>
          <View style={styles.wrap}>
            {MOOD_ORDER.filter((m) => data.moods[m] > 0).map((m) => (
              <AppText key={m} variant="caption" tone="muted">
                {t(`insights.moods.${m}`)} {Math.round((data.moods[m] / moodTotal) * 100)}%
              </AppText>
            ))}
          </View>
        </View>
      )}

      {data.resurfaced.length > 0 && (
        <>
          <SectionHeader title={t('insights.resurfaced')} />
          {data.resurfaced.map(({ note, daysAgo }) => (
            <NoteCard
              key={note.id}
              note={note}
              badge={t('insights.onThisDay', {
                when: new Intl.RelativeTimeFormat(deviceLocale, { numeric: 'auto' }).format(-daysAgo, 'day'),
              })}
              onPress={() => navigation.navigate('Editor', { noteId: note.id })}
            />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bars: { flexDirection: 'row', gap: space.sm, height: 110, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  barTrack: { flex: 1, width: '100%', borderRadius: radius.sm, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radius.sm, minHeight: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  moodBar: { flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden' },
});
