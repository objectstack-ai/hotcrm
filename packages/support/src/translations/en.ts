import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — Customer Support Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 23 Support objects with field labels, select options, and help texts.
 */
export const en: TranslationData = {
  objects: {
    case: {
      label: 'Case',
      pluralLabel: 'Cases',
      fields: {
        case_number: { label: 'Case Number' },
        subject: { label: 'Subject' },
        description: { label: 'Description' },
        status: {
          label: 'Status',
          options: { New: 'New', Working: 'Working', Escalated: 'Escalated', Closed: 'Closed' },
        },
        priority: {
          label: 'Priority',
          options: { Low: 'Low', Medium: 'Medium', High: 'High 🔴', Critical: 'Critical 🚨' },
        },
        origin: {
          label: 'Case Origin',
          options: {
            Phone: 'Phone', Email: 'Email', Web: 'Web',
            Chat: 'Chat', 'Social Media': 'Social Media',
          },
        },
        type: {
          label: 'Case Type',
          options: {
            Question: 'Question', Problem: 'Problem',
            'Feature Request': 'Feature Request', Incident: 'Incident',
          },
        },
        account_id: { label: 'Account' },
        contact_id: { label: 'Contact' },
        owner_id: { label: 'Case Owner' },
        closed_date: { label: 'Closed Date' },
        resolution: { label: 'Resolution' },
      },
    },

    case_comment: {
      label: 'Case Comment',
      pluralLabel: 'Case Comments',
      fields: {
        case_id: { label: 'Case' },
        body: { label: 'Comment' },
        is_public: { label: 'Public', help: 'Visible to the customer via the portal' },
        created_by: { label: 'Created By' },
      },
    },

    knowledge_article: {
      label: 'Knowledge Article',
      pluralLabel: 'Knowledge Articles',
      fields: {
        title: { label: 'Title' },
        url_name: { label: 'URL Name', help: 'URL-friendly slug for this article' },
        body: { label: 'Article Body' },
        summary: { label: 'Summary' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Published: 'Published ✅', Archived: 'Archived' },
        },
        article_type: {
          label: 'Article Type',
          options: {
            FAQ: 'FAQ', 'How-To': 'How-To', Troubleshooting: 'Troubleshooting',
            'Best Practice': 'Best Practice', Reference: 'Reference',
          },
        },
        category: { label: 'Category' },
        language: { label: 'Language' },
        view_count: { label: 'Views' },
        helpful_count: { label: 'Helpful Votes' },
        not_helpful_count: { label: 'Not Helpful Votes' },
        version_number: { label: 'Version' },
        owner_id: { label: 'Author' },
      },
    },

    sla_policy: {
      label: 'SLA Policy',
      pluralLabel: 'SLA Policies',
      fields: {
        name: { label: 'Policy Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        priority: {
          label: 'Priority',
          options: { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Critical' },
        },
        first_response_time: { label: 'First Response (min)', help: 'Maximum time to first response in minutes' },
        resolution_time: { label: 'Resolution Time (min)', help: 'Maximum time to resolution in minutes' },
        business_hours_id: { label: 'Business Hours' },
        escalation_rule_id: { label: 'Escalation Rule' },
      },
    },

    sla_template: {
      label: 'SLA Template',
      pluralLabel: 'SLA Templates',
      fields: {
        name: { label: 'Template Name' },
        description: { label: 'Description' },
        type: {
          label: 'Template Type',
          options: { Standard: 'Standard', Premium: 'Premium', Enterprise: 'Enterprise', Custom: 'Custom' },
        },
        is_active: { label: 'Active' },
      },
    },

    sla_milestone: {
      label: 'SLA Milestone',
      pluralLabel: 'SLA Milestones',
      fields: {
        name: { label: 'Milestone Name' },
        sla_policy_id: { label: 'SLA Policy' },
        type: {
          label: 'Milestone Type',
          options: {
            'First Response': 'First Response', Resolution: 'Resolution',
            Update: 'Update', Escalation: 'Escalation',
          },
        },
        target_minutes: { label: 'Target (min)', help: 'Target completion time in minutes' },
        warning_minutes: { label: 'Warning (min)', help: 'Warning threshold in minutes before target' },
        is_completed: { label: 'Completed' },
        completed_date: { label: 'Completed Date' },
      },
    },

    business_hours: {
      label: 'Business Hours',
      pluralLabel: 'Business Hours',
      fields: {
        name: { label: 'Name' },
        timezone: { label: 'Timezone' },
        is_default: { label: 'Default', help: 'Use as default business hours for SLA calculations' },
        is_active: { label: 'Active' },
      },
    },

    holiday_calendar: {
      label: 'Holiday Calendar',
      pluralLabel: 'Holiday Calendars',
      fields: {
        name: { label: 'Calendar Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        business_hours_id: { label: 'Business Hours' },
      },
    },

    holiday: {
      label: 'Holiday',
      pluralLabel: 'Holidays',
      fields: {
        name: { label: 'Holiday Name' },
        calendar_id: { label: 'Calendar' },
        date: { label: 'Date' },
        is_recurring: { label: 'Recurring', help: 'Repeats annually on the same date' },
      },
    },

    queue: {
      label: 'Queue',
      pluralLabel: 'Queues',
      fields: {
        name: { label: 'Queue Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        routing_type: {
          label: 'Routing Type',
          options: {
            'Round Robin': 'Round Robin', 'Least Active': 'Least Active',
            'Most Experienced': 'Most Experienced', Manual: 'Manual',
          },
        },
        supported_objects: { label: 'Supported Objects' },
      },
    },

    queue_member: {
      label: 'Queue Member',
      pluralLabel: 'Queue Members',
      fields: {
        queue_id: { label: 'Queue' },
        user_id: { label: 'User' },
        is_active: { label: 'Active' },
        capacity: { label: 'Capacity', help: 'Maximum number of concurrent cases' },
        current_load: { label: 'Current Load', help: 'Number of cases currently assigned' },
      },
    },

    routing_rule: {
      label: 'Routing Rule',
      pluralLabel: 'Routing Rules',
      fields: {
        name: { label: 'Rule Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        priority: { label: 'Priority', help: 'Lower number = higher priority' },
        criteria: { label: 'Criteria' },
        queue_id: { label: 'Target Queue' },
        owner_id: { label: 'Assign To' },
      },
    },

    escalation_rule: {
      label: 'Escalation Rule',
      pluralLabel: 'Escalation Rules',
      fields: {
        name: { label: 'Rule Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        criteria: { label: 'Criteria' },
        escalation_time: { label: 'Escalation Time (min)', help: 'Time in minutes before escalation triggers' },
        escalation_to: { label: 'Escalate To' },
        notification_template: { label: 'Notification Template' },
      },
    },

    skill: {
      label: 'Skill',
      pluralLabel: 'Skills',
      fields: {
        name: { label: 'Skill Name' },
        description: { label: 'Description' },
        category: { label: 'Category' },
        is_active: { label: 'Active' },
      },
    },

    agent_skill: {
      label: 'Agent Skill',
      pluralLabel: 'Agent Skills',
      fields: {
        agent_id: { label: 'Agent' },
        skill_id: { label: 'Skill' },
        proficiency_level: {
          label: 'Proficiency',
          options: { Beginner: 'Beginner', Intermediate: 'Intermediate', Advanced: 'Advanced', Expert: 'Expert' },
        },
        is_primary: { label: 'Primary Skill' },
      },
    },

    email_to_case: {
      label: 'Email-to-Case',
      pluralLabel: 'Email-to-Case Settings',
      fields: {
        name: { label: 'Configuration Name' },
        email_address: { label: 'Email Address' },
        is_active: { label: 'Active' },
        queue_id: { label: 'Default Queue' },
        priority: {
          label: 'Default Priority',
          options: { Low: 'Low', Medium: 'Medium', High: 'High', Critical: 'Critical' },
        },
        case_origin: { label: 'Case Origin' },
      },
    },

    web_to_case: {
      label: 'Web-to-Case',
      pluralLabel: 'Web-to-Case Settings',
      fields: {
        name: { label: 'Configuration Name' },
        is_active: { label: 'Active' },
        queue_id: { label: 'Default Queue' },
        return_url: { label: 'Return URL', help: 'URL to redirect after form submission' },
        enable_recaptcha: { label: 'Enable reCAPTCHA', help: 'Require reCAPTCHA verification to prevent spam' },
      },
    },

    social_media_case: {
      label: 'Social Media Case',
      pluralLabel: 'Social Media Cases',
      fields: {
        case_id: { label: 'Case' },
        platform: {
          label: 'Platform',
          options: {
            Twitter: 'Twitter', Facebook: 'Facebook', Instagram: 'Instagram',
            LinkedIn: 'LinkedIn', YouTube: 'YouTube', TikTok: 'TikTok',
          },
        },
        post_url: { label: 'Post URL' },
        author_name: { label: 'Author' },
        sentiment: {
          label: 'Sentiment',
          options: { Positive: 'Positive 😊', Neutral: 'Neutral 😐', Negative: 'Negative 😠' },
        },
        reach: { label: 'Reach', help: 'Number of users who saw the post' },
        engagement: { label: 'Engagement', help: 'Total interactions (likes, shares, comments)' },
      },
    },

    portal_user: {
      label: 'Portal User',
      pluralLabel: 'Portal Users',
      fields: {
        contact_id: { label: 'Contact' },
        username: { label: 'Username' },
        is_active: { label: 'Active' },
        role: {
          label: 'Role',
          options: { Standard: 'Standard', 'Power User': 'Power User', Admin: 'Admin' },
        },
        last_login: { label: 'Last Login' },
        login_count: { label: 'Login Count' },
        profile_photo: { label: 'Profile Photo' },
      },
    },

    forum_topic: {
      label: 'Forum Topic',
      pluralLabel: 'Forum Topics',
      fields: {
        title: { label: 'Title' },
        body: { label: 'Body' },
        category: {
          label: 'Category',
          options: {
            General: 'General', 'Product Questions': 'Product Questions',
            'Feature Requests': 'Feature Requests', 'Tips & Tricks': 'Tips & Tricks',
            Announcements: 'Announcements',
          },
        },
        status: {
          label: 'Status',
          options: { Open: 'Open', Closed: 'Closed', Pinned: 'Pinned 📌', Archived: 'Archived' },
        },
        author_id: { label: 'Author' },
        view_count: { label: 'Views' },
        reply_count: { label: 'Replies' },
        is_pinned: { label: 'Pinned' },
        is_locked: { label: 'Locked' },
      },
    },

    forum_post: {
      label: 'Forum Post',
      pluralLabel: 'Forum Posts',
      fields: {
        topic_id: { label: 'Topic' },
        body: { label: 'Body' },
        author_id: { label: 'Author' },
        is_best_answer: { label: 'Best Answer', help: 'Marked as the best answer by the topic author' },
        helpful_count: { label: 'Helpful Votes' },
      },
    },

    chatbot_config: {
      label: 'Chatbot Configuration',
      pluralLabel: 'Chatbot Configurations',
      fields: {
        name: { label: 'Chatbot Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        welcome_message: { label: 'Welcome Message', help: 'Initial greeting shown to the customer' },
        fallback_message: { label: 'Fallback Message', help: 'Message shown when the chatbot cannot understand' },
        language: { label: 'Language' },
        queue_id: { label: 'Escalation Queue', help: 'Queue to route to when chatbot escalates' },
        model_provider: { label: 'AI Model Provider' },
        max_turns: { label: 'Max Turns', help: 'Maximum conversation turns before auto-escalation' },
      },
    },

    macro: {
      label: 'Macro',
      pluralLabel: 'Macros',
      fields: {
        name: { label: 'Macro Name' },
        description: { label: 'Description' },
        is_active: { label: 'Active' },
        steps: { label: 'Steps', help: 'Ordered list of actions to execute' },
        target_object: { label: 'Target Object' },
        folder: { label: 'Folder' },
        owner_id: { label: 'Owner' },
      },
    },
  },

  apps: {
    support: {
      label: 'Customer Support',
      description: 'Customer support management with cases, knowledge base, and SLA tracking',
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
    'nav.support': 'Support',
    'nav.sla_management': 'SLA Management',
    'nav.automation_ai': 'Automation & AI',
    'nav.community_portal': 'Community Portal',
    'nav.views_dashboards': 'Views & Dashboards',
    'nav.case_board': 'Case Board',
    'nav.support_dashboard': 'Support Dashboard',
    'success.saved': 'Record saved successfully',
    'success.deleted': 'Record deleted successfully',
    'success.case_closed': 'Case closed successfully',
    'success.article_published': 'Article published successfully',
    'success.macro_executed': 'Macro executed successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.close_case': 'Close this case? A resolution is required.',
    'confirm.publish_article': 'Publish this article? It will be visible to all users.',
    'confirm.escalate': 'Escalate this case to the next level?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
    'error.save_failed': 'Failed to save record',
    'error.sla_breach': 'SLA breach detected — immediate action required',
    'error.queue_full': 'Target queue is at capacity',
  },

  validationMessages: {
    sla_breach_warning: 'This case is approaching its SLA deadline',
    case_requires_contact: 'A contact is required before the case can be saved',
    article_publish_incomplete: 'Title, body, and summary are required before publishing',
    resolution_required_to_close: 'A resolution must be provided before closing the case',
    escalation_time_positive: 'Escalation time must be greater than zero',
    target_minutes_positive: 'Target minutes must be greater than zero',
    capacity_exceeded: 'Agent capacity has been exceeded',
    duplicate_queue_member: 'This user is already a member of the queue',
  },
};
