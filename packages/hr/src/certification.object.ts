
const Certification = {
  name: 'certification',
  label: '认证',
  labelPlural: '认证',
  icon: 'certificate',
  description: '员工专业认证和资质管理',
  enable: {
    searchable: true,
    trackHistory: true,
    activities: false,
    feeds: true,
    files: true
  },
  fields: {
    title: {
      type: 'text',
      label: '认证名称',
      required: true,
      searchable: true,
      maxLength: 255
    },
    employee_id: {
      type: 'lookup',
      label: '员工',
      reference: 'employee',
      required: true
    },
    certification_type: {
      type: 'select',
      label: '认证类型',
      options: [
        { label: '专业认证', value: 'Professional' },
        { label: '技术认证', value: 'Technical' },
        { label: '语言认证', value: 'Language' },
        { label: '管理认证', value: 'Management' },
        { label: '安全认证', value: 'Safety' },
        { label: '合规认证', value: 'Compliance' },
        { label: '其他', value: 'Other' }
      ]
    },
    issuing_organization: {
      type: 'text',
      label: '发证机构',
      required: true,
      maxLength: 255
    },
    certification_number: {
      type: 'text',
      label: '证书编号',
      maxLength: 100
    },
    issue_date: {
      type: 'date',
      label: '颁发日期',
      required: true
    },
    expiry_date: {
      type: 'date',
      label: '到期日期',
      description: '如果证书有效期限制'
    },
    is_active: {
      type: 'checkbox',
      label: '是否有效',
      defaultValue: true,
      description: '证书当前是否有效'
    },
    renewal_required: {
      type: 'checkbox',
      label: '需要续期',
      defaultValue: false
    },
    next_renewal_date: {
      type: 'date',
      label: '下次续期日期'
    },
    training_id: {
      type: 'lookup',
      label: '关联培训',
      reference: 'training',
      description: '如果通过培训获得'
    },
    score: {
      type: 'number',
      label: '考试成绩',
      precision: 2,
      description: '如适用，记录考试分数'
    },
    certificate_url: {
      type: 'url',
      label: '证书链接/扫描件'
    },
    verification_url: {
      type: 'url',
      label: '验证链接',
      description: '在线验证证书的链接'
    },
    cost: {
      type: 'currency',
      label: '认证费用',
      precision: 2
    },
    status: {
      type: 'select',
      label: '状态',
      defaultValue: 'Active',
      options: [
        { label: '有效', value: 'Active' },
        { label: '即将到期', value: 'Expiring Soon' },
        { label: '已过期', value: 'Expired' },
        { label: '已撤销', value: 'Revoked' }
      ]
    },
    description: {
      type: 'textarea',
      label: '认证描述',
      rows: 4,
      description: '认证的内容和价值'
    },
    notes: {
      type: 'textarea',
      label: '备注',
      rows: 3
    }
  },
  listViews: [
    {
      name: 'All',
      label: '所有认证',
      filters: [],
      columns: ['title', 'employee_id', 'certification_type', 'issuing_organization', 'issue_date', 'status']
    },
    {
      name: 'Active',
      label: '有效认证',
      filters: [['is_active', '=', true]],
      columns: ['title', 'employee_id', 'certification_type', 'issuing_organization', 'issue_date', 'expiry_date']
    },
    {
      name: 'ExpiringSoon',
      label: '即将到期',
      filters: [
        ['is_active', '=', true],
        ['expiry_date', 'next_90_days']
      ],
      columns: ['title', 'employee_id', 'issuing_organization', 'expiry_date', 'renewal_required'],
      sort: [['expiry_date', 'asc']]
    },
    {
      name: 'Expired',
      label: '已过期',
      filters: [
        ['is_active', '=', false],
        ['status', '=', 'Expired']
      ],
      columns: ['title', 'employee_id', 'issuing_organization', 'expiry_date', 'renewal_required']
    },
    {
      name: 'MyCertifications',
      label: '我的认证',
      filters: [['employee_id', '=', '$currentUser']],
      columns: ['title', 'certification_type', 'issuing_organization', 'issue_date', 'status', 'expiry_date']
    }
  ],
  validationRules: [
    {
      name: 'ValidExpiryDate',
      errorMessage: '到期日期必须在颁发日期之后',
      formula: 'AND(NOT(ISBLANK(expiry_date)), expiry_date <= issue_date)'
    }
  ],
  pageLayout: {
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['title', 'employee_id', 'certification_type', 'issuing_organization', 'certification_number']
      },
      {
        label: '日期信息',
        columns: 2,
        fields: ['issue_date', 'expiry_date', 'next_renewal_date']
      },
      {
        label: '状态',
        columns: 2,
        fields: ['is_active', 'status', 'renewal_required']
      },
      {
        label: '关联信息',
        columns: 2,
        fields: ['training_id', 'score', 'cost']
      },
      {
        label: '证书资料',
        columns: 2,
        fields: ['certificate_url', 'verification_url']
      },
      {
        label: '详细说明',
        columns: 1,
        fields: ['description', 'notes']
      }
    ]
  }
};

export default Certification;
