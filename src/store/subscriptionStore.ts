// src/store/subscriptionStore.ts
import { create } from 'zustand';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';
import { analyticsService } from '../services/analytics';

const REVENUECAT_API_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS || 'mock_ios_key';
const REVENUECAT_API_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID || 'mock_android_key';

type PlanType = 'free' | 'pro' | 'lifetime';

interface SubscriptionState {
  plan: PlanType;
  isPro: boolean;
  expiresAt: string | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  purchasePro: () => Promise<boolean>;
  purchaseLifetime: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  plan: 'free',
  isPro: false,
  expiresAt: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      
      // Prevent crashing if running mock credentials
      if (apiKey.includes('mock_')) {
        console.warn('⚠️ RevenueCat credentials set to mock. Enabling simulated Pro features.');
        set({ plan: 'pro', isPro: true, expiresAt: '2030-01-01T00:00:00Z', isLoading: false });
        return;
      }

      await Purchases.configure({ apiKey });
      
      const customerInfo = await Purchases.getCustomerInfo();
      const entitlements = customerInfo.entitlements.active;

      if (entitlements['pro_subscription']) {
        set({
          plan: 'pro',
          isPro: true,
          expiresAt: entitlements['pro_subscription'].expirationDate,
          isLoading: false,
        });
      } else if (entitlements['lifetime_access']) {
        set({
          plan: 'lifetime',
          isPro: true,
          expiresAt: null,
          isLoading: false,
        });
      } else {
        set({ plan: 'free', isPro: false, expiresAt: null, isLoading: false });
      }
    } catch (e: any) {
      console.error('RevenueCat initialization failed:', e);
      // Fail-safe default
      set({ plan: 'free', isPro: false, expiresAt: null, isLoading: false, error: e.message });
    }
  },

  purchasePro: async (): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      if (apiKey.includes('mock_')) {
        set({ plan: 'pro', isPro: true, expiresAt: '2030-01-01T00:00:00Z', isLoading: false });
        await analyticsService.trackEvent('subscription_purchased', { plan: 'pro_mock' });
        return true;
      }

      const offerings = await Purchases.getOfferings();
      const monthlyPackage = offerings.current?.monthly;
      if (!monthlyPackage) {
        throw new Error('Pro subscription package not found');
      }

      const { customerInfo } = await Purchases.purchasePackage(monthlyPackage);
      const activePro = customerInfo.entitlements.active['pro_subscription'];
      
      if (activePro) {
        set({
          plan: 'pro',
          isPro: true,
          expiresAt: activePro.expirationDate,
          isLoading: false,
        });
        await analyticsService.trackEvent('subscription_purchased', { plan: 'pro' });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (e: any) {
      console.error('Purchase Pro failed:', e);
      set({ error: e.message || 'Purchase process failed', isLoading: false });
      return false;
    }
  },

  purchaseLifetime: async (): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
      if (apiKey.includes('mock_')) {
        set({ plan: 'lifetime', isPro: true, expiresAt: null, isLoading: false });
        await analyticsService.trackEvent('subscription_purchased', { plan: 'lifetime_mock' });
        return true;
      }

      const offerings = await Purchases.getOfferings();
      const lifetimePackage = offerings.current?.lifetime;
      if (!lifetimePackage) {
        throw new Error('Lifetime package not found');
      }

      const { customerInfo } = await Purchases.purchasePackage(lifetimePackage);
      const activeLifetime = customerInfo.entitlements.active['lifetime_access'];

      if (activeLifetime) {
        set({
          plan: 'lifetime',
          isPro: true,
          expiresAt: null,
          isLoading: false,
        });
        await analyticsService.trackEvent('subscription_purchased', { plan: 'lifetime' });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (e: any) {
      console.error('Purchase Lifetime failed:', e);
      set({ error: e.message || 'Purchase process failed', isLoading: false });
      return false;
    }
  },

  restorePurchases: async (): Promise<boolean> => {
    set({ isLoading: true, error: null });
    try {
      const customerInfo = await Purchases.restorePurchases();
      const entitlements = customerInfo.entitlements.active;

      if (entitlements['pro_subscription']) {
        set({
          plan: 'pro',
          isPro: true,
          expiresAt: entitlements['pro_subscription'].expirationDate,
          isLoading: false,
        });
        return true;
      } else if (entitlements['lifetime_access']) {
        set({
          plan: 'lifetime',
          isPro: true,
          expiresAt: null,
          isLoading: false,
        });
        return true;
      }
      set({ plan: 'free', isPro: false, expiresAt: null, isLoading: false });
      return false;
    } catch (e: any) {
      console.error('Restore purchases failed:', e);
      set({ error: e.message || 'Restore process failed', isLoading: false });
      return false;
    }
  },
}));
