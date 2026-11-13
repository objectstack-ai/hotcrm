// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { leads } from '../src/sales/data/sales.seed';
import { bootOptions, buildArtifactAgain } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * A seeded lead the rep converted is still converted after a restart (#2134).
 *
 * The platform re-applies the app's seed on every boot. The lead dataset was
 * `upsert`, which compares only the fields the dataset declares and writes the
 * seeded values back over any that differ — as a system write, which the
 * converted-lead lock in `lead.hook.ts` lets through by design. A seeded lead
 * the rep had converted differed on `status`, so the next boot wrote its seeded
 * stage back and left the `is_converted` and `converted_*` columns, which the
 * dataset does not declare, as the conversion had set them: measured on
 * 18.0.0-next.2 as `{ status: 'contacted', is_converted: true }` after one
 * restart, the card's lead exactly. The dataset is insert-once (`ignore`) now;
 * the reasoning sits beside it in `src/sales/data/sales.seed.ts`.
 *
 * Measured the way an install meets it: the app boots over a database file, the
 * admin converts a seeded lead through Convert Lead's flow, the kernel stops, and
 * the app cold-boots over the same file (`databaseFile`, the handle's restart
 * seam), replaying the seed.
 *
 * The control that the cold boot replayed the lead dataset at all is a seed
 * lead the first boot never had: the restart boots an artifact whose lead
 * dataset carries one more row, as the next version shipping a new seed lead
 * would, so the replay must insert a key that never landed in the organization.
 * A deleted seeded lead is not that control: from 18.4.0 the platform remembers
 * which seed rows landed and leaves one a person deleted deleted
 * (objectstack#31021, #2439).
 */

/** Seeded leads, by their stage — read off the dataset rather than restated. */
const seeded = (status: string): Rec[] =>
  (leads.records as Rec[]).filter((r) => r.status === status && typeof r.email === 'string');

/**
 * The artifact with one more seed row in `object`'s dataset: what the next
 * version shipping a new seed row boots. A fresh object over the same packages.
 */
const withExtraSeedRow = (base: typeof artifact, object: string, row: Rec): typeof artifact => {
  const a = base as unknown as Rec;
  let grown = 0;
  const packages = (a.packages as Rec[]).map((p) => !Array.isArray(p.manifest?.data) ? p : {
    ...p,
    manifest: {
      ...p.manifest,
      data: (p.manifest.data as Rec[]).map((d) => d.object !== object ? d : (grown += 1, { ...d, records: [...(d.records as Rec[]), row] })),
    },
  });
  expect(grown, `fixture: one ${object} dataset grows a row`).toBe(1);
  return { ...a, packages } as typeof artifact;
};

/** The new seed lead the restart ships, shaped like a seeded new lead. */
const NEW_LEAD: Rec = {
  ...seeded('new').at(-1),
  first_name: 'Rhea', last_name: 'Lindqvist', company: 'Fjord Ferries',
  email: 'rhea.lindqvist@fjordferries.example.com', website: 'https://fjordferries.example.com',
};

describe('a seeded lead keeps its conversion across a restart (#2134)', () => {
  let dir: string;
  let after: VerifyStack | undefined;
  // The seeded lead converted before the restart, and its row then.
  let converted: Rec;
  // The control: a seed lead only the restart ships. Its arrival proves the
  // cold boot really replayed the lead dataset, so the conversion surviving is
  // not a boot that seeded nothing.
  const newEmail = String(NEW_LEAD.email);

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'lead-seed-replay-'));
    const databaseFile = join(dir, 'crm.db');
    expect((leads.records as Rec[]).map((r) => r.email), 'fixture: the new seed lead is not already seeded').not.toContain(newEmail);
    const before = await bootStack(artifact, bootOptions({ databaseFile }));
    const admin = await before.signIn();

    // The last seeded contacted lead is the card's own, Mira Costa.
    const target = seeded('contacted').at(-1);
    expect(target, 'fixture: the lead dataset seeds a contacted lead').toBeDefined();
    const [lead] = await before.rows('crm_lead', { email: target!.email });
    expect({ status: lead?.status, isConverted: lead?.is_converted }, 'fixture: the seeded lead is unconverted')
      .toEqual({ status: 'contacted', isConverted: false });

    const started = await before.flows.run('lead_conversion', { recordId: lead!.id }, { as: admin });
    const s = started as Rec;
    const prefilled: Rec = {};
    for (const f of ((s.screen ?? s.output?.screen)?.fields ?? []) as Rec[]) {
      if (f.defaultValue !== undefined) prefilled[f.name] = f.defaultValue;
    }
    const done = await before.flows.resume(started, { ...prefilled, createOpportunity: false }, { as: admin });
    expect(done.error ?? null, 'the conversion failed').toBeNull();
    [converted] = await before.rows('crm_lead', { id: lead!.id });
    expect({ status: converted?.status, isConverted: converted?.is_converted }, 'the conversion did not convert')
      .toEqual({ status: 'converted', isConverted: true });

    expect(await before.rows('crm_lead', { email: newEmail }), 'fixture: the first boot has no new seed lead').toHaveLength(0);
    await before.stop();

    after = await bootStack(withExtraSeedRow(await buildArtifactAgain(), 'crm_lead', NEW_LEAD), bootOptions({ databaseFile }));
  }, 240_000);

  afterAll(async () => {
    await after?.stop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('control: the restart replayed the lead dataset — the new seed lead is written', async () => {
    expect(await after!.rows('crm_lead', { email: newEmail })).toHaveLength(1);
  });

  it('the converted lead still reads converted, with its conversion links', async () => {
    const [lead] = await after!.rows('crm_lead', { id: converted.id });
    const pick = (r: Rec | undefined) => ({
      status: r?.status, is_converted: r?.is_converted, converted_date: r?.converted_date,
      converted_account: r?.converted_account, converted_contact: r?.converted_contact,
    });
    expect(pick(lead)).toEqual(pick(converted));
  });
});
