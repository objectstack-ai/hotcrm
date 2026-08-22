// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { CrmTranslations } from '../src/translations';
import leadHooks from '../src/objects/lead.hook';
import {
  DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS,
  DUPLICATE_OF_TYPE_ERASED,
  DUPLICATE_OF_TYPE_OPTIONS,
} from '../src/objects/_picklists';
import { REPO_ROOT } from './helpers/repo-root';

/**
 * Soft lead dedupe (#598) — a returning prospect is RECORDED, not rejected.
 *
 * `crm_lead.email` used to carry a hard `unique: true`, so the second enquiry
 * from the same person was refused by the database: a re-submitted Web-to-Lead
 * form answered a returning visitor with a save error, and the `duplicate`
 * option on `disqualification_reason` pointed at nothing you could open.
 *
 * What replaced it is deliberately split in two, and both halves are pinned
 * here against a REAL ObjectQL engine carrying the REAL `crm_lead` schema —
 * metadata assertions alone cannot tell an enforced rule from a decorative one,
 * and this feature has already produced one rule that read as enforced and was
 * silently skipped (see "predicates are total" below):
 *
 *   - INTAKE is a guess. `lead_duplicate_check` links a re-captured address to
 *     the record it repeats and marks it `suspected`.
 *   - DISQUALIFICATION is a verdict. Closing a lead as a duplicate requires
 *     naming the survivor and setting `confirmed`, enforced by declarative
 *     metadata (one script validation + two `requiredWhen` predicates), with no
 *     hook involved.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const lead = objects.find((o) => o.name === 'crm_lead') as AnyRec;
const contact = objects.find((o) => o.name === 'crm_contact') as AnyRec;
const views: AnyRec[] = (stack as any).views ?? [];
const leadView = views.find(
  (v) => (v.list?.data?.object ?? v.form?.data?.object ?? v.object) === 'crm_lead',
) as AnyRec | undefined;

/** `P` compiles to `{ dialect: 'cel', source }`; older rules may be raw strings. */
const celSource = (condition: unknown): string =>
  typeof condition === 'string'
    ? condition
    : String((condition as AnyRec | null)?.source ?? '');

const rule = ((lead?.validations ?? []) as AnyRec[]).find(
  (v) => v.name === 'duplicate_disqualification_requires_survivor',
);

const LEAD_BASE = {
  first_name: 'Ada',
  last_name: 'Lovelace',
  company: 'Acme',
  status: 'new',
};

// ─────────────────────────────────── the engine, with the real schema ──

/**
 * A real ObjectQL over the in-memory driver, carrying `crm_lead` + `crm_contact`
 * exactly as the app declares them.
 *
 * The in-memory driver is not a convenience here, it is part of the test: it
 * stores only the columns a row was written with, so a lead created without the
 * duplicate fields comes back WITHOUT those keys. That is the record shape that
 * used to make the validation abort (`No such key`) and be skipped.
 */
const makeEngine = () =>
  ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: { crm_lead: lead, crm_contact: contact } as never,
  });

describe('a repeated email is recorded, not rejected', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  beforeAll(async () => {
    ql = await makeEngine();
    // Only the dedupe hook: the others need a user/positions context this
    // engine has no reason to carry, and they are covered in
    // hooks-runtime-service.test.ts.
    (ql as AnyRec).bindHooks(
      (leadHooks as AnyRec[]).filter((h) => h.name === 'lead_duplicate_check'),
      { packageId: 'test.lead-duplicate-management' },
    );
  });
  afterAll(async () => {
    await ql?.close();
  });

  it('accepts the same address twice — the acceptance case for the dropped constraint', async () => {
    const api = ql.createContext({ isSystem: true });
    const first = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'Ada@Acme.IO' });
    const second = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'ada@acme.io ' });

    expect(first.id).toBeTruthy();
    expect(second.id).toBeTruthy();
    expect(await api.object('crm_lead').count({ where: { email: 'ada@acme.io' } })).toBe(2);
  });

  it('stores both under one canonical address, whatever the visitor typed', async () => {
    const api = ql.createContext({ isSystem: true });
    const row = await api.object('crm_lead').insert({ ...LEAD_BASE, email: '  Grace@Hopper.NAVY ' });
    expect(row.email).toBe('grace@hopper.navy');
  });

  it('flags and links the second lead to the first', async () => {
    const api = ql.createContext({ isSystem: true });
    const first = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'repeat@acme.io' });
    const second = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'REPEAT@acme.io' });

    expect(second.duplicate_of_type).toBe('crm_lead');
    expect(second.duplicate_of_lead).toBe(first.id);
    expect(second.duplicate_status).toBe('suspected');
    // The original stays clean — it is the survivor, not the duplicate.
    const original = await api.object('crm_lead').findOne({ where: { id: first.id } });
    expect(original?.duplicate_status ?? null).toBeNull();
  });

  it('points at the contact when the prospect already became one', async () => {
    const api = ql.createContext({ isSystem: true });
    const person = await api.object('crm_contact').insert({
      // `crm_account` is a required master-detail on crm_contact; this engine
      // carries no crm_account, so the id is a stand-in for a real parent.
      crm_account: 'acc_stub',
      first_name: 'Ada', last_name: 'Lovelace', email: 'known@acme.io',
    });
    const back = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'known@acme.io' });

    expect(back.duplicate_of_type).toBe('crm_contact');
    expect(back.duplicate_of_contact).toBe(person.id);
    expect(back.duplicate_of_lead ?? null).toBeNull();
  });
});

// ──────────────────────────── the verdict half, enforced by the engine ──

describe('disqualifying as a duplicate must name the survivor', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let target: AnyRec;
  let survivor: AnyRec;

  beforeAll(async () => {
    ql = await makeEngine();
    const api = ql.createContext({ isSystem: true });
    // Written WITHOUT any duplicate_* column, on purpose — see makeEngine().
    survivor = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'survivor@acme.io' });
    target = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'target@acme.io' });
  });
  afterAll(async () => {
    await ql?.close();
  });

  /** Try to close `target` as unqualified with the given duplicate fields. */
  const disqualify = (doc: AnyRec) => {
    const api = ql.createContext({ isSystem: true });
    return api.object('crm_lead').update(
      { id: target.id, status: 'unqualified', disqualification_reason: 'duplicate', ...doc },
      { where: { id: target.id } },
    );
  };

  it('rejects a duplicate disqualification that names nothing', async () => {
    await expect(disqualify({})).rejects.toThrow(/naming the surviving record/i);
  });

  it('rejects a type with no matching lookup — the requiredWhen half', async () => {
    // Reported against the FIELD, which is why this half is `requiredWhen` and
    // not another clause bolted onto the script rule.
    await expect(
      disqualify({ duplicate_of_type: 'crm_lead', duplicate_status: 'confirmed' }),
    ).rejects.toThrow(/Duplicate Of Lead/i);
    await expect(
      disqualify({ duplicate_of_type: 'crm_contact', duplicate_status: 'confirmed' }),
    ).rejects.toThrow(/Duplicate Of Contact/i);
  });

  it("rejects closing a lead on the machine's guess", async () => {
    // `suspected` is what the intake hook writes. A human has to look and agree
    // before a record is retired as somebody else's copy.
    await expect(
      disqualify({
        duplicate_of_type: 'crm_lead',
        duplicate_of_lead: survivor.id,
        duplicate_status: 'suspected',
      }),
    ).rejects.toThrow(/Confirmed/i);
  });

  it('accepts a confirmed link, and the lead then points at its survivor', async () => {
    await disqualify({
      duplicate_of_type: 'crm_lead',
      duplicate_of_lead: survivor.id,
      duplicate_status: 'confirmed',
    });
    const api = ql.createContext({ isSystem: true });
    const saved = await api.object('crm_lead').findOne({ where: { id: target.id } });
    expect(saved?.disqualification_reason).toBe('duplicate');
    expect(saved?.duplicate_of_type).toBe('crm_lead');
    expect(saved?.duplicate_of_lead).toBe(survivor.id);
    expect(saved?.duplicate_status).toBe('confirmed');
  });

  it('leaves every other disqualification reason alone', async () => {
    const api = ql.createContext({ isSystem: true });
    const other = await api.object('crm_lead').insert({ ...LEAD_BASE, email: 'nofit@acme.io' });
    await expect(
      api.object('crm_lead').update(
        { id: other.id, status: 'unqualified', disqualification_reason: 'not_a_fit' },
        { where: { id: other.id } },
      ),
    ).resolves.toBeTruthy();
  });

  it('rejects the same mistake on INSERT, not only on update', async () => {
    const api = ql.createContext({ isSystem: true });
    await expect(
      api.object('crm_lead').insert({
        ...LEAD_BASE,
        email: 'born-bad@acme.io',
        status: 'unqualified',
        disqualification_reason: 'duplicate',
      }),
    ).rejects.toThrow(/naming the surviving record/i);
  });
});

// ───────────────────────────────── the shape the rules are declared in ──

describe('the duplicate link is declarative metadata', () => {
  it('crm_lead.email carries no uniqueness constraint any more', () => {
    // The whole point of #598: a person may enquire more than once.
    expect(lead.fields.email.unique ?? false).toBe(false);
    const uniqueIndexes = ((lead.indexes ?? []) as AnyRec[]).filter((i) => i.unique === true);
    expect(
      uniqueIndexes,
      'a unique index on crm_lead re-imposes exactly the constraint #598 removed',
    ).toEqual([]);
  });

  it('keeps email INDEXED — three read paths depend on it', () => {
    // `unique: true` was what indexed this column. Dropping the constraint
    // without replacing the index would leave the intake dedupe lookup, the
    // crm_lead_import upsert key and the conversion flow scanning the table.
    const indexed = ((lead.indexes ?? []) as AnyRec[]).some(
      (i) => Array.isArray(i.fields) && i.fields.includes('email'),
    );
    expect(indexed, 'crm_lead.email is no longer indexed').toBe(true);
  });

  it('links through a type discriminator, the shape crm_task already uses', () => {
    // `Field.lookup(['crm_lead','crm_contact'])` is rejected at schema parse
    // ("reference: expected string, received array"), so the polymorphic link
    // is a select naming the object plus one lookup per object — not a new
    // pattern invented for this feature.
    const task = objects.find((o) => o.name === 'crm_task') as AnyRec;
    expect(task?.fields?.related_to_type?.type).toBe(lead.fields.duplicate_of_type.type);

    // The column vocabulary is the two AUTHORABLE object types plus the #1164
    // tombstone. Asserted as the split rather than as a flat list of three: the
    // list would go green again for any junk value someone appended, and the
    // property that matters is that every authorable value names an object
    // whose lookup exists, while `erased` names none — which is exactly what
    // keeps the `requiredWhen` pairing from ever firing on a tombstone.
    const options = (lead.fields.duplicate_of_type.options ?? []) as AnyRec[];
    expect(options.map((o) => o.value)).toEqual([
      ...DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS.map((o) => o.value),
      DUPLICATE_OF_TYPE_ERASED,
    ]);
    expect(DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS.map((o) => o.value).sort()).toEqual([
      'crm_contact', 'crm_lead',
    ]);
    expect(lead.fields.duplicate_of_lead.reference_to ?? lead.fields.duplicate_of_lead.reference).toBe('crm_lead');
    expect(lead.fields.duplicate_of_contact.reference_to ?? lead.fields.duplicate_of_contact.reference).toBe('crm_contact');

    // Every authorable type is backed by a lookup that targets it; the
    // tombstone is backed by none.
    const LOOKUP_OF_TYPE: Record<string, string> = {
      crm_lead: 'duplicate_of_lead',
      crm_contact: 'duplicate_of_contact',
    };
    for (const { value } of DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS) {
      expect(lead.fields[LOOKUP_OF_TYPE[value]], `${value} names no lookup`).toBeTruthy();
    }
    expect(LOOKUP_OF_TYPE[DUPLICATE_OF_TYPE_ERASED]).toBeUndefined();
  });

  it('separates the machine guess from the human verdict on ONE field', () => {
    const options = (lead.fields.duplicate_status.options ?? []) as AnyRec[];
    expect(options.map((o) => o.value).sort()).toEqual(['confirmed', 'suspected']);
  });

  it('pairs each lookup with its type through requiredWhen', () => {
    for (const [field, type] of [
      ['duplicate_of_lead', 'crm_lead'],
      ['duplicate_of_contact', 'crm_contact'],
    ] as const) {
      const pred = celSource(lead.fields[field].requiredWhen);
      expect(pred, `${field} declares no requiredWhen`).not.toBe('');
      expect(pred).toContain(`record.duplicate_of_type == "${type}"`);
    }
  });

  it('states the disqualification contract as a rule, not as code', () => {
    expect(rule, 'duplicate_disqualification_requires_survivor missing').toBeTruthy();
    expect(rule!.type).toBe('script');
    expect(rule!.severity).toBe('error');
    const source = celSource(rule!.condition);
    expect(source).toContain('record.disqualification_reason == "duplicate"');
    expect(source).toContain('duplicate_of_type');
    expect(source).toContain('"confirmed"');
  });

  it('has no second, imperative implementation in the hook', () => {
    // The lesson of `cannot_edit_converted` (#575 B1) and `revenue_positive`
    // (#571): two implementations of one rule, one of them dead and free to
    // drift. The hook may WRITE a suspicion; it may not adjudicate one.
    const hookSource = readFileSync(join(REPO_ROOT, 'src/objects/lead.hook.ts'), 'utf8')
      .split('\n')
      .map((line) => (/^\s*(\/\/|\*|\/\*)/.test(line) ? '' : line))
      .join('\n');
    expect(hookSource).not.toContain('disqualification_reason');
    expect(hookSource).not.toMatch(/throw new Error\([^)]*duplicate/i);
  });
});

describe('the predicates are TOTAL — they return a verdict for every record shape', () => {
  /**
   * The defect this pins, measured on 17.0.0-rc.1.
   *
   * A validation is evaluated against `{...previous, ...data}`. Absent fields
   * are filled with null on INSERT but NOT on update, so a driver that stores
   * only the columns a row was written with yields a merged record with no
   * `duplicate_status` key. Strict CEL aborts on `No such key`, and the engine
   * SKIPS a predicate that fails to evaluate:
   *
   *     WARN Validation rule 'duplicate_disqualification_requires_survivor'
   *          predicate failed to evaluate (…) — skipped
   *
   * The unguarded first draft of these rules therefore let a lead be closed as
   * a duplicate with no survivor named — silently, and only on update. The
   * `has(...)` guards are what make the predicate answer instead of abort;
   * the engine test above is the proof they work, and this is the reminder of
   * why they cannot be "simplified" away.
   */
  it('guards every field reference in the disqualification rule', () => {
    const source = celSource(rule?.condition);
    const referenced = [...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(2);
    const unguarded = [...new Set(referenced)].filter(
      (field) => !new RegExp(String.raw`has\(record\.${field}\)`).test(source),
    );
    expect(
      unguarded,
      `fields read without has(): ${unguarded.join(', ')}. On a record whose merged shape ` +
        'omits the key, strict CEL aborts and the engine skips the rule entirely.',
    ).toEqual([]);
  });

  it('guards the requiredWhen predicates the same way', () => {
    for (const field of ['duplicate_of_lead', 'duplicate_of_contact']) {
      const pred = celSource(lead.fields[field].requiredWhen);
      expect(pred, `${field}: ${pred}`).toContain('has(record.duplicate_of_type)');
    }
  });
});

// ─────────────────────────────────────────────────── the writer halves ──

describe('the forms can satisfy the rule they are shipped under', () => {
  const forms: [string, AnyRec][] = [
    ...(leadView?.form ? ([['form', leadView.form]] as [string, AnyRec][]) : []),
    ...(Object.entries(leadView?.formViews ?? {}) as [string, AnyRec][]),
  ];

  /** Field names a form section renders, whether declared bare or as an object. */
  const fieldNames = (form: AnyRec): string[] =>
    ((form.sections ?? []) as AnyRec[]).flatMap((s) =>
      ((s.fields ?? []) as unknown[]).map((f) =>
        typeof f === 'string' ? f : String((f as AnyRec).field ?? ''),
      ),
    );

  it('found the forms at all', () => {
    expect(forms.length, 'no crm_lead forms found — the walker stopped matching').toBeGreaterThan(3);
  });

  it('every form offering "Duplicate" also offers the link that makes it savable', () => {
    // Same reasoning as `disqualification_reason` itself: a form that lets a
    // user pick a value the object then rejects produces a save error the user
    // has no way to clear.
    const offersReason = forms.filter(([, form]) =>
      fieldNames(form).includes('disqualification_reason'),
    );
    expect(offersReason.length, 'no lead form offers disqualification_reason').toBeGreaterThan(3);

    const required = ['duplicate_of_type', 'duplicate_of_lead', 'duplicate_of_contact', 'duplicate_status'];
    const bad = offersReason
      .filter(([, form]) => required.some((f) => !fieldNames(form).includes(f)))
      .map(([name]) => name);
    expect(
      bad,
      `lead forms that can pick "Duplicate" but hide the survivor link:\n  ${bad.join('\n  ')}`,
    ).toEqual([]);
  });

  it('ships a queue for the suspicions the intake hook raises', () => {
    // A `suspected` flag nobody can list is a column, not a workflow.
    const queue = (leadView?.listViews ?? {}).suspected_duplicates as AnyRec | undefined;
    expect(queue, 'no suspected_duplicates list view').toBeTruthy();
    const filters = (queue!.filter ?? []) as AnyRec[];
    expect(filters.some((f) => f.field === 'duplicate_status' && f.value === 'suspected')).toBe(true);
  });
});

// ───────────────────────────── the tombstone is written, never authored ──

/**
 * `duplicate_of_type: 'erased'` clears the erasure path (#1164) precisely
 * because it is a FACT the platform observed — the engine's reference cleanup
 * nulled the pointer — and not a choice a reviewer makes. Both halves of that
 * sentence need pinning, because the value's entire safety argument rests on
 * them:
 *
 *   - **Not authorable.** The form must not offer it. If it did, a reviewer
 *     could close a lead as "duplicate of a record that was erased" about a
 *     record nobody erased — satisfying `duplicate_disqualification_requires_survivor`
 *     and the `requiredWhen` pairing at once, which is the exact hole #598 was
 *     written to close. Narrowing the picker is what the decision on this card
 *     called "a visible, labelled hole rather than an invisible one": the value
 *     is still labelled in all four locales (see below), it just cannot be
 *     picked.
 *
 *   - **One writer.** A second place that stamps it — a flow, an action,
 *     another hook — would be a second, silent route to the same state, and the
 *     record could no longer be read as "the platform saw this deletion happen".
 *
 * The second pin is a SOURCE scan on purpose. A behavioural test can only cover
 * the paths it thinks to drive; this one fails on a writer nobody thought of.
 */
describe('the erased tombstone is unauthorable, and has exactly one writer', () => {
  /** Every `duplicate_of_type` entry on every crm_lead form surface. */
  const formEntries = (): AnyRec[] => {
    const found: AnyRec[] = [];
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return void node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      const rec = node as AnyRec;
      if (rec.field === 'duplicate_of_type') found.push(rec);
      Object.values(rec).forEach(walk);
    };
    walk(leadView);
    return found;
  };

  it('finds the duplicate picker on the lead forms at all', () => {
    // Guards the two assertions below against going vacuously green if the
    // block is renamed or the walk stops matching the compiled shape.
    expect(formEntries().length).toBeGreaterThan(0);
  });

  it('offers only the authorable object types on every form that shows it', () => {
    for (const entry of formEntries()) {
      const values = ((entry.options ?? []) as AnyRec[]).map((o) => o.value);
      expect(
        values,
        'a lead form offers duplicate_of_type without narrowing its options — ' +
          'the erased tombstone is pickable there',
      ).toEqual(DUPLICATE_OF_TYPE_AUTHORABLE_OPTIONS.map((o) => o.value));
      expect(values).not.toContain(DUPLICATE_OF_TYPE_ERASED);
    }
  });

  it('is spelled in exactly two places in src/ — its declaration and its stamp', () => {
    // Comment lines are stripped first, the same way the "no second imperative
    // implementation" pin above does it: prose may name the value freely, code
    // may not.
    const files: string[] = [];
    const walkDir = (dir: string): void => {
      for (const entry of readdirSync(join(REPO_ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) walkDir(rel);
        else if (entry.name.endsWith('.ts')) files.push(rel);
      }
    };
    walkDir('src');
    expect(files.length, 'no source files scanned').toBeGreaterThan(50);

    const hits: string[] = [];
    for (const rel of files) {
      const code = readFileSync(join(REPO_ROOT, rel), 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line));
      for (const line of code) {
        if (line.includes(`'${DUPLICATE_OF_TYPE_ERASED}'`) || line.includes(`"${DUPLICATE_OF_TYPE_ERASED}"`)) {
          hits.push(`${rel}: ${line.trim()}`);
        }
      }
    }

    // Exactly two LINES, not merely two files: a second stamp added inside
    // `lead.hook.ts` would keep the file set right while adding the second
    // silent route this pin exists to refuse.
    expect(hits, `expected 2 occurrences, got:\n${hits.join('\n')}`).toHaveLength(2);
    expect(hits.map((h) => h.split(':')[0]).sort()).toEqual([
      'src/objects/_picklists.ts',
      'src/objects/lead.hook.ts',
    ]);
    // The hook's one occurrence STAMPS the value; it is not a comparison that
    // happens to mention it.
    const stamp = hits.find((h) => h.startsWith('src/objects/lead.hook.ts'))!;
    expect(stamp).toContain(`duplicate_of_type = '${DUPLICATE_OF_TYPE_ERASED}'`);
  });

  it('keeps the hook literal and the canonical constant in step', () => {
    // They cannot be the same expression: L2 hook bodies run body-only in the
    // QuickJS sandbox, so a module constant referenced in the handler resolves
    // at authoring time and arrives as `undefined` (see the SLA matrix note in
    // `case.hook.ts`). Two spellings is the platform's constraint, not a
    // shortcut — so they are pinned together instead.
    const hookSource = readFileSync(join(REPO_ROOT, 'src/objects/lead.hook.ts'), 'utf8');
    expect(hookSource).toContain(`input.duplicate_of_type = '${DUPLICATE_OF_TYPE_ERASED}';`);
    expect(DUPLICATE_OF_TYPE_OPTIONS.map((o) => o.value)).toContain(DUPLICATE_OF_TYPE_ERASED);
  });
});

describe('every locale names the new fields', () => {
  const LOCALES = ['en', 'zh-CN', 'ja-JP', 'es-ES'] as const;
  const NEW_FIELDS = [
    'duplicate_of_type',
    'duplicate_of_lead',
    'duplicate_of_contact',
    'duplicate_status',
  ] as const;

  it.each(LOCALES)('%s labels all four duplicate fields', (locale) => {
    const fields = ((CrmTranslations as AnyRec)[locale]?.objects?.crm_lead?.fields ?? {}) as AnyRec;
    const missing = NEW_FIELDS.filter((f) => !fields[f]?.label);
    expect(missing, `${locale} is missing labels for: ${missing.join(', ')}`).toEqual([]);
  });

  it.each(LOCALES)('%s labels the picklist VALUES, not just the pickers', (locale) => {
    // An untranslated option renders as the raw value (`crm_lead`, `suspected`)
    // in the middle of an otherwise translated form.
    const fields = ((CrmTranslations as AnyRec)[locale]?.objects?.crm_lead?.fields ?? {}) as AnyRec;
    // Derived from the object's own vocabulary, not retyped: every value the
    // COLUMN can hold needs a label, including the #1164 tombstone. `erased` is
    // never offered on the form, but a lead whose survivor was deleted carries
    // it and gets read — detail page, list column, export — so leaving it
    // untranslated would print the raw `erased` in an otherwise localized form.
    // Unauthorable is not the same as invisible, and this is the assertion that
    // keeps the hole labelled.
    expect(Object.keys(fields.duplicate_of_type?.options ?? {}).sort()).toEqual(
      DUPLICATE_OF_TYPE_OPTIONS.map((o) => o.value).sort(),
    );
    expect(Object.keys(fields.duplicate_status?.options ?? {}).sort()).toEqual([
      'confirmed', 'suspected',
    ]);
  });
});
