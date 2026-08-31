// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  SETUP_APP,
  STUDIO_APP,
  SETUP_NAV_CONTRIBUTIONS,
  SetupAppTranslations,
} from '@objectstack/platform-objects/apps';
import { CrmApp } from '../src/apps';
import { CrmTranslations } from '../src/translations';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Console navigation names cited in the docs, pinned to what the platform
 * actually ships (#853).
 *
 * Six pages sent readers to **Setup → Process Monitor** and **Setup →
 * Scheduled Jobs** to watch automation run. Neither page exists. Neither name
 * exists — a literal search of the installed `@objectstack/*` tree returns zero
 * hits for `Process Monitor`, and the only `Scheduled Jobs` in it is prose
 * inside `JobSchema`'s `.describe()`, not a navigation label. Flow runs are
 * real and live at **Studio → Developer → Flow Runs**; the flow roster is at
 * **Studio → Automation → Flows**.
 *
 * Two things make this worth a guard rather than a one-time correction.
 *
 * **It was accreting.** PR #1089 (#600, billing hand-off) added a *new*
 * 流程监控器 / 流程監控器 reference to `revenue/billing-handoff.zh-Hans.mdx` and
 * `.zh-Hant.mdx` months after the finding was filed, through a review that
 * checked the flows, the durable-outbox measurement and the three-locale docs —
 * and never asked whether the Setup page names inside those new pages existed.
 * Every new docs page written by someone who has not read #853 added to it.
 *
 * **The regression had no arrow.** The #1089 instance reads 「它们的运行也出现在
 * 流程监控器里」 — bare prose, no `Setup → …` path. A guard that only parses
 * navigation paths would have watched it land. So there are two rules here and
 * they catch different shapes:
 *
 *  1. {@link RETIRED_UI_NAMES} — names the platform ships nowhere may not
 *     appear in first-party text at all, in any locale, in any casing, arrow or
 *     no arrow. This is the rule that would have caught #1089.
 *  2. {@link KNOWN_UNRESOLVED} + {@link navigationCitations} — the first
 *     segment of every bold `**App → …**` path in `content/docs/**` must be a
 *     navigation label the platform really ships, resolved live from the
 *     package. This is the rule that catches a wrong name nobody has thought of
 *     yet.
 *  3. {@link KNOWN_UNRESOLVED_CRM} + {@link crmCitations} — the same claim for
 *     **this app's own** navigation. `**Sales → Leads**`, `**Service →
 *     Knowledge**`, `**My Work → My Tasks**` name a group and a child of
 *     `src/apps/crm.app.ts`, and both halves are resolved live against that
 *     file plus `src/translations/*`. Added by #1117 — see "The third app"
 *     below.
 *
 * ## The roster is resolved live, not transcribed
 *
 * {@link NAV_LABELS} is built at test time from `@objectstack/platform-objects`
 * — the Setup app shell, the Setup navigation contributions, the Studio app,
 * and all four shipped locale bundles (`en` / `zh-CN` / `ja-JP` / `es-ES`). A
 * label the platform renames therefore stops resolving here on the next
 * dependency bump, which is the point: the docs' advice expires with the UI it
 * describes, and the failure lands at PR time instead of on a reader.
 *
 * Rule 1 is resolved live in BOTH directions. A retired name must (a) appear
 * nowhere in first-party text and (b) still resolve to nothing in the shipped
 * roster. If ObjectStack ever ships a page genuinely called *Process Monitor*,
 * (b) goes red and the entry retires itself loudly, instead of this file
 * banning a name that has become correct. Each entry's replacement path is
 * asserted to resolve as a real group/child pair for the same reason.
 *
 * ## Why the path rule checks the FIRST segment only
 *
 * `**Setup → Users → [user] → Deactivate**` is one sidebar entry followed by
 * two in-page controls. Measured against `content/docs/**`: checking the first
 * segment leaves 0 distinct unresolved names, checking every segment leaves
 * 2 — and both of those, `Deactivate` and `[user]`, come from the citation
 * above: in-page controls, not navigation. The first segment is the claim a
 * reader acts on ("click this in the sidebar"), so it is the claim that is
 * pinned. (Both numbers were 39 / 74 when #853 first measured them, then
 * 20 / 32 and 13 / 21 after #1113's first two passes; #1113 closed the gap,
 * not the rule. That the all-segment residue is now only those two buttons is
 * the evidence the split was drawn in the right place.)
 *
 * ## The third app, and the edge of what bold-arrow prose can be held to (#1117)
 *
 * Rule 2's matcher is built from {@link APP_WORDS}, so for a long time a bold
 * path was extracted **only** when its first segment was Setup or Studio.
 * Everything else was invisible — not quarantined, not counted, not failed.
 * Re-measured on `main` at `4c6add4`: 307 bold `**… → …**` runs across 201
 * pages, of which rule 2 sees 144 (Setup 87, Studio 42, 设置 15, 設定 0).
 *
 * The largest coherent thing in that remainder was **this app's own
 * navigation**. `Sales`, `My Work`, `Service` and `Activity` are not loose
 * product words — they are groups declared in `src/apps/crm.app.ts`, relabelled
 * per locale in `src/translations/*`, and rendered in the sidebar of the app
 * these docs are about. Rule 3 resolves them the same way rule 2 resolves
 * Setup's: live, from the metadata, in every shipped locale. It is also
 * **stricter** than rule 2 in one respect — rule 2 takes the app word itself on
 * trust (`APP_WORDS` is hand-written), while rule 3's matcher is generated from
 * the shipped group labels, so the group half cannot drift unnoticed either.
 * It found 30 citations and 8 unresolved ones on its first run.
 *
 * ⛔ **Do not extend this to every bold arrow in the docs.** The measurement
 * says plainly that `**X → Y**` is not a navigation marker in this repo — it is
 * just an arrow that happens to be inside bold. Of the 163 runs rule 2 does not
 * see, 61 are whole bolded *sentences* (`**There is no Setup → Business Hours
 * screen.**` — a denial, and correct), and most of the rest are other
 * relations entirely: object → field (`**Account → Last Activity Date**`),
 * field → value (`**Status → Held**`), a state transition (`**Queued →
 * Sent**`), an explicitly unshipped design sketch (`**Deploy → pick target
 * tenant**`, marked *(not shipped)* on the same line), a report name
 * (`**Opportunity Funnel by Owner → …**`), or two adjacent bold runs a regex
 * reads as one (`**⋮** menu → **Install app**`). A rule demanding that every
 * such first segment resolve, or be declared, would spend its entries on
 * parser artifacts and go red on ordinary prose. Widen where the vocabulary is
 * resolvable; leave the rest to rule 1, which needs no arrow.
 *
 * Two names in that remainder resolved to nothing in `src/`, and #1117 asked
 * which of them were wrong. They landed on opposite sides:
 *
 *  - **`AI Copilot → Revenue Forecasting`** (`sales/forecasting*.mdx`) is
 *    CORRECT and is deliberately not covered. `Revenue Forecasting` is a real
 *    skill label (`src/skills/revenue-forecasting.skill.ts`), and *AI Copilot*
 *    is this product's name for the platform assistant panel — see
 *    `content/docs/ai-copilot/index.mdx`, which spends a section saying the
 *    assistant is the platform's `ask` agent and what HotCRM adds to it are
 *    skills. It is a surface, not a sidebar entry: the app switcher offers
 *    exactly two apps, HotCRM and Setup. Renaming it to something that
 *    resolves would corrupt correct documentation to satisfy a test.
 *  - **`Stripe Sync → Re-link`** (`reference/faq*.mdx`) was WRONG, and is now
 *    rule 1's problem instead — see {@link RETIRED_UI_NAMES}.
 *
 * ## Why there is a quarantine ledger, and what it is not
 *
 * The ledger is **empty**, and that is the finished state, not a missing
 * feature. It held 39 names when #853 first measured the repo, and #1113
 * emptied it in three passes:
 *
 *  - **39 → 20**, the *invented* screens: Salesforce-flavoured names
 *    (*Profiles* → **Permission Sets**, *Sharing Settings* → **Sharing
 *    Rules**) and names for capabilities this platform does not have at all
 *    (*Recycle Bin*, *Sandbox Management*, *Change Packages*, *Privacy*,
 *    *Usage*, *Lead Settings*), now either the real path or a plain statement
 *    that the screen does not exist.
 *  - **20 → 13**, right name / wrong app: *Automation*, *Email Templates* and
 *    *Objects* are real navigation labels — in **Studio** — and the docs filed
 *    them under **Setup**. Not a mechanical rename, because one of the seven
 *    was a deliberate DENIAL that names a page in order to say it does not
 *    exist (`guides/email-and-calendar.zh-Hans.mdx`'s 「邮件模板（尚未落地）」
 *    section): pointing a denial at the live Studio path would have made the
 *    page contradict its own "HotCRM ships none of it today", so that one was
 *    reworded to drop the path form instead. The other six really were the
 *    wrong app, denials included — 「no *Workflow Rules* entry under **Studio →
 *    Automation** — only *Flows*」 is both true and the more useful sentence.
 *  - **13 → 0**, the zh-Hant strings, all of them structural: the platform
 *    ships `en` / `zh-CN` / `ja-JP` / `es-ES` and **no Traditional-Chinese
 *    pack**, so a zh-Hant reader sees the English UI and every one of the 13
 *    described a surface that existed in no configuration. Ruled on the card:
 *    zh-Hant pages spell platform navigation in **English**, the convention
 *    `getting-started/quick-tour.zh-Hant.mdx` already followed and the same
 *    fact `docs-search-navigation-views.test.ts` recorded for 待我審核 (#973).
 *    Each was ALSO an instance of one of the two sub-classes above wearing a
 *    Hant costume, so each was re-judged before being rendered: *變更包* and
 *    *潛在客戶設定* were invented screens and became denials, *自動化* /
 *    *物件* / *電子郵件範本* were Studio's, and the two on
 *    `guides/email-and-calendar.zh-Hant.mdx` were surface-denials that
 *    resisted renaming for the same reason their zh-Hans twin did.
 *
 * ⛔ **Do not delete {@link KNOWN_UNRESOLVED} because it is empty.** An empty
 * ledger that is still checked in both directions is the strongest state this
 * guard can be in: it says every name in `content/docs/**` resolves live
 * today, and it is the thing that catches the next one. Deleting the mechanism
 * would trade a measured zero for an unmeasured one.
 *
 * The ledger is keyed by NAME, not by name-and-file, and that is deliberate:
 * these names are already-filed drift, so a second page repeating one of them
 * adds nothing new to track, while the churn of re-listing files on every
 * ordinary docs edit would be paid on every PR. What the rule stops is a name
 * that is NOT in the ledger — a wrong page name nobody has filed yet, which is
 * exactly the accretion #853 is about. {@link KNOWN_UNRESOLVED} is also checked
 * for staleness in both directions, so it can never quietly become a list of
 * names that no longer appear or that the platform has since started shipping.
 *
 * Nothing else covers this. `os validate` and `pnpm lint` walk authored
 * metadata and never open `content/docs`, the same gap
 * `docs-quick-tour-navigation.test.ts` (#960) and
 * `docs-revenue-approvals-navigation.test.ts` (#963) each had to close for
 * their own page — so the check lives where the claim lives.
 */

type AnyRec = Record<string, any>;

/** Locale bundles the platform ships for the Setup / Studio / Account apps. */
const SHIPPED_LOCALES = Object.keys(SetupAppTranslations as AnyRec);

/** Locale bundles THIS app ships for its own navigation (`src/translations/`). */
const CRM_LOCALES = Object.keys(CrmTranslations as AnyRec);

/** The app id `src/translations/*` files their navigation overrides under. */
const CRM_APP_ID = (CrmApp as AnyRec).name as string;

/** One locale's navigation overrides for this app, `id → { label }`. */
const crmNavOverrides = (locale: string): Record<string, AnyRec> =>
  ((CrmTranslations as AnyRec)[locale]?.apps?.[CRM_APP_ID]?.navigation ?? {}) as Record<
    string,
    AnyRec
  >;

/**
 * Every navigation label each app really shows, per app, across every shipped
 * locale — group headers and leaf items alike.
 *
 * Three sources, because no single one is complete: the app shells carry the
 * groups, `SETUP_NAV_CONTRIBUTIONS` carries the items the packages contribute
 * into them, and the locale bundles carry both again plus the items contributed
 * by plugins that are not imported here (`nav_audit_logs`, `nav_webhooks`,
 * `nav_datasources`, …).
 */
const NAV_LABELS: Record<'setup' | 'studio', Set<string>> = (() => {
  const out = { setup: new Set<string>(), studio: new Set<string>() };

  const addTree = (app: 'setup' | 'studio', navigation: unknown) => {
    for (const group of (navigation ?? []) as AnyRec[]) {
      if (group?.label) out[app].add(group.label);
      for (const child of (group?.children ?? []) as AnyRec[]) {
        if (child?.label) out[app].add(child.label);
      }
    }
  };

  addTree('setup', (SETUP_APP as AnyRec).navigation);
  addTree('studio', (STUDIO_APP as AnyRec).navigation);

  for (const contribution of SETUP_NAV_CONTRIBUTIONS as AnyRec[]) {
    for (const item of (contribution?.items ?? []) as AnyRec[]) {
      if (item?.label) out.setup.add(item.label);
    }
  }

  for (const locale of SHIPPED_LOCALES) {
    for (const app of ['setup', 'studio'] as const) {
      const nav = ((SetupAppTranslations as AnyRec)[locale]?.apps?.[app]?.navigation ??
        {}) as Record<string, AnyRec>;
      for (const entry of Object.values(nav)) {
        if (entry?.label) out[app].add(entry.label);
      }
    }
  }

  return out;
})();

/** Does `app` ship a navigation label spelled exactly `name`, in any locale? */
const shipsNavLabel = (app: 'setup' | 'studio', name: string): boolean =>
  NAV_LABELS[app].has(name);

/** Does ANY app ship this label — used to prove a retired name is retired. */
const shipsAnywhere = (name: string): boolean =>
  shipsNavLabel('setup', name) || shipsNavLabel('studio', name) || CRM_LABELS.has(name);

/** Ledger key for one `group → child` citation into this app's navigation. */
const crmPairKey = (group: string, child: string): string => `${group} → ${child}`;

/**
 * This app's own navigation, resolved live from `src/apps/crm.app.ts` and the
 * four locale bundles in `src/translations/` — the same "resolve, don't
 * transcribe" rule the Setup/Studio roster above follows, pointed at the app
 * these docs actually document.
 *
 * {@link CRM_GROUP_LABELS} is every spelling of a sidebar GROUP header (the
 * first segment a citation can open with). {@link CRM_PAIRS} is every real
 * group → child pair, keyed within ONE locale, so a citation cannot pass by
 * naming a group and a child that both exist but sit apart. The label a locale
 * does not override falls back to the shell's own, exactly as the Console does.
 */
const { CRM_GROUP_LABELS, CRM_PAIRS, CRM_LABELS } = (() => {
  const groups = new Set<string>();
  const pairs = new Set<string>();
  const all = new Set<string>();
  for (const locale of CRM_LOCALES) {
    const nav = crmNavOverrides(locale);
    const labelOf = (id: string, fallback: string): string => nav[id]?.label ?? fallback;
    for (const entry of ((CrmApp as AnyRec).navigation ?? []) as AnyRec[]) {
      if (!entry?.label) continue;
      const entryLabel = labelOf(entry.id, entry.label);
      all.add(entryLabel);
      if (entry.type !== 'group') continue;
      groups.add(entryLabel);
      for (const child of (entry.children ?? []) as AnyRec[]) {
        if (!child?.label) continue;
        const childLabel = labelOf(child.id, child.label);
        all.add(childLabel);
        pairs.add(crmPairKey(entryLabel, childLabel));
      }
    }
  }
  return { CRM_GROUP_LABELS: groups, CRM_PAIRS: pairs, CRM_LABELS: all };
})();

/**
 * Resolve `group → item` against one app's shipped navigation, in one locale.
 *
 * Stronger than {@link shipsNavLabel}: it asserts the two labels are really
 * parent and child, so a replacement path cannot pass by naming two entries
 * that both exist but sit in different groups.
 */
const resolvesPath = (app: 'setup' | 'studio', locale: string, path: [string, string]): boolean => {
  const shell = (app === 'setup' ? SETUP_APP : STUDIO_APP) as AnyRec;
  const nav = ((SetupAppTranslations as AnyRec)[locale]?.apps?.[app]?.navigation ?? {}) as Record<
    string,
    AnyRec
  >;
  const labelOf = (id: string, fallback: string): string => nav[id]?.label ?? fallback;

  for (const group of (shell.navigation ?? []) as AnyRec[]) {
    if (labelOf(group.id, group.label) !== path[0]) continue;
    const children = [
      ...((group.children ?? []) as AnyRec[]),
      ...(SETUP_NAV_CONTRIBUTIONS as AnyRec[])
        .filter((c) => c.app === shell.name && c.group === group.id)
        .flatMap((c) => (c.items ?? []) as AnyRec[]),
    ];
    if (children.some((child) => labelOf(child.id, child.label) === path[1])) return true;
  }
  return false;
};

/**
 * UI page names this repo's docs cited that the platform ships nowhere.
 *
 * ADDING ONE IS A ONE-LINE CHANGE: append an entry. `wrong` lists every
 * spelling, in every locale, that must not appear in first-party text;
 * `replacement` is the real path, asserted to resolve live so this table cannot
 * point somewhere that has itself gone stale.
 *
 * `replacement: null` is for the case where there is no real path to send the
 * reader to, because the capability itself does not exist. #1113's first pass
 * established the prose form — a plain statement that the screen does not
 * exist — and #1117 added the first ledger entry of that shape. A null entry
 * still carries the full both-directions check: the name must appear nowhere,
 * and must still resolve to nothing.
 */
const RETIRED_UI_NAMES: {
  wrong: string[];
  replacement: { app: 'setup' | 'studio'; path: [string, string]; locale: string } | null;
  why: string;
}[] = [
  {
    wrong: ['Process Monitor', '流程监控器', '流程監控器'],
    replacement: { app: 'studio', path: ['Developer', 'Flow Runs'], locale: 'en' },
    why: '#853 — zero hits in the installed platform tree; flow runs live in Studio.',
  },
  {
    wrong: ['流程运行记录'],
    // The zh-CN label of the SAME page. Not retired — it is the correct gloss on
    // the zh-Hans page, and is exempted from the appearance rule below. Listed
    // so the gloss is pinned live: if the platform relabels it, this goes red.
    replacement: { app: 'studio', path: ['开发者', '流程运行记录'], locale: 'zh-CN' },
    why: '#853 — the zh-CN spelling the zh-Hans page glosses; pinned, not banned.',
  },
  {
    wrong: ['Stripe Sync'],
    replacement: null,
    why:
      '#1117 — `reference/faq*.mdx` told a reader whose Stripe customer had not ' +
      'linked to "use the Stripe Sync → Re-link action". There is no such action ' +
      'and no such surface: zero occurrences of Stripe in `src/`, no connector ' +
      'among the installed platform packages, and `guides/integrations.mdx` says ' +
      'in its own words that no packaged vendor connector ships and that the ' +
      'closest thing to Stripe today is "Nothing". The FAQ now says that instead. ' +
      'Banned rather than redirected because there is nowhere to redirect to — ' +
      'and if a Stripe connector ever ships, the both-directions check below ' +
      'retires this entry loudly.',
  },
];

/** Retired spellings that are correct somewhere and so are not banned outright. */
const NOT_BANNED = new Set(['流程运行记录']);

/**
 * First-segment navigation names cited in `content/docs/**` that resolve to
 * nothing. **Empty since #1113's third pass** — see the "quarantine ledger"
 * section of this file's header for the 39 → 20 → 13 → 0 history, and for why
 * the empty set stays.
 *
 * ADDING ONE IS A ONE-LINE CHANGE — but do not reach for it to silence a name
 * you just wrote. A new page citing a page name that does not exist is the
 * defect this file exists to catch, and there is no longer any backlog for a
 * new entry to hide in.
 *
 * Entries are `app:name`, because the app half carries real information here.
 * #1113's second pass is what proves it: *Automation*, *Email Templates* and
 * 对象 were all real navigation labels the whole time — in **Studio** — and the
 * docs cited them under **Setup**, where they do not exist. A name-only ledger
 * would have called those seven entries resolved and never asked which app.
 */
const KNOWN_UNRESOLVED = new Set<string>([
  // EMPTY, and deliberately kept. #1113 cleared the last 13 (all zh-Hant) in
  // its third pass, so every bold navigation citation in content/docs now
  // resolves live against what the platform ships. Keep the set — the two
  // staleness checks below run against it in both directions, so an empty
  // ledger is an ASSERTED zero rather than an absent one, and the next wrong
  // name has something to fail against instead of a deleted mechanism.
]);

/** Ledger key for one citation. */
const ledgerKey = (app: 'setup' | 'studio', name: string): string => `${app}:${name}`;

/**
 * `group → child` citations into THIS app's navigation that resolve to
 * nothing. Keyed by the pair, because both halves carry information.
 *
 * ADDING ONE IS A ONE-LINE CHANGE — and the same warning as
 * {@link KNOWN_UNRESOLVED} applies: do not reach for it to silence a path you
 * just wrote. Every entry below is drift that pre-dates rule 3 and was found
 * by its first run, not by anyone writing a new page.
 */
const KNOWN_UNRESOLVED_CRM = new Set<string>([
  // All five are zh-Hant, and all five are structural rather than drift: this
  // app ships `en` / `zh-CN` / `ja-JP` / `es-ES` and NO Traditional-Chinese
  // bundle, so a Traditional leaf label is a screen that exists in no
  // configuration. It is #1113's third sub-class again, one app over — and the
  // fix is the same ruling (spell the navigation in the locale the app really
  // renders), which is a rewrite of five pages rather than a rename, so it is
  // filed rather than smuggled in here. The GROUP halves resolve only because
  // 我的工作 and 活動 collide with this app's zh-CN and ja-JP spellings.
  crmPairKey('我的工作', '我的行事曆'),
  crmPairKey('我的工作', '我的任務'),
  crmPairKey('我的工作', '我的線索'),
  crmPairKey('我的工作', '我的日曆'),
  crmPairKey('活動', '活動'),
]);

/**
 * First-party text trees: the reader-facing docs, plus the TypeScript that
 * describes the same surfaces to the next maintainer — `src/flows/*.flow.ts`
 * header comments and test prose both told readers to look in the process
 * monitor, and both are wrong for the same reason a page is.
 *
 * `.changeset/**` is deliberately NOT scanned. A changeset's job is to record
 * what changed, so the one that retires a name has to be able to say the name —
 * as this card's own does. That exemption is narrow and it is not free: #839's
 * pending changeset was giving *advice* in the retired name's voice ("the name
 * shown in Setup's process monitor"), which would have shipped the false claim
 * to `CHANGELOG.md` at release. It is corrected in this PR by hand, because no
 * rule can separate "advice in a changeset" from "history in a changeset".
 */
const SCANNED_DIRS = ['content/docs', 'src', 'test', 'docs'];

/** This file names the retired spellings on purpose, so it cannot scan itself. */
const SELF = 'test/docs-setup-navigation-names.test.ts';

/** Every scannable file under `dir`, as repo-relative paths. */
const walk = (dir: string): string[] => {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(join(REPO_ROOT, dir));
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = join(dir, entry);
    if (statSync(join(REPO_ROOT, rel)).isDirectory()) out.push(...walk(rel));
    else if (/\.(mdx|md|ts)$/.test(rel)) out.push(rel);
  }
  return out;
};

const FIRST_PARTY_TEXT: string[] = SCANNED_DIRS.flatMap(walk).filter((f) => f !== SELF);

const DOC_PAGES: string[] = walk('content/docs').filter((f) => f.endsWith('.mdx'));

const read = (file: string): string => readFileSync(join(REPO_ROOT, file), 'utf8');

/** App words that open a navigation path, mapped to the app they name. */
const APP_WORDS: Record<string, 'setup' | 'studio'> = {
  Setup: 'setup',
  设置: 'setup',
  設定: 'setup',
  Studio: 'studio',
};

/** `**App → First → …**` — bold is how this repo's docs mark a real UI path. */
const CITATION = new RegExp(
  `\\*\\*(${Object.keys(APP_WORDS).join('|')})\\s*(?:→|›)\\s*([^*\\n]+)\\*\\*`,
  'g',
);

/** Every bold navigation-path citation in the docs, reduced to its first segment. */
function navigationCitations(): { file: string; app: 'setup' | 'studio'; name: string }[] {
  const out: { file: string; app: 'setup' | 'studio'; name: string }[] = [];
  for (const file of DOC_PAGES) {
    for (const match of read(file).matchAll(CITATION)) {
      const name = match[2]
        .split(/→|›/)[0]
        .replace(/[`*]/g, '')
        .trim();
      if (name) out.push({ file, app: APP_WORDS[match[1]], name });
    }
  }
  return out;
}

/** Longest-first, so `My Work` cannot be shadowed by a shorter alternative. */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * `**Group → Child**` — a path into this app's own sidebar, written without an
 * app word because the reader is already in the app the page describes.
 *
 * The group alternation is GENERATED from the shipped labels, so unlike
 * {@link CITATION} this matcher cannot see a group that does not exist. That
 * is deliberate: it means a wrong group name is invisible here — and invisible
 * is correct, because `**Stripe Sync → Re-link**` was never a claim about this
 * app's sidebar. Rule 1 is what holds a name that exists nowhere.
 */
const CRM_CITATION = new RegExp(
  `\\*\\*(${[...CRM_GROUP_LABELS]
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|')})\\s*(?:→|›)\\s*([^*\\n]+)\\*\\*`,
  'g',
);

/** Every bold `**Group → Child**` citation into this app's navigation. */
function crmCitations(): { file: string; group: string; child: string }[] {
  const out: { file: string; group: string; child: string }[] = [];
  for (const file of DOC_PAGES) {
    for (const match of read(file).matchAll(CRM_CITATION)) {
      const child = match[2]
        .split(/→|›/)[0]
        .replace(/[`*]/g, '')
        .trim();
      if (child) out.push({ file, group: match[1], child });
    }
  }
  return out;
}

describe('docs cite navigation names the platform actually ships (#853)', () => {
  describe('the roster this file judges against is real', () => {
    // Without this, every assertion below passes vacuously the day the package
    // moves its exports — a guard that reports 0 findings whether or not the
    // defect exists, which is the failure mode #1091 was filed for.
    it('resolves a substantial navigation roster for both apps', () => {
      expect(NAV_LABELS.setup.size).toBeGreaterThan(40);
      expect(NAV_LABELS.studio.size).toBeGreaterThan(20);
    });

    it('resolves anchors known to ship, in English and zh-CN', () => {
      for (const [app, label] of [
        ['setup', 'Users'],
        ['setup', '用户'],
        ['studio', 'Flows'],
        ['studio', 'Flow Runs'],
        ['studio', '流程运行记录'],
      ] as const) {
        expect(shipsNavLabel(app, label), `${app} should ship '${label}'`).toBe(true);
      }
    });

    it('covers every locale the platform ships', () => {
      expect(SHIPPED_LOCALES).toEqual(expect.arrayContaining(['en', 'zh-CN']));
      // The docs ship a zh-Hant locale the platform does not. Recording it here
      // is why every Hant nav string in KNOWN_UNRESOLVED is unresolvable by
      // construction rather than by drift.
      expect(SHIPPED_LOCALES).not.toContain('zh-Hant');
    });
  });

  describe('retired page names', () => {
    it.each(RETIRED_UI_NAMES)('$wrong is judged against the live roster', (entry) => {
      for (const wrong of entry.wrong) {
        if (NOT_BANNED.has(wrong)) continue;
        expect(
          shipsAnywhere(wrong),
          `'${wrong}' now resolves to a real navigation label. The platform started ` +
            'shipping it — retire this entry from RETIRED_UI_NAMES instead of ' +
            'keeping a ban on a name that has become correct.',
        ).toBe(false);
      }
    });

    it.each(RETIRED_UI_NAMES.filter((e) => e.replacement !== null))(
      '$wrong has a replacement that still resolves',
      (entry) => {
        const { app, path, locale } = entry.replacement!;
        expect(
          resolvesPath(app, locale, path),
          `the replacement path ${app} > ${path[0]} > ${path[1]} (${locale}) no longer ` +
            'resolves. The docs now send readers somewhere that does not exist — ' +
            'update the pages and this entry together.',
        ).toBe(true);
      },
    );

    it('appear nowhere in first-party text, in any locale or casing', () => {
      const banned = RETIRED_UI_NAMES.flatMap((e) => e.wrong).filter((w) => !NOT_BANNED.has(w));
      const hits: string[] = [];
      for (const file of FIRST_PARTY_TEXT) {
        const lines = read(file).split('\n');
        lines.forEach((line, i) => {
          for (const wrong of banned) {
            if (line.toLowerCase().includes(wrong.toLowerCase())) {
              hits.push(`${file}:${i + 1}: '${wrong}' — ${line.trim().slice(0, 120)}`);
            }
          }
        });
      }
      expect(
        hits,
        `retired UI page names are back:\n  ${hits.join('\n  ')}\n` +
          'These name no page the platform ships (#853). Use the real path — ' +
          'Studio > Developer > Flow Runs for automation runs, Studio > Automation > ' +
          'Flows for the flow roster.',
      ).toEqual([]);
    });
  });

  describe('bold navigation paths in content/docs', () => {
    it('parses citations at all', () => {
      // Same vacuity guard as the roster: an extraction that silently stops
      // matching would turn the next assertion permanently green.
      const found = navigationCitations();
      expect(found.length).toBeGreaterThan(80);
      expect(found.some((c) => c.app === 'studio' && c.name === 'Developer')).toBe(true);
    });

    it('name a navigation entry the platform ships', () => {
      const bad = navigationCitations()
        .filter((c) => !shipsNavLabel(c.app, c.name) && !KNOWN_UNRESOLVED.has(ledgerKey(c.app, c.name)))
        .map((c) => `${c.file}: '${c.app === 'setup' ? 'Setup' : 'Studio'} → ${c.name}' `);
      expect(
        [...new Set(bad)],
        `docs send readers to navigation entries that do not exist:\n  ${[...new Set(bad)].join('\n  ')}\n` +
          'Resolve the name against what the platform ships (Setup and Studio both ' +
          'export their navigation from @objectstack/platform-objects). If the page ' +
          'genuinely does not exist, say what the reader should click instead — do ' +
          'not add it to KNOWN_UNRESOLVED to get this green.',
      ).toEqual([]);
    });
  });

  describe("bold navigation paths into this app's own sidebar (#1117)", () => {
    it('resolves a substantial roster from src/apps + src/translations', () => {
      // Same vacuity guard as the platform roster: if the app module or the
      // locale bundles move, every assertion below would pass on an empty set.
      expect(CRM_LOCALES).toEqual(expect.arrayContaining(['en', 'zh-CN', 'ja-JP', 'es-ES']));
      expect(CRM_GROUP_LABELS.size).toBeGreaterThan(15);
      expect(CRM_PAIRS.size).toBeGreaterThan(60);
      for (const label of ['Sales', 'My Work', 'Service', '销售', '我的工作']) {
        expect(CRM_GROUP_LABELS.has(label), `this app should ship the group '${label}'`).toBe(true);
      }
      expect(CRM_PAIRS.has(crmPairKey('Service', 'Knowledge'))).toBe(true);
      expect(CRM_PAIRS.has(crmPairKey('销售', '线索'))).toBe(true);
    });

    it('parses citations at all', () => {
      const found = crmCitations();
      expect(found.length).toBeGreaterThan(20);
      expect(found.some((c) => c.group === 'Service' && c.child === 'Knowledge')).toBe(true);
    });

    it('name a group and a child this app really ships, in one locale', () => {
      const bad = crmCitations()
        .filter(
          (c) =>
            !CRM_PAIRS.has(crmPairKey(c.group, c.child)) &&
            !KNOWN_UNRESOLVED_CRM.has(crmPairKey(c.group, c.child)),
        )
        .map((c) => `${c.file}: '${c.group} → ${c.child}'`);
      expect(
        [...new Set(bad)],
        `docs cite sidebar paths this app does not ship:\n  ${[...new Set(bad)].join('\n  ')}\n` +
          'Resolve the pair against src/apps/crm.app.ts and the locale bundles in ' +
          'src/translations — the child must be a child of that group, in the same ' +
          'locale. Do not add it to KNOWN_UNRESOLVED_CRM to get this green.',
      ).toEqual([]);
    });

    it('holds no quarantined pair this app has started shipping', () => {
      const fixed = [...KNOWN_UNRESOLVED_CRM].filter((key) => CRM_PAIRS.has(key));
      expect(
        fixed,
        `KNOWN_UNRESOLVED_CRM pairs this app now ships: ${fixed.join(', ')}. ` +
          'Delete these lines — they are no longer exceptions.',
      ).toEqual([]);
    });

    it('holds no quarantined pair the docs no longer cite', () => {
      const cited = new Set(crmCitations().map((c) => crmPairKey(c.group, c.child)));
      const dead = [...KNOWN_UNRESOLVED_CRM].filter((key) => !cited.has(key));
      expect(
        dead,
        `KNOWN_UNRESOLVED_CRM entries no longer cited by any page: ${dead.join(', ')}. ` +
          'Someone fixed the prose — delete these lines so the ledger keeps ' +
          'measuring the real remainder.',
      ).toEqual([]);
    });
  });

  describe('the quarantine ledger stays honest', () => {
    it('holds no name the platform has started shipping', () => {
      const fixed = [...KNOWN_UNRESOLVED].filter((key) => {
        const [app, ...rest] = key.split(':');
        return shipsNavLabel(app as 'setup' | 'studio', rest.join(':'));
      });
      expect(
        fixed,
        `KNOWN_UNRESOLVED names the platform now ships: ${fixed.join(', ')}. ` +
          'Delete these lines — they are no longer exceptions.',
      ).toEqual([]);
    });

    it('holds no name the docs no longer cite', () => {
      const cited = new Set(navigationCitations().map((c) => ledgerKey(c.app, c.name)));
      const dead = [...KNOWN_UNRESOLVED].filter((n) => !cited.has(n));
      expect(
        dead,
        `KNOWN_UNRESOLVED entries no longer cited by any page: ${dead.join(', ')}. ` +
          'Someone fixed the prose — delete these lines so the ledger keeps ' +
          'measuring the real remainder.',
      ).toEqual([]);
    });
  });
});
