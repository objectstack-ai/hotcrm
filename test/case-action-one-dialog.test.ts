// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect, beforeAll } from 'vitest';
import type { VerifyStack } from '@objectstack/verify';
import stack from './helpers/composed-stack';
import { hotcrmStack, signUpPerson, type Person } from './helpers/verify-stack';

type Rec = Record<string, any>;

/**
 * Escalate Case and Close Case are one dialog each (#2240, #2194 T1-U04).
 *
 * Both actions open a screen flow whose first node is the form that asks for
 * the reason (escalation reason, resolution), and that form carries its own
 * Cancel. Until #2240 each action also declared a `confirmText`, so the
 * console put "This will escalate the case… Continue?" in front of the form:
 * two dialogs and three clicks before any input. The form IS the
 * confirmation, the rule `claim_case` already ships under.
 *
 * `confirmText` is the UI prompt only. What an AI caller is asked to confirm is
 * `ai.requiresConfirmation` (#1578): on `@objectstack/runtime` 18.0.0,
 * `actionLooksDestructive` reads `ai.requiresConfirmation`, then
 * `mode: 'delete'` / `variant: 'danger'`, and never `confirmText`. Neither
 * action declares any of the three, so the AI side is unchanged; MCP
 * `list_actions` answered byte-identically before and after (neither action
 * opts in to AI, so neither is listed).
 */

const actions: Rec[] = (stack as Rec).actions ?? [];
const flows: Rec[] = (stack as Rec).flows ?? [];
const named = (list: Rec[], name: string, kind: string): Rec => {
  const x = list.find((a) => a.name === name);
  if (!x) throw new Error(`no ${name} ${kind} registered`);
  return x;
};

const CASES = [
  { action: 'escalate_case' },
  { action: 'close_case' },
] as const;

describe('Escalate Case and Close Case open their form directly', () => {
  for (const { action } of CASES) {
    it(`${action} declares no confirmText, and leaves its AI confirmation as it was`, () => {
      const a = named(actions, action, 'action');
      expect(a.confirmText, `${action}: a confirm modal in front of the reason form`).toBeUndefined();
      // The AI gate's inputs, unchanged by dropping the UI prompt.
      expect(a.ai?.requiresConfirmation).toBeUndefined();
      expect(a.mode).toBeUndefined();
      expect(a.variant).toBeUndefined();
    });

    it(`${action}'s flow starts on the screen that asks for the reason`, () => {
      const a = named(actions, action, 'action');
      expect(a.type).toBe('flow');
      const flow = named(flows, a.target, 'flow');
      const startEdge = (flow.edges ?? []).find((e: Rec) => e.source === 'start');
      const first = (flow.nodes ?? []).find((n: Rec) => n.id === startEdge?.target);
      expect(first?.type, `${action}: the first thing the agent sees`).toBe('screen');
    });
  }
});

describe('the form is the confirmation: an unsubmitted form writes nothing', () => {
  let verify: VerifyStack;
  let agent: Person;
  let accountId: string;
  let k = 0;
  beforeAll(async () => {
    verify = await hotcrmStack();
    agent = await signUpPerson(verify, 'agent@case-action-one-dialog.test', {
      name: 'One Dialog Agent', permissionSets: ['service_agent'],
    });
    const [account] = await verify.seed('crm_account', [{ name: 'One Dialog Co', owner_id: agent.id }]);
    accountId = String(account!.id);
  }, 120_000);

  for (const { action } of CASES) {
    it(`${action}: started and left at its form (Cancel), the case is unchanged`, async () => {
      const kase = await verify.hooks.run('crm_case', 'insert', {
        subject: `One dialog ${++k}`, description: 'Needs attention.', crm_account: accountId,
        status: 'new', priority: 'medium',
      }, { as: agent.token });
      const before = (await verify.rows('crm_case', { id: kase.id }))[0]!;
      const target = named(actions, action, 'action').target;
      const run = await verify.flows.run(target, { recordId: kase.id }, { as: agent.token });
      expect(run.runId, `${action} did not pause on its form`).toBeTruthy();
      const after = (await verify.rows('crm_case', { id: kase.id }))[0]!;
      for (const f of ['status', 'is_escalated', 'is_closed', 'priority', 'escalation_reason', 'resolution']) {
        expect(after[f], `${action}: ${f} written before the form was submitted`).toEqual(before[f]);
      }
    });
  }
});
