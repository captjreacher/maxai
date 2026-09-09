import assert from 'node:assert/strict';
import test from 'node:test';

import { loadBillingCatalogueSnapshot } from '../src/server/billing-catalogue.js';

const ENV = {
  MAXAI_BILLING_CATALOGUE_API_BASE_URL: 'https://billing.example.test/api/v1',
  MAXAI_BILLING_CATALOGUE_BEARER_TOKEN: 'test.viewer.token',
};

const PRODUCT = {
  productId: 'product-maximisedai-landing-page',
  displayName: 'Landing Page Website',
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

function createBillingFetch({ sellable = true, current = CURRENT_PRICE } = {}) {
  const requests = [];
  const fetchImplementation = async (input, init) => {
    requests.push({ input, init });
    const url = new URL(input);

    if (url.pathname.endsWith('/catalogue/products')) {
      return response({ items: [PRODUCT] });
    }
    if (url.pathname.endsWith('/catalogue/plans')) {
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
        displayName: PRODUCT.displayName,
        lifecycleStatus: 'published',
        isSellable: true,
        priceDisplay: 'NZD $800.00 excl. GST · one-off',
        currency: 'NZD',
        billingCadence: 'one-off',
      },
    ],
  });
  assert.equal(requests.length, 3);
  assert.ok(
    requests.every(
      ({ init }) =>
        init.headers.Authorization ===
        `Bearer ${ENV.MAXAI_BILLING_CATALOGUE_BEARER_TOKEN}`,
    ),
  );
  assert.ok(
    !JSON.stringify(snapshot).includes(
      ENV.MAXAI_BILLING_CATALOGUE_BEARER_TOKEN,
    ),
  );
  assert.ok(!JSON.stringify(snapshot).includes(ENV.MAXAI_BILLING_CATALOGUE_API_BASE_URL));
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
