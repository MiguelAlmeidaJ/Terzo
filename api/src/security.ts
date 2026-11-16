import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string) {
  try {
    const [algorithm, n, r, p, salt, hash] = stored.split('$');
    if (algorithm !== 'scrypt') return false;
    const expected = Buffer.from(hash, 'base64');
    const actual = scryptSync(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
    });
    return timingSafeEqual(expected, actual);
  } catch { return false; }
}

export const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
export const temporaryPassword = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return [...randomBytes(14)].map((value) => alphabet[value % alphabet.length]).join('');
};

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').flatMap((part) => {
    const index = part.indexOf('=');
    return index > 0 ? [[part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]] : [];
  }));
}

export function sessionCookie(value: string, secure: boolean, maxAge?: number) {
  return `terzo_sid=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}${maxAge == null ? '' : `; Max-Age=${maxAge}`}`;
}
