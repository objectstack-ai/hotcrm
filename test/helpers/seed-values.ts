// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { ExpressionEngine } from '@objectstack/formula';

type Rec = Record<string, unknown>;

/** A CEL envelope (`cel\`…\``, `expression(…)`) — the form a seed date is authored in. */
export const isSeedExpression = (v: unknown): v is { dialect: string; source: string } =>
  typeof v === 'object' && v !== null && typeof (v as { source?: unknown }).source === 'string';

/**
 * Seed rows as the seed loader writes them at `now`: every CEL value resolved,
 * everything else as authored.
 *
 * Seed dates are expressions resolved when the rows are written (#2431) — the
 * forecast periods included, which were once plain strings the module computed
 * when it loaded and so froze the build day into the artifact. A test that
 * reads a seed row's VALUE reads it through here; reading the row raw sees an
 * envelope.
 */
export const resolveSeedRecords = (records: readonly Rec[], now: Date = new Date()): Rec[] =>
  records.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => {
    if (!isSeedExpression(v)) return [k, v];
    const out = ExpressionEngine.evaluate(v as never, { now, record: {} }) as { ok: boolean; value?: unknown; error?: unknown };
    if (!out.ok) throw new Error(`seed value ${String(r.seed_key ?? '')}.${k} does not resolve: ${JSON.stringify(out.error)}`);
    return [k, out.value];
  })));
