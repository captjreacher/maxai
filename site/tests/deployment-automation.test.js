import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);

test('the retired static tree has no production deployment entry point', async () => {
  await assert.rejects(access(new URL('.github/workflows/deploy-static-site.yml', root)), { code: 'ENOENT' });
  await assert.rejects(access(new URL('site/wrangler.jsonc', root)), { code: 'ENOENT' });
  const pkg = JSON.parse(await readFile(new URL('site/package.json', root), 'utf8'));
  assert.equal(pkg.scripts.deploy, undefined);
});

test('WordPress retains its independent main-only deployment path', async () => {
  const workflow = await readFile(new URL('.github/workflows/deploy.yml', root), 'utf8');
  assert.match(workflow, /push:\s+branches:\s+- main/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /public\/wp-content\/themes\/saaslauncher/);
  assert.match(workflow, /public\/wp-content\/mu-plugins/);
  assert.match(workflow, /Deploy MaxAI MU plugins/);
  assert.match(workflow, /Deploy SaasLauncher theme/);
  assert.doesNotMatch(workflow, /repository_dispatch|wrangler|CLOUDFLARE/);
});
