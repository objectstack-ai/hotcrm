// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import stack from '../objectstack.config';
import { CrmTranslations } from '../src/translations';
import leadHooks from '../src/objects/lead.hook';
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

    const options = (lead.fields.duplicate_of_type.options ?? []) as AnyRec[];
    expect(options.map((o) => o.value).sort()).toEqual(['crm_contact', 'crm_lead']);
    expect(lead.fields.duplicate_of_lead.reference_to ?? lead.fields.duplicate_of_lead.reference).toBe('crm_lead');
    expect(lead.fields.duplicate_of_contact.reference_to ?? lead.fields.duplicate_of_contact.reference).toBe('crm_contact');
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
    expect(Object.keys(fields.duplicate_of_type?.options ?? {}).sort()).toEqual([
      'crm_contact', 'crm_lead',
    ]);
    expect(Object.keys(fields.duplicate_status?.options ?? {}).sort()).toEqual([
      'confirmed', 'suspected',
    ]);
  });
});
