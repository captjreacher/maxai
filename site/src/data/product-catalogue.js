/**
 * Website presentation metadata for the MaximisedAI commercial catalogue.
 *
 * Billing remains authoritative for product identity, lifecycle, sellability,
 * pricing, tax and cadence. This adapter deliberately contains no prices. A
 * future build-time Billing reader can pass a sanitised snapshot to
 * `getDriveProductExperience` without exposing the internal admin API to the
 * browser.
 */

/** @typedef {'discover' | 'ready' | 'implement' | 'validate' | 'evolve'} DriveStageId */

/**
 * @typedef {Object} BillingCatalogueProduct
 * @property {string} productId
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
    productId: 'product-maximisedai-digital-trust-foundation',
    displayName: 'Digital Trust Foundation',
    catalogueGroup: 'websitesDigitalPresence',
  },
  landingPageWebsite: {
    productId: 'product-maximisedai-landing-page',
    displayName: 'Landing Page Website',
    catalogueGroup: 'websitesDigitalPresence',
  },
  tradieWebsitePackage: {
    productId: 'product-maximisedai-tradie-website',
    displayName: 'Tradie Website Package',
    catalogueGroup: 'websitesDigitalPresence',
  },
  smallBusinessWebsitePackage: {
    productId: 'product-maximisedai-small-business-website',
    displayName: 'Small Business Website Package',
    catalogueGroup: 'websitesDigitalPresence',
  },
  websiteRefresh: {
    productId: 'product-maximisedai-website-refresh',
    displayName: 'Website Refresh',
    catalogueGroup: 'websitesDigitalPresence',
  },
  websiteCare: {
    productId: 'product-maximisedai-website-care',
    displayName: 'Website Care',
    catalogueGroup: 'managedTechnologyAi',
  },
  databaseHosting: {
    productId: 'product-maximisedai-database-hosting',
    displayName: 'Database Hosting',
    catalogueGroup: 'hostingInfrastructure',
  },
  domainManagement: {
    productId: 'product-maximisedai-domain-management',
    displayName: 'Domain Management',
    catalogueGroup: 'hostingInfrastructure',
  },
  emailHosting: {
    productId: 'product-maximisedai-email-hosting',
    displayName: 'Email Hosting',
    catalogueGroup: 'hostingInfrastructure',
  },
  aiAgentManagement: {
    productId: 'product-maximisedai-ai-agent-management',
    displayName: 'AI Agent Management',
    catalogueGroup: 'managedTechnologyAi',
  },
});

export const commercialCatalogueGroups = Object.freeze([
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
      const commercial = offerWithProduct.productId
        ? productsById.get(offerWithProduct.productId)
        : undefined;
      const isAvailable =
        commercial?.lifecycleStatus === 'published' && commercial.isSellable;
      const hasPoaPrice = commercial?.billingCadence === 'poa';
      const priceDisplay =
        commercial && isAvailable
          ? hasPoaPrice
            ? 'POA'
            : commercial.priceDisplay ?? offerWithProduct.pricingFallback
          : offerWithProduct.pricingFallback;

      return {
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
              lifecycleStatus: commercial.lifecycleStatus,
              isSellable: commercial.isSellable,
              ...(commercial.billingCadence
                ? { billingCadence: commercial.billingCadence }
                : {}),
            }
          : null,
      };
    }),
  }));
}
