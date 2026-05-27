// src/components/Ads/BannerAd.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useSubscriptionStore } from '../../store/subscriptionStore';

// In standard production build, we import Google Mobile Ads
// import { BannerAd as AdMobBanner, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export const AD_UNIT_ID = __DEV__ 
  ? 'ca-app-pub-3940256099942544/6300978111' // AdMob Test ID
  : process.env.EXPO_PUBLIC_ADMOB_BANNER_ID || 'ca-app-pub-placeholder';

export const BannerAd: React.FC = () => {
  const isPro = useSubscriptionStore((state) => state.isPro);

  // Pro users see zero advertisement modules
  if (isPro) return null;

  return (
    <View style={styles.container}>
      {/* Mocked/Fallback Ad view container for Expo Go / dev testing */}
      <View style={styles.adPlaceholder}>
        <Text style={styles.adTag}>SPONSOR AD</Text>
        <Text style={styles.adText}>Experience unlimited all-AIs access with MemoryMesh Pro!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 60,
    backgroundColor: '#0A0A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 245, 255, 0.1)',
  },
  adPlaceholder: {
    width: '90%',
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  adTag: {
    color: '#00F5FF',
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 1.0,
    marginBottom: 2,
  },
  adText: {
    color: '#94a3b8',
    fontFamily: 'Inter-Medium',
    fontSize: 11,
    textAlign: 'center',
  },
});
export default BannerAd;
