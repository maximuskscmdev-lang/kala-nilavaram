import { describe, expect, it } from 'vitest';
import { decryptContactInfo, encryptContactInfo, generateTrackingId } from './encryption';

describe('encryptContactInfo / decryptContactInfo', () => {
  it('round-trips contact data including email', () => {
    const contact = { real_name: 'Ada Lovelace', phone: '+91 98765 43210', email: 'ada@example.com' };
    const encrypted = encryptContactInfo(contact);
    expect(encrypted).toMatch(/^\\x[0-9a-f]+$/);
    expect(decryptContactInfo(encrypted)).toEqual(contact);
  });

  it('round-trips contact data without email', () => {
    const contact = { real_name: 'Alan Turing', phone: '+91 11111 22222' };
    const encrypted = encryptContactInfo(contact);
    expect(decryptContactInfo(encrypted)).toEqual({
      real_name: 'Alan Turing',
      phone: '+91 11111 22222',
      email: null
    });
  });

  it('produces unique ciphertexts for identical input (random IV)', () => {
    const contact = { real_name: 'Grace Hopper', phone: '+91 55555 55555' };
    expect(encryptContactInfo(contact)).not.toBe(encryptContactInfo(contact));
  });

  it('does not leak plaintext into the ciphertext', () => {
    const encrypted = encryptContactInfo({ real_name: 'Secret Name', phone: '123456' });
    expect(encrypted.toLowerCase()).not.toContain('secret');
  });

  it('returns a safe fallback for garbage input', () => {
    const result = decryptContactInfo('not-encrypted');
    expect(result.real_name).toBe('Encrypted Contact');
    expect(result.phone).toBe('Contact Moderator');
  });

  it('returns a safe fallback for tampered ciphertext instead of leaking', () => {
    const encrypted = encryptContactInfo({ real_name: 'Ada Lovelace', phone: '+91 98765 43210' });
    const buf = Buffer.from(encrypted.slice(2), 'hex');
    buf[buf.length - 1] ^= 0xff; // corrupt the final ciphertext byte
    const result = decryptContactInfo('\\x' + buf.toString('hex'));
    expect(result.real_name).toBe('Encrypted Contact');
  });

  it('returns a safe fallback for truncated payloads', () => {
    const result = decryptContactInfo('\\xabcd');
    expect(result.real_name).toBe('Encrypted Contact');
  });

  it('still parses legacy plaintext JSON payloads', () => {
    const legacy = JSON.stringify({ real_name: 'Legacy User', phone: '+91 00000 00000', email: null });
    expect(decryptContactInfo(legacy)).toEqual(JSON.parse(legacy));
  });
});

describe('generateTrackingId', () => {
  it('produces KN-YYYY-XXXXXX format', () => {
    const id = generateTrackingId();
    expect(id).toMatch(/^KN-\d{4}-[0-9A-F]{6}$/);
  });

  it('produces unique ids across many calls', () => {
    const ids = new Set(Array.from({ length: 200 }, () => generateTrackingId()));
    expect(ids.size).toBe(200);
  });
});