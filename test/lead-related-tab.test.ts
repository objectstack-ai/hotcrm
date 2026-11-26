// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { type AnyRec, localePacks } from './helpers/composed-stack';
import { EventViews } from '../src/sales/views/event.view';

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const pages: AnyRec[] = (stack as AnyRec).pages ?? [];

/**
 * What a lead record lists beside it (#2127, moved onto the object by #2382).
 *
 * #2127 gave the lead's authored Related tab four sections: Tasks, Events
 * (upcoming first), Campaign Members and a Conversion section. #2382 retired
 * that page to the synthesized default page, which draws a record's related
 * lists from the CHILD's foreign key (the related column) and its own field
 * groups (the Details body). So the same four facts now live on object
 * metadata, and this file pins them there:
 *
 *   - the lead authors no record page at all since #2740, so no related list
 *     of its own;
 *   - each list is reached through a lookup on the child that points at the
 *     lead, and none is suppressed (`relatedList: false`);
 *   - Tasks are the open ones only (`relatedListFilter`), with their columns;
 *   - Events show their start beside the subject, upcoming first through the
 *     event's default list view sort, which a derived list inherits;
 *   - Conversion is the lead's `conversion` field group, folded on arrival;
 *   - each list is headed by its object's plural label in every locale pack.
 *
 * The rows themselves were read in a browser against `objectstack dev` on the
 * 18.6.0 pin (the #2382 PR body has the reading).
 */

const byName = (name: string): AnyRec => {
  const obj = objects.find((o) => o.name === name);
  if (!obj) throw new Error(`no object named "${name}" in the composed stack`);
  return obj;
};
const LEAD = byName('crm_lead');
const leadPages = pages.filter((p) => p.object === 'crm_lead');

const LISTS: Array<[string, string]> = [
  ['crm_task', 'related_to_lead'],
  ['crm_event', 'related_to_lead'],
  ['crm_campaign_member', 'crm_lead'],
];
const fk = (object: string, field: string): AnyRec => byName(object).fields?.[field] ?? {};

describe('the lead record lists its tasks, events and campaign memberships', () => {
  it('authors no record page at all: the default page derives the lists (#2740)', () => {
    expect(leadPages.map((p) => p.name)).toEqual([]);
  });

  it.each(LISTS)('reaches %s through %s, a lookup on the lead that is not suppressed', (object, field) => {
    const f = fk(object, field);
    expect(f.type, `${object}.${field}`).toBe('lookup');
    expect(f.reference, `${object}.${field}`).toBe('crm_lead');
    expect(f.relatedList, `${object}.${field} hides the list`).not.toBe(false);
  });

  it('lists the open tasks only, with the columns the retired page named', () => {
    const f = fk('crm_task', 'related_to_lead');
    expect(f.relatedListFilter).toEqual({ status: { $ne: 'completed' } });
    expect(f.relatedListColumns).toEqual(['subject', 'status', 'priority', 'due_date', 'owner_id']);
  });
});

describe('the Events list puts upcoming events first', () => {
  it('shows the start beside the subject, where a narrow window still draws it', () => {
    expect(fk('crm_event', 'related_to_lead').relatedListColumns?.slice(0, 2)).toEqual(['subject', 'start_datetime']);
  });

  it('sorts by start, newest first, through the default list view a derived list inherits', () => {
    expect((EventViews as AnyRec).list?.sort).toEqual([{ field: 'start_datetime', order: 'desc' }]);
  });

  it('sorts on a start every event has', () => {
    const start = byName('crm_event').fields.start_datetime;
    expect(start.required).toBe(true);
    expect(start.storage?.notNull).toBe(true);
  });
});

describe('the Conversion section is the lead\'s conversion field group', () => {
  const group = ((LEAD.fieldGroups ?? []) as AnyRec[]).find((g) => g.key === 'conversion');
  const members = Object.entries((LEAD.fields ?? {}) as Record<string, AnyRec>).filter(
    ([, f]) => f?.group === 'conversion' && f?.hidden !== true,
  );

  it('opens folded, so an unconverted lead is not led by an empty section', () => {
    expect(group?.collapse).toBe('collapsed');
  });

  it('links the converted account, contact and opportunity', () => {
    const targets = Object.fromEntries(
      members.filter(([, f]) => f.type === 'lookup').map(([name, f]) => [name, f.reference]),
    );
    expect(targets).toEqual({
      converted_account: 'crm_account',
      converted_contact: 'crm_contact',
      converted_opportunity: 'crm_opportunity',
    });
  });
});

describe('each list is headed in the language-pack wording', () => {
  it.each(LISTS)("%s carries a plural label in every shipped locale", (object) => {
    expect(localePacks.length).toBeGreaterThan(0);
    for (const [locale, pack] of localePacks) {
      expect(pack.objects?.[object]?.pluralLabel, `${locale}: objects.${object}.pluralLabel`).toBeTruthy();
    }
  });
});
