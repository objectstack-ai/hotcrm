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
    is_active: Field.boolean({
      label: 'Active',
      defaultValue: true
    }),
    status: Field.select({
      label: 'status',
      required: true,
      defaultValue: 'active',
      options: [
        {
          "label": "✅ Active",
          "value": "active"
        },
        {
          "label": "⏸️ Suspended",
          "value": "suspended"
        },
        {
          "label": "🔒 Locked",
          "value": "locked"
        },
        {
          "label": "❌ Deactivated",
          "value": "deactivated"
        },
        {
          "label": "⏳ Pending Approval",
          "value": "pendingapproval"
        }
      ]
    }),
    user_role: Field.select({
      label: 'Portal Role',
      required: true,
      defaultValue: 'standard',
      options: [
        {
          "label": "👑 Admin",
          "value": "admin"
        },
        {
          "label": "👤 Standard",
          "value": "standard"
        },
        {
          "label": "👁️ Read Only",
          "value": "readonly"
        },
        {
          "label": "🎓 Limited",
          "value": "limited"
        }
      ]
    }),
    customer_tier: Field.select({
      label: 'Customer Tier',
      options: [
        {
          "label": "Free",
          "value": "free"
        },
        {
          "label": "Basic",
          "value": "basic"
        },
        {
          "label": "Professional",
          "value": "professional"
        },
        {
          "label": "Enterprise",
          "value": "enterprise"
        },
        {
          "label": "Premium",
          "value": "premium"
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
    must_change_password: Field.boolean({
      label: 'Must Change Password',
      defaultValue: false
    }),
    two_factor_enabled: Field.boolean({
      label: 'Two-Factor Auth Enabled',
      defaultValue: false
    }),
    can_submit_cases: Field.boolean({
      label: 'Can Submit Cases',
      defaultValue: true
    }),
    can_view_all_account_cases: Field.boolean({
      label: 'View All Account Cases',
      description: 'View cases from entire account',
      defaultValue: false
    }),
    can_access_knowledge_base: Field.boolean({
      label: 'Access Knowledge Base',
      defaultValue: true
    }),
    can_access_community: Field.boolean({
      label: 'Access Community Forum',
      defaultValue: true
    }),
    can_download_resources: Field.boolean({
      label: 'Download Resources',
      defaultValue: true
    }),
    can_comment_on_cases: Field.boolean({
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
          "value": "zh_cn"
        },
        {
          "label": "繁體中文",
          "value": "zh_tw"
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
      defaultValue: 'asia_shanghai',
      options: [
        {
          "label": "UTC",
          "value": "utc"
        },
        {
          "label": "America/New_York",
          "value": "america_new_york"
        },
        {
          "label": "America/Los_Angeles",
          "value": "america_los_angeles"
        },
        {
          "label": "Europe/London",
          "value": "europe_london"
        },
        {
          "label": "Asia/Shanghai",
          "value": "asia_shanghai"
        },
        {
          "label": "Asia/Tokyo",
          "value": "asia_tokyo"
        },
        {
          "label": "Australia/Sydney",
          "value": "australia_sydney"
        }
      ]
    }),
    email_notifications: Field.boolean({
      label: 'email Notifications',
      defaultValue: true
    }),
    sms_notifications: Field.boolean({
      label: 'SMS Notifications',
      defaultValue: false
    }),
    notify_on_case_update: Field.boolean({
      label: 'Notify on Case Update',
      defaultValue: true
    }),
    notify_on_case_resolved: Field.boolean({
      label: 'Notify on Case Resolved',
      defaultValue: true
    }),
    digest_frequency: Field.select({
      label: 'email Digest Frequency',
      defaultValue: 'weekly',
      options: [
        {
          "label": "Daily",
          "value": "daily"
        },
        {
          "label": "Weekly",
          "value": "weekly"
        },
        {
          "label": "Monthly",
          "value": "monthly"
        },
        {
          "label": "Never",
          "value": "never"
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
    searchable: true,
    trackHistory: true
  },
});