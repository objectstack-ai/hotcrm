// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  rows,
  sitesOf,
  fieldsByObject,
  objectsByField,
  refuseSitesTarget,
  type Row,
} from '../scripts/scan-field-consumers';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * The consumer scan stays OBJECT-AWARE (#1193).
 *
 * `scripts/scan-field-consumers.ts` exists because the sweep that produced
 * #1182's row set was object-blind: it called a field consumed when its NAME
 * appeared in a `src/**\/*.ts` file outside `views/` and `translations/`.
 * `crm_product.tax_rate` therefore read as consumed — the token also spells
 * `crm_quote_line_item.tax_rate`, a different object's field whose own formula
 * reads its own rate — and the product's rate reached no card. `is_taxable`,
 * two declarations away in the same field group and inert for exactly the same
 * reason, did reach it, because its name is unique.
 *
 * ## What this file guards, and what it deliberately does NOT
 *
 * It does not guard the NUMBER of inert fields. That was considered and
 * rejected: the maintainer ruling of 2026-08-17 was 「逐个 enforce-or-remove
 * （推荐）」 — a verdict per field — so a gate on the count would encode the
 * blanket rule the ruling declined to make, and would go red the day someone
 * lands a field one PR before its consumer. The scan is a ledger a human
 * adjudicates, and `pnpm verify` does not run it.
 *
 * What must not regress is the scan's ABILITY TO SEE, because that failure is
 * invisible: a false negative cannot appear in the scan's own output, so a
 * resolver that quietly stopped distinguishing two objects would keep printing
 * a confident, shorter ledger and nobody would notice. So the assertions below
 * are about resolution, not about counts:
 *
 *  1. the two same-named `tax_rate` fields get DIFFERENT verdicts — the exact
 *     discrimination the old grep could not make;
 *  2. every site attributed to a field belongs to an object that DECLARES it;
 *  3. #1182's own verdicts are re-derivable from this scan (positive and
 *     negative controls, so the rule is not agreeing with everything);
 *  4. the scan is not vacuous — it resolves thousands of sites, and the
 *     shared-name population it exists for is non-empty.
 */

const verdictOf = (object: string, field: string): Row['verdict'] | 'absent' =>
  rows.find((r) => r.object === object && r.field === field)?.verdict ?? 'absent';

describe('the scan resolves a shared field name per object, not per file (#1193)', () => {
  /**
   * The card in one assertion. Both objects declare `tax_rate`; one is read by
   * a formula on its own object and one is read by nothing. A name-only grep
   * reports a single answer for both — and reported the wrong one.
   */
  it('crm_quote_line_item.tax_rate is live and crm_product.tax_rate is not', () => {
    expect(fieldsByObject.get('crm_product')?.has('tax_rate')).toBe(true);
    expect(fieldsByObject.get('crm_quote_line_item')?.has('tax_rate')).toBe(true);
    expect(verdictOf('crm_quote_line_item', 'tax_rate')).toBe('live');
    expect(verdictOf('crm_product', 'tax_rate')).toBe('inert');
  });

  it('the live one is read by the total_price formula on its own object', () => {
    const sites = sitesOf('crm_quote_line_item', 'tax_rate');
    expect(sites.some((s) => s.root === 'objects' && s.bucket === 'behaviour')).toBe(true);
  });

  /**
   * The inert one has only CARRIER sites — the four locale bundles. That is the
   * shape a removal has to clean, and the shape that proves nothing reads it.
   * Asserted as "no behaviour and no display site" rather than "zero sites",
   * because a locale row is not evidence of a reader and must not be mistaken
   * for one in either direction.
   */
  it('the inert one has locale rows and nothing else', () => {
    const sites = sitesOf('crm_product', 'tax_rate');
    expect(sites.every((s) => s.bucket === 'carrier')).toBe(true);
    expect(sites.map((s) => s.root)).toContain('translations');
  });

  it('no site is ever attributed to an object that does not declare the field', () => {
    const bogus = rows.flatMap((r) =>
      sitesOf(r.object, r.field)
        .filter(() => !fieldsByObject.get(r.object)?.has(r.field))
        .map((s) => `${r.object}.${r.field} @ ${s.root}${s.path}`),
    );
    expect(bogus, `sites attributed to objects that do not declare the field:\n  ${bogus.join('\n  ')}`).toEqual([]);
  });
});

describe('#1182 verdicts are re-derivable from this scan (#1193)', () => {
  /**
   * The reverse verification, pinned.
   *
   * Measured on the pre-removal tree (`c83aa744`, the commit before #1195
   * landed): of the twelve fields #1182 deleted, two read `inert` and ten read
   * `display-only` — and NONE read `live`. On this tree they are gone, so what
   * can be re-checked here is the other half of that card: the one row it KEPT
   * and enforced. `crm_account.parent_account` read `display-only` before the
   * roll-up existed and reads `live` now, because `child_account_revenue`
   * names it as its `relationshipField`. A resolver that stopped reading
   * summary operations would flip it back, silently.
   */
  it('the row #1182 enforced now reads as live', () => {
    expect(verdictOf('crm_account', 'parent_account')).toBe('live');
    const behavioural = sitesOf('crm_account', 'parent_account').filter((s) => s.bucket === 'behaviour');
    expect(behavioural.length).toBeGreaterThan(0);
  });

  it('the fields #1182 removed are gone, so the ledger cannot re-report them', () => {
    for (const [object, field] of [
      ['crm_product', 'is_taxable'], ['crm_product', 'quantity_on_hand'],
      ['crm_product', 'billing_type'], ['crm_case', 'parent_case'],
      ['crm_contact', 'birthdate'], ['crm_campaign', 'parent_campaign'],
    ] as const) {
      expect(verdictOf(object, field), `${object}.${field}`).toBe('absent');
    }
  });

  /**
   * Negative controls. A resolver that credited every token to every object
   * would call everything live; one that credited nothing would call everything
   * inert. These two rows are heavily read and must stay live, and their site
   * counts are asserted as ">= 1 behaviour" rather than as a number, so
   * ordinary work does not have to update a magic figure.
   */
  it('heavily-read fields stay live', () => {
    expect(verdictOf('crm_product', 'list_price')).toBe('live');
    expect(verdictOf('crm_opportunity', 'amount')).toBe('live');
  });
});

describe('the scan is not vacuous (#1193)', () => {
  it('resolves a real population of fields and sites', () => {
    // A stack shape that moved would leave every row at zero sites and the
    // ledger would report the whole app as inert — loud, but for the wrong
    // reason. Fail here, where the message is true.
    expect(rows.length).toBeGreaterThan(300);
    expect(rows.filter((r) => r.verdict === 'live').length).toBeGreaterThan(200);
  });

  it('the shared-name population this scan exists for is non-empty', () => {
    // If no field name were ever shared across objects, the object-aware
    // resolution would be guarding nothing and this whole file would be
    // agreeing with everything.
    const shared = [...objectsByField].filter(([, objects]) => objects.length > 1);
    expect(shared.length).toBeGreaterThan(10);
  });
});

/**
 * `--sites` refuses a name that does not exist, and the refusal is an EXIT CODE
 * (#1255).
 *
 * ## Why the exit status is the assertion and the wording is not
 *
 * The regression is not "the message is wrong", it is **"exits 0 on a name that
 * does not exist"**. `--sites` is the only path that takes a field name from
 * argv (`--json` and the default ledger both enumerate `fieldsByObject`, so
 * neither can name a field that does not exist), and it used to pass whatever it
 * was handed to `sitesOf`, which returns `[]` for a misspelling exactly as it
 * does for a field nothing reads. Both then printed `(none — this field is
 * inert)` and exited 0.
 *
 * That sentence is what gets quoted into an enforce-or-remove decision — #1198
 * and #1199 are live adjudications driven by this reading — so a typo answered
 * with a green exit is silent AND self-confirming: the same misspelled command
 * re-derives the same confident answer every time it is run. A test that only
 * read stdout would have passed on the old behaviour the moment the wording
 * happened to match, which is why every case below asserts `status`.
 *
 * ## The third case is the one that makes the first two mean something
 *
 * A "fix" that rejected every input would satisfy the two refusal cases
 * perfectly. `crm_product.tax_rate` is the control: declared, genuinely inert
 * (#1193's headline row), and it must still be ACCEPTED and reported with exit
 * 0. Refusal is about the name not existing, never about the verdict.
 *
 * ## A measurement worth recording, because it dates
 *
 * On this tree **no declared field has zero sites** — every one carries at least
 * a locale row — so the inert sentence is currently reachable only through a
 * name that does not exist. The control below therefore pins a declared field
 * that reports its four carrier sites, not one that prints the sentence. If a
 * field ever loses its last carrier the sentence becomes reachable honestly,
 * and `scan-field-consumers.ts` still prints it; nothing here forbids that.
 */
describe('--sites refuses a field name that does not exist (#1255)', () => {
  const TSX = join(REPO_ROOT, 'node_modules/.bin/tsx');
  const SCRIPT = join(REPO_ROOT, 'scripts/scan-field-consumers.ts');

  /**
   * Every case below spawns the real script, and that spawn is not cheap: `tsx`
   * compiles the file and the script imports `objectstack.config`, i.e. the whole
   * registered metadata stack, on each run. Measured here, one spawn per case:
   * 1271–1313ms.
   *
   * Vitest's default budget is 5000ms, and a first version of this suite put
   * THREE spawns in one case (`it` over an array of malformed targets). That
   * measured 3802ms locally — inside the default, so it passed here — and timed
   * out in CI, where the same import work measured ~1.7x slower. Splitting it
   * into one case per target restored one spawn per case; the budget below is
   * then stated rather than defaulted so the remaining margin does not depend on
   * how loaded the runner is.
   *
   * Deliberately far above the real cost: this timeout exists to catch a spawn
   * that HANGS, not to police how fast the script starts. A startup regression
   * should be argued on its own evidence, never discovered as a flaky timeout in
   * an argv test.
   */
  const SPAWN_TIMEOUT_MS = 30_000;

  /**
   * Spawns the real script, never throwing, so the exit status can be read.
   *
   * `stdio` is pinned so the child's stderr is CAPTURED rather than echoed into
   * the parent's log (#1302) — `error.stderr` below is populated either way, so
   * every assertion on the failure text still reads exactly what it read
   * before. See test/verify-log-decoy-pin.test.ts.
   */
  const run = (...args: string[]): { status: number; output: string } => {
    try {
      return {
        status: 0,
        output: execFileSync(TSX, [SCRIPT, ...args], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      };
    } catch (error) {
      const failure = error as { status?: number; stdout?: string; stderr?: string };
      return { status: failure.status ?? -1, output: `${failure.stdout ?? ''}${failure.stderr ?? ''}` };
    }
  };

  it('an UNKNOWN object exits non-zero instead of calling it inert', () => {
    const { status, output } = run('--sites', 'no_such_object.no_such_field');
    expect(status).not.toBe(0);
    expect(output).not.toContain('this field is inert');
    expect(output).toContain("no object named 'no_such_object'");
  }, SPAWN_TIMEOUT_MS);

  it('a known object with an UNDECLARED field exits non-zero', () => {
    // The card's own reproduction, verbatim.
    const { status, output } = run('--sites', 'crm_account.no_such_field');
    expect(status).not.toBe(0);
    expect(output).not.toContain('this field is inert');
    expect(output).toContain("declares no field named 'no_such_field'");
  }, SPAWN_TIMEOUT_MS);

  it('a DECLARED but genuinely inert field is still reported, still exit 0', () => {
    // The control. Without it, a change that rejected everything would pass.
    expect(fieldsByObject.get('crm_product')?.has('tax_rate')).toBe(true);
    expect(verdictOf('crm_product', 'tax_rate')).toBe('inert');
    const { status, output } = run('--sites', 'crm_product.tax_rate');
    expect(status).toBe(0);
    expect(output).toContain('crm_product.tax_rate — 4 site(s)');
    expect(output).toContain('translations[0].en.objects.crm_product.fields');
  }, SPAWN_TIMEOUT_MS);

  /**
   * One case per target rather than a loop over three, for two reasons: each
   * spawn then owns its own timeout budget, and a failure names the TARGET that
   * broke instead of reporting only that a loop timed out.
   *
   * `crm_account` is the original of the three: with no dot, the old
   * `lastIndexOf('.')` split it into object `crm_accoun` / field `crm_account`
   * and called that inert with exit 0. The other two are the boundaries of the
   * same split — a dot at either end leaves one half empty.
   *
   * These must stay SPAWNS. The garbled split was `main()`-path behaviour, so a
   * direct `refuseSitesTarget()` call would not have caught the original defect;
   * only the real script's exit status pins it.
   */
  it.each(['crm_account', 'crm_account.', '.tax_rate'])(
    'a malformed target (%s) exits non-zero rather than scanning a garbled name',
    (target) => {
      const { status, output } = run('--sites', target);
      expect(status, target).not.toBe(0);
      expect(output, target).toContain('--sites needs');
    },
    SPAWN_TIMEOUT_MS,
  );

  it('--sites with no argument at all exits non-zero', () => {
    const { status, output } = run('--sites');
    expect(status).not.toBe(0);
    expect(output).toContain('none was given');
  }, SPAWN_TIMEOUT_MS);

  /**
   * The near-miss correction, which is a LOOKUP and not fuzzy matching: the
   * scan already knows every declared field, so when the misspelled half is the
   * object name it can name the objects that really do declare the field.
   */
  it('names the objects that do declare the field, when any do', () => {
    const lines = refuseSitesTarget('crm_accont.tax_rate');
    expect(lines).not.toBeNull();
    expect(lines!.join('\n')).toContain("'tax_rate' is declared on crm_product, crm_quote_line_item");
  });

  it('says so plainly when no object declares the name at all', () => {
    const lines = refuseSitesTarget('crm_account.no_such_field');
    expect(lines!.join('\n')).toContain("no registered object declares a field named 'no_such_field'");
  });

  it('accepts every declared field in the ledger — the refusal is not a blanket', () => {
    // The broadest form of the control above: refusal must key on the NAME not
    // existing, so nothing the ledger itself enumerates may ever be refused.
    const refused = rows.filter((r) => refuseSitesTarget(`${r.object}.${r.field}`) !== null);
    expect(refused.map((r) => `${r.object}.${r.field}`)).toEqual([]);
  });
});
