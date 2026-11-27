// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { isBodyTableRelationship } from '@objectstack/spec/data';
import { hotcrmStack, systemInsert } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Record page v3/v4 on HotCRM's four most-worked objects (#2382).
 *
 * Maintainer ruling, 2026-10-29: 「是，把 hotcrm#2382 改成四张页全部退成默认页，只把告警留作
 * 单槽覆盖；商机参考栏和客户 chatter 删掉。」 The lead, deal and case pages then kept only
 * their conditional banners, in the `alerts` slot of a `kind: 'slotted'` page.
 * The deal's banners went with #2686, and the lead's and the case's with their
 * pages by the 2026-11-25 ruling on #2740 (「2A+ 删甘特图」): none of the four
 * objects has an authored record page any more. Everything the retired pages
 * drew is the platform's default page, drawn from object metadata — so this
 * suite pins that metadata as the BOOTED app serves it (`@objectstack/verify`),
 * not as the source files spell it: the registry is what the console reads.
 *
 * The rendering itself (the strip, the body table, the related column) is the
 * console's and was read in a browser on `objectstack dev` at the 18.6.0 pin;
 * the PR for #2382 carries the screenshots.
 */

let verify: VerifyStack;
beforeAll(async () => {
  verify = await hotcrmStack();
}, 120_000);

const servedPages = (): Rec[] => verify.metadata.items<Rec>('page');
const recordPagesOf = (object: string): Rec[] =>
  servedPages().filter((p) => p.type === 'record' && p.object === object);
const field = (object: string, name: string): Rec => (verify.metadata.object(object)?.fields as Rec)?.[name] ?? {};

describe('the four record pages are the default page, with nothing authored', () => {
  // The lead's two duplicate banners and the case's SLA banner were the last
  // authored pieces (#2382's single-slot overrides); the maintainer dropped
  // them with their pages on 2026-11-25 (#2740). The facts they announced are
  // on the default page: the lead's Duplicate Management section opens
  // expanded (`test/lead-duplicate-visibility.test.ts`), the case's SLA
  // Violated sits in its open SLA & Priority section.
  it.each(['crm_lead', 'crm_case'])('%s has no authored record page at all (#2740)', (object) => {
    expect(recordPagesOf(object)).toEqual([]);
  });

  it('the case\'s breach stays on the page without a banner: SLA Violated in an always-open section, the due date in the strip', () => {
    const kase = verify.metadata.object('crm_case') as Rec;
    expect(field('crm_case', 'is_sla_violated').group).toBe('sla');
    const sla = ((kase.fieldGroups ?? []) as Rec[]).find((g) => g.key === 'sla');
    expect(sla?.collapse ?? 'none').toBe('none');
    expect(kase.highlightFields).toContain('sla_due_date');
  });

  // The opportunity's page kept only its two approval banners until #2686
  // dropped them (maintainer ruling 2026-11-19): with nothing left to
  // override, the deal draws the default page as is, like the account.
  // `test/opportunity-approval-pending-alert.test.ts` pins what replaced them.
  it('the opportunity has no authored record page at all (#2686)', () => {
    expect(recordPagesOf('crm_opportunity')).toEqual([]);
  });

  it('the account has no authored record page at all: the chatter and the custom header are gone', () => {
    expect(recordPagesOf('crm_account')).toEqual([]);
    // Nor any other page: the account's list interface page went too (#2740,
    // ruling W1), and the account opens on its own list views.
    expect(servedPages().filter((p) => p.object === 'crm_account').map((p) => `${p.name}:${p.type}`))
      .toEqual([]);
  });
});

describe('the highlight strip is the object\'s declared list, never the record title', () => {
  it.each([
    ['crm_lead', ['status', 'rating', 'lead_source', 'email', 'phone']],
    ['crm_opportunity', ['amount', 'close_date', 'probability', 'owner_id', 'crm_account']],
    ['crm_case', ['status', 'priority', 'sla_due_date', 'owner_id', 'crm_account']],
  ])('%s highlights %j', (object, expected) => {
    const served = verify.metadata.object(object) as Rec;
    expect(served.highlightFields).toEqual(expected);
    // The default page draws at most six and drops the title field; a list
    // that named the title would spend a chip restating the H1.
    expect(expected.length).toBeLessThanOrEqual(6);
    expect(expected).not.toContain(served.nameField);
  });

  it('an account keeps its deal list\'s columns, which the deal strip used to supply', () => {
    expect(field('crm_opportunity', 'crm_account').relatedListColumns).toEqual(['name', 'amount', 'stage', 'owner_id']);
  });
});

describe('the related column lists open tasks only on a lead, a deal and a case', () => {
  const LINKS: Array<[string, string]> = [
    ['related_to_lead', 'crm_lead'],
    ['related_to_opportunity', 'crm_opportunity'],
    ['related_to_case', 'crm_case'],
  ];

  it.each(LINKS)('crm_task.%s declares the open-task scope and the columns', (link) => {
    expect(field('crm_task', link).relatedListFilter).toEqual({ status: { $ne: 'completed' } });
    expect(field('crm_task', link).relatedListColumns).toEqual(['subject', 'status', 'priority', 'due_date', 'owner_id']);
  });

  it('the scope, composed with the parent link as the list composes it, leaves the completed task out', async () => {
    const lead = await systemInsert(verify, 'crm_lead', {
      first_name: 'Opal', last_name: 'Scope', company: 'Scope Co 2382', email: 'opal@record-page-default.test', status: 'new',
    });
    const open = await systemInsert(verify, 'crm_task', { subject: 'Call Opal back', status: 'not_started', related_to_lead: lead.id });
    const done = await systemInsert(verify, 'crm_task', { subject: 'Sent Opal the deck', status: 'completed', related_to_lead: lead.id });
    const scope = field('crm_task', 'related_to_lead').relatedListFilter as Rec;

    const all = await verify.rows('crm_task', { related_to_lead: lead.id });
    expect(all.map((r) => r.id).sort()).toEqual([open.id, done.id].sort());
    const listed = await verify.rows('crm_task', { related_to_lead: lead.id, ...scope });
    expect(listed.map((r) => r.id)).toEqual([open.id]);
  });

  it('the lead\'s events keep the columns the retired page named, start beside the subject', () => {
    expect(field('crm_event', 'related_to_lead').relatedListColumns).toEqual(['subject', 'start_datetime', 'status', 'type', 'owner_id']);
  });
});

describe('a quote\'s and a deal\'s lines are a body table', () => {
  it.each([
    ['crm_quote_line_item', 'crm_quote', ['crm_product', 'quantity', 'unit_price', 'discount', 'total_price']],
    ['crm_opportunity_line_item', 'crm_opportunity', ['crm_product', 'quantity', 'unit_price', 'total_price']],
  ])('%s.%s is drawn in the parent\'s body, with its declared columns', (object, link, columns) => {
    const fk = field(object, link);
    // The one predicate the console's record page asks (`deriveRelatedLists`,
    // objectstack#27478): true draws a full-width table after the first field
    // group, false a card in the related column.
    expect(isBodyTableRelationship(fk as never)).toBe(true);
    expect(fk.relatedListColumns).toEqual(columns);
    const served = Object.keys((verify.metadata.object(object)?.fields ?? {}) as Rec);
    expect(columns.filter((c) => !served.includes(c))).toEqual([]);
  });

  it('a new deal line offers active products only, as the retired Products picker did', () => {
    expect(field('crm_opportunity_line_item', 'crm_product').lookupFilters).toEqual([
      { field: 'is_active', operator: 'eq', value: true },
    ]);
  });
});
