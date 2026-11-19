// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LABEL, judge, explain, twinsOf } from '../scripts/check-docs-locale-parity.mjs';

/**
 * The docs locale parity gate (hotcrm#2609): a pull request that changes an
 * English docs page, manual page or README changes its Chinese twins too, or
 * carries the `docs-en-only` label with a `Docs-en-only:` reason in its body.
 * `scripts/check-docs-locale-parity.mjs`, run on pull requests by
 * `.github/workflows/docs-locale-parity.yml`.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT = join(ROOT, 'scripts/check-docs-locale-parity.mjs');

type Result = { missing: { path: string; absent: string[] }[]; labelled: boolean; reason: string; ok: boolean };
const run = (changed: string[], pr: { labels?: string[]; body?: string } = {}): Result => judge(changed, pr) as Result;

describe('the three pairs the gate watches', () => {
  it('a docs site page has two twins, Simplified and Traditional', () => {
    expect(twinsOf('content/docs/(product)/expenses/travel-requests.mdx')).toEqual([
      'content/docs/(product)/expenses/travel-requests.zh-Hans.mdx',
      'content/docs/(product)/expenses/travel-requests.zh-Hant.mdx',
    ]);
    expect(twinsOf('content/docs/(start)/index.mdx')).toEqual(['content/docs/(start)/index.zh-Hans.mdx', 'content/docs/(start)/index.zh-Hant.mdx']);
  });

  it('a manual page has one twin, .zh.md, wherever its docs folder sits under src/', () => {
    expect(twinsOf('src/expense/docs/crm_expense_recording.md')).toEqual(['src/expense/docs/crm_expense_recording.zh.md']);
    expect(twinsOf('src/docs/crm_sales_activities.md')).toEqual(['src/docs/crm_sales_activities.zh.md']);
  });

  it('the README has README.zh-CN.md', () => {
    expect(twinsOf('README.md')).toEqual(['README.zh-CN.md']);
  });

  it('a twin, and every other file, is not an English file the gate watches', () => {
    for (const path of [
      'content/docs/(start)/index.zh-Hans.mdx', 'content/docs/(start)/index.zh-Hant.mdx', 'src/expense/docs/crm_expense_recording.zh.md',
      'README.zh-CN.md', 'content/docs/(product)/expenses/meta.json', 'docs/STATUS.md', 'src/expense/objects/expense.object.ts',
      'packages/x/README.md', 'docs/README.md',
    ]) expect(twinsOf(path), path).toBeNull();
  });

  it('every English file in the tree has its twins on disk today, so the rules match the tree', () => {
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else files.push(relative(ROOT, full).split('\\').join('/'));
      }
    };
    walk(join(ROOT, 'content/docs'));
    walk(join(ROOT, 'src'));
    files.push('README.md');
    const english = files.filter((f) => twinsOf(f));
    expect(english.filter((f) => f.startsWith('content/docs/')).length).toBeGreaterThan(50);
    expect(english.filter((f) => f.startsWith('src/')).length).toBeGreaterThan(10);
    const orphans = english.flatMap((f) => (twinsOf(f) as string[]).filter((t) => !existsSync(join(ROOT, t))).map((t) => `${f} → ${t}`));
    expect(orphans).toEqual([]);
  });
});

describe('judging a change', () => {
  it('passes when the English and every twin change together', () => {
    expect(run(['content/docs/a.mdx', 'content/docs/a.zh-Hans.mdx', 'content/docs/a.zh-Hant.mdx']).ok).toBe(true);
    expect(run(['src/sales/docs/x.md', 'src/sales/docs/x.zh.md']).ok).toBe(true);
    expect(run(['README.md', 'README.zh-CN.md']).ok).toBe(true);
  });

  it('passes a change to a twin alone, or to no docs at all', () => {
    expect(run(['content/docs/a.zh-Hans.mdx']).ok).toBe(true);
    expect(run(['src/expense/objects/expense.object.ts', 'docs/STATUS.md']).ok).toBe(true);
  });

  it('fails each pair when the English changes alone, naming what is missing', () => {
    const site = run(['content/docs/a.mdx', 'content/docs/a.zh-Hans.mdx']);
    expect(site.ok).toBe(false);
    expect(site.missing).toEqual([{ path: 'content/docs/a.mdx', absent: ['content/docs/a.zh-Hant.mdx'] }]);
    expect(run(['src/sales/docs/x.md']).missing).toEqual([{ path: 'src/sales/docs/x.md', absent: ['src/sales/docs/x.zh.md'] }]);
    expect(run(['README.md']).missing).toEqual([{ path: 'README.md', absent: ['README.zh-CN.md'] }]);
  });

  it('a new or deleted English page needs its twins added or deleted with it', () => {
    // `git diff --name-only --no-renames` lists an added or deleted file like a changed one.
    expect(run(['content/docs/new.mdx']).ok).toBe(false);
    expect(run(['content/docs/new.mdx', 'content/docs/new.zh-Hans.mdx', 'content/docs/new.zh-Hant.mdx']).ok).toBe(true);
  });

  it(`passes with the '${LABEL}' label and a Docs-en-only reason, and with neither alone`, () => {
    const body = 'Fixes #1\n\nDocs-en-only: the README count line only; a test keeps it true.\n';
    const waived = run(['README.md'], { labels: [LABEL, 'documentation'], body });
    expect(waived).toMatchObject({ ok: true, labelled: true, reason: 'the README count line only; a test keeps it true.' });
    expect(explain(waived).join('\n')).toMatch(/Waived by the 'docs-en-only' label/);

    const labelOnly = run(['README.md'], { labels: [LABEL], body: 'Fixes #1' });
    expect(labelOnly.ok).toBe(false);
    expect(explain(labelOnly).join('\n')).toMatch(/label is on, but the body has no 'Docs-en-only:' reason/);

    const blank = run(['README.md'], { labels: [LABEL], body: 'Docs-en-only:   \n' });
    expect(blank.ok, 'a blank reason is no reason').toBe(false);

    const reasonOnly = run(['README.md'], { labels: [], body });
    expect(reasonOnly.ok).toBe(false);
    expect(explain(reasonOnly).join('\n')).toMatch(/label is not applied/);
  });

  it('a failing run says how to apply the label', () => {
    const text = explain(run(['content/docs/a.mdx'])).join('\n');
    expect(text).toMatch(/content\/docs\/a\.mdx changed, but not content\/docs\/a\.zh-Hans\.mdx or content\/docs\/a\.zh-Hant\.mdx/);
    expect(text).toMatch(/apply the 'docs-en-only' label AND add a line/);
    expect(text).toMatch(/Docs-en-only: /);
  });
});

describe('the command, on a real git history and a pull request event', () => {
  let repo: string;
  const sh = (args: string[]): string => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const write = (path: string, text: string): void => {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), text);
  };
  const cli = (event?: object): { status: number; out: string } => {
    const env: NodeJS.ProcessEnv = { ...process.env, BASE_SHA: 'base' };
    delete env.GITHUB_EVENT_PATH;
    if (event) {
      const file = join(repo, '..', `event-${Date.now()}.json`);
      writeFileSync(file, JSON.stringify(event));
      env.GITHUB_EVENT_PATH = file;
    }
    try {
      return { status: 0, out: execFileSync('node', [SCRIPT], { cwd: repo, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) };
    } catch (e) {
      const err = e as { status: number; stdout: string };
      return { status: err.status, out: err.stdout };
    }
  };

  beforeAll(() => {
    repo = join(mkdtempSync(join(tmpdir(), 'docs-parity-')), 'repo');
    mkdirSync(repo);
    sh(['init', '-q', '-b', 'main']);
    sh(['config', 'user.email', 'test@example.com']);
    sh(['config', 'user.name', 'Test']);
    write('README.md', 'Hello\n');
    write('README.zh-CN.md', '你好\n');
    write('content/docs/a.mdx', '# A\n');
    write('content/docs/a.zh-Hans.mdx', '# 甲\n');
    write('content/docs/a.zh-Hant.mdx', '# 甲\n');
    sh(['add', '-A']);
    sh(['commit', '-q', '-m', 'base']);
    sh(['tag', 'base']);
  });

  afterAll(() => rmSync(dirname(repo), { recursive: true, force: true }));

  it('fails an English-only change with the exit code CI reads, and passes it with the label and a reason', () => {
    write('README.md', 'Hello again\n');
    write('content/docs/a.mdx', '# A, renamed\n');
    sh(['commit', '-qam', 'english only']);
    const red = cli({ pull_request: { labels: [], body: '' } });
    expect(red.status).toBe(1);
    expect(red.out).toMatch(/README\.md changed, but not README\.zh-CN\.md/);
    expect(red.out).toMatch(/::error::/);
    const green = cli({ pull_request: { labels: [{ name: LABEL }], body: 'Docs-en-only: wording only.' } });
    expect(green.status).toBe(0);
    expect(green.out).toMatch(/Waived by the 'docs-en-only' label: wording only\./);
  });

  it('passes once the twins change too', () => {
    write('README.zh-CN.md', '你好，再见\n');
    write('content/docs/a.zh-Hans.mdx', '# 甲，改名\n');
    write('content/docs/a.zh-Hant.mdx', '# 甲，改名\n');
    sh(['commit', '-qam', 'twins']);
    const res = cli();
    expect(res.status).toBe(0);
    expect(res.out).toMatch(/changed with its Chinese twins/);
  });
});
