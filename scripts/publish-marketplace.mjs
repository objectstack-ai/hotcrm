#!/usr/bin/env node
// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

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
 *   3. Read `dist/objectstack.json`      → compiled artifact (run `pnpm build` first)
 *   4. Post it as built — the composed artifact, one `packages[]` entry per
 *      package — and refuse, before any HTTP call, DRY_RUN included, a build
 *      that carries no objects (`scripts/lib/marketplace-bundle.mjs`, #2059)
 *   5. Resolve the manifest's per-locale listing `translations` (readme paths
 *      read from disk) and refuse, DRY_RUN included, a map that does not parse
 *      as `PackageTranslationsSchema` (`scripts/lib/marketplace-listing.mjs`, #2392)
 *   6. Read the release notes from `CHANGELOG.md`, spanning every section since
 *      the last published version when the section declares one, and refuse,
 *      DRY_RUN included, a declaration that does not parse
 *      (`scripts/lib/marketplace-release-notes.mjs`, #2501)
 *   7. POST {OS_CLOUD_URL}/api/v1/cloud/packages          → idempotent upsert of sys_package
 *   8. POST {OS_CLOUD_URL}/api/v1/cloud/packages/:id/versions
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
import {
  BundleError,
  assertArtifactCarriesObjects,
  describeBundle,
  describePackages,
  versionBody,
} from './lib/marketplace-bundle.mjs';
import {
  ListingError,
  describeTranslations,
  packageUpsertBody,
  resolveListingTranslations,
} from './lib/marketplace-listing.mjs';
import {
  ReleaseNotesError,
  describeReleaseNotes,
  releaseNotesFromChangelog,
} from './lib/marketplace-release-notes.mjs';

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

/**
 * Release notes for the version being published, read from `CHANGELOG.md`.
 *
 * The manifest used to be the only source (`mp.releaseNotes`), and it has never
 * declared the key — so every publish so far sent `release_notes: undefined`
 * and the marketplace listing carried no notes at all, while the notes the
 * changesets had already written sat in `CHANGELOG.md` unread.
 *
 * Which sections they span, what each contributes and how they fit the cap is
 * `scripts/lib/marketplace-release-notes.mjs` (#2501): one section, or every
 * section since the last published version when the section declares it.
 * `mp.releaseNotes` still wins if a release ever wants to hand-write them.
 */
async function releaseNotesFor(version, manifestNotes) {
  if (manifestNotes) return { text: manifestNotes, span: [version], versions: [version], omitted: 0 };
  const changelogPath = join(ROOT, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) return undefined;
  return releaseNotesFromChangelog(await readFile(changelogPath, 'utf8'), version);
}

async function main() {
  const pkg = await readJson(join(ROOT, 'package.json'));
  const ver = pkg.version;

  const manifestPath = join(ROOT, 'objectstack.manifest.json');
  if (!existsSync(manifestPath)) die(`missing ${manifestPath}`);
  const mp = await readJson(manifestPath);

  const distPath = join(ROOT, 'dist', 'objectstack.json');
  if (!existsSync(distPath)) die(`missing ${distPath} — did you run "pnpm build"?`);
  const artifact = await readJson(distPath);

  // The bundle cloud stores is the artifact as built, composed (#2059); it is
  // checked before the first request.
  try {
    assertArtifactCarriesObjects(artifact);
  } catch (err) {
    if (err instanceof BundleError) die(`refusing to publish: ${err.message}`);
    throw err;
  }

  const manifestId = mp.manifestId ?? artifact?.manifest?.id;
  if (!manifestId) die('no manifestId (set manifestId in objectstack.manifest.json or the artifact manifest.id)');

  log(`── ${mp.displayName ?? pkg.name} (${manifestId}) @ ${ver}`);
  if (DRY_RUN) log('DRY_RUN=1 — no HTTP calls will be made.');
  log(`  bundle (as built): ${describeBundle(artifact).join(' · ')}`);
  for (const line of describePackages(artifact)) log(`    package ${line}`);

  const readme = existsSync(join(ROOT, mp.readmePath ?? 'README.md'))
    ? await readFile(join(ROOT, mp.readmePath ?? 'README.md'), 'utf8')
    : undefined;

  // Per-locale listing copy (zh-CN description, tagline and readme, #2392),
  // checked before the first request like the bundle above.
  let translations;
  try {
    translations = resolveListingTranslations(mp.translations, dirname(manifestPath));
  } catch (err) {
    if (err instanceof ListingError) die(`refusing to publish: ${err.message}`);
    throw err;
  }
  for (const line of describeTranslations(translations)) log(`  ${line}`);

  // The version's release notes, also before the first request: a section that
  // declares the versions it spans in a form that cannot be read stops here.
  let notes;
  try {
    notes = await releaseNotesFor(ver, mp.releaseNotes);
  } catch (err) {
    if (err instanceof ReleaseNotesError) die(`refusing to publish: ${err.message}`);
    throw err;
  }
  log(`  ${describeReleaseNotes(notes)}`);

  // Step 1 — upsert sys_package (marketplace visibility).
  const upsertRes = await postJson(
    '/api/v1/cloud/packages',
    packageUpsertBody({ manifestId, manifest: mp, license: mp.license ?? pkg.license, readme, translations }),
  );
  if (!upsertRes.ok) die(`upsert failed (${upsertRes.status}): ${JSON.stringify(upsertRes.json).slice(0, 400)}`);
  const pkgId = upsertRes.json?.data?.id;
  log(`  ${upsertRes.json?.data?.created ? '✓ created' : '✓ patched'} sys_package id=${pkgId}`);

  // Step 2 — create sys_package_version (idempotent by 409). auto_approve is
  // honoured for service-mode callers (our CI's OS_CLOUD_API_KEY); without it
  // the version lands as draft and the public catalog hides it.
  const verRes = await postJson(
    `/api/v1/cloud/packages/${encodeURIComponent(pkgId)}/versions`,
    versionBody({ version: ver, artifact, releaseNotes: notes?.text }),
  );
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
