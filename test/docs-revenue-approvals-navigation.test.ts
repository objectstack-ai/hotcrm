// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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
 *
 * ## The destination, pinned to the entry (#1162)
 *
 * #1123 re-pointed the Inbox entry away from `sys_approval_request` to the
 * platform's approval centre, and every assertion in this file stayed green
 * while two doc claims went wrong — because the doc-side pins all asked
 * whether a NAME is *present* (or a retired phrase absent), never whether the
 * destination the page describes is the destination the entry carries. A page
 * can satisfy all of them and still send the reader to a screen the sidebar
 * stopped opening.
 *
 * `destinationClaims` closes that: each page fixture carries the sentence that
 * belongs to each shape the entry could take, and the test picks the required
 * one from `INBOX_DESTINATION` — read off `crm.app.ts` itself — then forbids
 * the others. Re-point the entry without rewriting the pages and this goes red
 * naming both sides. It is still a prose pin, the same class as `retired`
 * below: it cannot tell that a rewrite is *good*, only that the page and the
 * entry are talking about the same destination.
 *
 * The centre's own labels are pinned the other way, against the installed
 * console bundle (`consoleBundleText`), the way the sibling guard in
 * `docs-search-navigation-views.test.ts` resolves its 「…」 glosses against the
 * shipped plugin. Nothing else in this repo would notice a console release
 * renaming a tab out from under the pages.
 *
 * The four built-in view labels remain real and still shipped by the plugin —
 * they are simply not what the Inbox entry opens any more, so the section keeps
 * naming them under a heading of their own, and the pages carry an explicit
 * collision table: *My Pending* and *All* appear on both sides verbatim, and
 * the centre's **Submitted by me** tab differs from the phantom *Submitted by
 * Me* only in capitalisation.
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

/**
 * Which destination the Inbox entry actually carries, reduced to the
 * discriminant the doc pins key on. Anything unrecognised stays distinct, so a
 * third shape fails loudly rather than silently matching one of the two the
 * pages know how to describe.
 */
const INBOX_DESTINATION: string = (() => {
  const inbox = APPROVALS_CHILDREN[0];
  if (!inbox) return 'missing';
  if (inbox.type === 'component' && inbox.componentRef === 'approvals:inbox') return 'approval-centre';
  if (inbox.type === 'object' && inbox.objectName === SysApprovalRequest.name) return 'request-object-list';
  return `unpinned:${String(inbox.type)}`;
})();

/**
 * Every shipped console bundle, joined once and memoised.
 *
 * The centre's tabs and status labels are rendered by the console, not by
 * anything this repo authors, so a page naming them is quoting a third party.
 * Read lazily: the bundles are tens of megabytes and only the label pins need
 * them.
 */
let consoleTextCache: string | undefined;
const consoleBundleText = (): string => {
  if (consoleTextCache === undefined) {
    const assets = join(REPO_ROOT, 'node_modules/@objectstack/console/dist/assets');
    consoleTextCache = readdirSync(assets)
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(assets, f), 'utf8'))
      .join('\n');
  }
  return consoleTextCache;
};

/** The three names the section says exist nowhere. */
const PHANTOM_VIEWS = ['Pending My Approval', 'Submitted by Me', 'Recently Approved'] as const;

/**
 * A label that ships nowhere, used to prove the bundle scan can miss. Without
 * it, a scan over tens of megabytes that matched everything would read exactly
 * like a passing pin — the vacuous-guard failure mode the `sees a non-trivial
 * navigation tree` test covers for the other fixtures. Taken from
 * `PHANTOM_VIEWS` so it stays a name this file already asserts is fictional.
 *
 * Note *which* phantom: not `Submitted by Me`, which the console does ship
 * bar one capital letter (`Submitted by me`, the centre's second tab) and so
 * would make this control pass for the wrong reason.
 */
const ABSENT_FROM_CONSOLE: string = PHANTOM_VIEWS[2];

/**
 * Every authored source file, for the "zero hits in `src/`" half of the claim.
 *
 * The directory entries carry their own type (`withFileTypes`), so the walk
 * never stats a path and then re-opens it — that check-then-use pair is the
 * file-system race CodeQL flags, and a `readFileSync` that throws on a file
 * that vanished mid-walk is the behaviour this guard wants anyway.
 */
const SRC_TEXT: string = (() => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|json)$/.test(entry.name)) out.push(readFileSync(full, 'utf8'));
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
    /**
     * The sentence that belongs to each destination the entry could carry. The
     * one keyed by `INBOX_DESTINATION` is required; every other one is
     * forbidden, so the page cannot describe a destination the entry left.
     */
    destinationClaims: {
      'approval-centre': "opens the platform's **approval centre**",
      'request-object-list': "so it opens the object's list",
    },
    /** Centre labels the page quotes, checked against the console bundle. */
    quotedFromConsole: ['My Pending', 'Submitted by me', 'Returned for revision'],
    /** The reader must be told the two lists are two screens. */
    collision: /same words, different screen/,
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
    destinationClaims: {
      'approval-centre': '进入平台的**审批中心**',
      'request-object-list': '所以点开后落在对象的列表页上',
    },
    // The zh pages gloss the centre's labels with the strings the zh-CN console
    // actually renders, so those are pinned too — 全部 is left out on purpose,
    // a bare "all" matches any bundle and would pin nothing.
    quotedFromConsole: [
      'My Pending',
      'Submitted by me',
      '待我审批',
      '我发起的',
      '全部状态',
      '待审批',
      '已通过',
      '已拒绝',
      '已撤回',
      '已退回修改',
    ],
    collision: /同名，但不是同一块界面/,
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
    destinationClaims: {
      'approval-centre': '進入平台的**審批中心**',
      'request-object-list': '所以點開後落在物件的列表頁上',
    },
    // Neither the app nor the console ships a Hant pack, so this page quotes the
    // simplified strings verbatim inside 「」 — the same convention the rest of
    // the file uses, and the reason these are the simplified spellings.
    quotedFromConsole: [
      'My Pending',
      'Submitted by me',
      '待我审批',
      '我发起的',
      '全部状态',
      '待审批',
      '已通过',
      '已拒绝',
      '已撤回',
      '已退回修改',
    ],
    collision: /同名，但不是同一塊介面/,
    retired: [
      '**審批請求**——所有待處理項',
      '帶視圖 *Pending My Approval*',
      '**操作歷史**——跨所有審批的完整稽核軌跡',
    ],
  },
] as const;

/**
 * `revenue/index` carries the same Inbox bullet one directory over, and nothing
 * pinned it at all — which is why #1123's re-point left it stale in three more
 * files than the section above. Only the destination is pinned here: the roster
 * of names on that page is `revenue/approvals`'s job, and duplicating it would
 * make two files fight over one claim.
 */
const INDEX_PAGES = [
  {
    file: 'content/docs/revenue/index.mdx',
    heading: '## Where to find things',
    destinationClaims: {
      'approval-centre': "opens the platform's **approval centre**",
      'request-object-list': 'the approval requests waiting on you (`sys_approval_request`)',
    },
  },
  {
    file: 'content/docs/revenue/index.zh-Hans.mdx',
    heading: '## 在哪里找到这些内容',
    destinationClaims: {
      'approval-centre': '进入平台的**审批中心**',
      'request-object-list': '等着你处理的审批请求（`sys_approval_request`）',
    },
  },
  {
    file: 'content/docs/revenue/index.zh-Hant.mdx',
    heading: '## 在哪裡找到這些內容',
    destinationClaims: {
      'approval-centre': '進入平台的**審批中心**',
      'request-object-list': '等著你處理的審批請求（`sys_approval_request`）',
    },
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
  });

  /**
   * #1123 re-pointed that item. It was `type: 'object'` on
   * `sys_approval_request` — the plugin's raw request table, which is read-only
   * (no row actions, no approve/reject), so a label promising "待我审批" landed
   * an approver somewhere they could not approve. It is now the platform's
   * approval centre, reached by its ComponentRegistry ref.
   *
   * Deliberately NOT `type: 'url'`: the spec documents `url` as the external
   * link type, and a URL would have to hard-code both a console-internal route
   * and this app's own name. A `componentRef` resolves against the current app
   * base instead, so the entry cannot drift when either changes.
   */
  it('that item opens the approval centre by component ref, not the read-only object table', () => {
    const inbox = APPROVALS_CHILDREN[0]!;
    expect(inbox.type).toBe('component');
    expect(inbox.componentRef).toBe('approvals:inbox');
    expect(inbox.url, 'a raw console URL would rot on the next console release').toBeUndefined();
    expect(
      inbox.objectName,
      'pointing back at the object table would restore the dead end #1123 closed',
    ).toBeUndefined();
  });

  it('keeps the requiresObject guard, so the entry hides where approvals are not installed', () => {
    expect(APPROVALS_CHILDREN[0]!.requiresObject).toBe(SysApprovalRequest.name);
  });

  /**
   * The half no metadata check can see. `componentRef` is resolved at runtime
   * by the console's own ComponentRegistry: an unregistered ref renders a
   * "Component not registered" panel, and nothing in `os validate`, `pnpm lint`
   * or any other test in this repo opens the console bundle to notice. This
   * card exists *because* a console route went stale between releases — the
   * issue's own recommended URL (`/_console/system/approvals`) no longer
   * resolves the way it was written — so the ref is pinned against the
   * installed console rather than trusted. On an upgrade that renames or drops
   * the surface, this goes red instead of the sidebar going quietly dead.
   */
  it('the installed console actually registers that component ref', () => {
    const assets = join(REPO_ROOT, 'node_modules/@objectstack/console/dist/assets');
    const ref = APPROVALS_CHILDREN[0]!.componentRef as string;
    const bundles = readdirSync(assets).filter((f) => f.endsWith('.js'));
    expect(bundles.length, 'no console bundles found — this pin would pass vacuously').toBeGreaterThan(5);
    const registered = bundles.some((f) => readFileSync(join(assets, f), 'utf8').includes(ref));
    expect(
      registered,
      `${ref} is not registered by @objectstack/console — the Inbox entry would render ` +
        '"Component not registered" instead of the approval centre',
    ).toBe(true);
  });

  it('that item still pins no view of its own — a leftover viewName would be dead metadata', () => {
    // Renamed in #1162: the old name said the object's list views "are what a
    // reader meets", which stopped being true the moment #1123 re-pointed the
    // entry. The assertion did not: a `viewName` surviving from the object-list
    // era would name a view of an object this entry no longer opens — inert
    // metadata that reads, to anyone grepping, as though it still routes. The
    // pages' "That item pins no view of its own" sentence rests on this.
    expect(APPROVALS_CHILDREN[0]!.viewName).toBeUndefined();
  });

  /**
   * The discriminant the doc pins key on, asserted once here so a failure says
   * "the entry moved" rather than repeating three times as "the pages are
   * wrong". If this goes red, the pages are not wrong yet — they are simply
   * describing a destination `crm.app.ts` no longer carries, and both sides
   * have to be re-cut together.
   */
  it('the entry carries a destination the doc pages know how to describe', () => {
    expect(INBOX_DESTINATION).toBe('approval-centre');
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

describe('revenue/approvals names the navigation that exists (#963, #1162)', () => {
  describe.each(PAGES)(
    '$file',
    ({ file, heading, denials, attribution, destinationClaims, quotedFromConsole, collision, retired }) => {
      const section = () => sectionOf(file, heading);

      it('names the real sidebar item', () => {
        expect(section()).toContain('Inbox');
      });

      /**
       * The pin that would have caught #1123's doc fallout. Every other doc-side
       * assertion in this file asks whether a name is present; this one asks
       * whether the destination the page describes is the destination the entry
       * carries, by reading the required sentence off `crm.app.ts`.
       */
      it('describes the destination the entry actually carries, and no other', () => {
        const text = section();
        const claims = destinationClaims as Readonly<Record<string, string>>;
        const required = claims[INBOX_DESTINATION];
        expect(
          required,
          `${file}: the Inbox entry is now '${INBOX_DESTINATION}', which no fixture describes — ` +
            'add the sentence this page should carry for that shape',
        ).toBeDefined();
        expect(
          text,
          `${file}: the entry opens '${INBOX_DESTINATION}' but the section never says so`,
        ).toContain(required);
        for (const [kind, phrase] of Object.entries(claims)) {
          if (kind === INBOX_DESTINATION) continue;
          expect(
            text,
            `${file}: still describes the '${kind}' destination, which the entry left`,
          ).not.toContain(phrase);
        }
      });

      /**
       * The centre's labels come from the installed console, not from anything
       * this repo authors, so they are pinned against the shipped bundle rather
       * than against a spelling written down once — the same discipline the
       * sibling guard in `docs-search-navigation-views.test.ts` applies to its
       * 「…」 glosses.
       */
      it('quotes the approval centre using labels the installed console really ships', () => {
        const bundles = consoleBundleText();
        expect(bundles.length, 'console bundle scan read nothing').toBeGreaterThan(1_000_000);
        expect(
          bundles,
          'the bundle scan matched a label that ships nowhere — it cannot fail, so it pins nothing',
        ).not.toContain(ABSENT_FROM_CONSOLE);
        const text = section();
        for (const label of quotedFromConsole) {
          expect(text, `${file}: the section stopped quoting '${label}'`).toContain(label);
          expect(
            bundles,
            `${file} quotes '${label}', but no console bundle ships it any more — the centre was ` +
              'relabelled and the page now names a tab the reader cannot see',
          ).toContain(label);
        }
      });

      it('warns that the object views and the centre tabs are two screens, not one', () => {
        // *My Pending* and *All* are on both sides verbatim, so a page that lists
        // both sets without saying they are different screens leaves the reader
        // with a table that is half right — worse than one plainly wrong.
        expect(section(), `${file}: no collision warning between the two lists`).toMatch(collision);
      });

      it('still lists every built-in view of the approval request, by its source label', () => {
        const text = section();
        const missing = REQUEST_VIEWS.filter((l) => !text.includes(l));
        expect(
          missing,
          `${file}: the section omits list view(s) the approvals plugin still ships — they are no ` +
            'longer what Inbox opens, but they are real and a reader who meets them needs them named',
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
    },
  );
});

describe('revenue/index sends the reader to the same destination (#1162)', () => {
  describe.each(INDEX_PAGES)('$file', ({ file, heading, destinationClaims }) => {
    it('describes the destination the entry actually carries, and no other', () => {
      const text = sectionOf(file, heading);
      const claims = destinationClaims as Readonly<Record<string, string>>;
      const required = claims[INBOX_DESTINATION];
      expect(
        required,
        `${file}: the Inbox entry is now '${INBOX_DESTINATION}', which no fixture describes`,
      ).toBeDefined();
      expect(
        text,
        `${file}: the entry opens '${INBOX_DESTINATION}' but the bullet never says so`,
      ).toContain(required);
      for (const [kind, phrase] of Object.entries(claims)) {
        if (kind === INBOX_DESTINATION) continue;
        expect(
          text,
          `${file}: still describes the '${kind}' destination, which the entry left`,
        ).not.toContain(phrase);
      }
    });

    it('names the sidebar item and keeps the Approval Requests denial', () => {
      const text = sectionOf(file, heading);
      expect(text).toContain('Inbox');
      expect(text).toContain('Approval Requests');
    });
  });
});
