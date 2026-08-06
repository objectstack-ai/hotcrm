// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import stack from '../objectstack.config';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Which status fields are governed by a transition table, and why (#575 B4).
 *
 * Only `crm_lead`, `crm_opportunity` and `crm_case` declared a `state_machine`
 * validation. That looked like a coverage gap across every remaining object
 * with a status field, and it was not — the test is whether an illegal
 * transition has a business consequence:
 *
 *   • `crm_quote` and `crm_contract` — YES, and neither had so much as a status
 *     guard in its hook. A quote could go `draft → accepted` (a number nobody
 *     reviewed or sent, now binding), and a contract `draft → activated`, which
 *     stamps `signed_date`, promotes the account to `customer` and starts the
 *     renewal clock — on an agreement that never passed approval.
 *   • `crm_campaign` and `crm_task` — NO. Their `status` is DESCRIPTIVE
 *     (running / paused, not started / in progress), not a controlled
 *     lifecycle. A transition table there would reject ordinary edits and teach
 *     users to ignore the warning.
 *
 * The second half is the part worth pinning: "deliberately absent" and
 * "forgotten" look identical in the metadata, and only one of them should stay
 * that way.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const objectNamed = (name: string): AnyRec => {
  const found = objects.find((o) => o.name === name);
  if (!found) throw new Error(`object ${name} not registered`);
  return found;
};

const machinesOf = (name: string): AnyRec[] =>
  ((objectNamed(name).validations ?? []) as AnyRec[]).filter((v) => v.type === 'state_machine');

/** Objects that must be governed, and the field the table governs. */
const GOVERNED = [
  { object: 'crm_lead', field: 'status' },
  { object: 'crm_opportunity', field: 'stage' },
  { object: 'crm_case', field: 'status' },
  { object: 'crm_quote', field: 'status' },
  { object: 'crm_contract', field: 'status' },
] as const;

/** Objects whose status is descriptive — a table here is a regression. */
const UNGOVERNED = ['crm_campaign', 'crm_task'] as const;

describe.each(GOVERNED)('$object lifecycle is constrained', ({ object, field }) => {
  const [machine, ...extra] = machinesOf(object);

  it('declares exactly one state machine, over the lifecycle field', () => {
    expect(machine, `${object} has no state_machine validation`).toBeTruthy();
    expect(extra, `${object} declares more than one state machine`).toEqual([]);
    expect(machine!.field).toBe(field);
  });

  it('warns rather than blocks, like the three that came first', () => {
    // Every machine in this repo is advisory. A hard `error` would make a
    // legitimate support correction impossible without a data fix.
    expect(machine!.severity).toBe('warning');
    expect(String(machine!.message ?? '')).not.toBe('');
  });

  it('covers every option of the field, on both sides of the arrow', () => {
    // A status missing from the table's KEYS is unconstrained (nothing
    // describes what may follow it); a status missing from every VALUE is
    // unreachable. Both are silent.
    const options: string[] = ((objectNamed(object).fields?.[field]?.options ?? []) as AnyRec[]).map(
      (o) => String(o.value),
    );
    expect(options.length, `${object}.${field} has no options`).toBeGreaterThan(2);

    const transitions = machine!.transitions as Record<string, string[]>;
    const states = Object.keys(transitions);
    expect(
      options.filter((o) => !states.includes(o)),
      `${object}.${field} values with no outbound rule`,
    ).toEqual([]);

    const targets = new Set(Object.values(transitions).flat());
    const unreachable = options.filter((o) => !targets.has(o));
    // The initial state is legitimately unreachable — nothing transitions INTO
    // `draft` / `new` / `prospecting`; a record is created there.
    const initial = ((objectNamed(object).fields?.[field]?.options ?? []) as AnyRec[])
      .filter((o) => o.default === true)
      .map((o) => String(o.value));
    expect(
      unreachable.filter((o) => !initial.includes(o)),
      `${object}.${field} values nothing can transition into`,
    ).toEqual([]);
  });

  it('names no state outside the field vocabulary', () => {
    const legal = new Set(
      ((objectNamed(object).fields?.[field]?.options ?? []) as AnyRec[]).map((o) => String(o.value)),
    );
    const transitions = machine!.transitions as Record<string, string[]>;
    const bad = Object.entries(transitions).flatMap(([from, tos]) =>
      [from, ...tos].filter((s) => !legal.has(s)).map((s) => `${from} → ${s}`),
    );
    expect(bad, `${object} transitions naming non-existent states:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

describe('the new tables agree with the automation that drives them', () => {
  const quote = machinesOf('crm_quote')[0]!.transitions as Record<string, string[]>;
  const contract = machinesOf('crm_contract')[0]!.transitions as Record<string, string[]>;

  it('every unsettled quote status can still expire', () => {
    // `quote_expiration` sweeps on `expiration_date` alone — it expires a draft
    // that was never sent as readily as a presented one. A table that omitted
    // one of those edges would make the nightly sweep emit warnings.
    for (const from of ['draft', 'in_review', 'presented']) {
      expect(quote[from], `quote ${from} → expired is not allowed`).toContain('expired');
    }
  });

  it('quote states the pricing guard freezes are terminal', () => {
    // `quote_pricing_guard` lets nothing but `internal_notes` change on an
    // accepted or expired quote, so any outbound edge here would be a rule the
    // hook forbids one layer down.
    expect(quote.accepted).toEqual([]);
    expect(quote.expired).toEqual([]);
  });

  it('a quote cannot jump from draft straight to accepted', () => {
    expect(quote.draft).not.toContain('accepted');
    expect(quote.draft).not.toContain('presented');
  });

  it('a contract reaches activation only through approval', () => {
    expect(contract.draft).not.toContain('activated');
    expect(contract.in_approval).toContain('activated');
  });

  it('only an activated contract expires', () => {
    // `contract_expiration` filters on `status: 'activated'`; nothing else ages
    // out, and both end states are final because a renewal is a NEW contract.
    const expiring = Object.entries(contract)
      .filter(([, tos]) => tos.includes('expired'))
      .map(([from]) => from);
    expect(expiring).toEqual(['activated']);
    expect(contract.expired).toEqual([]);
    expect(contract.terminated).toEqual([]);
  });
});

/**
 * The admin page's roster agrees with the ledger above (#896).
 *
 * `content/docs/administration/state-machines` opens with "HotCRM uses state
 * machines on:" and a bullet per object. That roster was written when only
 * `crm_lead` and `crm_opportunity` had a machine, and it did not move when
 * #575 B4 added three more — so the page went on listing case, contract and
 * quote as objects that *lack* a state machine while each of them carried a
 * named one. Nothing was red: `os validate` and `pnpm lint` never open
 * `content/docs`, and every guard in this file reads metadata only.
 *
 * This block closes that loop in the one direction that rots — the source grows
 * a machine, the page does not. The expectation is DERIVED from {@link GOVERNED}
 * / {@link UNGOVERNED}, so a sixth machine turns the page red instead of quietly
 * joining the three that were missing.
 *
 * It reads the bullet list ONLY, not the prose around it: the paragraph below
 * the list legitimately names campaigns (to say they deliberately have no
 * machine), and a whole-section substring search would call that a listing.
 * Bullets are the roster; prose is commentary.
 */
describe('the admin docs roster matches the ledger', () => {
  /**
   * How each object is named in the roster, per locale. Hand-written on purpose
   * and NOT taken from `src/translations/` — the docs and the locale pack are
   * separate surfaces with their own drift (#837 tracks `crm_case` alone being
   * 服务案例 / 工单 / 案例 in three places), and pinning the page against the
   * pack here would make this guard fail for a reason that has nothing to do
   * with the roster being complete.
   */
  const DOC_LABEL: Record<string, { en: string; hans: string; hant: string }> = {
    crm_lead: { en: 'Leads', hans: '潜在客户', hant: '潛在客戶' },
    crm_opportunity: { en: 'Opportunities', hans: '商机', hant: '商機' },
    crm_case: { en: 'Cases', hans: '案例', hant: '案例' },
    crm_contract: { en: 'Contracts', hans: '合同', hant: '合約' },
    crm_quote: { en: 'Quotes', hans: '报价', hant: '報價' },
    crm_campaign: { en: 'Campaigns', hans: '营销活动', hant: '行銷活動' },
    crm_task: { en: 'Tasks', hans: '任务', hant: '任務' },
  };

  const PAGES = [
    { locale: 'en' as const, file: 'state-machines.mdx' },
    { locale: 'hans' as const, file: 'state-machines.zh-Hans.mdx' },
    { locale: 'hant' as const, file: 'state-machines.zh-Hant.mdx' },
  ];

  /** The bullet lines of the first `##` section, which is the roster. */
  const rosterBullets = (file: string): string[] => {
    const text = readFileSync(join(REPO_ROOT, 'content/docs/administration', file), 'utf8');
    const sections = text.split(/^## /m);
    // [0] is the frontmatter + `# Title` + lede; [1] is "Where state machines apply".
    const section = sections[1];
    if (!section) throw new Error(`${file}: no '## ' section found`);
    return section.split('\n').filter((l) => l.startsWith('- '));
  };

  describe.each(PAGES)('$file', ({ locale, file }) => {
    it('lists every governed object', () => {
      const bullets = rosterBullets(file).join('\n');
      const missing = GOVERNED.map((g) => g.object)
        .filter((o) => !bullets.includes(DOC_LABEL[o]![locale]))
        .map((o) => `${o} (${DOC_LABEL[o]![locale]})`);
      expect(
        missing,
        `${file} declares a state machine for these objects but does not list them:\n  ${missing.join('\n  ')}`,
      ).toEqual([]);
    });

    it('lists no object whose status is deliberately descriptive', () => {
      const bullets = rosterBullets(file).join('\n');
      const wrong = UNGOVERNED.filter((o) => bullets.includes(DOC_LABEL[o]![locale])).map(
        (o) => `${o} (${DOC_LABEL[o]![locale]})`,
      );
      expect(
        wrong,
        `${file} lists these as having a state machine, but they deliberately do not — see #575 B4:\n  ${wrong.join('\n  ')}`,
      ).toEqual([]);
    });

    it('has a roster to check — the precondition', () => {
      // The UNGOVERNED assertion passes vacuously on an empty bullet list, so a
      // section rename or a rewrite into prose would silently stop checking
      // anything. This is the only signal for that; the GOVERNED assertion
      // above cannot tell "no roster" from "roster missing an object".
      expect(rosterBullets(file).length, `${file}: roster has no bullets`).toBeGreaterThan(0);
    });
  });

  it('names every ledger object in every locale', () => {
    // DOC_LABEL is hand-written; this keeps it in step with the ledger rather
    // than letting a new object silently skip the roster check for want of a
    // label entry.
    const named = [...GOVERNED.map((g) => g.object), ...UNGOVERNED];
    expect(named.filter((o) => !DOC_LABEL[o])).toEqual([]);
  });
});

describe.each(UNGOVERNED)('%s status stays descriptive', (object) => {
  it('has a status field to be tempted by', () => {
    // Without this the assertion below would also pass for an object that lost
    // its status field entirely.
    expect(objectNamed(object).fields?.status, `${object}.status missing`).toBeTruthy();
  });

  it('declares no state machine', () => {
    expect(
      machinesOf(object).map((m) => m.name),
      `${object} gained a transition table. Its status describes what the record ` +
        'is doing, not a controlled lifecycle — see #575 B4 before adding one.',
    ).toEqual([]);
  });
});
