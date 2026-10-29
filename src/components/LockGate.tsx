import { Feather } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, StyleSheet, View } from 'react-native';

import { authenticateBiometric } from '../services/account';
import { useSettings } from '../store/settings';
import { space, useTheme } from '../theme/theme';
import { AppText, Button } from './ui';

/**
 * Covers the app with an opaque lock screen whenever biometric unlock is on
 * and the app returns from the background (also hides content in the app
 * switcher snapshot).
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const enabled = useSettings((s) => s.biometricLock);
  const [locked, setLocked] = useState(enabled);
  const prompting = useRef(false);

  const unlock = useCallback(async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      if (await authenticateBiometric(t('lock.unlock'))) setLocked(false);
    } finally {
      prompting.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        if (!prompting.current) setLocked(true);
      } else if (state === 'active') {
        void unlock();
      }
    });
    return () => sub.remove();
  }, [enabled, unlock]);

  useEffect(() => {
    if (enabled && locked) void unlock();
    // Only on first mount; later prompts come from AppState.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {enabled && locked && (
        <View style={[StyleSheet.absoluteFill, styles.lock, { backgroundColor: c.bg }]}>
          <Feather name="lock" size={32} color={c.accentText} />
          <AppText variant="heading">{t('lock.title')}</AppText>
          <Button label={t('lock.unlock')} icon="unlock" onPress={unlock} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lock: { alignItems: 'center', justifyContent: 'center', gap: space.lg },
});
