import * as LocalAuthentication from 'expo-local-authentication';

import { notifyDataChanged } from '../db/changes';
import { resetDatabase } from '../db/database';
import { destroyDataKey, importRecoveryKey } from '../lib/crypto/keyStore';
import { supabase } from '../lib/supabase';
import { useSession } from '../store/session';
import { useSettings } from '../store/settings';
import { deleteAccountRemote } from './ai';
import { requestSync } from './jobs';
import { identifyPurchaser, refreshServerPlan, resetPurchaser } from './purchases';
import { resetSyncCursors } from './sync';

export async function sendSignInCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
  if (error) throw error;
}

export async function verifySignInCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: 'email' });
  if (error) throw error;
}

/** Runs after sign-in or session restore. */
export async function onSignedIn(userId: string): Promise<void> {
  await Promise.allSettled([identifyPurchaser(userId), refreshServerPlan()]);
  await requestSync();
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  await resetPurchaser();
  useSession.getState().setEntitlement('server', false);
}

export async function eraseLocalData(): Promise<void> {
  await resetDatabase();
  notifyDataChanged();
}

/** Deletes the server account and vectors, then wipes this device. */
export async function deleteAccount(): Promise<void> {
  await deleteAccountRemote();
  await supabase.auth.signOut().catch(() => undefined);
  await resetPurchaser();
  await eraseLocalData();
  await destroyDataKey();
  useSession.getState().setEntitlement('server', false);
  useSettings.getState().set({ onboarded: false, lastDigestWeek: null });
}

export async function applyRecoveryKey(key: string): Promise<void> {
  await importRecoveryKey(key);
  await resetSyncCursors();
  await requestSync();
}

export async function setPreferredProvider(provider: 'anthropic' | 'kimi' | 'openai' | null): Promise<void> {
  const { error } = await supabase.rpc('set_preferred_provider', { p_provider: provider });
  if (error) throw error;
}

export async function biometricsAvailable(): Promise<boolean> {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hardware && enrolled;
}

export async function authenticateBiometric(prompt: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: prompt });
  return result.success;
}
