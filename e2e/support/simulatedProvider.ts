import { createHash } from 'node:crypto';

import type { Page, Route } from '@playwright/test';

import { createSimulatedNhost } from '../../tests/infra/simulatedNhostCore.mjs';

/**
 * A SIMULATED provider for browser tests, answered inside the browser: no
 * connection to the real Nhost project is ever made. It wraps the repository's
 * offline simulation of the Stage-1 table and sign-in, and adds the Auth
 * endpoints that simulation does not model and the email-link flows need:
 * sign-up (verification required), the password-reset request, the PKCE token
 * exchange (the code must be the expected one AND the verifier must hash to
 * the challenge sent with the sign-up or the reset request), the password
 * change (it needs the bearer session the exchange created, and afterwards
 * sign-in honours the new password), and sign-out.
 *
 * It proves the application against the provider's documented shapes, not the
 * provider itself; the live account flows remain an owner-run step. Every
 * password is a synthetic test value, and the call log redacts them anyway.
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

export interface SimulatedProviderOptions {
  /** The one-time code the token exchange accepts (with a matching verifier). */
  exchangeCode?: string;
  /**
   * Accounts that already exist and their passwords. Sign-in refuses a wrong
   * password for these; an address that is not listed signs in with anything
   * (the underlying simulation creates it on first use).
   */
  accounts?: Record<string, string>;
  /** Answer a reset request for an address that is not in `accounts` with 400. */
  refuseUnknownResetAddress?: boolean;
  /** Answer the password change with this HTTP status instead of 200. */
  changePasswordStatus?: number;
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

/** The call log never keeps a password, even a synthetic one. */
function redacted(body: Record<string, unknown> | null) {
  if (body === null) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(body).map(([key, value]) =>
      /password/i.test(key) ? [key, '[redacted]'] : [key, value],
    ),
  );
}

export async function installSimulatedProvider(
  page: Page,
  options: SimulatedProviderOptions = {},
) {
  const sim = createSimulatedNhost({ schemaVersion: 5 });
  const calls: ProviderCall[] = [];
  const passwords = new Map<string, string>(
    Object.entries(options.accounts ?? {}),
  );
  // What a test may switch while it runs (a fault that later clears).
  const control = { changePasswordStatus: options.changePasswordStatus };
  const seen = {
    redirectTo: null as string | null,
    codeChallenge: null as string | null,
    email: 'learner@example.com',
    /** The addresses a reset link was requested for, in order. */
    resetRequests: [] as string[],
    /** The sessions a password change arrived with, in order. */
    changeBearers: [] as boolean[],
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

    calls.push({
      method: request.method(),
      path: url.pathname,
      body: redacted(body),
    });

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

      if (url.pathname.endsWith('/user/password/reset') && body) {
        const address = String(body.email);

        seen.resetRequests.push(address);

        if (options.refuseUnknownResetAddress && !passwords.has(address)) {
          await json(400, {
            error: 'user-not-found',
            message: 'No user found for this address',
            status: 400,
          });
          return;
        }

        seen.email = address;
        seen.codeChallenge = String(body.codeChallenge ?? '');
        seen.redirectTo = String(
          (body.options as { redirectTo?: string } | undefined)?.redirectTo ??
            '',
        );
        await json(200, 'OK');
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

      if (url.pathname.endsWith('/user/password') && body) {
        const bearer = (headers.authorization ?? '').startsWith('Bearer ');

        seen.changeBearers.push(bearer);

        if (!bearer) {
          await json(401, { error: 'unauthenticated', status: 401 });
          return;
        }

        if (
          control.changePasswordStatus !== undefined &&
          control.changePasswordStatus !== 200
        ) {
          await json(control.changePasswordStatus, {
            error: 'simulated-fault',
            status: control.changePasswordStatus,
          });
          return;
        }

        passwords.set(seen.email, String(body.newPassword));
        await json(200, 'OK');
        return;
      }

      if (url.pathname.endsWith('/signin/email-password') && body) {
        const expected = passwords.get(String(body.email));

        if (expected !== undefined && expected !== body.password) {
          await json(401, { error: 'invalid-email-password', status: 401 });
          return;
        }
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

  return { sim, calls, seen, passwords, control };
}
