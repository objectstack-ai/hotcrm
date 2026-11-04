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
import { OpportunityDetailPage } from '../src/sales/pages/opportunity_detail.page';
import { CaseDetailPage } from '../src/service/pages/case_detail.page';
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

/** Every node of a page, depth first. */
const nodes = (node: unknown, out: AnyRec[] = []): AnyRec[] => {
  if (Array.isArray(node)) node.forEach((n) => nodes(n, out));
  else if (node && typeof node === 'object') {
    out.push(node as AnyRec);
    Object.values(node).forEach((v) => nodes(v, out));
  }
  return out;
};
const byId = (page: unknown, id: string): AnyRec | undefined => nodes(page).find((n) => n.id === id);

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
    ['crm_quote', Quote, ['crm_account', 'crm_opportunity', 'status', 'total_price', 'expiration_date']],
    // The product picker's subtitle is [name, ...highlightFields]: List Price
    // shows while picking a product for a quote line (row 4).
    ['crm_product', Product, ['category', 'list_price', 'is_active']],
    ['crm_campaign', Campaign, ['type', 'status', 'start_date', 'budgeted_cost']],
    ['crm_knowledge_article', KnowledgeArticle, ['category', 'status', 'audience', 'helpful_count', 'not_helpful_count']],
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
    expect(byId(CaseDetailPage, 'case_highlights')?.properties.fields).not.toContain('is_sla_violated');
  });

  it('shows an error alert only when the flag is true', () => {
    const alert = byId(CaseDetailPage, 'case_sla_breached');
    expect(alert?.type).toBe('record:alert');
    expect(alert?.properties.severity).toBe('error');
    const visible = JSON.stringify(alert?.properties.visible);
    expect(visible).toContain('has(record.is_sla_violated)');
    expect(visible).toContain('record.is_sla_violated == true');
    for (const key of ['title', 'body']) {
      expect(Object.keys(alert?.properties[key]).sort()).toEqual(['en', 'es-ES', 'ja-JP', 'zh-CN']);
    }
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

describe('row 9: the Related tabs open the panels people work from', () => {
  const opened = (id: string, page: unknown) => {
    const acc = byId(page, id);
    const items = acc?.properties.items as AnyRec[];
    return { multi: acc?.properties.allowMultiple, open: items.filter((i) => i.collapsed === false).map((i) => i.label) };
  };

  it('opens Quotes, Products and Open Tasks on an opportunity', () => {
    // Without `allowMultiple` only the first `collapsed: false` item opens.
    expect(opened('opp_related_accordion', OpportunityDetailPage)).toEqual({
      multi: true,
      open: ['Quotes', 'Products', 'Open Tasks'],
    });
  });

  it('opens Open Tasks on a case', () => {
    // Its first item, so one open panel needs no `allowMultiple`.
    expect(opened('case_related_accordion', CaseDetailPage).open[0]).toBe('Open Tasks');
  });
});
