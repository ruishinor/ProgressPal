/**
 * The one Nhost project ProgressPal talks to (Epic G, Stage 1): Starter plan,
 * Stockholm. Only the two public service URLs live in the browser build; no
 * admin secret, database password or signing key is ever part of this file or
 * the bundle. These literals must match the production CSP `connect-src`
 * exactly (pinned by tests/architecture/cloudBoundary.test.ts), and the same
 * two hosts are the only ones the localOnly source guard permits.
 */
export const nhostRegion = 'eu-north-1';

export const nhostAuthUrl =
  'https://enuikiiweoscywaixedr.auth.eu-north-1.nhost.run/v1';

export const nhostGraphqlUrl =
  'https://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run/v1';

/** The two origins (no path) the browser may connect to for cloud backup. */
export const nhostConnectOrigins = [
  new URL(nhostAuthUrl).origin,
  new URL(nhostGraphqlUrl).origin,
] as const;
