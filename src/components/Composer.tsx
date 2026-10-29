import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { haptic } from '../lib/haptics';
import { NoteLimitError, captureNote } from '../services/capture';
import { useSettings } from '../store/settings';
import { radius, space, type as typeScale, useTheme } from '../theme/theme';

/** The always-open capture box at the top of Notes. */
export function Composer({ onLimit }: { onLimit: () => void }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const aiByDefault = useSettings((s) => s.aiByDefault);
  const [text, setText] = useState('');
  const [ai, setAi] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const aiOn = ai ?? aiByDefault;

  const save = async () => {
    const body = text.trim();
    if (!body || saving) return;
    setSaving(true);
    try {
      await captureNote({ body, aiEnabled: aiOn });
      setText('');
      setAi(null);
      haptic.success();
    } catch (error) {
      if (error instanceof NoteLimitError) onLimit();
      else Alert.alert(t('common.error'), error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.box, { backgroundColor: c.surface, borderColor: c.border }]}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t('home.placeholder')}
        placeholderTextColor={c.textFaint}
        selectionColor={c.accent}
        multiline
        style={[typeScale.body, styles.input, { color: c.text }]}
        accessibilityLabel={t('home.placeholder')}
      />
      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            haptic.tap();
            setAi(!aiOn);
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: aiOn }}
          accessibilityLabel={t('editor.aiToggle')}
          hitSlop={8}
          style={[styles.aiPill, { backgroundColor: aiOn ? c.accentSoft : 'transparent', borderColor: aiOn ? c.accent : c.border }]}
        >
          <Feather name="zap" size={13} color={aiOn ? c.accentText : c.textFaint} />
        </Pressable>
        <Pressable
          onPress={save}
          disabled={!text.trim() || saving}
          accessibilityRole="button"
          accessibilityLabel={t('home.capture')}
          style={[styles.send, { backgroundColor: text.trim() ? c.accent : c.surfaceAlt }]}
        >
          <Feather name="arrow-up" size={18} color={text.trim() ? c.onAccent : c.textFaint} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  input: { minHeight: 48, maxHeight: 160, paddingTop: 0, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.sm },
  aiPill: { borderWidth: 1, borderRadius: radius.pill, padding: 7 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
