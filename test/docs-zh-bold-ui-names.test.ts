// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import { packFor, type AnyRec } from './helpers/composed-stack';
import { packageStacks } from '../objectstack.composition';
import { stripDocsGroups } from './helpers/docs-route';

/**
 * A **bold** UI name on a Chinese docs page is the word the Chinese console
 * shows for it (#2611).
 *
 * The term ledger (`docs-object-term-consistency.test.ts`) retires the words
 * that DID drift, one object at a time, and it was built for the sales objects.
 * The newer modules — Order to Cash, Project Delivery, Expenses — were in no
 * ledger at all, so a page could call one screen two names and stay green. This
 * file is the other half: it does not wait for a drift to be found by eye. Every
 * object, field, status, list view, action and app label of every package is
 * read off the zh-CN pack through the composed stack ({@link VOCABULARY}), so a
 * new module is covered the day it registers its pack (the package rule below
 * proves each package's objects, statuses and actions are in it), and a pack
 * rename moves the expectation with it. ⛔ No Simplified UI word is written in
 * this file: the zh-Hant pins and the allowlist below are the only CJK data,
 * and each says why it cannot be derived.
 *
 * ## The scope rule: a bold run the page itself calls a UI name
 *
 * Measured on `ac17670a`: the 86 zh-Hans pages carry 4990 bold runs. Almost all
 * of them are emphasis, lead-ins, table-cell headings, counts, English product
 * names and whole sentences, so "every bold run must be a pack label" is not a
 * rule anyone could keep green. What makes a bold run a UI name is the page
 * saying so: the noun right after it — a list view, a button, a field. That is
 * the shape `docs-dashboard-tiles.test.ts` already reads for its tile cue, and
 * it is the only position where the page's own words fix BOTH that the run is a
 * name and which kind of name it is, so it can be held to one class of the pack:
 *
 *   | cue after the run (zh-Hans / zh-Hant)   | class  | pack path                      |
 *   | --------------------------------------- | ------ | ------------------------------ |
 *   | 对象 / 物件                              | object | `objects.X.label`              |
 *   | 字段 / 欄位                              | field  | `objects.X.fields.F.label`     |
 *   | 状态 / 狀態                              | status | `objects.X.fields.F.options.O` |
 *   | 视图, 列表视图 / 檢視, 視圖, 列表檢視    | view   | `objects.X._views.V.label`     |
 *   | 按钮, 操作 / 按鈕, 操作                  | action | `objects.X._actions.A.label`   |
 *   | 应用 / 應用 (not 应用市场, 應用市集)     | app    | `apps.A.label`                 |
 *
 * A view cue also accepts an object label: "the Accounts list view" is how a
 * page names an object's own list. Pack view labels may open with an emoji
 * (`⏰ …`) the page leaves out; the comparison strips it.
 *
 * A run joined to a cued run by 、 / 和 / 或 / 与 / 及 takes the same cue (a
 * page naming three list views in one breath bolds three runs and writes the cue
 * once), which is where the one object-name defect this check found on `main`
 * sat.
 *
 * Mechanical exclusions keep the rule on names and off prose, and each is a
 * property of the run, not a list: the run must carry a CJK character (an
 * English run is a different convention, below); it may not carry sentence
 * punctuation (a bolded sentence that happens to end before 应用 is not a
 * name); a count is not a name; and on zh-Hant 檢視 is also the verb "to view",
 * so it cues a name only when no further CJK word runs on after it.
 *
 * ## English bold runs are not judged here, on purpose
 *
 * AGENTS.md Documentation discipline rule 6 keeps every pack-carried UI noun
 * other than list view names in its English spelling in every locale, and two
 * guards enforce English on Chinese pages (`docs-dashboard-tiles.test.ts` for
 * tiles, `docs-quick-tour-navigation.test.ts` for navigation). Whether an
 * English ACTION or FIELD name on a zh-Hans page should become the pack word is
 * a convention question this file does not answer (#2611's PR reports it).
 * What this file holds is the half nobody disputes: when a Chinese page writes
 * a UI name in Chinese, it writes the console's word and never coins one.
 *
 * ## zh-Hant has no producer, so its names are pinned
 *
 * The app ships no Traditional locale (AGENTS.md rule 6), so there is no pack
 * field to read a Traditional spelling from, and `docs-view-rosters.test.ts`
 * measured that converting glyph by glyph is not what the corpus does. A cued
 * run on a zh-Hant page therefore resolves when it is (1) a zh-CN pack label of
 * its class written identically (script-invariant words), or (2) the pinned
 * Traditional form of one ({@link HANT}), keyed by the pack path it renders. A
 * pin is checked like the term ledger's `hant` column: its path must resolve,
 * it must differ from the Simplified label, and some zh-Hant page must still cue
 * it — so a pin cannot rot into decoration, and a new Traditional UI name cannot
 * arrive without someone writing down which pack word it renders.
 *
 * ## Deliberate exceptions
 *
 * {@link ALLOWED} names a cued run that is not one of this app's pack labels,
 * with the reason. Each entry must still match a cued run, and must still FAIL
 * to resolve, so the list cannot outlive the text it excuses.
 *
 * ## Reverse verification (#2611)
 *
 * On `ac17670a`, before the page fixes of this PR, the zh-Hans rule failed on
 * `guides/importing-your-data` (the lead list named by the word the pack uses
 * for the account type "prospect", which the page then used for leads
 * throughout), and the zh-Hant rule failed on `ai-copilot/sales-copilot` (a
 * second spelling of the Convert Lead action) and `analytics/dashboards` (a
 * second spelling of the Project Delivery app). Two more drifts were found by
 * the word-grain read that preceded this rule, not by the rule — they sit in
 * no cued position — and were fixed in the same PR: the contract's payment-terms
 * field on `order-to-cash/invoices-and-payments.zh-Hans`, and the Time Entry
 * object on both `whats-new` faces. Neither could join the term ledger's TERMS
 * then, because the zh-CN pack's own help and dataset descriptions still carried
 * the drifted words; #2699 moved the pack to its labels and added the rows
 * (`crm_time_entry`, `crm_timesheet`, and `crm_contract`'s payment-terms pin).
 * The ablation run on the fixed tree is recorded on #2611's PR.
 */

type Cls = 'object' | 'field' | 'status' | 'view' | 'action' | 'app';
type Face = 'zh-Hans' | 'zh-Hant';

/** Cue nouns per face. Longest first, so 列表视图 wins over 视图. */
const CUES: Record<Face, readonly (readonly [string, Cls])[]> = {
  'zh-Hans': [
    ['列表视图', 'view'],
    ['视图', 'view'],
    ['对象', 'object'],
    ['字段', 'field'],
    ['状态', 'status'],
    ['按钮', 'action'],
    ['操作', 'action'],
    ['应用', 'app'],
  ],
  'zh-Hant': [
    ['列表檢視', 'view'],
    ['列表視圖', 'view'],
    ['檢視', 'view'],
    ['視圖', 'view'],
    ['物件', 'object'],
    ['欄位', 'field'],
    ['狀態', 'status'],
    ['按鈕', 'action'],
    ['操作', 'action'],
    ['應用', 'app'],
  ],
};

/** What may follow 应用 / 應用 when it is not "app" (应用市场, 應用市集, 应用程序). */
const NOT_APP_AFTER = /^(市|程)/;
/** 檢視 is also a verb; as a noun cue it is not followed by another CJK word. */
const VERB_CUE = new Set(['檢視']);
const NOUN_END = /^($|[^㐀-鿿]|[的中裡里上下頁页])/;

/** Joiners that put a bold run in the same list as the cued run after it. */
const JOINER = /^\s*(、|和|或|与|與|及|\/)\s*$/;

const CJK = /[㐀-鿿]/;
const SENTENCE = /[。，；：！？“”「」『』`]/;
const COUNT = /^[\d一二两兩三四五六七八九十百几幾每]+\s*[个個]?$/;
/** A leading emoji (and the space after it) on a pack label. */
const EMOJI_LEAD = /^[^\p{L}\p{N}]+\s*/u;

/* ------------------------------------------------------------ vocabulary */

const zh = packFor('zh-CN') as AnyRec;

/** Pack path → zh-CN label, every class, every package. Derived, never typed. */
const VOCABULARY: Map<string, { cls: Cls; label: string }> = new Map();
const put = (path: string, cls: Cls, label: unknown): void => {
  if (typeof label === 'string' && label.length > 0) VOCABULARY.set(path, { cls, label });
};
for (const [name, entry] of Object.entries((zh?.objects ?? {}) as Record<string, AnyRec>)) {
  put(`objects.${name}.label`, 'object', entry.label);
  for (const [f, field] of Object.entries((entry.fields ?? {}) as Record<string, AnyRec>)) {
    put(`objects.${name}.fields.${f}.label`, 'field', field?.label);
    for (const [o, option] of Object.entries((field?.options ?? {}) as Record<string, unknown>)) {
      put(
        `objects.${name}.fields.${f}.options.${o}`,
        'status',
        typeof option === 'string' ? option : (option as AnyRec | undefined)?.label,
      );
    }
  }
  for (const [v, view] of Object.entries((entry._views ?? {}) as Record<string, AnyRec>)) {
    put(`objects.${name}._views.${v}.label`, 'view', view?.label);
  }
  for (const [a, action] of Object.entries((entry._actions ?? {}) as Record<string, AnyRec>)) {
    put(`objects.${name}._actions.${a}.label`, 'action', action?.label);
  }
}
for (const [name, app] of Object.entries((zh?.apps ?? {}) as Record<string, AnyRec>)) {
  put(`apps.${name}.label`, 'app', app?.label);
}

/** The classes a cue of class `cls` accepts: a view cue also takes an object's own list. */
const ACCEPTS: Record<Cls, readonly Cls[]> = {
  object: ['object'],
  field: ['field'],
  status: ['status'],
  view: ['view', 'object'],
  action: ['action'],
  app: ['app'],
};

const spellings = (label: string): string[] => [label, label.replace(EMOJI_LEAD, '')];

const labelsOf = (cls: Cls): Set<string> =>
  new Set(
    [...VOCABULARY.values()]
      .filter((v) => ACCEPTS[cls].includes(v.cls))
      .flatMap((v) => spellings(v.label)),
  );

/**
 * ⚠️ TRADITIONAL UI NAMES — PINNED BY HAND, because no producer exists.
 *
 * Pack path → the Traditional spelling the zh-Hant pages cue for that pack
 * label. Only names a zh-Hant page CUES are pinned (the stale rule below holds
 * that), and only names whose Traditional form differs from the Simplified one
 * (a script-invariant word resolves against the pack directly). Several fields
 * share one label (状态 is many objects' status field); the pin names one of
 * them, and resolves for the label, which is what the page can be held to.
 * The values follow the zh-Hant corpus as it stands, word substitutions
 * included (聯絡人); whether those substitutions are lawful under AGENTS.md
 * rule 6 is reported on #2611's PR, not decided here.
 */
const HANT: Record<string, string> = {
  'apps.crm_psa.label': '項目交付',
  'objects.crm_account._actions.log_call.label': '記錄通話',
  'objects.crm_account.fields.approval_status.label': '審批狀態',
  'objects.crm_account.fields.approval_status.options.pending': '待審批',
  'objects.crm_account.fields.tier.label': '客戶分層',
  'objects.crm_contact.fields.is_primary.label': '主要聯絡人',
  'objects.crm_knowledge_article.fields.related_to_case.label': '來源工單',
  'objects.crm_knowledge_article.label': '知識文章',
  'objects.crm_lead._actions.convert_lead.label': '轉化線索',
  'objects.crm_lead._views.suspected_duplicates.label': '疑似重複線索',
  'objects.crm_lead.fields.conversion_approval_status.label': '轉化審批',
  'objects.crm_lead.fields.status.label': '狀態',
  'objects.crm_opportunity._actions.generate_quote.label': '生成報價單',
  'objects.crm_opportunity._views.all_opportunities.label': '全部商機',
  'objects.crm_opportunity._views.pipeline_kanban.label': '銷售流水線',
  'objects.crm_opportunity._views.tender_this_quarter.label': '本季度預計招標',
  'objects.crm_opportunity.fields.forecast_category.label': '預測類別',
  'objects.crm_opportunity.fields.qualification_approval_status.label': '立項審批',
  'objects.crm_opportunity.fields.status_change_approval_status.label': '狀態變更審批',
  'objects.crm_product.fields.datasheet.label': '規格書',
  'objects.crm_project.fields.crm_opportunity.label': '商機',
  'objects.crm_project.fields.crm_sales_order.label': '訂單',
  'objects.crm_quote._actions.reject_quote.label': '拒絕',
};

/**
 * Cued runs that are not one of this app's pack labels, and why.
 * Keyed `face|page|class|text` (page relative to `content/docs/`).
 */
const ALLOWED: Record<string, string> = {
  // A modifier on a noun, not a name: "live object metadata".
  'zh-Hans|ai-copilot/skills.zh-Hans.mdx|object|实时': 'adjective (live), not an object name',
  'zh-Hant|ai-copilot/skills.zh-Hant.mdx|object|即時': 'adjective (live), not an object name',
  // Kinds of list view (built-in, personal, shared), not view names.
  'zh-Hans|guides/search-and-navigation.zh-Hans.mdx|view|内置': 'a kind of view, not a view name',
  'zh-Hans|guides/search-and-navigation.zh-Hans.mdx|view|个人': 'a kind of view, not a view name',
  'zh-Hans|guides/search-and-navigation.zh-Hans.mdx|view|共享': 'a kind of view, not a view name',
  // Platform buttons: the platform's own translation, not this app's pack.
  'zh-Hans|guides/import-and-export.zh-Hans.mdx|action|导出': 'platform list-toolbar button',
  'zh-Hant|guides/import-and-export.zh-Hant.mdx|action|匯出': 'platform list-toolbar button',
  'zh-Hans|guides/import-and-export.zh-Hans.mdx|action|灾难恢复': 'an operation named in prose, not a button',
  'zh-Hant|guides/import-and-export.zh-Hant.mdx|action|災難復原': 'an operation named in prose, not a button',
  'zh-Hans|guides/files-and-comments.zh-Hans.mdx|action|删除': 'platform record button',
  'zh-Hant|guides/files-and-comments.zh-Hant.mdx|action|刪除': 'platform record button',
  'zh-Hans|guides/files-and-comments.zh-Hans.mdx|action|下载': 'platform attachment button',
  'zh-Hant|guides/files-and-comments.zh-Hant.mdx|action|下載': 'platform attachment button',
  'zh-Hans|sales/approvals.zh-Hans.mdx|action|批准': 'approval plugin button (sys_approval_request)',
  'zh-Hant|sales/approvals.zh-Hant.mdx|action|批准': 'approval plugin button (sys_approval_request)',
  'zh-Hans|service/cases.zh-Hans.mdx|action|认领': 'platform queue button, not an app action',
};

/* --------------------------------------------------------------- the scan */

const DOCS_ROOT = join(REPO_ROOT, 'content/docs');
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = join(dir, e.name);
    return e.isDirectory() ? walk(full) : [full];
  });
const pagesOf = (face: Face): string[] =>
  walk(DOCS_ROOT)
    .filter((f) => f.endsWith(`.${face}.mdx`))
    .map((f) => relative(DOCS_ROOT, f))
    .sort();

type Hit = { face: Face; page: string; line: number; cls: Cls; text: string };
const keyOf = (h: Hit): string => `${h.face}|${h.page}|${h.cls}|${h.text}`;

const cueOf = (face: Face, after: string): Cls | undefined => {
  const rest = after.replace(/^ /, '');
  for (const [noun, cls] of CUES[face]) {
    if (!rest.startsWith(noun)) continue;
    const tail = rest.slice(noun.length);
    if (cls === 'app' && NOT_APP_AFTER.test(tail)) return undefined;
    if (VERB_CUE.has(noun) && !NOUN_END.test(tail)) return undefined;
    return cls;
  }
  return undefined;
};

/**
 * Every cued bold run on one page (relative to `content/docs/`), fenced code skipped.
 * A hit names its page without the `(group)` sidebar-section directory, so
 * ALLOWED keys and MODULE_DIRS read as the page's URL path does.
 */
const hitsOn = (face: Face, page: string): Hit[] => {
  const out: Hit[] = [];
  let fenced = false;
  readFileSync(join(DOCS_ROOT, page), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*```/.test(line)) fenced = !fenced;
      if (fenced) return;
      const seg = line.split('**');
      // seg[k] for odd k is a bold run when it closes on this line; walk right
      // to left so a cue carries back over the joiners of its list.
      const last = seg.length % 2 === 1 ? seg.length - 2 : seg.length - 3;
      let carried: Cls | undefined;
      for (let k = last; k >= 1; k -= 2) {
        const after = seg[k + 1] ?? '';
        const cls = cueOf(face, after) ?? (JOINER.test(after) ? carried : undefined);
        carried = cls;
        const text = seg[k].trim();
        if (!cls || !CJK.test(text) || SENTENCE.test(text) || COUNT.test(text)) continue;
        out.push({ face, page: stripDocsGroups(page), line: i + 1, cls, text });
      }
    });
  return out;
};

const FACES: Face[] = ['zh-Hans', 'zh-Hant'];
const PAGES: Record<Face, string[]> = { 'zh-Hans': pagesOf('zh-Hans'), 'zh-Hant': pagesOf('zh-Hant') };
const HITS: Record<Face, Hit[]> = {
  'zh-Hans': PAGES['zh-Hans'].flatMap((p) => hitsOn('zh-Hans', p)),
  'zh-Hant': PAGES['zh-Hant'].flatMap((p) => hitsOn('zh-Hant', p)),
};

const hantLabels = (cls: Cls): Set<string> =>
  new Set(
    Object.entries(HANT)
      .filter(([path]) => {
        const v = VOCABULARY.get(path);
        return v !== undefined && ACCEPTS[cls].includes(v.cls);
      })
      .map(([, hant]) => hant),
  );

const resolves = (h: Hit): boolean =>
  labelsOf(h.cls).has(h.text) || (h.face === 'zh-Hant' && hantLabels(h.cls).has(h.text));

const unresolved = (face: Face): string[] =>
  HITS[face].filter((h) => !resolves(h) && !(keyOf(h) in ALLOWED)).map((h) => `${h.page}:${h.line} ${h.cls} 「${h.text}」`);

/** The newer modules' doc folders, as a floor on what the rule reads there. */
const MODULE_DIRS = ['order-to-cash/', 'projects/', 'expenses/'];

/* ------------------------------------------------------------------ rules */

describe('a bold UI name on a Chinese docs page is the zh-CN pack word (#2611)', () => {
  describe('the vocabulary and the scan surface are real', () => {
    it('every package\'s objects, statuses and actions are in the derived vocabulary', () => {
      // The vacuity this file is exposed to: a module whose pack stopped being
      // folded in would take every one of its words out of the rule below and
      // turn nothing red. Each package is read from its own stack.
      const gaps: string[] = [];
      for (const stack of packageStacks as AnyRec[]) {
        const pkg = String(stack.manifest?.id);
        const objects = ((stack.objects ?? []) as AnyRec[]).map((o) => String(o.name));
        expect(objects.length, `${pkg} registers no objects`).toBeGreaterThan(0);
        for (const name of objects) {
          if (!VOCABULARY.has(`objects.${name}.label`)) gaps.push(`${pkg}: objects.${name}.label`);
        }
        const paths = [...VOCABULARY.entries()].filter(([path]) =>
          objects.some((name) => path.startsWith(`objects.${name}.`)),
        );
        for (const cls of ['status', 'view'] as Cls[]) {
          if (!paths.some(([, v]) => v.cls === cls)) gaps.push(`${pkg}: no ${cls} label`);
        }
        const hasActions = objects.some((name) =>
          Object.keys(((zh?.objects?.[name]?._actions ?? {}) as AnyRec)).length > 0,
        );
        if (hasActions && !paths.some(([, v]) => v.cls === 'action')) gaps.push(`${pkg}: no action label`);
      }
      expect(gaps, `package words missing from the vocabulary:\n  ${gaps.join('\n  ')}`).toEqual([]);
      expect(packageStacks.length, 'fewer package stacks than the artifact ships').toBeGreaterThanOrEqual(7);
    });

    it.each(FACES)('%s: the rule reads real pages and real cued names', (face) => {
      expect(PAGES[face].length, `no ${face} pages found`).toBeGreaterThan(50);
      // Measured on ac17670a: 75 zh-Hans and 43 zh-Hant cued runs. The floor
      // stops a narrowed cue table from passing over almost nothing.
      expect(HITS[face].length, `only ${HITS[face].length} cued runs on ${face}`).toBeGreaterThan(
        face === 'zh-Hans' ? 60 : 35,
      );
      // The newer modules' own pages must be read on the face that has a
      // producer; zh-Hant's Order to Cash pages write UI names in English
      // (rule 6), so they carry no cued Chinese name to read.
      if (face === 'zh-Hant') return;
      for (const dir of MODULE_DIRS) {
        const there = HITS[face].filter((h) => h.page.startsWith(dir) && resolves(h));
        expect(there.length, `no resolved cued name on ${face} ${dir} pages`).toBeGreaterThan(0);
      }
    });
  });

  it.each(FACES)('%s: every cued bold UI name is the pack word', (face) => {
    const bad = unresolved(face);
    expect(
      bad,
      `${face} bold run(s) the page calls a UI name that the zh-CN pack does not spell that way` +
        (face === 'zh-Hant' ? ' (nor any pinned Traditional form of a pack word)' : '') +
        ':\n  ' +
        bad.join('\n  ') +
        '\nUse the pack label. If the run is not one of this app\'s UI names, add it to ALLOWED with the reason.',
    ).toEqual([]);
  });

  describe('the pins and the allowlist cannot go stale', () => {
    it('every zh-Hant pin names a pack label and is a different string from it', () => {
      const dead = Object.keys(HANT).filter((path) => !VOCABULARY.has(path));
      expect(dead, `pinned path(s) that resolve to nothing in the zh-CN pack: ${dead.join(', ')}`).toEqual([]);
      const same = Object.entries(HANT)
        .filter(([path, hant]) => VOCABULARY.get(path)?.label === hant)
        .map(([path]) => path);
      expect(same, `pins equal to the Simplified label (script-invariant, so unneeded): ${same.join(', ')}`).toEqual([]);
    });

    it('every zh-Hant pin is still cued on some zh-Hant page', () => {
      const cued = new Set(HITS['zh-Hant'].map((h) => h.text));
      const idle = Object.entries(HANT)
        .filter(([, hant]) => !cued.has(hant))
        .map(([path, hant]) => `${path} = ${hant}`);
      expect(idle, `pins no zh-Hant page cues any more:\n  ${idle.join('\n  ')}`).toEqual([]);
    });

    it('every allowlist entry still matches a cued run that does not resolve', () => {
      const keys = new Map<string, Hit>();
      for (const face of FACES) for (const h of HITS[face]) keys.set(keyOf(h), h);
      const stale = Object.keys(ALLOWED).filter((k) => !keys.has(k));
      expect(stale, `ALLOWED entries no page carries any more:\n  ${stale.join('\n  ')}`).toEqual([]);
      const needless = Object.keys(ALLOWED).filter((k) => keys.has(k) && resolves(keys.get(k)!));
      expect(needless, `ALLOWED entries that resolve to a pack word anyway:\n  ${needless.join('\n  ')}`).toEqual(
        [],
      );
      const bare = Object.entries(ALLOWED).filter(([, why]) => why.trim().length < 10).map(([k]) => k);
      expect(bare, `ALLOWED entries without a reason: ${bare.join(', ')}`).toEqual([]);
    });
  });
});
