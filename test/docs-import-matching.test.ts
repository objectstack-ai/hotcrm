// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack, { packFor } from './helpers/composed-stack';

/**
 * The import page's matching table is the import mappings' upsert keys (#2329).
 *
 * `src/docs/crm_admin_data_import.md` tells an administrator which column a row
 * is matched on — the reason re-running a file updates rather than duplicates,
 * and the reason a leftover demo record gets overwritten. That is each saved
 * mapping's `upsertKey`, so this file reads it from the compiled stack: one
 * `| **OBJECT** | **FIELD** | … |` row per mapping, the object and field named
 * by their labels (the zh-CN pack's on `.zh.md`), and no row for an object no
 * mapping imports.
 */

type AnyRec = Record<string, any>;
const S = stack as AnyRec;
const MAPPINGS = (S.mappings ?? []) as AnyRec[];
const OBJECTS = new Map<string, AnyRec>((S.objects as AnyRec[]).map((o) => [o.name, o]));
const zh = packFor('zh-CN');

const LOCALES: { suffix: string; object: (o: string) => string; field: (o: string, f: string) => string }[] = [
  { suffix: '.md', object: (o) => String(OBJECTS.get(o)?.label), field: (o, f) => String(OBJECTS.get(o)?.fields?.[f]?.label) },
  { suffix: '.zh.md', object: (o) => String(zh?.objects?.[o]?.label), field: (o, f) => String(zh?.objects?.[o]?.fields?.[f]?.label) },
];

describe('the import page states the key each mapping matches on (#2329)', () => {
  it('reads real mappings', () => {
    expect(MAPPINGS.filter((m) => m.mode === 'upsert').length).toBeGreaterThanOrEqual(3);
  });

  for (const L of LOCALES) {
    const file = `src/docs/crm_admin_data_import${L.suffix}`;
    const rows = [...readFileSync(join(REPO_ROOT, file), 'utf8').matchAll(/^\| \*\*([^*]+)\*\* \| \*\*([^*]+)\*\* \|/gm)]
      .map(([, object, key]) => `${object} → ${key}`);

    it(`${file} has one row per upsert mapping, matched on its upsert key`, () => {
      const expected = MAPPINGS.filter((m) => m.mode === 'upsert').map((m) =>
        `${L.object(m.targetObject)} → ${(m.upsertKey as string[]).map((f) => L.field(m.targetObject, f)).join(' + ')}`);
      expect([...rows].sort()).toEqual([...expected].sort());
    });
  }
});
