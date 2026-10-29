import { randomBytes as nodeRandomBytes } from 'crypto';

import { fromBase64, toBase64, utf8Decode, utf8Encode } from '../src/lib/crypto/encoding';
import {
  DecryptionError,
  decryptJson,
  decryptString,
  encryptJson,
  encryptString,
  formatRecoveryKey,
  keyedId,
  parseRecoveryKey,
} from '../src/lib/crypto/encryption';

const random = (n: number) => new Uint8Array(nodeRandomBytes(n));
const key = random(32);

describe('AES-256-GCM envelope', () => {
  it('round-trips multilingual text and emoji', () => {
    const text = 'Réunion demain 🧠 — 明日の会議 — встреча завтра — اجتماع';
    const envelope = encryptString(key, text, random);
    expect(envelope.startsWith('v1.')).toBe(true);
    expect(envelope).not.toContain('Réunion');
    expect(decryptString(key, envelope)).toBe(text);
  });

  it('uses a fresh IV for every message', () => {
    const a = encryptString(key, 'same', random);
    const b = encryptString(key, 'same', random);
    expect(a).not.toBe(b);
    expect(a.split('.')[1]).not.toBe(b.split('.')[1]);
  });

  it('matches the AES-GCM known-answer vector (NIST test case 13: zero key, empty plaintext)', () => {
    const zeroKey = new Uint8Array(32);
    const envelope = encryptString(zeroKey, '', () => new Uint8Array(12));
    const tag = Array.from(fromBase64(envelope.split('.')[2]), (b) => b.toString(16).padStart(2, '0')).join('');
    expect(tag).toBe('530f8afbc74536b9a963b4f1c4cb738b');
  });

  it('rejects tampered ciphertext', () => {
    const envelope = encryptString(key, 'secret note', random);
    const [v, iv, ct] = envelope.split('.');
    const bytes = fromBase64(ct);
    bytes[0] ^= 0x01;
    expect(() => decryptString(key, `${v}.${iv}.${toBase64(bytes)}`)).toThrow(DecryptionError);
  });

  it('rejects the wrong key', () => {
    const envelope = encryptString(key, 'secret note', random);
    expect(() => decryptString(random(32), envelope)).toThrow(DecryptionError);
  });

  it('binds ciphertext to its record via AAD', () => {
    const envelope = encryptString(key, 'note A', random, 'notes:a');
    expect(decryptString(key, envelope, 'notes:a')).toBe('note A');
    expect(() => decryptString(key, envelope, 'notes:b')).toThrow(DecryptionError);
    expect(() => decryptString(key, envelope)).toThrow(DecryptionError);
  });

  it('rejects malformed envelopes and bad key sizes', () => {
    expect(() => decryptString(key, 'garbage')).toThrow(DecryptionError);
    expect(() => decryptString(key, 'v2.a.b')).toThrow(DecryptionError);
    expect(() => encryptString(random(16), 'x', random)).toThrow(/32 bytes/);
  });

  it('round-trips JSON payloads', () => {
    const value = { title: 'Plan', tags: ['work', 'q4'], actionItems: [{ text: 'Email Sam', done: false }] };
    expect(decryptJson(key, encryptJson(key, value, random, 'notes:1'), 'notes:1')).toEqual(value);
  });
});

describe('keyed ids and recovery keys', () => {
  it('keyedId is deterministic per key and hides the input', () => {
    expect(keyedId(key, 'travel')).toBe(keyedId(key, 'travel'));
    expect(keyedId(key, 'travel')).not.toBe(keyedId(random(32), 'travel'));
    expect(keyedId(key, 'travel')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('recovery key formatting round-trips', () => {
    const formatted = formatRecoveryKey(key);
    expect(formatted).toMatch(/^([A-Za-z0-9+/]{1,4}-)+[A-Za-z0-9+/]{1,4}$/);
    expect(Array.from(parseRecoveryKey(formatted))).toEqual(Array.from(key));
    expect(() => parseRecoveryKey('too-short')).toThrow(/not valid/);
  });
});

describe('encoding helpers', () => {
  it('utf8 and base64 match Node implementations', () => {
    const text = 'a ü 中 😀';
    expect(Buffer.from(utf8Encode(text)).toString('utf8')).toBe(text);
    expect(utf8Decode(new Uint8Array(Buffer.from(text, 'utf8')))).toBe(text);
    for (const len of [0, 1, 2, 3, 31, 32, 33]) {
      const bytes = random(len);
      expect(toBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'));
      expect(Array.from(fromBase64(toBase64(bytes)))).toEqual(Array.from(bytes));
    }
  });
});
