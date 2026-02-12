import { SharingRuleSchema } from '@objectstack/spec/security';
import type { SharingRule } from '@objectstack/spec/security';

export const AccountTeamSharing: SharingRule = SharingRuleSchema.parse({
  name: 'account_team_sharing',
  label: 'Share Customer Accounts with Sales Team',
  description: 'Grants read access to all customer accounts for the sales team role',
  object: 'account',
  type: 'criteria',
  condition: "type = 'customer'",
  accessLevel: 'read',
  sharedWith: { type: 'role', value: 'sales_team' }
});

export const OpportunityDealSharing: SharingRule = SharingRuleSchema.parse({
  name: 'opportunity_deal_sharing',
  label: 'Share High-Value Opportunities with Deal Team',
  description: 'Grants edit access to opportunities over 100k for the deal team group',
  object: 'opportunity',
  type: 'criteria',
  condition: "amount > 100000 AND stage != 'closed_lost'",
  accessLevel: 'edit',
  sharedWith: { type: 'group', value: 'deal_team' }
});

export const LeadMarketingSharing: SharingRule = SharingRuleSchema.parse({
  name: 'lead_marketing_sharing',
  label: 'Share Marketing Leads with Marketing Team',
  description: 'Grants read access to marketing-sourced leads for marketing role and subordinates',
  object: 'lead',
  type: 'criteria',
  condition: "source = 'marketing'",
  accessLevel: 'read',
  sharedWith: { type: 'role_and_subordinates', value: 'marketing_manager' }
});
