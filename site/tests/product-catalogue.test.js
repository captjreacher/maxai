import test from 'node:test';
import assert from 'node:assert/strict';

import {
  commercialCatalogueGroups,
  getDriveProductExperience,
  verifiedBillingProducts,
} from '../src/data/product-catalogue.js';

const driveStagesFixture = [
  {
    id: 'discover',
    title: 'Discover',
    offers: [
      {
        name: 'Trust Signal Assessment',
        ctaLabel: 'Get a free Trust Signal Assessment',
        ctaHref: '/contact?service=trust-signal-assessment#problem-form-heading',
        pricingFallback: 'Free',
        commercialModel: 'free-service',
        verification: 'approved-free-service',
      },
    ],
  },
  {
    id: 'ready',
    title: 'Ready',
    offers: [
      {
        productKey: 'digitalTrustFoundation',
        ctaLabel: 'Request pricing',
        pricingFallback: 'Request pricing',
        verification: 'billing-catalogue',
      },
    ],
  },
  {
    id: 'implement',
    title: 'Implement',
    offers: [
      {
        productKey: 'driveOneMonth',
        ctaLabel: 'Request DRIVE',
        pricingFallback: 'Request pricing',
        verification: 'billing-catalogue',
      },
      {
        productKey: 'landingPageWebsite',
        ctaLabel: 'Request pricing',
        pricingFallback: 'Request pricing',
        verification: 'billing-catalogue',
      },
      {
        productKey: 'websiteRefresh',
        ctaLabel: 'Request pricing',
        pricingFallback: 'Request pricing',
        verification: 'billing-catalogue',
      },
    ],
  },
  { id: 'validate', title: 'Validate', offers: [] },
  {
    id: 'evolve',
    title: 'Evolve',
    offers: [
      {
        productKey: 'driveOngoing',
        ctaLabel: 'Request DRIVE',
        pricingFallback: 'Request pricing',
        verification: 'billing-catalogue',
      },
      {
        productKey: 'driveStrategySession',
        ctaLabel: 'Discuss requirement',
        pricingFallback: 'Discuss requirement',
        verification: 'billing-catalogue',
      },
      {
        productKey: 'aiAgentManagement',
        ctaLabel: 'Discuss requirement',
        pricingFallback: 'Discuss requirement',
        verification: 'billing-catalogue',
      },
    ],
  },
];

test('presents one canonical five-stage DRIVE journey', () => {
  const stages = getDriveProductExperience(null, driveStagesFixture);

  assert.deepEqual(
    stages.map((stage) => stage.title),
    ['Discover', 'Ready', 'Implement', 'Validate', 'Evolve'],
  );
});

test('keeps all fallback commercial displays price-free', () => {
  const offers = getDriveProductExperience(null, driveStagesFixture).flatMap(
    (stage) => stage.offers,
  );

  assert.ok(offers.length > 0);
  assert.ok(
    offers.every((offer) =>
      ['Free', 'Request pricing', 'Discuss requirement'].includes(offer.priceDisplay),
    ),
  );
  assert.equal(JSON.stringify(offers).match(/\$\s*\d|NZD\s*\d/g), null);
});

test('uses Billing product identity and commercial display only when supplied server-side', () => {
  const product = verifiedBillingProducts.landingPageWebsite;
  const stages = getDriveProductExperience({
    products: [
      {
        productId: product.productId,
        displayName: 'Billing-resolved landing page',
        lifecycleStatus: 'published',
        isSellable: true,
        priceDisplay: 'Billing-resolved commercial display',
      },
    ],
  }, driveStagesFixture);
  const offer = stages
    .flatMap((stage) => stage.offers)
    .find((candidate) => candidate.productId === product.productId);

  assert.equal(offer.name, 'Billing-resolved landing page');
  assert.equal(offer.priceDisplay, 'Billing-resolved commercial display');
  assert.deepEqual(offer.commercialState, {
    lifecycleStatus: 'published',
    isSellable: true,
  });
});

test('matches Billing commercial state by plan for multi-plan DRIVE offers', () => {
  const oneMonth = verifiedBillingProducts.driveOneMonth;
  const ongoing = verifiedBillingProducts.driveOngoing;
  const stages = getDriveProductExperience({
    products: [
      {
        productId: oneMonth.productId,
        planId: oneMonth.planId,
        displayName: 'DRIVE — One-month programme',
        lifecycleStatus: 'published',
        isSellable: true,
        priceDisplay: 'NZD $1,250.00 excl. GST · one-off',
        billingCadence: 'one-off',
      },
      {
        productId: ongoing.productId,
        planId: ongoing.planId,
        displayName: 'DRIVE — Ongoing',
        lifecycleStatus: 'published',
        isSellable: true,
        priceDisplay: 'NZD $1,100.00 excl. GST · per month',
        billingCadence: 'monthly',
      },
    ],
  }, driveStagesFixture);
  const offers = stages.flatMap((stage) => stage.offers);

  const oneMonthOffer = offers.find(
    (candidate) => candidate.planId === oneMonth.planId,
  );
  const ongoingOffer = offers.find(
    (candidate) => candidate.planId === ongoing.planId,
  );

  assert.equal(oneMonthOffer.name, 'DRIVE — One-month programme');
  assert.equal(oneMonthOffer.priceDisplay, 'NZD $1,250.00 excl. GST · one-off');
  assert.equal(oneMonthOffer.ctaLabel, 'Get started');
  assert.equal(
    oneMonthOffer.ctaHref,
    '/drive/get-started/plan-mgrnz-drive-one-month/',
  );
  assert.equal(ongoingOffer.name, 'DRIVE — Ongoing');
  assert.equal(ongoingOffer.priceDisplay, 'NZD $1,100.00 excl. GST · per month');
  assert.equal(ongoingOffer.ctaHref, '/drive/get-started/plan-mgrnz-drive-ongoing/');
  assert.deepEqual(oneMonthOffer.commercialState, {
    planId: oneMonth.planId,
    lifecycleStatus: 'published',
    isSellable: true,
    billingCadence: 'one-off',
  });
});

test('withholds supplied pricing when Billing says an offer is not sellable', () => {
  const product = verifiedBillingProducts.websiteRefresh;
  const stages = getDriveProductExperience({
    products: [
      {
        productId: product.productId,
        displayName: product.displayName,
        lifecycleStatus: 'deprecated',
        isSellable: false,
        priceDisplay: 'A stale commercial value',
      },
    ],
  }, driveStagesFixture);
  const offer = stages
    .flatMap((stage) => stage.offers)
    .find((candidate) => candidate.productId === product.productId);

  assert.equal(offer.priceDisplay, 'Request pricing');
  assert.equal(offer.ctaLabel, 'Request pricing');
});

test('uses POA display and discussion CTA when Billing marks a sellable POA plan', () => {
  const product = verifiedBillingProducts.driveStrategySession;
  const stages = getDriveProductExperience({
    products: [
      {
        productId: product.productId,
        planId: product.planId,
        displayName: product.displayName,
        lifecycleStatus: 'published',
        isSellable: true,
        billingCadence: 'poa',
      },
    ],
  }, driveStagesFixture);
  const offer = stages
    .flatMap((stage) => stage.offers)
    .find((candidate) => candidate.planId === product.planId);

  assert.equal(offer.priceDisplay, 'POA');
  assert.equal(offer.ctaLabel, 'Discuss requirement');
  assert.equal(offer.ctaHref, undefined);
  assert.deepEqual(offer.commercialState, {
    planId: product.planId,
    lifecycleStatus: 'published',
    isSellable: true,
    billingCadence: 'poa',
  });
});

test('represents Trust Signal Assessment as a free service outside Billing', () => {
  const discover = getDriveProductExperience(null, driveStagesFixture).find(
    (stage) => stage.id === 'discover',
  );
  const assessment = discover.offers[0];

  assert.equal(assessment.name, 'Trust Signal Assessment');
  assert.equal(assessment.productId, undefined);
  assert.equal(assessment.commercialModel, 'free-service');
  assert.equal(assessment.priceDisplay, 'Free');
  assert.notEqual(assessment.priceDisplay, 'Request pricing');
  assert.notEqual(assessment.priceDisplay, '$0');
  assert.equal(assessment.ctaLabel, 'Get a free Trust Signal Assessment');
  assert.match(assessment.ctaHref, /service=trust-signal-assessment/);
  assert.equal(assessment.verification, 'approved-free-service');
});

test('adds presentation-only grouping to Billing-backed products', () => {
  const groups = new Set(commercialCatalogueGroups.map((group) => group.id));
  const billingOffers = getDriveProductExperience(null, driveStagesFixture)
    .flatMap((stage) => stage.offers)
    .filter((offer) => offer.verification === 'billing-catalogue');

  assert.ok(groups.has('websitesDigitalPresence'));
  assert.ok(groups.has('hostingInfrastructure'));
  assert.ok(groups.has('managedTechnologyAi'));
  assert.ok(billingOffers.every((offer) => groups.has(offer.catalogueGroup)));
  assert.equal(
    JSON.stringify(commercialCatalogueGroups).match(/\$\s*\d|NZD\s*\d/g),
    null,
  );
});
