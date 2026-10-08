import { createHash } from 'node:crypto';

import type { Page, Route } from '@playwright/test';

import { createSimulatedNhost } from '../../tests/infra/simulatedNhostCore.mjs';

/**
 * A SIMULATED provider for browser tests, answered inside the browser: no
 * connection to the real Nhost project is ever made. It wraps the repository's
 * offline simulation of the Stage-1 table and sign-in, and adds the three Auth
 * endpoints that simulation does not model and the email-link flow needs:
 * sign-up (verification required), the PKCE token exchange (the code must be
 * the expected one AND the verifier must hash to the challenge sent at
 * sign-up), and sign-out.
 *
 * It proves the application against the provider's documented shapes, not the
 * provider itself; the live account flows remain an owner-run step.
 */

export const authHost =
  'https://enuikiiweoscywaixedr.auth.eu-north-1.nhost.run';
export const graphqlHost =
  'https://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run';

export interface ProviderCall {
  method: string;
  path: string;
  body: unknown;
}

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

function sessionFor(email: string) {
  const issuedAt = Math.floor(Date.now() / 1000);

  return {
    accessToken: `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({
      sub: '00000000-0000-4000-8000-0000000000e2',
      iat: issuedAt,
      exp: issuedAt + 3600,
    })}.sim`,
    accessTokenExpiresIn: 3600,
    refreshToken: `sim-refresh-${email}`,
    refreshTokenId: '00000000-0000-4000-a000-0000000000e2',
    user: {
      id: '00000000-0000-4000-8000-0000000000e2',
      email,
      displayName: email,
      roles: ['user'],
    },
  };
}

export async function installSimulatedProvider(
  page: Page,
  options: { exchangeCode?: string } = {},
) {
  const sim = createSimulatedNhost();
  const calls: ProviderCall[] = [];
  const seen = {
    redirectTo: null as string | null,
    codeChallenge: null as string | null,
    email: 'learner@example.com',
  };

  const handle = async (route: Route) => {
    const request = route.request();
    const headers = request.headers();
    const cors = {
      'access-control-allow-origin': headers.origin ?? '*',
      'access-control-allow-headers':
        headers['access-control-request-headers'] ?? '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      vary: 'Origin',
    };

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }

    const url = new URL(request.url());
    const text = request.postData();
    const body: Record<string, unknown> | null = text
      ? (JSON.parse(text) as Record<string, unknown>)
      : null;
    const json = (status: number, value: unknown) =>
      route.fulfill({
        status,
        headers: { ...cors, 'content-type': 'application/json' },
        body: JSON.stringify(value),
      });

    calls.push({ method: request.method(), path: url.pathname, body });

    if (url.hostname === new URL(authHost).hostname) {
      if (url.pathname.endsWith('/signup/email-password') && body) {
        seen.email = String(body.email);
        seen.codeChallenge = String(body.codeChallenge ?? '');
        seen.redirectTo = String(
          (body.options as { redirectTo?: string } | undefined)?.redirectTo ??
            '',
        );
        await json(200, { session: null });
        return;
      }

      if (url.pathname.endsWith('/token/exchange') && body) {
        const challenge = createHash('sha256')
          .update(String(body.codeVerifier ?? ''))
          .digest('base64url');

        if (
          options.exchangeCode !== undefined &&
          body.code === options.exchangeCode &&
          challenge === seen.codeChallenge
        ) {
          await json(200, sessionFor(seen.email));
        } else {
          await json(400, { error: 'invalid-request', status: 400 });
        }
        return;
      }

      if (url.pathname.endsWith('/signout')) {
        await json(200, 'OK');
        return;
      }
    }

    const answer = await sim.fetch(request.url(), {
      method: request.method(),
      headers,
      body: text ?? undefined,
    });

    await route.fulfill({
      status: answer.status,
      headers: {
        ...cors,
        // Kept as the simulation sent it: a gateway fault stays an HTML page.
        'content-type': answer.headers.get('content-type') ?? 'text/plain',
      },
      body: await answer.text(),
    });
  };

  await page.route(`${authHost}/**`, handle);
  await page.route(`${graphqlHost}/**`, handle);

  return { sim, calls, seen };
}
