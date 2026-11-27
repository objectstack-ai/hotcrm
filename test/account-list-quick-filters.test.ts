// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { servedApp, type AnyRec } from './helpers/composed-stack';

/**
 * The account list keeps what the deleted interface page offered (#2740,
 * maintainer ruling 「1b、同意 landing、两点确认、W1」, hotcrm#2740 comment
 * 7181610829, letter W1).
 *
 * The account's ADR-0047 interface page was off the sidebar since #2286 and
 * is deleted by W1, with nothing moved: its rows and columns were the All
 * Accounts view's, and its three quick filters (industry with counts, type,
 * owner) already ship on the Enterprise Accounts view. This pins those two
 * facts on the account's own list, so the page's going loses nothing a user
 * could reach, and pins that the app ships no page over accounts.
 */

const views: AnyRec[] = (stack as AnyRec).views ?? [];
const pages: AnyRec[] = (stack as AnyRec).pages ?? [];
const accountViews = views.find((v) => v.list?.data?.object === 'crm_account');

describe('the account list keeps the deleted interface page\'s columns and quick filters (#2740 W1)', () => {
  it('All Accounts is the account\'s primary list', () => {
    expect(accountViews?.list?.name).toBe('all_accounts');
  });

  it('Enterprise Accounts offers the three dropdown quick filters, industry with counts', () => {
    const filters = accountViews?.listViews?.enterprise_accounts?.userFilters;
    expect(filters?.element).toBe('dropdown');
    expect((filters?.fields ?? []).map((f: AnyRec) => [f.field, f.showCount === true])).toEqual([
      ['industry', true],
      ['type', false],
      ['owner_id', false],
    ]);
  });

  it('the app ships no page over accounts, and the Sales app opens Accounts on its object list', () => {
    expect(pages.filter((p) => p.object === 'crm_account').map((p) => p.name)).toEqual([]);
    const walk = (nodes: AnyRec[]): AnyRec[] =>
      nodes.flatMap((n) => (n.type === 'group' ? walk((n.children ?? []) as AnyRec[]) : [n]));
    const entry = walk((servedApp('crm_enterprise').navigation ?? []) as AnyRec[]).find((n) => n.id === 'nav_account');
    expect(entry).toMatchObject({ type: 'object', objectName: 'crm_account' });
    expect(entry?.viewName).toBeUndefined();
  });
});
