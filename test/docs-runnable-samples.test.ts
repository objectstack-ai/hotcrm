// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AgentSchema } from '@objectstack/spec/ai';
import { REPO_ROOT } from './helpers/repo-root';

/*
 * Runnable samples — a snippet a reader is invited to paste must work (#606,
 * #813).
 *
 * Split out of `test/docs-drift.test.ts` whole (#1196); see the SPLIT BY
 * FAMILY table there for the other families. Both rules below guard the same
 * surface for the same reason: a fenced block is prose to every other gate
 * this repo runs — `os validate` and `pnpm lint` walk authored metadata and
 * never open a code fence — so a sample naming an agent the runtime refuses,
 * or a params key nothing can deliver, fails at the reader's terminal and
 * nowhere earlier.
 */

/**
 * Agent-name drift — a copy-pasteable sample must not name an agent that the
 * runtime refuses to load.
 *
 * `sales_copilot` was retired in #512 (app-authored agents removed; the surface
 * is skills-only per ADR-0063 §2) and #586 cleared the two `src/` references,
 * but the flagship "Wow #1 — live schema" demo kept POSTing it as the `agent`
 * of `/api/v1/ai/chat` in four places: the runnable script and all three locale
 * docs (#606). Nothing was checking, because an agent name in a fenced curl is
 * just prose to every gate this repo runs — `os validate` and `pnpm lint` walk
 * authored metadata, and there is no authored agent left for them to walk. The
 * symptom only appears at demo time: `loadAgent()` refuses the non-platform
 * name, and the script (`curl -fsS`) aborts at step 2.
 *
 * So the check has to live where the name lives — in the text. This walks every
 * doc's code fences plus the demo scripts (a shell script is code end to end),
 * pulls each `agent:` / `defaultAgent:` value, and requires it to be a PLATFORM
 * agent. Architecture ruling (2026-08-04): AI capability is implemented by
 * agents in objectstack-ai/cloud; app projects define skills only, so no
 * self-named agent may reappear here — in metadata OR in a sample a reader is
 * invited to paste into a terminal.
 *
 * The platform set is READ FROM THE SPEC (`AgentSchema.shape.surface`), the
 * same derivation `metadata-references.test.ts` uses for `App.defaultAgent` —
 * these two guards cover the same contract on its two surfaces (authored
 * binding / documented sample) and should never disagree about the set.
 */
describe('documented agent names resolve to a platform agent', () => {
  /** `['ask', 'build']` — straight off the spec's own surface enum. */
  const PLATFORM_AGENTS: string[] = (() => {
    const surface = (AgentSchema as unknown as { shape: Record<string, any> }).shape.surface;
    const enumSchema = typeof surface.removeDefault === 'function' ? surface.removeDefault() : surface;
    return enumSchema.options as string[];
  })();

  /** Files whose whole body is code — no fence to unwrap. */
  const SCRIPT_DIRS = ['scripts'];
  /** Prose files: only the fenced blocks are samples someone will run. */
  const DOC_DIRS = ['content/docs', 'src/docs'];

  /**
   * Depth-first walk returning REPO_ROOT-relative paths. Hand-rolled rather
   * than `readdirSync(..., { recursive: true })`: the repo's @types/node has no
   * such overload, so the recursive form typechecks red under `pnpm typecheck`.
   */
  const walk = (dir: string, exts: string[]): string[] => {
    const root = join(REPO_ROOT, dir);
    if (!existsSync(root)) return [];
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const rel = join(dir, entry.name);
      if (entry.isDirectory()) return walk(rel, exts);
      return exts.some((e) => entry.name.endsWith(e)) ? [rel] : [];
    });
  };

  /** ```lang\n ... ``` — the body only. */
  const fences = (text: string): string[] =>
    [...text.matchAll(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g)].map((m) => m[1]);

  /**
   * `"agent": "x"`, `agent: 'x'`, `defaultAgent: "x"`. The leading `\b` is what
   * keeps the `agent` alternative from matching inside `defaultAgent` (the
   * preceding `t` is a word char, so there is no boundary there).
   */
  const AGENT_KEY = /\b(defaultAgent|agent)"?\s*:\s*["']([A-Za-z][A-Za-z0-9_]*)["']/g;

  const cited = (source: string, blocks: string[]): { file: string; name: string }[] =>
    blocks.flatMap((body) => [...body.matchAll(AGENT_KEY)].map((m) => ({ file: source, name: m[2] })));

  const SAMPLES: { file: string; name: string }[] = [
    ...walk(SCRIPT_DIRS[0], ['.sh', '.mjs', '.ts']).flatMap((f) =>
      cited(f, [readFileSync(join(REPO_ROOT, f), 'utf8')]),
    ),
    ...DOC_DIRS.flatMap((d) => walk(d, ['.md', '.mdx'])).flatMap((f) =>
      cited(f, fences(readFileSync(join(REPO_ROOT, f), 'utf8'))),
    ),
  ];

  it('the spec still exposes a non-empty platform agent set', () => {
    // Guard the guard, twice over. An introspection that silently returned []
    // would fail every sample for the wrong reason; a scan that found nothing
    // would pass by asserting nothing — which is exactly the state the repo was
    // in before #606, and the reason the four sites went unnoticed for months.
    expect(PLATFORM_AGENTS).toContain('ask');
    expect(
      SAMPLES.length,
      'no `agent:` value found in any doc fence or script — this guard has gone vacuous. ' +
        'If the demos legitimately dropped the key (`ask` is the implicit default, ADR-0063 §1), ' +
        'delete this guard rather than leaving it green over nothing.',
    ).toBeGreaterThan(0);
  });

  it('every documented agent name is a platform agent', () => {
    const bad = SAMPLES.filter((s) => !PLATFORM_AGENTS.includes(s.name)).map(
      (s) =>
        `${s.file}: agent "${s.name}" is not a platform agent (${PLATFORM_AGENTS.join(' | ')}) — ` +
        'loadAgent() refuses it, so this sample errors at chat time',
    );
    expect(
      bad,
      `documented agent names that will not resolve:\n  ${bad.join('\n  ')}\n` +
        'Apps author skills, not agents (ADR-0063 §2). Name a platform agent, or omit the key.',
    ).toEqual([]);
  });
});

/**
 * The developer example must teach the DELIVERABLE selection key (#813).
 *
 * `docs/developers/code_examples.md` is the copy-paste surface for the next
 * author of an action — human or AI — and its "Add An Action" example was a
 * bulk enrolment body reading `input.selectedIds`. That key cannot arrive by
 * any route: a top-level `selectedIds` is never merged into the params bag, and
 * a `params.selectedIds` is refused by the strict params gate (ADR-0104) as
 * undeclared. The only multi-select channel is the built-in `_selectedIds`,
 * with a LEADING UNDERSCORE (`ACTION_PARAM_BUILTIN_KEYS` in `@objectstack/spec`
 * `ui/action-params.zod.ts`), injected by an `execution: 'aggregate'` bulk def.
 *
 * This is not a style pin. #508 spent two release candidates concluding the
 * platform had no multi-select channel, because every probe spelled the key the
 * way this example spells it, and both refusals looked like proof. The example
 * is where that conclusion gets re-manufactured, so it is where the guard goes.
 *
 * Pinned as text, deliberately: the example is prose to `os validate`, `pnpm
 * lint` and every metadata assertion in this repo — nothing else in the gate
 * chain reads a fenced code block at all.
 */
describe('the action example teaches a selection key the platform can deliver (#813)', () => {
  const EXAMPLES = 'docs/developers/code_examples.md';
  const text = () => readFileSync(join(REPO_ROOT, EXAMPLES), 'utf8');

  it('reads the built-in `input._selectedIds`, never the undeliverable spelling', () => {
    const src = text();
    expect(
      src.includes('input._selectedIds'),
      `${EXAMPLES} no longer shows \`input._selectedIds\` — that built-in key is the only route a `
        + 'multi-row selection has to an action body, so an example that omits it teaches the gap '
        + 'that cost #508 two release candidates',
    ).toBe(true);

    // Boundary-matched so `input._selectedIds` itself does not trip it — the
    // same guard `test/bulk-action-dispatch.test.ts` applies to the shipped
    // opportunity body, applied here to the teaching copy of it.
    const noUnderscore = [...src.matchAll(/(?<![\w$])input\.selectedIds\b/g)];
    expect(
      noUnderscore.length,
      `${EXAMPLES} still teaches \`input.selectedIds\` (no underscore) in ${noUnderscore.length} `
        + 'place(s). Nothing can deliver that key: top-level it is never merged into the params '
        + 'bag, and under `params.` the strict gate answers 400 `Unknown action param '
        + '"selectedIds"`. Both refusals read as "the platform has no bulk channel" — which is '
        + 'exactly the wrong lesson (#813).',
    ).toBe(0);
  });

  it('shows the view-side declaration that injects the key, and names the underscore trap', () => {
    const src = text();
    // Half a contract teaches a dead body. A handler reading `_selectedIds`
    // with no aggregate def in the view is injected nothing and is just as
    // inert as the misspelling — which is precisely how #508's button looked
    // dead while the channel worked (#588 had removed the declaration).
    for (const required of ['bulkActionDefs', "execution: 'aggregate'", 'bulkActions']) {
      expect(
        src.includes(required),
        `${EXAMPLES} does not show \`${required}\`. The action body is only half the bulk `
          + 'contract: the LIST VIEW chooses whether the action is dispatched once per row '
          + '(bare-string `bulkActions`) or once for the whole selection (an aggregate '
          + '`bulkActionDefs` entry, which is what injects `_selectedIds`).',
      ).toBe(true);
    }

    // The trap itself, in a `> …` callout — the shape this repo's docs use for
    // "someone already fell into this". Prose that merely uses the right key
    // teaches the spelling; the callout is what stops the next reader
    // re-deriving "there is no bulk channel" from two correct 400s.
    const callout = src
      .split('\n')
      .filter((l) => /^>/.test(l))
      .join('\n');
    expect(
      callout.includes('Unknown action param'),
      `${EXAMPLES} has no callout naming the \`Unknown action param "selectedIds"\` refusal. That `
        + '400 and the silent top-level drop are the two pieces of evidence #508 misread as '
        + 'proof the capability did not exist; the example is where that misreading is prevented.',
    ).toBe(true);
  });
});
