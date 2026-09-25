import assert from 'node:assert/strict';
import test from 'node:test';

import { loadBillingCatalogueSnapshot } from '../src/server/billing-catalogue.js';

const ENV = {
  MAXAI_BILLING_CATALOGUE_API_BASE_URL: 'https://billing.example.test/api/v1',
  MAXAI_BILLING_CATALOGUE_API_KEY: 'bk_cat_test_viewer_key',
};

const PRODUCT = {
  productId: 'product-maximisedai-landing-page',
  brandId: 'brand-maximisedai',
  displayName: 'Landing Page Website',
  lifecycleStatus: 'published',
};

const DRIVE_PRODUCT = {
  productId: 'product-mgrnz-drive-programme',
  brandId: 'brand-mgrnz',
  displayName: 'DRIVE Productivity Improvement Programme',
  lifecycleStatus: 'published',
};

const CURRENT_PRICE = {
  planVersionId: 'pv-landing-v1',
  planId: 'plan-maximisedai-landing-page',
  version: 1,
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  effectiveTo: null,
  status: 'published',
  price: {
    kind: 'fixed',
    amountMinor: 80000,
    currency: 'NZD',
    taxTreatment: 'exclusive',
    taxRate: 1500,
  },
};

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ data }),
  };
}

const DRIVE_PRICES = {
  'plan-mgrnz-drive-one-month': {
    billingType: 'one-off',
    amountMinor: 125000,
  },
  'plan-mgrnz-drive-ongoing': {
    billingType: 'monthly',
    amountMinor: 110000,
  },
  'plan-mgrnz-drive-three-month': {
    billingType: 'monthly',
    amountMinor: 100000,
  },
};

function fixedPrice(planId, amountMinor) {
  return {
    planVersionId: `pv-${planId}-v2`,
    planId,
    version: 2,
    effectiveFrom: '2026-09-20T00:00:00.000Z',
    effectiveTo: null,
    status: 'published',
    price: {
      kind: 'fixed',
      amountMinor,
      currency: 'NZD',
      taxTreatment: 'exclusive',
      taxRate: 1500,
    },
  };
}

function createBillingFetch({ sellable = true, current = CURRENT_PRICE, includeDrive = false } = {}) {
  const requests = [];
  const fetchImplementation = async (input, init) => {
    requests.push({ input, init });
    const url = new URL(input);

    if (url.pathname.endsWith('/catalogue/products')) {
      const brandId = url.searchParams.get('brandId');
      return response({
        items:
          brandId === 'brand-maximisedai'
            ? [PRODUCT]
            : brandId === 'brand-mgrnz' && includeDrive
              ? [DRIVE_PRODUCT]
              : [],
      });
    }
    if (url.pathname.endsWith('/catalogue/plans')) {
      const productId = url.searchParams.get('productId');
      if (productId === DRIVE_PRODUCT.productId) {
        return response({
          items: Object.entries(DRIVE_PRICES).map(
            ([planId, { billingType }], index) => ({
              planId,
              productId,
              name:
                planId === 'plan-mgrnz-drive-one-month'
                  ? 'DRIVE — One-month programme'
                  : planId === 'plan-mgrnz-drive-ongoing'
                    ? 'DRIVE — Ongoing'
                    : 'DRIVE — Three-month sprint',
              billingType,
              sortOrder: (index + 1) * 10,
              isSellable: true,
            }),
          ),
        });
      }
      return response({
        items: [
          {
            planId: 'plan-maximisedai-landing-page',
            productId: PRODUCT.productId,
            billingType: 'one-off',
            sortOrder: 10,
            isSellable: sellable,
          },
        ],
      });
    }
    if (url.pathname.endsWith('/prices/current')) {
      const drivePlan = Object.entries(DRIVE_PRICES).find(([planId]) =>
        url.pathname.includes(`/${planId}/`),
      );
      if (drivePlan) {
        const [planId, { amountMinor }] = drivePlan;
        return response({
          planId,
          current: fixedPrice(planId, amountMinor),
        });
      }
      return response({
        planId: 'plan-maximisedai-landing-page',
        current,
      });
    }

    return response({}, 404);
  };

  return { fetchImplementation, requests };
}

test('loads only a sanitised build-time commercial snapshot', async () => {
  const { fetchImplementation, requests } = createBillingFetch();
  const snapshot = await loadBillingCatalogueSnapshot({
    env: ENV,
    fetchImplementation,
    now: new Date('2026-08-31T00:00:00.000Z'),
  });

  assert.deepEqual(snapshot, {
    products: [
      {
        productId: PRODUCT.productId,
        planId: 'plan-maximisedai-landing-page',
        displayName: PRODUCT.displayName,
        lifecycleStatus: 'published',
        isSellable: true,
        priceDisplay: 'NZD $800.00 excl. GST · one-off',
        currency: 'NZD',
        billingCadence: 'one-off',
      },
    ],
  });
  assert.equal(requests.length, 4);
  assert.ok(
    requests.every(
      ({ init }) =>
        init.headers.Authorization ===
        `ApiKey ${ENV.MAXAI_BILLING_CATALOGUE_API_KEY}`,
    ),
  );
  assert.ok(
    !JSON.stringify(snapshot).includes(
      ENV.MAXAI_BILLING_CATALOGUE_API_KEY,
    ),
  );
  assert.ok(!JSON.stringify(snapshot).includes(ENV.MAXAI_BILLING_CATALOGUE_API_BASE_URL));
});

test('loads all allow-listed sellable DRIVE plans with their own published prices', async () => {
  const { fetchImplementation } = createBillingFetch({ includeDrive: true });
  const snapshot = await loadBillingCatalogueSnapshot({
    env: ENV,
    fetchImplementation,
    now: new Date('2026-09-22T00:00:00.000Z'),
  });

  const driveProducts = snapshot.products.filter(
    (product) => product.productId === DRIVE_PRODUCT.productId,
  );

  assert.deepEqual(
    driveProducts.map((product) => ({
      planId: product.planId,
      displayName: product.displayName,
      priceDisplay: product.priceDisplay,
      billingCadence: product.billingCadence,
    })),
    [
      {
        planId: 'plan-mgrnz-drive-one-month',
        displayName: 'DRIVE — One-month programme',
        priceDisplay: 'NZD $1,250.00 excl. GST · one-off',
        billingCadence: 'one-off',
      },
      {
        planId: 'plan-mgrnz-drive-ongoing',
        displayName: 'DRIVE — Ongoing',
        priceDisplay: 'NZD $1,100.00 excl. GST · per month',
        billingCadence: 'monthly',
      },
      {
        planId: 'plan-mgrnz-drive-three-month',
        displayName: 'DRIVE — Three-month sprint',
        priceDisplay: 'NZD $1,000.00 excl. GST · per month',
        billingCadence: 'monthly',
      },
    ],
  );
});

test('retains bearer token support for local rollback compatibility', async () => {
  const { fetchImplementation, requests } = createBillingFetch();
  await loadBillingCatalogueSnapshot({
    env: {
      MAXAI_BILLING_CATALOGUE_API_BASE_URL:
        ENV.MAXAI_BILLING_CATALOGUE_API_BASE_URL,
      MAXAI_BILLING_CATALOGUE_BEARER_TOKEN: 'legacy.viewer.token',
    },
    fetchImplementation,
    now: new Date('2026-08-31T00:00:00.000Z'),
  });

  assert.ok(
    requests.every(
      ({ init }) => init.headers.Authorization === 'Bearer legacy.viewer.token',
    ),
  );
});

test('missing build-only Billing configuration falls back without a request', async () => {
  let requestCount = 0;
  const snapshot = await loadBillingCatalogueSnapshot({
    env: {},
    fetchImplementation: async () => {
      requestCount += 1;
      throw new Error('must not be called');
    },
  });

  assert.equal(snapshot, null);
  assert.equal(requestCount, 0);
});

test('required production catalogue fails the build instead of deploying fallback data', async () => {
  await assert.rejects(
    loadBillingCatalogueSnapshot({
      env: {
        ...ENV,
        MAXAI_BILLING_CATALOGUE_REQUIRED: 'true',
      },
      fetchImplementation: async () => response({}, 503),
    }),
    /Required Billing catalogue could not be loaded/,
  );
});

test('an unavailable Billing API falls back safely', async () => {
  const snapshot = await loadBillingCatalogueSnapshot({
    env: ENV,
    fetchImplementation: async () => response({}, 503),
  });

  assert.equal(snapshot, null);
});

test('an unsellable plan suppresses pricing', async () => {
  const { fetchImplementation, requests } = createBillingFetch({ sellable: false });
  const snapshot = await loadBillingCatalogueSnapshot({
    env: ENV,
    fetchImplementation,
  });

  assert.deepEqual(snapshot.products[0], {
    productId: PRODUCT.productId,
    displayName: PRODUCT.displayName,
    lifecycleStatus: 'published',
    isSellable: false,
  });
  assert.equal(requests.some(({ input }) => input.includes('/prices/current')), false);
});

test('draft and superseded prices are never displayed', async (t) => {
  for (const status of ['draft', 'superseded']) {
    await t.test(status, async () => {
      const { fetchImplementation } = createBillingFetch({
        current: { ...CURRENT_PRICE, status },
      });
      const snapshot = await loadBillingCatalogueSnapshot({
        env: ENV,
        fetchImplementation,
        now: new Date('2026-08-31T00:00:00.000Z'),
      });

      assert.equal(snapshot.products[0].priceDisplay, undefined);
      assert.equal(snapshot.products[0].isSellable, true);
    });
  }
});

test('published POA prices remain explicit even when the plan cadence is one-off', async () => {
  const { fetchImplementation } = createBillingFetch({
    current: {
      ...CURRENT_PRICE,
      price: {
        kind: 'poa',
        taxTreatment: 'exclusive',
        taxRate: 1500,
      },
    },
  });
  const snapshot = await loadBillingCatalogueSnapshot({
    env: ENV,
    fetchImplementation,
    now: new Date('2026-08-31T00:00:00.000Z'),
  });

  assert.equal(snapshot.products[0].priceDisplay, undefined);
  assert.equal(snapshot.products[0].billingCadence, 'poa');
  assert.equal(snapshot.products[0].isSellable, true);
});
