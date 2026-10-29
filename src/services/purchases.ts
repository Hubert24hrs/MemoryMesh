import { Platform } from 'react-native';
import Purchases, { PACKAGE_TYPE, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { env } from '../lib/env';
import { supabase } from '../lib/supabase';
import { useSession } from '../store/session';

/** RevenueCat entitlement identifier configured in the dashboard. */
const ENTITLEMENT = 'pro';

let configured = false;

const apiKey = () => (Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey);

function applyCustomerInfo(info: CustomerInfo): void {
  useSession.getState().setEntitlement('store', !!info.entitlements.active[ENTITLEMENT]);
}

export function purchasesAvailable(): boolean {
  return configured;
}

export function initPurchases(): void {
  if (configured || !apiKey()) return;
  Purchases.configure({ apiKey: apiKey() });
  configured = true;
  Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
  Purchases.getCustomerInfo().then(applyCustomerInfo).catch(() => undefined);
}

/** Link purchases to the Supabase user so the webhook can update the profile. */
export async function identifyPurchaser(userId: string): Promise<void> {
  if (!configured) return;
  const { customerInfo } = await Purchases.logIn(userId);
  applyCustomerInfo(customerInfo);
}

export async function resetPurchaser(): Promise<void> {
  if (!configured) return;
  try {
    applyCustomerInfo(await Purchases.logOut());
  } catch {
    // already anonymous
  }
}

/** Server-side plan (RevenueCat webhook or promo), used for AI limits. */
export async function refreshServerPlan(): Promise<void> {
  const { data } = await supabase.from('profiles').select('plan, plan_expires_at').maybeSingle();
  const active = data?.plan === 'pro' && (!data.plan_expires_at || Date.parse(data.plan_expires_at) > Date.now());
  useSession.getState().setEntitlement('server', !!active);
}

export async function getPaywallPackages(): Promise<{ monthly?: PurchasesPackage; lifetime?: PurchasesPackage }> {
  if (!configured) return {};
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  return {
    monthly: packages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY),
    lifetime: packages.find((p) => p.packageType === PACKAGE_TYPE.LIFETIME),
  };
}

/** Returns true when the purchase completed; false when the user cancelled. */
export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    applyCustomerInfo(customerInfo);
    return !!customerInfo.entitlements.active[ENTITLEMENT];
  } catch (error) {
    if ((error as { userCancelled?: boolean }).userCancelled) return false;
    throw error;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  applyCustomerInfo(info);
  return !!info.entitlements.active[ENTITLEMENT];
}
