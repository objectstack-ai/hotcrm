// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import { cel, P } from '@objectstack/spec';
import type * as Automation from '@objectstack/spec/automation';
type Flow = Automation.Flow;

/**
 * Quote printed → Presented (REQ-0008 phase 1, #2312).
 *
 * Printing a quote IS presenting it: the PDF `print_quote` archives is the
 * document the rep sends. So when the print service archives a quote's PDF, a
 * `draft` or `in_review` quote moves to `presented`; a quote in any other
 * state keeps it, whatever is printed.
 *
 * ── Why a flow on `sys_attachment`, not a hook on `crm_quote` ─────────────
 * The archive writes ONE row the app can see — the `sys_attachment` that ties
 * the PDF to the quote — and never writes the quote, so no `crm_quote` hook
 * fires on a print. A hook on `sys_attachment` is refused by `defineStack`
 * ("Hook … references object 'sys_attachment' which is not defined in
 * objects", measured on 18.1.0): an app hooks only its own objects (ADR-0130
 * R4). A `record_change` flow on the platform object is accepted, and a status
 * flip is a flow's job in this repo anyway (AGENTS.md, "no workflow metadata
 * type").
 *
 * ── Which attachment is a print ───────────────────────────────────────────
 * `sys_attachment` carries no origin field: the service sets the parent, the
 * file name, the MIME type and the size, nothing that says "print". The
 * trigger therefore keys on the parent being a quote AND on the file name the
 * service gives a print, `<page>-<recordId>.pdf` — `print_quote` passes no
 * `filename`, so it is `quote_print_page-` + the quote's id + `.pdf`. An
 * ordinary attachment on the quote does not match and does nothing. A file a
 * person uploads under exactly that name counts as a print, which it is a copy
 * of.
 *
 * ── What can still stop the move ──────────────────────────────────────────
 * `runAs: 'user'` (Metadata semantics rule 9): the move is the printing rep's
 * own write, under their own rights — the archive already required edit
 * access to the quote. Every rule on the quote judges it, deliberately:
 * `crm_contact` is `requiredWhen` the quote becomes `presented`, so printing a
 * quote with no contact still archives the PDF (the print answers 201) and the
 * move is refused with "Contact is required"; the quote keeps its status and
 * the refusal is in the flow's run history. ⛔ The flow does not restate that
 * gate as an edge: the object owns it, once.
 */
export const QuotePrintPresentedFlow: Flow = {
  name: 'quote_print_presented',
  label: 'Quote Printed → Presented',
  description: 'When a quote PDF is printed, move a draft or in-review quote to Presented.',
  type: 'record_change',
  status: 'active',
  // The TRIGGERING USER, not `system` — the one record-change flow on `user`,
  // listed in `USER_IDENTITY_FLOWS` (`test/actions-flows-integrity.test.ts`)
  // with the reason: the print service archives only for a signed-in user
  // acting for themselves, so this flow always has one, and the move is the
  // printing rep's own write (Metadata semantics rules 9 and 11).
  runAs: 'user',
  variables: [],
  nodes: [
    {
      id: 'start',
      type: 'start',
      label: 'Start (quote PDF archived)',
      config: {
        objectName: 'sys_attachment',
        triggerType: 'record-after-create',
        condition: P`has(record.parent_object) && record.parent_object == "crm_quote"
          && has(record.parent_id) && has(record.file_name)
          && record.file_name == "quote_print_page-" + record.parent_id + ".pdf"`,
      },
    },
    {
      id: 'get_quote',
      type: 'get_record',
      label: 'Get Quote',
      config: { objectName: 'crm_quote', filter: { id: cel`record.parent_id` }, outputVariable: 'quoteRecord' },
    },
    // Gateway only — the live predicates are on the out-edges `e3` / `e4`
    // (a `decision` node's own `config.condition` is never read).
    { id: 'unsent', type: 'decision', label: 'Draft or In Review?', config: {} },
    {
      // By id alone: the by-id update path binds ONLY the id, so the status
      // test lives on the edge above rather than in this filter.
      id: 'mark_presented',
      type: 'update_record',
      label: 'Mark Presented',
      config: { objectName: 'crm_quote', filter: { id: cel`record.parent_id` }, fields: { status: 'presented' } },
    },
    { id: 'end', type: 'end', label: 'End' },
  ],
  edges: [
    { id: 'e1', source: 'start', target: 'get_quote', type: 'default' },
    { id: 'e2', source: 'get_quote', target: 'unsent', type: 'default' },
    {
      id: 'e3',
      source: 'unsent',
      target: 'mark_presented',
      type: 'conditional',
      label: 'Draft or In Review',
      condition: P`has(vars.quoteRecord) && has(vars.quoteRecord.status)
        && (vars.quoteRecord.status == "draft" || vars.quoteRecord.status == "in_review")`,
    },
    {
      id: 'e4',
      source: 'unsent',
      target: 'end',
      type: 'conditional',
      label: 'Presented or settled',
      condition: P`!has(vars.quoteRecord) || !has(vars.quoteRecord.status)
        || (vars.quoteRecord.status != "draft" && vars.quoteRecord.status != "in_review")`,
    },
    { id: 'e5', source: 'mark_presented', target: 'end', type: 'default' },
  ],
};
