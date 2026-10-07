import crypto from 'crypto';

const AUTH_SECRET = process.env.AUTH_SECRET || 'miakhil-family-super-secure-key-2026-v1';

export function hashPassword(password: string): string {
  return crypto.createHmac('sha256', AUTH_SECRET).update(password).digest('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  const computed = hashPassword(password);
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
}

export function createToken(payload: { username: string; timestamp: number }): string {
  const data = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
  return Buffer.from(JSON.stringify({ data, sig })).toString('base64');
}

export function verifyToken(token: string): { username: string; timestamp: number } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const { data, sig } = JSON.parse(raw);
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(data).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(data);
    // Token valid for 30 days
    if (Date.now() - payload.timestamp > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
