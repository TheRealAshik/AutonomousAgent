import crypto from 'node:crypto';

// AES-256-GCM authenticated encryption for sensitive credentials like GitHub PATs
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for GCM
const TAG_LENGTH = 16; // Standard 128-bit authentication tag

// Derive or retrieve a 256-bit secret key
function getMasterKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_SECRET || process.env.GEMINI_API_KEY || 'octoagent-secure-master-encryption-key-fallback';
  // Use SHA-256 to ensure exactly 32 bytes (256 bits)
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plain text token (such as a GitHub PAT) using AES-256-GCM.
 * Output format: base64(iv:tag:ciphertext)
 */
export function encryptToken(plainText: string, associatedData?: string): string {
  if (!plainText) {
    throw new Error('Cannot encrypt empty token');
  }

  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  if (associatedData) {
    cipher.setAAD(Buffer.from(associatedData, 'utf-8'));
  }

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv (12 bytes), tag (16 bytes), and ciphertext
  const payload = Buffer.concat([iv, tag, encrypted]);
  return payload.toString('base64');
}

/**
 * Decrypts a token encrypted with encryptToken.
 * Validates GCM auth tag and associated data (e.g. userId).
 */
export function decryptToken(encryptedBase64: string, associatedData?: string): string {
  if (!encryptedBase64) {
    throw new Error('Cannot decrypt empty payload');
  }

  const key = getMasterKey();
  const payload = Buffer.from(encryptedBase64, 'base64');

  if (payload.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Invalid encrypted payload length');
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData, 'utf-8'));
  }

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Mask a GitHub token for safe display in UI or logs: e.g. "ghp_...7a9f"
 */
export function maskToken(token: string): string {
  if (!token || token.length < 8) return '****';
  const prefix = token.slice(0, 4);
  const suffix = token.slice(-4);
  return `${prefix}...${suffix}`;
}
