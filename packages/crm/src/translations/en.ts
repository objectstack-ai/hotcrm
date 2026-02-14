import type { TranslationData } from '@objectstack/spec/system';

/**
 * English (en) — CRM Sales Cloud Translations
 *
 * Per-locale file: one file per language, following the `per_locale` convention.
 * Each file exports a single `TranslationData` object for its locale.
 *
 * Covers all 16 CRM objects with field labels, select options, and help texts.
 */
export const en: TranslationData = {
  objects: {
    account: {
      label: 'Account',
      pluralLabel: 'Accounts',
      fields: {
        name: { label: 'Account Name' },
        account_number: { label: 'Account Number' },
        type: {
          label: 'Account Type',
          options: { Prospect: 'Prospect', Customer: 'Customer', Partner: 'Partner', Competitor: 'Competitor', Other: 'Other' },
        },
        industry: {
          label: 'Industry',
          options: {
            Technology: 'Technology', Finance: 'Finance', Manufacturing: 'Manufacturing',
            Retail: 'Retail', Healthcare: 'Healthcare', Education: 'Education',
            'Real Estate': 'Real Estate', Energy: 'Energy', Consulting: 'Consulting', Other: 'Other',
          },
        },
        annual_revenue: { label: 'Annual Revenue' },
        number_of_employees: { label: 'Number of Employees' },
        rating: {
          label: 'Rating',
          options: { Hot: 'Hot 🔥', Warm: 'Warm ⭐', Cold: 'Cold ❄️' },
        },
        phone: { label: 'Phone' },
        fax: { label: 'Fax' },
        website: { label: 'Website' },
        email: { label: 'Email' },
        billing_street: { label: 'Billing Street' },
        billing_city: { label: 'Billing City' },
        billing_state: { label: 'Billing State/Province' },
        billing_postal_code: { label: 'Billing Postal Code' },
        billing_country: { label: 'Billing Country' },
        shipping_street: { label: 'Shipping Street' },
        shipping_city: { label: 'Shipping City' },
        shipping_state: { label: 'Shipping State/Province' },
        shipping_postal_code: { label: 'Shipping Postal Code' },
        shipping_country: { label: 'Shipping Country' },
        customer_status: {
          label: 'Customer Status',
          options: { Prospect: 'Prospect', 'Active Customer': 'Active Customer', Churned: 'Churned', 'On Hold': 'On Hold' },
        },
        description: { label: 'Description' },
        sla_tier: {
          label: 'SLA Tier',
          options: { Platinum: 'Platinum', Gold: 'Gold', Silver: 'Silver', Standard: 'Standard' },
        },
        health_score: { label: 'Health Score', help: 'Customer health score (0-100)' },
        next_renewal_date: { label: 'Next Renewal Date' },
        contract_value: { label: 'Contract Value', help: 'Total value of all active contracts' },
        owner_id: { label: 'Owner' },
        parent_id: { label: 'Parent Account' },
        total_opportunities: { label: 'Total Opportunities' },
        total_open_opportunities_amount: { label: 'Total Open Opportunities Amount' },
        headquarters_location: { label: 'Headquarters Location' },
        billing_address: { label: 'Billing Address' },
        shipping_address: { label: 'Shipping Address' },
      },
    },

    activity: {
      label: 'Activity',
      pluralLabel: 'Activities',
      fields: {
        subject: { label: 'Subject' },
        type: {
          label: 'Activity Type',
          options: {
            Call: '📞 Call', Email: '📧 Email', Meeting: '🤝 Meeting', Task: '📝 Task',
            Note: '📋 Note', SMS: '📱 SMS', Demo: '🎤 Demo', Proposal: '📊 Proposal',
            Lunch: '🍽️ Lunch', Other: '🎯 Other',
          },
        },
        status: {
          label: 'Status',
          options: {
            Planned: '📋 Planned', 'In Progress': '🚀 In Progress', Completed: '✅ Completed',
            Cancelled: '❌ Cancelled', Deferred: '⏰ Deferred',
          },
        },
        priority: {
          label: 'Priority',
          options: { High: '🔴 High', Medium: '🟡 Medium', Low: '🟢 Low' },
        },
        activity_date: { label: 'Activity Date' },
        due_date: { label: 'Due Date' },
        end_date_time: { label: 'End Time' },
        duration_in_minutes: { label: 'Duration (Minutes)' },
        completed_date: { label: 'Completed Date' },
        who_id: { label: 'Related Person', help: 'Link to Contact or Lead' },
        what_id: { label: 'Related To', help: 'Link to Account, Opportunity, Contract, or Case' },
        owner_id: { label: 'Assigned To' },
        location: { label: 'Location' },
        is_online: { label: 'Online Activity' },
        meeting_link: { label: 'Meeting Link', help: 'Zoom/Teams/Tencent Meeting link' },
        check_in_time: { label: 'Check-in Time' },
        check_in_location: { label: 'Check-in Location' },
        check_in_latitude: { label: 'Check-in Latitude' },
        check_in_longitude: { label: 'Check-in Longitude' },
        call_type: {
          label: 'Call Type',
          options: { Outbound: 'Outbound', Inbound: 'Inbound', Internal: 'Internal' },
        },
        call_duration_in_seconds: { label: 'Call Duration (Seconds)' },
        call_result: {
          label: 'Call Result',
          options: {
            Connected: '✅ Connected', 'Not Connected': '❌ Not Connected',
            'Left Message': '📧 Left Message', 'Call Back Later': '⏰ Call Back Later',
            Rejected: '🚫 Rejected',
          },
        },
        email_subject: { label: 'Email Subject' },
        email_body: { label: 'Email Body' },
        email_from_address: { label: 'From' },
        email_to_address: { label: 'To' },
        email_cc_address: { label: 'CC' },
        sms_body: { label: 'SMS Content' },
        sms_phone_number: { label: 'SMS Phone Number' },
        is_recurring: { label: 'Recurring Task' },
        recurrence_pattern: {
          label: 'Recurrence Pattern',
          options: { Daily: 'Daily', Weekly: 'Weekly', Monthly: 'Monthly', Yearly: 'Yearly' },
        },
        recurrence_interval: { label: 'Recurrence Interval', help: 'Repeat every N days/weeks/months/years' },
        recurrence_end_date: { label: 'Recurrence End Date' },
        recurrence_instance_id: { label: 'Parent Recurring Activity', help: 'Link to the master recurring activity' },
        description: { label: 'Description/Notes' },
        ai_transcription: { label: 'AI Transcription', help: 'AI-powered voice-to-text transcription' },
        ai_action_items: { label: 'AI Extracted Action Items', help: 'Auto-extracted action items from meetings/calls' },
        ai_sentiment_analysis: {
          label: 'AI Sentiment',
          options: { Positive: '😊 Positive', Neutral: '😐 Neutral', Negative: '😟 Negative' },
        },
        ai_key_points: { label: 'AI Key Points', help: 'AI summary of key discussion points' },
        ai_next_step_suggestion: { label: 'AI Next Step' },
      },
    },

    assignment_rule: {
      label: 'Assignment Rule',
      pluralLabel: 'Assignment Rules',
      fields: {
        name: { label: 'Rule Name' },
        object_name: {
          label: 'Object',
          options: { lead: 'Lead', case: 'Case' },
        },
        active: { label: 'Active' },
        sort_order: { label: 'Sort Order' },
        criteria_field: { label: 'Criteria Field', help: 'Field API Name to evaluate' },
        criteria_operator: {
          label: 'Operator',
          options: { '=': 'Equals', '!=': 'Not Equals', '>': 'Greater Than', '<': 'Less Than', contains: 'Contains' },
        },
        criteria_value: { label: 'Value' },
        assign_to: { label: 'Assign To User' },
        assign_to_queue: { label: 'Assign To Queue' },
      },
    },

    competitor: {
      label: 'Competitor',
      pluralLabel: 'Competitors',
      fields: {
        name: { label: 'Competitor Name' },
        opportunity_id: { label: 'Opportunity', help: 'Associated opportunity' },
        website: { label: 'Website' },
        strengths: { label: 'Strengths' },
        weaknesses: { label: 'Weaknesses' },
        threat_level: {
          label: 'Threat Level',
          options: { High: '🔴 High', Medium: '🟡 Medium', Low: '🟢 Low', Unknown: '⚪ Unknown' },
        },
        status: {
          label: 'Status',
          options: {
            'Active Competitor': 'Active Competitor', 'Won Against': 'Won Against',
            'Lost To': 'Lost To', 'No Longer Competing': 'No Longer Competing',
          },
        },
        product_offered: { label: 'Product Offered', help: 'Competitor product in this deal' },
        price_range: { label: 'Price Range', help: 'Estimated competitor pricing' },
        win_loss_reason: { label: 'Win/Loss Reason' },
        key_differentiators: { label: 'Key Differentiators', help: 'What sets us apart from this competitor' },
        last_seen_date: { label: 'Last Seen', help: 'Last time this competitor was encountered' },
        encounter_count: { label: 'Encounter Count' },
        win_rate: { label: 'Win Rate Against', help: 'Historical win rate against this competitor' },
      },
    },

    contact: {
      label: 'Contact',
      pluralLabel: 'Contacts',
      fields: {
        first_name: { label: 'First Name' },
        last_name: { label: 'Last Name' },
        salutation: {
          label: 'Salutation',
          options: { 'Mr.': 'Mr.', 'Ms.': 'Ms.', 'Dr.': 'Dr.', 'Prof.': 'Prof.' },
        },
        account_id: { label: 'Account' },
        title: { label: 'Title' },
        department: { label: 'Department' },
        level: {
          label: 'Level',
          options: {
            'C-Level': 'C-Level', VP: 'VP', Director: 'Director',
            Manager: 'Manager', 'Individual Contributor': 'Individual Contributor',
          },
        },
        email: { label: 'Email' },
        phone: { label: 'Phone' },
        mobile_phone: { label: 'Mobile' },
        fax: { label: 'Fax' },
        is_decision_maker: { label: 'Decision Maker', help: 'Whether this contact is a primary decision maker' },
        influence_level: {
          label: 'Influence Level',
          options: {
            High: 'High - Final Decision Maker', Medium: 'Medium - Key Influencer',
            Low: 'Low - General Participant',
          },
        },
        relationship_strength: {
          label: 'Relationship Strength',
          options: {
            Strong: 'Strong - Strategic Partner', Medium: 'Medium - Good Relationship',
            Weak: 'Weak - Initial Contact', Unknown: 'Unknown',
          },
        },
        preferred_contact: {
          label: 'Preferred Contact Method',
          options: { Email: 'Email', Phone: 'Phone', Mobile: 'Mobile', WeChat: 'WeChat' },
        },
        last_contact_date: { label: 'Last Contact Date' },
        notes: { label: 'Notes' },
      },
    },

    forecast: {
      label: 'Forecast',
      pluralLabel: 'Forecasts',
      fields: {
        forecast_period: {
          label: 'Forecast Period',
          options: { Monthly: 'Monthly', Quarterly: 'Quarterly', Annually: 'Annually' },
        },
        period_start: { label: 'Period Start', help: 'Start date of the forecast period' },
        period_end: { label: 'Period End', help: 'End date of the forecast period' },
        owner_id: { label: 'Forecast Owner', help: 'User or team this forecast belongs to' },
        forecast_category: {
          label: 'Forecast Category',
          options: { Pipeline: 'Pipeline', 'Best Case': 'Best Case', Commit: 'Commit', Closed: 'Closed', Omitted: 'Omitted' },
        },
        amount: { label: 'Forecast Amount', help: 'Total forecasted revenue amount' },
        quota: { label: 'Quota', help: 'Sales quota for this period' },
        quota_attainment: { label: 'Quota Attainment', help: 'Percentage of quota achieved' },
        pipeline_amount: { label: 'Pipeline Amount', help: 'Total pipeline value for this period' },
        closed_amount: { label: 'Closed Amount', help: 'Total closed-won amount for this period' },
        gap_to_quota: { label: 'Gap to Quota', help: 'Remaining amount to reach quota' },
        ai_predicted_amount: { label: 'AI Predicted Amount', help: 'AI-predicted forecast based on pipeline analysis' },
        ai_confidence: { label: 'AI Confidence', help: 'Confidence level of AI prediction' },
        manager_adjustment: { label: 'Manager Adjustment', help: 'Manual adjustment by sales manager' },
        adjusted_amount: { label: 'Adjusted Amount', help: 'Final amount after manager adjustments' },
        status: {
          label: 'Status',
          options: { Draft: 'Draft', Submitted: 'Submitted', Approved: 'Approved', Locked: 'Locked' },
        },
        last_calculated_at: { label: 'Last Calculated' },
      },
    },

    forecast_item: {
      label: 'Forecast Item',
      pluralLabel: 'Forecast Items',
      fields: {
        forecast_id: { label: 'Forecast', help: 'Parent forecast record' },
        opportunity_id: { label: 'Opportunity', help: 'Contributing opportunity' },
        amount: { label: 'Amount', help: 'Amount contributed to forecast' },
        forecast_category: {
          label: 'Forecast Category',
          options: { Pipeline: 'Pipeline', 'Best Case': 'Best Case', Commit: 'Commit', Closed: 'Closed', Omitted: 'Omitted' },
        },
        probability: { label: 'Probability', help: 'Win probability from opportunity' },
        weighted_amount: { label: 'Weighted Amount', help: 'Amount weighted by probability' },
        close_date: { label: 'Expected Close Date', help: 'Expected close date from opportunity' },
        stage: { label: 'Opportunity Stage', help: 'Current stage of the opportunity' },
        owner_override: { label: 'Owner Override', help: 'Manual override amount by opportunity owner' },
        manager_override: { label: 'Manager Override', help: 'Manual override amount by manager' },
        is_override: { label: 'Has Override', help: 'Whether this item has been manually overridden' },
      },
    },

    lead: {
      label: 'Lead',
      pluralLabel: 'Leads',
      fields: {
        first_name: { label: 'First Name' },
        last_name: { label: 'Last Name' },
        company: { label: 'Company' },
        title: { label: 'Title' },
        email: { label: 'Email' },
        phone: { label: 'Phone' },
        mobile_phone: { label: 'Mobile' },
        website: { label: 'Website' },
        status: {
          label: 'Status',
          options: {
            New: 'New', Contacted: 'Contacted', Qualified: 'Qualified',
            Unqualified: 'Unqualified', Converted: 'Converted',
          },
        },
        rating: {
          label: 'Rating',
          options: { Hot: 'Hot 🔥', Warm: 'Warm ⭐', Cold: 'Cold ❄️' },
        },
        lead_score: { label: 'Lead Score' },
        data_completeness: { label: 'Data Completeness (%)' },
        industry: {
          label: 'Industry',
          options: {
            Technology: 'Technology', Finance: 'Finance', Manufacturing: 'Manufacturing',
            Retail: 'Retail', Healthcare: 'Healthcare', Education: 'Education',
            'Real Estate': 'Real Estate', Energy: 'Energy', Consulting: 'Consulting', Other: 'Other',
          },
        },
        number_of_employees: { label: 'Number of Employees' },
        annual_revenue: { label: 'Annual Revenue' },
        lead_source: {
          label: 'Lead Source',
          options: {
            Web: 'Web', 'Phone Inquiry': 'Phone Inquiry', 'Partner Referral': 'Partner Referral',
            'Purchased List': 'Purchased List', Other: 'Other',
          },
        },
        is_in_public_pool: { label: 'Is In Public Pool' },
        pool_entry_date: { label: 'Pool Entry Date' },
        claimed_date: { label: 'Claimed Date' },
        street: { label: 'Street' },
        city: { label: 'City' },
        state: { label: 'State/Province' },
        postal_code: { label: 'Postal Code' },
        country: { label: 'Country' },
        description: { label: 'Description' },
        owner_id: { label: 'Owner' },
      },
    },

    note: {
      label: 'Note',
      pluralLabel: 'Notes',
      fields: {
        title: { label: 'Note Title' },
        body: { label: 'Note Body', help: 'Rich text with Markdown support' },
        parent_id: { label: 'Parent Record ID', help: 'ID of the parent record (polymorphic)' },
        parent_type: {
          label: 'Parent Type',
          options: {
            account: '🏢 Account', contact: '👤 Contact', opportunity: '💼 Opportunity',
            lead: '🎯 Lead', case: '🎫 Case', contract: '📄 Contract',
            quote: '💰 Quote', task: '📋 Task', activity: '📅 Activity',
            campaign: '📢 Campaign', product: '📦 Product', order: '📑 Order',
          },
        },
        is_private: { label: 'Private Note', help: 'When true, only the owner can see this note' },
        is_pinned: { label: 'Pinned', help: 'Pin important notes to the top' },
        tags: { label: 'Tags', help: 'Comma-separated tags for categorization and search' },
        owner_id: { label: 'Owner' },
        mentioned_user_ids: { label: 'Mentioned Users', help: 'Comma-separated User IDs extracted from @mentions in the body' },
        has_mentions: { label: 'Has @Mentions' },
        is_markdown: { label: 'Markdown Enabled', help: 'Enable Markdown formatting for this note' },
        rendered_body: { label: 'Rendered Body', help: 'HTML-rendered version of the markdown body' },
        word_count: { label: 'Word Count', help: 'Approximate word count' },
        last_edited_date: { label: 'Last Edited' },
        last_edited_by_id: { label: 'Last Edited By' },
        searchable_text: { label: 'Searchable Text', help: 'Combined title + body for full-text search indexing' },
        ai_summary: { label: 'AI Summary', help: 'AI-generated summary of the note' },
        ai_extracted_keywords: { label: 'AI Extracted Keywords', help: 'AI-extracted keywords from the note content' },
        ai_sentiment: {
          label: 'AI Sentiment',
          options: { Positive: '😊 Positive', Neutral: '😐 Neutral', Negative: '😟 Negative' },
        },
      },
    },

    opportunity: {
      label: 'Opportunity',
      pluralLabel: 'Opportunities',
      fields: {
        name: { label: 'Opportunity Name' },
        account_id: { label: 'Account' },
        contact_id: { label: 'Primary Contact' },
        amount: { label: 'Amount' },
        close_date: { label: 'Expected Close Date' },
        stage: {
          label: 'Stage',
          options: {
            Prospecting: '🔍 Prospecting', Qualification: '📞 Qualification',
            'Needs Analysis': '💡 Needs Analysis', Proposal: '📊 Proposal',
            Negotiation: '💰 Negotiation', 'Closed Won': '✅ Closed Won', 'Closed Lost': '❌ Closed Lost',
          },
        },
        probability: { label: 'Win Probability', help: 'Win probability percentage' },
        next_step: { label: 'Next Step', help: 'Clear next action plan' },
        lead_source: {
          label: 'Lead Source',
          options: {
            Web: 'Web', 'Phone Inquiry': 'Phone Inquiry', 'Partner Referral': 'Partner Referral',
            'Trade Show': 'Trade Show', 'Social Media': 'Social Media', Advertisement: 'Advertisement',
            'Customer Referral': 'Customer Referral', Other: 'Other',
          },
        },
        forecast_category: {
          label: 'Forecast Category',
          options: { Pipeline: 'Pipeline', 'Best Case': 'Best Case', Commit: 'Commit', Omitted: 'Omitted', Closed: 'Closed' },
        },
        type: {
          label: 'Opportunity Type',
          options: {
            'New Business': 'New Business', 'Existing Business - Upgrade': 'Existing Business - Upgrade',
            'Existing Business - Renewal': 'Existing Business - Renewal',
            'Existing Business - Replacement': 'Existing Business - Replacement',
          },
        },
        expected_revenue: { label: 'Expected Revenue', help: 'Calculated from amount and win probability' },
        days_open: { label: 'Days Open' },
        owner_id: { label: 'Owner' },
      },
    },

    opportunity_contact_role: {
      label: 'Opportunity Contact Role',
      pluralLabel: 'Opportunity Contact Roles',
      fields: {
        opportunity_id: { label: 'Opportunity', help: 'Parent opportunity' },
        contact_id: { label: 'Contact', help: 'Associated contact' },
        role: {
          label: 'Role',
          options: {
            'Decision Maker': 'Decision Maker', 'Economic Buyer': 'Economic Buyer',
            'Technical Evaluator': 'Technical Evaluator', Champion: 'Champion',
            Influencer: 'Influencer', 'End User': 'End User',
            'Executive Sponsor': 'Executive Sponsor', Other: 'Other',
          },
        },
        is_primary: { label: 'Primary Contact', help: 'Whether this is the primary contact for the opportunity' },
        influence_level: {
          label: 'Influence Level',
          options: { High: '🔴 High', Medium: '🟡 Medium', Low: '🟢 Low' },
        },
        engagement_score: { label: 'Engagement Score', help: 'Calculated engagement score (0-100)' },
        last_activity_date: { label: 'Last Activity', help: 'Date of last interaction with this contact on this deal' },
        notes: { label: 'Notes', help: 'Additional notes about contact involvement' },
      },
    },

    opportunity_line_item: {
      label: 'Opportunity Line Item',
      pluralLabel: 'Opportunity Line Items',
      fields: {
        opportunity_id: { label: 'Opportunity', help: 'Parent opportunity for this line item' },
        product_id: { label: 'Product', help: 'Product associated with this line item' },
        pricebook_entry_id: { label: 'Price Book Entry', help: 'Price book entry used for pricing' },
        quantity: { label: 'Quantity', help: 'Number of units' },
        unit_price: { label: 'Unit Price', help: 'Price per unit' },
        total_price: { label: 'Total Price', help: 'Calculated total (quantity × unit price - discount)' },
        discount_percent: { label: 'Discount (%)', help: 'Discount percentage applied to this line item' },
        discount_amount: { label: 'Discount Amount', help: 'Calculated discount amount' },
        list_price: { label: 'List Price', help: 'Original list price from price book' },
        description: { label: 'Description' },
        line_number: { label: 'Line Number', help: 'Sort order for display' },
        service_date: { label: 'Service Date', help: 'Date when product/service is delivered' },
        product_code: { label: 'Product Code', help: 'Product SKU (copied from product)' },
      },
    },

    opportunity_team_member: {
      label: 'Opportunity Team Member',
      pluralLabel: 'Opportunity Team Members',
      fields: {
        opportunity_id: { label: 'Opportunity' },
        user_id: { label: 'Team Member' },
        team_role: {
          label: 'Team Role',
          options: {
            'Account Executive': 'Account Executive', 'Sales Engineer': 'Sales Engineer',
            'Solution Architect': 'Solution Architect', 'Executive Sponsor': 'Executive Sponsor',
            'Deal Support': 'Deal Support', Partner: 'Partner', Other: 'Other',
          },
        },
        access_level: {
          label: 'Access Level',
          options: { 'Read Only': 'Read Only', 'Read/Write': 'Read/Write', 'Full Access': 'Full Access' },
        },
        split_percentage: { label: 'Revenue Split %', help: 'Percentage of revenue credit' },
        split_amount: { label: 'Split Amount' },
        is_active: { label: 'Active' },
        added_date: { label: 'Date Added' },
        notes: { label: 'Notes' },
      },
    },

    task: {
      label: 'Task',
      pluralLabel: 'Tasks',
      fields: {
        subject: { label: 'Task Subject' },
        priority: {
          label: 'Priority',
          options: { High: '🔴 High', Normal: '🟡 Normal', Low: '🟢 Low' },
        },
        status: {
          label: 'Status',
          options: {
            'Not Started': '📋 Not Started', 'In Progress': '🚀 In Progress',
            Completed: '✅ Completed', Waiting: '⏰ Waiting', Deferred: '⏸️ Deferred',
          },
        },
        due_date: { label: 'Due Date', help: 'Task must have a due date' },
        start_date: { label: 'Start Date' },
        completed_date: { label: 'Completed Date' },
        reminder_date_time: { label: 'Reminder Date/Time', help: 'When to send a reminder notification' },
        is_reminder_set: { label: 'Reminder Set' },
        recurrence_type: {
          label: 'Recurrence Type',
          options: { Daily: '📅 Daily', Weekly: '📆 Weekly', Monthly: '🗓️ Monthly', Yearly: '📊 Yearly' },
        },
        recurrence_interval: { label: 'Recurrence Interval', help: 'Repeat every N days/weeks/months/years' },
        recurrence_end_date: { label: 'Recurrence End Date', help: 'When the recurring task should stop' },
        recurrence_parent_id: { label: 'Recurring Parent Task', help: 'Link to the master recurring task' },
        what_id: { label: 'Related To', help: 'Link to related business object' },
        who_id: { label: 'Related Person', help: 'Link to Contact or Lead' },
        owner_id: { label: 'Assigned To' },
        parent_task_id: { label: 'Parent Task', help: 'For creating task hierarchies and subtasks' },
        estimated_hours: { label: 'Estimated Hours', help: 'Estimated time to complete this task' },
        actual_hours: { label: 'Actual Hours', help: 'Actual time spent on this task' },
        percent_complete: { label: 'Percent Complete', help: 'Task completion percentage (0-100%)' },
        blocked_by: { label: 'Blocked By', help: 'Comma-separated task IDs that block this task' },
        blocks: { label: 'Blocks', help: 'Comma-separated task IDs that this task blocks' },
        checklist_items: { label: 'Checklist Items', help: 'JSON array of checklist items with completion status' },
        checklist_completed_count: { label: 'Checklist Completed Count', help: 'Number of completed checklist items' },
        checklist_total_count: { label: 'Checklist Total Count', help: 'Total number of checklist items' },
        description: { label: 'Description' },
        kanban_column: {
          label: 'Kanban Column',
          options: { 'To Do': '📝 To Do', 'In Progress': '🚀 In Progress', Review: '👀 Review', Done: '✅ Done' },
        },
        kanban_order: { label: 'Kanban Order', help: 'Order within Kanban column' },
        tags: { label: 'Tags', help: 'Comma-separated tags for categorization' },
        ai_suggested_priority: {
          label: 'AI Suggested Priority',
          options: { High: '🔴 High', Normal: '🟡 Normal', Low: '🟢 Low' },
        },
        ai_estimated_duration: { label: 'AI Estimated Duration (Hours)', help: 'AI-predicted task duration' },
      },
    },

    territory: {
      label: 'Territory',
      pluralLabel: 'Territories',
      fields: {
        name: { label: 'Territory Name' },
        description: { label: 'Description' },
        territory_type: {
          label: 'Territory Type',
          options: {
            Geographic: 'Geographic', 'Named Account': 'Named Account',
            Industry: 'Industry', 'Product Line': 'Product Line', Hybrid: 'Hybrid',
          },
        },
        parent_territory_id: { label: 'Parent Territory', help: 'Hierarchical parent territory' },
        owner_id: { label: 'Territory Owner' },
        status: {
          label: 'Status',
          options: { Active: 'Active', Inactive: 'Inactive', Planning: 'Planning' },
        },
        region: { label: 'Region' },
        country: { label: 'Country' },
        state_province: { label: 'State/Province' },
        quota: { label: 'Territory Quota', help: 'Revenue quota for this territory' },
        account_count: { label: 'Account Count' },
        opportunity_count: { label: 'Opportunity Count' },
        total_pipeline: { label: 'Total Pipeline' },
        total_closed_won: { label: 'Total Closed Won' },
        assigned_users: { label: 'Assigned Users', help: 'Comma-separated user IDs assigned to this territory' },
      },
    },

    territory_rule: {
      label: 'Territory Rule',
      pluralLabel: 'Territory Rules',
      fields: {
        territory_id: { label: 'Territory' },
        name: { label: 'Rule Name' },
        rule_type: {
          label: 'Rule Type',
          options: {
            Geographic: 'Geographic', Industry: 'Industry', 'Revenue Range': 'Revenue Range',
            'Employee Count': 'Employee Count', 'Account Type': 'Account Type', 'Custom Field': 'Custom Field',
          },
        },
        field_name: { label: 'Field Name', help: 'Object field to evaluate' },
        operator: {
          label: 'Operator',
          options: {
            Equals: 'Equals', 'Not Equals': 'Not Equals', Contains: 'Contains',
            'Starts With': 'Starts With', 'Greater Than': 'Greater Than',
            'Less Than': 'Less Than', In: 'In', Between: 'Between',
          },
        },
        value: { label: 'Value', help: 'Value or comma-separated values to match' },
        value_min: { label: 'Min Value', help: 'Minimum value for range rules' },
        value_max: { label: 'Max Value', help: 'Maximum value for range rules' },
        priority: { label: 'Priority', help: 'Lower number = higher priority' },
        is_active: { label: 'Active' },
        match_count: { label: 'Match Count', help: 'Number of accounts matching this rule' },
      },
    },
  },

  apps: {
    crm: {
      label: 'Sales Cloud',
      description: 'Customer relationship management for sales, service, and marketing',
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
    'nav.sales': 'Sales',
    'nav.territories': 'Territories',
    'nav.views_dashboards': 'Views & Dashboards',
    'nav.pipeline_board': 'Pipeline Board',
    'nav.activity_calendar': 'Activity Calendar',
    'nav.sales_dashboard': 'Sales Dashboard',
    'nav.executive_dashboard': 'Executive Dashboard',
    'success.saved': 'Record saved successfully',
    'success.deleted': 'Record deleted successfully',
    'success.converted': 'Lead converted successfully',
    'confirm.delete': 'Are you sure you want to delete this record?',
    'confirm.convert_lead': 'Convert this lead to account, contact, and opportunity?',
    'error.required': 'This field is required',
    'error.load_failed': 'Failed to load data',
    'error.save_failed': 'Failed to save record',
  },

  validationMessages: {
    amount_required_for_closed: 'Amount is required when stage is Closed Won',
    close_date_required: 'Close date is required for opportunities',
    discount_limit: 'Discount cannot exceed 40%',
    lead_score_range: 'Lead score must be between 0 and 100',
    health_score_range: 'Health score must be between 0 and 100',
  },
};
