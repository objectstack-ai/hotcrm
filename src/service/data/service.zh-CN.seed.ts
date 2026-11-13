// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twin of the service cases (#2411). How a twin is
 * built: `src/sales/data/_locale.ts`.
 *
 * Every case reads as a real service ticket — what the customer reported, what
 * is known, what happens next — including the thirty the English story
 * generates as 「Demo case NN — priority type」 (#2431 item 3). Each Chinese
 * ticket is written for its row's own type, priority and status, and keeps that
 * row's account, dates and SLA flags, so the Service dashboards and the SLA
 * sweep read exactly as they do in English.
 *
 * The subjects of the two cases that sales rows point at come from
 * `zhCaseSubject` in `src/sales/data/sales.zh-CN.seed.ts`.
 */
import { cases } from './service.seed';
import { zhCNTwin } from '../../sales/data/_locale';
import { zhAccountName, zhContactEmail, zhCaseSubject } from '../../sales/data/sales.zh-CN.seed';
import { zhArticleTitle } from './knowledge.zh-CN.seed';

type Words = Record<string, unknown>;

const ticket = (subject: string, description: string, extra: Words = {}): Words => ({
  subject, description, ...extra,
});

const CASES_ZH: Record<string, Words> = {
  'Login issues after platform upgrade': ticket(
    zhCaseSubject('Login issues after platform upgrade'),
    `欧洲中东非洲办公室的用户反馈：周三晚上 v4.2 升级上线后，登录时间歇性出现 401 错误。
规律：只影响通过 Okta 走 SAML 认证的用户，且只发生在 UTC 09:00–10:30 之间。北美和亚太的用户不受影响。

**客户影响：** 高峰时约 40 名用户无法登录，每位受影响用户约损失 3 小时工作时间。

**初步排查：** 怀疑是升级窗口期间新增的欧洲中东非洲单点登录中继存在时钟偏差。工程团队正在预发环境复现。`,
  ),
  'Data export timing out for large datasets': ticket(
    '大数据量导出超时',
    '数据超过 1 万行时，CSV 导出失败。',
    { escalation_reason: '客户表示可能因此流失' },
  ),
  'How to configure SSO with Okta?': ticket(
    '如何配置 Okta 单点登录？',
    '客户需要 Okta 单点登录配置方面的指导。',
  ),
  'API rate limit exceeded on production': ticket(
    '生产环境 API 调用超出速率限制',
    '生产环境在业务高峰时段频繁触发速率限制。',
    { resolution: '已提高生产环境的速率限制档位，并在客户端加了退避重试，目前用量在限额以内。' },
  ),
  'PDF reports not rendering charts correctly': ticket(
    'PDF 报表中的图表显示不正确',
    '把仪表板导出为 PDF 时，图表区域是空白的。',
  ),
  'Billing discrepancy on last invoice': ticket(
    '上期发票金额有出入',
    `客户（采购林丽）反映：5 月发票显示 15 个活跃席位，但艾克美实际只用了 12 个。其中两个席位在 4 月初
两名工程师离职时已经停用。

**根本原因：** 席位是在管理控制台里停用的，但计费系统的席位数指标每月才刷新一次，所以 5 月发票用的还是变更前的数量。

**处理方案：** 开具 1,200 美元的贷项通知单，并把艾克美切换到新的实时席位计费流程，避免再次发生。
正在等林丽确认是接受贷项通知单还是要求退款。`,
  ),
  'Mobile app crashes on iOS 17': ticket(
    '移动应用在 iOS 17 上闪退',
    'iOS 17.2 及以上版本的用户一打开应用就闪退。',
    { escalation_reason: '影响约 30% 的移动端用户' },
  ),
  'Request: bulk import via CSV': ticket(
    zhCaseSubject('Request: bulk import via CSV'),
    '客户希望能通过上传 CSV 文件导入记录。',
    { resolution: '9.4 版本已提供 CSV 批量导入，并把文档链接发给了客户。' },
  ),

  // ─── The thirty generated rows, as real tickets ─────────────────────
  'Demo case 01 — low question': ticket(
    '报表能否直接导出为 Excel？',
    '客户想把「按阶段统计的商机」报表直接导出为 Excel，用在每周的销售例会上，询问有没有现成的导出方式。',
  ),
  'Demo case 02 — medium bug': ticket(
    '商机列表按日期排序结果错乱',
    '在商机列表里按「预计成交日期」排序时，跨年的记录顺序不对，看起来像是按文本而不是按日期比较。客户已提供截图。',
  ),
  'Demo case 03 — high problem': ticket(
    '审批通知邮件延迟数小时送达',
    '从周一开始，商机审批的通知邮件要晚 3 到 4 小时才到，销售经理没法及时审批大额商机。',
  ),
  'Demo case 04 — critical feature_request': ticket(
    '紧急需求：月底前支持多币种报价',
    '客户的新加坡分公司下个月起要用新元报价，要求月底前支持多币种报价，否则无法按时开票。',
    { resolution: '已为该租户启用多币种，配置了新元汇率并现场演示报价流程，客户确认可以正常开票。' },
  ),
  'Demo case 05 — medium problem': ticket(
    '批量修改负责人后分配通知没有发出',
    '客户用批量编辑把 200 条线索改派给新负责人后，线索分配通知一条都没有发出，销售不知道自己接了新线索。',
    { escalation_reason: '影响整个销售团队的线索分配，SLA 有超时风险，已升级至二线工程排查。' },
  ),
  'Demo case 06 — high feature_request': ticket(
    '希望销售流水线看板能按负责人分组',
    '销售总监希望在销售流水线看板上按负责人分成泳道，每周一的管道会议要用，最好下次例会前就能用上。',
  ),
  'Demo case 07 — critical question': ticket(
    '生产数据是否有异地备份？',
    '客户下周接受外部审计，需要确认生产数据的备份频率和异地容灾位置，要求今天下班前给出书面答复。',
  ),
  'Demo case 08 — low bug': ticket(
    '联系人电话号码前多了一个空格',
    '联系人详情页的电话号码前面多了一个空格，复制到拨号软件里无法识别。',
    { resolution: '已修复号码格式化问题，随本周版本发布，客户确认显示正常。' },
  ),
  'Demo case 09 — high question': ticket(
    '切换到新的身份提供商需要哪些步骤？',
    '客户计划本周末把单点登录从旧的身份提供商切换到 Azure AD，需要确认切换步骤和出问题时的回退方案。',
    { escalation_reason: '切换窗口就在本周末，SLA 时间紧，已升级请解决方案架构师协助评审。' },
  ),
  'Demo case 10 — critical bug': ticket(
    '保存报价单时报 500 错误',
    '从今天上午开始，所有销售保存报价单时都收到 500 错误，季度末的报价全部卡住。',
  ),
  'Demo case 11 — low problem': ticket(
    '高管总览仪表板早上加载偏慢',
    '每天早上 9 点左右，高管总览仪表板偶尔要 10 秒以上才加载完，其他时段正常。',
  ),
  'Demo case 12 — medium feature_request': ticket(
    '希望导入线索时自动识别重复记录',
    '客户每个月都会导入展会收集的线索，希望导入时能按邮箱自动识别已有的记录，不要重复创建。',
    { resolution: '已演示导入时按邮箱匹配已有记录的设置，客户确认满足需求。' },
  ),
  'Demo case 13 — critical problem': ticket(
    '与 ERP 的夜间同步连续失败',
    '与 ERP 的夜间同步任务已经连续两晚失败，订单数据没有进入 CRM，财务月结受到影响。',
    { escalation_reason: '影响财务月结，已升级至二线工程，并拉上客户的 ERP 团队联合排查。' },
  ),
  'Demo case 14 — low feature_request': ticket(
    '建议任务列表增加「本周到期」筛选',
    '销售希望任务列表里有一个现成的「本周到期」筛选，不用每次手动设置日期范围。',
  ),
  'Demo case 15 — medium question': ticket(
    '如何让区域经理只读查看本区域全部客户？',
    '客户想让区域经理能看到本区域所有客户，但不能修改，询问权限集和共享规则应该怎么配置。',
  ),
  'Demo case 16 — high bug': ticket(
    '欢迎邮件里的姓名占位符没有被替换',
    '新联系人收到的欢迎邮件里直接显示了「联系人姓名」占位符，没有换成真实姓名，已经发出去十几封。',
    { resolution: '已修正模板里的变量名，并给受影响的联系人重新发送邮件，客户确认收件内容正确。' },
  ),
  'Demo case 17 — low question': ticket(
    '合同到期提醒能否提前到 90 天？',
    '客户想把合同到期提醒从提前 60 天改成提前 90 天，询问能不能自己调整。',
    { escalation_reason: '客户已经第三次追问，升级给客户成功经理统一答复。' },
  ),
  'Demo case 18 — medium bug': ticket(
    '手机端给工单上传附件失败',
    '在手机端给工单添加照片附件，进度条走完之后附件并没有出现在工单上。',
  ),
  'Demo case 19 — high problem': ticket(
    '部分销售登录后看不到自己的客户',
    '东部区域的三名销售登录后客户列表是空的，怀疑是昨天调整区域划分后共享规则没有重新计算。',
  ),
  'Demo case 20 — critical feature_request': ticket(
    '上线前必须开通字段修改审计',
    '客户合规部门要求下周上线前开通全部关键字段的修改审计，否则不允许系统上线。',
  ),
  'Demo case 21 — medium problem': ticket(
    '报表数量和列表数量对不上',
    '「本季度新增商机」报表显示 48 条，但用同样条件筛选的列表视图只有 45 条。',
    { escalation_reason: '客户要拿这组数据向管理层汇报，已升级至二线工程核对统计口径。' },
  ),
  'Demo case 22 — high feature_request': ticket(
    '希望审批和工单分配能推送到企业微信',
    '客户的销售和服务团队主要用企业微信沟通，希望商机审批和工单分配的通知能直接推送到企业微信。',
  ),
  'Demo case 23 — critical question': ticket(
    '能否提供数据驻留区域的书面说明？',
    '客户法务要求在签署续约前确认数据存放的区域，以及是否满足他们的数据驻留要求，需要正式的书面说明。',
  ),
  'Demo case 24 — low bug': ticket(
    '打印报价单时页脚被截断',
    '把报价单打印成 PDF 时，最后一页的页脚被截掉了一半。',
  ),
  'Demo case 25 — high question': ticket(
    '如何批量转移离职员工名下的记录？',
    '一名销售离职，名下有 300 多条客户和商机，客户想知道怎么一次性转给接手的同事。',
    { resolution: '已指导客户用批量编辑修改负责人，并说明了队列和共享规则的影响，记录已全部转移。' },
  ),
  'Demo case 26 — critical bug': ticket(
    '所有用户都无法登录系统',
    '今天早上 8 点起，客户所有用户登录时都提示「会话已过期」，无法进入系统，业务完全中断。',
  ),
  'Demo case 27 — low problem': ticket(
    '新建记录要过几分钟才能被搜索到',
    '新建的联系人要过几分钟才能在全局搜索里搜到，销售刚录完客户想马上查找时找不到。',
  ),
  'Demo case 28 — medium feature_request': ticket(
    '希望商机阶段变更时自动创建跟进任务',
    '销售经理希望商机进入「方案报价」阶段时，系统自动给负责人创建一个跟进任务。',
  ),
  'Demo case 29 — critical problem': ticket(
    '批量导入后大量记录的负责人丢失',
    '客户导入 5,000 条历史客户后，约一半记录的负责人为空，销售看不到自己的客户。',
    { resolution: '定位为导入映射中负责人一列的格式不一致，已修正映射并重新导入受影响的记录，客户核对无误。' },
  ),
  'Demo case 30 — low feature_request': ticket(
    '希望仪表板支持深色模式',
    '客户调度中心的大屏全天显示仪表板，希望支持深色模式，减少夜班时的眩光。',
    { escalation_reason: '客户在季度回顾中再次提出，升级给产品经理评估排期。' },
  ),
};

export const casesZhCN = zhCNTwin(cases, {
  key: (r) => String(r.subject),
  words: CASES_ZH,
  text: ['subject', 'description', 'escalation_reason', 'resolution'],
  refs: { crm_account: zhAccountName, crm_contact: zhContactEmail, resolved_by_article: zhArticleTitle },
});
