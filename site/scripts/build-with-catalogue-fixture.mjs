import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';

import { verifyDistNoSecrets } from './verify-dist-secrets.mjs';

const apiKey = 'fixture-billing-api-key-do-not-ship';
const server = createServer((request, response) => {
  assert.equal(request.headers.authorization, `ApiKey ${apiKey}`);
  const url = new URL(request.url, 'http://127.0.0.1');
  let data;

  if (url.pathname.endsWith('/catalogue/products')) {
    assert.equal(url.searchParams.get('lifecycleStatus'), 'published');
    const brandId = url.searchParams.get('brandId');
    data = {
      items:
        brandId === 'brand-maximisedai'
          ? [
              {
                productId: 'product-maximisedai-landing-page',
                displayName: 'Fixture Landing Page Website',
                lifecycleStatus: 'published',
              },
            ]
          : brandId === 'brand-mgrnz'
            ? [
                {
                  productId: 'product-mgrnz-drive-programme',
                  displayName: 'DRIVE Productivity Improvement Programme',
                  lifecycleStatus: 'published',
                },
                {
                  productId: 'product-mgrnz-drive-strategy-session',
                  displayName: 'DRIVE Additional Strategy Session',
                  lifecycleStatus: 'published',
                },
              ]
          : [],
    };
  } else if (url.pathname.endsWith('/catalogue/plans')) {
    if (url.searchParams.get('productId') === 'product-mgrnz-drive-programme') {
      data = {
        items: [
          {
            planId: 'plan-mgrnz-drive-one-month',
            productId: 'product-mgrnz-drive-programme',
            name: 'DRIVE — One-month programme',
            billingType: 'one-off',
            sortOrder: 10,
            isSellable: true,
          },
          {
            planId: 'plan-mgrnz-drive-ongoing',
            productId: 'product-mgrnz-drive-programme',
            name: 'DRIVE — Ongoing',
            billingType: 'monthly',
            sortOrder: 20,
            isSellable: true,
          },
          {
            planId: 'plan-mgrnz-drive-three-month',
            productId: 'product-mgrnz-drive-programme',
            name: 'DRIVE — Three-month sprint',
            billingType: 'monthly',
            sortOrder: 30,
            isSellable: true,
          },
        ],
      };
    } else if (
      url.searchParams.get('productId') === 'product-mgrnz-drive-strategy-session'
    ) {
      data = {
        items: [
          {
            planId: 'plan-mgrnz-drive-strategy-session',
            productId: 'product-mgrnz-drive-strategy-session',
            name: 'DRIVE — Additional strategy session',
            billingType: 'one-off',
            sortOrder: 10,
            isSellable: true,
          },
        ],
      };
    } else {
      data = {
        items: [
          {
            planId: 'plan-maximisedai-landing-page',
            productId: 'product-maximisedai-landing-page',
            billingType: 'one-off',
            sortOrder: 10,
            isSellable: true,
          },
        ],
      };
    }
  } else if (url.pathname.endsWith('/prices/current')) {
    const drivePrices = new Map([
      [
        'plan-mgrnz-drive-one-month',
        { billingType: 'one-off', amountMinor: 125000 },
      ],
      [
        'plan-mgrnz-drive-ongoing',
        { billingType: 'monthly', amountMinor: 110000 },
      ],
      [
        'plan-mgrnz-drive-three-month',
        { billingType: 'monthly', amountMinor: 100000 },
      ],
    ]);
    const drivePlan = [...drivePrices.keys()].find((planId) =>
      url.pathname.includes(`/${planId}/`),
    );
    if (drivePlan) {
      data = {
        current: {
          status: 'published',
          effectiveFrom: '2026-09-20T00:00:00.000Z',
          effectiveTo: null,
          price: {
            kind: 'fixed',
            amountMinor: drivePrices.get(drivePlan).amountMinor,
            currency: 'NZD',
            taxTreatment: 'exclusive',
          },
        },
      };
    } else if (url.pathname.includes('/plan-mgrnz-drive-strategy-session/')) {
      data = {
        current: {
          status: 'published',
          effectiveFrom: '2026-09-12T00:00:00.000Z',
          effectiveTo: null,
          price: {
            kind: 'poa',
          },
        },
      };
    } else {
      data = {
        current: {
          status: 'published',
          effectiveFrom: '2026-01-01T00:00:00.000Z',
          effectiveTo: null,
          price: {
            kind: 'fixed',
            amountMinor: 91000,
            currency: 'NZD',
            taxTreatment: 'exclusive',
          },
        },
      };
    }
  } else {
    response.writeHead(404).end();
    return;
  }

  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({ data }));
});

await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
const address = server.address();
assert.equal(typeof address, 'object');
const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

try {
  const child = spawn(process.execPath, [resolve('node_modules/astro/bin/astro.mjs'), 'build'], {
    cwd: resolve('.'),
    env: {
      ...process.env,
      MAXAI_BILLING_CATALOGUE_API_BASE_URL: baseUrl,
      MAXAI_BILLING_CATALOGUE_API_KEY: apiKey,
      MAXAI_BILLING_CATALOGUE_REQUIRED: 'true',
    },
    stdio: 'inherit',
  });
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', resolveExit);
  });
  assert.equal(exitCode, 0, 'Astro production build failed');

  const productsHtml = await readFile(resolve('dist/products/index.html'), 'utf8');
  const pricingHtml = await readFile(resolve('dist/pricing/index.html'), 'utf8');
  assert.match(productsHtml, /Fixture Landing Page Website/);
  assert.match(productsHtml, /NZD \$910\.00 excl\. GST · one-off/);
  assert.match(productsHtml, /DRIVE — One-month programme/);
  assert.match(productsHtml, /NZD \$1,250\.00 excl\. GST · one-off/);
  assert.match(pricingHtml, /DRIVE productivity improvement offers/);
  assert.match(pricingHtml, /NZD \$1,100\.00 excl\. GST · per month/);
  assert.match(pricingHtml, /DRIVE Additional Strategy Session/);
  assert.match(pricingHtml, /POA/);
  await verifyDistNoSecrets({
    env: {
      MAXAI_BILLING_CATALOGUE_API_BASE_URL: baseUrl,
      MAXAI_BILLING_CATALOGUE_API_KEY: apiKey,
      MAXAI_BILLING_CATALOGUE_REQUIRED: 'true',
    },
  });
  console.log('Production Astro build consumed fixture Billing catalogue data without leaking secrets.');
} finally {
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  );
}
