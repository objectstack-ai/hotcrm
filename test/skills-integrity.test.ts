// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from './helpers/composed-stack';

/**
 * Skill reference guards — every capability a skill CLAIMS must resolve.
 *
 * The defect class: a skill's `tools: [...]` is a list of NAMES. `os
 * validate` and `build` check that each name is a well-formed snake_case
 * string and stop there; `objectstack lint --strict` resolves it (see below).
 * At runtime an unresolved name is dropped silently, so the model is handed
 * instructions ("call `triage_case` first") describing a capability it does
 * not have, and improvises. Every instance of this bug shipped green: issue
 * #493 counted eleven such references across six skills and #512 removed
 * ten, none of which any check could see.
 *
 * Note the trap in "just define the missing tool": per `ToolSchema`, AI tool
 * metadata is a READ-ONLY PROJECTION for Studio discovery — it has no
 * `implementation` field and no framework executor loads it. A hand-authored
 * `defineTool` record would satisfy a naive existence check while remaining
 * exactly as unrunnable. So the resolvable universe is deliberately narrow:
 * platform built-ins, and the `action_<name>` tools the runtime materialises
 * from Actions that opted in.
 *
 * Kept in its own file rather than appended to metadata-references.test.ts,
 * which guards UI metadata and is a busy merge surface.
 */

type AnyRec = Record<string, any>;
const skills: AnyRec[] = (stack as any).skills ?? [];
const actions: AnyRec[] = (stack as any).actions ?? [];
const flows: AnyRec[] = (stack as any).flows ?? [];
const toolMetadata: AnyRec[] = (stack as any).tools ?? [];

const skillNames = new Set(skills.map((s) => s.name));
const flowNames = new Set(flows.map((f) => f.name));
const action = (name: string) => actions.find((a) => a.name === name);

/** `action_<name>` — the tool the runtime materialises from an Action (ADR-0011). */
const ACTION_TOOL_PREFIX = 'action_';

describe('skill tool references resolve', () => {
  it('every skill declares at least one tool', () => {
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      expect(Array.isArray(skill.tools), `${skill.name}: tools must be an array`).toBe(true);
      expect(skill.tools.length, `${skill.name}: declares no tools`).toBeGreaterThan(0);
    }
  });

  // ⚰️ RETIRED (#1583): "every tool name resolves to a platform built-in or a
  // materialised Action tool". `objectstack lint --strict` reports a plain
  // name, an `action_<name>` and a wildcard that resolve to nothing as
  // `ai-skill-tool-unresolved`, and `pnpm lint` fails on it. That rule counts
  // a `stack.tools` record as resolving, which is why the tool-metadata pin
  // below must stay: it is what goes red on a name only such a record serves.

  it('every referenced Action is AI-exposed and has a headless path', () => {
    const referenced = new Set(
      skills
        .flatMap((s) => s.tools as string[])
        .filter((t) => t.startsWith(ACTION_TOOL_PREFIX) && !t.endsWith('*'))
        .map((t) => t.slice(ACTION_TOOL_PREFIX.length)),
    );

    expect(referenced.size, 'expected at least one Action-backed skill step').toBeGreaterThan(0);

    for (const name of referenced) {
      const a = action(name)!;

      // ADR-0011: opt-in, default off. Without `exposed` the runtime never
      // materialises the tool, so the reference is dead however real the
      // Action is — the exact regression #512's follow-up commit fixed.
      expect(a.ai?.exposed, `${name}: referenced by a skill but not \`ai.exposed\``).toBe(true);
      expect(
        a.ai?.description?.length ?? 0,
        `${name}: \`ai.exposed\` requires an LLM-facing description (≥40 chars)`,
      ).toBeGreaterThanOrEqual(40);

      // A modal Action collects its input from a person and has no headless
      // path, so no tool is generated even when it opts in. Only flow-typed
      // Actions with a resolvable target, or script-typed Actions with a
      // body, can actually run for an agent.
      if (a.type === 'flow') {
        expect(a.target, `${name}: flow-typed Action with no target`).toBeTruthy();
        expect(flowNames, `${name}: target flow "${a.target}" is not defined`).toContain(a.target);
      } else if (a.type === 'script') {
        expect(a.body?.source, `${name}: script-typed Action with no body`).toBeTruthy();
      } else {
        expect.fail(
          `${name}: type "${a.type}" has no headless path, so \`${ACTION_TOOL_PREFIX}${name}\` ` +
            'is never materialised. Point the skill at the button instead of claiming to press it.',
        );
      }
    }
  });

  it('does not lean on AI tool metadata, which never executes', () => {
    // ToolSchema: "[READ-ONLY PROJECTION — not an execution entry point]
    // Authoring a tool as metadata does NOT make it runnable." Declaring
    // `tools` on the stack to satisfy a dangling reference would restore
    // green CI and none of the behaviour.
    expect(
      toolMetadata.map((t) => t.name),
      'stack.tools is a Studio-discovery projection with no executor — a skill ' +
        'cannot call these. Route the capability through an Action instead.',
    ).toEqual([]);
  });
});

describe('skill cross-references resolve', () => {
  it('every skill handed off to in instructions exists', () => {
    // `case_triage` used to hand off to `response_drafting`, a skill that was
    // never defined (issue #493); the real one is `email_drafting`.
    const dangling: string[] = [];

    for (const skill of skills) {
      const instructions: string = skill.instructions ?? '';
      for (const [, referenced] of instructions.matchAll(/`([a-z][a-z0-9_]*)`\s+skill/g)) {
        if (!skillNames.has(referenced)) {
          dangling.push(`${skill.name} → \`${referenced}\` skill`);
        }
      }
    }

    expect(dangling, `Instructions hand off to skills that do not exist:\n  ${dangling.join('\n  ')}`).toEqual([]);
  });

  it('every defined skill is registered on the stack', () => {
    // A skill left out of `src/skills/index.ts` is inert: it validates, it
    // typechecks, and the assistant never sees it.
    expect(skillNames.size, 'duplicate skill names on the stack').toBe(skills.length);
    for (const name of ['live_data', 'lead_qualification', 'email_drafting', 'revenue_forecasting', 'case_triage', 'customer_360']) {
      expect(skillNames, `skill "${name}" is not registered`).toContain(name);
    }
  });
});
