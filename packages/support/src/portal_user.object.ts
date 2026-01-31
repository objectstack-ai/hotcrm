
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
    Username: {
      type: 'text',
      label: 'Username',
      required: true,
      maxLength: 100,
      searchable: true
    },
    Email: {
      type: 'email',
      label: 'Email',
      required: true,
      searchable: true
    },
    FirstName: {
      type: 'text',
      label: 'First Name',
      required: true,
      maxLength: 100
    },
    LastName: {
      type: 'text',
      label: 'Last Name',
      required: true,
      maxLength: 100
    },
    FullName: {
      type: 'text',
      label: 'Full Name',
      maxLength: 200,
      readonly: true
    },
    // Contact & Account
    ContactId: {
      type: 'lookup',
      label: 'Contact',
      reference: 'Contact',
      required: true,
      description: 'Associated contact record'
    },
    AccountId: {
      type: 'lookup',
      label: 'Account',
      reference: 'Account',
      required: true,
      description: 'Associated account record'
    },
    // Access Control
    IsActive: {
      type: 'checkbox',
      label: 'Active',
      defaultValue: true
    },
    Status: {
      type: 'select',
      label: 'Status',
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
    UserRole: {
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
    CustomerTier: {
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
    LastLoginDate: {
      type: 'datetime',
      label: 'Last Login',
      readonly: true
    },
    LastLoginIP: {
      type: 'text',
      label: 'Last Login IP',
      maxLength: 45,
      readonly: true
    },
    LoginCount: {
      type: 'number',
      label: 'Login Count',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    FailedLoginAttempts: {
      type: 'number',
      label: 'Failed Login Attempts',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    PasswordLastChangedDate: {
      type: 'datetime',
      label: 'Password Last Changed',
      readonly: true
    },
    MustChangePassword: {
      type: 'checkbox',
      label: 'Must Change Password',
      defaultValue: false
    },
    TwoFactorEnabled: {
      type: 'checkbox',
      label: 'Two-Factor Auth Enabled',
      defaultValue: false
    },
    // Permissions
    CanSubmitCases: {
      type: 'checkbox',
      label: 'Can Submit Cases',
      defaultValue: true
    },
    CanViewAllAccountCases: {
      type: 'checkbox',
      label: 'View All Account Cases',
      defaultValue: false,
      description: 'View cases from entire account'
    },
    CanAccessKnowledgeBase: {
      type: 'checkbox',
      label: 'Access Knowledge Base',
      defaultValue: true
    },
    CanAccessCommunity: {
      type: 'checkbox',
      label: 'Access Community Forum',
      defaultValue: true
    },
    CanDownloadResources: {
      type: 'checkbox',
      label: 'Download Resources',
      defaultValue: true
    },
    CanCommentOnCases: {
      type: 'checkbox',
      label: 'Comment on Cases',
      defaultValue: true
    },
    MaxCasesPerMonth: {
      type: 'number',
      label: 'Max Cases Per Month',
      precision: 0,
      min: 0,
      description: '0 = unlimited'
    },
    // Preferences
    Language: {
      type: 'select',
      label: 'Language',
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
    TimeZone: {
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
    EmailNotifications: {
      type: 'checkbox',
      label: 'Email Notifications',
      defaultValue: true
    },
    SMSNotifications: {
      type: 'checkbox',
      label: 'SMS Notifications',
      defaultValue: false
    },
    NotifyOnCaseUpdate: {
      type: 'checkbox',
      label: 'Notify on Case Update',
      defaultValue: true
    },
    NotifyOnCaseResolved: {
      type: 'checkbox',
      label: 'Notify on Case Resolved',
      defaultValue: true
    },
    DigestFrequency: {
      type: 'select',
      label: 'Email Digest Frequency',
      defaultValue: 'Weekly',
      options: [
        { label: 'Daily', value: 'Daily' },
        { label: 'Weekly', value: 'Weekly' },
        { label: 'Monthly', value: 'Monthly' },
        { label: 'Never', value: 'Never' }
      ]
    },
    // Usage Statistics
    CasesSubmitted: {
      type: 'number',
      label: 'Cases Submitted',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    CasesThisMonth: {
      type: 'number',
      label: 'Cases This Month',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    ArticlesViewed: {
      type: 'number',
      label: 'Articles Viewed',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    ForumPostsCreated: {
      type: 'number',
      label: 'Forum Posts',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    ResourcesDownloaded: {
      type: 'number',
      label: 'Resources Downloaded',
      precision: 0,
      readonly: true,
      defaultValue: 0
    },
    AverageSatisfactionScore: {
      type: 'number',
      label: 'Avg Satisfaction Score',
      precision: 2,
      readonly: true,
      description: 'Average CSAT score (1-5)'
    },
    LastActivityDate: {
      type: 'datetime',
      label: 'Last Activity',
      readonly: true
    },
    // Registration
    RegistrationDate: {
      type: 'datetime',
      label: 'Registration Date',
      readonly: true,
      defaultValue: 'NOW()'
    },
    ActivationDate: {
      type: 'datetime',
      label: 'Activation Date',
      readonly: true
    },
    ApprovedById: {
      type: 'lookup',
      label: 'Approved By',
      reference: 'User',
      readonly: true
    },
    ApprovalDate: {
      type: 'datetime',
      label: 'Approval Date',
      readonly: true
    },
    // Notes
    Notes: {
      type: 'textarea',
      label: 'Notes',
      maxLength: 2000
    }
  },
  validationRules: [
    {
      name: 'UniqueUsername',
      errorMessage: 'Username must be unique',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM PortalUser WHERE Username = $Username AND Id != $Id))'
    },
    {
      name: 'UniqueEmail',
      errorMessage: 'Email must be unique',
      formula: 'AND(NOT(ISNEW()), EXISTS(SELECT Id FROM PortalUser WHERE Email = $Email AND Id != $Id))'
    },
    {
      name: 'ContactAccountMatch',
      errorMessage: 'Contact must belong to the selected Account',
      formula: 'AND(NOT(ISBLANK(ContactId)), NOT(ISBLANK(AccountId)))'
    }
  ],
  listViews: [
    {
      name: 'AllUsers',
      label: 'All Portal Users',
      filters: [],
      columns: ['Username', 'FullName', 'Email', 'AccountId', 'Status', 'LastLoginDate'],
      sort: [['CreatedDate', 'desc']]
    },
    {
      name: 'ActiveUsers',
      label: 'Active Users',
      filters: [
        ['IsActive', '=', true],
        ['Status', '=', 'Active']
      ],
      columns: ['Username', 'FullName', 'Email', 'AccountId', 'UserRole', 'LoginCount', 'LastLoginDate'],
      sort: [['LastLoginDate', 'desc']]
    },
    {
      name: 'PendingApproval',
      label: 'Pending Approval',
      filters: [
        ['Status', '=', 'PendingApproval']
      ],
      columns: ['Username', 'FullName', 'Email', 'AccountId', 'RegistrationDate'],
      sort: [['RegistrationDate', 'asc']]
    },
    {
      name: 'RecentlyActive',
      label: 'Recently Active',
      filters: [
        ['LastActivityDate', 'last_n_days', 7],
        ['IsActive', '=', true]
      ],
      columns: ['Username', 'FullName', 'LastActivityDate', 'CasesThisMonth', 'ArticlesViewed'],
      sort: [['LastActivityDate', 'desc']]
    },
    {
      name: 'HighUsage',
      label: 'High Usage',
      filters: [
        ['CasesThisMonth', '>', 5],
        ['IsActive', '=', true]
      ],
      columns: ['Username', 'FullName', 'AccountId', 'CasesThisMonth', 'MaxCasesPerMonth', 'AverageSatisfactionScore'],
      sort: [['CasesThisMonth', 'desc']]
    },
    {
      name: 'LockedAccounts',
      label: 'Locked Accounts',
      filters: [
        ['Status', 'in', ['Locked', 'Suspended']]
      ],
      columns: ['Username', 'FullName', 'Email', 'Status', 'FailedLoginAttempts', 'ModifiedDate'],
      sort: [['ModifiedDate', 'desc']]
    }
  ],
  pageLayout: {
    sections: [
      {
        label: 'User Information',
        columns: 2,
        fields: ['Username', 'Email', 'FirstName', 'LastName', 'FullName']
      },
      {
        label: 'Associated Records',
        columns: 2,
        fields: ['ContactId', 'AccountId']
      },
      {
        label: 'Access Control',
        columns: 2,
        fields: ['IsActive', 'Status', 'UserRole', 'CustomerTier']
      },
      {
        label: 'Authentication',
        columns: 3,
        fields: ['LastLoginDate', 'LastLoginIP', 'LoginCount', 'FailedLoginAttempts', 'PasswordLastChangedDate', 'MustChangePassword', 'TwoFactorEnabled']
      },
      {
        label: 'Permissions',
        columns: 3,
        fields: ['CanSubmitCases', 'CanViewAllAccountCases', 'CanAccessKnowledgeBase', 'CanAccessCommunity', 'CanDownloadResources', 'CanCommentOnCases', 'MaxCasesPerMonth']
      },
      {
        label: 'Preferences',
        columns: 2,
        fields: ['Language', 'TimeZone', 'EmailNotifications', 'SMSNotifications', 'NotifyOnCaseUpdate', 'NotifyOnCaseResolved', 'DigestFrequency']
      },
      {
        label: 'Usage Statistics',
        columns: 3,
        fields: ['CasesSubmitted', 'CasesThisMonth', 'ArticlesViewed', 'ForumPostsCreated', 'ResourcesDownloaded', 'AverageSatisfactionScore', 'LastActivityDate']
      },
      {
        label: 'Registration',
        columns: 2,
        fields: ['RegistrationDate', 'ActivationDate', 'ApprovedById', 'ApprovalDate']
      },
      {
        label: 'Additional Information',
        columns: 1,
        fields: ['Notes']
      }
    ]
  }
};

export default PortalUser;
