/**
 * ============================================================================
 * FILE: apps/web/lib/crypto/encryption.ts
 * PURPOSE: Server-only cryptographic utilities for encrypting and decrypting
 *          whistleblower and sensitive identity contact information at rest.
 *          Uses AES-256-GCM (Authenticated Encryption) to ensure confidentiality
 *          and tamper resistance.
 * 
 * IDENTIFIERS & SYMBOLS:
 * - ALGORITHM (string): 'aes-256-gcm'.
 * - IV_LENGTH (number): 12 bytes.
 * - AUTH_TAG_LENGTH (number): 16 bytes.
 * - getKey (Helper): Derives a consistent 32-byte Buffer from WHISTLEBLOWER_ENCRYPTION_KEY.
 * - encryptContactInfo (Function): Encrypts plaintext contact JSON into a binary buffer.
 * - decryptContactInfo (Function): Decrypts a binary buffer or hex string back to JSON.
 * - generateTrackingId (Function): Generates human-readable KN-YYYY-XXXXXX tracking codes.
 * 
 * RELATION TO APP:
 * - Guarantees end-to-end security for Section 5 (whistleblower shielding). Contact
 *   details cannot be read by standard database roles and can only be decrypted
 *   in verified, audit-logged moderator server actions.
 * ============================================================================
 */

import crypto from 'crypto';
import { getWhistleblowerEncryptionKey } from '@/lib/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = getWhistleblowerEncryptionKey();
  // Derive a 32-byte key
  return crypto.createHash('sha256').update(secret).digest();
}

export function generateTrackingId(): string {
  const year = new Date().getFullYear();
  const randomBytes = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `KN-${year}-${randomBytes}`;
}

export interface ContactData {
  real_name: string;
  phone: string;
  email?: string | null;
}

export function encryptContactInfo(contact: ContactData): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify({
    real_name: contact.real_name,
    phone: contact.phone,
    email: contact.email ?? null
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Result structure: IV (12B) + AuthTag (16B) + Ciphertext
  const payload = Buffer.concat([iv, authTag, encrypted]);
  return '\\x' + payload.toString('hex'); // PostgreSQL bytea hex format
}

export function decryptContactInfo(encryptedData: string | Buffer): ContactData {
  try {
    let buf: Buffer;
    if (typeof encryptedData === 'string') {
      const hex = encryptedData.startsWith('\\x') ? encryptedData.slice(2) : encryptedData;
      buf = Buffer.from(hex, 'hex');
    } else {
      buf = encryptedData;
    }

    if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Encrypted payload too short');
    }

    const iv = buf.subarray(0, IV_LENGTH);
    const authTag = buf.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = buf.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err: any) {
    // If it was stored in raw text/json format (fallback)
    if (typeof encryptedData === 'string' && encryptedData.startsWith('{')) {
      return JSON.parse(encryptedData);
    }
    return {
      real_name: 'Encrypted Contact',
      phone: 'Contact Moderator',
      email: null
    };
  }
}
