// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * No workflow may be triggered by the `release` event (#1908).
 *
 * `publish-staging.yml` declared `release: [published]` from the day it was
 * written, and it never once fired for a release this repo produced. Releases
 * are created by `release.yml` through `softprops/action-gh-release`
 * authenticated as `GITHUB_TOKEN`, and GitHub raises no workflow-triggering
 * event for anything `GITHUB_TOKEN` does — the rule that stops workflows
 * recursing. Of the eleven runs in that workflow's whole history exactly three
 * carried `event=release`, and those three are exactly the three releases a
 * human created by hand in the web UI before the release job was automated.
 *
 * The cost was v2.1.0: bot-created, nobody dispatched a publish because the
 * declaration said one would happen, and that version never reached the
 * marketplace in any form. A trigger that silently does nothing is worse than
 * an absent one — it is the reason nobody checks.
 *
 * So the repair is not "fix that one file": it is that the shape cannot come
 * back. Anyone reading GitHub's docs will find `release: [published]` and
 * believe it, exactly as the author of that line did.
 *
 * ## The premise this rule rests on, stated so it can be re-examined
 *
 * `GITHUB_TOKEN` cannot raise the event. If this repo ever starts cutting
 * releases under a PAT or a GitHub App token, a `release` trigger WOULD fire
 * and this rule becomes wrong — delete it deliberately at that point, with the
 * token change in the same PR. ⛔ Do not weaken it with a per-file exemption:
 * an exemption list is how the dead declaration would return one file at a time.
 *
 * ## The YAML is read with regexes
 *
 * Dependency-free, following `test/labeler-config.test.ts` and
 * `test/docs-app-workflow-paths.test.ts`. Every trigger block in this repo is
 * the flat `on:` → two-space `<event>:` shape, and staying dependency-free
 * means this guard can never be the reason the suite is skipped.
 *
 * Reverse verification: predicted and measured **red before, green after** —
 * restoring `release:\n    types: [published]` in `publish-staging.yml` takes
 * the first rule red naming that file, and the tag-trigger rule red as well.
 * Captured output is in the PR.
 */

const WORKFLOW_DIR = '.github/workflows';

/** Every workflow file, repo-relative. */
const WORKFLOWS: string[] = readdirSync(join(REPO_ROOT, WORKFLOW_DIR))
  .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
  .sort()
  .map((f) => `${WORKFLOW_DIR}/${f}`);

const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), 'utf8');

/**
 * The body of the `on:` block — every line after `on:` up to the next
 * column-1 key.
 *
 * Comment lines at column 1 do not end the block: `#` is not a key, and this
 * repo writes long rationale comments inside trigger blocks.
 */
const onBlock = (text: string): string => {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => /^on:\s*$/.test(l));
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^[A-Za-z_]/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

/** Event names declared in the block — exactly two spaces of indent, no more. */
const eventsOf = (text: string): string[] =>
  [...onBlock(text).matchAll(/^ {2}(?! )([a-z_]+):/gm)].map((m) => m[1]);

/** The `tags:` globs under a `push:` trigger, in declaration order. */
const tagPatternsOf = (text: string): string[] => {
  const lines = onBlock(text).split('\n');
  const i = lines.findIndex((l) => /^ {4}tags:\s*$/.test(l));
  if (i === -1) return [];
  const out: string[] = [];
  for (const line of lines.slice(i + 1)) {
    const m = /^ {6}- '([^']+)'\s*$/.exec(line);
    if (!m) break;
    out.push(m[1]);
  }
  return out;
};

describe('no workflow is triggered by the release event (#1908)', () => {
  it('every workflow declares a trigger block this rule can read', () => {
    // Vacuity guard, both halves. An empty WORKFLOWS list, or an `on:` block
    // written in a shape these regexes do not match, would leave every
    // assertion below agreeing with nothing at all — which reads exactly like
    // a repo that is correct.
    expect(
      WORKFLOWS.length,
      `${WORKFLOW_DIR} yielded ${WORKFLOWS.length} workflow files. Either the directory moved ` +
        '— point this rule at it — or this guard is now checking nothing.',
    ).toBeGreaterThanOrEqual(10);

    const unreadable = WORKFLOWS.filter((w) => eventsOf(read(w)).length === 0);
    expect(
      unreadable,
      `workflows whose triggers this rule cannot read: ${unreadable.join(', ')}\n` +
        'Every workflow has an `on:` block; one that parses to zero events means the extraction ' +
        'no longer matches the file\'s shape (an inline `on: [push]`, or different indentation). ' +
        'Teach the extraction rather than leaving the file unchecked.',
    ).toEqual([]);
  });

  it('no workflow declares a `release` trigger', () => {
    const offenders = WORKFLOWS.filter((w) => eventsOf(read(w)).includes('release'));
    expect(
      offenders,
      `workflows triggered by the release event: ${offenders.join(', ')}\n` +
        'This event cannot fire here: releases are created by `release.yml` as `GITHUB_TOKEN`, ' +
        'and GitHub raises no workflow-triggering event for a `GITHUB_TOKEN` action. The ' +
        'declaration would be read as automation by every maintainer and would do nothing — ' +
        'that is #1908, and v2.1.0 never reached the marketplace because of it. Trigger off the ' +
        "tag push instead (`push: tags: ['v*.*.*']`), which comes from a human's `git push`.",
    ).toEqual([]);
  });
});

describe('the staging publish runs off the same tag push the release does (#1908)', () => {
  const STAGING = `${WORKFLOW_DIR}/publish-staging.yml`;
  const RELEASE = `${WORKFLOW_DIR}/release.yml`;
  const PRODUCTION = `${WORKFLOW_DIR}/publish-production.yml`;

  it('both workflows declare a tag trigger this rule can read', () => {
    // Vacuity guard #2: the comparison below is between two derived lists, and
    // two empty lists are equal. Assert each is non-empty first, so a trigger
    // that was deleted fails here — where the message is true — rather than
    // passing as agreement.
    for (const w of [STAGING, RELEASE]) {
      expect(
        tagPatternsOf(read(w)),
        `${w} declares no \`push: tags:\` globs this rule can read. A staging publish with only ` +
          '`workflow_dispatch` left is the pre-#1908 state with the dead declaration removed: ' +
          'still nothing fires on a release.',
      ).not.toEqual([]);
    }
  });

  it('the staging publish and the release fire on the same tags', () => {
    expect(
      tagPatternsOf(read(STAGING)),
      `${STAGING} watches ${JSON.stringify(tagPatternsOf(read(STAGING)))} and ${RELEASE} watches ` +
        `${JSON.stringify(tagPatternsOf(read(RELEASE)))}. Cutting a tag must start both off the ` +
        'one push; a tag that produces a GitHub release and no marketplace publish is v2.1.0 again.',
    ).toEqual(tagPatternsOf(read(RELEASE)));
  });

  it('production stays manual-only', () => {
    // The other direction, and the one that matters more: this fix must not
    // turn a tag into a production publish. `docs/RELEASE_STRATEGY.md` is cut
    // to staging, verify, then promote by hand — so production's trigger set
    // is exactly one event.
    expect(
      eventsOf(read(PRODUCTION)),
      `${PRODUCTION} declares ${JSON.stringify(eventsOf(read(PRODUCTION)))}. Production is ` +
        'promoted by hand after staging has been verified; a tag or a release must never publish ' +
        'to cloud.objectos.ai on its own.',
    ).toEqual(['workflow_dispatch']);
  });
});
