// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ObjectQL } from '@objectstack/objectql';
import { InMemoryDriver } from '@objectstack/driver-memory';
import { makeHarness } from './helpers/hook-harness';

/**
 * The predicate key on `ctx.api` reads is `where`. This file is the proof.
 *
 * Every other hook test in this repo runs against `test/helpers/hook-harness.ts`
 * — a hand-written stand-in. A stand-in can only disprove what it models, and
 * this one used to accept `filter` as a synonym for `where`, so a whole class
 * of "reads the wrong record" bugs was invisible: the suite was green while
 * eight hooks were querying by a key the kernel drops on the floor.
 *
 * So these tests do NOT use the harness for the kernel claims. They stand up a
 * real ObjectQL engine on the in-memory driver and query it through a real
 * `ScopedContext` — which is literally the object the kernel injects as
 * `ctx.api` (see `ObjectQL.buildHookApi`). What passes here is what happens in
 * production.
 */

// Persistence off: the memory driver defaults to writing
// `.objectstack/data/memory-driver.json` and would otherwise carry rows over
// between runs, so "the first row" would mean a different row each time.
//
// The schema is deliberately minimal — this exercises the query layer, not the
// field system. `ServiceObject`'s field type demands every resolved property
// (`required`, `searchable`, …) that the registry fills in at runtime, so the
// literal is cast rather than padded with a dozen irrelevant defaults.
const makeEngine = () =>
  ObjectQL.create({
    datasources: { default: new InMemoryDriver({ persistence: false }) },
    objects: {
      crm_account: {
        name: 'crm_account',
        fields: {
          id: { type: 'text' },
          name: { type: 'text' },
          annual_revenue: { type: 'number' },
        },
      },
    } as never,
  });

describe('ctx.api query predicate — against the real kernel', () => {
  let ql: Awaited<ReturnType<typeof makeEngine>>;
  let api: ReturnType<typeof ql.createContext>;
  let first: Record<string, any>;
  let second: Record<string, any>;

  beforeAll(async () => {
    ql = await makeEngine();
    api = ql.createContext({ isSystem: true });
    // Two rows, deliberately in insertion order: "the first row" is a
    // meaningful, distinguishable answer only if there is a second one.
    first = await api.object('crm_account').insert({ name: 'First Row', annual_revenue: 100 });
    second = await api.object('crm_account').insert({ name: 'Second Row', annual_revenue: 200 });
  });

  afterAll(async () => {
    await ql?.close();
  });

  describe('where: — the supported spelling', () => {
    it('findOne returns the record actually asked for', async () => {
      const hit = await api.object('crm_account').findOne({ where: { id: second.id } });
      expect(hit?.id).toBe(second.id);
      expect(hit?.name).toBe('Second Row');
    });

    it('findOne returns null when nothing matches', async () => {
      const hit = await api.object('crm_account').findOne({ where: { id: 'no_such_id' } });
      expect(hit).toBeNull();
    });

    it('count counts only the matching rows', async () => {
      expect(await api.object('crm_account').count({ where: { annual_revenue: 100 } })).toBe(1);
    });

    it('find returns only the matching rows', async () => {
      const rows = await api.object('crm_account').find({ where: { annual_revenue: 200 } });
      expect(rows.map((r: any) => r.name)).toEqual(['Second Row']);
    });
  });

  /**
   * Characterisation of the kernel as it ships in @objectstack/objectql 16.1.0.
   * These are NOT the behaviour we want — they are the trap this change exists
   * to close, pinned so nobody "helpfully" reintroduces `filter` believing the
   * two spellings are interchangeable.
   *
   * If one of these starts failing, the platform has fixed the underlying
   * silent-drop (reported separately to the @objectstack maintainers — it is
   * framework behaviour, not ours to patch here). That is good news: confirm
   * against the release notes, then relax the assertion. Do not just delete it,
   * and do not read a kernel fix as licence to go back to `filter` — `where` is
   * the spelling every read path has always honoured.
   */
  describe('filter: — the unsupported spelling the kernel drops silently', () => {
    it('findOne ignores the predicate and yields the first row', async () => {
      const hit = await api.object('crm_account').findOne({ filter: { id: second.id } } as any);
      expect(hit?.id).not.toBe(second.id);
      expect(hit?.id).toBe(first.id);
    });

    it('findOne yields the first row even when the predicate matches nothing', async () => {
      // The most dangerous shape: a caller that checks for null gets a record.
      const hit = await api.object('crm_account').findOne({ where: undefined, filter: { id: 'no_such_id' } } as any);
      expect(hit).not.toBeNull();
      expect(hit?.id).toBe(first.id);
    });

    it('count ignores the predicate and counts the whole object', async () => {
      const n = await api.object('crm_account').count({ filter: { annual_revenue: 100 } } as any);
      expect(n).toBe(2); // 1 row actually matches
    });

    it('never throws — which is exactly why this was invisible', async () => {
      await expect(
        api.object('crm_account').findOne({ filter: { id: 'no_such_id' } } as any),
      ).resolves.toBeDefined();
    });
  });
});

describe('no hook may query by `filter`', () => {
  const hookDir = join(process.cwd(), 'src', 'objects');
  const hookFiles = readdirSync(hookDir).filter((f) => f.endsWith('.hook.ts'));

  it('finds hook files to check (guards against a silently empty scan)', () => {
    expect(hookFiles.length).toBeGreaterThan(10);
  });

  it.each(hookFiles)('%s uses `where:`, never `filter:`', (file) => {
    const src = readFileSync(join(hookDir, file), 'utf8');
    // `.filter(` (the array method) is fine; `filter:` as an object key is not.
    const offenders = src
      .split('\n')
      .map((line, i) => ({ line: line.trim(), no: i + 1 }))
      .filter(({ line }) => /(^|[{,\s])filter\s*:/.test(line));
    expect(
      offenders,
      `${file} passes a \`filter:\` query key — the kernel drops it and reads the wrong record; use \`where:\``,
    ).toEqual([]);
  });
});

describe('the hook harness must not be more permissive than the kernel', () => {
  it('rejects `filter` instead of quietly treating it as `where`', async () => {
    const h = makeHarness({ crm_account: [{ id: 'a1' }, { id: 'a2' }] });
    await expect(
      h.api.object('crm_account').findOne({ filter: { id: 'a2' } } as any),
    ).rejects.toThrow(/filter/);
  });

  it('still honours `where`', async () => {
    const h = makeHarness({ crm_account: [{ id: 'a1' }, { id: 'a2' }] });
    const hit = await h.api.object('crm_account').findOne({ where: { id: 'a2' } });
    expect(hit?.id).toBe('a2');
  });
});
