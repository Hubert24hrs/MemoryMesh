// src/screens/Settings/SettingsScreen.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable, SectionList, Switch, Alert } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useThemeStore } from '../../store/themeStore';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useHaptics } from '../../hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { signOut, biometricEnabled, enableBiometric } = useAuthStore();
  const { plan } = useSubscriptionStore();
  const { variant, setVariant } = useThemeStore();
  const { triggerLight, triggerSuccess } = useHaptics();

  const {
    preferredAIProvider,
    autoTranscribe,
    hapticEnabled,
    setPreferredAIProvider,
    setAutoTranscribe,
    setHapticEnabled,
  } = useSettingsStore();

  const handleSignOut = () => {
    triggerLight();
    Alert.alert('Sign Out', 'Are you sure you want to decouple your brain connection?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disconnect', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const handleTriggerPaywall = () => {
    triggerLight();
    navigation.navigate('Paywall', { trigger: 'settings' });
  };

  const handleBackup = () => {
    triggerSuccess();
    Alert.alert('Neural Export Complete', 'Your decrypted memories have been compiled into JSON and backed up locally.');
  };

  // Structured configurations list
  const sections = [
    {
      title: 'NEURAL ACCOUNT',
      data: [
        {
          label: 'Plan Entitlement',
          value: plan.toUpperCase(),
          onPress: handleTriggerPaywall,
          icon: 'ribbon-outline',
        },
        {
          label: 'Biometric Unlock',
          isSwitch: true,
          switchValue: biometricEnabled,
          onSwitchChange: enableBiometric,
          icon: 'finger-print-outline',
        },
      ],
    },
    {
      title: 'AI CONFIGURATIONS',
      data: [
        {
          label: 'Dominant AI Core',
          value: preferredAIProvider.toUpperCase(),
          onPress: () => {
            triggerLight();
            const next = preferredAIProvider === 'claude' ? 'kimi' : preferredAIProvider === 'kimi' ? 'openai' : 'claude';
            setPreferredAIProvider(next);
          },
          icon: 'hardware-chip-outline',
        },
        {
          label: 'Auto Audio Transcription',
          isSwitch: true,
          switchValue: autoTranscribe,
          onSwitchChange: setAutoTranscribe,
          icon: 'mic-outline',
        },
      ],
    },
    {
      title: 'APPEARANCE THEME',
      data: [
        {
          label: 'Design Aesthetics',
          value: variant.toUpperCase(),
          onPress: () => {
            triggerLight();
            const next = variant === 'holographic' ? 'cyberpunk' : variant === 'cyberpunk' ? 'synthwave' : variant === 'synthwave' ? 'minimal' : 'holographic';
            setVariant(next);
          },
          icon: 'color-palette-outline',
        },
        {
          label: 'Tactile Haptics',
          isSwitch: true,
          switchValue: hapticEnabled,
          onSwitchChange: setHapticEnabled,
          icon: 'phone-portrait-outline',
        },
      ],
    },
    {
      title: 'MEMORY DATA SYSTEMS',
      data: [
        {
          label: 'Backup Decrypted Synapses',
          onPress: handleBackup,
          icon: 'cloud-download-outline',
        },
        {
          label: 'Disconnect Cognitive Core',
          onPress: handleSignOut,
          icon: 'log-out-outline',
          isDestructive: true,
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <HolographicBackground />

      <View style={styles.header}>
        <Pressable onPress={() => { triggerLight(); navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#00F5FF" />
        </Pressable>
        <Text style={styles.title}>System Control</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item: any, index: number) => item.label + index}
        contentContainerStyle={styles.listContent}
        renderSectionHeader={({ section: { title } }: any) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }: any) => (
          <GlassCard style={styles.itemCard} glowColor={item.isDestructive ? '#ef4444' : 'rgba(255, 255, 255, 0.05)'}>
            {item.onPress ? (
              <Pressable onPress={item.onPress} style={styles.row}>
                <View style={styles.labelRow}>
                  <Ionicons name={item.icon as any} size={18} color={item.isDestructive ? '#ef4444' : '#00F5FF'} />
                  <Text style={[styles.itemLabel, item.isDestructive && styles.destructiveText]}>{item.label}</Text>
                </View>
                {item.value && (
                  <View style={styles.valRow}>
                    <Text style={styles.itemVal}>{item.value}</Text>
                    <Ionicons name="chevron-forward" size={14} color="#64748b" />
                  </View>
                )}
              </Pressable>
            ) : (
              <View style={styles.row}>
                <View style={styles.labelRow}>
                  <Ionicons name={item.icon as any} size={18} color="#00F5FF" />
                  <Text style={styles.itemLabel}>{item.label}</Text>
                </View>
                {item.isSwitch && (
                  <Switch
                    value={item.switchValue}
                    onValueChange={(val: boolean) => { triggerLight(); item.onSwitchChange!(val); }}
                    trackColor={{ false: '#767577', true: '#00F5FF30' }}
                    thumbColor={item.switchValue ? '#00F5FF' : '#f4f3f4'}
                  />
                )}
              </View>
            )}
          </GlassCard>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    textShadowColor: '#00F5FF',
    textShadowRadius: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 2.0,
    marginTop: 24,
    marginBottom: 10,
    marginLeft: 4,
  },
  itemCard: {
    marginVertical: 4,
    minHeight: 52,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  destructiveText: {
    color: '#ef4444',
  },
  valRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemVal: {
    color: '#00F5FF',
    fontSize: 12,
    fontFamily: 'SpaceGrotesk-Bold',
  },
});
export default SettingsScreen;
