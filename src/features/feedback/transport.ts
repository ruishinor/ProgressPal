/** The sole client-originated feedback network boundary. Only a user click
 * calls this helper and sends no learner records. Same-origin cookies may be sent to Vercel for access control; they are not forwarded to Nhost. */
export type FeedbackCategory = 'technical' | 'content' | 'idea' | 'other';
export type TechnicalContext = {
  version: string;
  browser: 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Other';
  os: 'Windows' | 'macOS' | 'Linux' | 'Android' | 'iOS' | 'Other';
  page:
    | 'home'
    | 'campaign'
    | 'pathways'
    | 'lesson'
    | 'guild'
    | 'settings'
    | 'microlearning'
    | 'other';
};
export type FeedbackPayload = {
  schemaVersion: 1;
  requestId: string;
  category: FeedbackCategory;
  message: string;
  replyEmail?: string;
  technicalContext?: TechnicalContext;
};
export type FeedbackResult =
  | { status: 'received'; receipt: string }
  | {
      status:
        | 'invalid'
        | 'conflict'
        | 'rate_limited'
        | 'unavailable'
        | 'uncertain';
    };

export async function submitFeedback(
  payload: FeedbackPayload,
): Promise<FeedbackResult> {
  try {
    const result = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'error',
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    });
    const body: unknown = await result.json();
    if (typeof body !== 'object' || body === null || !('status' in body)) {
      return { status: 'uncertain' };
    }
    const status = body.status;
    if (
      result.ok &&
      status === 'received' &&
      'receipt' in body &&
      typeof body.receipt === 'string'
    ) {
      return { status: 'received', receipt: body.receipt };
    }
    if (
      status === 'rate_limited' ||
      status === 'invalid' ||
      status === 'conflict' ||
      status === 'unavailable' ||
      status === 'uncertain'
    ) {
      return { status };
    }
    return { status: 'uncertain' };
  } catch {
    // Network failure may be after DB commit. Retry MUST retain requestId.
    return { status: 'uncertain' };
  }
}
