// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/**
 * The automation docs page lists every flow the app ships, in every locale (#827).
 *
 * `content/docs/administration/automation.mdx` carries the "Built-in flows in
 * HotCRM" table, and that table is the ONLY place an admin can go from a
 * symptom ("something re-assigned this case", "a task appeared on my list") to
 * the automation that caused it. When the table is short, a reader does not
 * conclude "the table is incomplete" — they conclude "nothing automates this".
 *
 * It had drifted twice over, and neither drift was visible to any gate:
 *
 *   - **Half the rows were missing.** The header said `(11)` on the English page
 *     and `(10 个)` / `(10 個)` on the two Chinese ones, while the compiled stack
 *     shipped 24 flows. Contract auto-expiration was among the missing — and
 *     `content/docs/revenue/contracts.mdx` sends admins to this very table to
 *     find it (#823/#805).
 *   - **A row's TRIGGER was wrong.** `campaign_enrollment` was a Monday-9-AM
 *     schedule flow until it was rewritten as a screen flow (a cron seeds no
 *     input variables, so every run enrolled nothing or died on validation —
 *     see the header of `src/flows/campaign-enrollment.flow.ts`). All three
 *     pages still billed it as `Schedule (Mon 9 AM)`, and the prose under the
 *     table counted it among the scheduled sweeps.
 *
 * Nothing checked, because a flow name in a markdown table is prose: `os
 * validate` and `pnpm lint` walk authored metadata and never open
 * `content/docs`. So the check has to live where the claim lives — in the text.
 *
 * ## What is derived, and what is authored
 *
 * DERIVED from the compiled stack (`stack.flows`, not a count of `src/flows/*`
 * files — several of those export two flows apiece, which is how a 21-file
 * directory ships 24 flows and how a file-counting reader gets a third wrong
 * number):
 *
 *   - the ROW SET — every shipped flow has exactly one row on each of the three
 *     pages, and no row names a flow the app does not ship;
 *   - each row's TRIGGER cell — the start node's kind (screen / record change /
 *     schedule), the `record-after-create` vs `record-after-update` half for
 *     record-change flows, and the cron for scheduled ones;
 *   - both NUMERALS — the `(24)` in the table's header sentence and the "nine
 *     `Schedule` rows" in the section below it. Both are computed from the stack
 *     and never from the number of rows parsed out of the table, so the table
 *     and the prose cannot drift into agreeing with each other while both are
 *     wrong. That is the channel the `(11)` header lived in: it agreed with the
 *     eleven rows beneath it perfectly.
 *
 * AUTHORED, because it cannot be derived:
 *
 *   - the two Chinese ROW LABELS per flow ({@link ROW_LABEL}). Flows carry no
 *     entry in the locale packs — `src/translations/zh-CN.ts` translates objects,
 *     fields, views and actions, not flows — and the app ships no zh-Hant pack at
 *     all, so each Chinese page translates the flow labels itself. Same boundary,
 *     and same reason, as `sharing-coverage.test.ts`'s `ROW_LABEL` (#795/#811).
 *   - the ENGLISH row label is NOT in the ledger: the English page uses each
 *     flow's own `label` verbatim, so it is checked against the stack, which is
 *     strictly stronger than a ledger entry. That is also a product decision, not
 *     just a test convenience — the label is what **Studio → Developer → Flow
 *     Runs** lists, so a table keyed on it can be searched from a run the admin
 *     is staring at.
 *   - the cron DISPLAY text ({@link CRON_LABEL}) and the number WORDS
 *     ({@link COUNT_WORD}). An unregistered cron or count throws rather than
 *     passing silently — the convention `docs-drift.test.ts` set for its own
 *     `CRON_LABEL`.
 *
 * ## Why every flow, with no status filter
 *
 * The row set is every flow in the artifact, unfiltered. All 24 ship `status:
 * 'active'` today, so a `status` filter would be a branch nothing exercises. If a
 * `draft` flow ever ships, this guard fails until someone decides what the table
 * means — "flows this app ships" or "flows that run" — which is the right moment
 * to make that decision, and better than a filter written now on a guess about
 * which answer a future reader wants.
 *
 * `demo_bootstrap` IS in the table for the same reason, and it is not a close
 * call: that flow ships in the artifact and runs in a customer's org every ten
 * minutes, writing `owner_id` (its own header says so, and
 * `test/demo-staffing.test.ts` polices what it may write). An admin who sees
 * ownership change on a ten-minute beat needs a row to find. The page labels it
 * scaffolding rather than business automation in the prose under the table,
 * which is the honest way to say both things at once.
 *
 * ## Reverse verification (four directions, each predicted before it was run)
 *
 * | direction | predicted | measured |
 * | --- | --- | --- |
 * | put `(11)` back in the English header | only the English total-count rule reds; every row rule stays green because no row moved | `1 failed | 19 passed`: `automation.mdx (en) says 11 built-in flows; the stack ships 24` |
 * | delete the `Contact Welcome` row from zh-Hant | only that page's row rule reds, naming the flow; **both count rules stay green** — the numerals come from the stack, not from the rows | `1 failed | 19 passed`: `contact_welcome: automation.zh-Hant.mdx (zh-Hant) has no "聯絡人歡迎" row` |
 * | put the stale `计划（周一 9 点）` trigger back on the campaign row (zh-Hans), leaving the label alone | only the trigger rule reds; the schedule-count rule stays green, because it counts scheduled flows in the stack and never the rows that say `计划` | `1 failed | 19 passed`: `campaign_enrollment: … trigger cell "计划（周一 9 点）" is missing "屏幕"` |
 * | add a row for a flow the app does not ship | only the ghost-row rule reds | `1 failed | 19 passed`: `automation.mdx (en): row "Territory Rebalance" names no flow this app ships` |
 *
 * Directions 2 and 3 are the ones worth the trouble. Together they show the row
 * set, the trigger cells and the two numerals are pinned to the same derived
 * set independently — so no pair of them can drift into agreement, which is
 * exactly how a table of eleven rows kept a header reading `(11)` while the app
 * shipped 24 flows. Direction 3 makes that concrete: with the stale cell back in
 * place the zh-Hans table holds TEN rows saying `计划` while the prose under it
 * says 九个, and the count rule is still green — because it is reading the stack,
 * which is the only place either number has ever been true.
 */

type AnyRec = Record<string, any>;
type Locale = 'en' | 'zh-Hans' | 'zh-Hant';

const flows: AnyRec[] = (stack as any).flows ?? [];

const DOC = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

/**
 * Rows of the first markdown table after `heading`, as trimmed cell arrays.
 *
 * Same shape as `sharing-coverage.test.ts`'s reader (#795) — kept local rather
 * than exported, because that one asserts against its own page's default and
 * these three pages want their own failure text.
 */
const tableAfter = (doc: string, heading: string, file: string): string[][] => {
  const start = doc.indexOf(heading);
  expect(start, `"${heading}" is gone from ${file} — this guard has gone blind`).toBeGreaterThan(-1);
  const rows: string[][] = [];
  let seenTable = false;
  for (const line of doc.slice(start + heading.length).split('\n')) {
    if (!line.trim().startsWith('|')) {
      if (seenTable) break;
      continue;
    }
    seenTable = true;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => /^-+$/.test(c)) || cells.length === 0) continue;
    rows.push(cells);
  }
  return rows.slice(1); // drop the header row
};

/** `**Lead Conversion Process**` -> `Lead Conversion Process`. */
const unbold = (cell: string): string => cell.replace(/^\*\*/, '').replace(/\*\*$/, '').trim();

/** The start node — where a flow's trigger surface actually lives. */
const startOf = (flow: AnyRec): AnyRec => {
  const nodes: AnyRec[] = flow.nodes ?? [];
  const start = nodes.find((n) => n.type === 'start') ?? nodes[0];
  if (!start) throw new Error(`flow ${flow.name} has no nodes — cannot read its trigger`);
  return start;
};

/** `screen` | `record_change` | `schedule`, off the flow itself. */
const kindOf = (flow: AnyRec): string => flow.type as string;

/** `record-after-create` | `record-after-update`, for record-change flows. */
const eventOf = (flow: AnyRec): string | undefined => startOf(flow).config?.triggerType;

/** The cron expression, for scheduled flows. */
const cronOf = (flow: AnyRec): string | undefined => startOf(flow).config?.schedule;

/**
 * How each page spells a cron. An unregistered cron is a deliberate failure —
 * the convention `docs-drift.test.ts` set for its own `CRON_LABEL`, because the
 * alternative (fall back to the raw expression) silently passes a doc that never
 * mentioned the new time.
 */
const CRON_LABEL: Record<string, Record<Locale, string>> = {
  '0 0 * * *': { en: 'daily midnight', 'zh-Hans': '每日 0 点', 'zh-Hant': '每日 0 點' },
  '0 1 * * *': { en: 'daily 1 AM', 'zh-Hans': '每日 1 点', 'zh-Hant': '每日 1 點' },
  '0 2 * * *': { en: 'daily 2 AM', 'zh-Hans': '每日 2 点', 'zh-Hant': '每日 2 點' },
  '0 3 * * *': { en: 'daily 3 AM', 'zh-Hans': '每日 3 点', 'zh-Hant': '每日 3 點' },
  '30 7 * * *': { en: 'daily 7:30 AM', 'zh-Hans': '每日 7:30', 'zh-Hant': '每日 7:30' },
  '0 8 * * *': { en: 'daily 8 AM', 'zh-Hans': '每日 8 点', 'zh-Hant': '每日 8 點' },
  '0 * * * *': { en: 'hourly', 'zh-Hans': '每小时', 'zh-Hant': '每小時' },
  '*/10 * * * *': { en: 'every 10 min', 'zh-Hans': '每 10 分钟', 'zh-Hant': '每 10 分鐘' },
};

/** The trigger vocabulary each page uses, per kind. */
const TRIGGER_WORD: Record<Locale, { screen: string; record_change: string; schedule: string }> = {
  en: { screen: 'Screen', record_change: 'Record change', schedule: 'Schedule' },
  'zh-Hans': { screen: '屏幕', record_change: '记录变更', schedule: '计划' },
  'zh-Hant': { screen: '螢幕', record_change: '記錄變更', schedule: '排程' },
};

/** …and the insert/update half of a record-change trigger. */
const EVENT_WORD: Record<Locale, { 'record-after-create': string; 'record-after-update': string }> = {
  en: { 'record-after-create': '(insert)', 'record-after-update': '(update)' },
  'zh-Hans': { 'record-after-create': '（插入）', 'record-after-update': '（更新）' },
  'zh-Hant': { 'record-after-create': '（插入）', 'record-after-update': '（更新）' },
};

/**
 * The Chinese row label for each shipped flow.
 *
 * Authored, not derived — see the header. English is absent on purpose: that
 * page uses the flow's own `label`, checked against the stack.
 */
const ROW_LABEL: Record<string, Record<'zh-Hans' | 'zh-Hant', string>> = {
  // 转化, not 转换: the lead convert verb face follows the locale pack, where
  // `convert_lead.label` is 转化线索 and `is_converted` is 已转化 (#801/#825/#829).
  // The flow itself carries no locale-pack entry, so this ledger is where the
  // page's spelling is pinned — it moves with the three pages, not after them.
  lead_conversion: { 'zh-Hans': '线索转化流程', 'zh-Hant': '線索轉化流程' },
  quote_generation: { 'zh-Hans': '由商机生成报价', 'zh-Hant': '由商機產生報價' },
  schedule_followup: { 'zh-Hans': '安排跟进', 'zh-Hant': '安排跟進' },
  // 营销活动, not 活动: 「活动」 is the locale pack's label for `crm_event`, and this
  // page's own table sits one section from the campaign rows. Naming the master
  // fully is the same call #810 made for `crm_campaign_member`.
  // 成员, not 线索: the flow enrols leads AND contacts since #597, and the
  // English label moved to "Enroll Members in Campaign" with it. 「成员」 follows
  // the locale packs, where `crm_campaign_member` is 营销活动成员.
  campaign_enrollment: { 'zh-Hans': '将成员登记进营销活动', 'zh-Hant': '將成員登記進行銷活動' },
  // 工单/工單, not 案例: the locale pack labels these two screen actions
  // 升级工单 / 关闭工单 (`crm_case._actions`), and the pack's own object label
  // is 工单 since #837. These rows spelled it 案例 until then — the page and
  // the pack contradicting each other, both green.
  escalate_case: { 'zh-Hans': '升级工单', 'zh-Hant': '升級工單' },
  close_case: { 'zh-Hans': '关闭工单', 'zh-Hant': '關閉工單' },
  lead_assignment: { 'zh-Hans': '新线索路由与 SLA', 'zh-Hant': '新線索路由與 SLA' },
  contact_welcome: { 'zh-Hans': '联系人欢迎', 'zh-Hant': '聯絡人歡迎' },
  task_urgent_alert: { 'zh-Hans': '紧急任务提醒', 'zh-Hant': '緊急任務提醒' },
  opportunity_approval: { 'zh-Hans': '大额商机审批', 'zh-Hant': '大額商機審批' },
  opportunity_approval_on_create: {
    'zh-Hans': '大额商机审批（新建时）',
    'zh-Hant': '大額商機審批（新建時）',
  },
  opportunity_won_alert: { 'zh-Hans': '大额商机赢单提醒', 'zh-Hant': '大額商機贏單提醒' },
  case_escalation: { 'zh-Hans': '工单升级流程', 'zh-Hant': '工單升級流程' },
  case_escalation_on_create: {
    'zh-Hans': '工单升级流程（新建时）',
    'zh-Hant': '工單升級流程（新建時）',
  },
  case_csat_followup: { 'zh-Hans': '工单满意度回访', 'zh-Hant': '工單滿意度回訪' },
  contract_expiration: { 'zh-Hans': '合同自动到期', 'zh-Hant': '合約自動到期' },
  quote_expiration: { 'zh-Hans': '报价自动过期', 'zh-Hant': '報價自動過期' },
  campaign_completion: { 'zh-Hans': '营销活动自动完成', 'zh-Hant': '行銷活動自動完成' },
  forecast_snapshot: { 'zh-Hans': '预测快照', 'zh-Hant': '預測快照' },
  opportunity_stagnation: { 'zh-Hans': '停滞商机提醒', 'zh-Hant': '停滯商機提醒' },
  contract_renewal: { 'zh-Hans': '合同续约提醒', 'zh-Hant': '合約續約提醒' },
  case_sla_monitor: { 'zh-Hans': '工单 SLA 监控', 'zh-Hant': '工單 SLA 監控' },
  task_due_reminder: { 'zh-Hans': '任务到期提醒', 'zh-Hant': '任務到期提醒' },
  demo_bootstrap: { 'zh-Hans': '演示数据引导', 'zh-Hant': '展示資料啟動' },
  // 计费/計費, not 账单/帳單: the pages call the outbound target 「计费端点」 and the
  // boundary page is 「计费交接」, so the flow labels follow that one word (#600).
  billing_handoff_closed_won: { 'zh-Hans': '计费交接：赢单', 'zh-Hant': '計費交接：贏單' },
  billing_handoff_contract_activated: {
    'zh-Hans': '计费交接：合同激活',
    'zh-Hant': '計費交接：合約啟用',
  },
};

/** How each page spells the two counts. An unmapped count throws — see the header. */
const COUNT_WORD: Record<Locale, Record<number, string>> = {
  en: { 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine', 10: 'ten', 11: 'eleven', 12: 'twelve' },
  'zh-Hans': { 6: '六', 7: '七', 8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二' },
  'zh-Hant': { 6: '六', 7: '七', 8: '八', 9: '九', 10: '十', 11: '十一', 12: '十二' },
};

type Page = {
  file: string;
  locale: Locale;
  /** The `##` heading the flow table follows. */
  flowsHeading: string;
  /** Captures the total-flow numeral in the table's header sentence. */
  totalSentence: RegExp;
  /** Captures the scheduled-flow count word in the section below the table. */
  scheduleSentence: RegExp;
};

const PAGES: Page[] = [
  {
    file: 'content/docs/administration/automation.mdx',
    locale: 'en',
    flowsHeading: '## Flows (multi-step)',
    totalSentence: /\*\*Built-in flows in HotCRM\*\* \((\d+)\)/,
    scheduleSentence: /The ([a-z]+) `Schedule` rows above/,
  },
  {
    file: 'content/docs/administration/automation.zh-Hans.mdx',
    locale: 'zh-Hans',
    flowsHeading: '## 流程（多步骤）',
    totalSentence: /\*\*HotCRM 中的内置流程\*\*（(\d+) 个）/,
    scheduleSentence: /上表中([一二三四五六七八九十]+)个 `计划` 行/,
  },
  {
    file: 'content/docs/administration/automation.zh-Hant.mdx',
    locale: 'zh-Hant',
    flowsHeading: '## 流程（多步驟）',
    totalSentence: /\*\*HotCRM 中的內建流程\*\*（(\d+) 個）/,
    scheduleSentence: /上表中([一二三四五六七八九十]+)個 `排程` 行/,
  },
];

/** The row label this page is expected to use for a flow. */
const labelFor = (flow: AnyRec, locale: Locale): string | undefined =>
  locale === 'en' ? (flow.label as string) : ROW_LABEL[flow.name as string]?.[locale];

/** The substrings a flow's trigger cell must contain on this page. */
const triggerParts = (flow: AnyRec, locale: Locale): string[] => {
  const kind = kindOf(flow);
  const words = TRIGGER_WORD[locale];
  if (kind === 'screen') return [words.screen];
  if (kind === 'record_change') {
    const event = eventOf(flow);
    const word = EVENT_WORD[locale][event as keyof (typeof EVENT_WORD)[Locale]];
    if (!word) {
      throw new Error(
        `flow ${flow.name} fires on '${event}', which this guard cannot spell — add it to ` +
          'EVENT_WORD for all three locales and update the three tables',
      );
    }
    return [words.record_change, word];
  }
  if (kind === 'schedule') {
    const cron = cronOf(flow);
    const label = CRON_LABEL[cron as string]?.[locale];
    if (!label) {
      throw new Error(
        `flow ${flow.name} runs on cron '${cron}', which no CRON_LABEL entry spells — add it ` +
          'for all three locales and update the three tables (the admin page states the time)',
      );
    }
    return [words.schedule, label];
  }
  throw new Error(`flow ${flow.name} has trigger kind '${kind}', which this guard does not know`);
};

const scheduledFlows = flows.filter((f) => kindOf(f) === 'schedule');

describe('the automation page lists every flow the app ships, in every locale (#827)', () => {
  it('the ledger answers exactly the flows this app ships', () => {
    // Anti-vacuum, both halves. 24 flows ship today, 9 of them scheduled; a
    // ledger compared against an empty derived set would pass by checking
    // nothing at all, and so would every rule below it.
    expect(
      flows.length,
      'fewer than 20 flows in the compiled stack — either the app genuinely shrank (then ' +
        'lower this number knowingly) or the derivation broke and every rule below is ' +
        'comparing empty sets',
    ).toBeGreaterThanOrEqual(20);
    expect(
      scheduledFlows.length,
      'fewer than five scheduled flows in the compiled stack — same reasoning: lower this ' +
        'knowingly, or find out why the derivation stopped seeing them',
    ).toBeGreaterThanOrEqual(5);

    const unledgered = flows
      .map((f) => f.name as string)
      .filter((name) => !(name in ROW_LABEL));
    expect(
      unledgered,
      `shipped flows with no Chinese row label:\n  ${unledgered.join('\n  ')}\n` +
        'Add the two locale labels here, and a row to each of the three pages.',
    ).toEqual([]);

    const stale = Object.keys(ROW_LABEL).filter(
      (name) => !flows.some((f) => f.name === name),
    );
    expect(
      stale,
      `ledger entries whose flow this app no longer ships:\n  ${stale.join('\n  ')}\n` +
        'Its row now points an admin at automation that cannot appear in the process ' +
        'monitor. Drop the row from all three pages, then the entry.',
    ).toEqual([]);
  });

  it('no two flows share a row label within one locale', () => {
    // "Exactly one row per flow" only means something while labels identify
    // flows one-for-one. Two flows sharing a label would let one row answer for
    // both, and a ghost row for the other would slip past unnoticed — which
    // matters here more than usual, because two flows are deliberately near-twins
    // (`case_escalation` and `case_escalation_on_create`).
    const bad: string[] = [];
    for (const { locale } of PAGES) {
      const seen = new Map<string, string>();
      for (const flow of flows) {
        const label = labelFor(flow, locale);
        if (!label) continue;
        const owner = seen.get(label);
        if (owner) bad.push(`${locale}: "${label}" labels both ${owner} and ${flow.name}`);
        else seen.set(label, flow.name as string);
      }
    }
    expect(bad, `ambiguous flow row labels:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  for (const page of PAGES) {
    describe(page.file, () => {
      const rowsOf = () => tableAfter(DOC(page.file), page.flowsHeading, page.file);

      it('the built-in flow table still parses', () => {
        // Anti-vacuum #2: a table that stopped parsing would let every rule
        // below pass over an empty row list.
        expect(
          rowsOf().length,
          `no flow table row parsed out of ${page.file} after "${page.flowsHeading}" — the ` +
            'table moved, changed shape, or lost its heading, and this whole block has gone blind',
        ).toBeGreaterThan(0);
      });

      it('every shipped flow has exactly one row', () => {
        const rows = rowsOf();
        const bad: string[] = [];
        for (const flow of flows) {
          const label = labelFor(flow, page.locale);
          if (!label) continue; // reported by the ledger test above
          const matched = rows.filter((cells) => unbold(cells[0] ?? '') === label);
          if (matched.length === 0) {
            bad.push(`${flow.name}: ${page.file} (${page.locale}) has no "${label}" row`);
          } else if (matched.length > 1) {
            bad.push(
              `${flow.name}: ${page.file} (${page.locale}) has ${matched.length} "${label}" rows`,
            );
          }
        }
        expect(
          bad,
          `flows this app ships with no row on the page:\n  ${bad.join('\n  ')}\n` +
            'This table is the admin’s only route from a symptom to the automation behind ' +
            'it. A missing row does not read as an incomplete table — it reads as "nothing ' +
            'automates this" (#827).',
        ).toEqual([]);
      });

      it('every row states the trigger surface the flow actually ships', () => {
        const rows = rowsOf();
        const bad: string[] = [];
        for (const flow of flows) {
          const label = labelFor(flow, page.locale);
          if (!label) continue;
          const row = rows.find((cells) => unbold(cells[0] ?? '') === label);
          if (!row) continue; // reported by the row rule above
          const cell = row[1] ?? '';
          for (const part of triggerParts(flow, page.locale)) {
            if (!cell.includes(part)) {
              bad.push(
                `${flow.name}: ${page.file} (${page.locale}) row "${label}" trigger cell ` +
                  `"${cell}" is missing "${part}"`,
              );
            }
          }
        }
        expect(
          bad,
          `trigger cells that do not match the flow:\n  ${bad.join('\n  ')}\n` +
            '`campaign_enrollment` was billed as `Schedule (Mon 9 AM)` on all three pages for ' +
            'releases after it became a screen flow — so an admin looking for a Monday sweep ' +
            'that no longer exists found it documented, and the prose below counted it among ' +
            'the scheduled ones (#827).',
        ).toEqual([]);
      });

      it('no row names a flow this app does not ship', () => {
        const known = new Set(flows.map((f) => labelFor(f, page.locale)).filter(Boolean));
        const bad = rowsOf()
          .map((cells) => unbold(cells[0] ?? ''))
          .filter((label) => !known.has(label))
          .map(
            (label) =>
              `${page.file} (${page.locale}): row "${label}" names no flow this app ships`,
          );
        expect(
          bad,
          `rows for flows that are not in the stack:\n  ${bad.join('\n  ')}\n` +
            'A reader takes this row to Studio > Developer > Flow Runs and finds nothing. Either the ' +
            'flow was renamed (fix the row, and the ledger) or it is gone (drop the row).',
        ).toEqual([]);
      });

      it('the table header counts the flows the app ships', () => {
        const match = DOC(page.file).match(page.totalSentence);
        expect(
          match,
          `${page.file}: the sentence introducing the flow table (${page.totalSentence}) is ` +
            'gone — reword the regex, do not delete the check',
        ).toBeTruthy();
        expect(
          Number(match?.[1]),
          `${page.file} (${page.locale}) says ${match?.[1]} built-in flows; the stack ships ` +
            `${flows.length}. This number is computed from the stack, never from the rows ` +
            'below it — a header that merely agrees with a short table is the defect, not the fix.',
        ).toBe(flows.length);
      });

      it('the scheduled-automation section counts the scheduled flows the app ships', () => {
        const match = DOC(page.file).match(page.scheduleSentence);
        expect(
          match,
          `${page.file}: the sentence counting the scheduled rows (${page.scheduleSentence}) ` +
            'is gone — reword the regex, do not delete the check',
        ).toBeTruthy();
        const expected = COUNT_WORD[page.locale][scheduledFlows.length];
        if (!expected) {
          throw new Error(
            `${scheduledFlows.length} scheduled flows — add that number word to ` +
              `COUNT_WORD['${page.locale}'] and update all three pages`,
          );
        }
        expect(
          match?.[1],
          `${page.file} (${page.locale}) counts "${match?.[1]}" scheduled rows; the stack ` +
            `ships ${scheduledFlows.length} (${scheduledFlows.map((f) => f.name).join(', ')})`,
        ).toBe(expected);
      });
    });
  }
});
