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
   to match the installed `@objectstack/spec` (e.g. `^10.0.0`), and the
   `engines.protocol` range declared in both
   [`objectstack.config.ts`](../objectstack.config.ts) and the manifest to the
   new protocol major (ADR-0087; the runtime refuses to load the app under a
   protocol major outside this range).
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
8. **Check the release notes for `os migrate` steps that run against DATA, not
   metadata** — see §3.2. `pnpm verify` cannot catch these: they gate runtime
   behaviour on a deployment flag, so a fresh install is clean and an in-place
   upgrade is not.

### 3.2 Data migrations and enforcement gates (`os migrate`)

Steps 1–7 cover the app's own metadata. A major can additionally ship
migrations that rewrite or re-validate **stored rows**, gated behind a
deployment flag so the new enforcement turns on only once the data is known
clean. `demo:reset` hides these entirely — it starts from an empty database, so
a green local run says nothing about an existing deployment.

Run the metadata replay first, then each data gate as a dry run before
`--apply`:

```bash
os migrate meta --from <previous major>   # replays renames and key conversions
os migrate files-to-references            # dry run: media fields → sys_file records
os migrate files-to-references --apply    # convert, verify, record the flag
os migrate value-shapes                   # dry run: scan reference & JSON validity
os migrate value-shapes --apply           # record the gate if the scan is clean
```

For **17.0** specifically: `files-to-references` backfills the four media
fields this app declares (`crm_product.image`, `crm_product.datasheet`,
`crm_account.logo`, `crm_contact.avatar`) into `sys_file` records, and
`value-shapes` scans reference and JSON columns. Neither is needed for a fresh
install — no seed data populates a media field — but an in-place upgrade needs
both before strict validation is safe to enable.

If a scan reports rows it cannot convert, the escape hatches downgrade the new
enforcement to warnings while you fix the data. They are temporary, not a
destination:

| Variable | Effect |
| --- | --- |
| `OS_ALLOW_LAX_MEDIA_VALUES=1` | File-value verification warns instead of failing |
| `OS_ALLOW_LAX_VALUE_SHAPES=1` | Reference/JSON validation warns instead of failing |
| `OS_ALLOW_LAX_ACTION_PARAMS=1` | Action-param shape enforcement warns instead of failing |
| `OS_DATA_VALUE_SHAPE_STRICT_ENABLED=1` | Opt into strict value shapes immediately, without the gate |

### 3.1 Destructive schema drift — database-only columns after an upgrade

`os migrate plan` diffs the live database schema against the current metadata.
After a platform upgrade it can report columns that exist in the database but
are not described by any metadata the planner can see. Some are genuine orphans
— companion columns an older platform version provisioned automatically and the
new version no longer does. A genuine orphan is harmless (nothing reads or
writes it), so cleaning it up is **deferred by design**: schedule it for a
maintenance window instead of bundling it into the upgrade itself. Others are
not orphans at all, only invisible to the planner, and dropping them causes an
outage — so the first job is always to tell the two apart.

> [!WARNING]
> **Not every "orphan" the planner reports is really an orphan.** `os migrate
> plan` describes the schema as the *migrate CLI* understands it, which is not
> always what the *running server* provisioned. A column the runtime creates and
> actively uses can show up as database-only, and dropping it breaks the feature
> that depends on it. Confirm what a column is for before you let anything drop
> it — see the `__search` case below for a live example of this exact trap.

**Known false positive — `__search` companion columns
([#528](https://github.com/objectstack-ai/hotcrm/issues/528)).** After the 17.0
upgrade, `os migrate plan` reports 9 database-only `__search` columns
(`crm_competitor`, `crm_opportunity_line_item`, `crm_quote_line_item`,
`crm_task`, `sys_metadata`). **They are not orphans — do not drop them.**
Column-level comparison on two freshly created databases from the same artifact
showed the split clearly: the database created by `objectstack dev` has 34
columns on `crm_task` *including* `__search`, while the one created by
`os migrate plan --database-url <new file>` has 33 *without* it — and migrate
reports 0 destructive changes against the database it built itself. The
`__search` columns are live pinyin search-companion columns that the dev runtime
provisions and reads; the report is a **schema-view mismatch between the migrate
CLI and the dev runtime**, filed upstream as
[objectstack#3955](https://github.com/objectstack-ai/objectstack/issues/3955).
Dropping them removes working search columns, and the next dev boot may simply
recreate them. **Take no cleanup action on this class until #3955 is fixed.**

Cleanup procedure — for columns you have *positively identified* as genuine
orphans (the `__search` class above is excluded until #3955 lands):

1. **Stop the service first.** Applying destructive schema changes under live
   traffic is unsafe — see ObjectStack platform issue #526.
2. Back up the database (for a local dev database, copy `.objectstack/data`).
3. Run `os migrate plan` and read the whole plan. Clear **every** destructive
   entry against two questions, not one:
   - *Does it back a field you still declare?* If yes, stop and fix the metadata
     drift instead of dropping the column.
   - *Is it a runtime-provisioned companion column* (search/index/derived
     helpers such as `__search`)? These belong to the running server, not to
     your metadata, so the planner cannot vouch for them. If you cannot prove a
     column is dead, treat it as live and stop.

   A useful proof: point `os migrate plan --database-url` at a **freshly
   created** database from the same artifact and compare column lists. Anything
   present in both is being provisioned on purpose, whatever the plan calls it.
4. Run `os migrate apply --allow-destructive`.
5. Restart the service and smoke-test: `os migrate plan` should now be clean,
   and global search in the Console should still return records.

`--allow-destructive` drops columns irreversibly — never run it without the
backup from step 2, and never against a database whose plan you have not read.

### 3.3 Backfilling a hook-derived column

Some HotCRM columns are **derived**: no one authors them, a lifecycle hook
computes them from another field on every write. Two of them are match keys the
lead-conversion flow reads (#626):

| Column | Derived from | Writer |
| --- | --- | --- |
| `crm_account.name_normalized` | `crm_account.name` | `account_protection` |
| `crm_lead.company_normalized` | `crm_lead.company` | `lead_duplicate_check` |

A **fresh install needs nothing here.** Seed writes run lifecycle hooks
(`skipTriggers` suppresses record-change automation, not hooks — measured in
#617), so every seeded and every subsequently created row gets its key stamped
on insert.

An **in-place upgrade does**. A row written before the column existed holds
`NULL`, and the two objects then fail in two different ways — both measured, and
worth knowing apart when triaging:

- **An account with no key is invisible to the match.** The conversion finds
  nothing and creates a *second* account for a company that already has one —
  silently. This is the failure that makes the backfill non-optional: it is
  more duplicates than the behaviour the change replaced.
- **A lead with no key stops the conversion.** The filter value resolves to
  nothing, and `get_record` refuses to run rather than widen the query:
  *"refusing to run — 1 filter condition(s) resolved to nothing and were dropped
  from the query: `{leadRecord.company_normalized}` (at name_normalized)"*. The
  run is recorded failed and the lead stays unconverted. Loud, and the message
  names the missing key — re-save that lead and convert again.

> [!NOTE]
> **This section is a contingency, not a step in any current upgrade.** HotCRM's
> deployment shape today is **fresh installs only**, which is the whole reason
> the procedure below is documented rather than automated, and the reason
> `name_normalized` carries no unique index (see `src/objects/account.object.ts`).
> Both conclusions are conditional on that premise. If HotCRM ever acquires
> long-lived installs that upgrade in place, re-read this section and the index
> decision together — neither is a universal judgement.

The backfill is a **re-save**: write a row's own `name` / `company` back to it
and the hook derives the key. Nothing else about the row changes, and re-saving
a row that already has a key is a no-op — so the pass is idempotent and safe to
repeat or to run over every row rather than hunting for the empty ones.

1. **Take a database backup.** This rewrites every account and lead row.
2. **Read the rows.** Any path you already use is fine — a Console export, a
   `GET` against the record API, or a direct read replica query. You need only
   `id` plus the source field (`name` for accounts, `company` for leads).
3. **Write each row back to itself**, one `PATCH` per record, against the
   record endpoint `PATCH {basePath}/data/:object/:id` (`basePath` is
   `/api/v1`):

   ```bash
   curl -s -X PATCH "$HOTCRM/api/v1/data/crm_account/$ID" \
     -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
     -d '{"name": "Acme Corp"}'          # the row's OWN current name
   ```

   Do **not** send `name_normalized` itself: it is `readonly`, so an incoming
   value is stripped, and the hook would overwrite it anyway. Repeat for
   `crm_lead` with `{"company": "…"}`; converted leads can be skipped
   (`is_converted = true`) — nothing converts them again.
4. **Verify.** No row should be left with an empty key, and the end-to-end
   check is the one that matters: convert a lead whose company differs from an
   existing account only in case or spacing, and confirm it **reuses** that
   account instead of creating a second one.

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

### 4.1 Staffing the demo org (`pnpm demo:staff`)

A reseeded org has records but no PEOPLE. On a fresh install exactly one user
exists (the dev admin), `demo_bootstrap` claims every seeded record for them,
and `sys_user_position` is empty — so every position-based sharing rule this app
ships grants nobody anything, and `opportunity_approval`'s `manager_review` node
opens with an empty approver slate while `lockRecord` holds the record ([#640]).

```bash
pnpm dev          # terminal 1 — leave running
pnpm demo:staff   # terminal 2 — once, after the server is up
```

That creates three non-admin demo users (`na.rep@` / `eu.rep@` /
`sales.manager@objectos.ai`, all `demo1234`), assigns their positions, and
re-evaluates every sharing rule so the already-seeded accounts materialise
grants. It is idempotent, self-verifying (non-zero exit if the layers do not
connect) and prints what each user can see:

```
north_america_territory  matched=  6  holders=1  granted=6
europe_territory         matched=  2  holders=1  granted=2
na.rep@objectos.ai sees 6 account(s) · countries: [CA, US]
eu.rep@objectos.ai sees 2 account(s) · countries: [DE, UK]
```

Who exists and which positions they hold is a table —
[`src/sharing/demo-staffing.ts`](../src/sharing/demo-staffing.ts). Adding a
person is adding a row.

Three things worth knowing before changing any of it:

- **It is a script, not metadata, on purpose.** A real deployment must install
  none of these accounts, so nothing in the published artifact may be able to
  create a user. `test/demo-staffing.test.ts` fails if a seed dataset or a flow
  node ever writes `sys_user` / `sys_member` / `sys_user_position`.
- **Re-evaluating the rules is not optional.** `plugin-sharing` materialises
  grants from a record-write hook that returns early on `isSystem` writes, and
  every seeded row is written with `isSystem: true`. Staffing alone therefore
  leaves `sys_record_share` empty until a rule is re-evaluated (a server restart
  does it too, via the boot backfill).
- **The reps must not own the accounts.** `crm_account` is `private`, so the OWD
  baseline already admits a record's owner — a share to the owner demonstrates
  nothing. Ownership stays with `demo_bootstrap`'s first user; the script exits
  non-zero if a demo user turns out to own a seeded account.

[#640]: https://github.com/objectstack-ai/hotcrm/issues/640

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
