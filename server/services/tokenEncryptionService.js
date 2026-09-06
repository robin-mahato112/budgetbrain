import crypto from 'crypto';
import { env } from '../config/env.js';

const key = crypto.createHash('sha256').update(env.INTEGRATION_ENCRYPTION_KEY || env.JWT_SECRET).digest();

export function encryptToken(value) {
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptToken(value) {
  if (!value) return null;
  const [iv, tag, encrypted] = String(value).split('.').map((item) => Buffer.from(item, 'base64url'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
