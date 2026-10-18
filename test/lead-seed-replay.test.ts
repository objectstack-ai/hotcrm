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
 */

/** Seeded leads, by their stage — read off the dataset rather than restated. */
const seeded = (status: string): Rec[] =>
  (leads.records as Rec[]).filter((r) => r.status === status && typeof r.email === 'string');

describe('a seeded lead keeps its conversion across a restart (#2134)', () => {
  let dir: string;
  let after: VerifyStack | undefined;
  // The seeded lead converted before the restart, and its row then.
  let converted: Rec;
  // The control: a seeded lead deleted before the restart. Its return proves
  // the cold boot really replayed the lead dataset, so the conversion surviving
  // is not a boot that seeded nothing.
  let deletedEmail: string;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'lead-seed-replay-'));
    const databaseFile = join(dir, 'crm.db');
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

    const control = seeded('new').at(-1);
    expect(control, 'fixture: the lead dataset seeds a new lead').toBeDefined();
    deletedEmail = String(control!.email);
    const [doomed] = await before.rows('crm_lead', { email: deletedEmail });
    await before.hooks.run('crm_lead', 'delete', { id: doomed!.id }, { as: admin });
    expect(await before.rows('crm_lead', { email: deletedEmail }), 'fixture: the control lead was not deleted').toHaveLength(0);
    await before.stop();

    after = await bootStack(await buildArtifactAgain(), bootOptions({ databaseFile }));
  }, 240_000);

  afterAll(async () => {
    await after?.stop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('control: the restart replayed the lead dataset — the deleted seeded lead is back', async () => {
    expect(await after!.rows('crm_lead', { email: deletedEmail })).toHaveLength(1);
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
