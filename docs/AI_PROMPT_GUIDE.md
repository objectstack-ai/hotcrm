# AI Prompt Engineering Guide for HotCRM

This document provides a comprehensive guide on how to use AI prompts effectively with the HotCRM system, following the @objectstack/spec protocol.

## Phase 1: Protocol Injection & Role Setting (Context Priming)

### Prompt Template

```markdown
# Role
你是一位精通企业级软件架构的资深 CTO，尤其擅长 Salesforce 架构理念与现代低代码协议的结合。你当前的任务是基于 `@objectstack/spec` 标准协议，协助我开发一套世界级的 CRM 系统。

# Context: The Protocol
请仔细阅读以下 `@objectstack/spec` 的核心定义（或假设你已经通过知识库掌握）：

1. **Metadata Driven**: 所有对象（Account, Contact 等）均通过 JSON/YAML 描述。
2. **ObjectQL**: 数据查询必须使用 ObjectQL 语法，而非 SQL。
3. **UI Engine**: 前端渲染基于 `amis` 框架，样式使用 Tailwind CSS。
4. **Project Structure**: 
   - src/metadata/ - 对象定义 (.object.yml)
   - src/triggers/ - 业务逻辑触发器
   - src/actions/ - ObjectStack Actions (API 接口)
   - src/ui/ - UI 配置
   - src/engine/ - ObjectQL 引擎

# Goal
我们要对标 Salesforce 的功能深度，但拥有 Apple/Linear 级别的用户体验。
```

### Usage Example

When starting a new feature or modification, always begin with this context-setting prompt to ensure the AI understands the architecture and standards.

## Phase 2: Core Metadata Modeling (Schema Design)

### Prompt Template for Creating Objects

```markdown
# Task: Design CRM Core Objects
请根据 `@objectstack/spec` 标准，为 CRM 系统设计核心对象模型：`[ObjectName]`。

# Requirements
1. **Fields Definition**: 包含企业级 CRM 必备字段。请详细定义字段的 `type`, `label`, `required`, 以及 `options` (如果是 select 类型)。

2. **Relationships**: 定义与其他对象的关系（Lookup 或 Master-Detail）。
   - Account ← Contact (Master-Detail)
   - Account → Opportunities (Lookup)
   - Opportunity → Contract (Lookup)

3. **Advanced Features**:
   - 启用 `searchable: true` 以支持全局搜索
   - 定义 `list_views` (视图)，包括常用筛选条件
   - 添加 `validationRules` 确保数据质量

4. **Output Format**: 直接输出符合 spec 的 `.object.yml` 代码块。

# Reference
参考 Salesforce 的 [ObjectName] 对象模型，但移除过时的字段，保持精简。

# Additional Context
[Specific business requirements, industry focus, or special features]
```

### Example: Creating a Lead Object

```markdown
# Task: Design CRM Core Objects
请根据 `@objectstack/spec` 标准，为 CRM 系统设计核心对象模型：`Lead` (线索)。

# Requirements
1. **Fields Definition**: 
   - 基本信息：FirstName, LastName, Company, Title, Email, Phone
   - 线索来源：LeadSource (Web, 电话, 推荐等)
   - 状态：Status (新建, 联系中, 已确认, 已转化, 已关闭)
   - 评分：Rating (Hot, Warm, Cold)

2. **Relationships**: 
   - ConvertedAccountId → Account (转化后的客户)
   - ConvertedContactId → Contact (转化后的联系人)
   - ConvertedOpportunityId → Opportunity (转化后的商机)

3. **Advanced Features**:
   - 启用全局搜索
   - 定义视图："我的线索"、"本周新增"、"高评分线索"
   - 添加验证：必须有邮箱或电话

4. **Output Format**: YAML 格式的 .object.yml 文件

# Additional Context
这是一个 B2B SaaS 公司，主要通过网站和展会获取线索。需要支持线索评分和自动分配功能。
```

## Phase 3: Business Logic & Automation (Triggers)

### Prompt Template for Triggers

```markdown
# Task: Implement Business Automation
我需要为 `[ObjectName]` 对象实现一个自动化流程。

# Scenario
当 [触发条件] 时，系统需要自动执行以下操作：
1. [操作1 - 详细描述]
2. [操作2 - 详细描述]
3. [操作3 - 详细描述]

# Constraints
- 使用 Node.js/TypeScript 编写触发器代码
- 数据操作必须使用 **ObjectQL** 语法 (e.g., `db.doc.create`, `db.doc.update`)
- 代码风格需要防御性编程，处理可能的空值异常
- 添加详细的日志记录以便调试

# Output
请提供完整的 Trigger 代码文件内容，包含必要的注释。

# Success Criteria
- [ ] 正确处理所有边界情况
- [ ] 错误处理完善
- [ ] 日志记录清晰
- [ ] 性能考虑（避免N+1查询）
```

### Example: Lead Conversion Trigger

```markdown
# Task: Implement Business Automation
我需要为 `Lead` 对象实现一个自动化流程。

# Scenario
当线索的状态变更为 "已转化" 时，系统需要自动执行以下操作：
1. 创建一个新的 Account 记录（如果不存在同名公司）
2. 创建一个新的 Contact 记录，关联到该 Account
3. 如果有商机信息，创建一个 Opportunity 记录
4. 更新 Lead 记录的 ConvertedAccountId, ConvertedContactId, ConvertedOpportunityId
5. 发送通知给销售代表

# Constraints
- 使用 TypeScript 编写触发器代码
- 使用 ObjectQL 语法进行数据操作
- 防御性编程：检查重复、空值、并发等问题
- 事务处理：确保要么全部成功，要么全部回滚

# Output
完整的 src/triggers/LeadConversionTrigger.ts 文件
```

## Phase 4: Modern UI/UX Design (Dashboard & Components)

### Prompt Template for UI

```markdown
# Task: Design [Component Name]
请基于 `amis` 规范和 `ObjectUI` 组件库，设计 [具体组件或页面]。

# Design Aesthetic
- **Style**: 极简主义，参考 Apple macOS 或 Linear 的设计语言
- **Visuals**: 
  - 使用大圆角 (rounded-xl, rounded-2xl)
  - 轻微的边框 (border-gray-200)
  - 磨砂玻璃效果 (backdrop-blur)
  - 渐变背景 (bg-gradient-to-br)
- **Typography**: 
  - 高对比度的深色字体 (text-gray-900)
  - 标题清晰 (text-2xl font-bold)
  - 次要文字 (text-gray-600)

# Components Needed
[详细列出需要的组件和功能]

# Layout Structure
[描述布局结构，使用 Grid/Flex 等]

# Data Requirements
[描述需要的 API 接口和数据格式]

# Output
请生成 `amis` 的 JSON/TypeScript 配置代码。在 `className` 中大量使用 Tailwind CSS 类来实现上述设计风格。

# Interaction Requirements
[描述交互行为：点击、hover、加载状态等]
```

### Example: Pipeline Kanban Board

```markdown
# Task: Design Pipeline Kanban Board
请基于 `amis` 规范设计一个商机管道看板。

# Design Aesthetic
- **Style**: 参考 Linear 的看板设计
- **Visuals**: 
  - 每个阶段用卡片列表展示
  - 拖拽支持（drag & drop）
  - 卡片使用白色背景，圆角，阴影
  - 阶段标题使用渐变色区分

# Components Needed
1. **Stage Columns**: 横向排列的阶段列（Prospecting, Qualification, etc.）
2. **Opportunity Cards**: 每个商机的卡片，显示：
   - 商机名称
   - 客户名称
   - 金额（大字号，醒目）
   - 预计成交日期
   - 负责人头像
3. **Summary Bar**: 顶部汇总条，显示每个阶段的总金额
4. **Add Button**: 快速添加新商机

# Layout Structure
- 使用横向滚动的 Grid 布局
- 每个阶段列固定宽度 320px
- 卡片之间间距 12px

# Data Requirements
- API: GET /api/opportunities/kanban
- 返回格式：{ stages: [{ name, color, opportunities: [...] }] }

# Output
TypeScript 格式的 amis 配置

# Interaction Requirements
- 拖拽商机到不同阶段时，自动更新 Stage 字段
- 点击卡片打开详情抽屉
- Hover 卡片时显示更多信息
```

## Phase 5: AI Native Features

### Prompt Template for AI Features

```markdown
# Task: Design AI Feature "[Feature Name]"
我想在 CRM 的 [页面/位置] 增加一个 "[功能名称]" AI 功能。

# Functionality
[详细描述 AI 功能的输入、处理、输出]

当用户 [触发条件] 时，后台：
1. 读取 [数据源1, 数据源2, ...]
2. 通过 LLM 生成 [输出内容]
3. 提供 [具体建议/操作]

# Implementation Request
1. 请设计这个功能的后端 **ObjectStack Action** 接口定义
   - Request interface
   - Response interface
   - 核心处理逻辑

2. 编写传给 LLM 的 **System Prompt**
   - 建立 AI 角色定位
   - 提供上下文信息
   - 明确输出格式和要求
   - 特别考虑 [行业/场景] 的特殊需求

3. 提供前端 `amis` 配置
   - 使用带有 AI 图标的卡片
   - 异步加载和展示结果
   - Loading 状态
   - 错误处理

# Output Format
提供三个文件的完整代码：
1. src/actions/[ActionName].ts - Action 实现
2. src/prompts/[PromptName].ts - LLM Prompt
3. src/ui/components/[ComponentName].ts - UI 组件

# Quality Requirements
- AI 响应时间 < 3秒（使用 streaming 如果可能）
- 输出内容准确且可操作
- 优雅的 Loading 和 Error 状态
- 支持重新生成
```

### Example: AI Email Composer

```markdown
# Task: Design AI Feature "Smart Email Composer"
我想在 CRM 的联系人详情页增加一个 "AI 邮件撰写" 功能。

# Functionality
当销售人员点击 "AI 撰写邮件" 按钮时，后台：
1. 读取联系人信息（姓名、职位、公司）
2. 读取最近 5 次互动记录
3. 读取关联的商机信息
4. 通过 LLM 生成个性化的邮件内容
5. 提供 3 种不同风格的邮件草稿（正式、友好、简洁）

# Implementation Request
1. 设计 ObjectStack Action 接口
   - Input: contactId, emailType (follow-up, introduction, proposal)
   - Output: emailDrafts (array of 3 drafts), subject, tone

2. 编写 LLM System Prompt
   - 角色：专业的销售邮件写作助手
   - 上下文：联系人背景、互动历史、当前商机阶段
   - 输出：主题行 + 3 种风格的正文
   - 要求：简洁、个性化、有 CTA

3. 前端 amis 组件
   - 模态对话框显示 3 种草稿
   - Tab 切换不同风格
   - 编辑器支持修改
   - 一键复制或直接发送

# Quality Requirements
- 邮件长度 150-250 字
- 必须包含个性化元素
- CTA 清晰明确
- 避免过度营销语气
```

## Best Practices for Prompting

### 1. Be Specific and Structured

❌ Bad:
```
帮我创建一个客户对象
```

✅ Good:
```
请根据 @objectstack/spec 标准，创建一个 Account 对象，包含以下字段：
- Name (text, required)
- Industry (select, 10个行业选项)
- AnnualRevenue (currency)
- Rating (select: Hot, Warm, Cold)

同时定义与 Contact 和 Opportunity 的关系，以及 3 个常用列表视图。
```

### 2. Provide Context

Always include:
- What you're building (object, trigger, UI, etc.)
- Where it fits in the system
- Expected behavior
- Constraints and requirements

### 3. Request Specific Output Format

Clearly state:
- File format (YAML, TypeScript, JSON)
- Code style preferences
- Documentation requirements
- Testing requirements

### 4. Iterate and Refine

First prompt → Review output → Refine prompt → Get improved output

### 5. Use Examples

When possible, provide:
- Similar objects/features for reference
- Expected input/output samples
- Visual mockups or descriptions

## Common Prompting Patterns

### Pattern 1: Object Extension

```markdown
基于现有的 Account 对象，添加以下字段：
- SocialMediaProfile (新的复合字段类型)
  - LinkedIn URL
  - Twitter Handle
  - 微信公众号

请更新 Account.object.yml，保持现有字段不变。
```

### Pattern 2: Related List Component

```markdown
为 Account 详情页设计一个 "关联商机" 列表组件：
- 显示该客户的所有商机
- 列：Name, Amount, Stage, CloseDate, Owner
- 支持按 Stage 筛选
- 支持创建新商机（模态框）
- Apple 风格设计
```

### Pattern 3: Bulk Operation

```markdown
实现批量更新商机负责人的功能：
1. 前端：多选商机，选择新负责人
2. 后端：ObjectStack Action 批量更新
3. 验证：检查权限、商机状态
4. 通知：通知新旧负责人
```

## Conclusion

Effective AI prompting for HotCRM development requires:
1. Understanding the @objectstack/spec protocol
2. Providing clear, structured instructions
3. Specifying design requirements and constraints
4. Requesting specific output formats
5. Iterating based on results

By following these patterns and templates, you can efficiently use AI to build world-class CRM features while maintaining consistency and quality.
