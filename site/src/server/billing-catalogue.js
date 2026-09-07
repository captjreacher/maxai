import { verifiedBillingProducts } from '../data/product-catalogue.js';

const BILLING_BRAND_ID = 'brand-maximisedai';
const REQUEST_TIMEOUT_MS = 5000;
const BILLING_PRODUCT_IDS = new Set(
  Object.values(verifiedBillingProducts).map((product) => product.productId),
);

/** @param {unknown} value */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** @param {string} baseUrl */
function validateBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);

  if ((url.protocol !== 'https:' && !isLocal) || url.username || url.password) {
    throw new Error('Billing catalogue URL must be HTTPS and contain no credentials.');
  }

  return url.toString().replace(/\/$/, '');
}

/**
 * @param {string} baseUrl
 * @param {string} path
 * @param {string} bearerToken
 * @param {typeof fetch} fetchImplementation
 */
async function fetchBillingJson(baseUrl, path, bearerToken, fetchImplementation) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetchImplementation(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Billing catalogue returned HTTP ${response.status}.`);
    }

    const body = await response.json();
    if (!isRecord(body) || !isRecord(body.data)) {
      throw new Error('Billing catalogue returned an invalid response envelope.');
    }

    return body.data;
  } finally {
    clearTimeout(timeout);
  }
}

/** @param {string} currency @param {number} amountMinor */
function formatMoney(currency, amountMinor) {
  const amount = amountMinor / 100;
  const formatted = new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(amount);

  return `${currency} ${formatted}`;
}

/** @param {string} treatment */
function formatTaxTreatment(treatment) {
  if (treatment === 'exclusive') return 'excl. GST';
  if (treatment === 'inclusive') return 'incl. GST';
  if (treatment === 'exempt') return 'GST exempt';
  return null;
}

/** @param {string} cadence */
function formatCadence(cadence) {
  if (cadence === 'monthly') return 'per month';
  if (cadence === 'annual') return 'per year';
  if (cadence === 'one-off') return 'one-off';
  return null;
}

/**
 * Return a display only for a price version that is published and effective
 * now. Draft, superseded, malformed, usage and ambiguous prices fail closed.
 *
 * @param {unknown} current
 * @param {string} billingType
 * @param {Date} now
 */
export function sanitiseCurrentPrice(current, billingType, now = new Date()) {
  if (!isRecord(current) || current.status !== 'published') return null;

  const effectiveFrom = Date.parse(String(current.effectiveFrom ?? ''));
  const effectiveTo =
    current.effectiveTo === null
      ? null
      : Date.parse(String(current.effectiveTo ?? ''));
  const nowTime = now.getTime();

  if (
    !Number.isFinite(effectiveFrom) ||
    effectiveFrom > nowTime ||
    (effectiveTo !== null && (!Number.isFinite(effectiveTo) || effectiveTo <= nowTime))
  ) {
    return null;
  }

  if (!isRecord(current.price)) return null;
  const price = current.price;

  if (price.kind === 'poa' && billingType === 'poa') {
    return { billingCadence: 'poa' };
  }

  if (price.kind !== 'fixed' || !['one-off', 'monthly', 'annual'].includes(billingType)) {
    return null;
  }

  const amountMinor = price.amountMinor;
  const currency = price.currency;
  const taxTreatment = price.taxTreatment;
  const taxLabel =
    typeof taxTreatment === 'string' ? formatTaxTreatment(taxTreatment) : null;
  const cadenceLabel = formatCadence(billingType);

  if (
    !Number.isSafeInteger(amountMinor) ||
    amountMinor < 0 ||
    typeof currency !== 'string' ||
    !/^[A-Z]{3}$/.test(currency) ||
    taxLabel === null ||
    cadenceLabel === null
  ) {
    return null;
  }

  return {
    priceDisplay: `${formatMoney(currency, amountMinor)} ${taxLabel} · ${cadenceLabel}`,
    currency,
    billingCadence: billingType,
  };
}

/**
 * @param {Record<string, unknown>} product
 * @param {string} baseUrl
 * @param {string} bearerToken
 * @param {typeof fetch} fetchImplementation
 * @param {Date} now
 */
async function resolveCommercialProduct(
  product,
  baseUrl,
  bearerToken,
  fetchImplementation,
  now,
) {
  const productId = String(product.productId);
  const fallback = {
    productId,
    displayName: String(product.displayName),
    lifecycleStatus: 'published',
    isSellable: false,
  };

  try {
    const plansData = await fetchBillingJson(
      baseUrl,
      `/catalogue/plans?productId=${encodeURIComponent(productId)}`,
      bearerToken,
      fetchImplementation,
    );
    if (!Array.isArray(plansData.items)) return fallback;

    const plans = plansData.items
      .filter(
        (plan) =>
          isRecord(plan) &&
          plan.productId === productId &&
          typeof plan.planId === 'string' &&
          typeof plan.billingType === 'string' &&
          typeof plan.sortOrder === 'number' &&
          typeof plan.isSellable === 'boolean',
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const primaryPlan = plans.find((plan) => plan.isSellable === true);

    if (!primaryPlan) return fallback;

    const priceData = await fetchBillingJson(
      baseUrl,
      `/catalogue/plans/${encodeURIComponent(primaryPlan.planId)}/prices/current`,
      bearerToken,
      fetchImplementation,
    );
    const commercial = sanitiseCurrentPrice(
      priceData.current,
      primaryPlan.billingType,
      now,
    );

    return {
      ...fallback,
      isSellable: true,
      ...(commercial ?? {}),
    };
  } catch {
    return fallback;
  }
}

/**
 * Load a sanitised catalogue snapshot during Astro's server/build phase.
 * Missing configuration or any top-level catalogue failure returns null so
 * the public site keeps its explicit Request pricing fallback.
 *
 * @param {{
 *   env?: Record<string, string | undefined>,
 *   fetchImplementation?: typeof fetch,
 *   now?: Date
 * }} options
 */
export async function loadBillingCatalogueSnapshot({
  env = process.env,
  fetchImplementation = fetch,
  now = new Date(),
} = {}) {
  const configuredUrl = env.MAXAI_BILLING_CATALOGUE_API_BASE_URL?.trim();
  const bearerToken = env.MAXAI_BILLING_CATALOGUE_BEARER_TOKEN?.trim();

  if (!configuredUrl || !bearerToken) return null;

  try {
    const baseUrl = validateBaseUrl(configuredUrl);
    const productsData = await fetchBillingJson(
      baseUrl,
      `/catalogue/products?brandId=${BILLING_BRAND_ID}&lifecycleStatus=published`,
      bearerToken,
      fetchImplementation,
    );

    if (!Array.isArray(productsData.items)) return null;

    const products = productsData.items.filter(
      (product) =>
        isRecord(product) &&
        typeof product.productId === 'string' &&
        BILLING_PRODUCT_IDS.has(product.productId) &&
        typeof product.displayName === 'string' &&
        product.displayName.trim().length > 0 &&
        product.lifecycleStatus === 'published',
    );

    const resolvedProducts = await Promise.all(
      products.map((product) =>
        resolveCommercialProduct(
          product,
          baseUrl,
          bearerToken,
          fetchImplementation,
          now,
        ),
      ),
    );

    return { products: resolvedProducts };
  } catch {
    return null;
  }
}
