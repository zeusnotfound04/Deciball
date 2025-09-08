import { randomBytes } from 'crypto';

export function generateShortId(length: number = 8): string {
  return randomBytes(Math.ceil(length * 3 / 4))
    .toString('base64')
    .replace(/[+/]/g, '')
    .slice(0, length);
}

export function generateNanoId(length: number = 8): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const bytes = randomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  
  return result;
}

export function generateHexId(length: number = 8): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}
export const generateId = generateNanoId;
