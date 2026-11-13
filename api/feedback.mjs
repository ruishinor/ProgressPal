/**
 * Explicit, user-initiated feedback only. Separate from learner data and sync.
 * Ingress MUST remain disabled until the private Nhost RPC, global quota,
 * retention, Vercel firewall and server-only secret are provisioned and verified.
 */
const endpoint = 'https://enuikiiweoscywaixedr.graphql.eu-north-1.nhost.run/v1';
const maxBodyBytes = 16 * 1024;
const categories = new Set(['technical', 'content', 'idea', 'other']);
const browsers = new Set(['Chrome', 'Firefox', 'Safari', 'Edge', 'Other']);
const systems = new Set([
  'Windows',
  'macOS',
  'Linux',
  'Android',
  'iOS',
  'Other',
]);
const pages = new Set([
  'home',
  'campaign',
  'pathways',
  'lesson',
  'guild',
  'settings',
  'microlearning',
  'other',
]);
const keys = new Set([
  'schemaVersion',
  'requestId',
  'category',
  'message',
  'replyEmail',
  'technicalContext',
]);
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const query =
  'mutation SubmitFeedback($payload: jsonb!) { submit_feedback(args: {payload: $payload}) { result } }';

function response(status, body, extra = {}) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      ...extra,
    },
  });
}

async function parseBody(request) {
  if (Number(request.headers.get('content-length')) > maxBodyBytes) {
    throw new Error('too_large');
  }
  if (!request.body) throw new Error('bad_body');
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBodyBytes) {
        await reader.cancel();
        throw new Error('too_large');
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    if (error instanceof Error && error.message === 'too_large') throw error;
    throw new Error('bad_body', { cause: error });
  } finally {
    reader.releaseLock();
  }
}

function validate(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (
    Object.keys(value).some((key) => !keys.has(key)) ||
    value.schemaVersion !== 1
  )
    return null;
  if (typeof value.requestId !== 'string' || !uuidPattern.test(value.requestId))
    return null;
  if (typeof value.category !== 'string' || !categories.has(value.category))
    return null;
  if (typeof value.message !== 'string') return null;
  const message = value.message.trim();
  if (message.length < 10 || message.length > 4000) return null;
  const email = value.replyEmail;
  if (
    email !== undefined &&
    (typeof email !== 'string' ||
      email.length > 254 ||
      (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
  )
    return null;
  const ctx = value.technicalContext;
  if (ctx !== undefined && ctx !== null) {
    if (
      typeof ctx !== 'object' ||
      Array.isArray(ctx) ||
      Object.keys(ctx).sort().join(',') !== 'browser,os,page,version' ||
      typeof ctx.version !== 'string' ||
      !/^[0-9A-Za-z.+-]{1,24}$/.test(ctx.version) ||
      !browsers.has(ctx.browser) ||
      !systems.has(ctx.os) ||
      !pages.has(ctx.page)
    )
      return null;
  }
  return {
    schemaVersion: 1,
    requestId: value.requestId.toLowerCase(),
    category: value.category,
    message,
    replyEmail: email?.trim() || null,
    technicalContext: ctx ?? null,
  };
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return response(405, { status: 'method_not_allowed' }, { Allow: 'POST' });
    }
    if (
      process.env.FEEDBACK_INTAKE_ENABLED !== 'true' ||
      !process.env.FEEDBACK_NHOST_ADMIN_SECRET
    ) {
      return response(503, { status: 'unavailable' });
    }
    const origin = request.headers.get('origin');
    if (
      origin !== new URL(request.url).origin ||
      !['same-origin', null].includes(request.headers.get('sec-fetch-site'))
    ) {
      return response(403, { status: 'forbidden' });
    }
    if (
      !/^application\/json(?:\s*;|$)/i.test(
        request.headers.get('content-type') ?? '',
      )
    ) {
      return response(415, { status: 'invalid' });
    }
    let payload;
    try {
      payload = validate(await parseBody(request));
    } catch (error) {
      return response(
        error instanceof Error && error.message === 'too_large' ? 413 : 400,
        { status: 'invalid' },
      );
    }
    if (!payload) return response(400, { status: 'invalid' });
    try {
      const upstream = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': process.env.FEEDBACK_NHOST_ADMIN_SECRET,
        },
        body: JSON.stringify({ query, variables: { payload } }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (!upstream.ok) return response(503, { status: 'unavailable' });
      const json = await upstream.json();
      const result = json?.data?.submit_feedback?.[0]?.result;
      if (!result || typeof result !== 'object')
        return response(503, { status: 'unavailable' });
      if (result.status === 'rate_limited') {
        return response(
          429,
          { status: 'rate_limited' },
          { 'Retry-After': '3600' },
        );
      }
      if (result.status === 'conflict')
        return response(409, { status: 'conflict' });
      if (result.status === 'invalid')
        return response(400, { status: 'invalid' });
      if (
        (result.status === 'received' ||
          result.status === 'already_received') &&
        typeof result.receipt === 'string' &&
        uuidPattern.test(result.receipt)
      ) {
        return response(result.status === 'received' ? 201 : 200, {
          status: 'received',
          receipt: result.receipt,
        });
      }
      return response(503, { status: 'unavailable' });
    } catch {
      // A timeout may occur after a successful commit: the client must retry
      // the SAME requestId rather than assume the report was not delivered.
      return response(503, { status: 'uncertain' });
    }
  },
};
