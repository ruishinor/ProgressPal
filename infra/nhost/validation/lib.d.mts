export const REMOTE_PAYLOAD_CEILING_BYTES: number;

export const CONSTRAINTS: Readonly<{
  generationGate: string;
  exactBytesGate: string;
  payloadCeiling: string;
  slotRange: string;
  primaryKey: string;
}>;

export function sha256Hex(text: string): string;
export function byteaLiteral(hex: string): string;
export function makePayload(targetBytes: number, tag?: string): string;

export class HarnessAbort extends Error {}

export type HttpOutcomeInput = {
  status?: number | null;
  json?: unknown;
  error?: string;
};

export type HttpOutcome =
  | { kind: 'transport'; status: number | null; detail: string }
  | { kind: 'rate-limited'; status: number }
  | { kind: 'http-error'; status: number }
  | {
      kind: 'rejection';
      status: number;
      constraint: string | null;
      messages: string[];
    }
  | { kind: 'success'; status: number }
  | { kind: 'malformed'; status: number };

export function classifyHttpOutcome(input: HttpOutcomeInput): HttpOutcome;
export function judgeRejection(
  outcome: HttpOutcome,
  expectedConstraint: string | null,
): { pass: boolean; detail: string };
export function requireSuccess(
  outcome: HttpOutcome & { detail?: string },
  label: string,
): void;
export function sameSlots(a: unknown, b: unknown): boolean;
export function scrubEvidence(value: unknown, secrets?: string[]): string;
