import test from 'node:test';
import assert from 'node:assert/strict';
import { encryptToken, decryptToken, maskToken } from './crypto';

test('encryptToken and decryptToken roundtrip correctly', () => {
  const original = 'github_pat_11AEXAMPLETOKEN_abcdef1234567890';
  const userId = 'user_firebase_uid_123';

  const encrypted = encryptToken(original, userId);
  assert.notEqual(encrypted, original);

  const decrypted = decryptToken(encrypted, userId);
  assert.equal(decrypted, original);
});

test('decryptToken fails if authentication tag or associated data is tampered', () => {
  const original = 'ghp_secrettoken999';
  const userId = 'user_1';

  const encrypted = encryptToken(original, userId);

  // Attempt decrypt with wrong associated data
  assert.throws(() => {
    decryptToken(encrypted, 'wrong_user_2');
  });

  // Tamper ciphertext
  const buf = Buffer.from(encrypted, 'base64');
  buf[buf.length - 1] ^= 0xff; // flip last bit
  assert.throws(() => {
    decryptToken(buf.toString('base64'), userId);
  });
});

test('maskToken safely truncates and masks PATs', () => {
  assert.equal(maskToken('ghp_abcdef1234567890'), 'ghp_...7890');
  assert.equal(maskToken('short'), '****');
});
