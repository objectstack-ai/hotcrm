// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { servedApp, packFor } from './helpers/composed-stack';
import { OpportunityViews } from '../src/sales/views/opportunity.view';
import { Opportunity } from '../src/sales/objects/opportunity.object';
import { CrmApp } from '../src/sales/apps/crm.app';

/**
 * The pipeline page's kanban section, pinned to the board it describes (#996).
 *
 * Three claims in that section were each wrong in a different way, and none of
 * them was reachable by any existing gate — `os validate` and `pnpm lint` walk
 * authored metadata and never open `content/docs`, so the check has to live
 * where the claim lives (the reasoning `docs-service-index-analytics.test.ts`
 * #948 and `docs-quick-tour-navigation.test.ts` #960 already wrote down).
 *
 *  1. **"7 columns — one per stage."** `crm_opportunity.stage` does carry seven
 *     options, but this board filters `stage not_in [closed_won, closed_lost]`,
 *     so two of those stages can never hold a card. Whether the console draws
 *     them as empty columns or omits them is the renderer's choice — it lives
 *     outside this repo and no browser measurement was taken — so the page now
 *     states what the metadata proves (five active stages, open deals only, the
 *     conservative shape `content/docs/sales/opportunities.mdx` already uses)
 *     and says plainly that the drawn count is the console's call. What is
 *     pinned here is therefore the FIVE, not a rendered column count.
 *  2. **"Owner avatar"** as the fifth card field. Cards are bound by
 *     `kanban.columns`, which names four fields; `owner_id` appears only in the
 *     view's top-level `columns`. The page now lists four and re-points the
 *     reader to the two surfaces that really do show an owner — the
 *     #927 / PR #932 convention of saying where a name lives rather than
 *     deleting it.
 *  3. **"The system enforces the stage rules, so you can't drag …"**
 *     `opportunity_stage_progression` is `severity: 'warning'`, so the illegal
 *     move is logged and **saved**. `content/docs/administration/state-machines`
 *     had said exactly that — naming this very transition — since #919/#950;
 *     the two pages contradicted each other and this was the one that was
 *     wrong. Its wording now matches, phrase for phrase.
 *
 * The source side of each claim is pinned too, so the prose cannot become wrong
 * in the other direction: bind `owner_id` onto the cards, drop the board's
 * filter, or raise the rule to `error`, and this file goes red.
 *
 * **The way to the board (#2174).** The daily cadence row used to be pinned to
 * a sidebar entry called **Pipeline**, under a test title saying that entry
 * exists. #1259 had removed it: the served navigation carries no such row, so
 * the pin held a false sentence in place. The board is a tab on the list page
 * the **Opportunities** entry opens, and that pair is what the row now names.
 * Both halves are read from the source — the entry's label off the served
 * navigation, the tab's off the view (en) or the zh-CN pack (zh-Hans) — and the
 * source facts below pin that the entry exists and that the board still has no
 * sidebar row of its own, which is what the page says.
 */

type AnyRec = Record<string, any>;

const KANBAN = ((OpportunityViews as AnyRec).listViews ?? {}).pipeline_kanban as AnyRec;
const ALL_OPPORTUNITIES = ((OpportunityViews as AnyRec).listViews ?? {}).all_opportunities as AnyRec;
const DEAL_GALLERY = ((OpportunityViews as AnyRec).listViews ?? {}).deal_gallery as AnyRec;

const STAGE_OPTIONS: AnyRec[] = ((Opportunity as AnyRec).fields?.stage?.options ?? []) as AnyRec[];

/** Stage values this board filters out, read off the view rather than assumed. */
const EXCLUDED_STAGES: string[] = (((KANBAN?.filter ?? []) as AnyRec[]).find(
  (f) => f.field === 'stage' && f.operator === 'not_in',
)?.value ?? []) as string[];

const ACTIVE_STAGES = STAGE_OPTIONS.map((o) => String(o.value)).filter(
  (v) => !EXCLUDED_STAGES.includes(v),
);

const STAGE_MACHINE = (((Opportunity as AnyRec).validations ?? []) as AnyRec[]).find(
  (v) => v.name === 'opportunity_stage_progression',
) as AnyRec;

const CARD_FIELDS: string[] = (KANBAN?.kanban?.columns ?? []) as string[];

/** The sidebar as served, every node of it (groups and their children). */
const NAV_NODES: AnyRec[] = (() => {
  const flat = (nodes: AnyRec[]): AnyRec[] => nodes.flatMap((n) => [n, ...flat((n.children ?? []) as AnyRec[])]);
  return flat((servedApp((CrmApp as AnyRec).name).navigation ?? []) as AnyRec[]);
})();

/**
 * The entry that opens Opportunities' own list page — the page whose view
 * switcher carries the board as a tab. Throws rather than answering
 * `undefined`, so a missing entry fails as itself, not as a row mismatch.
 */
const OPPORTUNITIES_ENTRY: AnyRec = (() => {
  const entry = NAV_NODES.find(
    (n) => n.type === 'object' && n.objectName === 'crm_opportunity' && !n.viewName,
  );
  if (!entry) throw new Error('the served navigation has no entry opening the crm_opportunity list page');
  return entry;
})();

const ZH_CN = packFor('zh-CN') as AnyRec | undefined;
/** The same entry and the board's tab, as the zh-CN pack labels them (the zh-Hans page's source). */
const ZH_ENTRY_LABEL = ZH_CN?.apps?.[(CrmApp as AnyRec).name]?.navigation?.[OPPORTUNITIES_ENTRY.id]?.label as string;
const ZH_BOARD_LABEL = ZH_CN?.objects?.crm_opportunity?._views?.pipeline_kanban?.label as string;

const PAGES = [
  {
    file: 'content/docs/sales/pipeline-management.mdx',
    lang: 'en',
    heading: '## The pipeline kanban view',
    cadence: '## Recommended pipeline cadence',
    /** The five active stages, stated as a count in prose. */
    activeCount: /five active stages/,
    /** The rule is advisory, in the wording administration/state-machines uses. */
    advisory: /advice, not a gate/,
    savesAnyway: /the save still goes through/,
    /** The sidebar entry, then the tab on its page, the cadence row must send a reader to. */
    entry: [`**${OPPORTUNITIES_ENTRY.label}**`, `**${KANBAN?.label}**`],
    /**
     * Claims #996 removed. `Pipeline Kanban` is a camel-case reading of the
     * identifier `pipeline_kanban` and names nothing in the product; on the en
     * page the capitalisation makes it unambiguous, so it is barred page-wide.
     */
    retired: [
      '7 columns',
      'Owner avatar',
      'The system enforces the stage rules',
      'Pipeline Kanban',
    ],
    pageWideRetired: ['Pipeline Kanban'],
  },
  {
    file: 'content/docs/sales/pipeline-management.zh-Hans.mdx',
    lang: 'zh-Hans',
    heading: '## 销售管道看板视图',
    cadence: '## 推荐的销售管道节奏',
    activeCount: /五个活跃阶段/,
    advisory: /建议，不是闸门/,
    savesAnyway: /保存照样通过/,
    entry: [`**${ZH_ENTRY_LABEL}**`, `**${ZH_BOARD_LABEL}**`],
    retired: ['7 列', '负责人头像', '系统会强制执行阶段规则'],
    pageWideRetired: [],
  },
  {
    file: 'content/docs/sales/pipeline-management.zh-Hant.mdx',
    lang: 'zh-Hant',
    heading: '## 銷售管道看板視圖',
    cadence: '## 推薦的銷售管道節奏',
    activeCount: /五個活躍階段/,
    advisory: /建議，不是閘門/,
    savesAnyway: /儲存照樣通過/,
    // No Traditional pack ships, so navigation keeps its English label and the
    // view name is the zh-CN pack's wording in Traditional characters (AGENTS.md
    // documentation rule 6).
    entry: [`**${OPPORTUNITIES_ENTRY.label}**`, '**銷售流水線**'],
    retired: ['7 列', '負責人頭像', '系統會強制執行階段規則'],
    pageWideRetired: [],
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

/** Contiguous `- ` bullets — the card-field list is the section's only one. */
const bulletRun = (section: string): string[] => {
  const bullets = section.split('\n').filter((l) => l.trim().startsWith('- '));
  return bullets.map((l) => l.trim().replace(/^-\s+/, ''));
};

describe('the pipeline page describes the board it actually ships (#996)', () => {
  describe.each(PAGES)(
    '$file',
    ({ file, heading, cadence, activeCount, advisory, savesAnyway, entry, retired, pageWideRetired }) => {
      const section = () => sectionOf(file, heading);

      it('lists exactly the fields the cards are bound to', () => {
        expect(
          bulletRun(section()).length,
          `${file}: the card-field list must have one bullet per kanban.columns entry ` +
            `(${CARD_FIELDS.join(', ')}). A field on the card that is not bound is a phantom; ` +
            'a bound field the list omits sends the reader looking elsewhere.',
        ).toBe(CARD_FIELDS.length);
      });

      it('says the board holds open deals only, and names the filter that makes it so', () => {
        const text = section();
        expect(text, `${file}: the active-stage count is not stated`).toMatch(activeCount);
        EXCLUDED_STAGES.forEach((s) =>
          expect(
            text,
            `${file}: the board filters out '${s}' but the section does not name it`,
          ).toContain(s),
        );
      });

      it('calls the stage rules advisory, not enforcement', () => {
        const text = section();
        expect(text, `${file}: the rule is warning severity — say so`).toMatch(advisory);
        expect(text, `${file}: the section does not say the save goes through`).toMatch(savesAnyway);
        expect(text).toContain(STAGE_MACHINE.name);
      });

      it('sends the daily cadence to the board through the sidebar entry that exists', () => {
        const row = sectionOf(file, cadence)
          .split('\n')
          .find((l) => l.includes('|') && /每日|Daily/.test(l));
        expect(row, `${file}: the cadence table has no daily row`).toBeTruthy();
        expect(
          entry.filter((name) => !row!.includes(name)),
          `${file}: the daily row must name the sidebar entry and the board's tab on its page`,
        ).toEqual([]);
      });

      it('does not resurrect the claims #996 removed', () => {
        const text = section();
        expect(retired.filter((phrase) => text.includes(phrase))).toEqual([]);
        const whole = readFileSync(join(REPO_ROOT, file), 'utf8');
        expect(
          pageWideRetired.filter((phrase) => whole.includes(phrase)),
          `${file}: a name the product does not carry came back somewhere on the page`,
        ).toEqual([]);
      });
    },
  );
});

describe('the source facts those three claims now rest on (#996)', () => {
  it('the board binds four card fields, and owner is not one of them', () => {
    expect(CARD_FIELDS).toEqual(['name', 'crm_account', 'amount', 'close_date']);
    expect(
      CARD_FIELDS,
      'binding owner onto the cards would make the "no owner on the card" paragraph wrong — ' +
        'update the prose in all three locales, not just the metadata',
    ).not.toContain('owner_id');
  });

  it('the board has no sidebar row of its own; the Opportunities entry opens the page it is a tab of (#2174)', () => {
    // The zh-Hant page spells the tab 銷售流水線 by character conversion of this
    // label; a pack rename moves the zh-Hans page with it and must move that one too.
    expect(ZH_BOARD_LABEL).toBe('销售流水线');
    expect(
      NAV_NODES.filter((n) => n.viewName === 'pipeline_kanban').map((n) => n.id),
      'a sidebar row opening the board makes "it has no sidebar entry of its own" false on both pages, in all three locales',
    ).toEqual([]);
  });

  it('owner_id is in the view-level columns the prose re-points to', () => {
    expect(KANBAN.columns).toContain('owner_id');
  });

  it('re-points the owner to two surfaces that really do show it', () => {
    const cols = ((ALL_OPPORTUNITIES.columns ?? []) as AnyRec[]).map((c) =>
      typeof c === 'string' ? c : c.field,
    );
    expect(cols, 'All Opportunities is named as an owner-bearing view').toContain('owner_id');
    expect(
      (DEAL_GALLERY.gallery?.visibleFields ?? []) as string[],
      'Deal Cards is named as showing the owner on the card',
    ).toContain('owner_id');
  });

  it('excludes both closed stages, leaving five that can hold a card', () => {
    expect([...EXCLUDED_STAGES].sort()).toEqual(['closed_lost', 'closed_won']);
    expect(STAGE_OPTIONS).toHaveLength(7);
    expect(ACTIVE_STAGES).toEqual([
      'prospecting',
      'qualification',
      'needs_analysis',
      'proposal',
      'negotiation',
    ]);
  });

  it('governs the stage with a warning, not an error', () => {
    // An `error` here would make "advice, not a gate" wrong on this page and on
    // content/docs/administration/state-machines — change both, or neither.
    expect(STAGE_MACHINE.severity).toBe('warning');
    expect(STAGE_MACHINE.field).toBe('stage');
  });

  it('leaves Prospecting → Closed Won outside the table, which is why it is the example', () => {
    expect((STAGE_MACHINE.transitions as Record<string, string[]>).prospecting).not.toContain(
      'closed_won',
    );
  });
});
