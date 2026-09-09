import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(
  new URL('../../.github/workflows/deploy-static-site.yml', import.meta.url),
  'utf8',
);
const wrangler = JSON.parse(
  (await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8')).replace(
    /^\s*\/\/.*$/gm,
    '',
  ),
);

test('receives Billing repository_dispatch and retains manual recovery', () => {
  assert.match(workflow, /repository_dispatch:/);
  assert.match(workflow, /billing-maxai-catalogue-published/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('builds from CI-only Billing secrets before deploying Static Assets', () => {
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /secrets\.MAXAI_BILLING_CATALOGUE_API_BASE_URL/);
  assert.match(workflow, /secrets\.MAXAI_BILLING_CATALOGUE_BEARER_TOKEN/);
  assert.match(workflow, /MAXAI_BILLING_CATALOGUE_REQUIRED: 'true'/);
  assert.match(workflow, /npm run verify:dist/);
  assert.match(workflow, /npm run deploy/);
  assert.doesNotMatch(workflow, /PUBLIC_MAXAI_BILLING|PUBLIC_CLOUDFLARE/);
});

test('targets a route-free Cloudflare Worker Static Assets deployment', () => {
  assert.equal(wrangler.name, 'maxai');
  assert.equal(wrangler.assets.directory, './dist');
  assert.equal(wrangler.workers_dev, true);
  assert.equal(wrangler.routes, undefined);
  assert.equal(wrangler.route, undefined);
});
