import type { CloudRequestFailure } from '../port';
import { backupConstraintNames } from './backupConstraints';

/**
 * Separates "the provider could not serve the request" from "the database
 * refused this write". The two must never be confused: a gateway 5xx is not a
 * gate rejection, and a gate rejection is not retryable by repeating the bytes.
 *
 * Pure function over what the transport returned; it performs no I/O.
 */
export interface CloudRequestOutcome {
  /** HTTP status, or null when no response arrived (network failure). */
  httpStatus: number | null;
  /** Parsed JSON body when the response had one, otherwise undefined. */
  body?: unknown;
}

interface GraphqlErrorLike {
  message?: unknown;
  extensions?: { code?: unknown } | null;
}

const checkViolation = /violates check constraint "([^"]+)"/;
const uniqueViolation = /unique constraint "([^"]+)"/i;

function graphqlErrors(body: unknown): GraphqlErrorLike[] | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const errors = (body as { errors?: unknown }).errors;

  return Array.isArray(errors) ? (errors as GraphqlErrorLike[]) : null;
}

/** Returns null for a clean success (HTTP 200, a JSON body without errors). */
export function classifyCloudRequest(
  outcome: CloudRequestOutcome,
): CloudRequestFailure | null {
  const { httpStatus, body } = outcome;

  // Transport and gateway faults first, whatever the body claims.
  if (httpStatus === null) {
    return { kind: 'provider-unavailable', httpStatus: null };
  }

  if (httpStatus >= 500) {
    return { kind: 'provider-unavailable', httpStatus };
  }

  if (httpStatus === 429) {
    return { kind: 'rate-limited' };
  }

  if (httpStatus === 401) {
    return { kind: 'unauthenticated' };
  }

  const errors = graphqlErrors(body);

  if (errors === null || errors.length === 0) {
    if (httpStatus === 200 && typeof body === 'object' && body !== null) {
      return null;
    }

    return { kind: 'unexpected-response' };
  }

  for (const error of errors) {
    const code = error.extensions?.code;

    if (code === 'invalid-jwt' || code === 'invalid-headers') {
      return { kind: 'unauthenticated' };
    }

    const message = typeof error.message === 'string' ? error.message : '';
    const check = message.match(checkViolation);

    if (check !== null) {
      const constraint = check[1] ?? null;

      switch (constraint) {
        case backupConstraintNames.generationGate:
          return {
            kind: 'rejected',
            reason: 'unsupported-generation',
            constraint,
          };
        case backupConstraintNames.exactBytesGate:
          return { kind: 'rejected', reason: 'integrity-mismatch', constraint };
        case backupConstraintNames.payloadCeiling:
          return { kind: 'rejected', reason: 'payload-too-large', constraint };
        case backupConstraintNames.slotRange:
          return { kind: 'rejected', reason: 'slot-out-of-range', constraint };
        default:
          return { kind: 'rejected', reason: 'other-constraint', constraint };
      }
    }

    const unique = message.match(uniqueViolation);

    if (unique !== null) {
      const constraint = unique[1] ?? null;

      return {
        kind: 'rejected',
        reason:
          constraint === backupConstraintNames.primaryKey ||
          constraint === backupConstraintNames.backupIdUnique
            ? 'slot-conflict'
            : 'other-constraint',
        constraint,
      };
    }
  }

  return { kind: 'unexpected-response' };
}
