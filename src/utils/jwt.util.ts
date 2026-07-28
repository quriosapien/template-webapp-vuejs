export interface JwtPayload {
  sub?: string;
  exp?: number;
  [claim: string]: unknown;
}

/**
 * Decodes a JWT payload WITHOUT verifying the signature — signature
 * verification belongs to the server. The client only needs claims (exp)
 * to decide when to refresh proactively.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  const segments = token.split('.');
  const payloadSegment = segments[1];
  if (segments.length !== 3 || payloadSegment === undefined) {
    return null;
  }

  try {
    const base64 = payloadSegment.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

/** A token without a readable exp claim is treated as expired (fail closed). */
export function isTokenExpired(token: string, skewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return true;
  }
  return payload.exp <= Math.floor(Date.now() / 1000) + skewSeconds;
}
