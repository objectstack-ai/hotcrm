// Copyright (c) 2025 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * Action Definitions Barrel
 *
 * Exports CRM action metadata. Every action ships an inline metadata
 * `body` (sandboxed JS) so the AppPlugin auto-binds the handler at
 * boot — no imperative `engine.registerAction(...)` wiring is needed.
 *
 * `ConvertLeadAction` is the only exception: it is a `flow`-typed
 * action and the screen flow under `src/flows/lead-conversion.flow.ts`
 * carries the implementation.
 */
export { EnrollLeadsAction, MarkRespondedAction } from './campaign.actions';
export { EscalateCaseAction, CloseCaseAction } from './case.actions';
export { AddContactToCampaignAction, MarkPrimaryContactAction, SendEmailAction } from './contact.actions';
// Activity logging, one registration per (kind × object) — #592. Every export
// forwarded from here must be ONE Action: the stack is built from
// `Object.values(actions)`, so an exported array would arrive as a nested list
// and fail the schema parse. `ActivityActions` (the flat list the factory
// produces) is therefore deliberately NOT re-exported.
export {
  LogCallAction, LogMeetingAction, CaseScheduleMeetingAction,
  LeadLogCallAction, LeadLogMeetingAction, LeadScheduleMeetingAction,
  ContactLogCallAction, ContactLogMeetingAction, ContactScheduleMeetingAction,
  AccountLogCallAction, AccountLogMeetingAction, AccountScheduleMeetingAction,
  OpportunityLogCallAction, OpportunityLogMeetingAction, OpportunityScheduleMeetingAction,
} from './global.actions';
export { ConvertLeadAction, CreateCampaignAction, ScheduleFollowUpAction } from './lead.actions';
export { CloneOpportunityAction, MassUpdateStageAction, GenerateQuoteAction } from './opportunity.actions';
