// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import { valueSchemaFor } from '@objectstack/spec/data';
import { CrmSeedData } from '../objectstack.composition';
import { Account } from '../src/sales/objects/account.object';
import { AccountViews } from '../src/sales/views/account.view';
import { hotcrmStack } from './helpers/verify-stack';

/**
 * Every seeded account gives Accounts by Location a pin (#2060 item 15, A-13).
 *
 * The map view plots `crm_account.office_location`, a `Field.location`, and
 * every seeded account left it blank, so the demo's map drew nothing and said
 * "9 records with missing or invalid coordinates excluded from the map"
 * (measured on 18.0.0-next.5). The seeds now carry each office's coordinates
 * in the shape the field declares. This file holds them to it twice: against
 * the field's own value contract (`valueSchemaFor`, ADR-0104), and as the
 * booted app stores them, which is the value the map reads.
 */

type Rec = Record<string, any>;

const accountSeed = CrmSeedData.find((s: Rec) => s.object === 'crm_account') as { records: Rec[] } | undefined;
const records: Rec[] = accountSeed?.records ?? [];
const map = (AccountViews.listViews as Rec).account_map as Rec;
const locationField = map.map.locationField as string;

describe('seeded accounts carry an office location (#2060 item 15)', () => {
  it('the map plots the field the seeds fill', () => {
    expect(map.type).toBe('map');
    expect(locationField).toBe('office_location');
    expect((Account.fields as Rec)[locationField].type).toBe('location');
  });

  it('every seeded account carries a value the field declares', () => {
    expect(records.length, 'no seed dataset for crm_account').toBeGreaterThan(0);
    const shape = valueSchemaFor((Account.fields as Rec)[locationField]);
    const bad = records
      .filter((r) => !shape.safeParse(r[locationField]).success)
      .map((r) => `${r.name}: ${JSON.stringify(r[locationField])}`);
    expect(bad, `accounts the map cannot plot:\n  ${bad.join('\n  ')}`).toEqual([]);
  });

  it('no two accounts share a pin', () => {
    const pins = records.map((r) => `${r[locationField]?.lat},${r[locationField]?.lng}`);
    expect(new Set(pins).size).toBe(records.length);
  });

  describe('as the booted app stores them', () => {
    let verify: VerifyStack;
    beforeAll(async () => {
      verify = await hotcrmStack();
    }, 120_000);

    it('every seeded account is stored with its coordinates', async () => {
      for (const seeded of records) {
        const [row] = await verify.rows('crm_account', { name: seeded.name });
        expect(row, `${seeded.name} was not seeded`).toBeDefined();
        expect(row![locationField], seeded.name).toEqual(seeded[locationField]);
      }
    });
  });
});
