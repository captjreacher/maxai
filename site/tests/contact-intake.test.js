import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MESSAGE_MAX_LENGTH,
  MESSAGE_MIN_LENGTH,
  buildIntakePayload,
  composeIntakeMessage,
  isSuccessfulIntakeResponse,
  isValidSourcePage,
  resolveServiceContext,
  submitIntake,
} from '../src/scripts/contact-intake.js';

const baseFields = {
  name: 'Alex Example',
  email: 'alex@example.com',
  organisation: 'Example Limited',
  problem: 'Manual reporting is slowing down the operations team.',
  phone: '+64 21 555 0101',
  category: 'AI & Workflow Automation',
  timing: 'As soon as practical',
  website: '',
};

// Mirrors the source_page rule enforced by mgrnz-public-intake/validation.ts.
const SOURCE_PAGE_PATTERN = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*$/;

test('composes the problem first and appends supported context', () => {
  assert.equal(
    composeIntakeMessage(baseFields),
    [
      baseFields.problem,
      '',
      `Phone: ${baseFields.phone}`,
      `Category: ${baseFields.category}`,
      `Timing: ${baseFields.timing}`,
    ].join('\n'),
  );
});

test('omits the phone line when no phone is supplied', () => {
  const message = composeIntakeMessage({ ...baseFields, phone: '  ' });

  assert.ok(!message.includes('Phone:'));
  assert.ok(message.startsWith(baseFields.problem));
});

test('preserves the approved Trust Signal Assessment context in the canonical message', () => {
  const service = resolveServiceContext('trust-signal-assessment');
  const message = composeIntakeMessage({
    ...baseFields,
    serviceContext: service.label,
  });

  assert.equal(service.label, 'Trust Signal Assessment');
  assert.ok(message.startsWith(baseFields.problem));
  assert.ok(message.includes('\nService: Trust Signal Assessment\n'));
  assert.equal(resolveServiceContext('unknown-service'), null);
});

test('builds the exact canonical mgrnz-public-intake payload', () => {
  const payload = buildIntakePayload(
    baseFields,
    'https://example.com/previous',
    '/contact',
  );

  assert.deepEqual(Object.keys(payload), [
    'intent',
    'name',
    'email',
    'organisation',
    'message',
    'marketing_consent',
    'source',
    'source_page',
    'referrer',
    'website',
  ]);
  assert.equal(payload.intent, 'general_enquiry');
  assert.equal(payload.name, baseFields.name);
  assert.equal(payload.email, baseFields.email);
  assert.equal(payload.organisation, baseFields.organisation);
  assert.equal(payload.marketing_consent, false);
  assert.equal(payload.source, 'maximisedai.com');
  assert.equal(payload.source_page, '/contact');
  assert.equal(payload.referrer, 'https://example.com/previous');
  assert.equal(payload.website, '');
  assert.ok(
    payload.message.startsWith(baseFields.problem),
    'the user problem stays first in the message',
  );
  assert.ok(payload.message.includes('\nPhone: +64 21 555 0101\n'));
  assert.ok(payload.message.includes(`\nCategory: ${baseFields.category}\n`));
  assert.ok(payload.message.endsWith(`Timing: ${baseFields.timing}`));
  assert.ok(
    !('phone' in payload) &&
      !('company' in payload) &&
      !('consent' in payload) &&
      !('page_url' in payload),
    'no legacy WordPress payload fields leak through',
  );
  assert.notEqual(payload.source, 'MaxAI Contact Form');
});

test('source_page stays a bare path that satisfies the server rule', () => {
  const withQuery = buildIntakePayload(baseFields, '', '/contact?service=trust-signal-assessment');
  const withHash = buildIntakePayload(baseFields, '', '/contact#form');
  const barePath = buildIntakePayload(baseFields, '', '/contact');
  const empty = buildIntakePayload(baseFields, '', '   ');

  for (const payload of [withQuery, withHash, barePath, empty]) {
    assert.equal(payload.source_page, '/contact');
    assert.match(payload.source_page, SOURCE_PAGE_PATTERN);
    assert.ok(payload.source_page.length <= 200);
  }
  assert.ok(isValidSourcePage('/contact'));
  assert.ok(!isValidSourcePage('https://maximisedai.com/contact'));
  assert.ok(!isValidSourcePage('/contact?service=trust-signal-assessment'));
});

test('message length guards match the canonical server limits', () => {
  assert.equal(MESSAGE_MIN_LENGTH, 12);
  assert.equal(MESSAGE_MAX_LENGTH, 2000);
});

test('keeps the honeypot website value inside the canonical payload', () => {
  const clean = buildIntakePayload({ ...baseFields, website: '  ' }, '', '/contact');
  const honeypot = buildIntakePayload(
    { ...baseFields, website: 'http://spam.example' },
    '',
    '/contact',
  );

  assert.equal(clean.website, '');
  assert.equal(honeypot.website, 'http://spam.example');
  assert.equal(honeypot.intent, 'general_enquiry');
  assert.ok(honeypot.message.length >= MESSAGE_MIN_LENGTH);
});

test('requires the canonical received:true acknowledgement', () => {
  assert.equal(
    isSuccessfulIntakeResponse({ ok: true }, { ok: true, received: true }),
    true,
  );
  assert.equal(
    isSuccessfulIntakeResponse({ ok: true }, { ok: true, page_id: 'page-123' }),
    false,
    'page_id is no longer a success contract',
  );
  assert.equal(
    isSuccessfulIntakeResponse({ ok: false }, { ok: true, received: true }),
    false,
  );
  assert.equal(isSuccessfulIntakeResponse({ ok: true }, { ok: true }), false);
  assert.equal(
    isSuccessfulIntakeResponse({ ok: true }, { ok: false, error: 'Invalid source' }),
    false,
    'validation failure bodies are never successful',
  );
  assert.equal(isSuccessfulIntakeResponse({ ok: true }, 'not json'), false);
});

test('posts the canonical JSON request through an injected fetch implementation', async () => {
  const payload = buildIntakePayload(baseFields, 'https://example.com/previous', '/contact');
  let capturedRequest;
  const fetchImplementation = async (...request) => {
    capturedRequest = request;
    return {
      ok: true,
      json: async () => ({ ok: true, received: true }),
    };
  };

  await submitIntake('https://intake.example.test', payload, fetchImplementation);

  assert.deepEqual(capturedRequest, [
    'https://intake.example.test',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  ]);
});

test('rejects a validation-failure response from the server', async () => {
  const payload = buildIntakePayload(baseFields);
  const fetchImplementation = async () => ({
    ok: false,
    status: 400,
    json: async () => ({ ok: false, error: 'Invalid source page' }),
  });

  await assert.rejects(
    submitIntake('https://intake.example.test', payload, fetchImplementation),
    /not acknowledged/,
  );
});

test('rejects a network/server failure', async () => {
  const payload = buildIntakePayload(baseFields);

  await assert.rejects(
    submitIntake(
      'https://intake.example.test',
      payload,
      async () => {
        throw new TypeError('Failed to fetch');
      },
    ),
    /Failed to fetch/,
  );

  await assert.rejects(
    submitIntake(
      'https://intake.example.test',
      payload,
      async () => ({
        ok: false,
        status: 500,
        json: async () => null,
      }),
    ),
    /not acknowledged/,
  );
});