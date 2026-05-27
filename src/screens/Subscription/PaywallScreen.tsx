// src/screens/Subscription/PaywallScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { HolographicBackground } from '../../components/HolographicBackground';
import { GlassCard } from '../../components/GlassCard';
import MemoryCrystal from '../../components/3D/MemoryCrystal';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { useHaptics } from '../../hooks/useHaptics';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

export const PaywallScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { purchasePro, purchaseLifetime, restorePurchases, isLoading } = useSubscriptionStore();
  const { triggerLight, triggerSuccess, triggerError } = useHaptics();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'lifetime'>('monthly');

  const handlePurchase = async () => {
    triggerLight();
    let success = false;
    if (billingCycle === 'monthly') {
      success = await purchasePro();
    } else {
      success = await purchaseLifetime();
    }

    if (success) {
      triggerSuccess();
      Alert.alert('Synapse Complete', 'Welcome to Pro-tier neural expansions!', [
        { text: 'Unleash', onPress: () => navigation.goBack() }
      ]);
    } else {
      triggerError();
    }
  };

  const handleRestore = async () => {
    triggerLight();
    const success = await restorePurchases();
    if (success) {
      triggerSuccess();
      Alert.alert('Restored', 'Your Pro synapses have been re-established.', [
        { text: 'Dismiss', onPress: () => navigation.goBack() }
      ]);
    } else {
      triggerError();
      Alert.alert('Restore Failed', 'No active subscription transactions found on this account.');
    }
  };

  return (
    <View style={styles.container}>
      <HolographicBackground />

      {/* Top right close button */}
      <Pressable onPress={() => { triggerLight(); navigation.goBack(); }} style={styles.closeBtn}>
        <Ionicons name="close" size={24} color="#ffffff" />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated 3D crystal showcase */}
        <View style={styles.crystalWrapper}>
          <MemoryCrystal />
        </View>

        <Text style={styles.title}>Unlock MemoryMesh Pro</Text>
        <Text style={styles.subtitle}>EXPAND COGNITION WITHOUT LIMITATIONS</Text>

        {/* Feature Comparison */}
        <GlassCard style={styles.featuresCard} glowColor="#FF0080">
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#00F5FF" />
            <Text style={styles.featureText}>Unlimited semantic memory captures (vs 50/mo)</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#00F5FF" />
            <Text style={styles.featureText}>Parallel multi-AIs orchestration (Claude + OpenAI + Kimi)</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#00F5FF" />
            <Text style={styles.featureText}>Infinite Pinecone vector index queries</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={20} color="#00F5FF" />
            <Text style={styles.featureText}>Zero sponsor ads on your feed</Text>
          </View>
        </GlassCard>

        {/* Billing cycle toggles */}
        <View style={styles.togglesRow}>
          <Pressable 
            onPress={() => { triggerLight(); setBillingCycle('monthly'); }}
            style={[styles.toggleBtn, billingCycle === 'monthly' && styles.activeToggleBtn]}
          >
            <Text style={[styles.toggleBtnTitle, billingCycle === 'monthly' && styles.activeToggleText]}>MONTHLY PRO</Text>
            <Text style={[styles.toggleBtnDesc, billingCycle === 'monthly' && styles.activeToggleDesc]}>$9.99 / month</Text>
          </Pressable>
          
          <Pressable 
            onPress={() => { triggerLight(); setBillingCycle('lifetime'); }}
            style={[styles.toggleBtn, billingCycle === 'lifetime' && styles.activeToggleBtn]}
          >
            <Text style={[styles.toggleBtnTitle, billingCycle === 'lifetime' && styles.activeToggleText]}>LIFETIME ACCESS</Text>
            <Text style={[styles.toggleBtnDesc, billingCycle === 'lifetime' && styles.activeToggleDesc]}>$49.99 once</Text>
          </Pressable>
        </View>

        {/* Action button triggers */}
        <Pressable onPress={handlePurchase} disabled={isLoading} style={styles.purchaseBtn}>
          {isLoading ? (
            <ActivityIndicator color="#00F5FF" />
          ) : (
            <Text style={styles.purchaseBtnText}>
              {billingCycle === 'monthly' ? 'START 7-DAY FREE TRIAL' : 'ESTABLISH LIFETIME CORE'}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreBtnText}>RESTORE PRIOR INTEGRATIONS</Text>
        </Pressable>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A1A',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 80,
    alignItems: 'center',
  },
  crystalWrapper: {
    width: '100%',
    height: 200,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    textShadowColor: '#FF0080',
    textShadowRadius: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 9,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#B026FF',
    letterSpacing: 2.0,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  featuresCard: {
    width: '100%',
    padding: 20,
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  togglesRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.02)',
    alignItems: 'center',
  },
  activeToggleBtn: {
    borderColor: '#00F5FF',
    backgroundColor: 'rgba(0, 245, 255, 0.05)',
  },
  toggleBtnTitle: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Bold',
    color: 'rgba(255, 255, 255, 0.4)',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  activeToggleText: {
    color: '#00F5FF',
  },
  toggleBtnDesc: {
    fontSize: 13,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#64748b',
  },
  activeToggleDesc: {
    color: '#ffffff',
  },
  purchaseBtn: {
    width: '100%',
    height: 52,
    backgroundColor: 'rgba(255, 0, 128, 0.15)',
    borderColor: '#FF0080',
    borderWidth: 1.5,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF0080',
    shadowRadius: 10,
    shadowOpacity: 0.4,
    elevation: 8,
    marginBottom: 16,
  },
  purchaseBtnText: {
    color: '#FF0080',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 13,
    letterSpacing: 2.0,
  },
  restoreBtn: {
    paddingVertical: 8,
  },
  restoreBtnText: {
    color: '#64748b',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 10,
    letterSpacing: 1.5,
  },
});
export default PaywallScreen;
