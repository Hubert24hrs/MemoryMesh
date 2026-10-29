import { getNetworkStateAsync } from 'expo-network';

import { isBackendConfigured } from '../lib/env';
import { isSignedIn } from '../store/session';

/** True when AI Edge Functions can be called right now. */
export async function canUseAI(): Promise<boolean> {
  if (!isBackendConfigured || !isSignedIn()) return false;
  try {
    const state = await getNetworkStateAsync();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}
