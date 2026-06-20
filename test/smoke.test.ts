// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

import { describe, it, expect } from 'vitest';
import stack from '../objectstack.config';

/**
 * Metadata bundle smoke test.
 *
 * Imports the compiled stack definition and asserts structural invariants —
 * no running server required (mirrors the framework's app-crm example). Also
 * guards the @objectstack 7.6/7.7 migration outcomes:
 *   - objects no longer carry `workflows[]` (removed in 7.7)
 *   - every notify-node `severity` is a valid sys_notification value
 */

const objects: any[] = (stack as any).objects ?? [];
const flows: any[] = (stack as any).flows ?? [];

describe('hotcrm metadata bundle', () => {
  it('exposes the expected manifest', () => {
    expect(stack.manifest.id).toBe('app.objectstack.hotcrm');
    expect(stack.manifest.namespace).toBe('crm');
    expect(stack.manifest.type).toBe('app');
  });

  it('registers the core CRM objects', () => {
    const names = objects.map((o) => o.name);
    for (const n of [
      'crm_account', 'crm_contact', 'crm_lead', 'crm_opportunity',
      'crm_case', 'crm_campaign', 'crm_campaign_member', 'crm_contract',
      'crm_quote', 'crm_task',
    ]) {
      expect(names, `missing object ${n}`).toContain(n);
    }
    expect(objects.length).toBeGreaterThanOrEqual(15);
  });

  it('registers all flows incl. the workflows[]-migrated ones', () => {
    const names = flows.map((f) => f.name);
    // record-change flows
    for (const n of ['lead_assignment', 'opportunity_approval', 'case_escalation', 'case_csat_followup']) {
      expect(names, `missing flow ${n}`).toContain(n);
    }
    // 7.7 migration: scheduled status-flips + notification flows from object workflows[]
    for (const n of [
      'campaign_completion', 'quote_expiration', 'contract_expiration',
      'contact_welcome', 'opportunity_won_alert', 'task_urgent_alert',
    ]) {
      expect(names, `missing migrated flow ${n}`).toContain(n);
    }
    // Lower bound on the named flows above; stays green when new flows are added
    // (e.g. the task reminder/recurrence flows) without re-pinning a brittle count.
    expect(flows.length).toBeGreaterThanOrEqual(16);
  });

  it('ships object lifecycle hooks', () => {
    expect((stack as any).hooks?.length ?? 0).toBeGreaterThan(0);
  });

  // ── 7.7 migration regression guards ───────────────────────────────
  it('no object schema carries the removed workflows[] key', () => {
    const offenders = objects.filter((o) => 'workflows' in o).map((o) => o.name);
    expect(offenders, `objects still define workflows[]: ${offenders.join(', ')}`).toEqual([]);
  });

  it('every notify node uses a valid severity (info|warning|critical)', () => {
    const valid = new Set(['info', 'warning', 'critical']);
    const bad: string[] = [];
    for (const f of flows) {
      for (const node of f.nodes ?? []) {
        if (node.type !== 'notify') continue;
        const sev = node.config?.severity;
        if (sev !== undefined && !valid.has(sev)) bad.push(`${f.name}/${node.id}=${sev}`);
      }
    }
    expect(bad, `invalid notify severity: ${bad.join(', ')}`).toEqual([]);
  });
});
