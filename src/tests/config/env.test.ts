import { describe, expect, it } from 'vitest';
import { parseEnv } from '@/config/env';

describe('parseEnv', () => {
  it('applies defaults when optional vars are missing', () => {
    const config = parseEnv({});
    expect(config.VITE_APP_NAME).toBe('template-webapp-vuejs');
    expect(config.VITE_API_BASE_URL).toBe('/api');
    expect(config.VITE_USE_MSW).toBe(false);
  });

  it('coerces boolean strings', () => {
    const config = parseEnv({ VITE_USE_MSW: 'true' });
    expect(config.VITE_USE_MSW).toBe(true);
  });

  it('rejects invalid values with a readable error', () => {
    expect(() => parseEnv({ VITE_USE_MSW: 'yes' })).toThrow(/VITE_USE_MSW/);
  });

  it('returns a frozen object', () => {
    expect(Object.isFrozen(parseEnv({}))).toBe(true);
  });
});
