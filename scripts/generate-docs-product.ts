// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Writes the shared product block wherever it is shown outside the docs
 * site's own components, from the composed stack and `product.json`:
 *
 * - `apps/docs/lib/product/apps.generated.json`, the app names the docs
 *   site's shared product block shows (#2608);
 * - the `shared:*` marker blocks in `README.md` and `README.zh-CN.md`, and
 *   the base and zh-CN `description` / `tagline` in
 *   `objectstack.manifest.json` (#2606, `scripts/lib/product-readme.ts`).
 *
 * Run `pnpm docs:product` after adding, renaming or translating an app, or
 * after changing `product.json`; `test/docs-product-block.test.ts` and
 * `test/readme-product-block.test.ts` fail until you do.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import stack from '../test/helpers/composed-stack';
import { readProductApps, renderProductApps } from './lib/product-apps';
import {
  README_LOCALES,
  loadProductSource,
  readmeBlocks,
  writeManifestCopy,
  writeReadmeBlocks,
} from './lib/product-readme';

const root = join(__dirname, '..');
const target = join(root, 'apps', 'docs', 'lib', 'product', 'apps.generated.json');
const apps = readProductApps(stack as never);
writeFileSync(target, renderProductApps(apps));
console.log(`wrote ${apps.length} apps to apps/docs/lib/product/apps.generated.json`);

const source = loadProductSource(root);
for (const loc of README_LOCALES) {
  const path = join(root, loc.file);
  writeFileSync(path, writeReadmeBlocks(readFileSync(path, 'utf8'), readmeBlocks(source, apps, loc), loc.file));
  console.log(`wrote the shared blocks of ${loc.file}`);
}
const manifest = join(root, 'objectstack.manifest.json');
writeFileSync(manifest, writeManifestCopy(readFileSync(manifest, 'utf8'), source, apps));
console.log('wrote the listing description and tagline of objectstack.manifest.json');
