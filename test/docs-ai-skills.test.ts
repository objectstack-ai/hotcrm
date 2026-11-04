// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './helpers/repo-root';
import stack, { packFor } from './helpers/composed-stack';

/**
 * The assistant page describes the skills HotCRM ships, and only those (#2329).
 *
 * `src/docs/crm_ai_skills.md` gives each skill a section headed by its label,
 * and tells the reader which buttons the assistant may press for them. Both
 * are machine facts — the registered skills and the `action_*` tools each one
 * declares — so this file reads them from the compiled stack:
 *
 *  - every registered skill has exactly one `## LABEL` section, in both
 *    locales, and every section is a registered skill (the page's one rules
 *    section aside, which comes first);
 *  - a skill's section names, in bold, each action its tools reach, by the
 *    action's label (the zh-CN pack's on `.zh.md`). A skill that gains a
 *    state-changing tool turns the page red until the page says so.
 *
 * Skill labels stay English in both locales: the skills are not carried by
 * the locale packs.
 */

type AnyRec = Record<string, any>;
const S = stack as AnyRec;
const SKILLS = (S.skills ?? []) as AnyRec[];
const ACTIONS = (S.actions ?? []) as AnyRec[];
const zh = packFor('zh-CN');

const LOCALES: { suffix: string; actionLabel: (a: AnyRec) => string }[] = [
  { suffix: '.md', actionLabel: (a) => String(a.label) },
  { suffix: '.zh.md', actionLabel: (a) => String(zh?.objects?.[a.objectName]?._actions?.[a.name]?.label) },
];

/** `## Heading` → the text up to the next `## ` or the closing rule. */
const sectionsOf = (markdown: string): Map<string, string> => {
  const out = new Map<string, string>();
  const parts = markdown.split(/^## /m).slice(1);
  for (const part of parts) {
    const [heading, ...body] = part.split('\n');
    out.set(heading.trim(), body.join('\n').split(/^---$/m)[0]);
  }
  return out;
};

describe('the assistant page covers the registered skills (#2329)', () => {
  it('reads real skills', () => {
    expect(SKILLS.length).toBeGreaterThanOrEqual(5);
  });

  for (const L of LOCALES) {
    const file = `src/docs/crm_ai_skills${L.suffix}`;
    const sections = sectionsOf(readFileSync(join(REPO_ROOT, file), 'utf8'));
    const headings = [...sections.keys()];

    it(`${file} has one section per skill, and no section for a skill that is not shipped`, () => {
      const labels = SKILLS.map((s) => String(s.label));
      expect(headings.slice(1).sort(), 'every heading after the rules section').toEqual([...labels].sort());
    });

    it(`${file} names every button a skill may press`, () => {
      const missing: string[] = [];
      for (const skill of SKILLS) {
        const text = sections.get(String(skill.label)) ?? '';
        for (const tool of ((skill.tools ?? []) as string[]).filter((t) => t.startsWith('action_'))) {
          const action = ACTIONS.find((a) => `action_${a.name}` === tool);
          if (!action) throw new Error(`${skill.name} declares ${tool}, which no registered action answers`);
          if (!text.includes(`**${L.actionLabel(action)}**`)) missing.push(`${skill.label} → **${L.actionLabel(action)}**`);
        }
      }
      expect(missing).toEqual([]);
    });
  }
});

/**
 * The case-triage page (#2330) says where the assistant stops: it holds no
 * tool that writes, so setting the priority, escalating and closing are the
 * person's, through the case's own buttons. Both halves are read from the
 * compiled stack — the skill's tools, and the labels of the two buttons its
 * instructions point at — so a triage skill that gains a write tool, or a
 * renamed button, turns the page red.
 */
describe('the case-triage page states where a person takes over (#2330)', () => {
  const TRIAGE = SKILLS.find((s) => s.name === 'case_triage');
  const READ_TOOLS = ['describe_object', 'get_record', 'query_records', 'aggregate_data'];

  it('the triage skill holds read tools only', () => {
    expect(TRIAGE, 'case_triage is registered').toBeDefined();
    expect(((TRIAGE!.tools ?? []) as string[]).filter((t) => !READ_TOOLS.includes(t))).toEqual([]);
  });

  for (const L of LOCALES) {
    const file = `src/service/docs/crm_service_triage${L.suffix}`;
    it(`${file} names the buttons the skill points at`, () => {
      const text = readFileSync(join(REPO_ROOT, file), 'utf8');
      const missing = ['escalate_case', 'close_case']
        .map((name) => ACTIONS.find((a) => a.name === name))
        .map((a, i) => {
          if (!a) throw new Error(`no registered action ${['escalate_case', 'close_case'][i]}`);
          return L.actionLabel(a);
        })
        .filter((label) => !text.includes(`**${label}**`));
      expect(missing).toEqual([]);
    });
  }
});
