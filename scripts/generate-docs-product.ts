// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Writes `apps/docs/lib/product/apps.generated.json`, the app names the docs
 * site's shared product block shows, from the composed stack (#2608).
 * Run `pnpm docs:product` after adding, renaming or translating an app;
 * `test/docs-product-block.test.ts` fails until you do.
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import stack from '../test/helpers/composed-stack';
import { readProductApps, renderProductApps } from './lib/product-apps';

const target = join(__dirname, '..', 'apps', 'docs', 'lib', 'product', 'apps.generated.json');
const apps = readProductApps(stack as never);
writeFileSync(target, renderProductApps(apps));
console.log(`wrote ${apps.length} apps to apps/docs/lib/product/apps.generated.json`);
