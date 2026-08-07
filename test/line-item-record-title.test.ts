// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { objectTitleCompleteness } from '@objectstack/spec/data';
import { ObjectKernel } from '@objectstack/core';
import { DefaultDatasourcePlugin, AppPlugin } from '@objectstack/runtime';
import { ObjectQLPlugin } from '@objectstack/objectql';
import { MetadataPlugin } from '@objectstack/metadata';

import stack from '../objectstack.config';
import { OpportunityLineItem } from '../src/objects/opportunity_line_item.object';
import { QuoteLineItem } from '../src/objects/quote_line_item.object';
import { OpportunityDetailPage } from '../src/pages/opportunity_detail.page';

/**
 * The record title of the two line-item objects (#1031, #733).
 *
 * ### What was broken
 *
 * A line item has no navigation entry and no page of its own — it is only ever
 * seen as a ROW in someone else's panel — so its title is the whole of what a
 * user reads about it. Neither object declared one, and the "Products" card in
 * the opportunity detail page's reference rail rendered bare cuids
 * (`1I4gIPKsDXQIqQv3`, …) where the product line should be.
 *
 * ### Two fixes, because there are two resolvers
 *
 * The issue attributed the whole symptom to the missing `nameField`. Only half
 * of that holds, and the half that does not is what this file pins hardest:
 * **the reference rail never reads the object.** Measured against the console
 * build this app installs (`@objectstack/console@17.0.0-rc.4`,
 * `dist/assets/plugins-views-*.js`), a rail preview row's label is
 * `entry.displayField` else a hard-coded chain of eleven record keys else
 * `row.id` — with no step that consults `nameField`. So:
 *
 *   - `nameField: 'description'` on both objects serves every consumer that DOES
 *     read it (lookup pickers, global search, record drawers, related lists,
 *     `getRecordDisplayName`), and
 *   - `displayField: 'description'` on the rail entry is what actually clears
 *     the screenshot on #1031.
 *
 * Landing only the first would satisfy "nameField is declared and evaluates
 * non-empty" while leaving the reported card exactly as it was. The
 * `railLabel` cases below are written against the measured chain precisely so
 * that a future edit dropping either half fails here rather than in a dogfood
 * screenshot two releases later.
 *
 * ### How to read a failure
 *
 * `the console fallback chain still cannot resolve a line item on its own` is
 * the one case that is GOOD news when it fails: it means a line-item object
 * grew a `name`/`title`/`subject`/… column, the rail resolves it unaided, and
 * the `displayField` entry key is now redundant. Every other failure here is a
 * regression of #1031.
 */

type AnyRec = Record<string, any>;

// The object registry announces every registered object on stdout at `info`;
// silence it so the one thing this file reports is not buried.
process.env.OS_REGISTRY_LOG ??= 'silent';

const SYS = { isSystem: true } as AnyRec;

/** The opportunity #1031 was filed against, by name. */
const SUBJECT_OPPORTUNITY = 'Vertex Analytics Expansion';

const LINE_ITEM_OBJECTS: Array<[string, AnyRec]> = [
  ['crm_opportunity_line_item', OpportunityLineItem as AnyRec],
  ['crm_quote_line_item', QuoteLineItem as AnyRec],
];

/**
 * The console's rail label resolver, transcribed from the installed rc.4 bundle
 * (`plugins-views-*.js`, minified as `Ma`). Kept verbatim rather than imported:
 * it lives in a built asset with no module entry point, and transcribing it is
 * what lets the assertions below state what a USER sees instead of what the
 * metadata claims.
 */
const railLabel = (row: AnyRec, displayField?: string): string => {
  if (displayField && row?.[displayField] != null && row[displayField] !== '') {
    return String(row[displayField]);
  }
  return (
    row?.name ||
    row?.title ||
    row?.subject ||
    row?.label ||
    row?.email ||
    row?.username ||
    row?.code ||
    row?.slug ||
    row?.provider_id ||
    row?.user_agent ||
    row?.ip_address ||
    row?.id ||
    '—'
  );
};

/** The eleven keys that chain probes before it gives up and prints the id. */
const CONSOLE_FALLBACK_KEYS = [
  'name', 'title', 'subject', 'label', 'email', 'username',
  'code', 'slug', 'provider_id', 'user_agent', 'ip_address',
] as const;

/** The reference-rail entries authored on the opportunity detail page. */
const railEntries = (): AnyRec[] => {
  const found: AnyRec[] = [];
  const walk = (node: AnyRec | undefined): void => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (node.type === 'record:reference_rail') {
      const entries = node.properties?.entries;
      if (Array.isArray(entries)) found.push(...entries);
    }
    for (const value of Object.values(node)) walk(value as AnyRec);
  };
  walk(OpportunityDetailPage as AnyRec);
  return found;
};

// ────────────────────────────────────────── the declared title ──

describe('both line-item objects declare a record title', () => {
  it.each(LINE_ITEM_OBJECTS)('%s declares a nameField naming a real field', (name, schema) => {
    const nameField = schema.nameField;
    expect(nameField, `${name} declares no nameField — every consumer falls back to the raw id`)
      .toBeTypeOf('string');

    const def = schema.fields?.[nameField];
    expect(def, `${name}.nameField names "${nameField}", which is not a field on the object`).toBeTruthy();
    expect(def.hidden, `${name}.${nameField} is hidden — it cannot be the record title`).not.toBe(true);
  });

  /**
   * A STORED text column, deliberately — not a formula. A formula that faults
   * evaluates to `null` and leaves the record titleless with no error anywhere,
   * which is exactly how `crm_forecast.display_title` spent months null on a
   * `text()` that has never been in `CEL_STDLIB_FUNCTIONS` (#690). It also keeps
   * `$search` on a real column: `autoDefaultFields` promotes a text display
   * field to the lead search field, whereas a formula needs a companion
   * `searchableFields` (see `test/actions-flows-integrity.test.ts`).
   */
  it.each(LINE_ITEM_OBJECTS)('%s titles itself from a stored text column', (name, schema) => {
    const def = schema.fields?.[schema.nameField];
    expect(
      def.type,
      `${name}.${schema.nameField} is a ${def.type}; a formula title can fault to null (#690), ` +
        'and a lookup title renders the referenced record id',
    ).toBe('text');
  });

  /**
   * Declaring the title must not RETARGET it. The platform already graded both
   * objects `{ status: 'derived', field: 'description' }` — the declaration
   * makes that explicit so consumers which do not run the derivation reach the
   * same answer, which is the whole of ADR-0079's "declared beats derived".
   */
  it.each(LINE_ITEM_OBJECTS)('%s makes the already-derived title explicit', (_name, schema) => {
    const completeness = objectTitleCompleteness(schema as never) as AnyRec;
    expect(completeness.status).toBe('explicit');
    expect(completeness.field).toBe(schema.nameField);
  });
});

// ─────────────────────────────────── the rail entry (the visible fix) ──

describe('the opportunity reference rail can label a line-item row', () => {
  const entries = railEntries();

  it('the page walk actually found the rail entries', () => {
    expect(entries.length, 'no record:reference_rail entries parsed out of the page').toBeGreaterThan(2);
    expect(entries.map((e) => e.objectName)).toContain('crm_opportunity_line_item');
  });

  /**
   * The negative control, and the reason the entry key is needed at all. If this
   * ever fails, a line-item object grew one of the chain's keys and the rail
   * resolves it unaided — see the file header.
   */
  it.each(LINE_ITEM_OBJECTS)(
    'the console fallback chain still cannot resolve a %s on its own',
    (name, schema) => {
      const hits = CONSOLE_FALLBACK_KEYS.filter((k) => schema.fields?.[k]);
      expect(
        hits,
        `${name} now carries ${hits.join(', ')} — the rail would resolve it without displayField`,
      ).toEqual([]);
    },
  );

  it('the line-item entry declares displayField, agreeing with the object nameField', () => {
    const entry = entries.find((e) => e.objectName === 'crm_opportunity_line_item') as AnyRec;
    expect(entry, 'no crm_opportunity_line_item entry on the rail').toBeTruthy();
    expect(
      entry.displayField,
      'the rail reads entry.displayField, never the object nameField — without this key the ' +
        'card renders raw record ids (#1031)',
    ).toBe('description');
    expect(
      entry.displayField,
      'the rail label and the record title must not drift apart',
    ).toBe((OpportunityLineItem as AnyRec).nameField);
  });

  it('the entry does not point displayField at a lookup', () => {
    // A lookup hands the row an id, so a displayField aimed at `crm_product`
    // reproduces the exact defect it was added to fix.
    for (const entry of entries) {
      if (!entry.displayField) continue;
      const schema = LINE_ITEM_OBJECTS.find(([n]) => n === entry.objectName)?.[1];
      if (!schema) continue;
      const def = schema.fields?.[entry.displayField];
      expect(def?.type, `${entry.objectName}.${entry.displayField} is a lookup`).not.toBe('lookup');
    }
  });
});

// ───────────────────────────────── evaluated on the real seeded data ──

describe('the title evaluates non-empty on the seeded data the app ships', () => {
  let kernel: AnyRec;
  let ql: AnyRec;
  let opportunityLines: AnyRec[] = [];
  let quoteLines: AnyRec[] = [];

  beforeAll(async () => {
    // The shipped stack over the shipped seed data — no fixture. "Evaluates
    // non-empty" is only worth asserting against the rows a user actually opens.
    kernel = new ObjectKernel({ logger: { level: 'silent' } } as never);
    await kernel.use(new DefaultDatasourcePlugin({ driver: 'memory', config: {} } as never));
    await kernel.use(
      new MetadataPlugin({ watch: false, artifactWatch: false, environmentId: 'proj_title' } as never),
    );
    await kernel.use(new ObjectQLPlugin({ environmentId: 'proj_title' } as never));
    await kernel.use(new AppPlugin(stack as never, undefined as never, {} as never));
    await kernel.bootstrap();
    ql = kernel.getService('objectql');

    const opps = await ql.find(
      'crm_opportunity',
      { where: { name: SUBJECT_OPPORTUNITY } },
      { context: SYS },
    );
    opportunityLines = await ql.find(
      'crm_opportunity_line_item',
      { where: { crm_opportunity: opps[0]?.id } },
      { context: SYS },
    );
    quoteLines = await ql.find('crm_quote_line_item', { where: {} }, { context: SYS });
  }, 120_000);

  afterAll(async () => {
    await kernel?.shutdown?.();
  });

  it('the harness loaded the records #1031 was filed against', () => {
    expect(
      opportunityLines.length,
      `no seeded line items under "${SUBJECT_OPPORTUNITY}" — the assertions below would pass vacuously`,
    ).toBeGreaterThan(0);
    expect(quoteLines.length).toBeGreaterThan(0);
  });

  it.each([
    ['crm_opportunity_line_item', () => opportunityLines, () => (OpportunityLineItem as AnyRec).nameField],
    ['crm_quote_line_item', () => quoteLines, () => (QuoteLineItem as AnyRec).nameField],
  ])('every seeded %s row resolves its nameField to a non-empty value', (name, rows, field) => {
    const nameField = field();
    const titleless = rows()
      .filter((row) => {
        const v = row[nameField];
        return typeof v !== 'string' || v.trim() === '';
      })
      .map((row) => String(row.id));
    expect(
      titleless,
      `${name} rows whose ${nameField} is empty — these render as a raw id:\n  ${titleless.join('\n  ')}`,
    ).toEqual([]);
  });

  it('a title never resolves to the record id', () => {
    for (const row of [...opportunityLines, ...quoteLines]) {
      expect(String(row.description)).not.toBe(String(row.id));
    }
  });

  /**
   * The user-visible assertion, and the reverse control alongside it: run the
   * measured console chain over the real rows both ways. WITH the entry key the
   * card reads the line description; WITHOUT it the same rows fall straight to
   * the id — which is the #1031 screenshot, reproduced here rather than
   * described. The direction was predicted before the run: the object's
   * `nameField` is not on the chain, so removing the entry key must restore the
   * id, not merely change the wording.
   */
  it('the rail card renders the description, and renders the id without the entry key', () => {
    const entry = railEntries().find((e) => e.objectName === 'crm_opportunity_line_item') as AnyRec;

    for (const row of opportunityLines) {
      expect(railLabel(row, entry.displayField)).toBe(String(row.description));
      expect(railLabel(row, entry.displayField)).not.toBe(String(row.id));
      // Reverse control: the object's declared nameField does not enter here.
      expect(
        railLabel(row, undefined),
        'the rail resolved a line item without displayField — the chain changed, re-measure it',
      ).toBe(String(row.id));
    }
  });
});
