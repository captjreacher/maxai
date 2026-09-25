import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SECRET_ENV_NAMES = [
  'MAXAI_BILLING_CATALOGUE_API_BASE_URL',
  'MAXAI_BILLING_CATALOGUE_API_KEY',
  'MAXAI_BILLING_CATALOGUE_BEARER_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_ACCOUNT_ID',
  'MAXAI_GITHUB_DISPATCH_TOKEN',
];

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

export async function verifyDistNoSecrets({
  directory = resolve('dist'),
  env = process.env,
} = {}) {
  if (!(await stat(directory)).isDirectory()) {
    throw new Error(`Build output does not exist: ${directory}`);
  }

  const forbiddenValues = SECRET_ENV_NAMES.map((name) => ({
    name,
    value: env[name]?.trim(),
  })).filter(({ value }) => value && value.length >= 6);
  const leaked = [];

  for (const file of await filesBelow(directory)) {
    const content = await readFile(file);
    const text = content.toString('utf8');
    for (const name of SECRET_ENV_NAMES) {
      if (text.includes(name)) leaked.push(`${file}: variable name ${name}`);
    }
    for (const { name, value } of forbiddenValues) {
      if (content.includes(Buffer.from(value))) {
        leaked.push(`${file}: value from ${name}`);
      }
    }
  }

  if (leaked.length > 0) {
    throw new Error(`Server/CI secret material entered dist:\n${leaked.join('\n')}`);
  }

  return { filesChecked: (await filesBelow(directory)).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await verifyDistNoSecrets();
  console.log(`Verified ${result.filesChecked} dist files: no server/CI secrets found.`);
}
