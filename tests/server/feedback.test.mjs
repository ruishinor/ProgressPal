import assert from 'node:assert/strict';
import { test } from 'node:test';

import handler from '../../api/feedback.mjs';

const baseUrl = 'https://progresspal.example/api/feedback';
const receipt = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const payload = {
  schemaVersion: 1,
  requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  category: 'technical',
  message: 'A synthetic message about a control',
};

function request(body = payload, extraHeaders = {}) {
  return new Request(baseUrl, {
    method: 'POST',
    headers: {
      Origin: 'https://progresspal.example',
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });
}

test('closed intake is safe and never contacts provider', async () => {
  const original = globalThis.fetch;
  const previous = process.env.FEEDBACK_INTAKE_ENABLED;
  try {
    delete process.env.FEEDBACK_INTAKE_ENABLED;
    globalThis.fetch = () => { throw Error('must not call upstream'); };
    const answer = await handler.fetch(request());
    assert.equal(answer.status, 503);
    assert.equal((await answer.json()).status, 'unavailable');
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.FEEDBACK_INTAKE_ENABLED;
    else process.env.FEEDBACK_INTAKE_ENABLED = previous;
  }
});

test('validated request produces a receipt only after provider acknowledgement', async () => {
  const original = globalThis.fetch;
  process.env.FEEDBACK_INTAKE_ENABLED = 'true';
  process.env.FEEDBACK_NHOST_ADMIN_SECRET = 'synthetic-test-secret';
  try {
    let upstreamBody;
    globalThis.fetch = async (_url, init) => {
      upstreamBody = JSON.parse(init.body);
      assert.equal(init.headers['x-hasura-admin-secret'], 'synthetic-test-secret');
      return Response.json({
        data: { submit_feedback: [{ result: { status: 'received', receipt } }] },
      });
    };
    const answer = await handler.fetch(request());
    assert.equal(answer.status, 201);
    assert.deepEqual(await answer.json(), { status: 'received', receipt });
    assert.equal(upstreamBody.variables.payload.technicalContext, null);
    assert.equal(upstreamBody.variables.payload.replyEmail, null);
    assert.equal(upstreamBody.variables.payload.message, payload.message);
    globalThis.fetch = async () => Response.json({
      data: { submit_feedback: [{ result: { status: 'already_received', receipt } }] },
    });
    const retry = await handler.fetch(request());
    assert.equal(retry.status, 200);
    assert.equal((await retry.json()).receipt, receipt);
  } finally {
    globalThis.fetch = original;
    delete process.env.FEEDBACK_INTAKE_ENABLED;
    delete process.env.FEEDBACK_NHOST_ADMIN_SECRET;
  }
});

test('invalid input, unknown keys, wrong origin and huge payload are rejected', async () => {
  process.env.FEEDBACK_INTAKE_ENABLED = 'true';
  process.env.FEEDBACK_NHOST_ADMIN_SECRET = 'synthetic-test-secret';
  try {
    const bad = await handler.fetch(request({ ...payload, unknown: 'tracking' }));
    assert.equal(bad.status, 400);
    const badVersion = await handler.fetch(request({ ...payload, schemaVersion: 2 }));
    assert.equal(badVersion.status, 400);
    const badOrigin = await handler.fetch(request(payload, { Origin: 'https://attacker.example' }));
    assert.equal(badOrigin.status, 403);
    const large = await handler.fetch(request({ ...payload, message: 'x'.repeat(18000) }));
    assert.equal(large.status, 413);
    const method = await handler.fetch(new Request(baseUrl, { method: 'GET' }));
    assert.equal(method.status, 405);
    assert.equal(method.headers.get('allow'), 'POST');
  } finally {
    delete process.env.FEEDBACK_INTAKE_ENABLED;
    delete process.env.FEEDBACK_NHOST_ADMIN_SECRET;
  }
});

test('provider timeout is uncertain rather than a false success', async () => {
  const original = globalThis.fetch;
  process.env.FEEDBACK_INTAKE_ENABLED = 'true';
  process.env.FEEDBACK_NHOST_ADMIN_SECRET = 'synthetic-test-secret';
  globalThis.fetch = async () => { throw new Error('synthetic network drop'); };
  try {
    const answer = await handler.fetch(request());
    assert.equal(answer.status, 503);
    assert.equal((await answer.json()).status, 'uncertain');
  } finally {
    globalThis.fetch = original;
    delete process.env.FEEDBACK_INTAKE_ENABLED;
    delete process.env.FEEDBACK_NHOST_ADMIN_SECRET;
  }
});
