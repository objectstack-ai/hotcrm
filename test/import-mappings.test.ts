// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack from '../objectstack.config';

/**
 * Import-mapping integrity guards (#603).
 *
 * The three `mapping` artifacts exist so a preview customer can load their own
 * spreadsheet WITHOUT mapping columns by hand. That promise is only as good as
 * two agreements nothing else checks:
 *
 *   1. **mapping → object.** A named mapping is a STRICT PROJECTION: the import
 *      path (`packages/rest/src/import-mapping.ts`) emits only the declared
 *      targets. A target that names no real field is therefore not an error at
 *      import time — the column is simply written into a key the engine drops,
 *      and the import reports a green "created". The same is true of a
 *      `valueMap` whose right-hand side is not a legal option: the value passes
 *      coercion only by accident, or fails a row the author expected to pass.
 *      Both are exactly the class of mistake an AI-authored mapping makes, and
 *      both are silent. These tests make them loud, at PR time.
 *
 *   2. **mapping ↔ template CSV.** The templates in `assets/import-templates/`
 *      are the "no hand-mapping" half of the feature: they only work while
 *      their header row is character-for-character the mapping's `source`
 *      values. Rename a header in either file and the column stops landing —
 *      again with a green import. The header sets are asserted to match
 *      exactly, in both directions.
 *
 * Everything here reads the REGISTERED stack (`objectstack.config.ts`), so a
 * mapping that is authored but never registered fails too — an unregistered
 * mapping is a 404 `MAPPING_NOT_FOUND` at import time.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as AnyRec).objects ?? [];
const mappings: AnyRec[] = (stack as AnyRec).mappings ?? [];

const objectByName = new Map(objects.map((o) => [o.name, o]));

/** The three mappings this app is expected to ship, and their template file. */
const EXPECTED: Array<{ name: string; object: string; template: string; key: string[] }> = [
  { name: 'crm_account_import', object: 'crm_account', template: 'accounts.csv', key: ['name'] },
  { name: 'crm_contact_import', object: 'crm_contact', template: 'contacts.csv', key: ['email'] },
  { name: 'crm_lead_import', object: 'crm_lead', template: 'leads.csv', key: ['email'] },
];

const mappingByName = (name: string): AnyRec => {
  const m = mappings.find((x) => x.name === name);
  expect(m, `mapping '${name}' is not registered on the stack`).toBeDefined();
  return m as AnyRec;
};

/** First element of a `string | string[]` mapping endpoint. */
const first = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);
const all = (v: string | string[]): string[] => (Array.isArray(v) ? v : [v]);

/** Header row of a template CSV, honouring quoted cells. */
const templateHeaders = (file: string): string[] => {
  const text = readFileSync(join(REPO_ROOT, 'assets/import-templates', file), 'utf8');
  const line = text.split('\n')[0].replace(/\r$/, '');
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
};

const templateDataRowCount = (file: string): number =>
  readFileSync(join(REPO_ROOT, 'assets/import-templates', file), 'utf8')
    .split('\n')
    .slice(1)
    .filter((l) => l.trim() !== '').length;

describe('import mappings — registration', () => {
  it('registers exactly the three expected mappings', () => {
    expect(mappings.map((m) => m.name).sort()).toEqual(EXPECTED.map((e) => e.name).sort());
  });

  it.each(EXPECTED)('$name targets $object with upsert on $key', ({ name, object, key }) => {
    const m = mappingByName(name);
    expect(m.targetObject).toBe(object);
    expect(objectByName.has(m.targetObject), `${m.targetObject} is not a declared object`).toBe(true);
    // `mode` + `upsertKey` are what make a re-run of the same file an UPDATE
    // instead of a duplicate — the import route reads them as the defaults for
    // writeMode / matchFields.
    expect(m.mode).toBe('upsert');
    expect(m.upsertKey).toEqual(key);
    // csv is accepted for .xlsx uploads too; json/xml/sql would be rejected by
    // the endpoint for a csv payload.
    expect(m.sourceFormat).toBe('csv');
  });
});

describe('import mappings — every target is a real field', () => {
  it.each(EXPECTED)('$name maps only fields that exist on $object', ({ name, object }) => {
    const m = mappingByName(name);
    const fields = objectByName.get(object)!.fields as Record<string, AnyRec>;
    const unknown = m.fieldMapping
      .flatMap((e: AnyRec) => all(e.target))
      .filter((t: string) => !(t in fields));
    expect(unknown, `unknown target field(s) on ${object}`).toEqual([]);
  });

  it.each(EXPECTED)('$name never writes a readonly or formula field on $object', ({ name, object }) => {
    const m = mappingByName(name);
    const fields = objectByName.get(object)!.fields as Record<string, AnyRec>;
    const bad = m.fieldMapping
      .flatMap((e: AnyRec) => all(e.target))
      .filter((t: string) => {
        const f = fields[t];
        return f?.readonly === true || f?.type === 'formula' || f?.type === 'autonumber' || f?.type === 'summary';
      });
    // The engine drops writes to these (#2948), so mapping one is a column the
    // customer fills in for nothing.
    expect(bad, `computed / readonly target(s) on ${object}`).toEqual([]);
  });

  it.each(EXPECTED)('$name has a unique source header per column', ({ name }) => {
    const m = mappingByName(name);
    const sources = m.fieldMapping.flatMap((e: AnyRec) => all(e.source));
    expect(sources.length).toBe(new Set(sources).size);
  });
});

describe('import mappings — transforms the import path can execute', () => {
  it.each(EXPECTED)('$name uses no javascript transform', ({ name }) => {
    // The endpoint 400s on `javascript` (no server-side sandbox), and
    // `defineStack` fails the build for it — pinned here so the reason is
    // visible at the mapping, not only in a build log.
    const m = mappingByName(name);
    expect(m.fieldMapping.filter((e: AnyRec) => e.transform === 'javascript')).toEqual([]);
  });

  it.each(EXPECTED)('$name maps synonyms onto legal option values of $object', ({ name, object }) => {
    const m = mappingByName(name);
    const fields = objectByName.get(object)!.fields as Record<string, AnyRec>;
    const offenders: string[] = [];
    for (const entry of m.fieldMapping as AnyRec[]) {
      if (entry.transform !== 'map') continue;
      const target = first(entry.target);
      const options: AnyRec[] = fields[target]?.options ?? [];
      expect(options.length, `${target} is mapped with 'map' but declares no options`).toBeGreaterThan(0);
      const legal = new Set(options.map((o) => o.value));
      for (const [source, mapped] of Object.entries(entry.params?.valueMap ?? {})) {
        if (!legal.has(mapped)) offenders.push(`${target}: "${source}" → "${mapped}"`);
      }
    }
    expect(offenders, `valueMap entries pointing at non-existent options on ${object}`).toEqual([]);
  });

  it.each(EXPECTED)('$name resolves reference columns through lookup targets on $object', ({ name, object }) => {
    const m = mappingByName(name);
    const fields = objectByName.get(object)!.fields as Record<string, AnyRec>;
    const REFERENCE_TYPES = new Set(['lookup', 'master_detail', 'user']);
    for (const entry of m.fieldMapping as AnyRec[]) {
      const target = first(entry.target);
      const type = fields[target]?.type;
      if (entry.transform === 'lookup') {
        expect(REFERENCE_TYPES.has(type), `${target} is transform:'lookup' but is a ${type} field`).toBe(true);
      }
      if (REFERENCE_TYPES.has(type)) {
        expect(entry.transform, `${target} is a reference field and must declare transform:'lookup'`).toBe('lookup');
      }
    }
  });

  it('resolves every owner column against sys_user', () => {
    // The import path resolves a reference cell by id → displayField → name /
    // title / label / full_name / email / username, so an owner-EMAIL column
    // only works while the owner field points at an object carrying `email`.
    // Tracked on #548: the target becomes `owner_id` when the platform owner
    // model lands; this assertion should follow it there.
    for (const { name, object } of EXPECTED) {
      const m = mappingByName(name);
      const fields = objectByName.get(object)!.fields as Record<string, AnyRec>;
      const ownerEntry = (m.fieldMapping as AnyRec[]).find((e) => first(e.target) === 'owner_id');
      expect(ownerEntry, `${name} maps no owner column`).toBeDefined();
      expect(first(ownerEntry!.source)).toMatch(/Owner Email$/);
      expect(fields.owner_id.reference).toBe('sys_user');
    }
  });
});

describe('import mappings — a template CSV imports without hand-mapping', () => {
  it.each(EXPECTED)('$template headers match $name exactly', ({ name, template }) => {
    const m = mappingByName(name);
    const declared = (m.fieldMapping as AnyRec[]).flatMap((e) => all(e.source)).sort();
    const headers = templateHeaders(template).sort();
    // Both directions: a header with no mapping entry is a column the customer
    // fills in that silently goes nowhere; a mapping entry with no header is a
    // field the template can never populate.
    expect(headers).toEqual(declared);
  });

  it.each(EXPECTED)('$template ships at least 50 example rows', ({ template }) => {
    expect(templateDataRowCount(template)).toBeGreaterThanOrEqual(50);
  });

  it.each(EXPECTED)('$name covers every field $object requires on create', ({ name, object }) => {
    const m = mappingByName(name);
    const fields = objectByName.get(object)!.fields as Record<string, AnyRec>;
    const mapped = new Set((m.fieldMapping as AnyRec[]).flatMap((e) => all(e.target)));
    const missing = Object.entries(fields)
      .filter(([fieldName, f]) =>
        f.required === true
        && f.defaultValue === undefined
        && f.readonly !== true
        && f.type !== 'autonumber'
        && f.type !== 'formula'
        && !mapped.has(fieldName))
      .map(([fieldName]) => fieldName);
    // A required field the mapping cannot fill makes EVERY row of the template
    // fail with `required` — the import can never succeed.
    expect(missing, `required field(s) of ${object} no template column can fill`).toEqual([]);
  });
});

describe('import mappings — the docs describe what ships', () => {
  const doc = readFileSync(join(REPO_ROOT, 'content/docs/guides/importing-your-data.mdx'), 'utf8');

  it.each(EXPECTED)('the import guide names $name and $template', ({ name, template }) => {
    expect(doc).toContain(name);
    expect(doc).toContain(template);
  });

  it('the import guide documents the undo call', () => {
    // The undo path is the whole reason the guide points at the JOB endpoint
    // rather than the synchronous one — a sync import captures no undo log.
    expect(doc).toContain('data.undoImportJob');
    expect(doc).toContain('/import/jobs');
  });

  it.each(EXPECTED)('every $name column header is documented', ({ name, template }) => {
    // Column reference drift: a header added to the template without a line in
    // the guide leaves the customer guessing what it does.
    void name;
    for (const header of templateHeaders(template)) {
      expect(doc, `header "${header}" is missing from the import guide`).toContain(`\`${header}\``);
    }
  });
});
