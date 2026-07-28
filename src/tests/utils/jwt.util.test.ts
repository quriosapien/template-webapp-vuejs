import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, isTokenExpired } from '@/utils/jwt.util';

/** Builds an unsigned JWT-shaped token, mirroring what the MSW handlers issue. */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.mock-signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe('decodeJwtPayload', () => {
  it('decodes the payload segment', () => {
    const token = makeToken({ sub: 'u_1', exp: 1234 });
    expect(decodeJwtPayload(token)).toEqual({ sub: 'u_1', exp: 1234 });
  });

  it('returns null for malformed tokens', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('a.b')).toBeNull();
    expect(decodeJwtPayload('a.%%%.c')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('is false for a token expiring well in the future', () => {
    expect(isTokenExpired(makeToken({ exp: nowSeconds() + 3600 }))).toBe(false);
  });

  it('is true for an expired token', () => {
    expect(isTokenExpired(makeToken({ exp: nowSeconds() - 60 }))).toBe(true);
  });

  it('treats tokens inside the clock-skew window as expired', () => {
    expect(isTokenExpired(makeToken({ exp: nowSeconds() + 10 }), 30)).toBe(true);
  });

  it('treats tokens without exp as expired', () => {
    expect(isTokenExpired(makeToken({ sub: 'u_1' }))).toBe(true);
  });
});
