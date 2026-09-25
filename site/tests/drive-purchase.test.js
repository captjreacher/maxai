import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDrivePurchaseIntakeFields,
  getDrivePurchaseHref,
  isFixedDriveCommercialOffer,
  isFixedDrivePlanId,
} from '../src/data/drive-purchase.js';

const fixedOffer = {
  productId: 'product-mgrnz-drive-programme',
  planId: 'plan-mgrnz-drive-one-month',
  name: 'DRIVE — One-month programme',
  priceDisplay: 'NZD $1,250.00 excl. GST · one-off',
  commercialState: {
    lifecycleStatus: 'published',
    isSellable: true,
    billingCadence: 'one-off',
  },
};

test('routes only fixed DRIVE Billing plans to get-started pages', () => {
  assert.equal(isFixedDrivePlanId('plan-mgrnz-drive-one-month'), true);
  assert.equal(isFixedDrivePlanId('plan-mgrnz-drive-ongoing'), true);
  assert.equal(isFixedDrivePlanId('plan-mgrnz-drive-three-month'), true);
  assert.equal(isFixedDrivePlanId('plan-mgrnz-drive-strategy-session'), false);
  assert.equal(isFixedDrivePlanId('plan-mgrnz-drive-tampered'), false);

  assert.equal(
    getDrivePurchaseHref('plan-mgrnz-drive-three-month'),
    '/drive/get-started/plan-mgrnz-drive-three-month/',
  );
  assert.equal(getDrivePurchaseHref('plan-mgrnz-drive-strategy-session'), null);
});

test('requires published sellable fixed-price commercial state', () => {
  assert.equal(isFixedDriveCommercialOffer(fixedOffer), true);
  assert.equal(
    isFixedDriveCommercialOffer({
      ...fixedOffer,
      planId: 'plan-mgrnz-drive-strategy-session',
      commercialState: { ...fixedOffer.commercialState, billingCadence: 'poa' },
    }),
    false,
  );
  assert.equal(
    isFixedDriveCommercialOffer({
      ...fixedOffer,
      priceDisplay: 'Request pricing',
    }),
    false,
  );
});

test('preserves Billing plan identity in the intake fields', () => {
  const fields = buildDrivePurchaseIntakeFields(fixedOffer, {
    name: 'Alex Example',
    email: 'alex@example.com',
    organisation: 'Example Limited',
    phone: '+64 21 555 0101',
    preferredStart: 'This month',
    notes: 'Please confirm onboarding details.',
    website: '',
  });

  assert.equal(fields.category, 'DRIVE fixed-price offer');
  assert.equal(fields.timing, 'This month');
  assert.equal(fields.serviceContext, 'DRIVE purchase request — plan-mgrnz-drive-one-month');
  assert.match(fields.problem, /Billing plan ID: plan-mgrnz-drive-one-month/);
  assert.match(fields.problem, /Billing product ID: product-mgrnz-drive-programme/);
  assert.match(fields.problem, /Published price shown: NZD \$1,250\.00 excl\. GST · one-off/);
});

test('rejects unknown plan identifiers before building commercial intake', () => {
  assert.throws(
    () =>
      buildDrivePurchaseIntakeFields(
        {
          ...fixedOffer,
          planId: 'plan-mgrnz-drive-tampered',
        },
        {
          name: 'Alex Example',
          email: 'alex@example.com',
          organisation: 'Example Limited',
          preferredStart: 'This month',
        },
      ),
    /Unknown DRIVE plan/,
  );
});
