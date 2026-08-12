import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Module 5 security headers contract guard.
 *
 * Parses vercel.json and pins the production security-header contract on the
 * catch-all route: a Content-Security-Policy locked to same-origin (with
 * 'unsafe-inline' styles, which recharts/React inline styles require), plus
 * Referrer-Policy, X-Content-Type-Options, X-Frame-Options, and
 * Permissions-Policy. A header removed or a directive dropped from the CSP
 * fails here — inside `npm test`, therefore inside the release gate.
 */

interface VercelHeader {
  key: string;
  value: string;
}

interface VercelHeaderRule {
  source: string;
  headers: VercelHeader[];
}

interface VercelConfig {
  headers?: VercelHeaderRule[];
}

const vercelConfig = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig;

const GLOBAL_SOURCE = '/(.*)';
const REQUIRED_HEADER_KEYS = [
  'Content-Security-Policy',
  'Referrer-Policy',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Permissions-Policy',
] as const;
const REQUIRED_CSP_DIRECTIVES = [
  'default-src',
  'script-src',
  'style-src',
  'frame-ancestors',
  'object-src',
] as const;

function globalRule(): VercelHeaderRule {
  const rule = vercelConfig.headers?.find(
    (candidate) => candidate.source === GLOBAL_SOURCE,
  );

  if (!rule) {
    throw new Error(
      `vercel.json security-header contract: no headers rule exists for ` +
        `${GLOBAL_SOURCE}; the catch-all route must carry the v1.3 security ` +
        'headers',
    );
  }

  return rule;
}

function headerValue(rule: VercelHeaderRule, key: string): string | undefined {
  return rule.headers.find((header) => header.key === key)?.value;
}

describe('vercel.json security headers contract', () => {
  it('carries all five security headers on the catch-all route', () => {
    const rule = globalRule();

    for (const key of REQUIRED_HEADER_KEYS) {
      expect(
        headerValue(rule, key),
        `vercel.json security-header contract: ${GLOBAL_SOURCE} must set ` +
          `${key}`,
      ).toBeDefined();
    }
  });

  it('locks the Content-Security-Policy to the required directives', () => {
    const rule = globalRule();
    const csp = headerValue(rule, 'Content-Security-Policy');

    expect(
      csp,
      'vercel.json CSP contract: Content-Security-Policy must be present on ' +
        GLOBAL_SOURCE,
    ).toBeDefined();

    for (const directive of REQUIRED_CSP_DIRECTIVES) {
      expect(
        csp,
        `vercel.json CSP contract: Content-Security-Policy must include the ` +
          `${directive} directive`,
      ).toContain(directive);
    }
  });
});
