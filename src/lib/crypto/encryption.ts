import { gcm } from '@noble/ciphers/aes.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { fromBase64, toBase64, utf8Decode, utf8Encode } from './encoding';

/**
 * AES-256-GCM envelope encryption for data that leaves the device.
 *
 * Envelope format: `v1.<base64 iv>.<base64 ciphertext||tag>`
 * - 96-bit random IV per message (never reused with the same key)
 * - 128-bit auth tag; any tampering makes decryption throw
 * - optional AAD binds a ciphertext to its context (e.g. `notes:<id>`) so a
 *   server cannot swap ciphertexts between records undetected
 */

export const KEY_BYTES = 32;
const IV_BYTES = 12;
const VERSION = 'v1';

export type RandomBytes = (length: number) => Uint8Array;

export class DecryptionError extends Error {
  constructor(message = 'Unable to decrypt data') {
    super(message);
    this.name = 'DecryptionError';
  }
}

function assertKey(key: Uint8Array): void {
  if (key.length !== KEY_BYTES) throw new Error(`Encryption key must be ${KEY_BYTES} bytes`);
}

export function encryptString(
  key: Uint8Array,
  plaintext: string,
  randomBytes: RandomBytes,
  aad?: string,
): string {
  assertKey(key);
  const iv = randomBytes(IV_BYTES);
  if (iv.length !== IV_BYTES) throw new Error('Random source returned wrong IV length');
  const cipher = gcm(key, iv, aad === undefined ? undefined : utf8Encode(aad));
  const sealed = cipher.encrypt(utf8Encode(plaintext));
  return `${VERSION}.${toBase64(iv)}.${toBase64(sealed)}`;
}

export function decryptString(key: Uint8Array, envelope: string, aad?: string): string {
  assertKey(key);
  const parts = envelope.split('.');
  if (parts.length !== 3 || parts[0] !== VERSION) throw new DecryptionError('Unknown envelope format');
  try {
    const iv = fromBase64(parts[1]);
    if (iv.length !== IV_BYTES) throw new DecryptionError('Bad IV');
    const cipher = gcm(key, iv, aad === undefined ? undefined : utf8Encode(aad));
    return utf8Decode(cipher.decrypt(fromBase64(parts[2])));
  } catch (error) {
    if (error instanceof DecryptionError) throw error;
    throw new DecryptionError();
  }
}

export function encryptJson(key: Uint8Array, value: unknown, randomBytes: RandomBytes, aad?: string): string {
  return encryptString(key, JSON.stringify(value), randomBytes, aad);
}

export function decryptJson<T>(key: Uint8Array, envelope: string, aad?: string): T {
  return JSON.parse(decryptString(key, envelope, aad)) as T;
}

/**
 * Deterministic, keyed identifier (HMAC-SHA256). Used for tag ids so two
 * devices that create the same tag converge on one row without the server
 * learning the tag name.
 */
export function keyedId(key: Uint8Array, value: string): string {
  assertKey(key);
  const mac = hmac(sha256, key, utf8Encode(value));
  return Array.from(mac.subarray(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Human-friendly recovery key: base64 split into groups of 4. */
export function formatRecoveryKey(key: Uint8Array): string {
  assertKey(key);
  return (toBase64(key).replace(/=+$/, '').match(/.{1,4}/g) ?? []).join('-');
}

export function parseRecoveryKey(input: string): Uint8Array {
  const key = fromBase64(input.replace(/[-\s]/g, ''));
  if (key.length !== KEY_BYTES) throw new Error('Recovery key is not valid');
  return key;
}
