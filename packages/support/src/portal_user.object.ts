
const PortalUser = {
  name: 'portal_user',
  label: 'Portal User',
  labelPlural: 'Portal Users',
  icon: 'user-shield',
  description: 'Customer portal user access and preferences',
  enable: {
    searchable: true,
    trackHistory: true
  },
  fields: {
    // User Information
    username: {
      type: 'text',
      label: 'username',
      required: true,
      maxLength: 100,
      searchable: true
    },
    email: {
      type: 'email',
      label: 'email',
      required: true,
      searchable: true
    },
    first_name: {
      type: 'text',
      label: 'First Name',
      required: true,
      maxLength: 100
    },
    last_name: {
      type: 'text',
      label: 'Last Name',
      required: true,
      maxLength: 100
    },
    full_name: {
      type: 'text',
      label: 'Full Name',
      maxLength: 200,
      readonly: true
    },
    // Contact & Account
    contact_id: {
      type: 'lookup',
      label: 'Contact',
      reference: 'contact',
      required: true,
      description: 'Associated contact record'
    },
    account_id: {
      type: 'lookup',
      label: 'Account',
      reference: 'account',
      required: true,
      description: 'Associated account record'
    },
    // Access Control
    is_active: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    status: {
      type: 'select',
      label: 'status',
      required: true,
      defaultValue: 'Active',
      options: [
        { label: '✅ Active', value: 'Active' },
        { label: '⏸️ Suspended', value: 'Suspended' },
        { label: '🔒 Locked', value: 'Locked' },
        { label: '❌ Deactivated', value: 'Deactivated' },
        { label: '⏳ Pending Approval', value: 'PendingApproval' }
      ]
    },
    user_role: {
      type: 'select',
      label: 'Portal Role',
      required: true,
      defaultValue: 'Standard',
      options: [
        { label: '👑 Admin', value: 'Admin' },
        { label: '👤 Standard', value: 'Standard' },
        { label: '👁️ Read Only', value: 'ReadOnly' },
        { label: '🎓 Limited', value: 'Limited' }
      ]
    },
    customer_tier: {
      type: 'select',
      label: 'Customer Tier',
      options: [
        { label: 'Free', value: 'Free' },
        { label: 'Basic', value: 'Basic' },
        { label: 'Professional', value: 'Professional' },
        { label: 'Enterprise', value: 'Enterprise' },
        { label: 'Premium', value: 'Premium' }
      ]
    },
    // Authentication
    last_login_date: {
      type: 'datetime',
      label: 'Last Login',
      readonly: true
    },
    last_login_ip: {
      type: 'text',
      label: 'Last Login IP',
      maxLength: 45,
      readonly: true
    },
    login_count: {
      type: 'number',
      label: 'Login Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    failed_login_attempts: {
      type: 'number',
      label: 'Failed Login Attempts',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    password_last_changed_date: {
      type: 'datetime',
      label: 'Password Last Changed',
      readonly: true
    },
    must_change_password: {
      type: 'checkbox',
      label: 'Must Change Password',
      defaultValue: false
    },
    two_factor_enabled: {
      type: 'checkbox',
      label: 'Two-Factor Auth Enabled',
      defaultValue: false
    },
    // Permissions
    can_submit_cases: {
      type: 'checkbox',
      label: 'Can Submit Cases',
      defaultValue: true
    },
    can_view_all_account_cases: {
      type: 'checkbox',
      label: 'View All Account Cases',
      defaultValue: false,
      description: 'View cases from entire account'
    },
    can_access_knowledge_base: {
      type: 'checkbox',
      label: 'Access Knowledge Base',
      defaultValue: true
    },
    can_access_community: {
      type: 'checkbox',
      label: 'Access Community Forum',
      defaultValue: true
    },
    can_download_resources: {
      type: 'checkbox',
      label: 'Download Resources',
      defaultValue: true
    },
    can_comment_on_cases: {
      type: 'checkbox',
      label: 'Comment on Cases',
      defaultValue: true
    },
    max_cases_per_month: {
      type: 'number',
      label: 'Max Cases Per Month',
      precision: 0,
      min: 0,
      description: '0 = unlimited'
    },
    // Preferences
    language: {
      type: 'select',
      label: 'language',
      defaultValue: 'en',
      options: [
        { label: 'English', value: 'en' },
        { label: '简体中文', value: 'zh-CN' },
        { label: '繁體中文', value: 'zh-TW' },
        { label: 'Español', value: 'es' },
        { label: 'Français', value: 'fr' },
        { label: 'Deutsch', value: 'de' },
        { label: '日本語', value: 'ja' },
        { label: '한국어', value: 'ko' }
      ]
    },
    time_zone: {
      type: 'select',
      label: 'Time Zone',
      defaultValue: 'Asia/Shanghai',
      options: [
        { label: 'UTC', value: 'UTC' },
        { label: 'America/New_York', value: 'America/New_York' },
        { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
        { label: 'Europe/London', value: 'Europe/London' },
        { label: 'Asia/Shanghai', value: 'Asia/Shanghai' },
        { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
        { label: 'Australia/Sydney', value: 'Australia/Sydney' }
      ]
    },
    email_notifications: {
      type: 'checkbox',
      label: 'email Notifications',
      defaultValue: true
    },
    sms_notifications: {
      type: 'checkbox',
      label: 'SMS Notifications',
      defaultValue: false
    },
    notify_on_case_update: {
      type: 'checkbox',
      label: 'Notify on Case Update',
      defaultValue: true
    },
    notify_on_case_resolved: {
      type: 'checkbox',
      label: 'Notify on Case Resolved',
      defaultValue: true
    },
    digest_frequency: {
      type: 'select',
      label: 'email Digest Frequency',
      defaultValue: 'Weekly',
      options: [
        { label: 'Daily', value: 'Daily' },
        { label: 'Weekly', value: 'Weekly' },
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Never', value: 'Never' }
      ]
    },
    // Usage Statistics
    cases_submitted: {
      type: 'number',
      label: 'Cases Submitted',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    cases_this_month: {
      type: 'number',
      label: 'Cases This Month',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    articles_viewed: {
      type: 'number',
      label: 'Articles Viewed',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    forum_posts_created: {
      type: 'number',
      label: 'Forum Posts',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    resources_downloaded: {
      type: 'number',
      label: 'Resources Downloaded',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    average_satisfaction_score: {
      type: 'number',
      label: 'Avg Satisfaction Score',
      precision: 2,
      readonly: true,
      description: 'Average CSAT score (1-5)'
    },
    last_activity_date: {
      type: 'datetime',
      label: 'Last Activity',
      readonly: true
    },
    // Registration
    registration_date: {
      type: 'datetime',
      label: 'Registration Date',
      readonly: true,
      defaultValue: 'NOW()'
    },
    activation_date: {
      type: 'datetime',
      label: 'Activation Date',
      readonly: true
    },
    approved_by_id: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'users',
      readonly: true
    },
    approval_date: {
      type: 'datetime',
      label: 'Approval Date',
      readonly: true
    },
    // notes
    notes: {
      type: 'textarea',
      label: 'notes',
      maxLength: 2000
    }
  },
  validationRules: [
    {
      name: 'UniqueUsername',
      errorMessage: 'username must be unique',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM PortalUser WHERE username = $username AND Id != $Id))'
    },
    {
      name: 'UniqueEmail',
      errorMessage: 'email must be unique',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM PortalUser WHERE email = $email AND Id != $Id))'
    },
    {
      name: 'ContactAccountMatch',
      errorMessage: 'Contact must belong to the selected Account',
      formula: 'AND(NOT(ISBLANK(contact_id)), NOT(ISBLANK(account_id)))'
    }
  ],
  listViews: [
    {
      name: 'AllUsers',
      label: 'All Portal Users',
      filters: [],
      columns: ['username', 'full_name', 'email', 'account_id', 'status', 'last_login_date'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveUsers',
      label: 'Active Users',
      filters: [
        ['is_active', '=', true],
        ['status', '=', 'Active']
      ],
      columns: ['username', 'full_name', 'email', 'account_id', 'user_role', 'login_count', 'last_login_date'],
      sort: [['last_login_date', 'desc']]
    },
    {
      name: 'PendingApproval',
      label: 'Pending Approval',
      filters: [
        ['status', '=', 'PendingApproval']
      ],
      columns: ['username', 'full_name', 'email', 'account_id', 'registration_date'],
      sort: [['registration_date', 'asc']]
    },
    {
      name: 'RecentlyActive',
      label: 'Recently Active',
      filters: [
        ['last_activity_date', 'last_n_days', 7],
        ['is_active', '=', true]
      ],
      columns: ['username', 'full_name', 'last_activity_date', 'cases_this_month', 'articles_viewed'],
      sort: [['last_activity_date', 'desc']]
    },
    {
      name: 'HighUsage',
      label: 'High Usage',
      filters: [
        ['cases_this_month', '>', 5],
        ['is_active', '=', true]
      ],
      columns: ['username', 'full_name', 'account_id', 'cases_this_month', 'max_cases_per_month', 'average_satisfaction_score'],
      sort: [['cases_this_month', 'desc']]
    },
    {
      name: 'LockedAccounts',
      label: 'Locked Accounts',
      filters: [
        ['status', 'in', ['Locked', 'Suspended']]
      ],
      columns: ['username', 'full_name', 'email', 'status', 'failed_login_attempts', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'User Information',
        columns: 2,
        fields: ['username', 'email', 'first_name', 'last_name', 'full_name']
      },
      {
        label: 'Associated Records',
        columns: 2,
        fields: ['contact_id', 'account_id']
      },
      {
        label: 'Access Control',
        columns: 2,
        fields: ['is_active', 'status', 'user_role', 'customer_tier']
      },
      {
        label: 'Authentication',
        columns: 3,
        fields: ['last_login_date', 'last_login_ip', 'login_count', 'failed_login_attempts', 'password_last_changed_date', 'must_change_password', 'two_factor_enabled']
      },
      {
        label: 'Permissions',
        columns: 3,
        fields: ['can_submit_cases', 'can_view_all_account_cases', 'can_access_knowledge_base', 'can_access_community', 'can_download_resources', 'can_comment_on_cases', 'max_cases_per_month']
      },
      {
        label: 'Preferences',
        columns: 2,
        fields: ['language', 'time_zone', 'email_notifications', 'sms_notifications', 'notify_on_case_update', 'notify_on_case_resolved', 'digest_frequency']
      },
      {
        label: 'Usage Statistics',
        columns: 3,
        fields: ['cases_submitted', 'cases_this_month', 'articles_viewed', 'forum_posts_created', 'resources_downloaded', 'average_satisfaction_score', 'last_activity_date']
      },
      {
        label: 'Registration',
        columns: 2,
        fields: ['registration_date', 'activation_date', 'approved_by_id', 'approval_date']
      },
      {
        label: 'Additional Information',
        columns: 1,
        fields: ['notes']
      }
    ]
  }
};

export default PortalUser;
