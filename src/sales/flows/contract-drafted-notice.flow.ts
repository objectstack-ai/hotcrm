// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { P, cel } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * The opening words of the provenance sentence `quote_accepted_contract_draft`
 * writes on every contract it drafts (`src/revenue/objects/quote.hook.ts`):
 * "Auto-drafted from accepted quote QTE-0006 - …", or "Auto-drafted from an
 * accepted quote" when the quote has no label. `crm_contract` has no link to
 * the quote, so this sentence is the only mark of a drafted contract.
 */
export const AUTO_DRAFTED_PREFIX = 'Auto-drafted from';

/**
 * Contract drafted notice (#2371 row 6).
 *
 * Accepting a quote drafts its contract in an `async` hook, so the acceptance
 * itself says nothing: measured on 18.2.0, the rep saw the quote's save toast
 * and nothing about the contract, which they found only by looking. This flow
 * fires on that contract's insert and tells the person who accepted the quote
 * (the hook elevates but keeps the caller, so `created_by` names them) that a
 * contract was drafted, with a link to it. An inbox notice is also the
 * console's live toast, with a View link, on the page the rep is on.
 *
 * Inbox only: the acceptance is the rep's own act a moment ago, so an email
 * would add a second notice and nothing new.
 */
export const ContractDraftedNoticeFlow: Flow = {
  name: 'contract_drafted_notice',
  label: 'Contract Drafted Notice',
  description: 'When accepting a quote drafts its contract: tell the person who accepted it, with a link to the contract.',
  type: 'record_change',
  status: 'active',
  // Elevated because the person it tells is not always one who may read the
  // contract: a sales rep holds `crm_contract.allowCreate: false`, and the
  // contract is the hook's elevated write, not theirs. The flow reads only the
  // row that fired it and writes nothing but the notice; the person it tells
  // is read off that row (`created_by`), never from the run's identity.
  runAs: 'system',
  variables: [],
  nodes: [
    {
      id: 'start', type: 'start', label: 'Start (contract drafted)',
      config: {
        objectName: 'crm_contract',
        triggerType: 'record-after-create',
        condition: P`has(record.description) && record.description != null
          && record.description.startsWith(${AUTO_DRAFTED_PREFIX})
          && has(record.created_by) && record.created_by != null`,
      },
    },
    {
      id: 'notify_accepter', type: 'notify', label: 'Notify Who Accepted',
      config: {
        recipients: [cel`record.created_by`],
        channels: ['inbox'],
        severity: 'info',
        topic: 'contract_drafted',
        template: 'crm.contract_drafted',
        templateData: { contract_number: cel`has(record.contract_number) ? record.contract_number : ""` },
        actionUrl: '/crm_contract/{{record.id}}',
      },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'notify_accepter', type: 'default' },
    { id: 'e2', source: 'notify_accepter', target: 'end', type: 'default' },
  ],
};
