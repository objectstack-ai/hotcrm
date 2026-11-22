// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import {
  isApiOperationAllowed,
  isBodyTableRelationship,
  resolveEffectiveApiMethods,
} from '@objectstack/spec/data';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * A quote's and a deal's lines: where they sit, and saving them with the
 * parent (#2720).
 *
 * The lines are each parent's body table since #2382 (`relatedList: 'primary'`
 * on the line's link). Where that table sits was left to the record page's own
 * rule, which places it by a default that changes between releases. #2720
 * declares it: a `fieldGroups` entry `{ key, label, relatedList }` right
 * after the basic group (spec `fieldGroups[].relatedList`, objectstack#27069),
 * so the lines read under the quote's or the deal's basic information and
 * before its pricing or financials.
 *
 * Saving a parent together with its lines is one atomic `POST /api/v1/batch`,
 * which the REST layer refuses 405 `OBJECT_API_METHOD_NOT_ALLOWED` unless
 * every object in it allows `bulk` together with the row's own operation.
 */

const objects = (stack.objects ?? []) as AnyRec[];
const object = (name: string): AnyRec => {
  const found = objects.find((o) => o.name === name);
  if (!found) throw new Error(`object ${name} is not in the composed stack`);
  return found;
};

const PAIRS: Array<[parent: string, child: string, link: string]> = [
  ['crm_quote', 'crm_quote_line_item', 'crm_quote'],
  ['crm_opportunity', 'crm_opportunity_line_item', 'crm_opportunity'],
];

describe('the lines are placed right after the basic group', () => {
  it.each(PAIRS)('%s: the second group places the %s table', (parent, child, link) => {
    const groups = object(parent).fieldGroups as AnyRec[];
    expect(groups[0]!.key).toBe('basic');
    expect(groups[1]).toMatchObject({ key: 'line_items', relatedList: child });
    // The group places a table only if the link it names is a body table.
    // A side card would draw nothing there.
    expect(isBodyTableRelationship((object(child).fields as AnyRec)[link] as never)).toBe(true);
    // The table is the only thing in the group: no field names it.
    const members = Object.entries(object(parent).fields as AnyRec)
      .filter(([, f]) => (f as AnyRec).group === 'line_items')
      .map(([name]) => name);
    expect(members).toEqual([]);
  });
});

describe('a parent and its lines can be saved in one batch', () => {
  const allowed = (name: string, op: string): boolean =>
    isApiOperationAllowed(resolveEffectiveApiMethods(object(name).enable), op as never);

  it.each(PAIRS.flatMap(([parent, child]) => [parent, child]))(
    '%s allows bulk with create, update and delete',
    (name) => {
      for (const op of ['bulk', 'create', 'update', 'delete']) {
        expect(allowed(name, op), `${name}: ${op}`).toBe(true);
      }
    },
  );
});
