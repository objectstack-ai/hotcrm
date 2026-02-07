# @objectstack/spec v1.1.0 元数据示例大全
# @objectstack/spec v1.1.0 Comprehensive Metadata Examples

---

## 目录 | Table of Contents

1. [数据元数据](#1-数据元数据--data-metadata)
2. [UI元数据](#2-ui元数据--ui-metadata)
3. [自动化元数据](#3-自动化元数据--automation-metadata)
4. [AI元数据](#4-ai元数据--ai-metadata)
5. [集成元数据](#5-集成元数据--integration-metadata)
6. [高级特性](#6-高级特性--advanced-features)

---

## 1. 数据元数据 | Data Metadata

### 1.1 基础对象定义 | Basic Object Definition

```typescript
// packages/crm/src/account.object.ts
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Account = ObjectSchema.create({
  name: 'account',
  label: '客户',
  pluralLabel: '客户',
  icon: 'building',
  description: '企业客户和组织管理',

  fields: {
    // 文本字段 | Text Fields
    name: Field.text({
      label: '客户名称',
      required: true,
      unique: true,
      maxLength: 255,
      searchable: true
    }),
    
    // 选择字段 | Select Fields
    type: Field.select({
      label: '客户类型',
      options: [
        { label: '潜在客户', value: 'Prospect' },
        { label: '现有客户', value: 'Customer' },
        { label: '合作伙伴', value: 'Partner' }
      ],
      defaultValue: 'Prospect'
    }),
    
    // 数字字段 | Number Fields
    annual_revenue: Field.currency({
      label: '年收入',
      precision: 2,
      min: 0
    }),
    
    // 关系字段 | Lookup Fields
    parent_account: Field.lookup({
      label: '父级客户',
      reference_to: 'account',
      cascade_delete: false
    }),
    
    // 日期字段 | Date Fields
    created_date: Field.datetime({
      label: '创建日期',
      readonly: true,
      defaultValue: 'NOW()'
    })
  },
  
  // 功能开关 | Enable Features
  enable: {
    searchable: true,
    trackHistory: true,
    feeds: true,
    files: true,
    apiEnabled: true
  }
});
```

### 1.2 所有字段类型示例 | All Field Types Example

```typescript
// packages/examples/src/all_field_types.object.ts
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const FieldTypeShowcase = ObjectSchema.create({
  name: 'field_type_showcase',
  label: 'Field Type Showcase',
  
  fields: {
    // 文本类型 | Text Types
    text_field: Field.text({ label: 'Text Field', maxLength: 255 }),
    textarea_field: Field.textarea({ label: 'Textarea', maxLength: 5000 }),
    richtext_field: Field.richtext({ label: 'Rich Text' }),
    
    // 数字类型 | Numeric Types
    number_field: Field.number({ label: 'Number', precision: 2 }),
    currency_field: Field.currency({ label: 'Currency', precision: 2 }),
    percent_field: Field.percent({ label: 'Percent', precision: 1 }),
    
    // 日期时间类型 | Date/Time Types
    date_field: Field.date({ label: 'Date' }),
    datetime_field: Field.datetime({ label: 'DateTime' }),
    
    // 选择类型 | Selection Types
    select_field: Field.select({
      label: 'Select',
      options: [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' }
      ]
    }),
    multiselect_field: Field.multiselect({
      label: 'Multi-Select',
      options: [
        { label: 'Tag 1', value: 'tag1' },
        { label: 'Tag 2', value: 'tag2' }
      ]
    }),
    
    // 关系类型 | Relationship Types
    lookup_field: Field.lookup({
      label: 'Lookup',
      reference_to: 'account'
    }),
    master_detail_field: Field.masterDetail({
      label: 'Master-Detail',
      reference_to: 'account',
      cascade_delete: true
    }),
    
    // 通讯类型 | Communication Types
    email_field: Field.email({ label: 'Email' }),
    phone_field: Field.phone({ label: 'Phone' }),
    url_field: Field.url({ label: 'URL' }),
    
    // 自动生成类型 | Auto-Generated Types
    autonumber_field: Field.autonumber({
      label: 'Auto Number',
      format: 'SHO-{YYYY}-{000000}'
    }),
    
    // 计算类型 | Computed Types
    formula_field: Field.formula({
      label: 'Formula',
      formula: 'quantity * unit_price',
      returnType: 'currency'
    }),
    summary_field: Field.summary({
      label: 'Summary',
      summarizedObject: 'opportunity',
      summaryType: 'sum',
      field: 'amount'
    }),
    
    // 特殊类型 | Special Types
    boolean_field: Field.boolean({ label: 'Boolean' }),
    geolocation_field: Field.geolocation({ label: 'Location' }),
    encrypted_field: Field.encrypted({ label: 'Encrypted Data' }),
    json_field: Field.json({ label: 'JSON Data' })
  }
});
```

### 1.3 复杂关系示例 | Complex Relationships Example

```typescript
// packages/crm/src/opportunity.object.ts
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const Opportunity = ObjectSchema.create({
  name: 'opportunity',
  label: '商机',
  
  fields: {
    name: Field.text({ label: '商机名称', required: true }),
    
    // 主从关系 | Master-Detail Relationship
    account: Field.masterDetail({
      label: '客户',
      reference_to: 'account',
      cascade_delete: true,  // 删除客户时删除商机
      required: true
    }),
    
    // 查找关系 | Lookup Relationship
    primary_contact: Field.lookup({
      label: '主要联系人',
      reference_to: 'contact',
      cascade_delete: false
    }),
    
    // 汇总字段 (统计子记录) | Rollup Summary Field
    total_quote_amount: Field.summary({
      label: '报价总额',
      summarizedObject: 'quote',
      summaryType: 'sum',
      field: 'total_amount',
      filter: [['status', '=', 'Approved']]
    }),
    
    // 公式字段 | Formula Field
    days_to_close: Field.formula({
      label: '预计成交天数',
      formula: 'close_date - TODAY()',
      returnType: 'number'
    }),
    
    // 分层查找 (跨对象引用) | Cross-Object Reference
    account_owner: Field.formula({
      label: '客户负责人',
      formula: 'account.owner',
      returnType: 'lookup',
      reference_to: 'user'
    })
  }
});
```

---

## 2. UI元数据 | UI Metadata

### 2.1 页面布局 | Page Layout

```typescript
// packages/crm/src/account.page.ts
import { PageSchema } from '@objectstack/spec/ui';

export const AccountPage = PageSchema.create({
  name: 'account_detail',
  object: 'account',
  type: 'record',
  label: 'Account Detail Page',
  
  layout: {
    type: 'tabs',  // 或 'accordion', 'wizard'
    sections: [
      // 第一个标签页
      {
        label: 'Account Information',
        columns: 2,  // 双列布局
        fields: [
          'name',
          'account_number',
          'type',
          'industry',
          'phone',
          'website',
          'annual_revenue',
          'employees'
        ]
      },
      
      // 地址信息
      {
        label: 'Address',
        columns: 2,
        fields: [
          'billing_street',
          'billing_city',
          'billing_state',
          'billing_postal_code',
          'shipping_street',
          'shipping_city',
          'shipping_state',
          'shipping_postal_code'
        ]
      },
      
      // 相关列表 (子记录)
      {
        label: 'Opportunities',
        type: 'related_list',
        object: 'opportunity',
        columns: ['name', 'stage', 'amount', 'close_date'],
        filters: [['stage', '!=', 'Closed Lost']],
        sort: [{ field: 'close_date', direction: 'asc' }],
        actions: ['new', 'edit', 'delete']
      },
      
      {
        label: 'Contacts',
        type: 'related_list',
        object: 'contact',
        columns: ['name', 'title', 'email', 'phone'],
        actions: ['new', 'edit']
      },
      
      // 自定义组件
      {
        label: 'AI Insights',
        type: 'component',
        component: 'AccountAIInsights',
        props: {
          showHealthScore: true,
          showChurnRisk: true
        }
      }
    ]
  },
  
  // 页面操作按钮
  actions: [
    {
      name: 'edit',
      label: 'Edit',
      type: 'standard'
    },
    {
      name: 'delete',
      label: 'Delete',
      type: 'standard'
    },
    {
      name: 'clone',
      label: 'Clone',
      type: 'custom',
      handler: 'cloneAccount'
    },
    {
      name: 'ai_analyze',
      label: 'AI Analyze',
      type: 'custom',
      handler: 'analyzeWithAI',
      icon: 'sparkles'
    }
  ]
});
```

### 2.2 列表视图 | List View

```typescript
// packages/crm/src/account.view.ts
import { ListView } from '@objectstack/spec/ui';

export const AccountListViews = {
  // 所有客户
  allAccounts: ListView.create({
    name: 'all_accounts',
    label: 'All Accounts',
    object: 'account',
    
    columns: [
      { 
        field: 'name', 
        width: 250,
        sortable: true,
        link: true  // 可点击链接
      },
      { 
        field: 'type', 
        width: 120,
        sortable: true
      },
      { 
        field: 'industry', 
        width: 150,
        sortable: true
      },
      { 
        field: 'annual_revenue', 
        width: 150,
        sortable: true,
        align: 'right'
      },
      { 
        field: 'owner', 
        width: 150
      },
      { 
        field: 'created_date', 
        width: 150,
        sortable: true,
        format: 'YYYY-MM-DD'
      }
    ],
    
    // 默认排序
    sort: [
      { field: 'name', direction: 'asc' }
    ],
    
    // 批量操作
    bulkActions: ['delete', 'update_owner', 'export'],
    
    // 行内编辑
    inlineEdit: true,
    
    // 分页
    pagination: {
      pageSize: 25,
      options: [10, 25, 50, 100]
    }
  }),
  
  // 大客户视图
  enterpriseAccounts: ListView.create({
    name: 'enterprise_accounts',
    label: 'Enterprise Accounts',
    object: 'account',
    
    filters: [
      { field: 'annual_revenue', operator: '>', value: 10000000 },
      { field: 'type', operator: '=', value: 'Customer' }
    ],
    
    columns: [
      { field: 'name', width: 250 },
      { field: 'annual_revenue', width: 150 },
      { field: 'employees', width: 100 },
      { field: 'industry', width: 150 }
    ],
    
    sort: [
      { field: 'annual_revenue', direction: 'desc' }
    ]
  }),
  
  // 我的客户
  myAccounts: ListView.create({
    name: 'my_accounts',
    label: 'My Accounts',
    object: 'account',
    
    filters: [
      { field: 'owner', operator: '=', value: '${currentUser.id}' }
    ],
    
    columns: [
      { field: 'name', width: 250 },
      { field: 'type', width: 120 },
      { field: 'last_activity_date', width: 150 }
    ]
  })
};
```

### 2.3 仪表板 | Dashboard

```typescript
// packages/crm/src/sales.dashboard.ts
import { Dashboard } from '@objectstack/spec/ui';

export const SalesDashboard = Dashboard.create({
  name: 'sales_overview',
  label: 'Sales Dashboard',
  description: 'Overview of sales performance',
  
  layout: {
    type: 'grid',
    columns: 12,  // 12列网格系统
    gap: 4
  },
  
  widgets: [
    // KPI指标卡片
    {
      id: 'total_revenue',
      type: 'metric',
      title: 'Total Revenue',
      position: { row: 1, col: 1, width: 3, height: 2 },
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'THIS_YEAR']
        ],
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      format: {
        type: 'currency',
        prefix: '$',
        decimals: 0
      },
      trend: {
        comparison: 'LAST_YEAR',
        showPercentage: true
      }
    },
    
    {
      id: 'win_rate',
      type: 'metric',
      title: 'Win Rate',
      position: { row: 1, col: 4, width: 3, height: 2 },
      dataSource: {
        formula: 'COUNT(stage = "Closed Won") / COUNT(stage IN ["Closed Won", "Closed Lost"]) * 100'
      },
      format: {
        type: 'percent',
        decimals: 1
      }
    },
    
    // 漏斗图
    {
      id: 'pipeline_funnel',
      type: 'chart',
      title: 'Sales Pipeline',
      position: { row: 1, col: 7, width: 6, height: 4 },
      chartType: 'funnel',
      dataSource: {
        object: 'opportunity',
        filters: [['stage', '!=', 'Closed Lost']],
        groupBy: 'stage',
        aggregate: {
          field: 'amount',
          function: 'sum'
        },
        orderBy: [
          { field: 'stage_order', direction: 'asc' }
        ]
      },
      options: {
        showValues: true,
        showPercentage: true
      }
    },
    
    // 柱状图
    {
      id: 'revenue_by_month',
      type: 'chart',
      title: 'Revenue by Month',
      position: { row: 3, col: 1, width: 6, height: 4 },
      chartType: 'bar',
      dataSource: {
        object: 'opportunity',
        filters: [
          ['stage', '=', 'Closed Won'],
          ['close_date', '>=', 'THIS_YEAR']
        ],
        groupBy: {
          field: 'close_date',
          interval: 'month'
        },
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      options: {
        xAxis: { label: 'Month' },
        yAxis: { label: 'Revenue' },
        colors: ['#3b82f6']
      }
    },
    
    // 饼图
    {
      id: 'revenue_by_industry',
      type: 'chart',
      title: 'Revenue by Industry',
      position: { row: 3, col: 7, width: 6, height: 4 },
      chartType: 'pie',
      dataSource: {
        object: 'opportunity',
        filters: [['stage', '=', 'Closed Won']],
        groupBy: 'account.industry',
        aggregate: {
          field: 'amount',
          function: 'sum'
        }
      },
      options: {
        showLegend: true,
        showPercentages: true
      }
    },
    
    // 数据表格
    {
      id: 'top_deals',
      type: 'table',
      title: 'Top 10 Deals',
      position: { row: 7, col: 1, width: 12, height: 4 },
      dataSource: {
        object: 'opportunity',
        filters: [['stage', '!=', 'Closed Lost']],
        fields: ['name', 'account.name', 'amount', 'stage', 'close_date'],
        orderBy: [
          { field: 'amount', direction: 'desc' }
        ],
        limit: 10
      },
      columns: [
        { field: 'name', label: 'Opportunity', width: 250 },
        { field: 'account.name', label: 'Account', width: 200 },
        { field: 'amount', label: 'Amount', width: 150, align: 'right' },
        { field: 'stage', label: 'Stage', width: 150 },
        { field: 'close_date', label: 'Close Date', width: 150 }
      ]
    }
  ],
  
  // 刷新配置
  refresh: {
    enabled: true,
    interval: 300  // 5分钟
  },
  
  // 过滤器
  filters: [
    {
      field: 'owner',
      label: 'Owner',
      type: 'lookup',
      defaultValue: '${currentUser.id}'
    },
    {
      field: 'date_range',
      label: 'Date Range',
      type: 'daterange',
      defaultValue: 'THIS_QUARTER'
    }
  ]
});
```

---

## 3. 自动化元数据 | Automation Metadata

### 3.1 工作流规则 | Workflow Rules

```typescript
// packages/crm/src/lead_assignment.workflow.ts
import { WorkflowRule } from '@objectstack/spec/automation';

export const LeadAutoAssignment = WorkflowRule.create({
  name: 'lead_auto_assignment',
  label: 'Auto Assign Leads',
  object: 'lead',
  
  // 触发条件
  triggerType: 'onCreate',  // 或 'onUpdate', 'onDelete'
  
  // 评估条件
  condition: 'status = "New" AND owner = NULL',
  
  // 执行动作
  actions: [
    // 字段更新
    {
      type: 'fieldUpdate',
      field: 'owner_id',
      formula: 'getNextAvailableRep(territory, industry)'
    },
    
    // 发送邮件通知
    {
      type: 'emailAlert',
      template: 'new_lead_assigned',
      recipients: ['owner_id'],
      cc: ['sales_manager@company.com']
    },
    
    // 创建任务
    {
      type: 'taskCreation',
      subject: 'Follow up with new lead: ${name}',
      assignee: '${owner_id}',
      dueDate: 'TODAY() + 1',
      priority: 'High'
    },
    
    // 调用HTTP接口
    {
      type: 'httpCall',
      method: 'POST',
      url: 'https://api.slack.com/webhooks/...',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        text: 'New lead assigned: ${name} to ${owner.name}'
      }
    }
  ],
  
  // 执行时机
  executionOrder: 1,  // 多个规则的执行顺序
  
  // 是否启用
  active: true
});
```

### 3.2 审批流程 | Approval Process

```typescript
// packages/products/src/quote_approval.workflow.ts
import { ApprovalProcess } from '@objectstack/spec/automation';

export const QuoteDiscountApproval = ApprovalProcess.create({
  name: 'quote_discount_approval',
  label: 'Quote Discount Approval',
  object: 'quote',
  
  // 触发条件
  triggerType: 'onUpdate',
  condition: 'discount_percent > 10 AND status = "Draft"',
  
  // 初始提交动作
  initialSubmissionActions: [
    {
      type: 'fieldUpdate',
      field: 'approval_status',
      value: 'Pending'
    },
    {
      type: 'emailAlert',
      template: 'approval_request_submitted',
      recipients: ['${submitter}']
    }
  ],
  
  // 审批步骤
  steps: [
    // 第一级审批: 销售经理
    {
      stepNumber: 1,
      name: 'sales_manager_approval',
      approverType: 'user',  // 或 'role', 'queue'
      approver: '${owner.manager}',
      
      // 跳过条件
      skipCondition: 'discount_percent <= 15',
      
      // 批准时动作
      approvalActions: [
        {
          type: 'fieldUpdate',
          field: 'approval_status',
          value: 'Manager Approved'
        }
      ],
      
      // 拒绝时动作
      rejectionActions: [
        {
          type: 'fieldUpdate',
          field: 'approval_status',
          value: 'Rejected'
        },
        {
          type: 'emailAlert',
          template: 'approval_rejected',
          recipients: ['${owner}']
        }
      ],
      
      // 退回时动作
      recallActions: [
        {
          type: 'fieldUpdate',
          field: 'approval_status',
          value: 'Draft'
        }
      ]
    },
    
    // 第二级审批: 销售总监 (大折扣)
    {
      stepNumber: 2,
      name: 'sales_director_approval',
      approverType: 'role',
      approver: 'sales_director',
      
      // 只有折扣>20%才需要
      skipCondition: 'discount_percent <= 20',
      
      approvalActions: [
        {
          type: 'fieldUpdate',
          field: 'approval_status',
          value: 'Director Approved'
        },
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Approved'
        }
      ],
      
      rejectionActions: [
        {
          type: 'fieldUpdate',
          field: 'approval_status',
          value: 'Rejected'
        }
      ]
    }
  ],
  
  // 最终批准动作
  finalApprovalActions: [
    {
      type: 'emailAlert',
      template: 'quote_approved',
      recipients: ['${owner}', '${account.owner}']
    },
    {
      type: 'pushNotification',
      message: 'Your quote has been approved!'
    }
  ],
  
  // 最终拒绝动作
  finalRejectionActions: [
    {
      type: 'emailAlert',
      template: 'quote_rejected',
      recipients: ['${owner}']
    }
  ]
});
```

### 3.3 状态机 | State Machine

```typescript
// packages/support/src/case.statemachine.ts
import { StateMachine } from '@objectstack/spec/automation';

export const CaseLifecycle = StateMachine.create({
  name: 'case_lifecycle',
  label: 'Case Lifecycle State Machine',
  object: 'case',
  
  // 初始状态
  initial: 'new',
  
  // 状态定义
  states: [
    {
      name: 'new',
      label: 'New',
      
      // 进入状态时的动作
      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'New'
        },
        {
          type: 'taskCreation',
          subject: 'Review new case: ${case_number}',
          assignee: '${queue.default_owner}'
        }
      ],
      
      // 可能的转换
      transitions: [
        {
          to: 'assigned',
          event: 'assign',
          guard: 'owner != NULL',  // 守卫条件
          actions: [
            {
              type: 'emailAlert',
              template: 'case_assigned',
              recipients: ['${owner}']
            }
          ]
        },
        {
          to: 'closed',
          event: 'auto_close',
          guard: 'priority = "Low" AND subject CONTAINS "spam"'
        }
      ]
    },
    
    {
      name: 'assigned',
      label: 'Assigned',
      
      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'In Progress'
        }
      ],
      
      transitions: [
        {
          to: 'waiting_customer',
          event: 'request_info',
          actions: [
            {
              type: 'emailAlert',
              template: 'info_requested',
              recipients: ['${contact.email}']
            }
          ]
        },
        {
          to: 'escalated',
          event: 'escalate',
          guard: 'sla_violation = true OR priority = "Critical"'
        },
        {
          to: 'resolved',
          event: 'resolve'
        }
      ]
    },
    
    {
      name: 'waiting_customer',
      label: 'Waiting on Customer',
      
      // 自动超时转换
      timeout: {
        duration: 72,  // 小时
        unit: 'hours',
        event: 'timeout',
        to: 'auto_closed'
      },
      
      transitions: [
        {
          to: 'assigned',
          event: 'customer_responded'
        }
      ]
    },
    
    {
      name: 'escalated',
      label: 'Escalated',
      
      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'escalated_date',
          value: 'NOW()'
        },
        {
          type: 'emailAlert',
          template: 'case_escalated',
          recipients: ['${owner.manager}', 'support_manager@company.com']
        }
      ],
      
      transitions: [
        {
          to: 'assigned',
          event: 'de_escalate'
        },
        {
          to: 'resolved',
          event: 'resolve'
        }
      ]
    },
    
    {
      name: 'resolved',
      label: 'Resolved',
      
      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'resolved_date',
          value: 'NOW()'
        },
        {
          type: 'emailAlert',
          template: 'case_resolved',
          recipients: ['${contact.email}']
        }
      ],
      
      // 等待客户确认
      timeout: {
        duration: 24,
        unit: 'hours',
        event: 'auto_close',
        to: 'closed'
      },
      
      transitions: [
        {
          to: 'closed',
          event: 'close'
        },
        {
          to: 'assigned',
          event: 'reopen',
          guard: 'customer_satisfied = false'
        }
      ]
    },
    
    {
      name: 'closed',
      label: 'Closed',
      
      // 终态标记
      type: 'final',
      
      onEntry: [
        {
          type: 'fieldUpdate',
          field: 'closed_date',
          value: 'NOW()'
        },
        {
          type: 'fieldUpdate',
          field: 'status',
          value: 'Closed'
        }
      ]
    }
  ],
  
  // 全局守卫
  globalGuards: {
    hasOwner: 'owner != NULL',
    isNotClosed: 'status != "Closed"'
  }
});
```

---

## 4. AI元数据 | AI Metadata

### 4.1 AI代理定义 | AI Agent Definition

```typescript
// packages/crm/src/sales_assistant.agent.ts
import { Agent } from '@objectstack/spec/ai';

export const SalesAssistant = Agent.create({
  name: 'sales_assistant',
  role: 'Sales AI Assistant',
  description: 'Intelligent sales assistant to help reps with lead qualification, opportunity management, and deal intelligence',
  
  // 系统提示词
  systemPrompt: `You are an expert sales assistant with deep knowledge of CRM and sales processes.
Your goal is to help sales representatives:
1. Qualify leads efficiently
2. Manage opportunities effectively
3. Close deals faster

Always provide actionable insights backed by data.
Be concise and professional in your responses.`,
  
  // 可用工具
  tools: [
    {
      name: 'scoreLeads',
      description: 'Score leads based on fit, intent, and engagement',
      action: 'lead_scoring',
      parameters: {
        lead_id: { type: 'string', required: true },
        factors: { 
          type: 'array',
          items: ['company_size', 'industry', 'engagement', 'budget']
        }
      }
    },
    {
      name: 'suggestNextSteps',
      description: 'Suggest next best actions for an opportunity',
      action: 'opportunity_next_steps',
      parameters: {
        opportunity_id: { type: 'string', required: true }
      }
    },
    {
      name: 'findSimilarDeals',
      description: 'Find similar won deals for insights',
      action: 'deal_intelligence',
      parameters: {
        opportunity_id: { type: 'string', required: true },
        similarity_factors: { 
          type: 'array',
          items: ['industry', 'deal_size', 'region']
        }
      }
    },
    {
      name: 'generateEmailTemplate',
      description: 'Generate personalized email templates',
      action: 'email_generation',
      parameters: {
        context: { type: 'string', required: true },
        tone: { type: 'string', enum: ['professional', 'friendly', 'urgent'] }
      }
    }
  ],
  
  // 模型配置
  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000
  },
  
  // 记忆配置
  memory: {
    type: 'conversational',
    maxMessages: 10,
    summaryThreshold: 8
  },
  
  // 安全设置
  safety: {
    enableContentFilter: true,
    allowedDomains: ['sales', 'crm', 'customer_data'],
    restrictedActions: ['delete_account', 'transfer_funds']
  }
});
```

### 4.2 RAG管道配置 | RAG Pipeline Configuration

```typescript
// packages/support/src/knowledge_rag.rag.ts
import { RAGPipelineConfig } from '@objectstack/spec/ai';

export const KnowledgeBaseRAG = RAGPipelineConfig.create({
  name: 'knowledge_base_rag',
  description: 'RAG pipeline for intelligent knowledge base search',
  
  // 向量化模型
  embeddingModel: {
    provider: 'openai',
    model: 'text-embedding-ada-002',
    dimensions: 1536
  },
  
  // 向量存储
  vectorStore: {
    provider: 'pinecone',  // 或 'weaviate', 'qdrant', 'chroma'
    config: {
      index: 'hotcrm-knowledge',
      namespace: 'articles',
      metric: 'cosine'
    }
  },
  
  // 文档加载器
  documentLoader: {
    source: {
      type: 'object',
      object: 'knowledge_article',
      fields: ['title', 'content', 'summary'],
      filters: [
        ['status', '=', 'Published'],
        ['visibility', 'IN', ['Public', 'Internal']]
      ]
    },
    
    // 文档处理
    preprocessing: [
      {
        type: 'html_to_text',
        removeImages: true
      },
      {
        type: 'normalize_whitespace'
      }
    ]
  },
  
  // 分块策略
  chunkingStrategy: {
    type: 'recursive',  // 或 'fixed', 'semantic'
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ']
  },
  
  // 检索策略
  retrievalStrategy: {
    type: 'hybrid',  // 向量搜索 + 关键词
    vectorSearch: {
      topK: 5,
      scoreThreshold: 0.7
    },
    keywordSearch: {
      enabled: true,
      algorithm: 'BM25'
    },
    reranking: {
      enabled: true,
      model: 'cohere-rerank-v2',
      topN: 3
    }
  },
  
  // 生成配置
  generation: {
    model: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.3
    },
    promptTemplate: `Based on the following knowledge base articles, answer the user's question.
If the answer is not found in the provided context, say "I don't have enough information to answer that."

Context:
{context}

Question: {question}

Answer:`,
    maxContextLength: 4000
  },
  
  // 元数据过滤
  metadataFilters: [
    {
      field: 'category',
      operator: 'IN',
      values: ['Technical', 'FAQ', 'Troubleshooting']
    },
    {
      field: 'updated_date',
      operator: '>=',
      value: 'LAST_6_MONTHS'
    }
  ]
});
```

### 4.3 预测模型配置 | Predictive Model Configuration

```typescript
// packages/crm/src/churn_prediction.model.ts
import { PredictiveModel } from '@objectstack/spec/ai';

export const ChurnPredictionModel = PredictiveModel.create({
  name: 'account_churn_prediction',
  description: 'Predict customer churn risk',
  
  // 模型类型
  type: 'classification',  // 或 'regression', 'clustering'
  
  // 训练配置
  training: {
    algorithm: 'random_forest',  // 或 'xgboost', 'neural_network'
    
    // 特征工程
    features: [
      {
        name: 'account_age_days',
        type: 'numeric',
        source: 'DAYS_BETWEEN(created_date, TODAY())'
      },
      {
        name: 'total_revenue',
        type: 'numeric',
        source: 'SUM(opportunities.amount WHERE stage = "Closed Won")'
      },
      {
        name: 'activity_count_30d',
        type: 'numeric',
        source: 'COUNT(activities WHERE created_date >= LAST_30_DAYS)'
      },
      {
        name: 'support_tickets_count',
        type: 'numeric',
        source: 'COUNT(cases)'
      },
      {
        name: 'industry',
        type: 'categorical',
        source: 'industry',
        encoding: 'one_hot'
      },
      {
        name: 'has_recent_complaint',
        type: 'boolean',
        source: 'EXISTS(cases WHERE priority = "High" AND created_date >= LAST_30_DAYS)'
      }
    ],
    
    // 目标变量
    target: {
      name: 'churned',
      type: 'binary',
      positiveClass: true,
      definition: 'last_activity_date < LAST_90_DAYS AND status = "Inactive"'
    },
    
    // 超参数
    hyperparameters: {
      n_estimators: 100,
      max_depth: 10,
      min_samples_split: 5,
      class_weight: 'balanced'
    },
    
    // 训练数据
    dataSource: {
      object: 'account',
      filters: [
        ['type', '=', 'Customer'],
        ['created_date', '<', 'LAST_YEAR']
      ],
      splitRatio: {
        train: 0.7,
        validation: 0.15,
        test: 0.15
      }
    }
  },
  
  // 评估指标
  evaluation: {
    metrics: ['accuracy', 'precision', 'recall', 'f1_score', 'auc_roc'],
    thresholds: {
      min_accuracy: 0.80,
      min_auc_roc: 0.85
    }
  },
  
  // 模型服务
  deployment: {
    endpoint: '/api/ml/predict/churn',
    batchPrediction: true,
    realTimePrediction: true,
    caching: {
      enabled: true,
      ttl: 3600  // 1 hour
    }
  },
  
  // 模型监控
  monitoring: {
    trackDrift: true,
    driftThreshold: 0.05,
    retrainingSchedule: 'monthly',
    alertOnPerformanceDrop: true
  }
});
```

---

## 5. 集成元数据 | Integration Metadata

### 5.1 Webhook定义 | Webhook Definition

```typescript
// packages/crm/src/opportunity_webhooks.webhook.ts
import { Webhook } from '@objectstack/spec/automation';

export const OpportunityWebhooks = {
  // 商机赢单通知
  dealWon: Webhook.create({
    name: 'deal_won_notification',
    label: 'Deal Won Notification',
    object: 'opportunity',
    
    // 触发事件
    event: 'onUpdate',
    condition: 'stage = "Closed Won" AND ISCHANGED(stage)',
    
    // Webhook配置
    url: 'https://api.company.com/webhooks/deal-won',
    method: 'POST',
    
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': '${env.WEBHOOK_API_KEY}',
      'X-Signature': '${HMAC_SHA256(payload, env.WEBHOOK_SECRET)}'
    },
    
    // 请求体
    payload: {
      event: 'deal.won',
      timestamp: '${NOW()}',
      data: {
        opportunity_id: '${id}',
        opportunity_name: '${name}',
        amount: '${amount}',
        close_date: '${close_date}',
        account: {
          id: '${account.id}',
          name: '${account.name}',
          industry: '${account.industry}'
        },
        owner: {
          id: '${owner.id}',
          name: '${owner.name}',
          email: '${owner.email}'
        }
      }
    },
    
    // 重试配置
    retry: {
      enabled: true,
      maxAttempts: 3,
      backoffStrategy: 'exponential',
      initialDelay: 1000  // ms
    },
    
    // 响应处理
    responseHandling: {
      successCodes: [200, 201, 202],
      onSuccess: [
        {
          type: 'fieldUpdate',
          field: 'webhook_sent_date',
          value: 'NOW()'
        }
      ],
      onFailure: [
        {
          type: 'emailAlert',
          template: 'webhook_failed',
          recipients: ['admin@company.com']
        }
      ]
    }
  }),
  
  // Slack通知
  slackNotification: Webhook.create({
    name: 'slack_deal_notification',
    object: 'opportunity',
    event: 'onUpdate',
    condition: 'stage = "Closed Won" AND amount >= 100000',
    
    url: '${env.SLACK_WEBHOOK_URL}',
    method: 'POST',
    
    headers: {
      'Content-Type': 'application/json'
    },
    
    payload: {
      text: '🎉 Big Deal Won!',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Deal Won: ${name}*\nAmount: $${amount}\nAccount: ${account.name}\nOwner: ${owner.name}'
          }
        }
      ]
    }
  })
};
```

### 5.2 连接器配置 | Connector Configuration

```typescript
// packages/integrations/src/stripe.connector.ts
import { Connector } from '@objectstack/spec/automation';

export const StripeConnector = Connector.create({
  name: 'stripe_payment',
  category: 'payment',
  label: 'Stripe Payment Gateway',
  description: 'Integration with Stripe for payment processing',
  
  // 认证配置
  authentication: {
    type: 'oauth2',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
    clientId: '${env.STRIPE_CLIENT_ID}',
    clientSecret: '${env.STRIPE_CLIENT_SECRET}'
  },
  
  // 操作定义
  operations: [
    {
      name: 'create_customer',
      type: 'create',
      description: 'Create a customer in Stripe',
      
      endpoint: {
        url: 'https://api.stripe.com/v1/customers',
        method: 'POST'
      },
      
      // 参数映射
      parameters: [
        {
          name: 'email',
          type: 'string',
          required: true,
          source: '${account.billing_email}'
        },
        {
          name: 'name',
          type: 'string',
          source: '${account.name}'
        },
        {
          name: 'phone',
          type: 'string',
          source: '${account.phone}'
        }
      ],
      
      // 响应映射
      responseMapping: {
        stripe_customer_id: 'id',
        stripe_created_at: 'created'
      }
    },
    
    {
      name: 'create_invoice',
      type: 'create',
      description: 'Create an invoice in Stripe',
      
      endpoint: {
        url: 'https://api.stripe.com/v1/invoices',
        method: 'POST'
      },
      
      parameters: [
        {
          name: 'customer',
          type: 'string',
          required: true,
          source: '${account.stripe_customer_id}'
        },
        {
          name: 'description',
          type: 'string',
          source: '${invoice.description}'
        },
        {
          name: 'amount',
          type: 'number',
          source: '${invoice.total_amount * 100}',  // Convert to cents
          transform: 'ROUND(value)'
        },
        {
          name: 'currency',
          type: 'string',
          source: '${invoice.currency}',
          defaultValue: 'usd'
        }
      ]
    },
    
    {
      name: 'get_payment_status',
      type: 'read',
      description: 'Get payment status from Stripe',
      
      endpoint: {
        url: 'https://api.stripe.com/v1/payment_intents/${payment_intent_id}',
        method: 'GET'
      },
      
      responseMapping: {
        payment_status: 'status',
        payment_amount: 'amount',
        payment_date: 'created'
      }
    }
  ],
  
  // 触发器 (Stripe → HotCRM)
  triggers: [
    {
      name: 'payment_succeeded',
      type: 'webhook',
      event: 'payment_intent.succeeded',
      
      // 映射到HotCRM对象
      action: {
        type: 'create',
        object: 'payment',
        fields: {
          amount: '${data.amount / 100}',
          status: 'Completed',
          payment_date: 'NOW()',
          external_id: '${data.id}',
          invoice: '${data.invoice}'
        }
      }
    },
    
    {
      name: 'payment_failed',
      type: 'webhook',
      event: 'payment_intent.payment_failed',
      
      action: {
        type: 'update',
        object: 'invoice',
        filters: [['stripe_payment_id', '=', '${data.id}']],
        fields: {
          status: 'Payment Failed',
          failure_reason: '${data.last_payment_error.message}'
        }
      }
    }
  ]
});
```

### 5.3 ETL管道 | ETL Pipeline

```typescript
// packages/integrations/src/customer_import.etl.ts
import { ETLPipeline } from '@objectstack/spec/automation';

export const CustomerImportPipeline = ETLPipeline.create({
  name: 'customer_data_import',
  description: 'Import customer data from external CRM',
  
  // 数据源
  source: {
    type: 'api',
    endpoint: {
      url: 'https://legacy-crm.company.com/api/customers',
      method: 'GET',
      authentication: {
        type: 'apiKey',
        header: 'X-API-Key',
        value: '${env.LEGACY_CRM_API_KEY}'
      },
      pagination: {
        type: 'offset',
        limitParam: 'limit',
        offsetParam: 'offset',
        pageSize: 100
      }
    },
    
    // 增量加载
    incrementalLoad: {
      enabled: true,
      watermarkField: 'updated_at',
      watermarkStorage: 'etl_watermarks'
    }
  },
  
  // 数据转换
  transformations: [
    {
      type: 'mapping',
      name: 'field_mapping',
      rules: [
        { source: 'customer_name', target: 'name' },
        { source: 'customer_type', target: 'type', 
          transform: 'UPPER(value)' },
        { source: 'annual_sales', target: 'annual_revenue',
          transform: 'ROUND(value, 2)' },
        { source: 'industry_code', target: 'industry',
          lookup: {
            table: 'industry_mapping',
            key: 'code',
            value: 'name'
          }
        }
      ]
    },
    
    {
      type: 'filter',
      name: 'quality_filter',
      condition: 'name != NULL AND email != NULL AND customer_type != "Test"'
    },
    
    {
      type: 'deduplication',
      name: 'remove_duplicates',
      matchFields: ['email', 'company_domain'],
      strategy: 'keep_latest',
      sortBy: 'updated_at DESC'
    },
    
    {
      type: 'enrichment',
      name: 'add_metadata',
      fields: {
        data_source: 'Legacy CRM',
        import_date: 'NOW()',
        import_batch_id: '${batch.id}'
      }
    }
  ],
  
  // 目标
  destination: {
    type: 'object',
    object: 'account',
    
    // 同步模式
    syncMode: 'upsert',  // 或 'insert', 'update', 'delete'
    matchFields: ['email'],
    
    // 冲突解决
    conflictResolution: {
      strategy: 'source_wins',  // 或 'target_wins', 'manual'
      preserveFields: ['owner_id', 'custom_notes']
    },
    
    // 批处理
    batchSize: 100,
    
    // 错误处理
    errorHandling: {
      onError: 'continue',  // 或 'stop', 'rollback'
      maxErrors: 10,
      errorLog: 'etl_errors'
    }
  },
  
  // 调度
  schedule: {
    enabled: true,
    cron: '0 2 * * *',  // 每天凌晨2点
    timezone: 'UTC'
  },
  
  // 通知
  notifications: {
    onSuccess: {
      type: 'email',
      recipients: ['admin@company.com'],
      template: 'etl_success'
    },
    onFailure: {
      type: 'email',
      recipients: ['admin@company.com', 'devops@company.com'],
      template: 'etl_failure'
    }
  }
});
```

---

## 6. 高级特性 | Advanced Features

### 6.1 验证规则 | Validation Rules

```typescript
// packages/crm/src/opportunity.validation.ts
import { ValidationRule } from '@objectstack/spec/data';

export const OpportunityValidations = {
  // 商机金额范围验证
  amountRange: ValidationRule.create({
    name: 'opportunity_amount_range',
    object: 'opportunity',
    field: 'amount',
    
    condition: 'amount >= 1000 AND amount <= 10000000',
    errorMessage: 'Opportunity amount must be between $1,000 and $10,000,000',
    
    active: true
  }),
  
  // 关闭日期验证
  closeDateFuture: ValidationRule.create({
    name: 'close_date_future',
    object: 'opportunity',
    field: 'close_date',
    
    condition: 'close_date >= TODAY()',
    errorMessage: 'Close date must be in the future',
    
    // 仅在特定阶段验证
    when: 'stage NOT IN ["Closed Won", "Closed Lost"]',
    
    active: true
  }),
  
  // 跨字段验证
  discountValidation: ValidationRule.create({
    name: 'discount_requires_approval',
    object: 'opportunity',
    
    condition: 'discount_percent <= 20 OR (discount_percent > 20 AND approval_status = "Approved")',
    errorMessage: 'Discounts over 20% require manager approval',
    
    active: true
  }),
  
  // 复杂业务逻辑验证
  stageProgression: ValidationRule.create({
    name: 'stage_progression_check',
    object: 'opportunity',
    
    condition: `
      IF(ISCHANGED(stage),
        CASE stage
          WHEN "Qualification" THEN has_decision_maker = true
          WHEN "Proposal" THEN has_budget_confirmed = true AND has_timeline = true
          WHEN "Negotiation" THEN has_legal_approval = true
          WHEN "Closed Won" THEN has_signed_contract = true
          ELSE true
        END,
        true
      )
    `,
    errorMessage: 'Stage progression requirements not met',
    
    active: true
  })
};
```

### 6.2 多语言支持 | Multi-Language Support

```typescript
// packages/core/src/i18n/account.i18n.ts
import { Translation } from '@objectstack/spec/system';

export const AccountTranslations = Translation.create({
  object: 'account',
  
  translations: {
    // 英文
    en: {
      label: 'Account',
      pluralLabel: 'Accounts',
      description: 'Companies and organizations',
      
      fields: {
        name: {
          label: 'Account Name',
          helpText: 'Enter the company or organization name'
        },
        type: {
          label: 'Account Type',
          options: {
            Prospect: 'Prospect',
            Customer: 'Customer',
            Partner: 'Partner'
          }
        },
        industry: {
          label: 'Industry',
          helpText: 'Select the primary industry'
        }
      }
    },
    
    // 中文
    zh: {
      label: '客户',
      pluralLabel: '客户',
      description: '企业客户和组织管理',
      
      fields: {
        name: {
          label: '客户名称',
          helpText: '输入公司或组织名称'
        },
        type: {
          label: '客户类型',
          options: {
            Prospect: '潜在客户',
            Customer: '现有客户',
            Partner: '合作伙伴'
          }
        },
        industry: {
          label: '行业',
          helpText: '选择主要行业'
        }
      }
    },
    
    // 日文
    ja: {
      label: 'アカウント',
      pluralLabel: 'アカウント',
      description: '企業および組織の管理',
      
      fields: {
        name: {
          label: 'アカウント名',
          helpText: '会社または組織名を入力してください'
        }
      }
    }
  }
});
```

### 6.3 权限配置 | Permission Configuration

```typescript
// packages/core/src/permissions/sales_rep.permission.ts
import { PermissionSet } from '@objectstack/spec/system';

export const SalesRepPermissions = PermissionSet.create({
  name: 'sales_representative',
  label: 'Sales Representative',
  description: 'Standard permissions for sales reps',
  
  objectPermissions: [
    {
      object: 'account',
      create: true,
      read: true,
      update: true,
      delete: false,
      viewAll: false,
      modifyAll: false
    },
    {
      object: 'contact',
      create: true,
      read: true,
      update: true,
      delete: false
    },
    {
      object: 'opportunity',
      create: true,
      read: true,
      update: true,
      delete: false
    },
    {
      object: 'quote',
      create: true,
      read: true,
      update: true,
      delete: false
    }
  ],
  
  fieldPermissions: [
    {
      object: 'opportunity',
      field: 'discount_percent',
      read: true,
      edit: true,
      constraint: 'value <= 10'  // 只能设置<=10%的折扣
    },
    {
      object: 'account',
      field: 'annual_revenue',
      read: true,
      edit: false  // 只读
    }
  ],
  
  // 记录级访问控制
  recordAccess: {
    account: {
      // 只能看到自己拥有的客户
      ownedRecords: true,
      // 和自己团队的客户
      teamRecords: true,
      // 自定义共享规则
      sharingRules: [
        {
          name: 'territory_based_sharing',
          condition: 'territory = ${user.territory}'
        }
      ]
    }
  }
});
```

---

## 总结 | Summary

本文档展示了 @objectstack/spec v1.1.0 的所有主要元数据类型和用法示例:

This document demonstrates all major metadata types and usage examples of @objectstack/spec v1.1.0:

1. ✅ **数据元数据** - 所有字段类型、关系、验证
2. ✅ **UI元数据** - 页面布局、列表视图、仪表板
3. ✅ **自动化元数据** - 工作流、审批流程、状态机
4. ✅ **AI元数据** - AI代理、RAG管道、预测模型
5. ✅ **集成元数据** - Webhook、连接器、ETL管道
6. ✅ **高级特性** - 验证规则、多语言、权限

这些示例可以直接用于HotCRM项目开发。

These examples can be directly used in HotCRM project development.
