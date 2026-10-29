import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { KEY_BYTES, formatRecoveryKey, parseRecoveryKey, type RandomBytes } from './encryption';
import { fromBase64, toBase64 } from './encoding';

// The data key lives only in the iOS Keychain / Android Keystore-backed
// SecureStore. It never leaves the device except when the user explicitly
// views their recovery key.
const DATA_KEY_ID = 'memorymesh.dataKey.v1';
const STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export const secureRandomBytes: RandomBytes = (length) => Crypto.getRandomBytes(length);

let cached: Uint8Array | null = null;

export async function getDataKey(): Promise<Uint8Array> {
  if (cached) return cached;
  const stored = await SecureStore.getItemAsync(DATA_KEY_ID, STORE_OPTIONS);
  if (stored) {
    cached = fromBase64(stored);
    return cached;
  }
  const key = secureRandomBytes(KEY_BYTES);
  await SecureStore.setItemAsync(DATA_KEY_ID, toBase64(key), STORE_OPTIONS);
  cached = key;
  return key;
}

export async function getRecoveryKey(): Promise<string> {
  return formatRecoveryKey(await getDataKey());
}

/** Replace this device's key, e.g. to read data encrypted on another device. */
export async function importRecoveryKey(input: string): Promise<void> {
  const key = parseRecoveryKey(input);
  await SecureStore.setItemAsync(DATA_KEY_ID, toBase64(key), STORE_OPTIONS);
  cached = key;
}

export async function destroyDataKey(): Promise<void> {
  await SecureStore.deleteItemAsync(DATA_KEY_ID, STORE_OPTIONS);
  cached = null;
}
