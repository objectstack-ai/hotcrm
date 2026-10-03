// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Action Definitions Barrel
 *
 * Exports CRM action metadata. Every action ships an inline metadata
 * `body` (sandboxed JS) so the AppPlugin auto-binds the handler at
 * boot — no imperative `engine.registerAction(...)` wiring is needed.
 *
 * `ConvertLeadAction` is the only exception: it is a `flow`-typed
 * action and the screen flow under `src/sales/flows/lead-conversion.flow.ts`
 * carries the implementation.
 */
export { AddContactToCampaignAction, MarkPrimaryContactAction, SendEmailAction } from './contact.actions';
// Activity logging: one registration per (kind × object). Every export
// forwarded from here must be ONE Action — the stack is built from
// `Object.values(actions)`, so an exported array arrives as a nested list and
// fails the schema parse. ⛔ Never re-export `activityActionsFor` (the factory)
// from here; the `crm_case` triple it also builds is service's and is forwarded
// by `src/service/actions/index.ts`.
export {
  LeadLogCallAction, LeadLogMeetingAction, LeadScheduleMeetingAction,
  ContactLogCallAction, ContactLogMeetingAction, ContactScheduleMeetingAction,
  AccountLogCallAction, AccountLogMeetingAction, AccountScheduleMeetingAction,
  OpportunityLogCallAction, OpportunityLogMeetingAction, OpportunityScheduleMeetingAction,
} from './activity-actions';
export { ConvertLeadAction, CreateCampaignAction, ScheduleFollowUpAction } from './lead.actions';
export { CloneOpportunityAction, MassUpdateStageAction, GenerateQuoteAction } from './opportunity.actions';
