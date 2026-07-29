#!/usr/bin/env node
// Copyright (c) 2026 ObjectStack contributors. Licensed under the Apache-2.0 license.

/**
 * publish-marketplace.mjs
 *
 * Publish HotCRM (this single root package) to the ObjectStack marketplace
 * (cloud control plane). Used by `.github/workflows/publish-{staging,production}.yml`
 * and locally via `pnpm publish:marketplace`.
 *
 * Flow:
 *   1. Read `package.json`               → version
 *   2. Read `objectstack.manifest.json`  → marketplace meta
 *   3. Read `dist/objectstack.json`      → compiled bundle (run `pnpm build` first)
 *   4. POST {OS_CLOUD_URL}/api/v1/cloud/packages          → idempotent upsert of sys_package
 *   5. POST {OS_CLOUD_URL}/api/v1/cloud/packages/:id/versions
 *      → creates sys_package_version. 409 (duplicate) is treated as a no-op so
 *        re-running is safe when nothing changed.
 *
 * Auth: `Authorization: Bearer ${OS_CLOUD_API_KEY}` (service mode).
 *
 * Required env:
 *   OS_CLOUD_URL       e.g. https://cloud.objectos.app (staging) / .ai (prod)
 *   OS_CLOUD_API_KEY   service token (per-env, org-level secret)
 * Optional env:
 *   DRY_RUN=1            print payloads, don't POST
 *   PUBLISH_TIMEOUT_MS   per-request timeout (default 240000)
 *   PUBLISH_RETRIES      attempts before giving up (default 4)
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const OS_CLOUD_URL = (process.env.OS_CLOUD_URL ?? '').replace(/\/+$/, '');
const OS_CLOUD_API_KEY = process.env.OS_CLOUD_API_KEY ?? '';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

if (!DRY_RUN) {
  if (!OS_CLOUD_URL) die('OS_CLOUD_URL is required (e.g. https://cloud.objectos.app)');
  if (!OS_CLOUD_API_KEY) die('OS_CLOUD_API_KEY is required (service token)');
}

function die(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
function log(msg) {
  console.log(msg);
}
async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
// Backoff with a cap: 3s, 6s, 12s, 24s, 30s… — gives a cold singleton time to
// spin up between attempts.
function backoffMs(attempt) {
  return Math.min(3000 * 2 ** (attempt - 1), 30_000);
}

/**
 * POST with an explicit timeout + retry. The control plane is a singleton that
 * can be cold (it isn't kept warm), so the first heavy POST after idle can take
 * far longer than undici's default 5-min headers timeout — which would throw and
 * kill the run. We use an AbortController timeout and retry transient failures
 * (timeout / network / 5xx). 4xx (incl. 409) returns immediately.
 */
async function postJson(path, body) {
  const url = `${OS_CLOUD_URL}${path}`;
  if (DRY_RUN) {
    log(`  [dry-run] POST ${url}`);
    log(`  [dry-run] body keys: ${Object.keys(body).join(', ')}`);
    return { ok: true, status: 200, json: { success: true, data: { id: 'dry-run', created: true } } };
  }
  const TIMEOUT_MS = Number(process.env.PUBLISH_TIMEOUT_MS ?? 240_000);
  const MAX_ATTEMPTS = Number(process.env.PUBLISH_RETRIES ?? 4);
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OS_CLOUD_API_KEY}`,
        },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      clearTimeout(timer);
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        log(`  ↻ ${path} → ${res.status}, retry ${attempt}/${MAX_ATTEMPTS - 1}…`);
        await sleep(backoffMs(attempt));
        continue;
      }
      return { ok: res.ok, status: res.status, json };
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const reason =
        err?.name === 'AbortError'
          ? `timeout after ${TIMEOUT_MS}ms`
          : (err?.message ?? String(err));
      if (attempt < MAX_ATTEMPTS) {
        log(`  ↻ ${path} → ${reason}, retry ${attempt}/${MAX_ATTEMPTS - 1}…`);
        await sleep(backoffMs(attempt));
        continue;
      }
      return { ok: false, status: 0, json: { error: `request failed: ${reason}` } };
    }
  }
  return { ok: false, status: 0, json: { error: `request failed: ${lastErr?.message ?? 'unknown'}` } };
}

async function main() {
  const pkg = await readJson(join(ROOT, 'package.json'));
  const ver = pkg.version;

  const manifestPath = join(ROOT, 'objectstack.manifest.json');
  if (!existsSync(manifestPath)) die(`missing ${manifestPath}`);
  const mp = await readJson(manifestPath);

  const distPath = join(ROOT, 'dist', 'objectstack.json');
  if (!existsSync(distPath)) die(`missing ${distPath} — did you run "pnpm build"?`);
  const bundle = await readJson(distPath);

  const manifestId = mp.manifestId ?? bundle?.manifest?.id;
  if (!manifestId) die('no manifestId (set manifestId in objectstack.manifest.json or bundle.manifest.id)');

  log(`── ${mp.displayName ?? pkg.name} (${manifestId}) @ ${ver}`);
  if (DRY_RUN) log('DRY_RUN=1 — no HTTP calls will be made.');

  const readme = existsSync(join(ROOT, mp.readmePath ?? 'README.md'))
    ? await readFile(join(ROOT, mp.readmePath ?? 'README.md'), 'utf8')
    : undefined;

  // Step 1 — upsert sys_package (marketplace visibility).
  const upsertRes = await postJson('/api/v1/cloud/packages', {
    manifest_id: manifestId,
    visibility: 'marketplace',
    display_name: mp.displayName,
    description: mp.description,
    category: mp.category,
    tags: mp.tags,
    is_starter: mp.isStarter ?? false,
    publisher: mp.publisher,
    icon_url: mp.iconUrl,
    homepage_url: mp.homepageUrl,
    license: mp.license ?? pkg.license,
    readme,
  });
  if (!upsertRes.ok) die(`upsert failed (${upsertRes.status}): ${JSON.stringify(upsertRes.json).slice(0, 400)}`);
  const pkgId = upsertRes.json?.data?.id;
  log(`  ${upsertRes.json?.data?.created ? '✓ created' : '✓ patched'} sys_package id=${pkgId}`);

  // Step 2 — create sys_package_version (idempotent by 409). auto_approve is
  // honoured for service-mode callers (our CI's OS_CLOUD_API_KEY); without it
  // the version lands as draft and the public catalog hides it.
  const verRes = await postJson(`/api/v1/cloud/packages/${encodeURIComponent(pkgId)}/versions`, {
    version: ver,
    bundle,
    release_notes: mp.releaseNotes,
    auto_approve: true,
  });
  if (verRes.status === 409) {
    log(`  = version ${ver} already published — no-op`);
    process.exit(0);
  }
  if (!verRes.ok) die(`version POST failed (${verRes.status}): ${JSON.stringify(verRes.json).slice(0, 400)}`);
  log(`  ✓ published version ${ver}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
