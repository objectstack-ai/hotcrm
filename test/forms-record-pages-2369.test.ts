// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { ContactViews } from '../src/sales/views/contact.view';
import { LeadViews } from '../src/sales/views/lead.view';
import { Lead } from '../src/sales/objects/lead.object';
import { Account } from '../src/sales/objects/account.object';
import { Quote } from '../src/revenue/objects/quote.object';
import { Product } from '../src/revenue/objects/product.object';
import { Campaign } from '../src/marketing/objects/campaign.object';
import { KnowledgeArticle } from '../src/service/objects/knowledge_article.object';
import { Case } from '../src/service/objects/case.object';
import { Task } from '../src/sales/objects/task.object';
import { OpportunityLineItem } from '../src/revenue/objects/opportunity_line_item.object';
import { SendEmailAction } from '../src/sales/actions/contact.actions';
import {
  ContactLogCallAction,
  OpportunityLogMeetingAction,
  AccountScheduleMeetingAction,
} from '../src/sales/actions/activity-actions';

type AnyRec = Record<string, any>;

/**
 * UX card 5 (#2369): forms, record pages and the record header. Each block
 * below pins one row's metadata, measured in the console on 18.2.0 before it
 * was written; the before / after screenshots are on the PR.
 */

const fieldName = (f: unknown): string => (typeof f === 'string' ? f : (f as AnyRec)?.field);
const section = (view: AnyRec, name: string): AnyRec =>
  (view.form?.sections ?? []).find((s: AnyRec) => s.name === name);

describe('row 1: a new contact’s required and reachable fields share the first tab', () => {
  it('puts email and phone in the identity section, beside the required names', () => {
    // On the old layout Email sat on the second tab, so its format error
    // appeared on a tab the user was not looking at.
    const identity = section(ContactViews as AnyRec, 'identity');
    const fields = (identity.fields as unknown[]).map(fieldName);
    expect(fields).toEqual(expect.arrayContaining(['first_name', 'last_name', 'crm_account', 'email', 'phone']));
    expect(identity.columns).toBe(3);
  });
});

describe('row 2: the lead form', () => {
  it('lays salutation, first and last name out on one row', () => {
    const info = section(LeadViews as AnyRec, 'contact_information');
    expect(info.columns).toBe(3);
    const fields = info.fields as AnyRec[];
    expect(fields.slice(0, 3).map(fieldName)).toEqual(['salutation', 'first_name', 'last_name']);
    // `defineView` fills `span: 'auto'`; a `'full'` last name took a row alone.
    expect(fields.slice(0, 3).map((f) => f.span)).toEqual(['auto', 'auto', 'auto']);
  });

  it('says a blank rating is scored for you', () => {
    expect(String((Lead.fields as AnyRec).rating.description)).toMatch(/Leave blank/);
  });
});

describe('row 3: the Send Email dialog says where the email goes', () => {
  it('carries a description and no unfilled template hole', () => {
    // 18.2.0 opens the dialog without the row, so `{{ record.x }}` would print raw.
    expect(SendEmailAction.description).toMatch(/this contact's email address/);
    expect(SendEmailAction.description).not.toMatch(/\{\{/);
  });
});

describe('rows 4 and 5: the record header and pickers lead with what people scan for', () => {
  it.each([
    ['crm_account', Account, ['account_number', 'tier', 'health_score', 'annual_revenue', 'owner_id']],
    // Row 10 (ruling A): the title is the name alone, so the number leads the
    // strip and is the lookup picker's subtitle under the name.
    ['crm_quote', Quote, ['quote_number', 'crm_account', 'crm_opportunity', 'status', 'total_price', 'expiration_date']],
    // The product picker's table is [name, ...highlightFields] up to four
    // columns: List Price still shows while picking a product for a quote line
    // (row 4), after the code (row 10).
    ['crm_product', Product, ['product_code', 'category', 'list_price', 'is_active']],
    ['crm_campaign', Campaign, ['campaign_code', 'type', 'status', 'start_date', 'budgeted_cost']],
    ['crm_knowledge_article', KnowledgeArticle, ['article_number', 'category', 'status', 'audience', 'helpful_count', 'not_helpful_count']],
  ])('%s highlights', (_name, object, expected) => {
    expect((object as AnyRec).highlightFields).toEqual(expected);
  });

  it('keeps related-list columns that the highlights used to supply', () => {
    // Without `relatedListColumns` a related list shows the child's
    // highlightFields, so each lookup the new highlights changed pins its own.
    const f = (o: AnyRec, name: string) => (o.fields as AnyRec)[name].relatedListColumns;
    expect(f(Account, 'parent_account')).toEqual(['account_number', 'name', 'type', 'owner_id']);
    expect(f(Quote, 'crm_account')).toEqual(['quote_number', 'name', 'status', 'total_price']);
    expect(f(Quote, 'crm_contact')).toEqual(['quote_number', 'name', 'crm_account', 'status', 'total_price']);
    expect(f(Quote, 'crm_opportunity')).toEqual(['quote_number', 'name', 'crm_account', 'status', 'total_price']);
    expect(f(KnowledgeArticle, 'related_to_case')).toEqual(['article_number', 'title', 'category', 'status', 'audience']);
  });
});

describe('row 6: a case shows a breached SLA, and nothing red when on track', () => {
  it('leaves the flag out of the highlights strip', () => {
    // Since #2382 the strip is the default page's, drawn from the object's
    // `highlightFields`; the SLA due date stays on it.
    expect((Case as AnyRec).highlightFields).not.toContain('is_sla_violated');
    expect((Case as AnyRec).highlightFields).toContain('sla_due_date');
  });

  // The red banner went with the case's page (#2740, maintainer 2026-11-25):
  // a breached case shows SLA Violated ticked in the SLA & Priority section,
  // which has no toggle, so it shows without a click or a banner.
  it('shows the flag in an always-open section', () => {
    expect((Case as AnyRec).fields.is_sla_violated.group).toBe('sla');
    const sla = ((Case as AnyRec).fieldGroups as AnyRec[]).find((g) => g.key === 'sla');
    expect(sla?.collapse ?? 'none').toBe('none');
  });
});

describe('row 7: an article opens on its body', () => {
  it('orders the content group first', () => {
    expect((KnowledgeArticle as AnyRec).fieldGroups[0].key).toBe('content');
  });
});

describe('row 8: the attendee picker says the record is added for you', () => {
  it.each([ContactLogCallAction, OpportunityLogMeetingAction, AccountScheduleMeetingAction])(
    '$name',
    (action) => {
      const param = (action.params as AnyRec[]).find((p) => p.name === 'attendee_contacts');
      expect(param?.helpText).toMatch(/added automatically/);
    },
  );
});

describe('row 9: the record opens on the panels people work from', () => {
  // #2369 opened the authored Related tabs' accordions on arrival. Since #2382
  // the record pages are the default page, whose related column draws every
  // derived list as an open card and the line items in the body; what is left
  // to pin is that the lists exist, are not suppressed, and keep the scope the
  // panels had (Open Tasks).
  const fk = (o: AnyRec, name: string): AnyRec => (o.fields as AnyRec)[name];
  const OPEN_TASKS = { status: { $ne: 'completed' } };

  it('shows Quotes, the product lines and Open Tasks on an opportunity', () => {
    expect(fk(Quote, 'crm_opportunity').relatedList).not.toBe(false);
    expect(fk(OpportunityLineItem, 'crm_opportunity').relatedList).toBe('primary');
    expect(fk(Task, 'related_to_opportunity').relatedListFilter).toEqual(OPEN_TASKS);
  });

  it('shows Open Tasks on a case', () => {
    expect(fk(Task, 'related_to_case').relatedListFilter).toEqual(OPEN_TASKS);
  });

});
