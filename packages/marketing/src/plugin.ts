import { PluginSchema } from '@objectstack/spec/kernel';
import type { PluginDefinition } from '@objectstack/spec/kernel';

import { Campaign } from './campaign.object';
import { CampaignMember } from './campaign_member.object';
import { EmailTemplate } from './email_template.object';
import { LandingPage } from './landing_page.object';
import { Form } from './form.object';
import { MarketingList } from './marketing_list.object';
import { Unsubscribe } from './unsubscribe.object';
import { AutomationWorkflow } from './automation_workflow.object';
import { EmailSend } from './email_send.object';
import { LeadNurtureProgram } from './lead_nurture_program.object';
import { Touchpoint } from './touchpoint.object';

import { CampaignROIHook } from './hooks/roi.hook';
import { CampaignROICalculationTrigger, CampaignBudgetTrackingTrigger, CampaignStatusChangeTrigger, CampaignDateValidationTrigger } from './hooks/campaign.hook';
import { CampaignMemberEngagementTrigger, CampaignMemberLeadScoringTrigger, CampaignMemberStatsTrigger, CampaignMemberBounceHandlerTrigger } from './hooks/campaign_member.hook';
import { EmailSendTrackingTrigger, EmailSendValidationTrigger } from './hooks/email_send.hook';
import { AutomationWorkflowValidationTrigger, AutomationWorkflowMetricsTrigger } from './hooks/automation_workflow.hook';
import { NurtureEnrollmentTrigger, NurtureGraduationTrigger } from './hooks/lead_nurture.hook';
import { TouchpointRecordingTrigger, RevenueAttributionTrigger } from './hooks/attribution.hook';
import { UnsubscribeComplianceTrigger, UnsubscribeValidationTrigger, GlobalSuppressionTrigger } from './hooks/unsubscribe.hook';
import { EmailTemplateContentValidationTrigger, EmailTemplateTokenValidationTrigger } from './hooks/email_template.hook';
import { FormFieldValidationTrigger, FormSubmissionTrackingTrigger } from './hooks/form.hook';
import { LandingPageLifecycleValidationTrigger, LandingPageMetricsTrigger } from './hooks/landing_page.hook';
import { MarketingListDuplicateDetectionTrigger, MarketingListMembershipCountTrigger } from './hooks/marketing_list.hook';
import { TouchpointTimestampValidationTrigger, TouchpointAttributionScoringTrigger } from './hooks/touchpoint.hook';

// Import actions
import CampaignAIAction from './actions/campaign_ai.action';
import ContentGeneratorAction from './actions/content_generator.action';
import MarketingAnalyticsAction from './actions/marketing_analytics.action';
import { CampaignWorkflows } from './campaign.workflow';

export const MarketingPlugin = {
  name: 'marketing',
  label: 'Marketing Cloud',
  version: '1.0.0',
  description: 'Marketing automation, campaign management, email templates, landing pages, and list management.',
  dependencies: ['crm'],
  
  // Plugin initialization
  init: async () => {
    // No initialization required for this plugin
  },
  
  objects: {
    campaign: Campaign,
    campaign_member: CampaignMember,
    email_template: EmailTemplate,
    landing_page: LandingPage,
    form: Form,
    marketing_list: MarketingList,
    unsubscribe: Unsubscribe,
    automation_workflow: AutomationWorkflow,
    email_send: EmailSend,
    lead_nurture_program: LeadNurtureProgram,
    touchpoint: Touchpoint,
  },
  actions: {
    campaign_ai: CampaignAIAction,
    content_generator: ContentGeneratorAction,
    marketing_analytics: MarketingAnalyticsAction,
  },
  triggers: {
    campaign_roi: CampaignROIHook,
    campaign_roi_calculation: CampaignROICalculationTrigger,
    campaign_budget_tracking: CampaignBudgetTrackingTrigger,
    campaign_status_change: CampaignStatusChangeTrigger,
    campaign_date_validation: CampaignDateValidationTrigger,
    campaign_member_engagement: CampaignMemberEngagementTrigger,
    campaign_member_lead_scoring: CampaignMemberLeadScoringTrigger,
    campaign_member_stats: CampaignMemberStatsTrigger,
    campaign_member_bounce_handler: CampaignMemberBounceHandlerTrigger,
    email_send_tracking: EmailSendTrackingTrigger,
    email_send_validation: EmailSendValidationTrigger,
    automation_workflow_validation: AutomationWorkflowValidationTrigger,
    automation_workflow_metrics: AutomationWorkflowMetricsTrigger,
    nurture_enrollment: NurtureEnrollmentTrigger,
    nurture_graduation: NurtureGraduationTrigger,
    touchpoint_recording: TouchpointRecordingTrigger,
    revenue_attribution: RevenueAttributionTrigger,
    unsubscribe_compliance: UnsubscribeComplianceTrigger,
    unsubscribe_validation: UnsubscribeValidationTrigger,
    global_suppression: GlobalSuppressionTrigger,
    email_template_content_validation: EmailTemplateContentValidationTrigger,
    email_template_token_validation: EmailTemplateTokenValidationTrigger,
    form_field_validation: FormFieldValidationTrigger,
    form_submission_tracking: FormSubmissionTrackingTrigger,
    landing_page_lifecycle_validation: LandingPageLifecycleValidationTrigger,
    landing_page_metrics: LandingPageMetricsTrigger,
    marketing_list_duplicate_detection: MarketingListDuplicateDetectionTrigger,
    marketing_list_membership_count: MarketingListMembershipCountTrigger,
    touchpoint_timestamp_validation: TouchpointTimestampValidationTrigger,
    touchpoint_attribution_scoring: TouchpointAttributionScoringTrigger,
  },

  // Workflows
  workflows: {
    campaign_auto_activation: CampaignWorkflows.autoActivation,
    campaign_budget_alert: CampaignWorkflows.budgetAlert,
    campaign_completion_check: CampaignWorkflows.completionCheck,
    campaign_member_welcome: CampaignWorkflows.memberWelcome,
  },
  navigation: [
    {
      type: 'group',
      label: 'Campaigns',
      children: [
        { type: 'object', object: 'campaign' },
        { type: 'object', object: 'campaign_member' }
      ]
    },
    {
      type: 'group',
      label: 'Marketing Automation',
      children: [
        { type: 'object', object: 'email_template' },
        { type: 'object', object: 'email_send' },
        { type: 'object', object: 'landing_page' },
        { type: 'object', object: 'form' },
        { type: 'object', object: 'marketing_list' },
        { type: 'object', object: 'unsubscribe' },
        { type: 'object', object: 'automation_workflow' },
        { type: 'object', object: 'lead_nurture_program' },
        { type: 'object', object: 'touchpoint' },
      ]
    }
  ]
};
/** Spec-validated plugin metadata */
export const MarketingPluginMetadata: PluginDefinition = PluginSchema.parse({
  name: 'marketing',
  label: 'Marketing Cloud',
  version: '1.0.0',
  description: 'Marketing automation, campaign management, email templates, landing pages, and list management.',
});

export default MarketingPlugin;
