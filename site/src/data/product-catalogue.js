/**
 * Website presentation metadata for the MaximisedAI commercial catalogue.
 *
 * Billing remains authoritative for product identity, lifecycle, sellability,
 * pricing, tax and cadence. This adapter deliberately contains no prices. A
 * future build-time Billing reader can pass a sanitised snapshot to
 * `getDriveProductExperience` without exposing the internal admin API to the
 * browser.
 */

import {
  getDrivePurchaseHref,
  isFixedDriveCommercialOffer,
} from './drive-purchase.js';

/** @typedef {'discover' | 'ready' | 'implement' | 'validate' | 'evolve'} DriveStageId */

/**
 * @typedef {Object} BillingCatalogueProduct
 * @property {string} productId
 * @property {string=} planId
 * @property {string} displayName
 * @property {'draft' | 'published' | 'deprecated' | 'retired'} lifecycleStatus
 * @property {boolean} isSellable
 * @property {string=} priceDisplay A server-formatted commercial display value.
 * @property {string=} currency
 * @property {'one-off' | 'monthly' | 'annual' | 'usage' | 'poa'=} billingCadence
 */

/**
 * @typedef {Object} BillingCatalogueSnapshot
 * @property {readonly BillingCatalogueProduct[]} products
 */

export const verifiedBillingProducts = Object.freeze({
  digitalTrustFoundation: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-digital-trust-foundation',
    planId: 'plan-maximisedai-digital-trust-foundation',
    displayName: 'Digital Trust Foundation',
    catalogueGroup: 'websitesDigitalPresence',
  },
  landingPageWebsite: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-landing-page',
    planId: 'plan-maximisedai-landing-page',
    displayName: 'Landing Page Website',
    catalogueGroup: 'websitesDigitalPresence',
  },
  tradieWebsitePackage: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-tradie-website',
    planId: 'plan-maximisedai-tradie-website',
    displayName: 'Tradie Website Package',
    catalogueGroup: 'websitesDigitalPresence',
  },
  smallBusinessWebsitePackage: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-small-business-website',
    planId: 'plan-maximisedai-small-business-website',
    displayName: 'Small Business Website Package',
    catalogueGroup: 'websitesDigitalPresence',
  },
  websiteRefresh: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-website-refresh',
    planId: 'plan-maximisedai-website-refresh',
    displayName: 'Website Refresh',
    catalogueGroup: 'websitesDigitalPresence',
  },
  websiteCare: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-website-care',
    planId: 'plan-maximisedai-website-care',
    displayName: 'Website Care',
    catalogueGroup: 'managedTechnologyAi',
  },
  databaseHosting: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-database-hosting',
    planId: 'plan-maximisedai-database-hosting-monthly',
    displayName: 'Database Hosting',
    catalogueGroup: 'hostingInfrastructure',
  },
  domainManagement: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-domain-management',
    planId: 'plan-maximisedai-domain-management',
    displayName: 'Domain Management',
    catalogueGroup: 'hostingInfrastructure',
  },
  emailHosting: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-email-hosting',
    planId: 'plan-maximisedai-email-hosting-monthly',
    displayName: 'Email Hosting',
    catalogueGroup: 'hostingInfrastructure',
  },
  aiAgentManagement: {
    brandId: 'brand-maximisedai',
    productId: 'product-maximisedai-ai-agent-management',
    planId: 'plan-maximisedai-ai-agent-management',
    displayName: 'AI Agent Management',
    catalogueGroup: 'managedTechnologyAi',
  },
  driveOneMonth: {
    brandId: 'brand-mgrnz',
    productId: 'product-mgrnz-drive-programme',
    planId: 'plan-mgrnz-drive-one-month',
    displayName: 'DRIVE — One-month programme',
    catalogueGroup: 'driveProgrammes',
  },
  driveOngoing: {
    brandId: 'brand-mgrnz',
    productId: 'product-mgrnz-drive-programme',
    planId: 'plan-mgrnz-drive-ongoing',
    displayName: 'DRIVE — Ongoing',
    catalogueGroup: 'driveProgrammes',
  },
  driveThreeMonth: {
    brandId: 'brand-mgrnz',
    productId: 'product-mgrnz-drive-programme',
    planId: 'plan-mgrnz-drive-three-month',
    displayName: 'DRIVE — Three-month sprint',
    catalogueGroup: 'driveProgrammes',
  },
  driveStrategySession: {
    brandId: 'brand-mgrnz',
    productId: 'product-mgrnz-drive-strategy-session',
    planId: 'plan-mgrnz-drive-strategy-session',
    displayName: 'DRIVE — Additional strategy session',
    catalogueGroup: 'driveProgrammes',
  },
});

export const commercialCatalogueGroups = Object.freeze([
  {
    id: 'driveProgrammes',
    eyebrow: 'DRIVE Programmes',
    heading: 'DRIVE productivity improvement offers',
    description:
      'Structured DRIVE engagements for productivity improvement, operating rhythm and practical implementation direction.',
  },
  {
    id: 'websitesDigitalPresence',
    eyebrow: 'Websites & Digital Presence',
    heading: 'Website packages and digital foundations',
    description:
      'Website packages, refreshes and trust/search foundations for businesses building or improving an owned digital channel.',
  },
  {
    id: 'hostingInfrastructure',
    eyebrow: 'Hosting & Infrastructure',
    heading: 'Managed hosting and business infrastructure',
    description:
      'Recurring operating services for the domains, databases and email foundations that keep digital channels dependable.',
  },
  {
    id: 'managedTechnologyAi',
    eyebrow: 'Managed Technology & AI',
    heading: 'Ongoing care for active systems',
    description:
      'Managed services for websites and AI systems that need accountable operation, maintenance and improvement after launch.',
  },
]);

const productKeys = Object.fromEntries(
  Object.entries(verifiedBillingProducts).map(([key, product]) => [key, product]),
);

/**
 * Merge server-resolved commercial facts into website-owned presentation
 * metadata. With no snapshot, verified names remain visible while pricing is
 * safely withheld.
 *
 * @param {BillingCatalogueSnapshot | null} catalogue
 */
export function getDriveProductExperience(catalogue = null, driveStages = []) {
  const productsById = new Map(
    (catalogue?.products ?? []).map((product) => [product.productId, product]),
  );
  const productsByPlanId = new Map(
    (catalogue?.products ?? [])
      .filter((product) => product.planId)
      .map((product) => [product.planId, product]),
  );

  return driveStages.map((stage) => ({
    ...stage,
    offers: (stage.offers ?? []).map((offer) => {
      const verifiedProduct = offer.productKey
        ? productKeys[offer.productKey]
        : undefined;
      const offerWithProduct = {
        ...offer,
        ...verifiedProduct,
      };
      const commercial =
        (offerWithProduct.planId
          ? productsByPlanId.get(offerWithProduct.planId)
          : undefined) ??
        (offerWithProduct.productId
          ? productsById.get(offerWithProduct.productId)
          : undefined);
      const isAvailable =
        commercial?.lifecycleStatus === 'published' && commercial.isSellable;
      const hasPoaPrice = commercial?.billingCadence === 'poa';
      const priceDisplay =
        commercial && isAvailable
          ? hasPoaPrice
            ? 'POA'
            : commercial.priceDisplay ?? offerWithProduct.pricingFallback
          : offerWithProduct.pricingFallback;

      const baseOffer = {
        ...offerWithProduct,
        productKey: undefined,
        name:
          commercial?.displayName ??
          offerWithProduct.displayName ??
          offerWithProduct.name,
        priceDisplay,
        ctaLabel:
          commercial && isAvailable && hasPoaPrice
            ? 'Discuss requirement'
            : offerWithProduct.ctaLabel,
        commercialState: commercial
          ? {
              ...(commercial.planId ? { planId: commercial.planId } : {}),
              lifecycleStatus: commercial.lifecycleStatus,
              isSellable: commercial.isSellable,
              ...(commercial.billingCadence
                ? { billingCadence: commercial.billingCadence }
                : {}),
          }
          : null,
      };

      if (isFixedDriveCommercialOffer(baseOffer)) {
        return {
          ...baseOffer,
          ctaLabel: 'Get started',
          ctaHref: getDrivePurchaseHref(baseOffer.planId) ?? baseOffer.ctaHref,
        };
      }

      return baseOffer;
    }),
  }));
}
