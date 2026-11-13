// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bootStack, type VerifyStack } from '@objectstack/verify';
import artifact from '../objectstack.config';
import { products } from '../src/revenue/data/catalog.seed';
import { STANDARD_PRICE_BOOK } from '../src/revenue/data/price-book.seed';
import { bootOptions, buildArtifactAgain } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * The seeded Standard price book (#2313, REQ-0009 phase 1), across a restart.
 *
 * The card asks for a Standard book built from every product's `list_price`,
 * written once on an upgraded install and never again: no migration script,
 * the platform's seed replay is the mechanism. Measured the way an install
 * meets it: boot over a database file, change the book, stop, cold-boot over
 * the same file.
 *
 * - an entry the database lacks is written by the replay: the path an
 *   existing database takes on its first boot of this version, when the whole
 *   book is missing (the control that the replay ran at all). The database is
 *   first built from the artifact with that one entry held back, as a database
 *   built before it shipped was, so the restart meets a key that never landed
 *   in the organization. A deleted entry is not that path: from 18.4.0 the
 *   platform remembers which seed rows landed and leaves one a person deleted
 *   deleted (objectstack#31021, #2439);
 * - an entry a person repriced keeps its price (`mode: 'ignore'`);
 * - nothing is duplicated: still one Standard book, one entry per product.
 */

const catalogue = products.records as Rec[];
const SMB = 'ObjectStack Platform (SMB Edition)';
/** Every seed dataset the artifact ships, across its packages. */
const datasetsOf = (base: typeof artifact): Rec[] =>
  ((base as unknown as Rec).packages as Rec[]).flatMap((p) => (p.manifest?.data ?? []) as Rec[]);
// The entry the upgraded database lacks: a product no seeded quote line names.
// A quote line prices from its book's entry and is refused without one, so
// holding back an entry a quote line needs would change the first boot; an
// opportunity line prices from the product itself.
const quoteSeeds = JSON.stringify(datasetsOf(artifact).filter((d) => d.object === 'crm_quote_line_item'));
const DROPPED = String(catalogue.filter((p) => p.name !== SMB && !quoteSeeds.includes(`"${String(p.name)}"`)).at(-1)?.name);

/**
 * The artifact with one seed row of `object` held back: what a database built
 * before that row shipped was seeded from. A fresh object over the same
 * packages; the next boot of the whole artifact meets the row as new.
 */
const withoutSeedRow = (base: typeof artifact, object: string, isRow: (r: Rec) => boolean): typeof artifact => {
  const a = base as unknown as Rec;
  let held = 0;
  const packages = (a.packages as Rec[]).map((p) => !Array.isArray(p.manifest?.data) ? p : {
    ...p,
    manifest: {
      ...p.manifest,
      data: (p.manifest.data as Rec[]).map((d) => d.object !== object ? d : {
        ...d,
        records: (d.records as Rec[]).filter((r) => (isRow(r) ? (held += 1, false) : true)),
      }),
    },
  });
  expect(held, `fixture: exactly one ${object} seed row is held back`).toBe(1);
  return { ...a, packages } as typeof artifact;
};

const standardOf = async (stack: VerifyStack): Promise<{ book: Rec; entries: Rec[] }> => {
  const books = await stack.rows('crm_price_book', { name: STANDARD_PRICE_BOOK });
  expect(books, 'one Standard book').toHaveLength(1);
  return { book: books[0]!, entries: await stack.rows('crm_price_book_entry', { crm_price_book: books[0]!.id }) };
};
const productId = async (stack: VerifyStack, name: string): Promise<string> => {
  const [row] = await stack.rows('crm_product', { name });
  expect(row, `fixture: the seed holds product ${name}`).toBeDefined();
  return String(row!.id);
};

describe('the seeded Standard price book across a restart', () => {
  let dir: string;
  let after: VerifyStack | undefined;
  let firstBoot: { book: Rec; entries: Rec[] };
  // The fresh book's prices, by product name.
  let firstPrices: Map<string, number>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'price-book-seed-'));
    const databaseFile = join(dir, 'crm.db');
    // The first boot of a full artifact, the book every fresh install gets.
    const fresh = await bootStack(artifact, bootOptions({ databaseFile: join(dir, 'fresh.db') }));
    firstBoot = await standardOf(fresh);
    const nameOf = new Map((await fresh.rows('crm_product')).map((p) => [String(p.id), String(p.name)]));
    firstPrices = new Map(firstBoot.entries.map((e) => [nameOf.get(String(e.crm_product))!, Number(e.list_price)]));
    await fresh.stop();

    // The upgraded database: built before the DROPPED entry shipped.
    const before = await bootStack(
      withoutSeedRow(await buildArtifactAgain(), 'crm_price_book_entry', (r) => r.crm_product === DROPPED),
      bootOptions({ databaseFile }),
    );
    const admin = await before.signIn();
    const { entries } = await standardOf(before);
    const droppedId = await productId(before, DROPPED);
    expect(entries.filter((e) => e.crm_product === droppedId), 'fixture: the first boot seeded the held-back entry').toHaveLength(0);

    const smbId = await productId(before, SMB);
    const [smbEntry] = entries.filter((e) => e.crm_product === smbId);
    await before.hooks.run('crm_price_book_entry', 'update', { id: smbEntry!.id, list_price: 17000 }, { as: admin });
    await before.stop();

    after = await bootStack(await buildArtifactAgain(), bootOptions({ databaseFile }));
  }, 300_000);

  afterAll(async () => {
    await after?.stop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  });

  it('a fresh boot builds the Standard book from every catalogue product at its list price', async () => {
    expect(firstBoot.book).toMatchObject({ is_standard: true, is_active: true });
    expect(firstBoot.entries).toHaveLength(catalogue.length);
    for (const product of catalogue) {
      expect(firstPrices.get(String(product.name)), `the Standard price of ${String(product.name)}`).toBe(product.list_price);
    }
  });

  it('the restart writes an entry the database lacks, at the catalogue price', async () => {
    const { entries } = await standardOf(after!);
    const droppedId = await productId(after!, DROPPED);
    const back = entries.filter((e) => e.crm_product === droppedId);
    expect(back).toHaveLength(1);
    expect(back[0]!.list_price).toBe(catalogue.find((p) => p.name === DROPPED)!.list_price);
  });

  it('a repriced entry keeps its price', async () => {
    const { entries } = await standardOf(after!);
    const smbId = await productId(after!, SMB);
    expect(entries.filter((e) => e.crm_product === smbId).map((e) => e.list_price)).toEqual([17000]);
  });

  it('nothing is duplicated: one standard book, one entry per product', async () => {
    expect(await after!.rows('crm_price_book', { is_standard: true })).toHaveLength(1);
    const { entries } = await standardOf(after!);
    expect(entries).toHaveLength(catalogue.length);
    expect(new Set(entries.map((e) => e.crm_product)).size).toBe(catalogue.length);
  });
});
