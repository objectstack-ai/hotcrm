// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { mailHolePattern, parseMailHole } from '@objectstack/formula';
import stack, { type AnyRec } from './helpers/composed-stack';

/**
 * Every hole a notification template prints is a variable it declares
 * `required` (hotcrm#2451, the maintainer's ruling A).
 *
 * A send that omits a declared variable is refused with `MISSING_VARIABLES`
 * naming it, where it used to mail the sentence with a blank in it. That
 * holds only for the holes the declaration names, so this pins the
 * declaration to the text: in every locale row, the roots of the holes it
 * prints are exactly the variables it declares, each one `required`, and the
 * four rows of one template declare the same list. The holes are read with
 * the platform's own hole grammar (`@objectstack/formula`), so a hole with a
 * formatter (`{{amount | number:2}}`) reads `amount` here as it does at send.
 *
 * Whether each SENDING flow passes every declared variable is not asserted
 * here: `pnpm lint` (`os lint --strict`) refuses a `notify` node whose
 * `templateData` omits one (`notify-template-variable-missing`).
 */

const rows = (stack as AnyRec).emailTemplates as AnyRec[];

/** The root of every hole path one row prints, in subject and both bodies. */
const holeRoots = (row: AnyRec): string[] => {
  const roots = new Set<string>();
  for (const face of [row.subject, row.bodyHtml, row.bodyText]) {
    if (typeof face !== 'string') continue;
    for (const m of face.matchAll(mailHolePattern())) {
      const hole = parseMailHole(m[2]!, m[0]);
      if (hole) roots.add(hole.path.split('.')[0]!);
    }
  }
  return [...roots].sort();
};

const byName = new Map<string, AnyRec[]>();
for (const row of rows) byName.set(row.name, [...(byName.get(row.name) ?? []), row]);

describe('notification template variables (#2451)', () => {
  it('reads the composed stack, not an empty one', () => {
    expect(byName.size).toBeGreaterThan(20);
    for (const [name, members] of byName) expect(members.length, name).toBe(4);
  });

  it.each([...byName.keys()])('%s: each locale row declares exactly the holes it prints, all required', (name) => {
    for (const row of byName.get(name)!) {
      const declared = (row.variables ?? []) as AnyRec[];
      const where = `${name} (${row.locale})`;
      expect(declared.map((v) => v.name).sort(), `${where}: declared vs printed`).toEqual(holeRoots(row));
      for (const v of declared) expect(v.required, `${where}: ${v.name}`).toBe(true);
    }
  });

  it.each([...byName.keys()])('%s: the four locale rows declare the same variables', (name) => {
    const [first, ...rest] = byName.get(name)!;
    for (const row of rest) expect(row.variables, `${name}: ${row.locale} vs ${first!.locale}`).toEqual(first!.variables);
  });

  it('no hole prints a literal default in place of a missing value', () => {
    const defaults = rows.flatMap((row) => [row.subject, row.bodyHtml, row.bodyText]
      .filter((face): face is string => typeof face === 'string')
      .flatMap((face) => [...face.matchAll(mailHolePattern())])
      .filter((m) => parseMailHole(m[2]!, m[0])?.formatter === 'default')
      .map((m) => `${row.name} (${row.locale}): ${m[0]}`));
    expect(defaults).toEqual([]);
  });
});
