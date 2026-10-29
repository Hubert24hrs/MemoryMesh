import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';

import { AppText, Button, Chip, Field, SectionHeader, SettingRow } from '../components/ui';
import { getMeta } from '../db/database';
import { getRecoveryKey } from '../lib/crypto/keyStore';
import { isBackendConfigured } from '../lib/env';
import { relativeDay } from '../lib/format';
import { useDb } from '../lib/useDb';
import type { RootScreenProps } from '../navigation/types';
import {
  applyRecoveryKey,
  authenticateBiometric,
  biometricsAvailable,
  deleteAccount,
  eraseLocalData,
  setPreferredProvider,
  signOut,
} from '../services/account';
import { exportJson, exportMarkdown } from '../services/exporter';
import { runWorker, requestSync } from '../services/jobs';
import { restorePurchases } from '../services/purchases';
import { getLastSyncReport } from '../services/sync';
import { useSession } from '../store/session';
import { useSettings, type ProviderPreference, type ThemeMode } from '../store/settings';
import { space, useTheme } from '../theme/theme';

const PROVIDERS: { key: ProviderPreference; label: string }[] = [
  { key: 'auto', label: 'settings.providerAuto' },
  { key: 'anthropic', label: 'Claude' },
  { key: 'kimi', label: 'Kimi' },
  { key: 'openai', label: 'OpenAI' },
];

export function SettingsScreen({ navigation }: RootScreenProps<'Settings'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const settings = useSettings();
  const session = useSession((s) => s.session);
  const plan = useSession((s) => s.plan);
  const [keyInput, setKeyInput] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const lastSync = useDb(['meta', 'sync.lastAt'], () => getMeta('sync.lastAt'));
  const undecryptable = getLastSyncReport()?.undecryptable ?? 0;

  const run = async (label: string, task: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await task();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(null);
    }
  };

  const toggleBiometric = async (on: boolean) => {
    if (on && !(await biometricsAvailable())) return Alert.alert(t('settings.biometric'), t('common.error'));
    if (!(await authenticateBiometric(t('lock.unlock')))) return;
    settings.set({ biometricLock: on });
  };

  const showRecoveryKey = async () => {
    if (settings.biometricLock && !(await authenticateBiometric(t('settings.recoveryKey')))) return;
    const key = await getRecoveryKey();
    Alert.alert(t('settings.recoveryKey'), `${t('settings.recoveryKeyBody')}\n\n${key}`, [
      { text: t('common.close') },
      { text: t('settings.shareKey'), onPress: () => Share.share({ message: key }) },
    ]);
  };

  const chooseProvider = (key: ProviderPreference) => {
    if (plan !== 'pro') return navigation.navigate('Paywall');
    void run('provider', async () => {
      await setPreferredProvider(key === 'auto' ? null : key);
      settings.set({ providerPreference: key });
    });
  };

  const confirm = (title: string, body: string, action: () => Promise<unknown>) =>
    Alert.alert(title, body, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => run(title, action) },
    ]);

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.content}>
      <SectionHeader title={t('settings.account')} />
      {session ? (
        <>
          <SettingRow icon="user" label={t('settings.signedInAs', { email: session.user.email ?? '' })} />
          <SettingRow
            icon="refresh-cw"
            label={t('settings.syncNow')}
            detail={lastSync.data ? t('settings.lastSync', { when: relativeDay(Number(lastSync.data)) }) : undefined}
            onPress={() => run('sync', async () => {
              await requestSync();
              await runWorker();
            })}
          />
          {undecryptable > 0 && (
            <AppText variant="caption" tone="danger" style={{ marginTop: space.sm }}>
              {t('settings.undecryptable', { count: undecryptable })}
            </AppText>
          )}
          <SettingRow icon="log-out" label={t('settings.signOut')} onPress={() => run('signout', signOut)} />
        </>
      ) : (
        <>
          <SettingRow icon="user" label={t('settings.notSignedIn')} />
          {isBackendConfigured && <Button label={t('settings.signIn')} onPress={() => navigation.navigate('SignIn')} style={{ marginTop: space.md }} />}
        </>
      )}

      <SectionHeader title={t('settings.plan')} />
      <SettingRow
        icon="star"
        label={plan === 'pro' ? t('settings.planPro') : t('settings.planFree')}
        onPress={plan === 'pro' ? undefined : () => navigation.navigate('Paywall')}
      />
      <SettingRow icon="rotate-ccw" label={t('settings.restore')} onPress={() => run('restore', restorePurchases)} />

      <SectionHeader title={t('settings.ai')} />
      <SettingRow
        icon="zap"
        label={t('settings.aiDefault')}
        value={settings.aiByDefault}
        onValueChange={(v) => settings.set({ aiByDefault: v })}
      />
      <View style={[styles.disclosure, { backgroundColor: c.surface, borderColor: c.border }]}>
        <AppText variant="small" tone="muted">
          {t('settings.aiDisclosure')}
        </AppText>
      </View>
      <AppText variant="label" tone="faint" style={{ marginTop: space.lg }}>
        {t('settings.provider')}
      </AppText>
      <View style={styles.chips}>
        {PROVIDERS.map((p) => (
          <Chip
            key={p.key}
            label={p.label.startsWith('settings.') ? t(p.label) : p.label}
            selected={settings.providerPreference === p.key}
            onPress={() => chooseProvider(p.key)}
          />
        ))}
      </View>
      {plan !== 'pro' && (
        <AppText variant="caption" tone="faint">
          {t('settings.providerProOnly')}
        </AppText>
      )}

      <SectionHeader title={t('settings.security')} />
      <SettingRow icon="lock" label={t('settings.biometric')} value={settings.biometricLock} onValueChange={toggleBiometric} />
      <SettingRow icon="key" label={t('settings.recoveryKey')} detail={t('settings.recoveryKeyBody')} onPress={showRecoveryKey} />
      <SettingRow icon="download" label={t('settings.importKey')} onPress={() => setShowImport(!showImport)} />
      {showImport && (
        <View style={{ gap: space.sm, marginTop: space.sm }}>
          <AppText variant="caption" tone="faint">
            {t('settings.importKeyBody')}
          </AppText>
          <Field value={keyInput} onChangeText={setKeyInput} autoCapitalize="none" autoCorrect={false} secureTextEntry />
          <Button
            label={t('common.save')}
            disabled={!keyInput.trim()}
            loading={busy === 'key'}
            onPress={() =>
              run('key', async () => {
                await applyRecoveryKey(keyInput);
                setKeyInput('');
                setShowImport(false);
                Alert.alert(t('settings.keyImported'));
              })
            }
          />
        </View>
      )}

      <SectionHeader title={t('settings.appearance')} />
      <View style={styles.chips}>
        {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
          <Chip
            key={mode}
            label={t(`settings.theme${mode[0].toUpperCase()}${mode.slice(1)}`)}
            selected={settings.themeMode === mode}
            onPress={() => settings.set({ themeMode: mode })}
          />
        ))}
      </View>

      <SectionHeader title={t('settings.data')} />
      <SettingRow icon="file" label={t('settings.exportJson')} onPress={() => run('json', exportJson)} />
      <SettingRow icon="file-text" label={t('settings.exportMarkdown')} onPress={() => run('md', exportMarkdown)} />
      <SettingRow
        icon="smartphone"
        label={t('settings.deleteLocal')}
        tone="danger"
        onPress={() => confirm(t('settings.deleteLocal'), t('settings.deleteLocalBody'), eraseLocalData)}
      />
      {session && (
        <SettingRow
          icon="trash-2"
          label={t('settings.deleteAccount')}
          tone="danger"
          onPress={() => confirm(t('settings.deleteAccount'), t('settings.deleteAccountBody'), deleteAccount)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl * 2 },
  disclosure: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: space.md, marginTop: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: space.sm },
});
