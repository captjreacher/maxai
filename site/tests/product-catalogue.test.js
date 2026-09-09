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
  const product = verifiedBillingProducts.aiAgentManagement;
  const stages = getDriveProductExperience({
    products: [
      {
        productId: product.productId,
        displayName: product.displayName,
        lifecycleStatus: 'published',
        isSellable: true,
        billingCadence: 'poa',
      },
    ],
  }, driveStagesFixture);
  const offer = stages
    .flatMap((stage) => stage.offers)
    .find((candidate) => candidate.productId === product.productId);

  assert.equal(offer.priceDisplay, 'POA');
  assert.equal(offer.ctaLabel, 'Discuss requirement');
  assert.deepEqual(offer.commercialState, {
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
