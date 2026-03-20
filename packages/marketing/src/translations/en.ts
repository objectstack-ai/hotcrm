import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — Marketing Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 16 Marketing objects with field labels, select options, and help texts.
 */
export const en: TranslationData = {
  objects: {
    campaign: {
      label: 'Campaign',
      pluralLabel: 'Campaigns',
      fields: {
        name: { label: 'Campaign Name' },
        description: { label: 'Description' },
        type: {
          label: 'Campaign Type',
          options: {
            Email: 'Email', 'Social Media': 'Social Media', Webinar: 'Webinar',
            Event: 'Event', 'Content Marketing': 'Content Marketing', 'Paid Search': 'Paid Search',
            'Display Advertising': 'Display Advertising', 'Direct Mail': 'Direct Mail',
            'Referral Program': 'Referral Program', Other: 'Other',
          },
        },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Planned: 'Planned', Active: 'Active 🟢', Completed: 'Completed ✅', Cancelled: 'Cancelled 🚫' },
        },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        budgeted_cost: { label: 'Budgeted Cost', help: 'Planned budget for this campaign' },
        actual_cost: { label: 'Actual Cost', help: 'Actual spend to date' },
        expected_revenue: { label: 'Expected Revenue' },
        actual_revenue: { label: 'Actual Revenue' },
        expected_response_rate: { label: 'Expected Response Rate', help: 'Projected response rate (%)' },
        target_audience: { label: 'Target Audience' },
        number_sent: { label: 'Number Sent' },
        number_of_leads: { label: 'Number of Leads' },
        number_of_opportunities: { label: 'Number of Opportunities' },
        number_of_won_deals: { label: 'Number of Won Deals' },
        roi: { label: 'ROI', help: 'Return on investment (%)' },
        parent_campaign: { label: 'Parent Campaign' },
        owner_id: { label: 'Owner' },
      },
    },

    campaign_member: {
      label: 'Campaign Member',
      pluralLabel: 'Campaign Members',
      fields: {
        campaign_id: { label: 'Campaign' },
        lead_id: { label: 'Lead' },
        contact_id: { label: 'Contact' },
        status: {
          label: 'Status',
          options: {
            Planned: 'Planned', Sent: 'Sent', Responded: 'Responded',
            Attended: 'Attended', 'No Show': 'No Show', Unsubscribed: 'Unsubscribed',
          },
        },
        responded_date: { label: 'Responded Date' },
        first_responded_date: { label: 'First Responded Date' },
        source: { label: 'Source' },
        engagement_score: { label: 'Engagement Score', help: 'Calculated engagement score based on interactions' },
      },
    },

    email_template: {
      label: 'Email Template',
      pluralLabel: 'Email Templates',
      fields: {
        name: { label: 'Template Name' },
        subject: { label: 'Subject Line' },
        body: { label: 'Email Body' },
        type: {
          label: 'Template Type',
          options: { Marketing: 'Marketing', Sales: 'Sales', Service: 'Service', Transactional: 'Transactional' },
        },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active', Archived: 'Archived' },
        },
        category: { label: 'Category' },
        folder: { label: 'Folder' },
        is_responsive: { label: 'Responsive Design' },
        open_rate: { label: 'Open Rate', help: 'Average open rate (%)' },
        click_rate: { label: 'Click Rate', help: 'Average click-through rate (%)' },
        created_by: { label: 'Created By' },
      },
    },

    landing_page: {
      label: 'Landing Page',
      pluralLabel: 'Landing Pages',
      fields: {
        name: { label: 'Page Name' },
        url_slug: { label: 'URL Slug' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Published: 'Published 🟢', Archived: 'Archived' },
        },
        template: { label: 'Template' },
        campaign_id: { label: 'Campaign' },
        page_views: { label: 'Page Views' },
        unique_visitors: { label: 'Unique Visitors' },
        conversion_rate: { label: 'Conversion Rate', help: 'Visitor-to-lead conversion rate (%)' },
        form_id: { label: 'Form' },
        meta_title: { label: 'Meta Title' },
        meta_description: { label: 'Meta Description' },
        published_date: { label: 'Published Date' },
        owner_id: { label: 'Owner' },
      },
    },

    form: {
      label: 'Form',
      pluralLabel: 'Forms',
      fields: {
        name: { label: 'Form Name' },
        description: { label: 'Description' },
        type: {
          label: 'Form Type',
          options: {
            'Contact Us': 'Contact Us', 'Newsletter Signup': 'Newsletter Signup',
            'Demo Request': 'Demo Request', 'Event Registration': 'Event Registration',
            Survey: 'Survey', Download: 'Download', Custom: 'Custom',
          },
        },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active', Archived: 'Archived' },
        },
        submit_button_text: { label: 'Submit Button Text' },
        success_message: { label: 'Success Message' },
        redirect_url: { label: 'Redirect URL' },
        submissions_count: { label: 'Submissions' },
        conversion_rate: { label: 'Conversion Rate', help: 'Form submission conversion rate (%)' },
        campaign_id: { label: 'Campaign' },
        landing_page_id: { label: 'Landing Page' },
        owner_id: { label: 'Owner' },
      },
    },

    marketing_list: {
      label: 'Marketing List',
      pluralLabel: 'Marketing Lists',
      fields: {
        name: { label: 'List Name' },
        description: { label: 'Description' },
        type: {
          label: 'List Type',
          options: { Static: 'Static', Dynamic: 'Dynamic' },
        },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active', Archived: 'Archived' },
        },
        member_count: { label: 'Member Count' },
        source: { label: 'Source' },
        last_refreshed: { label: 'Last Refreshed' },
        owner_id: { label: 'Owner' },
      },
    },

    unsubscribe: {
      label: 'Unsubscribe',
      pluralLabel: 'Unsubscribes',
      fields: {
        email: { label: 'Email' },
        contact_id: { label: 'Contact' },
        lead_id: { label: 'Lead' },
        reason: {
          label: 'Reason',
          options: {
            'Not Relevant': 'Not Relevant', 'Too Frequent': 'Too Frequent',
            'Never Subscribed': 'Never Subscribed', Spam: 'Spam', Other: 'Other',
          },
        },
        channel: {
          label: 'Channel',
          options: { Email: 'Email', SMS: 'SMS', 'Push Notification': 'Push Notification', All: 'All Channels' },
        },
        unsubscribe_date: { label: 'Unsubscribe Date' },
        campaign_id: { label: 'Campaign' },
      },
    },

    automation_workflow: {
      label: 'Automation Workflow',
      pluralLabel: 'Automation Workflows',
      fields: {
        name: { label: 'Workflow Name' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active 🟢', Paused: 'Paused ⏸️', Completed: 'Completed ✅', Error: 'Error 🔴' },
        },
        trigger_type: {
          label: 'Trigger Type',
          options: { 'Event-Based': 'Event-Based', 'Schedule-Based': 'Schedule-Based', Manual: 'Manual' },
        },
        trigger_object: { label: 'Trigger Object' },
        trigger_event: { label: 'Trigger Event' },
        enrollment_count: { label: 'Enrollment Count' },
        completion_count: { label: 'Completion Count' },
        conversion_rate: { label: 'Conversion Rate', help: 'Enrollment-to-completion rate (%)' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        owner_id: { label: 'Owner' },
      },
    },

    email_send: {
      label: 'Email Send',
      pluralLabel: 'Email Sends',
      fields: {
        name: { label: 'Send Name' },
        email_template_id: { label: 'Email Template' },
        campaign_id: { label: 'Campaign' },
        marketing_list_id: { label: 'Marketing List' },
        status: {
          label: 'Status',
          options: {
            Draft: 'Draft', Scheduled: 'Scheduled 📅', Sending: 'Sending 🚀',
            Completed: 'Completed ✅', Failed: 'Failed 🔴', Cancelled: 'Cancelled',
          },
        },
        scheduled_date: { label: 'Scheduled Date' },
        sent_date: { label: 'Sent Date' },
        total_recipients: { label: 'Total Recipients' },
        delivered: { label: 'Delivered' },
        bounced: { label: 'Bounced' },
        opened: { label: 'Opened' },
        clicked: { label: 'Clicked' },
        unsubscribed: { label: 'Unsubscribed' },
        open_rate: { label: 'Open Rate', help: 'Percentage of delivered emails opened' },
        click_rate: { label: 'Click Rate', help: 'Percentage of opened emails clicked' },
        bounce_rate: { label: 'Bounce Rate', help: 'Percentage of emails that bounced' },
        owner_id: { label: 'Owner' },
      },
    },

    lead_nurture_program: {
      label: 'Lead Nurture Program',
      pluralLabel: 'Lead Nurture Programs',
      fields: {
        name: { label: 'Program Name' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active 🟢', Paused: 'Paused ⏸️', Completed: 'Completed ✅' },
        },
        target_audience: { label: 'Target Audience' },
        enrollment_criteria: { label: 'Enrollment Criteria', help: 'Criteria for automatic enrollment' },
        graduation_criteria: { label: 'Graduation Criteria', help: 'Criteria to graduate leads from the program' },
        enrolled_count: { label: 'Enrolled Count' },
        graduated_count: { label: 'Graduated Count' },
        conversion_rate: { label: 'Conversion Rate', help: 'Enrollment-to-graduation rate (%)' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        owner_id: { label: 'Owner' },
      },
    },

    touchpoint: {
      label: 'Touchpoint',
      pluralLabel: 'Touchpoints',
      fields: {
        contact_id: { label: 'Contact' },
        lead_id: { label: 'Lead' },
        campaign_id: { label: 'Campaign' },
        channel: {
          label: 'Channel',
          options: {
            Email: 'Email', Web: 'Web', Social: 'Social', Event: 'Event',
            Phone: 'Phone', Chat: 'Chat', 'Direct Mail': 'Direct Mail',
          },
        },
        type: {
          label: 'Touchpoint Type',
          options: { 'First Touch': 'First Touch', 'Last Touch': 'Last Touch', Influencer: 'Influencer', Converter: 'Converter' },
        },
        timestamp: { label: 'Timestamp' },
        source: { label: 'Source' },
        medium: { label: 'Medium' },
        content: { label: 'Content' },
        revenue_attribution: { label: 'Revenue Attribution', help: 'Revenue attributed to this touchpoint' },
        attribution_weight: { label: 'Attribution Weight', help: 'Weight assigned in attribution model (0–1)' },
      },
    },

    journey: {
      label: 'Journey',
      pluralLabel: 'Journeys',
      fields: {
        name: { label: 'Journey Name' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Active: 'Active 🟢', Paused: 'Paused ⏸️', Completed: 'Completed ✅', Archived: 'Archived' },
        },
        type: {
          label: 'Journey Type',
          options: {
            Onboarding: 'Onboarding', Nurture: 'Nurture', 'Re-engagement': 'Re-engagement',
            Upsell: 'Upsell', 'Cross-sell': 'Cross-sell', Retention: 'Retention', Custom: 'Custom',
          },
        },
        entry_criteria: { label: 'Entry Criteria', help: 'Criteria for contacts to enter the journey' },
        exit_criteria: { label: 'Exit Criteria', help: 'Criteria for contacts to exit the journey' },
        active_contacts: { label: 'Active Contacts' },
        completed_contacts: { label: 'Completed Contacts' },
        conversion_rate: { label: 'Conversion Rate', help: 'Entry-to-completion conversion rate (%)' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        owner_id: { label: 'Owner' },
      },
    },

    journey_step: {
      label: 'Journey Step',
      pluralLabel: 'Journey Steps',
      fields: {
        journey_id: { label: 'Journey' },
        name: { label: 'Step Name' },
        type: {
          label: 'Step Type',
          options: { Email: 'Email', Wait: 'Wait ⏳', Decision: 'Decision 🔀', Action: 'Action ⚡', Split: 'Split', Goal: 'Goal 🎯' },
        },
        order_index: { label: 'Order' },
        wait_duration: { label: 'Wait Duration' },
        wait_unit: {
          label: 'Wait Unit',
          options: { Minutes: 'Minutes', Hours: 'Hours', Days: 'Days', Weeks: 'Weeks' },
        },
        email_template_id: { label: 'Email Template' },
        condition: { label: 'Condition' },
        action_type: { label: 'Action Type' },
        reached_count: { label: 'Reached Count' },
        completed_count: { label: 'Completed Count' },
      },
    },

    ab_test: {
      label: 'A/B Test',
      pluralLabel: 'A/B Tests',
      fields: {
        name: { label: 'Test Name' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Running: 'Running 🔬', Completed: 'Completed ✅', Cancelled: 'Cancelled' },
        },
        test_type: {
          label: 'Test Type',
          options: {
            'Subject Line': 'Subject Line', 'Email Content': 'Email Content',
            'Send Time': 'Send Time', 'Landing Page': 'Landing Page', CTA: 'CTA',
          },
        },
        campaign_id: { label: 'Campaign' },
        winning_criteria: {
          label: 'Winning Criteria',
          options: { 'Open Rate': 'Open Rate', 'Click Rate': 'Click Rate', 'Conversion Rate': 'Conversion Rate', Revenue: 'Revenue' },
        },
        sample_size_percentage: { label: 'Sample Size', help: 'Percentage of audience used for testing' },
        confidence_level: { label: 'Confidence Level', help: 'Statistical confidence threshold (%)' },
        start_date: { label: 'Start Date' },
        end_date: { label: 'End Date' },
        winner_variant_id: { label: 'Winning Variant' },
        statistical_significance: { label: 'Statistical Significance', help: 'Whether results are statistically significant' },
        owner_id: { label: 'Owner' },
      },
    },

    ab_test_variant: {
      label: 'A/B Test Variant',
      pluralLabel: 'A/B Test Variants',
      fields: {
        ab_test_id: { label: 'A/B Test' },
        name: { label: 'Variant Name' },
        description: { label: 'Description' },
        variant_label: {
          label: 'Variant Label',
          options: { A: 'A', B: 'B', C: 'C', D: 'D' },
        },
        traffic_percentage: { label: 'Traffic Percentage', help: 'Percentage of traffic allocated to this variant' },
        email_template_id: { label: 'Email Template' },
        subject_line: { label: 'Subject Line' },
        send_time: { label: 'Send Time' },
        recipients: { label: 'Recipients' },
        opens: { label: 'Opens' },
        clicks: { label: 'Clicks' },
        conversions: { label: 'Conversions' },
        open_rate: { label: 'Open Rate' },
        click_rate: { label: 'Click Rate' },
        conversion_rate: { label: 'Conversion Rate' },
        is_winner: { label: 'Is Winner' },
      },
    },
  },

  apps: {
    marketing: {
      label: 'Marketing Cloud',
      description: 'Marketing automation, campaign management, and customer engagement',
    },
  },

  messages: {
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.back': 'Back',
    'common.confirm': 'Confirm',
    'common.refresh': 'Refresh',
    'nav.campaigns': 'Campaigns',
    'nav.marketing_automation': 'Marketing Automation',
    'nav.journey_and_testing': 'Journey & Testing',
    'nav.views_dashboards': 'Views & Dashboards',
    'nav.campaign_timeline': 'Campaign Timeline',
    'nav.marketing_dashboard': 'Marketing Dashboard',
    'success.saved': 'Record saved successfully',
    'success.deleted': 'Record deleted successfully',
    'success.campaign_launched': 'Campaign launched successfully',
    'success.email_sent': 'Email sent successfully',
    'success.email_scheduled': 'Email scheduled successfully',
    'success.workflow_activated': 'Workflow activated successfully',
    'success.journey_published': 'Journey published successfully',
    'success.test_started': 'A/B test started successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.launch_campaign': 'Are you sure you want to launch this campaign?',
    'confirm.send_email': 'Are you sure you want to send this email now?',
    'confirm.stop_workflow': 'Are you sure you want to stop this workflow?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
    'error.save_failed': 'Failed to save record',
    'error.send_failed': 'Failed to send email',
    'error.no_recipients': 'No recipients found for this send',
  },

  validationMessages: {
    campaign_dates_invalid: 'End date must be after the start date',
    budget_exceeded: 'Actual cost exceeds the budgeted cost',
    template_required_for_email: 'An email template is required for email campaigns',
    marketing_list_required: 'A marketing list is required before sending',
    sample_size_range: 'Sample size must be between 1% and 50%',
    confidence_level_range: 'Confidence level must be between 80% and 99%',
    journey_requires_steps: 'A journey must have at least one step before publishing',
    workflow_requires_trigger: 'A workflow must have a trigger configured before activation',
    variant_traffic_total: 'Total traffic allocation across variants must equal 100%',
    unsubscribe_cannot_resubscribe: 'This contact has unsubscribed and cannot be re-added to marketing lists',
  },
};
