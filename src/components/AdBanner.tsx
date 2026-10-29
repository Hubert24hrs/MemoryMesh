import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import mobileAds, { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

import { env } from '../lib/env';
import { useSession } from '../store/session';

let adsStarted = false;

function startAds() {
  if (adsStarted) return;
  adsStarted = true;
  void mobileAds().initialize();
}

/** Free plan only. Non-personalized ads, so no tracking prompt is required. */
export function AdBanner() {
  const plan = useSession((s) => s.plan);
  useEffect(() => {
    if (plan !== 'pro') startAds();
  }, [plan]);
  if (plan === 'pro') return null;
  const configured = Platform.OS === 'ios' ? env.admobBannerIos : env.admobBannerAndroid;
  const unitId = __DEV__ || !configured ? TestIds.ADAPTIVE_BANNER : configured;
  return (
    <View style={{ alignItems: 'center' }}>
      <BannerAd
        unitId={unitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}
