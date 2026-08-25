// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/*
 * The versions this app declares, and the pages that state them — the app
 * version (#612), the protocol version (#728), and `docs/STATUS.md`'s
 * present-tense transcript of the repo (#1011).
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families. These three moved together
 * because the seam is mechanical as well as thematic: `PACKAGE_JSON`,
 * `PLATFORM_VERSIONS` and `h2Sections` directly below are read by the #612
 * rules and by the #1011 rules alike, and one derivation read by two rules is
 * worth more than two files that each own half of it.
 */

/**
 * `package.json`, parsed once — three rules below read it (the version pair,
 * the whats-new latest-release section, and the STATUS.md runtime table).
 */
const PACKAGE_JSON = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
  version?: string;
  scripts?: Record<string, string>;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

/** `^17.0.0-rc.3` and `17.0.0-rc.3` state the same version. */
const bareRange = (range: string | undefined): string => (range ?? '').replace(/^[\^~>=<\s]+/, '');

/**
 * The `@objectstack/*` versions this app installs, deduplicated.
 *
 * A SET rather than one package's value, because the docs speak of "ObjectStack
 * packages" in the plural and that sentence only means anything while the line
 * is uniform — the platform packages are version-locked (AGENTS.md §Platform
 * Upgrades: "bump all `@objectstack/*` packages together"). Both rules that use
 * this assert the set has exactly one member before comparing to it, so a
 * half-finished upgrade fails where the message is true rather than making one
 * doc right against one package and wrong against the rest.
 */
const PLATFORM_VERSIONS: string[] = [
  ...new Set(
    Object.entries({ ...PACKAGE_JSON.dependencies, ...PACKAGE_JSON.devDependencies })
      .filter(([name]) => name.startsWith('@objectstack/'))
      .map(([, range]) => bareRange(range)),
  ),
];

/** A version that `12.2.2` / `2.2.22` cannot satisfy — see the #612 rule below. */
const statesVersion = (text: string, version: string): boolean =>
  new RegExp(`(?<![\\d.])${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d.])`).test(text);

/** `## Heading` → its text plus everything up to the next `## `. */
const h2Sections = (text: string): { heading: string; body: string }[] => {
  const out: { heading: string; body: string[] }[] = [];
  for (const line of text.split('\n')) {
    const m = /^## +(.*)$/.exec(line);
    if (m) out.push({ heading: m[1].trim(), body: [] });
    else if (out.length) out[out.length - 1].body.push(line);
  }
  return out.map((s) => ({ heading: s.heading, body: s.body.join('\n') }));
};

/**
 * Version drift — the docs must print the version the app declares (#612).
 *
 * The same three digits are hand-copied into at least four maintainer docs, and
 * `docs/RELEASE_STRATEGY.md` had been sitting on `1.0.5` since v1 while the
 * manifest said `2.2.2` — a whole major behind, on the page whose entire job is
 * to tell a releaser what the current version IS. #589 caught the same defect in
 * `docs/ARCHITECTURE.md` and #611 fixed that one copy; nothing generalised, so
 * the next copy went on lying.
 *
 * `manifest.version` in `objectstack.config.ts` is the single source of truth
 * here — it is what `pnpm build` stamps into the artifact — and it is READ FROM
 * THE CONFIG rather than regexed out of it, the same derivation the flow rules
 * in `docs-drift.test.ts` use for thresholds.
 *
 * Two rules, because the docs make two different claims:
 *
 *  - **contains**: each listed doc prints the version somewhere. Catches a doc
 *    that quietly drops the number.
 *  - **table rows**: a `| Current version | \`x.y.z\` |` row states the version
 *    as a FACT, so it must state THE version. This is the rule that was red on
 *    `RELEASE_STRATEGY.md` before this change (`1.0.5` vs `2.2.2`) and is the
 *    precise shape of the defect #612 filed.
 *
 * Reverse verification: predicted and measured **red before, green after** —
 * pre-fix the row rule reported `docs/RELEASE_STRATEGY.md:14 states 1.0.5, the
 * manifest declares 2.2.2`, and nothing else in the set was drifted.
 */
describe('the docs print the version the manifest declares (#612)', () => {
  const VERSION: string = ((stack as any).manifest ?? {}).version;

  /** Docs that state the CURRENT version as a fact a reader may act on. */
  const VERSION_DOCS = [
    'docs/RELEASE_STRATEGY.md',
    'docs/STATUS.md',
    'docs/ARCHITECTURE.md',
    'README.md',
  ];

  /**
   * `| Current version | \`2.2.2\` |` — first cell is the LABEL, second carries
   * a backticked semver.
   *
   * Keyed on the first cell, not on "a row mentioning version":
   * `ARCHITECTURE.md` has a row whose text contains "conversion", and
   * `RELEASE_STRATEGY.md` has a `| Change type | Version impact |` header with
   * no version in it at all. Both are matched by the obvious regex and neither
   * states a version.
   */
  const VERSION_ROW = /^\|\s*(?:current\s+)?version\s*\|\s*`([^`]+)`\s*\|/gim;

  const rowsIn = (file: string): { file: string; stated: string }[] => {
    const text = readFileSync(join(REPO_ROOT, file), 'utf8');
    return [...text.matchAll(VERSION_ROW)].map((m) => ({ file, stated: m[1].trim() }));
  };

  const ALL_ROWS = VERSION_DOCS.flatMap(rowsIn);

  it('the manifest declares a version this rule can compare against', () => {
    // Vacuity guard #1: a config whose shape moved would leave VERSION
    // undefined, and `includes(undefined)` throws rather than passing — but the
    // row rule below would go green over zero rows. Pin the source directly.
    expect(
      VERSION,
      'objectstack.config.ts declares no manifest.version — this whole guard is vacuous',
    ).toMatch(/^\d+\.\d+\.\d+/);
  });

  it('package.json agrees with the manifest', () => {
    // The two halves RELEASE_STRATEGY.md's own "Version Sources" section tells a
    // releaser to keep aligned. Cheap to check, and a mismatch here would make
    // every doc below correct against one source and wrong against the other.
    expect(
      PACKAGE_JSON.version,
      `package.json is ${PACKAGE_JSON.version} but objectstack.config.ts declares ${VERSION}. ` +
        'These ship as one artifact; align them (docs/RELEASE_STRATEGY.md §Version Sources).',
    ).toBe(VERSION);
  });

  it('every doc that states a version in a table states the declared one', () => {
    // Vacuity guard #2: the extraction finding nothing looks exactly like every
    // row agreeing. Both docs that carry such a row are in the list, so the
    // floor is 2.
    expect(
      ALL_ROWS.length,
      'no `| Current version | `x.y.z` |` row parsed in any of ' +
        `${VERSION_DOCS.join(', ')} — either the tables were reformatted (teach VERSION_ROW ` +
        'the new shape) or the rows are gone (drop this rule rather than leaving it green ' +
        'over nothing).',
    ).toBeGreaterThanOrEqual(2);
    const drifted = ALL_ROWS.filter((r) => r.stated !== VERSION).map(
      (r) => `${r.file} states ${r.stated}, the manifest declares ${VERSION}`,
    );
    expect(
      drifted,
      `version rows that do not match objectstack.config.ts:\n  ${drifted.join('\n  ')}\n` +
        'Update the doc — the manifest is the source of truth, and a release page printing a ' +
        'stale version is the one page a releaser trusts.',
    ).toEqual([]);
  });

  it('every doc that names the current version prints the declared one', () => {
    // Bounded so `2.2.2` cannot be satisfied by `12.2.2` or `2.2.22`.
    const boundedVersion = new RegExp(
      `(?<![\\d.])${VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\d.])`,
    );
    const silent = VERSION_DOCS.filter(
      (file) => !boundedVersion.test(readFileSync(join(REPO_ROOT, file), 'utf8')),
    );
    expect(
      silent,
      `docs that no longer print the declared version (${VERSION}):\n  ${silent.join('\n  ')}\n` +
        'Each of these tells a reader which version they are looking at. If one legitimately ' +
        'stopped making that claim, drop it from VERSION_DOCS rather than leaving the check ' +
        'green over a page that says nothing.',
    ).toEqual([]);
  });

  /*
   * ─── A section marked "Latest release" states the version we ship (#1015) ───
   *
   * The rules above cover the MAINTAINER docs. `content/docs/whats-new.mdx` is
   * the product-side version page — `content/docs/index.mdx` sends a reader to
   * it for "what changed in the latest version" — and it wrote
   * `## v5.0 — Latest release`, on "ObjectStack 5.0", offering
   * `@objectstack/console@5.0` and `@objectstack/account@5.0` "on npm". Not one
   * of those numbers was ever real for this app: the manifest declares 2.2.2
   * and package.json installs 17.0.0-rc.3, twelve majors away. `v5.0` was
   * neither an app version nor a platform version, so it dated from nothing at
   * all.
   *
   * It survived because each rule that could have read it had a reason not to.
   * VERSION_DOCS lists maintainer pages and this is a product page. The count
   * rule (#729, now `docs-metadata-counts.test.ts`) had the whole page exempted
   * as a release record — correctly for the v1.0 section it was granted for, and
   * the exemption is now section-scoped so it stops covering this one. The
   * persona rule (now `docs-retired-personas.test.ts`) exempts the page too.
   * Three guards read this file and all three were told to look away from the
   * one section on it that is a claim about TODAY.
   *
   * "Latest release" is present tense, so it is held to the two facts that are
   * mechanically knowable about the current tree — the app version the manifest
   * declares, and the platform version package.json installs. Everything else
   * in the section is editorial and this rule does not touch it.
   *
   * The marker table is what makes this read all three locales rather than the
   * English page alone (#725's lesson, applied at the point where a heading is
   * translated). No separate probe test is needed for it: a marker that stopped
   * matching takes its page's section count to zero, which the first rule below
   * reports by name.
   *
   * Reverse verification: predicted and measured **red before, green after** —
   * on the pre-fix tree the heading rule reported all three pages stating
   * neither 2.2.2 nor 17.0.0-rc.3 in their latest-release section. Captured
   * output is in the PR.
   */
  const WHATS_NEW_PAGES = [
    'content/docs/whats-new.mdx',
    'content/docs/whats-new.zh-Hans.mdx',
    'content/docs/whats-new.zh-Hant.mdx',
  ];

  /** How each locale marks the section as being about the current release. */
  const LATEST_MARKERS = ['Latest release', '最新发布', '最新發行'];

  const latestSectionsOf = (file: string): { heading: string; body: string }[] =>
    h2Sections(readFileSync(join(REPO_ROOT, file), 'utf8')).filter((s) =>
      LATEST_MARKERS.some((marker) => s.heading.includes(marker)),
    );

  it('every locale of whats-new marks exactly one section as the latest release', () => {
    // Vacuity guard, both directions. Zero sections reads exactly like every
    // section agreeing — the state a renamed or retranslated heading would put
    // this rule in, silently. Two means the page claims two current releases.
    const wrong = WHATS_NEW_PAGES.map((file) => ({ file, found: latestSectionsOf(file) }))
      .filter((p) => p.found.length !== 1)
      .map(
        (p) =>
          `${p.file}: ${p.found.length} section(s) marked latest ` +
          `(looking for ${LATEST_MARKERS.join(' | ')}; found headings: ` +
          `${p.found.map((s) => s.heading).join(' | ') || 'none'})`,
      );
    expect(
      wrong,
      `whats-new pages that do not mark exactly one latest-release section:\n  ${wrong.join('\n  ')}\n` +
        'Every locale ships this page and every locale makes the claim, so every locale is ' +
        'checked. If a locale renamed the heading, teach LATEST_MARKERS its word — a page this ' +
        'rule cannot find is a page nobody is checking.',
    ).toEqual([]);
  });

  it('the latest-release heading states the version the manifest declares', () => {
    const drifted = WHATS_NEW_PAGES.flatMap((file) =>
      latestSectionsOf(file)
        .filter((s) => !statesVersion(s.heading, VERSION))
        .map((s) => `${file}: "## ${s.heading}" does not state ${VERSION}`),
    );
    expect(
      drifted,
      `latest-release headings that do not state the declared version:\n  ${drifted.join('\n  ')}\n` +
        'A heading is what a reader sees in the table of contents, and "Latest release" is a ' +
        'claim about today. Name the version objectstack.config.ts declares — the number in ' +
        'this heading is the one thing on the page that cannot be a matter of taste.',
    ).toEqual([]);
  });

  it('the latest-release section states the platform version package.json installs', () => {
    // Guard the derivation before comparing against it: an empty or split
    // `@objectstack/*` line would make this rule demand a version nobody
    // installs, or pass over nothing.
    expect(
      PLATFORM_VERSIONS,
      `package.json installs ${PLATFORM_VERSIONS.length} distinct @objectstack/* versions ` +
        `(${PLATFORM_VERSIONS.join(', ') || 'none'}). They are version-locked and bumped ` +
        'together (AGENTS.md §Platform Upgrades); until they agree, no page can state "the" ' +
        'platform version.',
    ).toHaveLength(1);
    const platform = PLATFORM_VERSIONS[0];
    const drifted = WHATS_NEW_PAGES.flatMap((file) =>
      latestSectionsOf(file)
        .filter((s) => !statesVersion(`${s.heading}\n${s.body}`, platform))
        .map((s) => `${file}: "## ${s.heading}" never states the installed platform ${platform}`),
    );
    expect(
      drifted,
      `latest-release sections that do not state the installed platform version:\n  ${drifted.join('\n  ')}\n` +
        'This is the half that was twelve majors out ("Upgraded to ObjectStack 5.0" against an ' +
        'installed 17.x). The platform version a release runs on is a fact about package.json, ' +
        'not a number to be carried forward by hand.',
    ).toEqual([]);
  });
});

/*
 * ─── One protocol version, declared in three files (#728) ────────────────────
 *
 * `objectstack.config.ts` drives the build artifact, `objectstack.manifest.json`
 * is the marketplace template manifest, and `package.json` pins the
 * `@objectstack/*` line the metadata is authored against. All three state the
 * same protocol version, and `objectstack.config.ts`'s own comment has said so
 * since it was written: "Bump together with `specVersion` on every platform
 * upgrade (docs/MAINTENANCE.md §3)".
 *
 * A comment is not a gate. Two consecutive platform upgrades moved the template
 * manifest and the dependency line and left `objectstack.config.ts` behind — the
 * gap was rc.1 vs rc.2 when #728 was filed and had widened to rc.1 vs rc.3 by
 * the time it was fixed. Neither `pnpm build` nor `publish:marketplace:dry-run`
 * compares the two, so the stale value rode all the way into the published
 * artifact (`dist/objectstack.json` → `manifest.engines.protocol`).
 *
 * Only the MAJOR participates in the runtime handshake, so this never blocked a
 * boot — which is precisely why nothing caught it for two releases. It is still
 * a metadata fact distributed to customers, and this turns the file's own
 * maintenance rule from a convention into a gate.
 *
 * Reverse verification: predicted and measured **red before, green after**. On
 * the pre-fix tree the first rule reported `objectstack.config.ts declares
 * ^17.0.0-rc.1, objectstack.manifest.json declares ^17.0.0-rc.3`; the other two
 * rules were already green, so the failure named the one file that was wrong.
 */
describe('one protocol version, declared in three files (#728)', () => {
  const TEMPLATE = 'objectstack.manifest.json';

  const configProtocol: string | undefined = (((stack as any).manifest ?? {}).engines ?? {}).protocol;
  const template = JSON.parse(readFileSync(join(REPO_ROOT, TEMPLATE), 'utf8')) as {
    specVersion?: string;
    engines?: { protocol?: string };
  };
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const installedSpec: string | undefined = (pkg.dependencies ?? {})['@objectstack/spec'];

  /** `^17.0.0-rc.3` and `17.0.0-rc.3` state the same version. */
  const bare = (range: string | undefined): string => (range ?? '').replace(/^[\^~>=<\s]+/, '');

  const SEMVERISH = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

  it('all three sources state a version this rule can compare', () => {
    // Vacuity guard: any of these going absent would make every comparison below
    // compare '' with '' and pass over nothing at all.
    const sources: [string, string | undefined][] = [
      ['objectstack.config.ts manifest.engines.protocol', configProtocol],
      [`${TEMPLATE} specVersion`, template.specVersion],
      [`${TEMPLATE} engines.protocol`, template.engines?.protocol],
      ['package.json dependencies["@objectstack/spec"]', installedSpec],
    ];
    const unreadable = sources
      .filter(([, value]) => !SEMVERISH.test(bare(value)))
      .map(([label, value]) => `${label} = ${value ?? '(absent)'}`);
    expect(
      unreadable,
      `protocol/spec declarations this guard cannot read:\n  ${unreadable.join('\n  ')}\n` +
        'Teach the guard the new shape rather than leaving it green over nothing.',
    ).toEqual([]);
  });

  it('objectstack.config.ts declares the protocol the template manifest declares', () => {
    expect(
      bare(configProtocol),
      `objectstack.config.ts declares ${configProtocol}, ${TEMPLATE} declares ` +
        `${template.engines?.protocol}. These ship as one app: objectstack.config.ts drives ` +
        `dist/objectstack.json's manifest.engines.protocol, and ${TEMPLATE} is what the ` +
        'marketplace reads. Bump both together (docs/MAINTENANCE.md §3).',
    ).toBe(bare(template.engines?.protocol));
  });

  it('the template manifest states one version in both of its fields', () => {
    expect(
      bare(template.specVersion),
      `${TEMPLATE} states specVersion ${template.specVersion} and engines.protocol ` +
        `${template.engines?.protocol} — one file, two spellings of a single fact.`,
    ).toBe(bare(template.engines?.protocol));
  });

  it('the declared protocol is the @objectstack/spec version package.json installs', () => {
    // AGENTS.md §Constraint Checklist → Dependencies: "Keep `specVersion` in
    // `objectstack.manifest.json` aligned with the installed `@objectstack/spec`."
    // This is the half that catches an upgrade moving the dependency line and
    // forgetting the metadata — the shape of #728 on both the rc.2 and rc.3 bumps.
    expect(
      bare(template.specVersion),
      `${TEMPLATE} declares ${template.specVersion} but package.json installs ` +
        `@objectstack/spec ${installedSpec}. The app claims to be authored against a spec ` +
        'version it does not depend on (AGENTS.md §Constraint Checklist → Dependencies).',
    ).toBe(bare(installedSpec));
  });
});

/*
 * ─── docs/STATUS.md states the current repo, not a stale snapshot (#1011) ────
 *
 * `docs/STATUS.md` opens with "Source of truth: `pnpm validate`, `pnpm
 * typecheck`, and `pnpm test`" and is the first page a maintainer — human or
 * agent — opens to learn where the repo stands. Every figure on it had stopped
 * being true: `16 Objects  318 Fields` against 17/344, `4 Dashboards` against
 * 5, `23 Flows` against 24, `13 Views` against 14, and `ObjectStack packages
 * 17.0.0-rc.1` two release candidates behind the installed rc.3. A page that
 * claims to be the source of truth and is wrong in every row is worse than no
 * page, because it is the one a reader stops checking things against.
 *
 * Nothing caught it. The #612 version rules list this file but compare only the
 * APP version, which was right. The #729 count rule (now
 * `docs-metadata-counts.test.ts`) deliberately scans the product surface
 * (README + `content/docs`), and — the reason it stopped there
 * — its claims are prose spellings ("17 business objects") that match nothing
 * in a machine transcript. So this file needed a rule keyed to the shape its
 * claims actually have.
 *
 * Two present-tense tables, two derivations:
 *
 *  - the fenced `pnpm validate` summary, every figure read off the registered
 *    stack, exactly like #729 reads its own;
 *  - `## Current Runtime Requirements`, every row read off `package.json`.
 *
 * ## What this rule deliberately does NOT decide (#1012)
 *
 * The transcript states `26 Actions`, and whether a READER should be told 26
 * (registrations), 13 (action families — an action bound to five objects
 * registers five times) or 6 (`*.actions.ts` files) is an open product question
 * on #1012. This rule does not answer it. It asserts that a block presented as
 * the output of `pnpm validate` matches what the loader registers, which is
 * what that command prints by construction — a fidelity check on a transcript,
 * not a vote on the calibre. However #1012 lands, this assertion is unchanged;
 * what may change is the prose around the block.
 *
 * ## Reverse verification (#1011)
 *
 * Predicted and measured **red before, green after**, in both halves: on the
 * pre-fix tree the transcript rule reported five drifted figures (Objects,
 * Fields, Views, Dashboards, Actions, Flows) and the runtime table reported
 * `ObjectStack packages: page says 17.0.0-rc.1, package.json installs
 * 17.0.0-rc.3`. Captured output is in the PR.
 */
describe('docs/STATUS.md states the current repository (#1011)', () => {
  const STATUS = 'docs/STATUS.md';
  const text = readFileSync(join(REPO_ROOT, STATUS), 'utf8');
  const registered = stack as unknown as Record<string, unknown[]>;
  const len = (kind: string): number => (registered[kind] ?? []).length;

  /**
   * Field totals come from the objects themselves — `fields` is a record keyed
   * by field name, so this is the same sum the validator prints.
   */
  const FIELD_TOTAL = ((registered.objects ?? []) as Record<string, unknown>[]).reduce(
    (total, o) => total + Object.keys((o.fields ?? {}) as Record<string, unknown>).length,
    0,
  );

  /** Every label the transcript prints → the figure the stack registers. */
  const EXPECTED: Record<string, number> = {
    Objects: len('objects'),
    Fields: FIELD_TOTAL,
    Apps: len('apps'),
    Views: len('views'),
    Pages: len('pages'),
    Dashboards: len('dashboards'),
    Reports: len('reports'),
    Actions: len('actions'),
    Flows: len('flows'),
    Positions: len('positions'),
    Permissions: len('permissions'),
  };

  /**
   * The fenced block transcribing the validator summary — identified by its
   * `HotCRM v<version>` first line rather than by position, so inserting a
   * section above it does not silently point this rule at another fence.
   */
  const TRANSCRIPT: string = (() => {
    const fenced = [...text.matchAll(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g)].map((m) => m[1]);
    return fenced.find((body) => /^HotCRM v\d+\.\d+\.\d+/m.test(body)) ?? '';
  })();

  /**
   * `Data: 17 Objects  344 Fields` → `{ Objects: 17, Fields: 344 }`.
   *
   * The separator is horizontal whitespace, never `\s`: the block's first line
   * is `HotCRM v2.2.2` and the next opens `Data:`, so a `\s+` reads the version's
   * last digit and the following line's label as one pair and reports a figure
   * called "Data" that no line states.
   */
  const STATED: Record<string, number> = Object.fromEntries(
    [...TRANSCRIPT.matchAll(/(\d+)[ \t]+([A-Z][A-Za-z]*)/g)].map((m) => [m[2], Number(m[1])]),
  );

  it('the validator transcript is present and parses', () => {
    // Vacuity guard #1. A reformatted or deleted block would leave STATED empty,
    // and every comparison below would then agree with nothing at all — which is
    // indistinguishable from a page that is correct.
    expect(
      TRANSCRIPT,
      `${STATUS} carries no fenced block starting \`HotCRM v<version>\`. Either the transcript ` +
        'was removed (drop this rule rather than leaving it green over nothing) or it was ' +
        'reformatted — teach the extraction the new shape.',
    ).not.toBe('');
    expect(
      Object.keys(STATED).length,
      `${STATUS}'s transcript parsed ${Object.keys(STATED).length} labelled figures ` +
        `(${JSON.stringify(STATED)}). The summary prints ${Object.keys(EXPECTED).length}.`,
    ).toBeGreaterThanOrEqual(Object.keys(EXPECTED).length);
  });

  it('the transcript states every figure the summary prints', () => {
    // Vacuity guard #2, pointed at silent subtraction: a row dropped from the
    // block would take its figure out of STATED, and a rule that only compares
    // what it finds would call that agreement.
    const missing = Object.keys(EXPECTED).filter((label) => !(label in STATED));
    expect(
      missing,
      `${STATUS}'s transcript no longer states: ${missing.join(', ')}. It is presented as the ` +
        'output of `pnpm validate`; a summary missing a line is not that output. Re-run the ' +
        'command and paste what it prints.',
    ).toEqual([]);
  });

  it('every figure the transcript states is one this rule knows', () => {
    // The other direction: the validator growing a figure this rule has never
    // heard of would land in the block unchecked, which is how the last set of
    // numbers aged. Fail loudly and teach EXPECTED where it comes from.
    const unknown = Object.keys(STATED).filter((label) => !(label in EXPECTED));
    expect(
      unknown,
      `${STATUS}'s transcript states figures this rule cannot derive: ${unknown.join(', ')}. ` +
        'Add them to EXPECTED with their source on the registered stack, or drop them from the ' +
        'block — an unchecked number on this page is exactly what #1011 was.',
    ).toEqual([]);
  });

  it('every figure the transcript states is the one the stack registers', () => {
    const drifted = Object.entries(EXPECTED)
      .filter(([label, count]) => label in STATED && STATED[label] !== count)
      .map(([label, count]) => `${label}: page says ${STATED[label]}, the stack registers ${count}`);
    expect(
      drifted,
      `${STATUS} transcribes figures that are not the current ones:\n  ${drifted.join('\n  ')}\n` +
        'Re-run `pnpm validate` and paste its summary. This page calls itself the source of ' +
        'truth for the repo state — a stale figure here is read as fact by the next maintainer.',
    ).toEqual([]);
  });

  it('the transcript names the version the manifest declares', () => {
    const declared: string = ((stack as any).manifest ?? {}).version;
    const stated = /^HotCRM v(\d+\.\d+\.\d+[^\s]*)/m.exec(TRANSCRIPT)?.[1];
    expect(
      stated,
      `${STATUS}'s transcript opens with "HotCRM v${stated}" but objectstack.config.ts declares ` +
        `${declared}.`,
    ).toBe(declared);
  });

  /**
   * `## Current Runtime Requirements` — a present-tense fact table, so it is
   * held to the file those facts live in. The section is sliced out by heading
   * rather than the whole page scanned: `## Local Checks` above it has
   * backticked second cells too, and would be read as requirement rows.
   */
  const REQUIREMENTS_HEADING = 'Current Runtime Requirements';

  const requirementRows: Record<string, string> = (() => {
    const section = h2Sections(text).find((s) => s.heading.includes(REQUIREMENTS_HEADING));
    if (!section) return {};
    return Object.fromEntries(
      [...section.body.matchAll(/^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/gm)].map((m) => [
        m[1].trim(),
        m[2].trim(),
      ]),
    );
  })();

  /** Each row's label → where the value actually lives. */
  const REQUIREMENT_SOURCES: { label: string; source: string; value: () => string }[] = [
    {
      label: 'Node.js',
      source: 'package.json engines.node',
      value: () => (PACKAGE_JSON.engines ?? {}).node ?? '',
    },
    {
      label: 'pnpm',
      source: 'package.json engines.pnpm',
      value: () => (PACKAGE_JSON.engines ?? {}).pnpm ?? '',
    },
    {
      label: 'ObjectStack packages',
      source: 'the @objectstack/* dependency line in package.json',
      // Asserted to be a single version by the test below before it is read.
      value: () => PLATFORM_VERSIONS[0] ?? '',
    },
    {
      label: 'Local dev port',
      // `objectstack dev -p 4001` — the port a reader is told to open is the
      // port the script actually binds, not one remembered from a past release.
      source: "package.json scripts.dev (`-p <port>`)",
      value: () => /-p\s+(\d+)/.exec((PACKAGE_JSON.scripts ?? {}).dev ?? '')?.[1] ?? '',
    },
  ];

  it('the runtime-requirements table parses, with a row for every requirement', () => {
    // Vacuity guard #3: an unparsed table would leave this rule comparing an
    // empty map, agreeing with any page at all.
    const missing = REQUIREMENT_SOURCES.map((r) => r.label).filter((l) => !(l in requirementRows));
    expect(
      missing,
      `${STATUS} §${REQUIREMENTS_HEADING} states no row for: ${missing.join(', ')} ` +
        `(parsed: ${Object.keys(requirementRows).join(', ') || 'nothing'}). Either the table ` +
        'was reformatted — teach the extraction its shape — or a requirement stopped being ' +
        'stated, which is a decision to make deliberately rather than by deletion.',
    ).toEqual([]);
  });

  it('every value this rule derives is readable from package.json', () => {
    // Guard the derivations before comparing against them, for the reason the
    // whats-new rule guards PLATFORM_VERSIONS: a source that went absent would
    // make every row "wrong" for a reason that has nothing to do with the page.
    expect(
      PLATFORM_VERSIONS,
      `package.json installs ${PLATFORM_VERSIONS.length} distinct @objectstack/* versions ` +
        `(${PLATFORM_VERSIONS.join(', ') || 'none'}) — they are version-locked and bumped ` +
        'together (AGENTS.md §Platform Upgrades).',
    ).toHaveLength(1);
    const unreadable = REQUIREMENT_SOURCES.filter((r) => r.value() === '').map(
      (r) => `${r.label}: nothing read from ${r.source}`,
    );
    expect(
      unreadable,
      `requirement values this rule can no longer derive:\n  ${unreadable.join('\n  ')}\n` +
        'Point the derivation at the new shape rather than leaving the row unchecked.',
    ).toEqual([]);
  });

  it('every runtime requirement matches package.json', () => {
    const drifted = REQUIREMENT_SOURCES.filter(
      (r) => r.label in requirementRows && requirementRows[r.label] !== r.value(),
    ).map((r) => `${r.label}: page says \`${requirementRows[r.label]}\`, ${r.source} says \`${r.value()}\``);
    expect(
      drifted,
      `${STATUS} §${REQUIREMENTS_HEADING} disagrees with package.json:\n  ${drifted.join('\n  ')}\n` +
        'This table is written in the present tense and read as fact — the platform row alone ' +
        'sat two release candidates behind for two upgrades (#1011). package.json is the source; ' +
        'the page follows it.',
    ).toEqual([]);
  });
});
