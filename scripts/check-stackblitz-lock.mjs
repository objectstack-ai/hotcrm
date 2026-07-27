#!/usr/bin/env node
// package-lock.json exists for one reason: the StackBlitz demo installs with npm
// (WebContainers can't run this repo's pnpm — see .stackblitzrc). Without a
// lockfile npm re-resolves the whole tree on every cold container, which is the
// multi-minute silent stretch before the app boots.
//
// The lockfile only helps while it matches package.json, and nothing else in the
// repo reads it, so drift would go unnoticed until a customer opened the demo.
// This compares the manifest against the lockfile's root entry — deterministic,
// unlike diffing a regenerated lockfile, which shifts with the npm version.
//
// Regenerate after changing dependencies:
//   d=$(mktemp -d) && cp package.json "$d" \
//     && (cd "$d" && npm install --package-lock-only --ignore-scripts) \
//     && cp "$d/package-lock.json" .

import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const pkg = read('../package.json');
const lock = read('../package-lock.json');
const root = lock.packages?.[''];

if (!root) {
  console.error('package-lock.json has no root package entry — regenerate it.');
  process.exit(1);
}

const fields = ['version', 'dependencies', 'optionalDependencies', 'devDependencies'];
const drifted = fields.filter(
  (f) => JSON.stringify(pkg[f] ?? null) !== JSON.stringify(root[f] ?? null),
);

if (drifted.length) {
  console.error(
    `package-lock.json is stale (${drifted.join(', ')} differ from package.json).\n` +
      'The StackBlitz demo would fall back to a full re-resolve. Regenerate with:\n' +
      '  d=$(mktemp -d) && cp package.json "$d" \\\n' +
      '    && (cd "$d" && npm install --package-lock-only --ignore-scripts) \\\n' +
      '    && cp "$d/package-lock.json" .',
  );
  process.exit(1);
}

console.log(`package-lock.json is in sync with package.json (${lock.lockfileVersion === 3 ? 'v3' : `v${lock.lockfileVersion}`}).`);
