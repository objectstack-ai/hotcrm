// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isSeedFileReference } from '@objectstack/spec/data';

type Dataset = { records?: unknown; files?: Record<string, unknown> };

/**
 * The bytes `objectstack build` carries for each `seedFile(path)` a seed record
 * names (objectstack#25779), placed into the SAME datasets, so the test boot
 * loads the seed the way `objectstack dev` and a built package do.
 *
 * Why the suite needs it (#2317): `@objectstack/verify` boots the source
 * config, not a built artifact, and on 18.3.0 it does not bundle seed files.
 * Without the bytes the seeder refuses the one activated contract and the one
 * accepted quote — each requires its signed copy — and the accepted quote's
 * lines with it, so the test data would differ from what an install boots.
 *
 * The walk is the CLI's (`datasetsOf`): the top level's `data`, the
 * manifest's, and each `packages[i].manifest` body's. Paths resolve against
 * the repo root, the directory holding `objectstack.config.ts`. A path that
 * names no file throws, as the build refuses it.
 */
export const placeSeedFiles = (stack: Record<string, any>, root = process.cwd()): void => {
  const lists = [stack.data, stack.manifest?.data, ...(stack.packages ?? []).map((p: any) => p?.manifest?.data)];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const dataset of list as Dataset[]) {
      if (!Array.isArray(dataset?.records)) continue;
      for (const record of dataset.records as Record<string, unknown>[]) {
        for (const value of Object.values(record ?? {})) {
          for (const ref of Array.isArray(value) ? value : [value]) {
            if (!isSeedFileReference(ref) || typeof ref.$file !== 'string') continue;
            const bytes = fs.readFileSync(path.resolve(root, ref.$file));
            // The app's seed files are PDFs; any other kind names its type.
            const contentType = ref.contentType ?? (ref.$file.endsWith('.pdf') ? 'application/pdf' : undefined);
            if (!contentType) throw new Error(`seedFile('${ref.$file}') names no contentType`);
            dataset.files = {
              ...(dataset.files ?? {}),
              [ref.$file]: {
                contentType,
                size: bytes.byteLength,
                sha256: createHash('sha256').update(bytes).digest('hex'),
                data: bytes.toString('base64'),
              },
            };
          }
        }
      }
    }
  }
};
