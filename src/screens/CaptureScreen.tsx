import { Feather } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { File } from 'expo-file-system';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Card, Field, SettingRow } from '../components/ui';
import { queueAiProcessing, updateNote } from '../db/notes';
import { deviceLocale } from '../i18n';
import { haptic } from '../lib/haptics';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import { transcribeAudio } from '../services/ai';
import { NoteLimitError, captureNote } from '../services/capture';
import { quickAddToToday } from '../services/daily';
import { canUseAI } from '../services/online';
import { useSettings } from '../store/settings';
import { radius, space, useTheme } from '../theme/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Capture'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Phase = 'idle' | 'listening' | 'saving';
const MAX_RECORDING_MS = 10 * 60_000; // keeps 16 kHz audio under the 25 MB Whisper limit

export function CaptureScreen({ navigation }: Props) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const aiByDefault = useSettings((s) => s.aiByDefault);
  const [ai, setAi] = useState<boolean | null>(null);
  const aiOn = ai ?? aiByDefault;
  const aiRef = useRef(aiOn);
  useEffect(() => {
    aiRef.current = aiOn;
  }, [aiOn]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [quick, setQuick] = useState('');

  const finals = useRef<string[]>([]);
  const audioUri = useRef<string | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Android emits one final result per utterance; iOS emits a cumulative transcript.
  const latest = useRef('');
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    const previous = finals.current.join(' ');
    if (event.isFinal) {
      finals.current = previous && text.startsWith(previous) ? [text] : [...finals.current, text];
      latest.current = finals.current.join(' ');
    } else {
      latest.current = previous && !text.startsWith(previous) ? `${previous} ${text}` : text;
    }
    setTranscript(latest.current);
  });
  useSpeechRecognitionEvent('audioend', (event) => {
    audioUri.current = event.uri;
  });
  useSpeechRecognitionEvent('error', (event) => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') Alert.alert(t('common.error'), event.message);
  });

  const start = async () => {
    if (phase !== 'idle') return;
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      Alert.alert(t('capture.unavailable'));
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('capture.permission'));
      return;
    }
    finals.current = [];
    latest.current = '';
    audioUri.current = null;
    setTranscript('');
    setPhase('listening');
    haptic.light();
    ExpoSpeechRecognitionModule.start({
      lang: deviceLocale,
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      recordingOptions: {
        persist: true,
        outputFileName: `voice-${Date.now()}.wav`,
        outputSampleRate: 16000,
        outputEncoding: 'pcmFormatInt16',
      },
    });
    stopTimer.current = setTimeout(() => ExpoSpeechRecognitionModule.stop(), MAX_RECORDING_MS);
  };

  const stop = () => {
    if (phase === 'listening') ExpoSpeechRecognitionModule.stop();
  };

  const finish = async () => {
    setPhase('saving');
    const live = (finals.current.join(' ') || latest.current).trim();
    const withAi = aiRef.current;
    const uri = audioUri.current;
    try {
      if (!live && !uri) return;
      const note = await captureNote({ kind: 'voice', body: live, aiEnabled: withAi, processAi: false });
      haptic.success();
      // With AI on, replace the on-device transcript with Whisper's, then clean it up.
      if (withAi) {
        if (uri && (await canUseAI())) {
          try {
            const { text } = await transcribeAudio(uri);
            if (text.trim()) await updateNote(note.id, { body: text.trim() }, { processAi: false });
          } catch {
            // keep the on-device transcript
          }
        }
        await queueAiProcessing(note.id);
      }
      navigation.navigate('Editor', { noteId: note.id });
    } catch (error) {
      if (error instanceof NoteLimitError) navigation.navigate('Paywall');
      else Alert.alert(t('common.error'), String(error));
    } finally {
      // Audio is only kept long enough to transcribe.
      if (uri) {
        try {
          new File(uri).delete();
        } catch {
          // already gone
        }
      }
      setPhase('idle');
      setTranscript('');
    }
  };

  useSpeechRecognitionEvent('end', () => {
    if (stopTimer.current) clearTimeout(stopTimer.current);
    void finish();
  });

  const addQuick = async () => {
    if (!quick.trim()) return;
    await quickAddToToday(quick);
    setQuick('');
    haptic.success();
  };

  const listening = phase === 'listening';

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title">{t('tabs.capture')}</AppText>

        <View style={styles.recorder}>
          <Pressable
            onPressIn={start}
            onPressOut={stop}
            accessibilityRole="button"
            accessibilityLabel={t('capture.hold')}
            style={[
              styles.mic,
              { backgroundColor: listening ? c.accent : c.surface, borderColor: listening ? c.accent : c.border },
            ]}
          >
            <Feather name="mic" size={40} color={listening ? c.onAccent : c.accentText} />
          </Pressable>
          <AppText tone="muted">
            {phase === 'saving' ? t('capture.processing') : listening ? t('capture.listening') : t('capture.hold')}
          </AppText>
          {transcript ? (
            <Card style={{ alignSelf: 'stretch' }}>
              <AppText>{transcript}</AppText>
            </Card>
          ) : null}
        </View>

        <SettingRow icon="zap" label={t('editor.aiToggle')} value={aiOn} onValueChange={setAi} />

        <AppText variant="heading" style={{ marginTop: space.xl }}>
          {t('capture.quickTitle')}
        </AppText>
        <Field
          value={quick}
          onChangeText={setQuick}
          placeholder={t('capture.dailyPlaceholder')}
          returnKeyType="done"
          onSubmitEditing={addQuick}
          style={{ marginTop: space.sm }}
        />

        <Card style={{ marginTop: space.xl, gap: space.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
            <Feather name="share" size={16} color={c.accentText} />
            <AppText variant="bodyMedium">{t('capture.clipTitle')}</AppText>
          </View>
          <AppText variant="small" tone="muted">
            {t('capture.clipBody')}
          </AppText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl },
  recorder: { alignItems: 'center', gap: space.lg, paddingVertical: space.xxl },
  mic: { width: 120, height: 120, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
