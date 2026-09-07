export const MESSAGE_MIN_LENGTH = 12;
export const MESSAGE_MAX_LENGTH = 2000;

const INTENT = 'general_enquiry';
const SOURCE = 'maximisedai.com';
const DEFAULT_SOURCE_PAGE = '/contact';

// Mirrors the source_page pattern enforced by mgrnz-public-intake/validation.ts.
const SOURCE_PAGE_PATTERN = /^\/[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*$/;

const SERVICE_CONTEXTS = Object.freeze({
  'trust-signal-assessment': {
    key: 'trust-signal-assessment',
    label: 'Trust Signal Assessment',
  },
});

/** @param {string | null | undefined} serviceKey */
export function resolveServiceContext(serviceKey) {
  if (!serviceKey) return null;
  return SERVICE_CONTEXTS[serviceKey] ?? null;
}

/**
 * Compose the canonical intake message while keeping the user's problem first.
 *
 * @param {{ problem: string, phone?: string, category: string, timing: string, serviceContext?: string }} fields
 */
export function composeIntakeMessage({
  problem,
  phone = '',
  category,
  timing,
  serviceContext = '',
}) {
  const context = [];
  const trimmedPhone = phone.trim();
  const trimmedServiceContext = serviceContext.trim();

  if (trimmedServiceContext) {
    context.push(`Service: ${trimmedServiceContext}`);
  }

  if (trimmedPhone) {
    context.push(`Phone: ${trimmedPhone}`);
  }

  context.push(`Category: ${category.trim()}`);
  context.push(`Timing: ${timing.trim()}`);

  return `${problem.trim()}\n\n${context.join('\n')}`;
}

/**
 * Build the canonical mgrnz-public-intake payload.
 *
 * Only the fields supported by the canonical validation are emitted. Context
 * that has no canonical top-level field (phone, category, timing, selected
 * service) is preserved inside `message`.
 *
 * @param {{
 *   name: string,
 *   email: string,
 *   organisation: string,
 *   problem: string,
 *   phone?: string,
 *   category: string,
 *   timing: string,
 *   serviceContext?: string,
 *   website?: string
 * }} fields
 * @param {string} referrer
 * @param {string} sourcePage Page path the submission came from (e.g. "/contact").
 */
export function buildIntakePayload(fields, referrer = '', sourcePage = DEFAULT_SOURCE_PAGE) {
  // The server only accepts a bare path (it rejects query strings), so strip
  // any query/hash fragment before sending.
  const pagePath = sourcePage.trim().split(/[?#]/, 1)[0];

  return {
    intent: INTENT,
    name: fields.name.trim(),
    email: fields.email.trim(),
    organisation: fields.organisation.trim(),
    message: composeIntakeMessage(fields),
    marketing_consent: false,
    source: SOURCE,
    source_page: pagePath || DEFAULT_SOURCE_PAGE,
    referrer: referrer.trim() || null,
    website: fields.website?.trim() ?? '',
  };
}

/**
 * The canonical mgrnz-public-intake success contract is `{ ok: true, received: true }`.
 *
 * @param {{ ok: boolean }} response
 * @param {unknown} body
 */
export function isSuccessfulIntakeResponse(response, body) {
  if (!response.ok || typeof body !== 'object' || body === null) {
    return false;
  }

  return body.ok === true && body.received === true;
}

/**
 * @param {string} endpoint
 * @param {ReturnType<typeof buildIntakePayload>} payload
 * @param {typeof fetch} fetchImplementation
 */
export async function submitIntake(endpoint, payload, fetchImplementation = fetch) {
  const response = await fetchImplementation(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => null);

  if (!isSuccessfulIntakeResponse(response, body)) {
    throw new Error('Intake request was not acknowledged.');
  }
}

/**
 * @param {string} sourcePage
 * @returns {boolean} Whether the value satisfies the server-side source_page rule.
 */
export function isValidSourcePage(sourcePage) {
  return SOURCE_PAGE_PATTERN.test(sourcePage);
}