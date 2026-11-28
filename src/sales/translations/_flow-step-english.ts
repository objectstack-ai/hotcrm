// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import type { TranslationBundle, TranslationData } from '@objectstack/spec/system';

/** The parts of a flow this reads: its name, its label and its nodes, nested ones included. */
interface FlowLike {
  name: string;
  label?: string;
  nodes?: readonly unknown[];
}

type Row = { label?: string; nodes?: Record<string, { label?: string }> };

/** Every node label of a flow by id, the nodes of a loop's or a branch's body included. */
function nodeLabels(flow: FlowLike): Map<string, string> {
  const found = new Map<string, string>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const node = value as Record<string, unknown>;
    if (typeof node.id === 'string' && typeof node.type === 'string' && typeof node.label === 'string') {
      found.set(node.id, node.label);
    }
    for (const child of Object.values(node)) visit(child);
  };
  visit(flow.nodes ?? []);
  return found;
}

/**
 * A package's flow-step bundle with its `en` pack, read off the flows.
 *
 * Every locale bundle this app registers carries the four locales the app
 * declares, English included (`test/docs-language-matrix.test.ts`). A flow
 * step's English name is the `label` written on the flow and on each node, so
 * the `en` pack of a `translations/flow-steps.ts` bundle is not written out
 * by hand: it is built here from the flows the package registers, for exactly
 * the flows and steps the bundle translates. A flow or step renamed in its
 * `*.flow.ts` is renamed in English with it, and a row that names a flow or a
 * step the package does not have stops the build with its name.
 */
export function withFlowStepEnglish(bundle: TranslationBundle, flows: readonly FlowLike[]): TranslationBundle {
  const byName = new Map(flows.map((flow) => [flow.name, flow]));
  const rows: Record<string, Row> = {};
  for (const [locale, data] of Object.entries(bundle)) {
    if (locale === 'en') throw new Error('withFlowStepEnglish: the bundle already writes an `en` pack');
    for (const [name, row] of Object.entries(((data as TranslationData).flows ?? {}) as Record<string, Row>)) {
      const flow = byName.get(name);
      if (!flow) throw new Error(`withFlowStepEnglish: ${locale} translates flow "${name}", which the package does not register`);
      const labels = nodeLabels(flow);
      const out = (rows[name] ??= {});
      if (row.label !== undefined && flow.label !== undefined) out.label = flow.label;
      for (const step of Object.keys(row.nodes ?? {})) {
        const label = labels.get(step);
        if (label === undefined) throw new Error(`withFlowStepEnglish: ${locale} translates step "${name}.${step}", which has no label on the flow`);
        (out.nodes ??= {})[step] = { label };
      }
    }
  }
  return { en: { flows: rows } as TranslationData, ...bundle };
}
