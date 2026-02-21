# HotCRM 开发快速参考指南
# HotCRM Development Quick Reference Guide

---

## 📖 目录 | Table of Contents

1. [快速开始](#快速开始--quick-start)
2. [元数据类型速查](#元数据类型速查--metadata-types-quick-reference)
3. [常用命令](#常用命令--common-commands)
4. [文件命名约定](#文件命名约定--file-naming-conventions)
5. [代码示例速查](#代码示例速查--code-examples-quick-reference)
6. [故障排除](#故障排除--troubleshooting)

---

## 快速开始 | Quick Start

### 安装 | Installation

```bash
# 1. 克隆仓库 | Clone repository
git clone https://github.com/objectstack-ai/hotcrm.git
cd hotcrm

# 2. 安装依赖 | Install dependencies
pnpm install

# 3. 运行测试 | Run tests
pnpm test

# 4. 启动开发服务器 | Start dev server
pnpm dev
```

### 项目结构 | Project Structure

```
hotcrm/
├── packages/               # 业务包 | Business Packages
│   ├── crm/               # 销售云 | Sales Cloud
│   ├── finance/           # 财务云 | Finance Cloud
│   ├── hr/                # 人力资源云 | HR Cloud
│   ├── marketing/         # 营销云 | Marketing Cloud
│   ├── products/          # 产品云 | Products Cloud
│   ├── support/           # 服务云 | Service Cloud
│   ├── ai/                # AI服务 | AI Services
│   └── server/            # 应用服务器 | App Server
│
├── docs/                  # 文档 | Documentation
└── apps/                  # 应用 | Applications
```

---

## 元数据类型速查 | Metadata Types Quick Reference

### 支持的元数据类型 | Supported Metadata Types

| 类型 | 文件后缀 | 导入路径 | 示例文件 |
|------|---------|---------|---------|
| **对象定义** | `.object.ts` | `@objectstack/spec/data` | `account.object.ts` |
| **页面布局** | `.page.ts` | `@objectstack/spec/ui` | `account.page.ts` |
| **列表视图** | `.view.ts` | `@objectstack/spec/ui` | `account.view.ts` |
| **仪表板** | `.dashboard.ts` | `@objectstack/spec/ui` | `sales.dashboard.ts` |
| **工作流** | `.workflow.ts` | `@objectstack/spec/automation` | `lead.workflow.ts` |
| **审批流程** | `.approval.ts` | `@objectstack/spec/automation` | `quote.approval.ts` |
| **状态机** | `.statemachine.ts` | `@objectstack/spec/automation` | `case.statemachine.ts` |
| **钩子** | `.hook.ts` | 自定义 | `account.hook.ts` |
| **AI动作** | `.action.ts` | 自定义 | `lead_scoring.action.ts` |
| **AI代理** | `.agent.ts` | `@objectstack/spec/ai` | `sales_assistant.agent.ts` |
| **RAG管道** | `.rag.ts` | `@objectstack/spec/ai` | `knowledge.rag.ts` |
| **Webhook** | `.webhook.ts` | `@objectstack/spec/automation` | `deal_won.webhook.ts` |
| **连接器** | `.connector.ts` | `@objectstack/spec/automation` | `stripe.connector.ts` |
| **种子数据** | `.seed.ts` | 自定义 | `account.seed.ts` |

---

## 常用命令 | Common Commands

### 开发命令 | Development Commands

```bash
# 开发服务器 | Dev server
pnpm dev                    # 启动主服务器 | Start main server
pnpm dev:docs              # 启动文档站点 | Start docs site

# 构建 | Build
pnpm build                 # 构建所有包 | Build all packages
pnpm build:server          # 仅构建服务器 | Build server only
pnpm build:crm             # 构建特定包 | Build specific package

# 测试 | Testing
pnpm test                  # 运行所有测试 | Run all tests
pnpm test:watch            # 监视模式 | Watch mode
pnpm test:coverage         # 测试覆盖率 | Test coverage

# 代码检查 | Linting
pnpm lint                  # 检查所有代码 | Lint all code
pnpm lint --fix            # 自动修复 | Auto-fix

# 验证 | Validation
node scripts/validate-protocol.cjs  # 验证元数据 | Validate metadata
```

### 包管理 | Package Management

```bash
# 安装依赖到特定包 | Install dependency to specific package
pnpm --filter @hotcrm/crm add lodash

# 运行特定包的脚本 | Run script in specific package
pnpm --filter @hotcrm/crm test
pnpm --filter @hotcrm/crm build

# 清理 | Clean
pnpm clean                 # 清理所有构建产物 | Clean all builds
```

---

## 文件命名约定 | File Naming Conventions

### 规则 | Rules

1. **对象名称**: snake_case (例如: `customer_account`, `sales_lead`)
2. **文件名称**: snake_case (例如: `account.object.ts`)
3. **字段名称**: snake_case (例如: `annual_revenue`, `first_name`)
4. **TypeScript类/接口**: PascalCase (例如: `Account`, `LeadScoringAction`)

### 示例 | Examples

```typescript
// ✅ 正确 | Correct
export const Account = ObjectSchema.create({
  name: 'account',           // snake_case
  fields: {
    annual_revenue: Field.currency({ ... }),  // snake_case
    first_name: Field.text({ ... })           // snake_case
  }
});

// ❌ 错误 | Incorrect
export const Account = ObjectSchema.create({
  name: 'Account',           // 应该是 'account'
  fields: {
    AnnualRevenue: Field.currency({ ... }),   // 应该是 annual_revenue
    FirstName: Field.text({ ... })            // 应该是 first_name
  }
});
```

---

## 代码示例速查 | Code Examples Quick Reference

### 1. 创建对象定义 | Create Object Definition

```typescript
import { ObjectSchema, Field } from '@objectstack/spec/data';

export const MyObject = ObjectSchema.create({
  name: 'my_object',
  label: '我的对象',
  
  fields: {
    name: Field.text({
      label: '名称',
      required: true,
      maxLength: 255
    }),
    
    amount: Field.currency({
      label: '金额',
      precision: 2
    }),
    
    account: Field.lookup({
      label: '客户',
      reference_to: 'account'
    })
  }
});
```

### 2. 创建页面布局 | Create Page Layout

```typescript
import { PageSchema } from '@objectstack/spec/ui';

export const MyPage = PageSchema.create({
  name: 'my_object_detail',
  object: 'my_object',
  type: 'record',
  
  layout: {
    type: 'tabs',
    sections: [
      {
        label: '基本信息',
        columns: 2,
        fields: ['name', 'amount', 'account']
      }
    ]
  }
});
```

### 3. 创建列表视图 | Create List View

```typescript
import { ListView } from '@objectstack/spec/ui';

export const MyView = ListView.create({
  name: 'all_records',
  label: '所有记录',
  object: 'my_object',
  
  columns: [
    { field: 'name', width: 250, link: true },
    { field: 'amount', width: 150, align: 'right' }
  ],
  
  filters: [
    { field: 'amount', operator: '>', value: 1000 }
  ],
  
  sort: [
    { field: 'name', direction: 'asc' }
  ]
});
```

### 4. 创建工作流 | Create Workflow

```typescript
import { WorkflowRule } from '@objectstack/spec/automation';

export const MyWorkflow = WorkflowRule.create({
  name: 'auto_assign',
  object: 'my_object',
  
  triggerType: 'onCreate',
  condition: 'owner = NULL',
  
  actions: [
    {
      type: 'fieldUpdate',
      field: 'owner_id',
      formula: 'getNextUser()'
    },
    {
      type: 'emailAlert',
      template: 'assigned_notification',
      recipients: ['owner_id']
    }
  ]
});
```

### 5. 创建AI代理 | Create AI Agent

```typescript
import { Agent } from '@objectstack/spec/ai';

export const MyAgent = Agent.create({
  name: 'my_assistant',
  role: 'AI Assistant',
  
  systemPrompt: 'You are a helpful assistant...',
  
  tools: [
    {
      name: 'analyzeLead',
      action: 'lead_scoring',
      parameters: {
        lead_id: { type: 'string', required: true }
      }
    }
  ],
  
  model: {
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7
  }
});
```

### 6. 创建钩子 | Create Hook

```typescript
import { TriggerContext } from '@objectstack/core';

export async function beforeInsert(ctx: TriggerContext) {
  // 在插入前自动设置字段值
  ctx.new.created_date = new Date();
  ctx.new.status = 'New';
}

export async function afterUpdate(ctx: TriggerContext) {
  // 在更新后触发其他操作
  if (ctx.new.stage !== ctx.old.stage) {
    await ctx.db.doc.create('activity', {
      type: 'Stage Change',
      description: `Stage changed from ${ctx.old.stage} to ${ctx.new.stage}`
    });
  }
}
```

---

## 故障排除 | Troubleshooting

### 常见问题 | Common Issues

#### 1. 测试失败 | Tests Failing

**问题**: 测试运行失败

**解决方案**:

```bash
# 1. 清理并重新安装依赖
pnpm clean
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 2. 重新运行测试
pnpm test
```

#### 2. 构建错误 | Build Errors

**问题**: TypeScript类型错误

**解决方案**:

```bash
# 检查TypeScript配置
cat tsconfig.json

# 确保所有依赖已安装
pnpm install

# 清理构建缓存
rm -rf packages/*/dist
pnpm build
```

#### 3. 导入错误 | Import Errors

**问题**: 无法导入 @objectstack/spec 模块

**解决方案**:

```typescript
// ✅ 正确的导入方式 | Correct imports
import { ObjectSchema, Field } from '@objectstack/spec/data';
import { PageSchema, ListView } from '@objectstack/spec/ui';
import { WorkflowRule, StateMachine } from '@objectstack/spec/automation';
import { Agent, RAGPipelineConfig } from '@objectstack/spec/ai';

// ❌ 错误的导入方式 | Incorrect imports
import { ObjectSchema } from '@objectstack/spec';  // 缺少子路径
```

#### 4. 元数据验证失败 | Metadata Validation Fails

**问题**: 对象名称或字段名称格式不正确

**解决方案**:

```bash
# 运行验证脚本
node scripts/validate-protocol.cjs

# 检查输出，修正所有snake_case问题
# 对象名称: snake_case (例如: account, sales_lead)
# 字段名称: snake_case (例如: first_name, annual_revenue)
```

---

## 📚 参考文档 | Reference Documentation

### 主要文档 | Main Documents

1. **OBJECTSTACK_SHOWCASE_ROADMAP.md** - 完整升级路线图
2. **METADATA_EXAMPLES.md** - 所有元数据类型示例
3. **METADATA_SHOWCASE_SUMMARY.md** - 能力展示总结
4. **README.md** - 项目总览
5. **packages/TESTING.md** - 测试指南

### 在线资源 | Online Resources

- **@objectstack/spec 文档**: `node_modules/@objectstack/spec/README.md`
- **GitHub仓库**: https://github.com/objectstack-ai/hotcrm
- **问题跟踪**: https://github.com/objectstack-ai/hotcrm/issues

---

## 🎓 学习路径 | Learning Path

### 初级 | Beginner

1. 阅读 README.md 了解项目结构
2. 查看现有对象定义 (`packages/*/src/*.object.ts`)
3. 运行测试了解测试模式
4. 创建简单的对象定义

### 中级 | Intermediate

1. 创建页面布局和列表视图
2. 编写工作流规则
3. 实现钩子函数
4. 添加单元测试

### 高级 | Advanced

1. 设计复杂的状态机
2. 创建AI代理
3. 配置RAG管道
4. 优化性能和架构

---

## 💡 提示与技巧 | Tips & Tricks

### 1. 使用代码片段 | Use Code Snippets

在你的编辑器中创建代码片段加速开发:

```json
{
  "ObjectStack Object": {
    "prefix": "os-object",
    "body": [
      "import { ObjectSchema, Field } from '@objectstack/spec/data';",
      "",
      "export const ${1:ObjectName} = ObjectSchema.create({",
      "  name: '${2:object_name}',",
      "  label: '${3:对象名称}',",
      "  ",
      "  fields: {",
      "    name: Field.text({",
      "      label: '名称',",
      "      required: true",
      "    })",
      "  }",
      "});",
      "",
      "export default ${1:ObjectName};"
    ]
  }
}
```

### 2. 使用Git别名 | Use Git Aliases

```bash
# 在 ~/.gitconfig 中添加
[alias]
  test-all = "!cd $(git rev-parse --show-toplevel) && pnpm test"
  build-all = "!cd $(git rev-parse --show-toplevel) && pnpm build"
```

### 3. 使用pnpm过滤器 | Use pnpm Filters

```bash
# 只构建CRM包及其依赖
pnpm --filter @hotcrm/crm... build

# 运行所有包的测试（并行）
pnpm -r --parallel test

# 在所有包中执行命令
pnpm -r exec rm -rf dist
```

---

## 🔥 热门问题 | FAQ

### Q: 如何添加新的对象？
**A**: 在对应的package/src/目录下创建 `{object_name}.object.ts` 文件，使用 `ObjectSchema.create()` 定义对象。

### Q: 如何运行单个测试文件？
**A**: `pnpm test packages/crm/__tests__/unit/objects/account.object.test.ts`

### Q: 如何查看对象的字段类型？
**A**: 查看 METADATA_EXAMPLES.md 中的"所有字段类型示例"章节。

### Q: 如何调试工作流？
**A**: 在工作流动作中添加 `console.log` 或使用调试器。工作流执行时会输出详细日志。

### Q: RAG管道如何工作？
**A**: 参考 `packages/support/src/knowledge.rag.ts` 的完整示例和注释。

---

## 📞 获取帮助 | Getting Help

- **提交Issue**: https://github.com/objectstack-ai/hotcrm/issues
- **查看文档**: `/docs` 目录
- **查看示例**: `packages/*/src/*.{page,view,workflow,agent}.ts`

---

**最后更新**: 2027-02-21  
**版本**: 3.0.0  
**维护者**: HotCRM Team
