// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twin of the knowledge base (#2411). How a twin is
 * built: `src/sales/data/_locale.ts`.
 *
 * Each article is the English one written for a Chinese reader, with its
 * `language` set to Simplified Chinese. Status, audience, category, tags and
 * dates are the English article's, so the Knowledge views and the deflection
 * tiles read the same. A screen name in a body is the zh-CN pack's label for it
 * (销售流水线, 高管总览, 记录通话, 发送邮件, 转化线索, 线索卡片, 线索日历).
 */
import { knowledgeArticles } from './service.seed';
import { zhCNTwin, zhKey } from '../../sales/data/_locale';

const article = (title: string, summary: string, body: string) => ({ title, summary, body });

const ARTICLES_ZH: Record<string, Record<string, unknown>> = {
  'Getting Started with HotCRM': article(
    'HotCRM 入门',
    '用五分钟了解客户、联系人、线索和销售管道。',
    `# HotCRM 入门

欢迎使用！本指南带你认识几个核心对象：

1. **客户**：你销售和服务的公司。
2. **联系人**：这些公司里的人。
3. **线索**：漏斗顶端、尚未确认的潜在客户。
4. **商机**：已确认、正在销售管道中推进的交易。

打开 **销售流水线** 看板，拖动卡片即可在阶段之间移动商机；在 **高管总览** 仪表板上
可以一眼看清收入情况。`,
  ),
  'Resetting Your Password': article(
    '重置密码',
    '用户在登录页面重置忘记的密码。',
    `# 重置密码

1. 在登录页面点击 **忘记密码？**
2. 输入与你的账号关联的邮箱。
3. 到收件箱查收重置链接（30 分钟内有效）。
4. 设置一个至少 12 位的新密码。

如果没有收到邮件，请检查垃圾邮件，或联系你的管理员。`,
  ),
  'API Rate Limits': article(
    'API 速率限制',
    '每个令牌的请求配额，以及推荐的退避策略。',
    `# API 速率限制（草稿）

默认配额为每个令牌每分钟 600 次请求。收到 HTTP 429 时，从 1 秒开始按指数退避重试。
具体数值还在等平台团队最终确认。`,
  ),
  'Legacy SSO Setup': article(
    '旧版单点登录配置',
    '2025 年之前身份认证体系的 SAML 配置。',
    `# 旧版单点登录配置

本文介绍已弃用的 SAML 1.1 流程。新租户请改用 OIDC 连接器。
保留本文是为了仍在使用旧体系的客户。`,
  ),
  'Importing Your First Accounts and Contacts': article(
    '导入你的第一批客户和联系人',
    '从 CSV 文件把现有客户名单导入 HotCRM，导入时会拦下重复记录。',
    `# 导入你的第一批客户和联系人

1. 把客户名单导出为 CSV，每家公司或每个人一行。
2. 打开 **客户**，选择 **导入**，再把每一列映射到对应字段。
3. 先导入客户，再导入联系人，这样每个联系人都能关联到所属客户。

线索的导入方式相同。正式导入整个文件之前，先抽查几条导入的记录。`,
  ),
  'Your First Week with the Sales Pipeline': article(
    '销售管道上手第一周',
    '商机如何从初步接洽走到结单，以及每个阶段对销售代表的要求。',
    `# 销售管道上手第一周

每个商机都处在一个阶段：初步接洽、资格确认、需求分析、方案报价、谈判，
最后是赢单或输单。

- 在 **销售流水线** 看板上拖动卡片，就能把商机推进到下一阶段。
- 随时更新 **下一步**，这是经理最先看的内容。
- 金额在 10 万及以上的商机，需要销售经理审批。`,
  ),
  'Inviting Your Team': article(
    '邀请团队成员',
    '添加同事，给每人分配所在岗位，并检查他们能看到哪些数据。',
    `# 邀请团队成员

1. 打开 **设置 → 用户**，按邮箱逐个邀请同事。
2. 给他们分配所在的岗位（销售代表、销售经理、服务专员）。
3. 以对方身份登录一次，确认他们应该看到的记录都在。

等管理员团队确认新版设置菜单的截图后再发布。`,
  ),
  'Logging Calls, Meetings and Emails': article(
    '记录通话、会议和邮件',
    '把每一次客户接触记在它所属的客户、联系人或商机上。',
    `# 记录通话、会议和邮件

打开这次沟通涉及的记录，使用 **记录通话**，或者添加一个关联到它的会议日程。
要给联系人发邮件，在联系人自己的页面上使用 **发送邮件**。

每一条都会出现在记录的活动时间线上，没人需要再问上次是谁联系的客户。`,
  ),
  'Converting a Qualified Lead': article(
    '转化合格线索',
    '一步把线索转化为客户、联系人和商机。',
    `# 转化合格线索

线索确认合格后，打开它并选择 **转化线索**。HotCRM 会创建客户和联系人（已存在的会直接复用），
如果你需要，还会创建第一个商机。

线索转化后即变为只读，之后请在新的商机上继续跟进。`,
  ),
  'Saving a Filtered List View': article(
    '保存带筛选条件的列表视图',
    '把每天早上都要用的筛选条件放在一键可达的地方。',
    `# 保存带筛选条件的列表视图（草稿）

打开任意列表，加上需要的筛选条件，然后选择 **另存为视图** 并起个名字。
待补充：视图菜单定型后，说明还有谁能看到保存的视图。`,
  ),
  'Emails Missing from the Activity Timeline': article(
    '活动时间线上缺少邮件',
    '已发送的邮件为什么可能没出现在记录上，以及如何让它出现。',
    `# 活动时间线上缺少邮件

先确认邮件是从哪里发出的。

1. 确认邮件是用联系人页面上的 **发送邮件** 发出的，而不是从个人邮箱发出的。
2. 确认收件人和联系人的邮箱地址完全一致。
3. 如果两条都满足，附上记录链接升级给平台团队。`,
  ),
  'A Dashboard Chart Shows No Data': article(
    '仪表板图表没有数据',
    '大多数空图表是筛选条件或日期范围造成的，不是数据缺失。',
    `# 仪表板图表没有数据

1. 稍等一两秒，较重的图表会在页面之后才绘制出来。
2. 放宽仪表板的日期范围，没有结单的季度本来就是空的。
3. 清除仪表板筛选条件，再逐个加回来。

如果图表仍然为空，打开它背后的报表，检查报表里有没有数据行。`,
  ),
  'Understanding Your Invoice': article(
    '看懂你的发票',
    '月度发票上每一行的含义，以及何时计费。',
    `# 看懂你的发票

发票上每个订阅占一行：套餐、席位数和所覆盖的计费周期。周期中途增加的席位，
按比例在下一张发票上计费。发票在计费周期的第一个工作日开具，30 天内付款。`,
  ),
  'Changing Your Plan or Seat Count': article(
    '变更套餐或席位数',
    '升级、降级或增加席位，以及每种变更何时生效。',
    `# 变更套餐或席位数

- **增加席位**：立即生效，按比例计费。
- **升级套餐**：立即生效，差额体现在下一张发票上。
- **降级或减少席位**：在当前计费周期结束时生效。

只有你所在组织的管理员可以做这些变更。`,
  ),
  'Annual Billing Discount (Previous Price List)': article(
    '年付折扣（旧版价目表）',
    '旧版价目表的年付预付折扣，为按旧价目表签约的客户保留。',
    `# 年付折扣（旧版价目表）

按旧版价目表预付一年的客户，享受月费 85 折。该优惠已被现行价目表取代，
新订阅不再适用。`,
  ),
  'Authenticating with API Keys': article(
    '使用 API 密钥认证',
    '给每个集成单独的 API 密钥，并清楚这个密钥能访问什么。',
    `# 使用 API 密钥认证

每个集成都应使用由管理员创建的独立 API 密钥，这样吊销其中一个不会影响其他集成。

密钥以其所属用户的身份工作：用户能读写什么，它就能读写什么，不多也不少。
集成下线时，请立即吊销对应的密钥。`,
  ),
  'Receiving Record Changes with Webhooks': article(
    '通过 Webhook 接收记录变更',
    '让 HotCRM 在商机、工单或客户变更时调用你的接口。',
    `# 通过 Webhook 接收记录变更

注册一个 HTTPS 接口，选择它要接收的对象和事件。收到每次推送后尽快返回 2xx，
耗时的处理放到之后再做。

处理程序要能安全地重复执行：同一次变更可能推送不止一次，用记录 ID 来区分。`,
  ),
  'Bulk Loading Records through the API': article(
    '通过 API 批量加载记录',
    '加载成千上万条记录，而不触发速率限制或重复规则。',
    `# 通过 API 批量加载记录

每批发送几百条，先父记录后子记录，每批完成后再发下一批。插入之前，
用记录的自然键（客户名称、联系人邮箱）检查是否已有同一条记录。`,
  ),
  'Release Notes: Lead Cards and the Lead Calendar': article(
    '版本说明：线索卡片和线索日历',
    '线索卡片以人名为标题，线索日历显示每一次跟进。',
    `# 版本说明：线索卡片和线索日历

- **线索流水线** 和 **线索卡片** 中的每张卡片都以联系人姓名为标题。
- **线索日历** 把每条线索放在它的跟进日期上。
- 任务可以直接在列表行上用新的 **完成** 操作完成。`,
  ),
  'Release Notes: Helpful Votes on Articles': article(
    '版本说明：文章「有用」投票',
    '读者现在可以标记文章有用或没用，作者能看到计数。',
    `# 版本说明：文章「有用」投票

每篇已发布的文章现在都带有 **有用** 和 **没用** 按钮。每位读者对每篇文章有一票，
可以随时更改。计数显示在 **已发布** 列表中，作者能看出哪些回答真正帮到了人。`,
  ),
  'Release Notes: Forecast Snapshots': article(
    '版本说明：预测快照',
    '下个版本：为每位销售代表和经理生成月度预测快照。',
    `# 版本说明：预测快照（草稿）

预测将按计划定时留存，经理可以把本期的承诺数和上一期对比。发布日期确定前暂不发布。`,
  ),
  'Data Retention and Deletion': article(
    '数据保留与删除',
    '客户数据保存多久，以及如何申请删除。',
    `# 数据保留与删除

记录会一直保留在你的组织中，直到你删除为止。如需注销组织并删除其全部数据，
由管理员向支持团队提交书面申请；删除完成后，支持团队会予以确认。`,
  ),
  'Acceptable Use': article(
    '可接受使用政策',
    'HotCRM 可以用于什么，不可以用于什么。',
    `# 可接受使用政策

请用 HotCRM 管理你自己的客户关系。不要上传你无权持有的数据，不要向未同意接收的人
群发邮件，也不要尝试访问其他组织的记录。`,
  ),
  'Support Hours and Response Targets (Previous Plans)': article(
    '支持时间与响应目标（旧版套餐）',
    '旧版套餐的支持时间，已被现行支持套餐取代。',
    `# 支持时间与响应目标（旧版套餐）

支持团队在工作日 09:00 至 18:00（UTC）提供服务，一个工作日内首次响应。
这些时间已被现行支持套餐的响应目标取代。`,
  ),
};

/** The Chinese title of the knowledge article an English row names. */
export const zhArticleTitle = zhKey('knowledge article', ARTICLES_ZH, 'title');

export const knowledgeArticlesZhCN = zhCNTwin(knowledgeArticles, {
  key: (r) => String(r.title),
  words: ARTICLES_ZH,
  text: ['title', 'summary', 'body'],
  map: (twin) => ({ ...twin, language: 'zh_cn' }),
});
