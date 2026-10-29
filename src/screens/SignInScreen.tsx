import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, Field } from '../components/ui';
import { haptic } from '../lib/haptics';
import type { RootScreenProps } from '../navigation/types';
import { sendSignInCode, verifySignInCode } from '../services/account';
import { space, useTheme } from '../theme/theme';

/** Passwordless email sign-in with a one-time code. */
export function SignInScreen({ navigation }: RootScreenProps<'SignIn'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <AppText tone="muted">{sent ? t('auth.sent', { email }) : t('auth.body')}</AppText>
      {!sent ? (
        <>
          <Field
            value={email}
            onChangeText={setEmail}
            placeholder={t('auth.email')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Button
            label={t('auth.sendCode')}
            loading={busy}
            disabled={!/^\S+@\S+\.\S+$/.test(email)}
            onPress={() => run(async () => {
              await sendSignInCode(email);
              setSent(true);
            })}
          />
        </>
      ) : (
        <>
          <Field
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder={t('auth.code')}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
          />
          <Button
            label={t('auth.verify')}
            loading={busy}
            disabled={code.length !== 6}
            onPress={() => run(async () => {
              await verifySignInCode(email, code);
              haptic.success();
              navigation.goBack();
            })}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space.xl, gap: space.md },
});
