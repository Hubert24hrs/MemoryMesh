import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { AppText, Chip, Field, IconButton, SectionHeader, SettingRow } from '../components/ui';
import {
  addToCollection,
  addUserLink,
  addUserTag,
  getCollectionIdsForNote,
  getLinkedNotes,
  getTagsForNotes,
  listCollections,
  type CollectionWithCount,
  type LinkedNote,
  removeFromCollection,
  removeLink,
  removeTag,
} from '../db/graph';
import { deleteNote, getNote, queueAiProcessing, updateNote } from '../db/notes';
import { parseActionItems, parseAttachments, type Note, type Tag } from '../db/types';
import { noteTitle } from '../lib/format';
import { haptic } from '../lib/haptics';
import { useDb } from '../lib/useDb';
import type { RootScreenProps } from '../navigation/types';
import { relatedToDraft } from '../services/search';
import { radius, space, type as typeScale, useTheme } from '../theme/theme';

const AUTOSAVE_MS = 800;
const COPILOT_MS = 900;

interface EditorData {
  note: Note;
  tags: Tag[];
  linked: LinkedNote[];
  collections: CollectionWithCount[];
  memberOf: Set<string>;
}

export function EditorScreen({ route, navigation }: RootScreenProps<'Editor'>) {
  const { noteId } = route.params;
  const { c } = useTheme();
  const noteQuery = useDb(['note', noteId], async (): Promise<EditorData | null> => {
    const note = await getNote(noteId);
    if (!note) return null;
    const [tags, linked, collections, memberOf] = await Promise.all([
      getTagsForNotes([noteId]),
      getLinkedNotes(noteId),
      listCollections(),
      getCollectionIdsForNote(noteId),
    ]);
    return { note, tags: tags.get(noteId) ?? [], linked, collections, memberOf };
  });
  if (!noteQuery.data) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  // Keyed so local editing state is seeded from the note exactly once per note.
  return <NoteEditor key={noteId} data={noteQuery.data} navigation={navigation} />;
}

function NoteEditor({ data, navigation }: { data: EditorData; navigation: RootScreenProps<'Editor'>['navigation'] }) {
  const { note } = data;
  const noteId = note.id;
  const { c } = useTheme();
  const { t } = useTranslation();

  const [title, setTitle] = useState(note.title_by_user ? note.title : '');
  const [body, setBody] = useState(note.body);
  const [dirty, setDirty] = useState(false);
  const [newTag, setNewTag] = useState('');
  const latest = useRef({ title, body, dirty: false });
  const selection = useRef({ start: 0, end: 0 });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // AI may clean up a voice transcript while the note is open: adopt it unless the user has edited.
  const [seenBody, setSeenBody] = useState(note.body);
  if (note.body !== seenBody) {
    setSeenBody(note.body);
    if (!dirty) setBody(note.body);
  }

  const edit = (next: { title: string; body: string }) => {
    setTitle(next.title);
    setBody(next.body);
    setDirty(true);
    latest.current = { ...next, dirty: true };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void updateNote(noteId, next, { processAi: false });
    }, AUTOSAVE_MS);
  };

  // Flush pending edits and run AI once when leaving the note.
  useEffect(
    () =>
      navigation.addListener('beforeRemove', () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        const { title: lastTitle, body: lastBody, dirty: wasEdited } = latest.current;
        if (!wasEdited) return;
        void (async () => {
          await updateNote(noteId, { title: lastTitle, body: lastBody }, { processAi: false });
          await queueAiProcessing(noteId);
        })();
      }),
    [navigation, noteId],
  );

  const confirmDelete = useCallback(() => {
    Alert.alert(t('editor.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          latest.current.dirty = false;
          await deleteNote(noteId);
          haptic.warning();
          navigation.goBack();
        },
      },
    ]);
  }, [navigation, noteId, t]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <IconButton icon="trash-2" label={t('common.delete')} onPress={confirmDelete} />,
    });
  }, [navigation, confirmDelete, t]);

  // Copilot: related notes for the current draft (debounced).
  const [copilot, setCopilot] = useState<{ notes: Note[]; offline: boolean }>({ notes: [], offline: false });
  const aiEnabled = !!note.ai_enabled;
  const draftLongEnough = body.trim().length >= 40;
  useEffect(() => {
    if (!draftLongEnough) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await relatedToDraft(body, noteId, aiEnabled).catch(() => ({ notes: [], offline: true }));
      if (!cancelled) setCopilot(result);
    }, COPILOT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [body, noteId, aiEnabled, draftLongEnough]);

  const linkedIds = new Set(data.linked.map((l) => l.id));
  const suggestions = draftLongEnough ? copilot.notes.filter((n) => !linkedIds.has(n.id)) : [];

  const insertLink = async (target: Note) => {
    const label = `[[${noteTitle(target)}]]`;
    const { start, end } = selection.current;
    const at = Math.min(start, body.length);
    edit({ title, body: body.slice(0, at) + label + body.slice(Math.max(end, at)) });
    await addUserLink(noteId, target.id);
    haptic.success();
  };

  const actionItems = parseActionItems(note);
  const attachments = parseAttachments(note);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={(v) => edit({ title: v, body })}
          placeholder={note.title && !note.title_by_user ? note.title : t('editor.titlePlaceholder')}
          placeholderTextColor={note.title && !note.title_by_user ? c.textMuted : c.textFaint}
          selectionColor={c.accent}
          style={[typeScale.title, { color: c.text }]}
          multiline
        />
        <TextInput
          value={body}
          onChangeText={(v) => edit({ title, body: v })}
          onSelectionChange={(e) => (selection.current = e.nativeEvent.selection)}
          placeholder={t('editor.bodyPlaceholder')}
          placeholderTextColor={c.textFaint}
          selectionColor={c.accent}
          multiline
          autoFocus={!note.body}
          style={[typeScale.body, styles.body, { color: c.text }]}
        />

        {attachments.length > 0 && (
          <View style={styles.attachments}>
            {attachments.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.attachment} accessibilityLabel={t('editor.attachments')} />
            ))}
          </View>
        )}
        {note.source_url && (
          <Pressable onPress={() => Linking.openURL(note.source_url!)} style={styles.source}>
            <Feather name="external-link" size={14} color={c.accentText} />
            <AppText variant="small" tone="accent" numberOfLines={1} style={{ flex: 1 }}>
              {note.source_url}
            </AppText>
          </Pressable>
        )}

        <View style={{ marginTop: space.xl }}>
          <SettingRow
            icon="zap"
            label={t('editor.aiToggle')}
            detail={!aiEnabled ? t('editor.aiOffHint') : note.ai_status === 'pending' ? t('home.aiPending') : undefined}
            value={aiEnabled}
            onValueChange={(v) => updateNote(noteId, { aiEnabled: v, title, body })}
          />
          {note.ai_status === 'failed' && (
            <SettingRow icon="refresh-cw" label={t('editor.retryAi')} tone="danger" onPress={() => queueAiProcessing(noteId)} />
          )}
        </View>

        {note.summary ? (
          <>
            <SectionHeader title={t('editor.summary')} />
            <AppText tone="muted">{note.summary}</AppText>
          </>
        ) : null}

        {actionItems.length > 0 && (
          <>
            <SectionHeader title={t('editor.actionItems')} />
            {actionItems.map((item, i) => (
              <Pressable
                key={`${item.text}-${i}`}
                style={styles.task}
                onPress={() => {
                  haptic.tap();
                  const next = actionItems.map((a, j) => (j === i ? { ...a, done: !a.done } : a));
                  void updateNote(noteId, { actionItems: next }, { processAi: false });
                }}
              >
                <Feather name={item.done ? 'check-square' : 'square'} size={18} color={item.done ? c.accentText : c.textMuted} />
                <AppText style={{ flex: 1, textDecorationLine: item.done ? 'line-through' : 'none' }} tone={item.done ? 'faint' : 'default'}>
                  {item.text}
                </AppText>
              </Pressable>
            ))}
          </>
        )}

        <SectionHeader title={t('editor.tags')} />
        <View style={styles.chips}>
          {data.tags.map((tag) => (
            <Chip key={tag.id} label={`#${tag.name}`} onRemove={() => removeTag(noteId, tag.id)} />
          ))}
          <Field
            value={newTag}
            onChangeText={setNewTag}
            placeholder={t('editor.addTag')}
            onSubmitEditing={async () => {
              await addUserTag(noteId, newTag);
              setNewTag('');
            }}
            returnKeyType="done"
            style={styles.tagInput}
          />
        </View>

        {data.linked.length > 0 && (
          <>
            <SectionHeader title={t('editor.linked')} />
            <View style={styles.chips}>
              {data.linked.map((l) => (
                <Chip
                  key={l.id}
                  icon={l.link_kind === 'ai' ? 'zap' : 'link-2'}
                  label={noteTitle(l)}
                  onPress={() => navigation.push('Editor', { noteId: l.id })}
                  onRemove={() => removeLink(noteId, l.id)}
                />
              ))}
            </View>
          </>
        )}

        {data.collections.length > 0 && (
          <>
            <SectionHeader title={t('editor.collections')} />
            <View style={styles.chips}>
              {data.collections.map((col) => {
                const member = data.memberOf.has(col.id);
                return (
                  <Chip
                    key={col.id}
                    label={col.name}
                    selected={member}
                    onPress={() => (member ? removeFromCollection(col.id, noteId) : addToCollection(col.id, noteId))}
                  />
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {suggestions.length > 0 && (
        <View style={[styles.copilot, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <AppText variant="caption" tone="faint">
            {t('editor.copilot')} · {copilot.offline ? t('editor.copilotOffline') : t('editor.copilotHint')}
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="always">
            {suggestions.map((n) => (
              <Chip key={n.id} icon="plus" label={noteTitle(n)} onPress={() => insertLink(n)} />
            ))}
          </ScrollView>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 120 },
  body: { minHeight: 200, marginTop: space.md, textAlignVertical: 'top' },
  attachments: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  attachment: { width: 120, height: 120, borderRadius: radius.md },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.md },
  task: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  tagInput: { minWidth: 120, paddingVertical: 4, borderRadius: radius.pill },
  copilot: { borderTopWidth: StyleSheet.hairlineWidth, padding: space.md, gap: space.sm },
});
