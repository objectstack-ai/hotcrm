// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { CrmSeedData } from '../objectstack.composition';
import { contracts } from '../src/revenue/data/revenue.seed';
import { leadInteractionPointers, tasks } from '../src/sales/data/activity.seed';
import { bootOptions, buildArtifactAgain } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A user's edit to a seeded record survives a restart (#2139).
 *
 * The platform re-applies the app's seed on every boot. Under `mode: 'upsert'`
 * the replay compares only the fields a dataset declares and writes the seeded
 * value back over any that differ, as a system write, so whatever a rep, an
 * agent or an admin changed on a seeded record was undone by the next restart.
 * `test/lead-seed-replay.test.ts` pins the lead dataset (#2134); this suite
 * pins every other dataset that moved to insert-once (`mode: 'ignore'`), one
 * edit per dataset, each a field the dataset declares, so `upsert` would have
 * written it back.
 *
 * Measured the way an install meets it: the app boots over a database file,
 * the admin makes each edit through the engine's user write door, the kernel
 * stops, and the app cold-boots over the same file, replaying the seed. The
 * cold boot runs a day later (the clock is moved forward, `Date` only), as a
 * demo environment's next restart usually does: relative seed dates then
 * resolve to new values, which is what a later boot's replay meets.
 *
 * `leadInteractionPointers` has no editor: it is insert-once because it
 * mirrors `events`, and the pin for it is that each pointer still reads its
 * event's end after that later boot. `forecasts` stays `upsert` (positional
 * demo snapshots, #702) and is the clock control. The reason for each mode
 * sits beside the dataset in `src/<package>/data/*.seed.ts`.
 */

/** The dataset registered for `object` (and, for a junction, keyed on `keyPart`). */
const dataset = (object: string, keyPart?: string): Rec => {
  const found = (CrmSeedData as Rec[]).filter(
    (d) => d.object === object && (keyPart === undefined || JSON.stringify(d.externalId).includes(keyPart)),
  );
  expect(found, `fixture: one dataset seeds ${object}${keyPart ? ` by ${keyPart}` : ''}`).toHaveLength(1);
  return found[0];
};

/**
 * One edit per moved dataset: the row a persona works, found by the dataset's
 * own natural key, and the change they make to a field the dataset declares.
 */
interface Edit {
  /** What the persona does, for the test name. */
  readonly label: string;
  readonly object: string;
  /** Picks the dataset for a junction object seeded as two datasets. */
  readonly keyPart?: string;
  /** Finds the seeded row, by natural key (lookups by the target's key). */
  readonly key: Rec;
  readonly patch: Rec;
}

// `crm_contact` is not here: its edit (a new primary contact) is the account's
// one-primary rule, so it gets its own case below.
const EDITS: readonly Edit[] = [
  { label: 'a rep corrects the account phone', object: 'crm_account',
    key: { name: 'Acme Corporation' }, patch: { phone: '+1-415-555-0199' } },
  { label: 'a rep moves a deal from proposal to negotiation', object: 'crm_opportunity',
    key: { name: 'Lattice Education Renewal' }, patch: { stage: 'negotiation' } },
  { label: 'an admin re-prices a product', object: 'crm_product',
    key: { name: 'ObjectStack Platform (SMB Edition)' }, patch: { list_price: 19000 } },
  { label: 'a rep raises a deal line quantity', object: 'crm_opportunity_line_item',
    key: { crm_opportunity: { crm_opportunity: 'Northwind Grid Modernization' }, crm_product: { crm_product: 'AI Agent Seat (Annual)' } },
    patch: { quantity: 20 } },
  { label: 'a rep completes a task', object: 'crm_task',
    key: { subject: 'Follow up with Acme on proposal' }, patch: { status: 'completed' } },
  { label: 'an agent puts a case on waiting for the customer', object: 'crm_case',
    key: { subject: 'Login issues after platform upgrade' }, patch: { status: 'waiting_customer' } },
  { label: 'a rep moves a meeting onsite', object: 'crm_event',
    key: { subject: 'Acme — AI agent governance workshop' }, patch: { location: 'Acme HQ, San Francisco' } },
  { label: 'a rep records a contact attendee\'s answer', object: 'crm_event_attendee', keyPart: 'crm_contact',
    key: { crm_event: { crm_event: 'Acme — AI agent governance workshop' }, crm_contact: { crm_contact: 'john.smith@acme.example.com' } },
    patch: { response: 'accepted' } },
  { label: 'a rep records a lead attendee\'s answer', object: 'crm_event_attendee', keyPart: 'crm_lead',
    key: { crm_event: { crm_event: 'NextGen Retail — first discovery call with Alice Martinez' }, crm_lead: { crm_lead: 'alice@nextgenretail.example.com' } },
    patch: { response: 'accepted' } },
  { label: 'a marketer raises a campaign budget', object: 'crm_campaign',
    key: { name: 'Executive AI Governance Roundtable' }, patch: { budgeted_cost: 26000 } },
  { label: 'a marketer marks a lead member responded', object: 'crm_campaign_member', keyPart: 'crm_lead',
    key: { crm_campaign: { crm_campaign: 'Q3 Enterprise Email Nurture' }, crm_lead: { crm_lead: 'maya.singh@bluepeaklogistics.example.com' } },
    patch: { status: 'responded' } },
  { label: 'a marketer marks a contact member responded', object: 'crm_campaign_member', keyPart: 'crm_contact',
    key: { crm_campaign: { crm_campaign: 'Q3 Enterprise Email Nurture' }, crm_contact: { crm_contact: 'ethan.brooks@vertex.example.com' } },
    patch: { status: 'responded' } },
  { label: 'a rep turns off a draft contract\'s auto-renewal', object: 'crm_contract',
    key: { description: String((contracts.records as Rec[]).find((c) => c.status === 'draft')?.description) },
    patch: { auto_renewal: false } },
  { label: 'a rep sends a draft quote for review', object: 'crm_quote',
    key: { name: 'Initech Cloud Migration Estimate' }, patch: { status: 'in_review' } },
  { label: 'a rep raises a quote line quantity', object: 'crm_quote_line_item',
    key: { crm_quote: { crm_quote: 'Initech Cloud Migration Estimate' }, crm_product: { crm_product: 'AI Agent Seat (Annual)' } },
    patch: { quantity: 14 } },
  { label: 'an author revises a knowledge article summary', object: 'crm_knowledge_article',
    key: { title: 'Getting Started with HotCRM' }, patch: { summary: 'A ten-minute tour of accounts, contacts, leads, the pipeline and the service desk.' } },
];

/** A lookup key part `{ object: naturalKey }`, resolved to the target row's id. */
const resolveKey = async (stack: VerifyStack, key: Rec): Promise<Rec> => {
  const where: Rec = {};
  for (const [field, value] of Object.entries(key)) {
    if (value && typeof value === 'object') {
      const [target, natural] = Object.entries(value as Rec)[0];
      const targetKey = String(dataset(target).externalId);
      const [row] = await stack.rows(target, { [targetKey]: natural });
      expect(row, `fixture: the seed holds ${target} '${String(natural)}'`).toBeDefined();
      where[field] = row!.id;
    } else {
      where[field] = value;
    }
  }
  return where;
};

const ACME = 'Acme Corporation';
const DAY_MS = 86_400_000;
// A contact the rep adds and marks primary. Not a seeded row: the seeded
// contact it displaces is (John Smith, Acme's seeded primary).
const NEW_PRIMARY = { first_name: 'Nora', last_name: 'Newhire', email: 'nora.newhire@acme.example.com' };

describe('a user edit to a seeded record survives a restart (#2139)', () => {
  let dir: string;
  let after: VerifyStack | undefined;
  // Each edited row as it read before the restart, by EDITS index.
  const edited: Rec[] = [];
  let acmeId: string;
  let newPrimaryId: string;
  // The control: a seeded task deleted before the restart. Its return proves
  // the cold boot really replayed the seed, so the edits surviving are not a
  // boot that seeded nothing.
  let deletedSubject: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'seed-replay-user-edits-'));
    const databaseFile = join(dir, 'crm.db');
    const before = await bootStack(artifact, bootOptions({ databaseFile }));
    const admin = await before.signIn();

    for (const edit of EDITS) {
      expect(Object.keys(edit.patch).every((f) => (dataset(edit.object, edit.keyPart).records as Rec[]).some((r) => f in r)),
        `fixture: the ${edit.object} dataset declares ${Object.keys(edit.patch).join(', ')}`).toBe(true);
      const where = await resolveKey(before, edit.key);
      const rows = await before.rows(edit.object, where);
      expect(rows, `fixture: one seeded ${edit.object} row for ${JSON.stringify(edit.key)}`).toHaveLength(1);
      for (const [field, value] of Object.entries(edit.patch)) {
        expect(rows[0]![field], `fixture: ${edit.object}.${field} is not already the edited value`).not.toEqual(value);
      }
      await before.hooks.run(edit.object, 'update', { id: rows[0]!.id, ...edit.patch }, { as: admin });
      const [row] = await before.rows(edit.object, { id: rows[0]!.id });
      for (const [field, value] of Object.entries(edit.patch)) {
        expect(row?.[field], `the edit did not land: ${edit.label}`).toEqual(value);
      }
      edited.push(row!);
    }

    // The rep adds a contact on Acme and marks them primary (Mark as Primary's
    // write); the one-primary rule clears the seeded primary.
    const [acme] = await before.rows('crm_account', { name: ACME });
    expect(acme, `fixture: the seed holds ${ACME}`).toBeDefined();
    acmeId = String(acme!.id);
    const created = (await before.hooks.run('crm_contact', 'insert',
      { ...NEW_PRIMARY, crm_account: acmeId, is_primary: false }, { as: admin })) as Rec;
    newPrimaryId = String(created.id);
    await before.hooks.run('crm_contact', 'update', { id: newPrimaryId, is_primary: true }, { as: admin });
    const primaries = await before.rows('crm_contact', { crm_account: acmeId, is_primary: true });
    expect(primaries.map((c) => c.id), 'the new contact did not become Acme\'s one primary').toEqual([newPrimaryId]);

    const control = (tasks.records as Rec[]).at(-1);
    expect(control, 'fixture: the task dataset seeds a task').toBeDefined();
    deletedSubject = String(control!.subject);
    const [doomed] = await before.rows('crm_task', { subject: deletedSubject });
    await before.hooks.run('crm_task', 'delete', { id: doomed!.id }, { as: admin });
    expect(await before.rows('crm_task', { subject: deletedSubject }), 'fixture: the control task was not deleted').toHaveLength(0);
    await before.stop();

    // The next restart, a day later. Only `Date` is faked, and it keeps
    // advancing, so the boot's own timers and waits run as they do for real.
    vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
    vi.setSystemTime(Date.now() + DAY_MS);
    after = await bootStack(await buildArtifactAgain(), bootOptions({ databaseFile }));
  }, 300_000);

  afterAll(async () => {
    await after?.stop();
    vi.useRealTimers();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('control: the restart ran a day later — the forecast snapshot the replay re-points reads that day', async () => {
    const [row] = await after!.rows('crm_forecast', { seed_key: 'demo_month_current' });
    expect(String(row?.snapshot_date).slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  });

  it('each lead timeline pointer still reads its event\'s end', async () => {
    const subjects = (leadInteractionPointers.records as Rec[]).map((p) => String(p.source_id));
    expect(subjects.length, 'fixture: the seed holds lead timeline pointers').toBeGreaterThan(0);
    for (const subject of subjects) {
      const [event] = await after!.rows('crm_event', { subject });
      const [pointer] = await after!.rows('sys_activity', { source_object: 'crm_event', source_id: event?.id });
      expect({ subject, at: pointer?.timestamp }).toEqual({ subject, at: event?.end_datetime });
    }
  });

  it('control: the restart replayed the seed — the deleted seeded task is back', async () => {
    expect(await after!.rows('crm_task', { subject: deletedSubject })).toHaveLength(1);
  });

  it.each(EDITS.map((edit, i) => [edit.label, i] as const))('%s: the edit survives', async (_label, i) => {
    const edit = EDITS[i]!;
    const [row] = await after!.rows(edit.object, { id: edited[i]!.id });
    const pick = (r: Rec | undefined) => Object.fromEntries(Object.keys(edit.patch).map((f) => [f, r?.[f]]));
    expect(pick(row)).toEqual(pick(edited[i]));
  });

  it('a rep\'s new primary contact is still Acme\'s one primary', async () => {
    const primaries = await after!.rows('crm_contact', { crm_account: acmeId, is_primary: true });
    expect(primaries.map((c) => c.id)).toEqual([newPrimaryId]);
  });
});
