import { Feather } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Chip, EmptyState, IconButton } from '../components/ui';
import { tList } from '../i18n';
import { noteTitle } from '../lib/format';
import { haptic } from '../lib/haptics';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { AIError } from '../services/ai';
import { answer, type ChatMessage } from '../services/chat';
import { useSession } from '../store/session';
import { radius, space, type as typeScale, useTheme } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Chat'>,
  NativeStackScreenProps<RootStackParamList>
>;

let idSeq = 0;
const newId = () => `m${++idSeq}`;

export function ChatScreen({ navigation }: Props) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const signedIn = useSession((s) => !!s.session);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useRef<FlatList<ChatMessage>>(null);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    haptic.tap();
    const history = messages;
    setMessages([...history, { id: newId(), role: 'user', content: question }]);
    setInput('');
    setBusy(true);
    try {
      const result = await answer(question, history);
      setMessages((m) => [
        ...m,
        {
          id: newId(),
          role: 'assistant',
          content: result.sources.length ? result.answer : `${result.answer}\n\n${t('chat.noAiNotes')}`,
          citations: result.citations,
          sources: result.sources.map((s) => ({ id: s.id, title: noteTitle(s) })),
          followups: result.followups,
        },
      ]);
    } catch (error) {
      const message =
        error instanceof AIError && error.code === 'quota_exceeded'
          ? error.message
          : error instanceof AIError && error.code === 'network'
            ? t('common.offline')
            : t('common.error');
      setMessages((m) => [...m, { id: newId(), role: 'assistant', content: message, error: true }]);
    } finally {
      setBusy(false);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  /** Render "[2]" markers as tappable links to the cited note. */
  const renderAnswer = (msg: ChatMessage) => {
    const byNumber = new Map(msg.citations?.map((cit) => [cit.n, cit.id]));
    const parts = msg.content.split(/(\[\d+\])/g);
    return (
      <Text style={[typeScale.body, { color: msg.error ? c.danger : c.text }]}>
        {parts.map((part, i) => {
          const n = Number(part.match(/^\[(\d+)\]$/)?.[1]);
          const id = byNumber.get(n);
          if (!id) return part;
          return (
            <Text
              key={i}
              onPress={() => navigation.navigate('Editor', { noteId: id })}
              style={{ color: c.accentText, fontFamily: typeScale.label.fontFamily }}
              accessibilityRole="link"
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  if (!signedIn) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: c.bg, justifyContent: 'center' }]}>
        <EmptyState icon="message-circle" text={t('common.signInRequired')}>
          <Button label={t('settings.signIn')} onPress={() => navigation.navigate('SignIn')} />
        </EmptyState>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <AppText variant="title">{t('tabs.chat')}</AppText>
        {messages.length > 0 && <IconButton icon="edit" label={t('chat.clear')} onPress={() => setMessages([])} />}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={{ gap: space.md, paddingTop: space.xl }}>
              <AppText tone="muted">{t('chat.empty')}</AppText>
              <View style={styles.wrap}>
                {tList('chat.examples').map((ex) => (
                  <Chip key={ex} label={ex} onPress={() => send(ex)} />
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) =>
            item.role === 'user' ? (
              <View style={[styles.userBubble, { backgroundColor: c.accentSoft }]}>
                <AppText>{item.content}</AppText>
              </View>
            ) : (
              <View style={styles.answer}>
                {renderAnswer(item)}
                {!!item.sources?.length && (
                  <View style={{ gap: 6 }}>
                    <AppText variant="caption" tone="faint">
                      {t('chat.sources')}
                    </AppText>
                    <View style={styles.wrap}>
                      {item.sources.map((s, i) => (
                        <Chip
                          key={s.id}
                          label={`${i + 1}. ${s.title}`}
                          selected={item.citations?.some((cit) => cit.id === s.id)}
                          onPress={() => navigation.navigate('Editor', { noteId: s.id })}
                        />
                      ))}
                    </View>
                  </View>
                )}
                {!!item.followups?.length && (
                  <View style={styles.wrap}>
                    {item.followups.map((f) => (
                      <Chip key={f} icon="corner-down-right" label={f} onPress={() => send(f)} />
                    ))}
                  </View>
                )}
              </View>
            )
          }
          ListFooterComponent={
            busy ? (
              <View style={styles.thinking}>
                <ActivityIndicator color={c.accentText} />
                <AppText variant="small" tone="muted">
                  {t('chat.thinking')}
                </AppText>
              </View>
            ) : undefined
          }
        />
        <View style={[styles.inputBar, { borderTopColor: c.border, backgroundColor: c.bg }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={c.textFaint}
            selectionColor={c.accent}
            multiline
            style={[typeScale.body, styles.input, { color: c.text, backgroundColor: c.surface }]}
          />
          <Pressable
            onPress={() => send(input)}
            disabled={!input.trim() || busy}
            accessibilityRole="button"
            accessibilityLabel={t('chat.placeholder')}
            style={[styles.send, { backgroundColor: input.trim() ? c.accent : c.surfaceAlt }]}
          >
            <Feather name="arrow-up" size={18} color={input.trim() ? c.onAccent : c.textFaint} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  list: { paddingHorizontal: space.lg, paddingBottom: space.lg, gap: space.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '85%', borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: space.sm },
  answer: { gap: space.md },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    padding: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: { flex: 1, maxHeight: 120, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: 10 },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
