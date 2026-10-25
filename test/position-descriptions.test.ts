// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { PositionSchema } from '@objectstack/spec/identity';
import stack from './helpers/composed-stack';
import { CrmPositions } from '../src/sales/sharing/positions';

/**
 * Every HotCRM position says what it is for (#2249).
 *
 * A position's `description` is served with its metadata for Setup →
 * Positions to show. Before #2249 none of the twelve carried one, so Setup
 * could not answer "who belongs in Sales Manager?". This pins the business
 * fact that every declared position,
 * as the composed app serves it, has a one-sentence description.
 *
 * A sentence here means: non-empty, starts with a capital letter, ends with
 * one full stop and contains no other sentence break. It is deliberately not a
 * copy of the wording, which is the source's to own.
 */
const served: Array<Record<string, unknown>> = ((stack as any).positions ?? []) as Array<Record<string, unknown>>;

describe('position descriptions (#2249)', () => {
  it('serves all twelve positions declared in positions.ts', () => {
    expect(CrmPositions).toHaveLength(12);
    expect(served.map((p) => p.name).sort()).toEqual(CrmPositions.map((p) => p.name).sort());
  });

  it.each(CrmPositions.map((p) => [p.name]))('%s has a one-sentence business description', (name) => {
    const position = served.find((p) => p.name === name);
    const description = position?.description;
    expect(typeof description).toBe('string');
    const text = String(description).trim();
    expect(text).toMatch(/^[A-Z].*\.$/);
    // One sentence: the only full stop (or ? / !) followed by a space or the end is the last character.
    expect(text.slice(0, -1)).not.toMatch(/[.!?](\s|$)/);
    expect(text.length).toBeLessThanOrEqual(160);
    // The platform's own schema keeps the key (an unknown or stripped key would read back undefined).
    expect(PositionSchema.parse(position).description).toBe(description);
  });

  it('gives no two positions the same description', () => {
    const texts = CrmPositions.map((p) => p.description);
    expect(new Set(texts).size).toBe(texts.length);
  });
});
