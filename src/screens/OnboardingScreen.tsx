import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, SettingRow, type IconName } from '../components/ui';
import { isBackendConfigured } from '../lib/env';
import { haptic } from '../lib/haptics';
import type { RootScreenProps } from '../navigation/types';
import { authenticateBiometric, biometricsAvailable } from '../services/account';
import { useSettings } from '../store/settings';
import { radius, space, useTheme } from '../theme/theme';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  { icon: 'edit-3', title: 'onboarding.step1Title', body: 'onboarding.step1Body' },
  { icon: 'zap', title: 'onboarding.step2Title', body: 'onboarding.step2Body' },
  { icon: 'lock', title: 'onboarding.step3Title', body: 'onboarding.step3Body' },
];

export function OnboardingScreen({ navigation }: RootScreenProps<'Onboarding'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const settings = useSettings();
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const toggleBiometric = async (on: boolean) => {
    if (on && !(await biometricsAvailable())) {
      Alert.alert(t('settings.biometric'), t('common.error'));
      return;
    }
    if (on && !(await authenticateBiometric(t('lock.unlock')))) return;
    settings.set({ biometricLock: on });
  };

  const finish = (signIn: boolean) => {
    haptic.success();
    settings.set({ onboarded: true });
    if (signIn) setTimeout(() => navigation.navigate('SignIn'), 300);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i === step ? c.accent : c.surfaceAlt }]} />
        ))}
      </View>
      <View style={styles.content}>
        <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
          <Feather name={current.icon} size={28} color={c.accentText} />
        </View>
        <AppText variant="title">{t(current.title)}</AppText>
        <AppText tone="muted">{t(current.body)}</AppText>
        {step === 1 && (
          <View style={{ marginTop: space.lg }}>
            <SettingRow
              label={t('onboarding.step2Toggle')}
              value={settings.aiByDefault}
              onValueChange={(v) => settings.set({ aiByDefault: v })}
            />
            <AppText variant="caption" tone="faint" style={{ marginTop: space.sm }}>
              {t('onboarding.step2Privacy')}
            </AppText>
          </View>
        )}
        {step === 2 && (
          <View style={{ marginTop: space.lg }}>
            <SettingRow label={t('onboarding.step3Toggle')} value={settings.biometricLock} onValueChange={toggleBiometric} />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        {step < STEPS.length - 1 ? (
          <Button label={t('common.continue')} onPress={() => setStep(step + 1)} />
        ) : (
          <>
            <Button label={t('onboarding.start')} onPress={() => finish(false)} />
            {isBackendConfigured && <Button kind="ghost" label={t('onboarding.signIn')} onPress={() => finish(true)} />}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space.xl },
  dots: { flexDirection: 'row', gap: 6, marginTop: space.lg },
  dot: { height: 4, flex: 1, borderRadius: 2 },
  content: { flex: 1, justifyContent: 'center', gap: space.md },
  icon: { width: 56, height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  footer: { gap: space.sm, paddingBottom: space.lg },
});
