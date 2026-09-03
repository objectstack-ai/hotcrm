// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';
import { zhCN } from '../src/translations/zh-CN';

type AnyRec = Record<string, any>;

/*
 * ─── A docs list-view roster names the views the app actually ships (#1194) ──
 *
 * `content/docs/revenue/products.mdx` carried a *Standard list views* section
 * naming three views — **Active Products**, **By Category**, **By Family** —
 * and `src/views/product.view.ts` declares neither those nor anything like
 * them: the real inventory is *All Products* (a grid grouped by category) and
 * *Product Catalog* (a gallery). All three locale faces said it, row for row.
 * The two grouping entries look like a misreading of one real setting —
 * `all_products` sets `grouping: { fields: [{ field: 'category' }] }`, which is
 * one grid grouped by category, not two saved views.
 *
 * That is the section a manager reads to learn what queues exist, so naming
 * three that cannot be found in the UI is a product defect. Nothing was
 * checking it. The #729 count rule (`test/docs-metadata-counts.test.ts`) counts
 * objects, flows, dashboards, datasets, actions and positions, and views are not
 * among them; the STATUS.md transcript rule
 * (`test/docs-declared-versions.test.ts`) counts registered view FILES (one per
 * object), not the individual saved views a page like this describes. This file
 * is that missing rule, and it lives here rather than beside them because a
 * dedicated `test/docs-*.test.ts` per family is this repo's standing shape. When
 * it was written the reason was arithmetic too — `docs-drift.test.ts` was 97KB
 * against this repo's 100KB source-file cap, and adding it there failed `pnpm
 * hygiene`, measured — which is the condition #1196 resolved by splitting that
 * file into the two files named above and five more.
 *
 * ## The rule is COVERAGE, not "no phantom names" — and that was measured
 *
 * The obvious rule is the other one: every bolded name in the section must
 * resolve to a shipped view. It was written and measured first, and it is not
 * viable. Across the ten English pages carrying this section it produces
 * thirteen false positives on five pages, because the section legitimately
 * bolds things that are not views:
 *
 *   - column and filter names inside the same table (`**Health Score**`,
 *     `**Annual Revenue of $10M or more**`);
 *   - whole sentences (`**Status is the filter you already have.**`);
 *   - what read as a fourth class — TAB labels in the first column where the
 *     view name is in a later one, `sales/activities` "written that way
 *     throughout" — was never a legitimate shape, and this list no longer asks
 *     anyone to step over it (#1350). It was the #1318 defect on the one page
 *     cited as carrying it: those first-column names were invented, #1322 took
 *     the column off fifteen pages across three faces, and the name-column rule
 *     below rejects the shape outright (#1347). The entry stays because the
 *     thirteen were counted with it in — so that figure includes cases the
 *     widest rule was RIGHT about, and the case against that rule rests on the
 *     three classes above, each of which is still on the pages today;
 *   - and, worst, the pages that are RIGHT: `service/cases` closes with
 *     "Six names this section used to list are not views at all" and then names
 *     them, so the corrected page fails hardest.
 *
 * Excusing thirteen cases needs an exemption map bigger than the roster it
 * guards — the hand-maintained list #729's header argues against. So the rule
 * runs the other direction: every view the stack SHIPS for the object a page
 * documents must be named somewhere in that page's roster section. It caught
 * this card's defect (products named neither real view), and it is derived from
 * `src/views/**` rather than written down here, so it moves when a view does.
 *
 * Stated limitation, since a guard that oversells itself is worse than none: a
 * roster that names every real view AND one invented one passes. What cannot
 * happen any more is a roster written from imagination instead of from source,
 * which is what all four instances of this defect have been.
 *
 * ## The NAME COLUMN is checkable, and the thirteen do not transfer (#1326)
 *
 * The rejection above is of the phantom rule at its WIDEST — every bolded run
 * anywhere in the section — and at that width it stands. Narrowed to the **name
 * column** of the roster table, the same rule costs nothing: measured across the
 * ten English pages it reads 55 name cells and raises ZERO false positives.
 * Every one of the thirteen lives outside that column:
 *
 *   - column and filter names (`**Health Score**`, `**Annual Revenue of $10M or
 *     more**`) sit in the *What it shows* column, never in the first one;
 *   - the whole-sentence bolds (`**Status is the filter you already have.**`)
 *     are bullets beneath the table, not rows in it;
 *   - `service/cases` names its six retired non-views in a bullet list below
 *     the table, so the page that was RIGHT is the page this rule never reads;
 *   - and the TAB-label shape is the exception that was not one. It did sit in
 *     the first column, but it was the #1318 defect rather than a legitimate
 *     bold — which is what the list above now records (#1350) and what the rule
 *     below now enforces.
 *
 * That last line is why the narrow rule is worth having. `list.tabs[].name` was
 * never read: the object-view switcher labels each tab with the target view's
 * own `label`, so #1304 dropped those entries' labels, #1316 deleted the key
 * outright, and #1322 took the invented Tab column off fifteen pages across
 * three faces. A tab has no second, shorter name, so a roster's first column
 * has nothing to carry but view names — and holding it to that costs no page
 * anything, which is the measurement above.
 *
 * ## What this adds that coverage cannot (#1326)
 *
 * The limitation stated above — "a roster that names every real view AND one
 * invented one passes" — is not a theoretical corner. It was measured: the
 * #1318 dev restored `sales/activities.mdx` to its pre-fix bytes on top of the
 * fix, reinstating the false prose claim and all eight fictional tab names, and
 * this file ran **4/4 green**. Coverage only ever asks whether each shipped
 * label appears SOMEWHERE in the section, so a first column written entirely
 * from imagination passes as long as a later column is right.
 *
 * Two rules, two directions, and neither subsumes the other: coverage says no
 * shipped view may go unnamed, and this one says the name column may name
 * nothing else. Both are needed — this rule alone would pass a roster that
 * dropped a view, and coverage alone passed the whole of #1318.
 *
 * ### `getting-started/quick-tour` does not collide with this (#1326)
 *
 * `docs-quick-tour-navigation.test.ts` reserves **bold** on that page for names
 * the app really carries, and it failed 3/3 the first time #1324 tried to bold
 * a view label there — so a rule REQUIRING bold in a name column reads like a
 * head-on conflict. Measured, it is not one: quick-tour carries no
 * `## Standard list views` heading at all (its sections are the seven numbered
 * tour steps), so `rosterOf` returns null for it, vacuity guard #1 does not
 * demand it be mapped, and it never enters PAGE_OBJECT. The two rules never see
 * each other's page. No exemption is needed, and adding one would be a lie
 * about a conflict that does not exist.
 *
 * ### Reverse verification (#1326)
 *
 * Predicted **red on the pre-#1322 bytes and green on `main`**, and measured as
 * such — green-on-main alone is what coverage already achieved while the defect
 * was present, so it proves nothing on its own. Writing
 * `git show 794d6fe~1:content/docs/sales/activities.mdx` to disk (blob
 * `3fc1568` against HEAD's `0f7117e`, hashed before the verdict was read) fails
 * this rule with eight name-column entries — *All*, *Board*, *Schedule*,
 * *Plan*, *Worklog*, *My Tasks*, *Priority*, *Backlog* — none of which
 * `crm_task` ships, while the coverage rule beside it stays green. Restored
 * with `git checkout HEAD -- <path>` and proved by an empty `git diff HEAD`,
 * the count is 0 across 55 cells.
 *
 * ## The translated faces resolve names too, by two DIFFERENT routes (#1551)
 *
 * They did not until now, and the reason was real: the faces spell view labels
 * in Chinese, and while two spellings were lawful on those pages — the `zh-CN`
 * pack wording on some, the English label on others — there was no single
 * string a name column could be checked against. So the faces were held to
 * STRUCTURE only, the same honest split #736 made for callouts: same section,
 * same number of roster entries. That is what the defect looked like anyway —
 * one roster, wrong, replicated three times — and the count rule below still
 * carries it.
 *
 * #1329's ruling (2026-08-31) ended the split, PR #1548 executed it, and item 3
 * of that ruling declares this guard's extension unlocked. Each face now
 * resolves names. But the two translated faces are NOT symmetric, and building
 * them the same way would be a lie about one of them:
 *
 *   - **zh-Hans has a producer.** `src/translations/zh-CN.ts` carries a `_views`
 *     entry for every view a documented object ships (55/55, measured), and the
 *     console resolves a view's `label` through it — which is what makes the
 *     pack wording the string a reader can actually search the UI with, and the
 *     whole argument of PR #1548. So the zh-Hans allowed set is DERIVED live
 *     from the pack, keyed by the view key `src/views/**` registers, exactly as
 *     the English rule is derived from the shipped `label`. Rename a view in
 *     the pack and this goes red. That property is the point of the English
 *     rule and it holds here unchanged.
 *   - **zh-Hant has NO producer.** `i18n.supportedLocales` is en / zh-CN /
 *     ja-JP / es-ES. This app ships no Traditional pack, nothing anywhere
 *     generates those strings, and nothing but this rule would ever read them.
 *     `ZH_HANT_VIEW_NAMES` below is therefore a PINNED, HAND-MAINTAINED roster,
 *     and its own header says so in as many words — a reader who assumes a pack
 *     exists goes looking for a file that is not there, and a rename in
 *     `zh-CN.ts` will never move the pinned strings for them.
 *
 * ### ⛔ The zh-Hant side is not derivable, and that is measured
 *
 * Converting the zh-CN label glyph by glyph gets the wrong answer, because the
 * convention this corpus follows substitutes WORDS. #1329's dev measured two
 * cases; a third turned up writing this rule. Counts are `grep -ro <term>
 * content/docs | wc -l` on the tree this landed against:
 *
 *   - `合同` → **合約** (308), never the glyph-preserving 合同;
 *   - `营销` → **行銷** (230), where the strict-glyph 營銷 appears **0** times;
 *   - `联系人` → **聯絡人** (270), where the strict-glyph 聯繫人 appears **0**
 *     times — a whole word swapped, not a script conversion.
 *
 * A derived zh-Hant rule would be wrong on all three, on four pages. The
 * hand-written table is the honest shape, and the cost of it is stated where it
 * is declared rather than discovered later.
 *
 * ### `revenue/approvals` is outside this rule, structurally (#1551)
 *
 * That page names five list views owned by the approval PLUGIN's
 * `sys_approval_request`, and this app's pack has no entry for any of them. It
 * is not excluded by a list here and needs no quarantine entry: the page heads
 * those tables *Where to find pending approvals* / *the object's own list
 * views*, carries no roster heading at all, so `rosterOf` returns null for it
 * on all three faces and it never enters PAGE_OBJECT or any rule in this file.
 * Whether those names should be checked, and against what, is open on **#1552**
 * — this guard neither answers that nor forecloses any answer to it.
 *
 * ### Reverse verification (#1551)
 *
 * Green on the tree these rules landed against — 55 name cells read per
 * translated face, 0 unresolved on each — and green alone proves nothing about
 * a new guard, so each rule was ablated. Every mutation was verified on disk by
 * its blob hash and by anchored counts on both the removed and the injected
 * text, and every restore by `git checkout HEAD -- <abs path>` with an empty
 * `git diff HEAD` and the blob hash back at its HEAD value:
 *
 *   - **a Traditional name on a Simplified face.** `service/cases.zh-Hans`
 *     全部工单 → 全部工單 fails the zh-Hans rule with *`content/docs/service/
 *     cases.zh-Hans.mdx names "全部工單", which is not the zh-CN spelling of any
 *     view crm_case ships`*, and nothing else — 1 failed, 8 passed.
 *   - **the glyph-derived name a derivation would have produced.**
 *     `revenue/contracts.zh-Hant` 合約條款 → 合同條款 fails the zh-Hant rule
 *     with *`… names "合同條款", which is in no pinned Traditional roster for
 *     crm_contract`*. That is the exact mistake the ⛔ above forbids, caught.
 *   - **a rename in the producer, which is the property the derived side
 *     exists for.** `zh-CN.ts` `all_products` 全部产品 → 全部产品清单 turns the
 *     zh-Hans rule red on `revenue/products.zh-Hans` — the page did not move,
 *     the pack did, and the rule followed it.
 *   - **a pack entry going missing.** Renaming the `crm_case._views.all_cases`
 *     KEY fails the producer rule first, with *`crm_case._views.all_cases is
 *     missing — "All Cases" is named on content/docs/service/cases.mdx`*,
 *     which points at the pack rather than at the page.
 *   - **a view renamed in `src/views/**`.** `product_catalog` →
 *     `catalog_gallery` turns four rules red at once, the pin audit among them:
 *     *`crm_product.catalog_gallery ("Product Catalog", named on content/docs/
 *     revenue/products.mdx) has no pinned name`*. A view cannot arrive without
 *     someone writing its Traditional name.
 *   - **the pin rotting the other way.** A `phantom_view` entry added to
 *     `ZH_HANT_VIEW_NAMES` fails with *`crm_product.phantom_view is pinned as
 *     "幻影檢視", which the app does not ship`*.
 *   - **vacuity, on a translated face.** Renaming the `## 標準列表檢視` heading
 *     on `revenue/products.zh-Hant` fails with *`zh-Hant: roster sections this
 *     rule read no name column out of: content/docs/revenue/
 *     products.zh-Hant.mdx`* rather than passing over an empty set.
 *
 * ## The translated faces get COVERAGE too, and it is a THIRD direction (#1557)
 *
 * #1551 gave those faces name exactness — the name column may name nothing but
 * a view the face's own source spells — and left the third rule below holding
 * them to the English page's row COUNT. Three rules, and one shape walks
 * between them: a `.zh-Hans.mdx` or `.zh-Hant.mdx` roster that keeps the row
 * count, names only lawful names, but names one view TWICE and omits another.
 * Every name is lawful, the count never moves, and the omission is invisible
 * because nothing on those faces ever asked whether a shipped view is named.
 *
 * Measured before the rules below were written, on the tree #1556 landed:
 * `revenue/products.zh-Hans` with both of its rows renamed to **全部产品**
 * (dropping **产品目录**, 2 rows in and 2 rows out) ran **9 passed** — green
 * over the defect, on the file whose whole purpose is that defect's class.
 *
 * ### ⛔ The English coverage rule's SHAPE does not transfer, and that is why
 *
 * The obvious move is to point the English rule at the translated faces. It
 * does not work, for a reason worth writing down rather than rediscovering:
 * that rule asks `body.includes(label)` — does the name appear ANYWHERE in the
 * section — which is a pure existence question over prose as well as table, so
 * it is blind to multiplicity by construction and cannot see a duplicate at
 * all. It is also blind to the OMISSION whenever the section's prose happens to
 * mention the dropped name, and that is not a corner: measured, **9 of the 55
 * names on each of the three faces** are echoed in the section body outside
 * their own table row.
 *
 * Measured on one of those nine: `service/cases.zh-Hans` with its
 * **已升级工单** row renamed to **全部工单** — the same duplicate-and-drop, on
 * a page whose bullets below the table still say 已升级工单 — leaves a
 * body-shaped coverage rule GREEN (measured, 1 passed) as well as the suite
 * (9 passed). So the rules below read the NAME COLUMN, via the same
 * `nameColumns` parse the name rules use, and not the body.
 *
 * ### Why coverage, and not set equality
 *
 * Asserting the name column's SET equals the source set closes this in one
 * line, and it was rejected: it implies name exactness, which would make
 * #1551's two rules dead weight, and this file is deliberate that each rule
 * earns its place. Coverage is the missing DIRECTION and only that — every
 * name the face's own source produces must appear in that face's name column —
 * so each face now carries the same complementary pair the English face has
 * carried since #1326: coverage says no shipped view may go unnamed, exactness
 * says the column may name nothing else, and neither implies the other.
 *
 * The row-count rule below is not made redundant either, and the division is
 * exact: coverage and exactness together pin the SET of names on a face, and
 * say nothing about multiplicity. A face growing a third row that repeats a
 * lawful name passes both and fails only the count rule. It is the other way
 * round for this card's shape — with the count pinned, a duplicate forces an
 * omission, and the omission is what coverage sees.
 *
 * Neither new rule carries a source-side floor of its own, deliberately: the
 * `zh-CN` producer rule already fails when fewer than 40 pack spellings
 * resolve and the pin audit already fails when the pinned table falls below
 * the same floor, exactly as vacuity guard #2 carries that floor for the
 * English coverage rule. The page-side floor each new rule DOES need is
 * `expectNameColumnIsReadable`, called first thing in both.
 *
 * `revenue/approvals` stays outside these rules for the structural reason
 * recorded above, inherited rather than restated: they read `nameColumns`,
 * which walks PAGE_OBJECT and `rosterOf`, and that page carries no roster
 * heading on any of its three faces (measured again here — `rosterOf` is null
 * for all three). No exemption list grew, and **#1552** is left as open as it
 * was.
 *
 * ### Reverse verification (#1557)
 *
 * Each new rule ablated, every mutation confirmed on disk by its blob hash and
 * by anchored counts on the removed AND injected text, every restore proved by
 * state — blob hash back at its HEAD value and an empty `git diff HEAD`:
 *
 *   - **the card's own shape, on zh-Hans.** `revenue/products.zh-Hans`
 *     **产品目录** → **全部产品** fails with *`content/docs/revenue/
 *     products.zh-Hans.mdx never names "产品目录", the zh-CN spelling of a view
 *     crm_product ships`* — 1 failed, 9 passed, where before it was 9 passed.
 *   - **the same shape where the prose still names the dropped view.**
 *     `service/cases.zh-Hans` **已升级工单** → **全部工单** fails the same rule
 *     naming 已升级工单, which is the case a body-shaped rule stayed green on.
 *   - **the card's shape on zh-Hant.** `revenue/contracts.zh-Hant`
 *     **合約時間線** → **全部合約** fails with *`… never names "合約時間線",
 *     the pinned Traditional name of a view crm_contract ships`*.
 *   - **vacuity, on each face.** Renaming the roster heading on one page fails
 *     `expectNameColumnIsReadable` inside the new rule — *`zh-Hans: roster
 *     sections this rule read no name column out of: …`* — rather than letting
 *     coverage pass over an empty cell list, which is the failure mode a
 *     coverage rule is most exposed to.
 *
 * ## The ENGLISH face gets a name-column coverage rule too (#1562)
 *
 * #1557 closed this shape on the two translated faces and left the English
 * face on the rule it has carried since #1194 — which is the ORIGINAL of the
 * shape that section rejects, and it carries the same hole. Measured on the
 * tree PR #1561 landed, before the rule below was written:
 * `service/cases.mdx`'s **Escalated Cases** row renamed to **All Cases**
 * leaves the name column naming *All Cases* twice and never naming *Escalated
 * Cases*, row count unchanged — and this file ran **Tests 11 passed (11)**.
 * Body coverage passed because the bullets below the table still say
 * **Escalated Cases**; name exactness passed because *All Cases* is a lawful
 * label; the count rule passed because no row moved. Blob `2e2ac02` →
 * `aec1304`, `**Escalated Cases**` 3 → 2 and `**All Cases**` 1 → 2, restored
 * to an empty `git diff HEAD` with the blob back at `2e2ac02`.
 *
 * The exposure is the same one measured on the translated faces, re-derived
 * here on English: **9 of the 55** name cells echo their view name in the
 * section body outside their own table row — *All Accounts*, *All Contacts*,
 * *Open Deals*, *Closing This Quarter*, *All Tasks*, *All Quotes*, *Service
 * Workflow*, *Escalated Cases*, *All Contracts*. Those nine rows are the ones
 * a body-shaped coverage rule cannot protect.
 *
 * ### Which rule keeps which job — the reverse of what was expected
 *
 * The card that filed this read the body rule as the WIDER net: the one that
 * still catches a view named nowhere on the page at all, prose included, where
 * a name-column rule only reads the table. That reading is **false**, and this
 * file does not keep a claim it has measured to be wrong.
 *
 * Name-column coverage STRICTLY IMPLIES body coverage. `boldName` returns a
 * substring of the name cell, the name cell is a substring of its table row,
 * and the row is part of the section body — so a label the name column names
 * is a label `body.includes` finds, always. Contrapositive: every label the
 * body rule reports missing is one the name-column rule reports missing too.
 * There is no page and no label on which the body rule fires alone.
 *
 * Measured in both directions rather than argued only:
 *
 *   - **the shape only the name column sees.** `service/cases.mdx`
 *     **Escalated Cases** → **All Cases**, prose below the table still naming
 *     it: body coverage GREEN, the rule below RED.
 *   - **the shape the body rule was supposed to own.** `revenue/products.mdx`
 *     **Product Catalog** → **All Products**, where *Product Catalog* occurs
 *     exactly once in the section — its own row — so the name is then absent
 *     from the body entirely: BOTH rules red. The body rule caught nothing
 *     there that the name-column rule did not.
 *
 * ⇒ the **name-column rule is the DETECTOR**, and the one that would be kept
 * if only one could be. The **body rule is kept as a DIAGNOSTIC**, and is
 * labelled as one where it stands rather than dressed up as coverage it does
 * not provide: when both fire, the view is named NOWHERE in the section and
 * the page needs writing; when only the name-column rule fires, the view is
 * named in the prose but has no ROW, and the table needs a line. Folding them
 * into one message loses the split, which is the first thing a reader fixing
 * the page needs to know. ⛔ Do not restate the body rule as the wider net: it
 * is measurably the narrower one, and a guard that oversells itself is worse
 * than none — this file's own opening position.
 *
 * ### `entryCount` is NOT a third instance of this, and that was checked
 *
 * The count rule at the bottom also binds `const body = rosterOf(translated)`,
 * which reads like a third body-shaped rule. It is not one. That binding is
 * consumed ONLY by `entryCount` → `tableBodyRows`, which keeps the lines
 * matching `/^\|/` less the header and delimiter — a structural row count,
 * never a substring search. The one `body.includes(label)` in this file is the
 * body coverage rule. Measured rather than read: a prose bullet naming a
 * lawful view name (**全部工单**) injected into `service/cases.zh-Hans.mdx`'s
 * roster section leaves all 11 rules green — blob `3799917` → `c0397b4`, the
 * injected anchor 0 → 1 while the removed anchor stayed 3 → 3, which is why
 * the hash and the INJECTED count are what an insertion is read by. Prose
 * cannot move that rule's verdict in either direction.
 *
 * ### Reverse verification (#1562)
 *
 * Every mutation confirmed on disk by its blob hash and by anchored counts on
 * the removed AND injected text, every restore proved by state — blob hash
 * back at its HEAD value and an empty `git diff HEAD`:
 *
 *   - **the card's own shape.** `service/cases.mdx` **Escalated Cases** →
 *     **All Cases** fails the rule below with *`content/docs/service/cases.mdx
 *     never names "Escalated Cases" in its name column, which crm_case
 *     ships`* — 1 failed, 11 passed, where the same tree ran 11 passed before
 *     the rule existed.
 *   - **the name absent from the section entirely.** `revenue/products.mdx`
 *     **Product Catalog** → **All Products** fails the rule below AND the body
 *     coverage rule above it — 2 failed, 10 passed — which is the measurement
 *     behind the subsumption stated above.
 *   - **vacuity, on the English face.** Renaming the `## Standard list views`
 *     heading on `revenue/products.mdx` fails `expectNameColumnIsReadable`
 *     inside the new rule — *`English: roster sections this rule read no name
 *     column out of: content/docs/revenue/products.mdx`* — rather than letting
 *     coverage pass over an empty cell list, which is the failure mode a
 *     coverage rule is most exposed to.
 *
 * ## Reverse verification
 *
 * Predicted **red before the content fix, green after**, and measured as such.
 * Before: three English pages failed coverage — `revenue/products` (missing
 * both of its views), `marketing/campaigns` (missing all four; the section
 * named six views that do not exist, the same defect one page over) and
 * `service/cases` (missing *Unassigned — triage*, on a page that says how many
 * views it is listing). After the fixes in this PR: 0. The rule is not vacuous
 * either — it resolves 54 shipped labels across ten pages, so it is comparing
 * real rosters, not empty sets against empty sets.
 */
describe('a docs list-view roster names the views the app ships (#1194)', () => {
  /** Every spelling the roster heading has settled into, across three faces. */
  const ROSTER_HEADING =
    /^## +(Standard list views|标准列表视图|標準列表檢視|標準清單檢視|標準列表視圖|標準清單視圖)/;

  /**
   * Which object each page documents.
   *
   * Hand-written because nothing links a docs page to an object — but it cannot
   * silently go stale: the vacuity test below fails when an English page grows
   * a roster section and is not listed here, so a new page joins the guard
   * rather than escaping it.
   */
  const PAGE_OBJECT: Record<string, string> = {
    'content/docs/sales/accounts.mdx': 'crm_account',
    'content/docs/sales/contacts.mdx': 'crm_contact',
    'content/docs/sales/leads.mdx': 'crm_lead',
    'content/docs/sales/opportunities.mdx': 'crm_opportunity',
    'content/docs/sales/activities.mdx': 'crm_task',
    'content/docs/sales/quotes.mdx': 'crm_quote',
    'content/docs/service/cases.mdx': 'crm_case',
    'content/docs/marketing/campaigns.mdx': 'crm_campaign',
    'content/docs/revenue/contracts.mdx': 'crm_contract',
    'content/docs/revenue/products.mdx': 'crm_product',
  };

  /**
   * Object → every saved view it ships, as `{ key, label }`, read off the
   * registered stack.
   *
   * `key` is the view's registered name, and it is here because it is the join
   * the translated rules need: `src/translations/*.ts` files key `_views` by
   * exactly that name, so a locale rule can resolve a spelling for the SAME
   * view the English rule resolves an English label for — rather than trying to
   * match one label against another across a script boundary. The record key of
   * a `listViews` entry and the descriptor's own `name` agree on every entry in
   * the repo (54/54, measured when this was written), so the two available
   * spellings of "the key" cannot disagree underneath this.
   */
  const SHIPPED: Map<string, { key: string; label: string }[]> = new Map();
  for (const view of ((stack as AnyRec).views ?? []) as AnyRec[]) {
    const object = view.list?.data?.object;
    if (typeof object !== 'string') continue;
    const entries = [
      { key: view.list?.name, label: view.list?.label },
      ...Object.entries((view.listViews ?? {}) as Record<string, AnyRec>).map(([key, v]) => ({
        key,
        label: v?.label,
      })),
    ].filter(
      (e): e is { key: string; label: string } =>
        typeof e.key === 'string' && typeof e.label === 'string' && e.label.length > 0,
    );
    SHIPPED.set(object, [...(SHIPPED.get(object) ?? []), ...entries]);
  }

  /** Object → every saved view label it ships, in English. */
  const LABELS: Map<string, string[]> = new Map(
    [...SHIPPED].map(([object, views]) => [object, views.map((v) => v.label)] as const),
  );

  /**
   * The `zh-CN` pack label for one shipped view, or undefined when the pack
   * carries no entry for it. This is the PRODUCER behind the zh-Hans rule: what
   * the console prints in a Chinese session, and therefore the only spelling a
   * zh-Hans page can print and still be searchable in the UI.
   */
  const packLabel = (object: string, key: string): string | undefined => {
    const entry = (((zhCN as AnyRec).objects?.[object]?._views ?? {}) as AnyRec)[key];
    return typeof entry?.label === 'string' && entry.label.length > 0 ? entry.label : undefined;
  };

  /** Object → the pack spelling of every view it ships. Derived, never pinned. */
  const zhCnLabels = (object: string): string[] =>
    (SHIPPED.get(object) ?? [])
      .map((v) => packLabel(object, v.key))
      .filter((l): l is string => l !== undefined);

  /**
   * ⚠️ TRADITIONAL CHINESE VIEW NAMES — PINNED BY HAND. NO PRODUCER EXISTS.
   *
   * Read this before changing a string below. Every other label set in this
   * file is DERIVED: the English one from `src/views/**`, the Simplified one
   * from `src/translations/zh-CN.ts`. This one is not, and it cannot be.
   * `i18n.supportedLocales` is en / zh-CN / ja-JP / es-ES — **this app ships no
   * Traditional pack**, no file anywhere in the repo produces these strings,
   * and outside this table they exist only as prose on the `.zh-Hant.mdx`
   * pages. There is nothing to generate them from and nothing else that reads
   * them: this table and those pages are the whole chain.
   *
   * ⛔ Do not "fix" this by converting `zh-CN` labels glyph by glyph. The
   * corpus convention substitutes words — 合同 → 合約, 营销 → 行銷,
   * 联系人 → 聯絡人 — and the strict-glyph forms of the last two appear zero
   * times in `content/docs` (see the header). A derivation is wrong on four
   * pages the day it is written.
   *
   * What this table therefore does and does not buy:
   *
   *   - it CATCHES a `.zh-Hant.mdx` roster naming something this app does not
   *     ship, which is the defect #1194 was and the one #1326 measured surviving
   *     a green run;
   *   - it CATCHES a view added to or removed from `src/views/**` without a
   *     Traditional name being decided — the pin is audited one-to-one against
   *     the shipped views below, so a new view fails here until a human writes
   *     its name;
   *   - it CANNOT notice a rename that happens only upstream. Rename a view in
   *     `zh-CN.ts` and the zh-Hans rule goes red while this one stays green,
   *     because no producer connects them. Updating the `.zh-Hant.mdx` page and
   *     this table is a hand step, in the same PR, every time.
   */
  const ZH_HANT_VIEW_NAMES: Record<string, Record<string, string>> = {
    crm_account: {
      all_accounts: '全部客戶',
      account_gallery: '客戶卡片',
      account_map: '客戶地圖',
      enterprise_accounts: '企業客戶',
      my_accounts: '我的客戶',
      at_risk_accounts: '⚠️ 風險客戶',
    },
    crm_contact: {
      all_contacts: '全部聯絡人',
      contact_directory: '聯絡人目錄',
      primary_contacts: '主要聯絡人',
    },
    crm_lead: {
      all_leads: '全部線索',
      my_leads: '我的線索',
      hot_leads: '🔥 高熱度線索',
      high_priority: '高優先級',
      suspected_duplicates: '疑似重複線索',
      kanban_by_status: '線索流水線',
      calendar_by_created: '線索日曆',
      gallery_view: '線索卡片',
    },
    crm_opportunity: {
      open_opportunities: '進行中商機',
      all_opportunities: '全部商機',
      pipeline_kanban: '銷售流水線',
      close_date_calendar: '預測日曆',
      deal_timeline: '商機時間線',
      deal_gallery: '商機卡片',
      my_open_deals: '我的進行中商機',
      stale_opportunities: '⚠️ 停滯商機 · 按階段停留時間排序',
      closing_this_quarter: '本季度待成交商機',
    },
    crm_task: {
      all_tasks: '全部任務',
      task_board: '任務看板',
      task_calendar: '任務日程',
      task_gantt: '執行計劃',
      task_timeline: '工時時間線',
      my_open_tasks: '我的待辦任務',
      todays_tasks: '📅 我的優先任務',
      overdue_tasks: '⏰ 待辦任務 · 按逾期時長排序',
    },
    crm_quote: {
      all_quotes: '全部報價單',
      quote_pipeline: '報價流水線',
      quote_calendar: '報價日曆',
    },
    crm_case: {
      all_cases: '全部工單',
      case_workflow: '服務流轉',
      sla_calendar: 'SLA 日曆',
      case_timeline: '工單時間線',
      my_open_cases: '我的待處理工單',
      unassigned_triage: '未分派 — 待分診',
      escalated_cases: '已升級工單',
      sla_at_risk: '⏰ SLA 風險預警',
    },
    crm_campaign: {
      all_campaigns: '全部行銷活動',
      campaign_gantt: '活動排期',
      campaign_calendar: '活動日曆',
      campaign_timeline: '行銷時間線',
    },
    crm_contract: {
      all_contracts: '全部合約',
      renewal_calendar: '續約日曆',
      contract_gantt: '合約條款',
      contract_timeline: '合約時間線',
    },
    crm_product: {
      all_products: '全部產品',
      product_catalog: '產品目錄',
    },
  };

  /** Object → the pinned Traditional name of every view it ships. */
  const zhHantNames = (object: string): string[] =>
    (SHIPPED.get(object) ?? [])
      .map((v) => ZH_HANT_VIEW_NAMES[object]?.[v.key])
      .filter((l): l is string => typeof l === 'string');

  /** The body of the roster section, or null when the page has none. */
  const rosterOf = (file: string): string | null => {
    const path = join(REPO_ROOT, file);
    if (!existsSync(path)) return null;
    const lines = readFileSync(path, 'utf8').split('\n');
    const start = lines.findIndex((l) => ROSTER_HEADING.test(l));
    if (start === -1) return null;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^## /.test(lines[i])) {
        end = i;
        break;
      }
    }
    return lines.slice(start + 1, end).join('\n');
  };

  /** The delimiter row that sits under a markdown table's header (`| --- |`). */
  const TABLE_DELIMITER = /^\| *:?-{2,}/;

  /**
   * Body rows of every markdown table inside a roster section — the header row
   * and the delimiter row under it dropped, so what is left is one line per
   * roster entry. Detecting the header by the delimiter BELOW it rather than by
   * its wording is what lets `revenue/contracts` head its first column *Tab*
   * and `sales/leads` head its own *View* without either being written down.
   */
  const tableBodyRows = (body: string): string[] => {
    const lines = body.split('\n');
    return lines.filter(
      (line, i) =>
        /^\|/.test(line) &&
        !TABLE_DELIMITER.test(line) &&
        !(i + 1 < lines.length && TABLE_DELIMITER.test(lines[i + 1])),
    );
  };

  /**
   * Roster entries: the body rows of the section's table, and nothing else.
   *
   * It counted bolded top-level bullets as entries too until #1350, and that
   * was a latent false red. Every bolded bullet inside these sections is PROSE:
   * `sales/accounts` explains that Health Score is hand-maintained,
   * `sales/opportunities` lists the three filters behind *Closing This
   * Quarter*, `sales/quotes` opens two whole-sentence bolds, and
   * `service/cases` names its six retired non-views — the same bullets the
   * docstring above records as false positives for the widest phantom rule.
   * Counting them held the three faces to WORDING where the rule claims to hold
   * them to STRUCTURE: it passed only because all three faces happened to word
   * those sentences in parallel. Measured — rewording the `accounts.mdx`
   * English bullet so it opens with no bold turns this red with *"7 roster
   * entr(y|ies), but … has 6"* on both faces, blaming roster drift for a prose
   * edit. A guard that goes red for a reason it does not name sends the next
   * person hunting a roster problem that does not exist.
   *
   * Bounding the count to the text above the first `###` was the other route
   * on offer, and it is not enough: `sales/quotes` and `service/cases` carry
   * their prose bullets with no `###` between the table and them, so six of
   * the twelve faces would keep the defect.
   *
   * A roster written AS a bulleted list counts zero here — caught loudly rather
   * than tolerated. Vacuity guard #1 fails when an English page grows a roster
   * section PAGE_OBJECT does not map, and vacuity guard #3 fails when a mapped
   * page yields no name cells, saying in as many words to teach
   * `tableBodyRows` that shape. `service/knowledge-base` really is a
   * bullet-list roster — four bullets naming the four views that
   * `crm_knowledge_article` ships — and it sits outside this rule for an
   * unrelated reason, heading that section *Finding articles*, so `rosterOf`
   * returns null for it and it never entered the rule before #1350 either.
   */
  const entryCount = (body: string): number => tableBodyRows(body).length;

  /** The name column: the first cell of a table row. */
  const nameCell = (row: string): string => (row.replace(/^\|/, '').split('|')[0] ?? '').trim();

  /**
   * The bolded name a name-column cell opens with, or null when it opens with
   * none. Only the leading run is taken, so the trailing annotations these
   * pages carry — `**All Accounts** *(the landing view)*` — are not part of the
   * name being resolved.
   */
  const boldName = (cell: string): string | null => /^\*\*(.+?)\*\*/.exec(cell)?.[1].trim() ?? null;

  /**
   * The name-column cells of every mapped page's roster, for ONE face. `''` is
   * the English page; `.zh-Hans` and `.zh-Hant` are its translated faces.
   *
   * The three name-column rules below share this because the PARSING is the
   * same question on every face — a face must not be read a second way — while
   * what each rule allows in that column is not: the shipped `label`, the
   * `zh-CN` pack spelling of it, and a table pinned by hand, respectively.
   */
  const nameColumns = (
    face: '' | '.zh-Hans' | '.zh-Hant',
  ): { file: string; object: string; cells: string[] }[] =>
    Object.entries(PAGE_OBJECT).map(([en, object]) => {
      const file = en.replace(/\.mdx$/, `${face}.mdx`);
      return { file, object, cells: tableBodyRows(rosterOf(file) ?? '').map(nameCell) };
    });

  /**
   * Vacuity guard #3 and the shape check beside it, asked of one face.
   *
   * Shared for the same reason `nameColumns` is: "did this rule read a
   * substantial, bolded name column out of every mapped page" is one question
   * with one right answer on all three faces. What each rule ALLOWS in that
   * column, and what a failure there means, stays in the rules themselves —
   * that is where the specific message belongs.
   */
  const expectNameColumnIsReadable = (
    rosters: { file: string; cells: string[] }[],
    face: string,
  ): void => {
    // Vacuity guard #3, and the one these rules need most: they read TABLE
    // rows, and a roster section can be written as a bulleted list instead —
    // `service/knowledge-base` writes its four article views that way, under a
    // heading these rules do not read. A mapped page that switched to that
    // shape — or a table this parser stopped recognising, or a translated face
    // that lost its roster section entirely — would hand the rule an empty cell
    // list and pass by checking nothing, which is precisely the failure #1318
    // already survived. Since #1350 `entryCount` counts table rows only, so
    // this guard is what keeps that shape from going quiet in EVERY rule here
    // at once.
    const unread = rosters.filter((r) => r.cells.length === 0).map((r) => r.file);
    expect(
      unread,
      `${face}: roster sections this rule read no name column out of:\n  ${unread.join('\n  ')}\n` +
        'Every mapped page carried a table roster, on all three faces, when this was written. If ' +
        'one is now a bulleted list, teach tableBodyRows that shape — do not let the page fall ' +
        'out of the rule silently, which is how a roster written from imagination passes.',
    ).toEqual([]);

    // De-bolding is not an escape hatch. Every roster row on every face opens
    // its name column with a bold run today, so a plain-text name column is a
    // new shape and must be looked at rather than skipped.
    const unbolded = rosters.flatMap(({ file, cells }) =>
      cells
        .filter((cell) => boldName(cell) === null)
        .map((cell) => `${file}: name column reads ${JSON.stringify(cell)}, unbolded`),
    );
    expect(
      unbolded,
      `${face}: roster rows whose name column is not a bolded name:\n  ${unbolded.join('\n  ')}\n` +
        'The first column of a roster table is the view’s own name and every page bolds it. ' +
        'Bold it too, rather than leaving a name this rule cannot check.',
    ).toEqual([]);

    const checked = rosters.reduce((n, r) => n + r.cells.length, 0);
    expect(checked, `${face}: this rule is reading no name cells at all`).toBeGreaterThan(40);
  };

  const walkMdxPages = (dir: string): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      return entry.isDirectory() ? walkMdxPages(rel) : rel.endsWith('.mdx') ? [rel] : [];
    });
  };

  it('every English page with a roster section is mapped to an object', () => {
    // Vacuity guard #1, and the thing that keeps PAGE_OBJECT from rotting: a
    // page that grows one of these sections joins the rule automatically.
    const unmapped = walkMdxPages('content/docs')
      .filter((f) => !/\.zh-Han[st]\.mdx$/.test(f))
      .filter((f) => rosterOf(f) !== null)
      .filter((f) => PAGE_OBJECT[f] === undefined);
    expect(
      unmapped,
      `pages carrying a list-view roster that this rule does not check:\n  ${unmapped.join('\n  ')}\n` +
        'Add the page to PAGE_OBJECT with the object it documents — a roster nobody checks is ' +
        'how #1194 shipped three views that do not exist, in three locales.',
    ).toEqual([]);
  });

  it('the stack ships views for every mapped object, and the pages have rosters', () => {
    // Vacuity guard #2, both halves. A stack whose view shape moved would leave
    // every label list empty and the rule would pass by comparing nothing; a
    // renamed heading would make every roster null and do the same.
    const empty = Object.entries(PAGE_OBJECT)
      .filter(([, object]) => (LABELS.get(object) ?? []).length === 0)
      .map(([file, object]) => `${file} → ${object}`);
    expect(
      empty,
      `no view labels resolved for:\n  ${empty.join('\n  ')}\n` +
        'Either the registered view shape moved, or those objects lost their views.',
    ).toEqual([]);

    const missingSection = Object.keys(PAGE_OBJECT).filter((f) => rosterOf(f) === null);
    expect(
      missingSection,
      `mapped pages with no roster section any more:\n  ${missingSection.join('\n  ')}\n` +
        'Teach ROSTER_HEADING the new spelling, or drop the page from PAGE_OBJECT deliberately.',
    ).toEqual([]);

    const resolved = [...new Set(Object.values(PAGE_OBJECT))].reduce(
      (n, object) => n + (LABELS.get(object) ?? []).length,
      0,
    );
    expect(resolved, 'this rule is comparing against an empty label set').toBeGreaterThan(40);
  });

  it('every view the app ships is named in its page’s roster', () => {
    // The DIAGNOSTIC half of the English coverage pair, not the detector — the
    // name-column rule below is strictly stronger and every failure here is
    // also a failure there (see the header). What this one still says that the
    // other cannot: the view is named NOWHERE in the section, prose included,
    // so the page needs writing rather than the table needing a row. ⛔ Do not
    // read it as the wider net; measured, it is the narrower one.
    const drifted = Object.entries(PAGE_OBJECT).flatMap(([file, object]) => {
      const body = rosterOf(file) ?? '';
      return (LABELS.get(object) ?? [])
        .filter((label) => !body.includes(label))
        .map((label) => `${file} never names "${label}", which ${object} ships`);
    });
    expect(
      drifted,
      `list-view rosters that do not match src/views:\n  ${drifted.join('\n  ')}\n` +
        'The registered view is the source of truth — name it on the page (and say what it ' +
        'shows), or delete the view. Do not remove the section to get green: it is the section ' +
        'a manager reads to learn which queues exist.',
    ).toEqual([]);
  });

  it('every view the app ships is named in the English roster’s name column (#1562)', () => {
    const rosters = nameColumns('');
    expectNameColumnIsReadable(rosters, 'English');

    // Coverage read off the NAME COLUMN — the direction #1557 gave the two
    // translated faces, on the face whose body-shaped rule was the original of
    // the shape it rejected. A body substring search cannot see multiplicity at
    // all, and 9 of the 55 English names are echoed in the section body outside
    // their own row, so a row renamed onto a lawful sibling — naming one view
    // twice, dropping another, count untouched — passed every rule in this
    // file. Measured on the tree #1561 landed: 11 passed over exactly that.
    const missing = rosters.flatMap(({ file, object, cells }) => {
      const named = new Set(cells.map(boldName).filter((n): n is string => n !== null));
      return (LABELS.get(object) ?? [])
        .filter((label) => !named.has(label))
        .map((label) => `${file} never names "${label}" in its name column, which ${object} ships`);
    });
    expect(
      missing,
      `views the app ships that this roster’s name column never names:\n  ${missing.join('\n  ')}\n` +
        'Every view the app ships gets a row. A name missing from this column while the row ' +
        'count still matches means some other name is written twice — the one shape body ' +
        'coverage, name exactness and the count rule all pass (#1562). Add the row with the ' +
        'registered label; if the app really did lose the view, delete it from src/views and ' +
        'take the row with it.',
    ).toEqual([]);
  });

  it('the name column of every roster names only views the app ships (#1326)', () => {
    const rosters = nameColumns('');
    expectNameColumnIsReadable(rosters, 'English');

    const phantom = rosters.flatMap(({ file, object, cells }) =>
      cells
        .map(boldName)
        .filter((name): name is string => name !== null)
        .filter((name) => !(LABELS.get(object) ?? []).includes(name))
        .map((name) => `${file} names "${name}", and ${object} ships no view with that label`),
    );
    expect(
      phantom,
      `names in a roster’s name column that no shipped view carries:\n  ${phantom.join('\n  ')}\n` +
        'The registered view label is the source of truth and the switcher prints it verbatim, ' +
        'emoji included — `list.tabs[].name` was never read by anything and #1316 deleted the ' +
        'key. So a tab has no second, shorter name to put here: print the label. If the app ' +
        'really did lose the view, delete the row rather than renaming it to something findable.',
    ).toEqual([]);
  });

  it('every documented view has a zh-CN label for the zh-Hans face to name it by (#1551)', () => {
    // The producer check, and the zh-Hans rule's vacuity guard, in one. A view
    // with no `_views` entry is shown in a Chinese session under its ENGLISH
    // label, so its zh-Hans page has no lawful Chinese string to print for it —
    // and the rule below would then report the page's name as a phantom,
    // blaming the page for a gap in the pack. Fail here, where the fix is.
    const unpacked = Object.entries(PAGE_OBJECT).flatMap(([file, object]) =>
      (SHIPPED.get(object) ?? [])
        .filter((v) => packLabel(object, v.key) === undefined)
        .map((v) => `${object}._views.${v.key} is missing — "${v.label}" is named on ${file}`),
    );
    expect(
      unpacked,
      `shipped views the zh-CN pack does not name:\n  ${unpacked.join('\n  ')}\n` +
        'Add the entry to src/translations/zh-CN.ts. The Chinese console prints the pack label, ' +
        'and the zh-Hans page has to print the same string or a reader cannot find the view by ' +
        'searching the interface for what the page called it (#1329, PR #1548).',
    ).toEqual([]);

    const resolved = [...new Set(Object.values(PAGE_OBJECT))].reduce(
      (n, object) => n + zhCnLabels(object).length,
      0,
    );
    expect(resolved, 'the zh-Hans rule is comparing against an empty label set').toBeGreaterThan(40);
  });

  it('every view the app ships is named in the zh-Hans roster’s name column (#1557)', () => {
    const rosters = nameColumns('.zh-Hans');
    expectNameColumnIsReadable(rosters, 'zh-Hans');

    // Coverage, the direction #1551 did not give this face. It reads the NAME
    // COLUMN rather than the section body the English coverage rule reads: a
    // body substring search cannot see multiplicity at all, and 9 of the 55
    // names on this face are echoed in the prose beneath the table, so a
    // dropped row whose name survives in a bullet would pass. Measured — see
    // the header.
    const missing = rosters.flatMap(({ file, object, cells }) => {
      const named = new Set(cells.map(boldName).filter((n): n is string => n !== null));
      return zhCnLabels(object)
        .filter((label) => !named.has(label))
        .map(
          (label) =>
            `${file} never names "${label}", the zh-CN spelling of a view ${object} ships`,
        );
    });
    expect(
      missing,
      `views the zh-CN pack spells that this zh-Hans roster’s name column never names:\n  ${missing.join('\n  ')}\n` +
        'Every view the app ships gets a row, on every face. A name missing from this column ' +
        'while the row count still matches the English page means some other name is written ' +
        'twice — the one shape name exactness and the count rule both pass (#1557). Add the row ' +
        'with the pack spelling; if the PACK is wrong, change it there and this follows.',
    ).toEqual([]);
  });

  it('the name column of every zh-Hans roster names views as the zh-CN pack spells them (#1551)', () => {
    const rosters = nameColumns('.zh-Hans');
    expectNameColumnIsReadable(rosters, 'zh-Hans');

    const phantom = rosters.flatMap(({ file, object, cells }) =>
      cells
        .map(boldName)
        .filter((name): name is string => name !== null)
        .filter((name) => !zhCnLabels(object).includes(name))
        .map(
          (name) =>
            `${file} names "${name}", which is not the zh-CN spelling of any view ${object} ships`,
        ),
    );
    expect(
      phantom,
      `names in a zh-Hans roster’s name column that no shipped view carries:\n  ${phantom.join('\n  ')}\n` +
        'The Chinese console resolves a view’s label through src/translations/zh-CN.ts and prints ' +
        'that string verbatim, emoji included, so the pack wording is the one a reader can search ' +
        'the interface with — which is why #1329 ruled it the single lawful spelling and PR #1548 ' +
        'rewrote three pages onto it. Print the pack label. If the PACK is what is wrong, change ' +
        'it there and this rule follows: it is derived live, not written down here.',
    ).toEqual([]);
  });

  it('the pinned zh-Hant roster covers every shipped view, and nothing else (#1551)', () => {
    // The staleness guard the pinned side needs, and the only one it can have.
    // Nothing produces Traditional names, so without this audit a view could
    // arrive in src/views or leave it and this table would never notice.
    const unpinned = Object.entries(PAGE_OBJECT).flatMap(([file, object]) =>
      (SHIPPED.get(object) ?? [])
        .filter((v) => typeof ZH_HANT_VIEW_NAMES[object]?.[v.key] !== 'string')
        .map((v) => `${object}.${v.key} ("${v.label}", named on ${file}) has no pinned name`),
    );
    expect(
      unpinned,
      `shipped views absent from ZH_HANT_VIEW_NAMES:\n  ${unpinned.join('\n  ')}\n` +
        'No pack produces Traditional names — decide this one by hand, write it on the ' +
        '.zh-Hant.mdx page and pin it here in the same PR. Deleting the pin instead is right ' +
        'only when the view is gone from src/views too.',
    ).toEqual([]);

    const stale = Object.entries(ZH_HANT_VIEW_NAMES).flatMap(([object, names]) =>
      Object.keys(names)
        .filter((key) => !(SHIPPED.get(object) ?? []).some((v) => v.key === key))
        .map((key) => `${object}.${key} is pinned as "${names[key]}", which the app does not ship`),
    );
    expect(
      stale,
      `pinned Traditional names for views that do not exist:\n  ${stale.join('\n  ')}\n` +
        'A hand-maintained table rots silently unless something audits it against source. Drop ' +
        'the entry, and drop the row from the .zh-Hant.mdx page with it.',
    ).toEqual([]);

    const pinned = Object.values(ZH_HANT_VIEW_NAMES).reduce(
      (n, names) => n + Object.keys(names).length,
      0,
    );
    expect(pinned, 'the pinned Traditional roster is empty').toBeGreaterThan(40);
  });

  it('every view the app ships is named in the zh-Hant roster’s name column (#1557)', () => {
    const rosters = nameColumns('.zh-Hant');
    expectNameColumnIsReadable(rosters, 'zh-Hant');

    // Coverage for the pinned face. Same direction and same reading of the
    // name column as the zh-Hans rule above, against the one source this face
    // has: ZH_HANT_VIEW_NAMES, which the audit above holds one-to-one against
    // the shipped views. Kept as a separate rule rather than parameterised
    // with that one, because what a failure MEANS differs — there, a page and
    // a live pack disagree; here, a page and a hand-written table do.
    const missing = rosters.flatMap(({ file, object, cells }) => {
      const named = new Set(cells.map(boldName).filter((n): n is string => n !== null));
      return zhHantNames(object)
        .filter((label) => !named.has(label))
        .map(
          (label) =>
            `${file} never names "${label}", the pinned Traditional name of a view ${object} ships`,
        );
    });
    expect(
      missing,
      `pinned Traditional names this zh-Hant roster’s name column never names:\n  ${missing.join('\n  ')}\n` +
        'Every view the app ships gets a row, on every face. A name missing from this column ' +
        'while the row count still matches the English page means some other name is written ' +
        'twice — the one shape name exactness and the count rule both pass (#1557). ⚠️ Nothing ' +
        'produces these strings, so the pin above and the .zh-Hant.mdx pages are the whole ' +
        'chain: add the row by hand, and keep it spelled exactly as the pin.',
    ).toEqual([]);
  });

  it('the name column of every zh-Hant roster names only the pinned Traditional roster (#1551)', () => {
    const rosters = nameColumns('.zh-Hant');
    expectNameColumnIsReadable(rosters, 'zh-Hant');

    const phantom = rosters.flatMap(({ file, object, cells }) =>
      cells
        .map(boldName)
        .filter((name): name is string => name !== null)
        .filter((name) => !zhHantNames(object).includes(name))
        .map(
          (name) =>
            `${file} names "${name}", which is in no pinned Traditional roster for ${object}`,
        ),
    );
    expect(
      phantom,
      `names in a zh-Hant roster’s name column that the pin does not carry:\n  ${phantom.join('\n  ')}\n` +
        '⚠️ This is the one label set in this file with NO producer: the app ships no Traditional ' +
        'pack, so ZH_HANT_VIEW_NAMES above and these pages are the whole chain. A mismatch means ' +
        'one of the two moved without the other — decide which is right by hand and change both. ' +
        '⛔ Do not derive the name from the zh-CN label: the convention substitutes words ' +
        '(合同 → 合約, 营销 → 行銷, 联系人 → 聯絡人), not glyphs, and the strict-glyph forms of ' +
        'the last two appear zero times in content/docs.',
    ).toEqual([]);
  });

  it('every translated face carries the same roster, entry for entry', () => {
    const drifted = Object.keys(PAGE_OBJECT).flatMap((en) => {
      const enBody = rosterOf(en) ?? '';
      return ['.zh-Hans', '.zh-Hant'].flatMap((locale) => {
        const translated = en.replace(/\.mdx$/, `${locale}.mdx`);
        if (!existsSync(join(REPO_ROOT, translated))) return [];
        const body = rosterOf(translated);
        if (body === null) return [`${translated} has no list-view roster, but ${en} has one`];
        const [a, b] = [entryCount(body), entryCount(enBody)];
        return a === b ? [] : [`${translated}: ${a} roster entr(y|ies), but ${en} has ${b}`];
      });
    });
    expect(
      drifted,
      `translated rosters that do not match the English page:\n  ${drifted.join('\n  ')}\n` +
        'This rule holds the faces to STRUCTURE — same section, same number of roster entries — ' +
        'and the two rules above hold their names, each against its own source (#1551). The ' +
        'structural half still earns its place: it is the one that notices a face losing or ' +
        'gaining a ROW, which a name rule reading only the rows that are there cannot. #1194 was ' +
        'one wrong roster copied into three faces; fixing one face and not the others recreates ' +
        'it.',
    ).toEqual([]);
  });
});
