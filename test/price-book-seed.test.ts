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
 * - a missing entry is written back by the replay: the path an existing
 *   database takes on its first boot of this version, when the whole book is
 *   missing (the control that the replay ran at all);
 * - an entry a person repriced keeps its price (`mode: 'ignore'`);
 * - nothing is duplicated: still one Standard book, one entry per product.
 */

const catalogue = products.records as Rec[];
const SMB = 'ObjectStack Platform (SMB Edition)';
const DROPPED = 'Cloud Hosting (Annual)';

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
  let firstPrices: Map<string, number>;

  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'price-book-seed-'));
    const databaseFile = join(dir, 'crm.db');
    const before = await bootStack(artifact, bootOptions({ databaseFile }));
    const admin = await before.signIn();
    firstBoot = await standardOf(before);
    firstPrices = new Map(firstBoot.entries.map((e) => [String(e.crm_product), Number(e.list_price)]));

    const smbId = await productId(before, SMB);
    const [smbEntry] = firstBoot.entries.filter((e) => e.crm_product === smbId);
    await before.hooks.run('crm_price_book_entry', 'update', { id: smbEntry!.id, list_price: 17000 }, { as: admin });
    const droppedId = await productId(before, DROPPED);
    const [droppedEntry] = firstBoot.entries.filter((e) => e.crm_product === droppedId);
    await before.hooks.run('crm_price_book_entry', 'delete', { id: droppedEntry!.id }, { as: admin });
    expect(await before.rows('crm_price_book_entry', { id: droppedEntry!.id }), 'fixture: the entry was not deleted').toHaveLength(0);
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
      const id = await productId(after!, String(product.name));
      expect(firstPrices.get(id), `the Standard price of ${String(product.name)}`).toBe(product.list_price);
    }
  });

  it('the restart writes a missing entry back, at the catalogue price', async () => {
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
