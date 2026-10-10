// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CrmApp } from '../src/sales/apps/crm.app';
import { servedApp } from './helpers/composed-stack';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * The app's logo and favicon ARE `assets/icon.svg`, carried inside the artifact (#2051).
 *
 * Until #2051 both fields named `/runtime/assets/icon.svg`. That path resolves only
 * under `objectstack serve` run from this repo, whose CLI mounts the project's
 * `assets/` directory there. A hosted install runs the published artifact, which
 * carried the path and not the file, so the hosted sidebar logo answered 404 and the
 * favicon never loaded. The maintainer ruled the icon inlined (「HotCRM 内嵌图标」):
 * both fields are a `data:image/svg+xml,` URI, and the bytes travel with the app.
 *
 * Inlining makes a second copy of the brand mark, and a copy drifts. `assets/icon.svg`
 * stays the single source — the README shows the file — so this requires the URI the
 * console is served to decode back to that file byte for byte.
 *
 * The decoder is Node's `fetch`, not one written here: it runs the WHATWG URL parser
 * and the fetch spec's `data:` URL processor, the two steps a browser runs on an
 * `<img src>` or a `link.href`. An encoding slip a browser would show — a raw `#`
 * that ends the body at a URL fragment, a raw newline the URL parser strips — is
 * therefore a byte mismatch here, where `decodeURIComponent` would hand both back
 * intact and pass.
 */
describe('the app logo and favicon are assets/icon.svg, inlined (#2051)', () => {
  // The app as `GET /api/v1/meta/app` serves it — after `defineStack` parsed it and the
  // registry took it in — so nothing between the source and the console can rewrite it.
  const branding = (servedApp(CrmApp.name).branding ?? {}) as { logo?: string; favicon?: string };
  const ICON = readFileSync(join(REPO_ROOT, 'assets/icon.svg'));

  it('serves the logo and the favicon as one inlined data: URI, not a server path', () => {
    expect(branding.logo?.startsWith('data:image/svg+xml,')).toBe(true);
    expect(branding.favicon).toBe(branding.logo);
  });

  it('decodes, as a browser decodes it, to assets/icon.svg byte for byte', async () => {
    const response = await fetch(branding.logo ?? '');
    expect(response.headers.get('content-type')).toBe('image/svg+xml');
    const decoded = Buffer.from(await response.arrayBuffer());
    // The text first, for a readable diff when the two drift; then the bytes, which are
    // the fact.
    expect(decoded.toString('utf8')).toBe(ICON.toString('utf8'));
    expect(decoded.equals(ICON)).toBe(true);
  });
});
