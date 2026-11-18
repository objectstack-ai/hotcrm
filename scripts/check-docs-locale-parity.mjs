#!/usr/bin/env node
// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Docs locale parity gate (hotcrm#2609).
 *
 * The docs site, the in-app manual and the README are written in English and
 * kept in Chinese beside it. Nothing used to stop a pull request that changed
 * the English alone, so the twins stayed in step only by habit (the README pair
 * had already drifted). This gate fails a pull request that changes an English
 * file and none of its Chinese twins:
 *
 *   content/docs/**\/X.mdx   ↔  X.zh-Hans.mdx and X.zh-Hant.mdx
 *   src/**\/docs/X.md        ↔  X.zh.md
 *   README.md               ↔  README.zh-CN.md
 *
 * Every twin of a changed English file must be in the diff too: added,
 * changed or deleted with it. "Changed" is any byte, frontmatter included,
 * because the gate cannot tell a reordering from a rewrite.
 *
 * **The way out is a label plus a reason.** When the English change has no
 * Chinese counterpart (a frontmatter `order:`, a count a test keeps true, a
 * fix to English wording), apply the `docs-en-only` label AND write a line in
 * the pull request body that starts `Docs-en-only:` and says why. Either one
 * alone still fails: the label says the author decided, the line says what.
 *
 * Run by `.github/workflows/docs-locale-parity.yml` on every pull request,
 * re-run when a label is added or removed or the body is edited. The same
 * command runs locally against any base:
 *
 *   node scripts/check-docs-locale-parity.mjs --base origin/main
 *
 * In CI the base is `BASE_SHA` and the labels and body are read from the
 * pull request event (`GITHUB_EVENT_PATH`). `--history N` instead replays the
 * last N first-parent commits of HEAD (each squash-merged pull request) and
 * reports which would have needed the label.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The label that waives the gate, with a `Docs-en-only:` reason in the body. */
export const LABEL = 'docs-en-only';

/** The body line that states the reason; the text after the colon must not be blank. */
export const REASON_RE = /^\s*Docs-en-only:\s*(\S.*)$/im;

/**
 * The Chinese twins of an English path, or `null` when the path is not an
 * English file the gate watches (a twin itself, or any other file).
 */
export function twinsOf(path) {
  if (path === 'README.md') return ['README.zh-CN.md'];
  if (path.startsWith('content/docs/') && path.endsWith('.mdx')) {
    if (/\.zh-Han[st]\.mdx$/.test(path)) return null;
    const stem = path.slice(0, -'.mdx'.length);
    return [`${stem}.zh-Hans.mdx`, `${stem}.zh-Hant.mdx`];
  }
  if (path.startsWith('src/') && /\/docs\/[^/]+\.md$/.test(path)) {
    if (path.endsWith('.zh.md')) return null;
    return [`${path.slice(0, -'.md'.length)}.zh.md`];
  }
  return null;
}

/**
 * Judge one change set. `changed` is every path the change adds, modifies or
 * deletes (renames as a delete plus an add). Returns the English files whose
 * twins were left out, each with the twins it is missing, and whether the
 * label path waives them.
 *
 * @param {string[]} changed
 * @param {{ labels?: string[], body?: string }} [pr]
 */
export function judge(changed, { labels = [], body = '' } = {}) {
  const set = new Set(changed);
  const missing = [];
  for (const path of [...set].sort()) {
    const twins = twinsOf(path);
    if (!twins) continue;
    const absent = twins.filter((t) => !set.has(t));
    if (absent.length) missing.push({ path, absent });
  }
  const labelled = labels.includes(LABEL);
  const reason = (String(body ?? '').match(REASON_RE)?.[1] ?? '').trim();
  return {
    missing,
    labelled,
    reason,
    ok: missing.length === 0 || (labelled && reason.length > 0),
  };
}

/** The message a failing run prints: what is missing and how to waive it. */
export function explain(result) {
  const lines = [];
  for (const { path, absent } of result.missing) {
    lines.push(`${path} changed, but not ${absent.join(' or ')}.`);
  }
  if (!result.missing.length) return lines;
  if (result.ok) {
    lines.push(`Waived by the '${LABEL}' label: ${result.reason}`);
    return lines;
  }
  lines.push('');
  lines.push('Change the Chinese twins in this pull request too. If this English change has no');
  lines.push(`Chinese counterpart, apply the '${LABEL}' label AND add a line to the pull request`);
  lines.push('body saying why, for example:');
  lines.push('');
  lines.push('  Docs-en-only: frontmatter order only; the twins carry their own order.');
  lines.push('');
  if (result.labelled && !result.reason) lines.push(`The '${LABEL}' label is on, but the body has no 'Docs-en-only:' reason.`);
  if (!result.labelled && result.reason) lines.push(`The body gives a reason, but the '${LABEL}' label is not applied.`);
  return lines;
}

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

/** The paths a range touches, renames split into their two sides. */
export function changedPaths(from, to = 'HEAD') {
  return git(['diff', '--name-only', '--no-renames', from, to]).split('\n').filter(Boolean);
}

function readEvent() {
  const file = process.env.GITHUB_EVENT_PATH;
  if (!file) return { labels: [], body: '' };
  try {
    const event = JSON.parse(readFileSync(file, 'utf8'));
    const pr = event.pull_request ?? {};
    return { labels: (pr.labels ?? []).map((l) => l.name), body: pr.body ?? '' };
  } catch {
    return { labels: [], body: '' };
  }
}

function argValue(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function history(count) {
  const commits = git(['log', '--first-parent', '--format=%H%x09%s', `-${count}`, 'HEAD']).split('\n').filter(Boolean);
  let needed = 0;
  for (const line of commits) {
    const [sha, subject] = line.split('\t');
    const parents = git(['rev-list', '--parents', '-n', '1', sha]).trim().split(' ');
    if (parents.length < 2) continue;
    const result = judge(changedPaths(parents[1], sha));
    if (result.missing.length) {
      needed++;
      console.log(`${sha.slice(0, 7)} ${subject}`);
      for (const { path, absent } of result.missing) console.log(`    ${path} (not ${absent.join(', ')})`);
    }
  }
  console.log(`\n${needed} of ${commits.length} first-parent commits changed English docs without a twin.`);
}

function main() {
  const historyCount = argValue('--history');
  if (historyCount) {
    history(Number(historyCount));
    return;
  }
  const base = argValue('--base') ?? process.env.BASE_SHA;
  if (!base) {
    console.error('Name the base: --base <ref>, or BASE_SHA in the environment.');
    process.exit(2);
  }
  const result = judge(changedPaths(base), readEvent());
  for (const line of explain(result)) console.log(line);
  if (!result.ok) {
    console.log(`::error::English docs changed without their Chinese twins. Change the twins, or apply the '${LABEL}' label and add a 'Docs-en-only: <reason>' line to the pull request body.`);
    process.exit(1);
  }
  if (!result.missing.length) console.log('Every changed English docs file changed with its Chinese twins.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
