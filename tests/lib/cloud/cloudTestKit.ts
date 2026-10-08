import { vi } from 'vitest';

import {
  createNhostCloud,
  writeCloudPreferences,
  type NhostCloud,
} from '@/lib/cloud';

/**
 * Shared helpers for tests that drive the REAL @nhost/nhost-js client against a
 * stubbed global fetch. Nothing here reaches a network.
 */

export const learnerEmail = 'learner@example.com';
export const learnerPassword = 'correct-horse-9';

export interface FetchCall {
  url: string;
  method: string;
  headers: Headers;
  body: Record<string, unknown> | null;
}

export type FetchHandler = (call: FetchCall) => Response | Promise<Response>;

export interface FetchStub {
  calls: FetchCall[];
  respond(handler: FetchHandler): void;
}

const base64Url = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

export function fakeJwt(secondsToExpiry = 900) {
  const exp = Math.floor(Date.now() / 1000) + secondsToExpiry;

  return `${base64Url({ alg: 'none' })}.${base64Url({ sub: 'user-1', exp, iat: exp - 900 })}.sig`;
}

export function fakeSession(secondsToExpiry = 900) {
  return {
    accessToken: fakeJwt(secondsToExpiry),
    accessTokenExpiresIn: secondsToExpiry,
    refreshTokenId: '11111111-1111-4111-8111-111111111111',
    refreshToken: '22222222-2222-4222-8222-222222222222',
    user: {
      id: 'user-1',
      email: learnerEmail,
      displayName: 'x',
      roles: ['user'],
    },
  };
}

export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export function installFetchStub(): FetchStub {
  let handler: FetchHandler = () =>
    jsonResponse(500, { error: 'unconfigured' });
  const stub: FetchStub = {
    calls: [],
    respond(next) {
      handler = next;
    },
  };

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const raw = init?.body;
      const call: FetchCall = {
        url: String(input instanceof Request ? input.url : input),
        method: init?.method ?? 'GET',
        headers: new Headers(init?.headers),
        body:
          typeof raw === 'string'
            ? (JSON.parse(raw) as Record<string, unknown>)
            : null,
      };

      stub.calls.push(call);

      return handler(call);
    }),
  );

  return stub;
}

export function enableCloud() {
  writeCloudPreferences({ enabled: true, trustedDevice: false });
}

/** The account and the backup store the application would share. */
export function createCloud(): NhostCloud {
  return createNhostCloud({ getWindow: () => window });
}

/**
 * Signs the account in through the stubbed Auth endpoint, then forgets the
 * calls that took, so a test sees only the requests it causes.
 */
export async function signInThroughStub(
  cloud: NhostCloud,
  stub: FetchStub,
  secondsToExpiry = 900,
) {
  const previous = stub.calls.length;
  const session = fakeSession(secondsToExpiry);

  stub.respond(() => jsonResponse(200, { session }));
  await cloud.account.signIn({
    email: learnerEmail,
    password: learnerPassword,
  });
  stub.calls.splice(previous);

  return session;
}
