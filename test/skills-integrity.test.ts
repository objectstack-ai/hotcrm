// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * Skill reference guards — every capability a skill CLAIMS must resolve.
 *
 * The defect class: a skill's `tools: [...]` is a list of NAMES. `os
 * validate` and `build` check that each name is a well-formed snake_case
 * string and stop there — nothing resolves it against a tool that exists.
 * At runtime an unresolved name is dropped silently, so the model is handed
 * instructions ("call `search_knowledge` for the policy context") describing
 * a capability it does not have, and improvises. Every instance of this bug
 * shipped green: issue #493 counted eleven fictional tools across six
 * skills, #512 removed ten of them, and `search_knowledge` survived in
 * `customer_360` because nothing in CI could see it.
 *
 * Note the trap in "just define the missing tool": per `ToolSchema`, AI tool
 * metadata is a READ-ONLY PROJECTION for Studio discovery — it has no
 * `implementation` field and no framework executor loads it. A hand-authored
 * `defineTool` record would satisfy a naive existence check while remaining
 * exactly as unrunnable. So the resolvable universe below is deliberately
 * narrow: platform built-ins, and the `action_<name>` tools the runtime
 * materialises from Actions that opted in.
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

/**
 * Tools the AI runtime provides — the only names a skill may reference
 * without anything in this repo defining them.
 *
 * The runtime that serves them ships in the closed cloud package
 * (`@objectstack/service-ai`, ADR-0025 §2), so the open-edition
 * `node_modules` this repo installs cannot be read for the authoritative
 * list. What IS verifiable locally is the MCP bridge in
 * `@objectstack/mcp@16.1.0`, which registers the same registry's data +
 * metadata tools: `list_objects`, `describe_object`, `query_records`,
 * `get_record`, `aggregate_data`, `create_record`, `update_record`,
 * `delete_record`, `list_actions`, `run_action`, `validate_expression`.
 *
 * This list is the READ subset of that surface plus `visualize_data`.
 * Deliberately excluded: the write tools (`create_record` /
 * `update_record` / `delete_record`). HotCRM's state changes go through
 * Actions so that validation, sharing rules and audit match the UI path —
 * a skill reaching for raw record writes is a design regression, and this
 * list is where that gets caught.
 *
 * Adding a name here is a claim that the platform serves it. Make that
 * claim deliberately: an entry that is merely aspirational reintroduces
 * exactly the bug this file exists to prevent.
 */
const PLATFORM_TOOLS = new Set([
  'list_objects',
  'describe_object',
  'query_records',
  'get_record',
  'aggregate_data',
  // Charting tool served by the cloud AI runtime's analytics tier. Not in
  // the open-edition bundle (nothing AI-runtime is), verified against the
  // upstream reference-integrity rule when `revenue_forecasting` adopted it
  // in #512.
  'visualize_data',
]);

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

  it('every tool name resolves to a platform built-in or a materialised Action tool', () => {
    const dangling: string[] = [];

    for (const skill of skills) {
      for (const tool of skill.tools as string[]) {
        // Trailing-wildcard subscriptions (`action_*`) match a family of
        // dynamically registered tools; resolve the prefix, not the name.
        if (tool.endsWith('*')) {
          const prefix = tool.slice(0, -1);
          const matches =
            [...PLATFORM_TOOLS].some((t) => t.startsWith(prefix)) ||
            (prefix === ACTION_TOOL_PREFIX && actions.length > 0) ||
            actions.some((a) => `${ACTION_TOOL_PREFIX}${a.name}`.startsWith(prefix));
          if (!matches) dangling.push(`${skill.name} → ${tool} (wildcard matches nothing)`);
          continue;
        }

        if (PLATFORM_TOOLS.has(tool)) continue;

        if (tool.startsWith(ACTION_TOOL_PREFIX)) {
          const actionName = tool.slice(ACTION_TOOL_PREFIX.length);
          if (!action(actionName)) {
            dangling.push(`${skill.name} → ${tool} (no Action named "${actionName}")`);
          }
          continue;
        }

        dangling.push(`${skill.name} → ${tool}`);
      }
    }

    expect(
      dangling,
      `Skills reference tools that nothing serves:\n  ${dangling.join('\n  ')}\n` +
        'Either drop the reference, or route the step through an Action with ' +
        '`ai: { exposed: true, description }`. Authoring `defineTool` metadata ' +
        'does NOT make a tool runnable (ToolSchema is a read-only projection).',
    ).toEqual([]);
  });

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
