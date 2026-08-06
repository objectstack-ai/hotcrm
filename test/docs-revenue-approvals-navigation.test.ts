// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SysApprovalAction, SysApprovalRequest } from '@objectstack/plugin-approvals';
import { REPO_ROOT } from './helpers/repo-root';
import { CrmApp } from '../src/apps/crm.app';
import { type AnyRec, packFor } from './helpers/metadata-fixtures';

/**
 * `revenue/approvals` › *Where to find pending approvals*, pinned to source
 * (#963).
 *
 * The section listed the same phantom navigation `revenue/index` listed until
 * #943/PR #953 wrote that page to source — the two pages sit in one directory,
 * so a reader who followed the link from one to the other got the corrected
 * account and then the original wrong one. Three separate claims were wrong,
 * and each is wrong in a different way, which is why they are pinned
 * separately:
 *
 *  1. **The sidebar item's label.** `group_approvals` carries exactly one
 *     child and its label is **Inbox** (zh-CN 待我审批). The page called it
 *     *Approval Requests*. That name is not invented — it is the plugin's
 *     label for the OBJECT (`sys_approval_request`: *Approval Request* /
 *     *Approval Requests*) — so the fix is to say where the name really lives,
 *     not to claim nothing carries it. #963's issue body asserted the string
 *     appears nowhere in the repo; it greps 0 in `src/`, but the installed
 *     plugin ships it as `pluralLabel`. Both halves are pinned below.
 *  2. **A navigation item that does not exist.** No node in this app is
 *     labelled *Action History*. The data behind the name is real —
 *     `sys_approval_action` — and so is the way back to its request
 *     (`request_id`), so the page keeps the name and records that only the
 *     entry point is missing, the same disposition PR #953 landed next door.
 *  3. **Three view names that never existed.** *Pending My Approval*,
 *     *Submitted by Me* and *Recently Approved* match nothing in `src/` and
 *     nothing in the approvals plugin. The plugin does ship built-in list
 *     views for both objects — under other labels — so "these three do not
 *     exist" is only half the truth the reader needs; the section names the
 *     real ones, and this file keeps that list in step with the plugin.
 *
 * Nothing else checks this: `os validate` and `pnpm lint` walk authored
 * metadata and never open `content/docs`, so — as with `docs-drift.test.ts`
 * and the service-index guard (#948) — the check lives where the claim lives.
 */

const NAV_NODES: AnyRec[] = (() => {
  const walk = (nodes: AnyRec[]): AnyRec[] =>
    nodes.flatMap((n) => [n, ...walk((n.children ?? []) as AnyRec[])]);
  return walk(((CrmApp as AnyRec).navigation ?? []) as AnyRec[]);
})();

const APPROVALS_GROUP: AnyRec = (() => {
  const group = NAV_NODES.find((n) => n.id === 'group_approvals');
  if (!group) throw new Error('group_approvals is gone — this pin is out of date');
  return group;
})();

const APPROVALS_CHILDREN = (APPROVALS_GROUP.children ?? []) as AnyRec[];

/** Built-in list-view labels the approvals plugin ships, per object. */
const viewLabels = (schema: AnyRec): string[] =>
  Object.values((schema.listViews ?? {}) as Record<string, AnyRec>)
    .map((v) => v.label as string)
    .filter(Boolean);

const REQUEST_VIEWS = viewLabels(SysApprovalRequest as unknown as AnyRec);
const ACTION_VIEWS = viewLabels(SysApprovalAction as unknown as AnyRec);

/** The three names the section says exist nowhere. */
const PHANTOM_VIEWS = ['Pending My Approval', 'Submitted by Me', 'Recently Approved'] as const;

/** Every authored source file, for the "zero hits in `src/`" half of the claim. */
const SRC_TEXT: string = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|json)$/.test(entry)) out.push(readFileSync(full, 'utf8'));
    }
  };
  walk(join(REPO_ROOT, 'src'));
  return out.join('\n');
})();

const PAGES = [
  {
    file: 'content/docs/revenue/approvals.mdx',
    lang: 'en',
    heading: '## Where to find pending approvals',
    /** The denials the section must actually make, not merely imply. */
    denials: [
      /\*Approval Requests\* is not a navigation entry anywhere in this app/,
      /exist nowhere/,
      /no sidebar item anywhere in this app carries that name/,
    ],
    /** Where the section says the *Approval Requests* name really lives. */
    attribution: /calls the \*\*object\*\*/,
    /** Verbatim fragments of the wrong section. None may return. */
    retired: [
      '**Approval Requests** — everything pending',
      'with views *Pending My Approval*',
      '**Action History** — the full audit trail across all approvals',
    ],
  },
  {
    file: 'content/docs/revenue/approvals.zh-Hans.mdx',
    lang: 'zh-Hans',
    heading: '## 在哪里找到待处理的审批',
    denials: [
      /应用里没有任何导航条目叫 \*Approval Requests\*/,
      /哪里都不存在/,
      /本应用侧边栏上也没有任何条目叫这个名字/,
    ],
    attribution: /审批插件给\*\*对象\*\*起的名字/,
    retired: [
      '**审批请求**——所有待处理项',
      '带视图 *Pending My Approval*',
      '**操作历史**——跨所有审批的完整审计跟踪',
    ],
  },
  {
    file: 'content/docs/revenue/approvals.zh-Hant.mdx',
    lang: 'zh-Hant',
    heading: '## 在哪裡找到待處理的審批',
    denials: [
      /應用裡沒有任何導覽條目叫 \*Approval Requests\*/,
      /哪裡都不存在/,
      /本應用側邊欄上也沒有任何條目叫這個名字/,
    ],
    attribution: /審批外掛給\*\*物件\*\*取的名字/,
    retired: [
      '**審批請求**——所有待處理項',
      '帶視圖 *Pending My Approval*',
      '**操作歷史**——跨所有審批的完整稽核軌跡',
    ],
  },
] as const;

/** The `## …` section named by `heading`, up to the next `## `. */
const sectionOf = (file: string, heading: string): string => {
  const lines = readFileSync(join(REPO_ROOT, file), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.trim() === heading);
  expect(start, `${file}: heading '${heading}' not found`).toBeGreaterThanOrEqual(0);
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
};

describe('the source facts the approvals navigation section rests on (#963)', () => {
  it('sees a non-trivial navigation tree and a plugin that ships views', () => {
    // Guards the guard: an empty walk, or a plugin whose schemas stopped
    // exposing `listViews`, would make every assertion below pass by checking
    // nothing — the failure mode `test/action-references.test.ts`'s navigation
    // guard lived in for its whole life.
    expect(NAV_NODES.length, 'navigation walk found nothing').toBeGreaterThan(20);
    expect(REQUEST_VIEWS.length, 'sys_approval_request ships no list views').toBeGreaterThanOrEqual(4);
    expect(ACTION_VIEWS.length, 'sys_approval_action ships no list views').toBeGreaterThanOrEqual(3);
    expect(SRC_TEXT.length, 'src/ scan read nothing').toBeGreaterThan(100_000);
  });

  it('the Approvals group holds exactly one item, labelled Inbox', () => {
    expect(APPROVALS_CHILDREN.map((c) => c.label)).toEqual(['Inbox']);
    expect(APPROVALS_CHILDREN[0]!.objectName).toBe(SysApprovalRequest.name);
  });

  it('that item pins no view, so the object\'s own list views are what a reader meets', () => {
    // The section explains the four tabs *because* the nav item names none of
    // them. Pin a `viewName` here and the prose has to change with it.
    expect(APPROVALS_CHILDREN[0]!.viewName).toBeUndefined();
  });

  it('the Approvals group is collapsed by default', () => {
    expect(APPROVALS_GROUP.expanded).toBeFalsy();
  });

  it('zh-CN shows that item as 待我审批', () => {
    const label = (packFor('zh-CN') as AnyRec)?.apps?.[CrmApp.name]?.navigation?.nav_approval_requests?.label;
    expect(label).toBe('待我审批');
  });

  it('no navigation node anywhere is called Approval Requests or Action History', () => {
    const labels = NAV_NODES.map((n) => String(n.label ?? ''));
    expect(labels.filter((l) => /Approval Requests|Action History/.test(l))).toEqual([]);
  });

  it('but the plugin does label the object Approval Requests — the name the page mis-placed', () => {
    // The half #963's issue body got wrong. If the plugin ever renames the
    // object, the section's "the name is not invented" sentence stops being
    // true and this test says so.
    expect((SysApprovalRequest as AnyRec).pluralLabel).toBe('Approval Requests');
    expect((SysApprovalRequest as AnyRec).label).toBe('Approval Request');
    expect(SRC_TEXT).not.toContain('Approval Requests');
  });

  it('none of the three phantom view names exists in src/ or in the approvals plugin', () => {
    const pluginNames = [
      ...REQUEST_VIEWS,
      ...ACTION_VIEWS,
      ...Object.keys((SysApprovalRequest as AnyRec).listViews ?? {}),
      ...Object.keys((SysApprovalAction as AnyRec).listViews ?? {}),
    ];
    for (const phantom of PHANTOM_VIEWS) {
      expect(SRC_TEXT, `${phantom} now exists in src/ — the docs' negative claim is stale`).not.toContain(phantom);
      expect(pluginNames, `${phantom} is now a real plugin view`).not.toContain(phantom);
    }
  });

  it('the audit trail is real data with no way in: an object, its views, and a link home', () => {
    expect(SysApprovalAction.name).toBe('sys_approval_action');
    expect((SysApprovalAction as AnyRec).fields?.request_id?.reference).toBe(SysApprovalRequest.name);
    const opensIt = NAV_NODES.filter((n) => n.objectName === SysApprovalAction.name);
    expect(opensIt, 'a nav entry now opens the audit trail — the docs say none does').toEqual([]);
  });
});

describe('revenue/approvals names the navigation that exists (#963)', () => {
  describe.each(PAGES)('$file', ({ file, heading, denials, attribution, retired }) => {
    const section = () => sectionOf(file, heading);

    it('names the real sidebar item', () => {
      expect(section()).toContain('Inbox');
    });

    it('lists every built-in view of the approval request, by its source label', () => {
      const text = section();
      const missing = REQUEST_VIEWS.filter((l) => !text.includes(l));
      expect(
        missing,
        `${file}: the section omits list view(s) the approvals plugin ships — a reader ` +
          'filtering the Inbox would not find them',
      ).toEqual([]);
    });

    it('lists the audit-trail views too, so "real data, no entry point" is concrete', () => {
      const text = section();
      expect(ACTION_VIEWS.filter((l) => !text.includes(l))).toEqual([]);
      expect(text).toContain(SysApprovalAction.name);
    });

    it('keeps all five wrong names on the page instead of deleting them silently', () => {
      const text = section();
      for (const name of [...PHANTOM_VIEWS, 'Approval Requests', 'Action History']) {
        expect(text, `${file}: ${name} was dropped — a reader who remembers it learns nothing`).toContain(name);
      }
    });

    it('states the denial for each of them, not merely the correction', () => {
      const text = section();
      for (const re of denials) expect(text, `${file}: missing denial ${re}`).toMatch(re);
    });

    it('says where the Approval Requests name really lives', () => {
      expect(section()).toMatch(attribution);
    });

    it('does not resurrect the claims #963 removed', () => {
      const text = section();
      expect(retired.filter((phrase) => text.includes(phrase))).toEqual([]);
    });
  });
});
