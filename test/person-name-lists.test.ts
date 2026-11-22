// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack, { packFor, type AnyRec } from './helpers/composed-stack';

/**
 * A person is listed by their name, and the name is labelled the way a
 * Chinese address book labels it (#2685, the maintainer's plan for the CJK
 * name fields).
 *
 * - zh-CN reads 姓氏 / 名字 / 姓名 (「苹果叫：姓氏 名字」), on the contact and
 *   the lead alike.
 * - Every contact and lead list and card leads with `full_name`, the one name
 *   `personNameSource` composes, and carries no separate given or family
 *   column. Split over two columns, the record link hung off the given name
 *   alone, and a Chinese name read 「伟 | 张」 across two cells.
 * - The lead's `full_name` composes the name with the contact's expression. It
 *   stays a formula, computed on read: storing it would leave every existing
 *   lead's name empty on an upgraded tenant, whose install path fills no
 *   stored computed column (objectstack-ai/objectstack#35390). The stored
 *   half waits on that card.
 *
 * Read off the composed stack: the values `defineView` and `ObjectSchema`
 * parsed and the artifact serves.
 */

const PERSON_OBJECTS = ['crm_contact', 'crm_lead'];
const NAME_PARTS = ['first_name', 'last_name'];

const objectNamed = (name: string): AnyRec =>
  ((stack as AnyRec).objects as AnyRec[]).find((o) => o.name === name)!;
const fieldOf = (column: unknown): string =>
  typeof column === 'string' ? column : String((column as AnyRec)?.field);

const personViews: [string, AnyRec][] = [];
for (const container of ((stack as AnyRec).views ?? []) as AnyRec[]) {
  for (const view of [container.list, ...Object.values(container.listViews ?? {})] as AnyRec[]) {
    if (view?.name && PERSON_OBJECTS.includes(view.data?.object)) personViews.push([`${view.data.object} ${view.name}`, view]);
  }
}

describe('contact and lead lists lead with the full name (#2685)', () => {
  it('reads every list of both objects', () => {
    // all_contacts, contact_directory, primary_contacts and the lead's lists.
    expect(personViews.filter(([k]) => k.startsWith('crm_contact ')).length).toBe(3);
    expect(personViews.filter(([k]) => k.startsWith('crm_lead ')).length).toBeGreaterThanOrEqual(5);
  });

  it.each(personViews)('%s: full_name is the first column after the avatar, and no name part is a column', (_key, view) => {
    const columns = ((view.columns ?? []) as unknown[]).map(fieldOf).filter((f) => f !== 'avatar');
    expect(columns[0]).toBe('full_name');
    for (const part of NAME_PARTS) expect(columns).not.toContain(part);
    const card = view.gallery ?? view.kanban;
    if (card) {
      expect(card.titleField, 'a card is titled by the person').toBe('full_name');
      for (const part of NAME_PARTS) expect(card.visibleFields ?? card.columns ?? []).not.toContain(part);
    }
  });

  it('All Contacts opens a contact from its name and orders by it', () => {
    const [, grid] = personViews.find(([k]) => k === 'crm_contact all_contacts')!;
    const name = (grid.columns as AnyRec[]).find((c) => fieldOf(c) === 'full_name')!;
    expect(name.link).toBe(true);
    expect(grid.sort).toEqual([{ field: 'full_name', order: 'asc' }]);
  });
});

describe("the lead's full name is the contact's name rule, computed on read (#2685)", () => {
  it('crm_lead.full_name is a formula carrying the same expression as crm_contact.full_name', () => {
    const lead = objectNamed('crm_lead').fields.full_name as AnyRec;
    const contact = objectNamed('crm_contact').fields.full_name as AnyRec;
    // A formula until objectstack-ai/objectstack#35390: a stored column
    // would read empty on every lead an upgraded tenant already holds.
    expect(lead.type).toBe('formula');
    expect(lead.expression).toEqual(contact.expression);
  });
});

describe('zh-CN labels the name the way a Chinese address book does (#2685)', () => {
  const zh = packFor('zh-CN') as AnyRec;
  it.each(PERSON_OBJECTS)('%s: 名字 / 姓氏 / 姓名', (object) => {
    const fields = zh.objects?.[object]?.fields as AnyRec;
    expect({
      first_name: fields?.first_name?.label,
      last_name: fields?.last_name?.label,
      full_name: fields?.full_name?.label,
    }).toEqual({ first_name: '名字', last_name: '姓氏', full_name: '姓名' });
    // No help text (the maintainer: the labels say it).
    for (const f of ['first_name', 'last_name', 'full_name']) expect(fields?.[f]?.help, `${object}.${f}`).toBeUndefined();
  });
});
