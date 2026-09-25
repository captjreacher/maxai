export const FIXED_DRIVE_PLAN_IDS = Object.freeze([
  'plan-mgrnz-drive-one-month',
  'plan-mgrnz-drive-ongoing',
  'plan-mgrnz-drive-three-month',
]);

const fixedDrivePlanIds = new Set(FIXED_DRIVE_PLAN_IDS);
const fixedDriveCadences = new Set(['one-off', 'monthly']);

/** @param {string | undefined} planId */
export function isFixedDrivePlanId(planId) {
  return typeof planId === 'string' && fixedDrivePlanIds.has(planId);
}

/** @param {string} planId */
export function getDrivePurchaseHref(planId) {
  if (!isFixedDrivePlanId(planId)) return null;
  return `/drive/get-started/${encodeURIComponent(planId)}/`;
}

/**
 * @param {{
 *   planId?: string,
 *   productId?: string,
 *   name?: string,
 *   priceDisplay?: string,
 *   commercialState?: {
 *     lifecycleStatus?: string,
 *     isSellable?: boolean,
 *     billingCadence?: string
 *   } | null
 * }} offer
 */
export function isFixedDriveCommercialOffer(offer) {
  return (
    isFixedDrivePlanId(offer.planId) &&
    offer.commercialState?.lifecycleStatus === 'published' &&
    offer.commercialState?.isSellable === true &&
    fixedDriveCadences.has(offer.commercialState?.billingCadence) &&
    typeof offer.priceDisplay === 'string' &&
    offer.priceDisplay.trim().length > 0 &&
    offer.priceDisplay !== 'Request pricing'
  );
}

/**
 * @param {{
 *   planId?: string,
 *   productId?: string,
 *   name?: string,
 *   priceDisplay?: string,
 *   commercialState?: {
 *     billingCadence?: string
 *   } | null
 * }} offer
 * @param {{
 *   name: string,
 *   email: string,
 *   organisation: string,
 *   phone?: string,
 *   preferredStart: string,
 *   notes?: string,
 *   website?: string
 * }} fields
 */
export function buildDrivePurchaseIntakeFields(offer, fields) {
  if (!isFixedDrivePlanId(offer.planId)) {
    throw new Error('Unknown DRIVE plan cannot become a commercial selection.');
  }

  const notes = fields.notes?.trim();
  const context = [
    `Selected offer: ${offer.name}`,
    `Billing product ID: ${offer.productId}`,
    `Billing plan ID: ${offer.planId}`,
    `Published price shown: ${offer.priceDisplay}`,
    `Billing cadence: ${offer.commercialState?.billingCadence ?? 'unknown'}`,
    `Preferred start: ${fields.preferredStart.trim()}`,
  ];

  if (notes) {
    context.push(`Customer notes: ${notes}`);
  }

  return {
    name: fields.name,
    email: fields.email,
    organisation: fields.organisation,
    phone: fields.phone ?? '',
    problem: `I want to get started with ${offer.name}.\n\n${context.join('\n')}`,
    category: 'DRIVE fixed-price offer',
    timing: fields.preferredStart,
    serviceContext: `DRIVE purchase request — ${offer.planId}`,
    website: fields.website ?? '',
  };
}
