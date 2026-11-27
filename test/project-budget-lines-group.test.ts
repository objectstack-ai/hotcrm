// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { fieldGroupsPlaceRelationship, isBodyTableRelationship } from '@objectstack/spec/data';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * A project budget's lines sit in a group of the budget (objectstack#35889).
 *
 * After that platform change, a master-detail child is inlined in its
 * parent's form, and drawn in the record page's body, only where a field
 * group of the parent names it; the link's `inlineEdit: 'grid'` then only
 * picks the form factor. The budget therefore names its lines in a `lines`
 * group between the version (`basic`) and its `totals`, so the New / Edit
 * Budget form keeps its line grid and the record page keeps the lines' table
 * where a planner reads it: under the version, above what it adds up to.
 */

const objects = (stack.objects ?? []) as AnyRec[];
const object = (name: string): AnyRec => {
  const found = objects.find((o) => o.name === name);
  if (!found) throw new Error(`object ${name} is not in the composed stack`);
  return found;
};

describe('crm_project_budget places its lines between the version and the totals', () => {
  const budget = object('crm_project_budget');
  const groups = budget.fieldGroups as AnyRec[];

  it('the lines group sits right after basic and right before totals', () => {
    expect(groups.map((g) => g.key)).toEqual(['basic', 'lines', 'totals']);
    expect(groups[1]).toMatchObject({ key: 'lines', relatedList: 'crm_project_budget_line' });
  });

  it('the link it names is a body table', () => {
    // A plain master-detail link is a body table only where a field group of
    // its parent places it (objectstack#35889); from Protocol 19 the verdict
    // takes that placement as an argument, so it is asked with the budget's
    // own groups. A side card would draw nothing there.
    const link = (object('crm_project_budget_line').fields as AnyRec).crm_project_budget;
    const placedByGroup = fieldGroupsPlaceRelationship(groups, 'crm_project_budget_line', 'crm_project_budget');
    expect(placedByGroup).toBe(true);
    expect(isBodyTableRelationship(link as never, { placedByGroup })).toBe(true);
  });

  it('the group holds no fields', () => {
    const members = Object.entries(budget.fields as AnyRec)
      .filter(([, f]) => (f as AnyRec).group === 'lines')
      .map(([name]) => name);
    expect(members).toEqual([]);
  });
});
