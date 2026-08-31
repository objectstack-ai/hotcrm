// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { SysUser } from '@objectstack/platform-objects';
import stack from '../objectstack.config';
import { ATTENDEE_RESOLUTIONS } from '../src/objects/event_attendee.object';
import { eventAttendeesFromContacts, eventAttendeesFromLeads } from '../src/data/service.seed';

/**
 * `attendee_type` and the column it names must agree (#740).
 *
 * ### The defect
 *
 * `crm_event_attendee` declared FOUR resolutions in `attendee_resolves`
 * (`crm_contact` / `crm_lead` / `sys_user` / `external_name`) and THREE values
 * in `attendee_type` (`contact` / `lead` / `user`, defaulting to `contact`).
 * The two lists were authored separately and had drifted, so a guest who is in
 * no CRM object — the case `external_name` exists for — had no honest type to
 * be stored under. Measured on 17.0.0-rc.6 before the fix, on this harness:
 *
 *     insert { attendee_type: "contact", external_name: "the prospect's lawyer" }
 *       -> ACCEPTED
 *     insert { external_name: "no type given" }              // type omitted
 *       -> ACCEPTED, stored as attendee_type: "contact"      (the field default)
 *     insert { attendee_type: "external", external_name: "Jane Roe" }
 *       -> ValidationError: Attendee Type must be one of: contact, lead, user
 *
 * The stored row then claimed to be a Contact while pointing at no contact, and
 * every query that filters on the discriminator — "internal attendees only",
 * named in the object's own note — counted it in the wrong bucket. Not dead
 * code: `src/actions/global.actions.ts` never writes `external_name`, but the
 * Console's attendee form writes all three shapes above.
 *
 * ### The fix, and why the acceptance surface is asserted in both directions
 *
 * The maintainer's ruling (2026-08-11) is Option 1: add the fourth option and
 * tighten the rule so the type must match the filled column — declared =
 * enforced. Tightening a rule CHANGES WHAT THE APP ACCEPTS, so a green "the new
 * shape works" is only half the evidence; the other half is that each shape the
 * tightening was for is actually refused, with the refusal reaching the caller.
 * Both halves run on the real engine below, because a rule evaluating false in
 * isolation is not a rejected write.
 *
 * ### What a refusal carries — measured, not assumed
 *
 * Validation-rule refusals do NOT have the shape hook refusals have in this app
 * (PR #1073 measured those as `code`/`status` both `undefined`). Measured here
 * on 17.0.0-rc.6:
 *
 *     constructor : ValidationError
 *     name        : "ValidationError"
 *     code        : "VALIDATION_FAILED"
 *     status      : undefined          (no HTTP status on the ObjectQL error)
 *     own keys    : ["code", "name", "fields"]
 *
 * So the envelope pinned below is `name` + `code` + the message, and `status`
 * is asserted ABSENT rather than quietly skipped — an envelope that grows a
 * status later should be a red test that gets read, not a silent change.
 */

type AnyRec = Record<string, any>;

const objects: AnyRec[] = (stack as any).objects ?? [];
const byName = (n: string) => objects.find((o) => o.name === n) as AnyRec;

const EVENT_ATTENDEE = byName('crm_event_attendee');

const ruleNamed = (name: string) =>
  ((EVENT_ATTENDEE.validations ?? []) as AnyRec[]).find((v) => v.name === name);

const sourceOf = (condition: unknown): string =>
  typeof condition === 'string' ? condition : String((condition as AnyRec)?.source ?? '');

// ────────────────────────────────────────────── the declaration ──

describe('the four resolutions are one declared correspondence', () => {
  /**
   * The pairing is declared ONCE (`ATTENDEE_RESOLUTIONS`) and read twice — by
   * the picklist and by the two rules. This test is what makes that structural
   * rather than aspirational: it asserts the BUILT metadata against the table,
   * so a hand-edited option list or a hand-written rule branch shows up here.
   */
  it('generates every attendee_type option from the table, in order', () => {
    const options = (EVENT_ATTENDEE.fields.attendee_type.options ?? []) as AnyRec[];
    expect(options.map((o) => o.value)).toEqual(ATTENDEE_RESOLUTIONS.map((r) => r.value));
    expect(options.map((o) => o.label)).toEqual(ATTENDEE_RESOLUTIONS.map((r) => r.label));
  });

  it('ships the external option that #740 is about, and keeps the contact default', () => {
    const options = (EVENT_ATTENDEE.fields.attendee_type.options ?? []) as AnyRec[];
    expect(options.map((o) => o.value)).toContain('external');
    expect(options.filter((o) => o.default).map((o) => o.value)).toEqual(['contact']);
    expect(EVENT_ATTENDEE.fields.attendee_type.defaultValue).toBe('contact');
    // Still required + notNull: the fix is a fourth honest value, not a way to
    // leave the discriminator empty.
    expect(EVENT_ATTENDEE.fields.attendee_type.required).toBe(true);
  });

  it('names a real field for every resolution', () => {
    for (const r of ATTENDEE_RESOLUTIONS) {
      expect(EVENT_ATTENDEE.fields[r.column], `${r.value} -> ${r.column}`).toBeDefined();
    }
  });

  it('reads every resolution column in both rules, and pairs it with its own type', () => {
    // The mechanical guard against a fifth resolution being added to the table
    // while a hand-written rule branch is forgotten — the #740 failure exactly.
    for (const name of ['attendee_resolves', 'attendee_type_exclusive']) {
      const source = sourceOf(ruleNamed(name)?.condition);
      expect(source, `${name} is missing`).not.toBe('');
      for (const r of ATTENDEE_RESOLUTIONS) {
        expect(source, `${name} does not read ${r.column}`).toContain(`record.${r.column}`);
        expect(source, `${name} does not mention "${r.value}"`).toContain(`"${r.value}"`);
      }
    }
  });

  it('keeps both rules at severity error', () => {
    // A `warning` here would let the Console store the mislabelled row again,
    // with a dismissible notice instead of a refusal.
    for (const name of ['attendee_resolves', 'attendee_type_exclusive']) {
      expect(ruleNamed(name)?.severity, name).toBe('error');
    }
  });

  it('keeps every predicate total — every read has(...)-guarded', () => {
    // The house rule of `test/object-validation-predicates.test.ts`, asserted
    // here too because these two conditions are GENERATED: a future edit to the
    // fragment builders would break totality for all eight branches at once.
    for (const name of ['attendee_resolves', 'attendee_type_exclusive']) {
      const source = sourceOf(ruleNamed(name)?.condition);
      const read = [...new Set([...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
      expect(read.length).toBeGreaterThan(1);
      for (const field of read) {
        expect(source, `${name} reads ${field} unguarded`).toContain(`has(record.${field})`);
      }
    }
  });
});

// ──────────────────────────────────────────── on the real engine ──

describe('the acceptance surface, on a real engine', () => {
  let ql: AnyRec;
  let api: AnyRec;
  let eventId: string;
  const party: Record<string, string> = {};

  beforeEach(async () => {
    ql = (await ObjectQL.create({
      datasources: { default: new InMemoryDriver({ persistence: false }) },
      objects: {
        crm_event_attendee: EVENT_ATTENDEE,
        crm_event: byName('crm_event'),
        crm_contact: byName('crm_contact'),
        crm_lead: byName('crm_lead'),
        crm_account: byName('crm_account'),
        sys_user: SysUser,
      } as never,
    })) as never;
    api = ql.createContext({ isSystem: true });

    const event = await api.object('crm_event').insert({
      subject: 'Contract negotiation',
      type: 'meeting',
      status: 'planned',
      start_datetime: '2026-02-01T09:00:00.000Z',
      end_datetime: '2026-02-01T10:00:00.000Z',
    });
    eventId = event.id;

    const account = await api.object('crm_account').insert({
      name: 'ACME', type: 'customer', industry: 'technology',
    });
    party.crm_contact = (await api.object('crm_contact').insert({
      first_name: 'Li', last_name: 'Wang', crm_account: account.id, email: 'li.wang@acme.test',
    })).id;
    party.crm_lead = (await api.object('crm_lead').insert({
      first_name: 'Wei', last_name: 'Zhang', company: 'ACME',
      status: 'new', lead_source: 'web', email: 'wei.zhang@acme.test',
    })).id;
    party.sys_user = (await api.object('sys_user').insert({
      name: 'Chen Hu', email: 'chen.hu@objectos.ai',
    })).id;
    party.external_name = 'Jane Roe (outside counsel)';
  });
  afterEach(async () => {
    await ql?.close();
  });

  const insert = (row: AnyRec) =>
    api.object('crm_event_attendee').insert({ crm_event: eventId, response: 'no_response', ...row });

  /** Everything a refused write is expected to carry, asserted as one object. */
  const refusal = async (row: AnyRec) => {
    let error: AnyRec | undefined;
    try {
      await insert(row);
    } catch (e) {
      error = e as AnyRec;
    }
    expect(error, `write was ACCEPTED: ${JSON.stringify(row)}`).toBeDefined();
    return error!;
  };

  // ── the newly legal shape ──

  it('accepts an external guest under the type that finally names them', async () => {
    const row = await insert({ attendee_type: 'external', external_name: party.external_name });
    expect(row.attendee_type).toBe('external');
    expect(row.external_name).toBe(party.external_name);
    // Stored, readable, and filterable as what it is — the whole point. Before
    // #740 this row could only exist labelled `contact`.
    const external = await api.object('crm_event_attendee').find({
      where: { attendee_type: 'external' },
    });
    expect(external.map((r: AnyRec) => r.id)).toEqual([row.id]);
  });

  it('still accepts each modelled party under its own type', async () => {
    for (const r of ATTENDEE_RESOLUTIONS.filter((x) => x.value !== 'external')) {
      const row = await insert({ attendee_type: r.value, [r.column]: party[r.column] });
      expect(row.attendee_type, r.value).toBe(r.value);
    }
    expect(await api.object('crm_event_attendee').find({ where: {} })).toHaveLength(3);
  });

  // ── the newly illegal shapes ──

  /**
   * The row the issue is about: `attendee_type: 'contact'` (the field default)
   * with only a free-text name on it. It was ACCEPTED before this change —
   * measured, and quoted in the header — and the Console form is what produces
   * it, so this is the regression assertion that matters most.
   */
  it('refuses the mislabelled row the Console used to store', async () => {
    const error = await refusal({ attendee_type: 'contact', external_name: party.external_name });
    expect(error.message).toMatch(/must fill the party its Attendee Type names/i);
  });

  it('refuses it the same way when the type is left on its default', async () => {
    // The likelier Console path: nobody touches the picklist at all.
    const error = await refusal({ external_name: party.external_name });
    expect(error.message).toMatch(/must fill the party its Attendee Type names/i);
  });

  it('refuses an external row that links a CRM party as well', async () => {
    const error = await refusal({
      attendee_type: 'external',
      external_name: party.external_name,
      crm_contact: party.crm_contact,
    });
    expect(error.message).toMatch(/names exactly one party/i);
  });

  it('refuses an external row with no name on it', async () => {
    const error = await refusal({ attendee_type: 'external' });
    expect(error.message).toMatch(/must fill the party its Attendee Type names/i);
  });

  /**
   * The full off-diagonal: every type paired with every column it does not
   * name. Twelve cases, generated from the same table the rules are — a
   * hand-listed few would drift from the table exactly as the picklist did.
   */
  it.each(
    ATTENDEE_RESOLUTIONS.flatMap((type) =>
      ATTENDEE_RESOLUTIONS.filter((other) => other.value !== type.value).map((other) => ({
        type: type.value, column: other.column,
      })),
    ),
  )('refuses attendee_type $type filled as $column', async ({ type, column }) => {
    const error = await refusal({ attendee_type: type, [column]: party[column] });
    // Either half may speak first — the row both misses its own column and
    // fills one it may not — and both messages are true of it. What must never
    // happen is the write landing.
    expect(error.message).toMatch(
      /must fill the party its Attendee Type names|names exactly one party/i,
    );
    expect(await api.object('crm_event_attendee').find({ where: {} })).toHaveLength(0);
  });

  it('refuses a row that names nobody at all — the original rule is intact', async () => {
    const error = await refusal({ attendee_type: 'contact' });
    expect(error.message).toMatch(/must fill the party its Attendee Type names/i);
  });

  /**
   * The `requiredWhen` hints added for #1078 DUPLICATE `attendee_resolves` and
   * do not replace it — asserted here on the engine rather than trusted,
   * because "a usability layer on top" is only true while the layer underneath
   * still speaks. A row missing the party its type names is answered twice: by
   * the field, which names the column, and by the rule, which is the contract.
   */
  it('answers a missing party from BOTH layers, field and rule (#1078)', async () => {
    const error = await refusal({ attendee_type: 'lead' });
    const fields = (error.fields ?? []) as AnyRec[];
    expect(fields.some((f) => f.field === 'crm_lead' && f.code === 'required')).toBe(true);
    expect(fields.some((f) => /must fill the party its Attendee Type names/i.test(String(f.message)))).toBe(true);
  });

  /**
   * ...and the duplication costs nothing at the boundary: the ACCEPTED set is
   * the same set. Each type's own correct shape still lands, which is the half
   * a new refusal would silently take away.
   */
  it('leaves the accepted set unchanged — every correct shape still lands (#1078)', async () => {
    for (const r of ATTENDEE_RESOLUTIONS) {
      const row = await insert({ attendee_type: r.value, [r.column]: party[r.column] });
      expect(row[r.column], `${r.value} -> ${r.column}`).toBe(party[r.column]);
    }
    expect(await api.object('crm_event_attendee').find({ where: {} })).toHaveLength(
      ATTENDEE_RESOLUTIONS.length,
    );
  });

  it('refuses an undeclared attendee_type, so the option set is the vocabulary', async () => {
    // What `external` itself hit before this change. Pinned because it is the
    // reason the mislabelling was forced rather than merely convenient.
    const error = await refusal({ attendee_type: 'guest', external_name: party.external_name });
    expect(error.message).toMatch(/Attendee Type must be one of: contact, lead, user, external/i);
  });

  /**
   * The refusal ENVELOPE, measured rather than assumed (see the header). A
   * rejection test that only asserts "it threw" carries one bit where the
   * defect has three.
   */
  it('delivers a ValidationError envelope to the caller', async () => {
    const error = await refusal({ attendee_type: 'contact', external_name: party.external_name });
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATION_FAILED');
    // Measured absent on 17.0.0-rc.6 — asserted so a future envelope change is
    // read, not silently absorbed.
    expect(error.status).toBeUndefined();
  });

  /**
   * An update is a write too. The Console can edit a stored row's type without
   * touching its columns, which is the second way to produce the mislabelling,
   * and on a sparse driver the merged record is where a non-total predicate
   * would abort instead of judging.
   */
  it('refuses an UPDATE that walks a good row into a mislabelled one', async () => {
    const row = await insert({ attendee_type: 'contact', crm_contact: party.crm_contact });

    await expect(
      api.object('crm_event_attendee').update(
        { id: row.id, attendee_type: 'external' },
        { where: { id: row.id } },
      ),
    ).rejects.toThrow(/must fill the party its Attendee Type names|names exactly one party/i);

    const [stored] = await api.object('crm_event_attendee').find({ where: { id: row.id } });
    expect(stored.attendee_type).toBe('contact');
  });

  it('accepts an UPDATE that moves the type and its column together', async () => {
    const row = await insert({ attendee_type: 'contact', crm_contact: party.crm_contact });

    await api.object('crm_event_attendee').update(
      {
        id: row.id,
        attendee_type: 'external',
        external_name: party.external_name,
        crm_contact: null,
      },
      { where: { id: row.id } },
    );

    const [stored] = await api.object('crm_event_attendee').find({ where: { id: row.id } });
    expect(stored.attendee_type).toBe('external');
    expect(stored.external_name).toBe(party.external_name);
  });
});

// ───────────────────────────────────────────────── the seed book ──

/**
 * A tightened rule that the demo's own data cannot satisfy turns a dormant
 * defect into a boot failure, so the seed book is swept against the SAME table
 * the rules are generated from — not against a re-typed copy of the pairing.
 *
 * It passes because every seeded row was already type-consistent
 * (`attendee_type: kind` beside the one column `kind` names, in
 * `src/data/service.seed.ts`), which is why no seed data had to change for
 * #740. This sweep is what keeps that true: it is the file that goes red if a
 * future seed author fills a second column or mislabels a row.
 */
describe('every seeded attendee row satisfies the tightened rule', () => {
  const rows: AnyRec[] = [
    ...((eventAttendeesFromContacts as AnyRec).records ?? []),
    ...((eventAttendeesFromLeads as AnyRec).records ?? []),
  ];

  it('finds seeded attendee rows to check at all', () => {
    // Guard the guard: a renamed export would make the sweep vacuous.
    expect(rows.length).toBeGreaterThan(10);
  });

  it('fills exactly the column each row\'s type names', () => {
    const columns = ATTENDEE_RESOLUTIONS.map((r) => r.column);
    const bad: string[] = [];
    for (const row of rows) {
      const resolution = ATTENDEE_RESOLUTIONS.find((r) => r.value === row.attendee_type);
      if (!resolution) {
        bad.push(`${row.crm_event}: attendee_type "${row.attendee_type}" is not an option`);
        continue;
      }
      if (!row[resolution.column]) {
        bad.push(`${row.crm_event}: type "${row.attendee_type}" but ${resolution.column} is empty`);
      }
      for (const other of columns.filter((c) => c !== resolution.column)) {
        if (row[other]) {
          bad.push(`${row.crm_event}: type "${row.attendee_type}" also fills ${other}`);
        }
      }
    }
    expect(bad, `seeded rows the rules would refuse:\n  ${bad.join('\n  ')}`).toEqual([]);
  });
});

// ──────────────────────────────────────── the form hints (#1078) ──

describe('the form hints derive from the same table, and stop where the measurement stopped them', () => {
  const partyColumns = ATTENDEE_RESOLUTIONS.map((r) => r.column);

  it('gives every party column a requiredWhen naming its OWN type', () => {
    // Generated from `ATTENDEE_RESOLUTIONS`, same as the two rules: a fifth
    // resolution must not be able to arrive without its hint.
    for (const r of ATTENDEE_RESOLUTIONS) {
      const source = sourceOf(EVENT_ATTENDEE.fields[r.column]?.requiredWhen);
      expect(source, `${r.column} has no requiredWhen`).not.toBe('');
      expect(source, `${r.column} does not name "${r.value}"`).toContain(`"${r.value}"`);
      for (const other of ATTENDEE_RESOLUTIONS.filter((x) => x.value !== r.value)) {
        expect(source, `${r.column} also names "${other.value}"`).not.toContain(`"${other.value}"`);
      }
    }
  });

  it('keeps every hint predicate total', () => {
    // Same house rule as the validations. `requiredWhen` fails CLOSED in the
    // Console — an unevaluable predicate demands nothing — so an unguarded one
    // reads as enforced at the form and requires nothing at all.
    for (const column of partyColumns) {
      const source = sourceOf(EVENT_ATTENDEE.fields[column]?.requiredWhen);
      const reads = [...new Set([...source.matchAll(/record\.(\w+)/g)].map((m) => m[1]))];
      // Guard the guard: with no predicate to read, the loop below is vacuous
      // and this test would go green on a field that lost its hint entirely.
      expect(reads.length, `${column} has no readable requiredWhen predicate`).toBeGreaterThan(0);
      for (const read of reads) {
        expect(source, `${column} reads ${read} unguarded`).toContain(`has(record.${read})`);
      }
    }
  });

  it('leaves every party column optional at the schema level', () => {
    // `required: true` on any of the four would demand it for all four types
    // and make the object unwritable. The conditional hint is the whole point.
    for (const column of partyColumns) {
      expect(EVENT_ATTENDEE.fields[column]?.required, column).not.toBe(true);
    }
  });

  /**
   * ⛔ The half that was built, measured in the browser on 17.1.0, and NOT
   * shipped. `visibleWhen` on these columns hides a POPULATED field without
   * clearing it, and the Console submits the stale value anyway:
   *
   *     fill Contact, switch attendee_type to "lead", save
   *       POST {"attendee_type":"lead", …, "crm_contact":"AEwP…", "crm_lead":"0AM_…"}
   *       400  An attendee names exactly one party — clear every party column
   *            its Attendee Type does not name
   *
   * The row is refused correctly, by a message naming a column no longer on
   * screen to clear; on the edit path a stored `contact` row can then never be
   * retyped through the Console at all. Nothing in `@objectstack/spec` 17.1.0
   * or the shipped Console clears a value when its field goes invisible, so
   * this cannot be paired into safety from this repo.
   *
   * This pin is not style policing — it is the measurement, kept where the
   * next author will trip over it. Deleting it is fine once a hidden field
   * stops being submitted; deleting it before that re-opens the dead end.
   */
  it('ships NO visibleWhen on the party columns, because the stale value survives the save', () => {
    for (const column of partyColumns) {
      expect(
        EVENT_ATTENDEE.fields[column]?.visibleWhen,
        `${column} carries visibleWhen — re-measure the Console's hidden-field submit before shipping it`,
      ).toBeUndefined();
    }
  });
});
