import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, IconButton } from '../components/ui';
import { tList } from '../i18n';
import { haptic } from '../lib/haptics';
import { useDb } from '../lib/useDb';
import type { RootScreenProps } from '../navigation/types';
import { getPaywallPackages, purchase, purchasesAvailable, restorePurchases } from '../services/purchases';
import { radius, space, useTheme } from '../theme/theme';

export function PaywallScreen({ navigation }: RootScreenProps<'Paywall'>) {
  const { c } = useTheme();
  const { t } = useTranslation();
  const packages = useDb(['paywall'], getPaywallPackages);
  const [choice, setChoice] = useState<'monthly' | 'lifetime'>('monthly');
  const [busy, setBusy] = useState(false);
  const selected: PurchasesPackage | undefined = packages.data?.[choice];

  const buy = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      if (await purchase(selected)) {
        haptic.success();
        Alert.alert(t('paywall.success'));
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert(t('common.error'), error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const option = (key: 'monthly' | 'lifetime') => {
    const pkg = packages.data?.[key];
    const active = choice === key;
    return (
      <Pressable
        key={key}
        onPress={() => {
          haptic.tap();
          setChoice(key);
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected: active, disabled: !pkg }}
        style={[styles.option, { borderColor: active ? c.accent : c.border, backgroundColor: active ? c.accentSoft : c.surface, opacity: pkg ? 1 : 0.5 }]}
      >
        <AppText variant="bodyMedium">{t(`paywall.${key}`)}</AppText>
        <AppText tone="muted">
          {pkg
            ? key === 'monthly'
              ? t('paywall.perMonth', { price: pkg.product.priceString })
              : t('paywall.oneTime', { price: pkg.product.priceString })
            : '—'}
        </AppText>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.bg }]}>
      <View style={styles.close}>
        <IconButton icon="x" label={t('common.close')} onPress={() => navigation.goBack()} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">{t('paywall.title')}</AppText>
        <AppText tone="muted">{t('paywall.subtitle')}</AppText>
        <View style={{ gap: space.md, marginVertical: space.xl }}>
          {tList('paywall.features').map((f) => (
            <View key={f} style={styles.feature}>
              <Feather name="check" size={18} color={c.accentText} />
              <AppText style={{ flex: 1 }}>{f}</AppText>
            </View>
          ))}
        </View>
        {purchasesAvailable() ? (
          <View style={{ gap: space.sm }}>
            {option('monthly')}
            {option('lifetime')}
          </View>
        ) : (
          <AppText tone="faint">{t('paywall.unavailable')}</AppText>
        )}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={t('paywall.subscribe')} onPress={buy} loading={busy} disabled={!selected} />
        <Button kind="ghost" label={t('paywall.restore')} onPress={() => restorePurchases().then((ok) => ok && navigation.goBack())} />
        <AppText variant="caption" tone="faint" style={{ textAlign: 'center' }}>
          {t('paywall.legal')}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { alignItems: 'flex-end', paddingHorizontal: space.md },
  content: { paddingHorizontal: space.xl, gap: space.sm },
  feature: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  option: { borderWidth: 1.5, borderRadius: radius.lg, padding: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  footer: { padding: space.xl, gap: space.sm },
});
