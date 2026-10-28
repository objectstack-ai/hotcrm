// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack, { packFor } from './helpers/composed-stack';

/**
 * The lifecycle diagrams in the package docs are the real state machines (#2327).
 *
 * The pages were meant to EMBED each object's state machine — a ```metadata
 * block the console renders live from the running metadata (ADR-0051), which
 * cannot drift. On the 18.2.0 pin `objectstack build` refuses every such block
 * in this artifact (`docs/metadata-embed-ref`: the lint looks the object up on
 * the artifact's top level, where a multi-package artifact carries none — the
 * service package's own page naming its own `crm_case` is refused too), so the
 * card's fallback applies: a ```mermaid diagram, written by hand.
 *
 * A hand-written diagram is exactly the hand-copied machine fact AGENTS.md
 * *Documentation discipline* rule 5 warns about, so this file holds each one to
 * the machine it draws, read from the compiled stack:
 *
 *  - every state the field offers is drawn, and nothing else is;
 *  - each state is labelled exactly as the locale's pack labels the option
 *    (the object's own label for English, the zh-CN pack for `.zh.md`);
 *  - every arrow is a transition the `state_machine` rule allows. A page may
 *    leave arrows out (the case diagram draws the usual path and says in prose
 *    that every open status can also escalate or close); it may not add one.
 *
 * Replace each diagram with the ```metadata embed once the platform builds it,
 * and retire this file with the last one.
 */

type AnyRec = Record<string, any>;

/** Each page that draws a lifecycle, and the machine it draws. */
const DIAGRAMS: { page: string; object: string }[] = [
  { page: 'docs/crm_sales_leads', object: 'crm_lead' },
  { page: 'docs/crm_sales_opportunities', object: 'crm_opportunity' },
  { page: 'docs/crm_sales_contracts', object: 'crm_contract' },
  { page: 'service/docs/crm_service_cases', object: 'crm_case' },
  { page: 'revenue/docs/crm_revenue_quotes', object: 'crm_quote' },
];

const LOCALES: { suffix: string; label: (object: string, field: string, value: string, fallback: string) => string }[] = [
  { suffix: '.md', label: (_o, _f, _v, fallback) => fallback },
  { suffix: '.zh.md', label: (o, f, v) => packFor('zh-CN')?.objects?.[o]?.fields?.[f]?.options?.[v] },
];

interface Diagram { states: Map<string, string>; edges: [string, string][] }

/** The `stateDiagram-v2` blocks of a page: `state "Label" as value` and `a --> b` lines. */
const diagramsIn = (markdown: string): Diagram[] =>
  [...markdown.matchAll(/```mermaid\n(stateDiagram-v2\n[\s\S]*?)```/g)].map(([, body]) => {
    const states = new Map<string, string>();
    const edges: [string, string][] = [];
    for (const line of body.split('\n').map((l) => l.trim())) {
      const state = line.match(/^state "([^"]+)" as ([a-z_]+)$/);
      const edge = line.match(/^([a-z_]+) --> ([a-z_]+)$/);
      if (state) states.set(state[2], state[1]);
      else if (edge) edges.push([edge[1], edge[2]]);
      else if (line && line !== 'stateDiagram-v2') throw new Error(`unreadable diagram line: "${line}"`);
    }
    return { states, edges };
  });

const machineOf = (objectName: string): { field: string; transitions: Record<string, string[]>; options: AnyRec[] } => {
  const object = ((stack as AnyRec).objects as AnyRec[]).find((o) => o.name === objectName);
  const rule = ((object?.validations ?? []) as AnyRec[]).find((v) => v.type === 'state_machine');
  if (!rule) throw new Error(`${objectName} carries no state_machine rule`);
  return { field: rule.field, transitions: rule.transitions, options: object!.fields[rule.field].options };
};

describe('the lifecycle diagrams in the package docs draw the real state machines (#2327)', () => {
  for (const { page, object } of DIAGRAMS) {
    for (const locale of LOCALES) {
      const file = `src/${page}${locale.suffix}`;
      it(`${file} draws ${object}'s machine`, () => {
        const found = diagramsIn(readFileSync(join(REPO_ROOT, file), 'utf8'));
        expect(found, `${file} should carry exactly one stateDiagram`).toHaveLength(1);
        const [{ states, edges }] = found;
        const { field, transitions, options } = machineOf(object);

        expect([...states.keys()].sort(), 'the drawn states are the field\'s options').toEqual(
          options.map((o) => String(o.value)).sort(),
        );
        for (const o of options) {
          expect(states.get(String(o.value)), `${o.value} label`).toBe(
            locale.label(object, field, String(o.value), String(o.label)),
          );
        }
        const illegal = edges.filter(([from, to]) => !(transitions[from] ?? []).includes(to));
        expect(illegal.map(([a, b]) => `${a} --> ${b}`), 'arrows the state machine does not allow').toEqual([]);
        expect(edges.length).toBeGreaterThan(0);
      });
    }
  }

  it('no other package page draws a state diagram', () => {
    const others = [
      'docs/crm_overview', 'docs/crm_admin_access', 'docs/crm_admin_automation', 'service/docs/crm_service_knowledge',
      'docs/crm_getting_started', 'docs/crm_sales_activities', 'docs/crm_analytics_metrics', 'docs/crm_ai_skills',
      'docs/crm_admin_setup', 'docs/crm_admin_data_import',
    ].flatMap((p) => [`src/${p}.md`, `src/${p}.zh.md`]);
    expect(others.filter((f) => diagramsIn(readFileSync(join(REPO_ROOT, f), 'utf8')).length > 0)).toEqual([]);
  });
});
