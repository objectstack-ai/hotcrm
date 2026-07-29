# HotCRM Maintenance & Upgrade Playbook

> Scope: how to keep this single ObjectStack marketplace app healthy over time —
> the everyday change loop, platform (`@objectstack/*`) upgrades, seed-data
> verification, and version alignment.
>
> HotCRM is a **consumer** of the ObjectStack platform, not the platform itself.
> It therefore does **not** keep an ADR log (those live in the `framework` repo).
> Its decisions are business/domain decisions captured as metadata in `src/`,
> plus a changeset per change. See [README.md](README.md) for the doc map.

## 1. How HotCRM is managed

There is no separate "project management" system — the repo files **are** the
management surface. Know which file owns which fact:

| Concern | Source of truth |
| --- | --- |
| Conventions for humans + AI agents | [`AGENTS.md`](../AGENTS.md) |
| Customer requirements → product disposition | [`docs/requirements/`](requirements/README.md) |
| App identity (id, namespace, version) | [`objectstack.config.ts`](../objectstack.config.ts) + [`objectstack.manifest.json`](../objectstack.manifest.json) |
| What metadata exists (live counts) | [`docs/STATUS.md`](STATUS.md) — regenerated from `pnpm validate` |
| How it ships | [`docs/RELEASE_STRATEGY.md`](RELEASE_STRATEGY.md) |
| What changed, per release | [`CHANGELOG.md`](../CHANGELOG.md) + `.changeset/` |
| Architecture overview | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) |
| User/admin docs | [`content/docs/`](../content/docs/) |

## 2. Everyday change loop (per PR)

1. Author metadata under the correct `src/{type}/` folder (see `AGENTS.md`).
2. Keep all 4 locale bundles in sync (`src/translations/{en,zh-CN,es-ES,ja-JP}.ts`).
3. Add the matching user doc under `content/docs/` if behaviour changed.
4. Add a changeset describing the change.
5. Run the full gate and make sure it is green:

   ```bash
   pnpm verify   # = validate && typecheck && build && test
   ```

6. Open the PR. **Merge only after remote CI is fully green** — never `--auto`
   ahead of CI, and never edit on a shared `main` checkout (use a worktree).

## 3. Platform upgrade checklist (`@objectstack/*` bump)

This is the single riskiest routine operation, because a platform contract change
can silently invalidate existing metadata or **seed data** (see §4). Treat every
`@objectstack/*` version bump as a verification event, not a dependency tweak.

1. Bump all `@objectstack/*` deps in [`package.json`](../package.json) together —
   they are released in lockstep, so keep them on one version line.
2. Update `specVersion` in [`objectstack.manifest.json`](../objectstack.manifest.json)
   to match the installed `@objectstack/spec` (e.g. `^10.0.0`).
3. `pnpm install`.
4. `pnpm verify`. Validation failures here are usually metadata that a new
   platform contract just started enforcing — fix the metadata, do not pin back.
5. **Reset and reseed**, then smoke-test in the Console (see §4):

   ```bash
   pnpm demo:reset   # wipes .objectstack/data, rebuilds; seeds reload on first boot
   pnpm dev          # then open the Console and eyeball the seeded app
   ```

6. If `better-sqlite3` floods `NODE_MODULE_VERSION ... requires ...` on boot, the
   native binary was built for a different Node ABI — `pnpm rebuild better-sqlite3`
   and restart. This is an environment issue, not an app change.
7. Note the new platform version in `CHANGELOG.md`.

### 3.1 Destructive schema drift — orphan columns after an upgrade

`os migrate plan` diffs the live database schema against the current metadata.
After a platform upgrade it can report columns that exist in the database but
are no longer described by any metadata — usually companion columns an older
platform version provisioned automatically and the new version no longer does.
Orphan columns are harmless (the runtime never reads or writes them), so this
cleanup is **deferred by design**: schedule it for a maintenance window instead
of bundling it into the upgrade itself.

**Known case — ObjectStack 17.0 `__search` orphans
([#528](https://github.com/objectstack-ai/hotcrm/issues/528)).** 17.0 tightened
the conditions under which full-text `__search` companion columns are
provisioned, so a database that lived through ≤16.x carries 9 orphan `__search`
columns after the upgrade (`crm_competitor`, `crm_opportunity_line_item`,
`crm_quote_line_item`, `crm_task`, and `sys_metadata`, among others — the full
list is whatever `os migrate plan` prints for your database).

Cleanup procedure:

1. **Stop the service first.** Applying destructive schema changes under live
   traffic is unsafe — see ObjectStack platform issue #526.
2. Back up the database (for a local dev database, copy `.objectstack/data`).
3. Run `os migrate plan` and read the whole plan. Every destructive entry must
   be a column you expect to drop; if anything else appears (a column backing a
   field you still declare), stop and fix the metadata drift instead.
4. Run `os migrate apply --allow-destructive`.
5. Restart the service and smoke-test: `os migrate plan` should now be clean,
   and global search in the Console should still return records.

`--allow-destructive` drops columns irreversibly — never run it without the
backup from step 2, and never against a database whose plan you have not read.

## 4. Seed-data staleness — the #1 HotCRM pitfall

Stale seed data is the most common cause of "Studio shows a red
'metadata is invalid' banner" or "the home page lists pending issues." It is
**almost always the seed, not a designer bug**: a platform contract changed
(a validation rule was retired, a dashboard now requires a `dataset` + values),
and the fixtures in `src/data/` were never updated to match.

After any platform upgrade, or whenever Studio shows validation banners:

1. `pnpm validate` — confirm the **metadata** itself is clean.
2. `pnpm demo:reset && pnpm dev` — reseed from a clean DB.
3. Open the Console and visually verify the seeded records, dashboards, and
   views render. For dashboards, **wait for the lazy-loaded chart bundle** before
   judging an empty card (see `AGENTS.md` → "Verifying UI in the browser").
4. If a banner persists, fix the offending fixture in `src/data/`, not the
   designer or the platform.

## 5. Releasing

HotCRM ships as **one** app package (`hotcrm` / `app.objectstack.hotcrm`). Before
publishing, keep the version aligned across all four places:

- `package.json` `version`
- `objectstack.config.ts` manifest `version`
- `CHANGELOG.md`
- the marketplace publish note

Full procedure (build artifact, dry-run, publish) lives in
[`RELEASE_STRATEGY.md`](RELEASE_STRATEGY.md). Do not duplicate it here.

> **Keep `STATUS.md` honest.** It is a snapshot, not live — regenerate its counts
> and version from `pnpm validate` whenever they drift from `package.json`.

## 6. When HotCRM actually needs a design doc

Rarely. HotCRM does not use the platform's ADR-NNNN system. Reach for a short
design note (placed in `docs/`, archived to `docs/archive/` when superseded) only
when a decision is **cross-cutting and hard to reverse** and a future maintainer
would need the "why" — e.g. the explicit `crm_` prefix convention already
recorded in `AGENTS.md`. Routine "added an object / view / flow" work needs a
changeset, not a design doc.
