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
import { Journey } from './journey.object';
import { JourneyStep } from './journey_step.object';
import { AbTest } from './ab_test.object';
import { AbTestVariant } from './ab_test_variant.object';

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
import { JourneyValidationTrigger, JourneyMetricsTrigger } from './hooks/journey.hook';
import { AbTestValidationTrigger, AbTestWinnerSelectionTrigger } from './hooks/ab_test.hook';

// Import actions
import CampaignAIAction from './actions/campaign_ai.action';
import ContentGeneratorAction from './actions/content_generator.action';
import MarketingAnalyticsAction from './actions/marketing_analytics.action';
import JourneyAIAction from './actions/journey_ai.action';
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
    journey: Journey,
    journey_step: JourneyStep,
    ab_test: AbTest,
    ab_test_variant: AbTestVariant,
  },
  actions: {
    campaign_ai: CampaignAIAction,
    content_generator: ContentGeneratorAction,
    marketing_analytics: MarketingAnalyticsAction,
    journey_ai: JourneyAIAction,
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
    journey_validation: JourneyValidationTrigger,
    journey_metrics: JourneyMetricsTrigger,
    ab_test_validation: AbTestValidationTrigger,
    ab_test_winner_selection: AbTestWinnerSelectionTrigger,
  },

  // Workflows
  workflows: {
    campaign_auto_activation: CampaignWorkflows.autoActivation,
    campaign_budget_alert: CampaignWorkflows.budgetAlert,
    campaign_completion_check: CampaignWorkflows.completionCheck,
    campaign_member_welcome: CampaignWorkflows.memberWelcome,
  },
  // Apps provided by this plugin
  apps: [
    {
      name: 'marketing',
      label: 'Marketing Cloud',
      navigation: [
        {
          id: 'campaigns',
          type: 'group',
          label: 'Campaigns',
          children: [
            { id: 'campaign', label: 'Campaign', type: 'object', objectName: 'campaign' },
            { id: 'campaign_member', label: 'Campaign Member', type: 'object', objectName: 'campaign_member' }
          ]
        },
        {
          id: 'marketing_automation',
          type: 'group',
          label: 'Marketing Automation',
          children: [
            { id: 'email_template', label: 'Email Template', type: 'object', objectName: 'email_template' },
            { id: 'email_send', label: 'Email Send', type: 'object', objectName: 'email_send' },
            { id: 'landing_page', label: 'Landing Page', type: 'object', objectName: 'landing_page' },
            { id: 'form', label: 'Form', type: 'object', objectName: 'form' },
            { id: 'marketing_list', label: 'Marketing List', type: 'object', objectName: 'marketing_list' },
            { id: 'unsubscribe', label: 'Unsubscribe', type: 'object', objectName: 'unsubscribe' },
            { id: 'automation_workflow', label: 'Automation Workflow', type: 'object', objectName: 'automation_workflow' },
            { id: 'lead_nurture_program', label: 'Lead Nurture Program', type: 'object', objectName: 'lead_nurture_program' },
            { id: 'touchpoint', label: 'Touchpoint', type: 'object', objectName: 'touchpoint' },
          ]
        },
        {
          id: 'journey_and_testing',
          type: 'group',
          label: 'Journey & Testing',
          children: [
            { id: 'journey', label: 'Journey', type: 'object', objectName: 'journey' },
            { id: 'journey_step', label: 'Journey Step', type: 'object', objectName: 'journey_step' },
            { id: 'ab_test', label: 'A/B Test', type: 'object', objectName: 'ab_test' },
            { id: 'ab_test_variant', label: 'A/B Test Variant', type: 'object', objectName: 'ab_test_variant' },
          ]
        },
        {
          id: 'views_and_dashboards',
          type: 'group',
          label: 'Views & Dashboards',
          children: [
            { id: 'campaign_timeline', label: 'Campaign Timeline', type: 'object', objectName: 'campaign', viewName: 'campaign_timeline' },
            { id: 'marketing_dashboard', label: 'Marketing Dashboard', type: 'dashboard', dashboardName: 'marketing_dashboard' },
          ]
        }
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
