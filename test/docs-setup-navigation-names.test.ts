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
 *     yet. Its APP half — the word in front of the arrow — is resolved live
 *     too since #1403, together with {@link KNOWN_UNRESOLVED_APP_WORDS} and
 *     {@link appWordDrift}; see "The app word" below.
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
 * pages, of which rule 2 saw 142 — Setup 86, Studio 42, 设置 14, 設定 0.
 * (Recorded here, and on #1403, as 144 / 87 / 42 / 15 / 0. Re-running the
 * extractor in this file against that same commit yields the four numbers
 * above, so the transcription was off by one in two places. They have moved
 * since regardless: 166 citations — Setup 96, Studio 51, 设置 19 — when #1403
 * landed.)
 *
 * The largest coherent thing in that remainder was **this app's own
 * navigation**. `Sales`, `My Work`, `Service` and `Activity` are not loose
 * product words — they are groups declared in `src/apps/crm.app.ts`, relabelled
 * per locale in `src/translations/*`, and rendered in the sidebar of the app
 * these docs are about. Rule 3 resolves them the same way rule 2 resolves
 * Setup's: live, from the metadata, in every shipped locale. It is also
 * **stricter** than rule 2 in one respect — rule 2 took the app word itself on
 * trust (`APP_WORDS` was hand-written), while rule 3's matcher is generated
 * from the shipped group labels, so the group half cannot drift unnoticed
 * either. It found 30 citations and 8 unresolved ones on its first run. That
 * asymmetry is what #1403 closed; the section below is rule 2's half of it.
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
 * ## The app word, resolved live (#1403)
 *
 * Rule 2 resolved every LEAF live from the day it was written and took the APP
 * word on trust: {@link APP_WORDS} was a hand-written map of four spellings, so
 * `设置 → 用户` was proved by proving the platform ships a navigation label
 * 用户, while 设置 itself was checked against nothing. The Setup app's shipped
 * zh-CN label is 系统设置. The map is now GENERATED from {@link APP_LABELS} —
 * the app shells plus every shipped locale bundle — the same way rule 3
 * generates its group alternation. Three things follow, and the third is the
 * one that makes this hard.
 *
 * **A drifted app word is quarantined, not silently dropped.** Generating the
 * alternation on its own would have made the 19 设置 citations invisible: no
 * red, no finding, and 19 leaves that used to be resolved live quietly stop
 * being resolved at all. {@link KNOWN_UNRESOLVED_APP_WORDS} holds the word
 * instead, so those citations keep being extracted and their leaves keep being
 * checked, and the ledger is checked in both directions like every other
 * ledger in this file. The hand-written map also carried 設定, which no page
 * has ever cited — the "no longer cited" direction is why the ledger cannot
 * inherit it.
 *
 * **A word that names no app at all is caught by BEHAVIOUR.** A generated
 * alternation cannot see a first segment the product does not ship, so a
 * swapped app word would simply stop matching — the failure mode that made
 * rule 2's app half invisible in the first place. {@link appWordDrift} is the
 * counterweight: it reads every bold run and reports one whose LEAF is a live
 * navigation label sitting behind a first segment that names nothing the
 * product ships. Anchoring on the leaf is what keeps it quiet on ordinary
 * prose — `**Status → Held**` and `**Queued → Sent**` are invisible to it
 * because their leaves are not navigation labels, and this file's ban on
 * widening rule 2 to every bold arrow stands unchanged.
 *
 * **⚠️ A legitimately MIXED REGISTER must stay green — this is the acceptance
 * criterion, not a footnote.** `administration/automation.zh-Hans.mdx` names
 * Studio paths in ENGLISH and the console's zh-CN group labels in the same
 * list, and both are correct: Studio is labelled `Studio` in every locale the
 * platform ships, while its groups are translated.
 * `administration/setup.zh-Hans.mdx`, `administration/sandbox-and-releases.zh-Hans.mdx`
 * and `reference/faq.zh-Hans.mdx` open some paths with 设置 and others with
 * `Setup` / `Studio`, on the same page, for the same reason. ⛔ A rule
 * demanding that both halves of a citation come from ONE locale goes red on
 * all four — it would be a guard that punishes accurate documentation. So the
 * app word is resolved against every shipped locale at once, exactly as
 * {@link shipsNavLabel} already resolves the leaf, and no rule anywhere in
 * this file compares the locale of one half against the other.
 *
 * ⛔ What this section does NOT decide: whether 设置 is acceptable prose for an
 * app whose shipped zh-CN label is 系统设置. That is a docs-register question,
 * it is not mechanical, and #1403 was ruled to quarantine those citations
 * rather than answer it in passing. If it needs an answer it gets its own card.
 *
 * Two more things worth knowing before changing this rule. It scans
 * {@link DOC_PAGES} and nothing else, so it never reads this file — the
 * {@link SELF} exemption stays a rule-1 concern, and the citations quoted in
 * the ledger's `why` strings below are out of every scan by construction.
 * And the drift check declines a first segment that CONTAINS a known app word
 * without being one, because a denial that quotes a path is prose about the
 * path rather than a citation of it — `**并不存在「设置 → 对象 → 状态 →
 * 状态机」这个配置面**` is the measured instance, and it is correct prose.
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
 *    pack**, so the console falls back to Simplified and every one of the 13
 *    described a surface that existed in no configuration. Ruled on the card:
 *    zh-Hant pages spell platform navigation in **English** rather than ship
 *    mixed Simplified/Traditional script, the convention
 *    `getting-started/quick-tour.zh-Hant.mdx` already followed and the same
 *    fact `docs-search-navigation-views.test.ts` recorded for 待我審核 (#973).
 *    Each was ALSO an instance of one of the two sub-classes above wearing a
 *    Hant costume, so each was re-judged before being rendered: *變更包* and
 *    *潛在客戶設定* were invented screens and became denials, *自動化* /
 *    *物件* / *電子郵件範本* were Studio's, and the two on
 *    `guides/email-and-calendar.zh-Hant.mdx` were surface-denials that
 *    resisted renaming for the same reason their zh-Hans twin did.
 *    ⛔ The reason is the FALLBACK, not the reader — stated in full, with
 *    the ban on the form #1368 retired, at {@link KNOWN_UNRESOLVED_CRM}.
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

/**
 * Every spelling of an APP NAME each app really shows in the app switcher,
 * across every shipped locale — the half of a `**App → Entry**` citation that
 * used to be taken on trust (#1403).
 *
 * Two sources, and the second alone is not complete: the app SHELL carries the
 * label a locale does not override, and each locale bundle overrides it under
 * that app's id. The value path is the one measured here rather than the one
 * the card guessed — `apps` is keyed by app id (`setup` / `studio` /
 * `account`) and each entry carries a `label`, so the live roster is
 * `SETUP_APP.label` plus `SetupAppTranslations[locale].apps[app].label` for
 * every shipped locale. Reading only the second would miss the fallback the
 * Console itself uses, which is the same `labelOf(id, fallback)` shape
 * {@link resolvesPath} and the CRM roster already follow.
 *
 * Measured against `@objectstack/platform-objects` 17.3.0: setup ships
 * `Setup` / `系统设置` / `セットアップ` / `Configuración`, and studio ships
 * `Studio` in all four locales. That asymmetry is exactly why a page can mix
 * registers and still be right — see "The app word" in this file's header.
 */
const APP_LABELS: Record<'setup' | 'studio', Set<string>> = (() => {
  const out = { setup: new Set<string>(), studio: new Set<string>() };
  for (const app of ['setup', 'studio'] as const) {
    const shell = (app === 'setup' ? SETUP_APP : STUDIO_APP) as AnyRec;
    if (typeof shell.label === 'string') out[app].add(shell.label);
    for (const locale of SHIPPED_LOCALES) {
      const label = (SetupAppTranslations as AnyRec)[locale]?.apps?.[app]?.label;
      if (typeof label === 'string') out[app].add(label);
    }
  }
  return out;
})();

/** Does `app` ship an app-switcher label spelled exactly `word`, in any locale? */
const shipsAppLabel = (app: 'setup' | 'studio', word: string): boolean => APP_LABELS[app].has(word);

/** Which app does the platform ship under exactly this label, if any? */
const appNamedBy = (word: string): 'setup' | 'studio' | undefined =>
  shipsAppLabel('setup', word) ? 'setup' : shipsAppLabel('studio', word) ? 'studio' : undefined;

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
 * **Empty since #1368's worklist was executed** — see the set below.
 *
 * ADDING ONE IS A ONE-LINE CHANGE — and the same warning as
 * {@link KNOWN_UNRESOLVED} applies: do not reach for it to silence a path you
 * just wrote. The five entries that stood here were drift that pre-dated
 * rule 3 and were found by its first run, not by anyone writing a new page,
 * and there is no longer any backlog for a new entry to hide in.
 */
const KNOWN_UNRESOLVED_CRM = new Set<string>([
  // EMPTY, and deliberately kept. The five zh-Hant pairs that stood here were
  // this block's declared worklist for #1368, and #1368 was DECIDED on
  // 2026-08-31: a zh-Hant page names navigation in ENGLISH. The measured
  // reason is the FALLBACK, not the reader — this app ships `en` / `zh-CN` /
  // `ja-JP` / `es-ES` and NO Traditional-Chinese bundle, so the console falls
  // back to Simplified, and a Traditional page names navigation in English
  // rather than mix Simplified glyphs into Traditional prose. ⛔ It is NOT
  // that a zh-Hant reader sees an English console; that reason was measured
  // false and is retired, so do not write it back in.
  //
  // The six citation sites across four pages and these five lines landed in
  // ONE commit, because the two staleness checks below fail in opposite
  // directions and each catches exactly half a change: the prose without the
  // ledger reds `holds no quarantined pair the docs no longer cite`, and the
  // ledger without the prose reds `name a group and a child this app really
  // ships, in one locale`. Both reds were captured by ablation before the fix,
  // so the pairing is measured rather than argued.
  //
  // Keep the set — those two checks run against it in both directions, so an
  // empty ledger is an ASSERTED zero rather than an absent one, and the next
  // unresolvable pair has something to fail against instead of a deleted
  // mechanism.
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

/**
 * App words `content/docs/**` opens a bold path with that the platform ships
 * under no app label, quarantined so the citation is still parsed and its leaf
 * is still resolved live (#1403).
 *
 * ADDING ONE IS A ONE-LINE CHANGE — and the same warning as
 * {@link KNOWN_UNRESOLVED} applies: this is not a place to park an app word
 * you just wrote to get a red check green. Every entry carries the reason it
 * is not simply a mistake.
 *
 * `app` is the app the word names, and a citation opening with it has its leaf
 * resolved against that app exactly as a shipped app word's would be.
 * `app: null` is for a word that names no app at all, so there is nothing to
 * resolve a leaf against — the shape `replacement: null` already has in
 * {@link RETIRED_UI_NAMES}.
 *
 * The two staleness checks run against this ledger in opposite directions: an
 * entry the platform starts shipping retires itself loudly, and an entry no
 * page opens a path with any more must be deleted rather than left as
 * decoration. The second is why the hand-written map's 設定 could not be
 * carried over — no page has ever cited it.
 */
const KNOWN_UNRESOLVED_APP_WORDS: {
  word: string;
  app: 'setup' | 'studio' | null;
  why: string;
}[] = [
  {
    word: '设置',
    app: 'setup',
    why:
      '#1403 — 19 bold citations open with 设置 while the Setup app ships 系统设置 as ' +
      'its zh-CN label. Whether 设置 is acceptable prose for an app labelled 系统设置 ' +
      'is a docs-REGISTER question, not a mechanical one, and #1403 was ruled to do ' +
      'the mechanical half only: the word is quarantined here rather than answered ' +
      'in passing, and every one of those leaves is still resolved live against ' +
      'Setup. Rewriting the citations, or deciding they are fine, is its own card.',
  },
  {
    word: 'Settings',
    app: null,
    why:
      '#1403 — guides/email-and-calendar.mdx sketches an intended surface, ' +
      '"reusable templates saved in Settings > Email Templates", inside a section ' +
      'headed "Email templates (not shipped yet)" whose next paragraph says HotCRM ' +
      'ships none of it. There is no Settings app. The only real Email Templates ' +
      'page is Studio > Integration > Email Templates, and it is not what the ' +
      'sentence promises (per-team folders, approval gating), so pointing the sketch ' +
      'at it would make the page claim a screen that does not do those things. Found ' +
      'by the drift check below — the first rule in this file able to see it — and ' +
      'quarantined rather than reworded, because rewording is a docs call, not a ' +
      'mechanical one. Filed as #1730.',
  },
];

/** The quarantine entry for `word`, if it has one. */
const quarantinedAppWord = (word: string): (typeof KNOWN_UNRESOLVED_APP_WORDS)[number] | undefined =>
  KNOWN_UNRESOLVED_APP_WORDS.find((entry) => entry.word === word);

/**
 * App words that open a navigation path, mapped to the app they name —
 * GENERATED from {@link APP_LABELS} plus the quarantine ledger above (#1403).
 *
 * It was a hand-written map of four spellings, which is what let the app half
 * of every rule-2 citation be checked against nothing: 设置 resolved because
 * someone had typed it here, and a platform-side rename of the app itself
 * would have gone unnoticed on every one of the 166 citations at once.
 */
const APP_WORDS: Record<string, 'setup' | 'studio'> = (() => {
  const out: Record<string, 'setup' | 'studio'> = {};
  for (const app of ['setup', 'studio'] as const) {
    for (const label of APP_LABELS[app]) out[label] = app;
  }
  for (const entry of KNOWN_UNRESOLVED_APP_WORDS) {
    if (entry.app) out[entry.word] = entry.app;
  }
  return out;
})();

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * One alternation source for both generated matchers: longest first, so
 * `My Work` cannot be shadowed by a shorter alternative, and every branch
 * escaped, because a shipped label may contain regex punctuation
 * (`Delegations (OOO)` does).
 */
const alternation = (words: Iterable<string>): string =>
  [...words].sort((a, b) => b.length - a.length).map(escapeRe).join('|');

/** `**App → First → …**` — bold is how this repo's docs mark a real UI path. */
const CITATION = new RegExp(
  `\\*\\*(${alternation(Object.keys(APP_WORDS))})\\s*(?:→|›)\\s*([^*\\n]+)\\*\\*`,
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
  `\\*\\*(${alternation(CRM_GROUP_LABELS)})\\s*(?:→|›)\\s*([^*\\n]+)\\*\\*`,
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

/**
 * `**X → Y**` — every bold run in the docs, whatever X turns out to be.
 *
 * {@link CITATION} and {@link CRM_CITATION} are both generated from a shipped
 * vocabulary, which is right for what they assert and is also how a drifted
 * first segment leaves rule 2 in silence rather than in red. This sweep is
 * what {@link appWordDrift} judges instead; nothing else reads it.
 */
const BOLD_RUN = /\*\*([^*\n]+?)\s*(?:→|›)\s*([^*\n]+)\*\*/g;

function boldRuns(): { file: string; first: string; leaf: string }[] {
  const out: { file: string; first: string; leaf: string }[] = [];
  for (const file of DOC_PAGES) {
    for (const match of read(file).matchAll(BOLD_RUN)) {
      const first = match[1].replace(/[`*]/g, '').trim();
      const leaf = match[2]
        .split(/→|›/)[0]
        .replace(/[`*]/g, '')
        .trim();
      if (first && leaf) out.push({ file, first, leaf });
    }
  }
  return out;
}

/**
 * Bold runs that put a REAL navigation entry behind a word naming no app.
 *
 * This is the check that fails when an app word is swapped for one the
 * platform does not ship — the direction a generated alternation cannot cover
 * on its own, because an unknown word simply stops matching. It is anchored on
 * the LEAF, not on a vocabulary of words that look like app names, which is
 * what keeps it off ordinary prose: `**Status → Held**`, `**Queued → Sent**`
 * and `**Account → Last Activity Date**` never reach the filters below,
 * because their leaves are not navigation labels.
 *
 * Four kinds of run are then declined on purpose, each measured against
 * `content/docs/**` rather than imagined:
 *
 *  - a first segment that IS a navigation label — `**开发者 → 流程运行记录**`,
 *    `**对象 → 审计日志**` — names a group, or a record's own section, not an
 *    app. Rule 2 has never claimed those and does not start here.
 *  - a first segment that is one of this app's own group labels
 *    (`**Service → Knowledge**`) belongs to rule 3, which resolves the pair
 *    properly instead of judging the halves apart.
 *  - a first segment quoting a known app word inside more text — the denial
 *    `**并不存在「设置 → 对象 → 状态 → 状态机」这个配置面**` is prose ABOUT a
 *    path, and correct prose at that.
 *  - a quarantined word, judged by the two ledger checks instead.
 */
function appWordDrift(): { file: string; first: string; leaf: string }[] {
  const known = [...Object.keys(APP_WORDS), ...KNOWN_UNRESOLVED_APP_WORDS.map((e) => e.word)];
  return boldRuns().filter(({ first, leaf }) => {
    if (!shipsNavLabel('setup', leaf) && !shipsNavLabel('studio', leaf)) return false;
    if (appNamedBy(first) || quarantinedAppWord(first)) return false;
    if (shipsNavLabel('setup', first) || shipsNavLabel('studio', first)) return false;
    if (CRM_GROUP_LABELS.has(first)) return false;
    if (known.some((word) => first !== word && first.includes(word))) return false;
    return true;
  });
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

  describe('the app word in front of the arrow (#1403)', () => {
    it('resolves an app-switcher roster live, in every shipped locale', () => {
      // Same vacuity guard as the two rosters above: if the app shells or the
      // locale bundles move, every assertion below would judge an empty set.
      expect(APP_LABELS.setup.size).toBeGreaterThanOrEqual(SHIPPED_LOCALES.length);
      expect(APP_LABELS.studio.size).toBeGreaterThan(0);
      for (const [app, label] of [
        ['setup', 'Setup'],
        ['setup', '系统设置'],
        ['studio', 'Studio'],
      ] as const) {
        expect(shipsAppLabel(app, label), `${app} should ship the app label '${label}'`).toBe(true);
      }
      // The matcher moves with that roster rather than with a hand-written map.
      expect(APP_WORDS['系统设置']).toBe('setup');
      expect(APP_WORDS.Studio).toBe('studio');
      // Two apps sharing one spelling would make the app word ambiguous, and
      // the generated map would silently keep whichever was built last.
      const shared = [...APP_LABELS.setup].filter((label) => APP_LABELS.studio.has(label));
      expect(shared, `both apps ship the label(s) ${shared.join(', ')}`).toEqual([]);
    });

    it('reads every bold run, not only the ones a matcher recognises', () => {
      // Vacuity guard for the drift check: an extraction that silently stopped
      // matching would make it permanently, invisibly green.
      const runs = boldRuns();
      expect(runs.length).toBeGreaterThan(250);
      expect(runs.some((r) => r.first === 'Studio' && r.leaf === 'Developer')).toBe(true);
      expect(runs.some((r) => r.first === '设置' && r.leaf === '用户')).toBe(true);
    });

    it('names an app the platform ships, or is quarantined', () => {
      const bad = [...new Set(appWordDrift().map((h) => `${h.file}: '${h.first} → ${h.leaf}'`))];
      expect(
        bad,
        `docs put a real navigation entry behind a word that names no app:\n  ${bad.join('\n  ')}\n` +
          'The app half of a bold path is resolved live against what the app switcher ' +
          'shows — SETUP_APP/STUDIO_APP plus every locale bundle in ' +
          '@objectstack/platform-objects. Use the shipped spelling. If the run is not a ' +
          'navigation path at all, it is prose: say it without the arrow, or quote the ' +
          'path inside the sentence the way the denials on this repo do. Do not add it ' +
          'to KNOWN_UNRESOLVED_APP_WORDS to get this green.',
      ).toEqual([]);
    });

    it('holds no quarantined app word the platform has started shipping', () => {
      const fixed = KNOWN_UNRESOLVED_APP_WORDS.filter((e) => appNamedBy(e.word) !== undefined).map(
        (e) => e.word,
      );
      expect(
        fixed,
        `KNOWN_UNRESOLVED_APP_WORDS words the platform now ships as an app label: ` +
          `${fixed.join(', ')}. Delete these lines — the prose has become correct, and ` +
          'a quarantine on a correct spelling is worse than no quarantine at all.',
      ).toEqual([]);
    });

    it('holds no quarantined app word the docs no longer open a path with', () => {
      const opened = new Set(boldRuns().map((r) => r.first));
      const dead = KNOWN_UNRESOLVED_APP_WORDS.filter((e) => !opened.has(e.word)).map((e) => e.word);
      expect(
        dead,
        `KNOWN_UNRESOLVED_APP_WORDS words no page opens a bold path with: ${dead.join(', ')}. ` +
          'Someone fixed the prose — delete these lines so the ledger keeps measuring the ' +
          'real remainder. (This is the check the hand-written map could not have passed: ' +
          'it carried 設定, which no page has ever cited.)',
      ).toEqual([]);
    });

    it('leaves a legitimately mixed register alone', () => {
      // ⛔ The load-bearing half of #1403. These four pages name one app in
      // English and another in Chinese, ON THE SAME PAGE, and every one of them
      // is right: Studio is labelled `Studio` in all four shipped locales while
      // its groups are translated, and the Setup paths carry zh-CN leaf labels.
      //
      // Measured, because "a naive rule would go red on correct prose" is worth
      // a number rather than a warning. Two naive rules, both tempting:
      // requiring a page in Chinese to open its paths with a Chinese app word
      // reds on 91 citations across 22 Chinese pages — every `Studio → …` on
      // this list among them, since Studio has no Chinese spelling to switch
      // to. Requiring the two halves of one citation to come from a single
      // locale reds on 19, which is the 设置 set quarantined above and nothing
      // else. So the register mixes ACROSS citations on a page, not inside one,
      // and no rule in this file may compare the locale of one half, or of one
      // page, against another.
      const MIXED = [
        'content/docs/administration/automation.zh-Hans.mdx',
        'content/docs/administration/setup.zh-Hans.mdx',
        'content/docs/administration/sandbox-and-releases.zh-Hans.mdx',
        'content/docs/reference/faq.zh-Hans.mdx',
      ];
      const runs = boldRuns();
      const drift = appWordDrift();
      const unresolved = navigationCitations().filter(
        (c) => !shipsNavLabel(c.app, c.name) && !KNOWN_UNRESOLVED.has(ledgerKey(c.app, c.name)),
      );
      for (const page of MIXED) {
        expect(DOC_PAGES, `${page} should still be a docs page`).toContain(page);
        // The mixing has to still be there, or this test passes on prose that
        // has since been made uniform and proves nothing.
        const opens = new Set(runs.filter((r) => r.file === page).map((r) => r.first));
        expect(
          [...opens].some((word) => /[A-Za-z]/.test(word)),
          `${page} should still open a bold path with a Latin-script word`,
        ).toBe(true);
        expect(
          [...opens].some((word) => /[\u4e00-\u9fff]/.test(word)),
          `${page} should still open a bold path with a Chinese word`,
        ).toBe(true);
        expect(drift.filter((h) => h.file === page)).toEqual([]);
        expect(unresolved.filter((c) => c.file === page)).toEqual([]);
      }
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
