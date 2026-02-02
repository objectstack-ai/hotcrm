import { ObjectSchema, Field } from '@objectstack/spec/data';

export const PortalUser = ObjectSchema.create({
  name: 'portal_user',
  label: 'Portal User',
  pluralLabel: 'Portal Users',
  icon: 'user-shield',
  description: 'Customer portal user access and preferences',

  fields: {
    username: Field.text({
      label: 'username',
      required: true,
      maxLength: 100
    }),
    email: Field.email({
      label: 'email',
      required: true
    }),
    first_name: Field.text({
      label: 'First Name',
      required: true,
      maxLength: 100
    }),
    last_name: Field.text({
      label: 'Last Name',
      required: true,
      maxLength: 100
    }),
    full_name: Field.text({
      label: 'Full Name',
      readonly: true,
      maxLength: 200
    }),
    contact_id: Field.lookup('contact', {
      label: 'Contact',
      description: 'Associated contact record',
      required: true
    }),
    account_id: Field.lookup('account', {
      label: 'Account',
      description: 'Associated account record',
      required: true
    }),
    is_active: Field.checkbox({
      label: 'Active',
      defaultValue: true
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'Active',
      options: [
        {
          "label": "✅ Active",
          "value": "Active"
        },
        {
          "label": "⏸️ Suspended",
          "value": "Suspended"
        },
        {
          "label": "🔒 Locked",
          "value": "Locked"
        },
        {
          "label": "❌ Deactivated",
          "value": "Deactivated"
        },
        {
          "label": "⏳ Pending Approval",
          "value": "PendingApproval"
        }
      ]
    }),
    user_role: Field.select({
      label: 'Portal Role',
      required: true,
      defaultValue: 'Standard',
      options: [
        {
          "label": "👑 Admin",
          "value": "Admin"
        },
        {
          "label": "👤 Standard",
          "value": "Standard"
        },
        {
          "label": "👁️ Read Only",
          "value": "ReadOnly"
        },
        {
          "label": "🎓 Limited",
          "value": "Limited"
        }
      ]
    }),
    customer_tier: Field.select({
      label: 'Customer Tier',
      options: [
        {
          "label": "Free",
          "value": "Free"
        },
        {
          "label": "Basic",
          "value": "Basic"
        },
        {
          "label": "Professional",
          "value": "Professional"
        },
        {
          "label": "Enterprise",
          "value": "Enterprise"
        },
        {
          "label": "Premium",
          "value": "Premium"
        }
      ]
    }),
    last_login_date: Field.datetime({
      label: 'Last Login',
      readonly: true
    }),
    last_login_ip: Field.text({
      label: 'Last Login IP',
      readonly: true,
      maxLength: 45
    }),
    login_count: Field.number({
      label: 'Login Count',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    failed_login_attempts: Field.number({
      label: 'Failed Login Attempts',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    password_last_changed_date: Field.datetime({
      label: 'Password Last Changed',
      readonly: true
    }),
    must_change_password: Field.checkbox({
      label: 'Must Change Password',
      defaultValue: false
    }),
    two_factor_enabled: Field.checkbox({
      label: 'Two-Factor Auth Enabled',
      defaultValue: false
    }),
    can_submit_cases: Field.checkbox({
      label: 'Can Submit Cases',
      defaultValue: true
    }),
    can_view_all_account_cases: Field.checkbox({
      label: 'View All Account Cases',
      description: 'View cases from entire account',
      defaultValue: false
    }),
    can_access_knowledge_base: Field.checkbox({
      label: 'Access Knowledge Base',
      defaultValue: true
    }),
    can_access_community: Field.checkbox({
      label: 'Access Community Forum',
      defaultValue: true
    }),
    can_download_resources: Field.checkbox({
      label: 'Download Resources',
      defaultValue: true
    }),
    can_comment_on_cases: Field.checkbox({
      label: 'Comment on Cases',
      defaultValue: true
    }),
    max_cases_per_month: Field.number({
      label: 'Max Cases Per Month',
      description: '0 = unlimited',
      min: 0,
      precision: 0
    }),
    language: Field.select({
      label: 'language',
      defaultValue: 'en',
      options: [
        {
          "label": "English",
          "value": "en"
        },
        {
          "label": "简体中文",
          "value": "zh-CN"
        },
        {
          "label": "繁體中文",
          "value": "zh-TW"
        },
        {
          "label": "Español",
          "value": "es"
        },
        {
          "label": "Français",
          "value": "fr"
        },
        {
          "label": "Deutsch",
          "value": "de"
        },
        {
          "label": "日本語",
          "value": "ja"
        },
        {
          "label": "한국어",
          "value": "ko"
        }
      ]
    }),
    time_zone: Field.select({
      label: 'Time Zone',
      defaultValue: 'Asia/Shanghai',
      options: [
        {
          "label": "UTC",
          "value": "UTC"
        },
        {
          "label": "America/New_York",
          "value": "America/New_York"
        },
        {
          "label": "America/Los_Angeles",
          "value": "America/Los_Angeles"
        },
        {
          "label": "Europe/London",
          "value": "Europe/London"
        },
        {
          "label": "Asia/Shanghai",
          "value": "Asia/Shanghai"
        },
        {
          "label": "Asia/Tokyo",
          "value": "Asia/Tokyo"
        },
        {
          "label": "Australia/Sydney",
          "value": "Australia/Sydney"
        }
      ]
    }),
    email_notifications: Field.checkbox({
      label: 'email Notifications',
      defaultValue: true
    }),
    sms_notifications: Field.checkbox({
      label: 'SMS Notifications',
      defaultValue: false
    }),
    notify_on_case_update: Field.checkbox({
      label: 'Notify on Case Update',
      defaultValue: true
    }),
    notify_on_case_resolved: Field.checkbox({
      label: 'Notify on Case Resolved',
      defaultValue: true
    }),
    digest_frequency: Field.select({
      label: 'email Digest Frequency',
      defaultValue: 'Weekly',
      options: [
        {
          "label": "Daily",
          "value": "Daily"
        },
        {
          "label": "Weekly",
          "value": "Weekly"
        },
        {
          "label": "Monthly",
          "value": "Monthly"
        },
        {
          "label": "Never",
          "value": "Never"
        }
      ]
    }),
    cases_submitted: Field.number({
      label: 'Cases Submitted',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    cases_this_month: Field.number({
      label: 'Cases This Month',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    articles_viewed: Field.number({
      label: 'Articles Viewed',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    forum_posts_created: Field.number({
      label: 'Forum Posts',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    resources_downloaded: Field.number({
      label: 'Resources Downloaded',
      defaultValue: 0,
      readonly: true,
      precision: 0
    }),
    average_satisfaction_score: Field.number({
      label: 'Avg Satisfaction Score',
      description: 'Average CSAT score (1-5)',
      readonly: true,
      precision: 2
    }),
    last_activity_date: Field.datetime({
      label: 'Last Activity',
      readonly: true
    }),
    registration_date: Field.datetime({
      label: 'Registration Date',
      defaultValue: 'NOW()',
      readonly: true
    }),
    activation_date: Field.datetime({
      label: 'Activation Date',
      readonly: true
    }),
    approved_by_id: Field.lookup('users', {
      label: 'Approved By',
      readonly: true
    }),
    approval_date: Field.datetime({
      label: 'Approval Date',
      readonly: true
    }),
    notes: Field.textarea({
      label: 'notes',
      maxLength: 2000
    })
  },

  enable: {
    searchEnabled: true,
    trackHistory: true
  },
});