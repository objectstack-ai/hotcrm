// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the sales families — accounts, contacts,
 * leads and opportunities (#2411). How a twin is built, and why every dataset
 * has one: `./_locale.ts`.
 *
 * This file also holds the Chinese NATURAL KEYS the other packages' twins
 * reference (account names, contact and lead emails, opportunity names,
 * campaign names, and the two case subjects sales rows point at). A module may
 * import from `src/sales/` only (AGENTS.md, layout rule 2), so a key more than
 * one package resolves has its one home here.
 *
 * People: 姓 goes into `last_name` and 名 into `first_name`; the record title
 * reads family name first by the rule in `src/sales/objects/_person-name.ts`
 * (#2431). Emails are rewritten in pinyin on the same domains, so a Chinese
 * contact is not named John on the wire. Addresses keep their country, state and
 * postal code, which the territory rules read, and say the street and city in
 * Chinese; the map pins are the English record's.
 */
import { accounts, contacts, leads, opportunities } from './sales.seed';
import { zhCNTwin, zhKey, zhLookup } from './_locale';

// ─── Accounts ─────────────────────────────────────────────────────────

const address = (street: string, city: string) => ({ street, city });

const ACCOUNTS_ZH: Record<string, Record<string, unknown>> = {
  'Acme Corporation': {
    name: '艾克美集团',
    billing_address: address('霍华德街 500 号 400 室', '旧金山'),
    description: `**战略客户 · 企业级**

艾克美集团是一家 C 轮融资的机器人与工业自动化公司，18 个月前从竞品切换过来，
现在用 HotCRM 作为北美、欧洲中东非洲和亚太三个区域团队的销售与服务主系统。

**客户关系**
- 关键决策人：彭嘉华（首席技术官），看重我们的开放架构和 AI 路线图。
- 日常推动者：张伟（工程副总裁），负责技术评估和集成方面的问题。
- 采购：由林丽负责，倾向签年度合同、30 天账期。

**当前情况**
- 年度经常性收入 22 万美元（续约已签），同比增长 22%。
- 1 个进行中的企业级商机（15 万美元的平台升级），处于方案报价阶段；1 个服务工单未关闭
  （登录问题）；1 个账单争议在等客户回复。
- 客户内部合规审查之后，AI 智能体治理成了这次升级的硬性要求，所以已排期的治理研讨会
  就是签约前的最后一关。

**风险提示**
- 7.5 万美元的营销云增购因时机丢单：对方市场部签了两年的 HubSpot 合同，
  要等合同续约时才有采购窗口。
- 登录问题工单已超出 SLA 时限，今天必须有人跟进。`,
  },
  'Globex Industries': {
    name: '环球工业',
    billing_address: address('南瓦克大道 233 号', '芝加哥'),
  },
  'Initech Solutions': {
    name: '英泰科技',
    billing_address: address('自由广场 1 号 23 层', '纽约'),
  },
  'Stark Medical': {
    name: '斯塔克医疗',
    billing_address: address('湾街 181 号 2200 室', '多伦多'),
  },
  'Wayne Enterprises': {
    name: '韦恩企业',
    billing_address: address('汉诺威街 3000 号', '帕洛阿尔托'),
  },
  'Northwind Energy': {
    name: '北风能源',
    billing_address: address('利奥波德大街 21 号', '慕尼黑'),
    description: '一家区域性能源供应商，正在评估统一的运营与客户数据平台。',
  },
  'Vertex Analytics': {
    name: '维特分析',
    billing_address: address('国会大道 600 号 14 层', '奥斯汀'),
    description: '一家数据分析 SaaS 客户，正把使用范围从数据团队扩展到整个营收部门。',
  },
  'Lattice Education': {
    name: '格致教育',
    billing_address: address('芬丘奇街 20 号', '伦敦'),
    description: '一家高等教育科技公司，正在把招生、学生成功和校友工作流整合到一起。',
  },
  'Apex Logistics': {
    name: '顶点物流',
    billing_address: address('滨海大道 10 号 #30-01', '新加坡'),
    description: '一家快速成长的物流服务商，正在为运营和商务团队评估现代化的数据中台。',
  },
};

/** The Chinese name of the account an English row names. */
export const zhAccountName = zhKey('account', ACCOUNTS_ZH, 'name');

export const accountsZhCN = zhCNTwin(accounts, {
  words: ACCOUNTS_ZH,
  text: ['name', 'description'],
  map: (twin, english) => ({
    ...twin,
    billing_address: { ...(english.billing_address as object), ...(twin.billing_address as object) },
  }),
});

// ─── Contacts ─────────────────────────────────────────────────────────

const person = (last_name: string, first_name: string, email: string, title?: string) => ({
  last_name, first_name, email, ...(title ? { title } : {}),
});

const CONTACTS_ZH: Record<string, Record<string, unknown>> = {
  'john.smith@acme.example.com': person('张', '伟', 'zhang.wei@acme.example.com', '工程副总裁'),
  'sarah.j@globex.example.com': person('王', '静', 'wang.jing@globex.example.com', '首席采购官'),
  'mchen@initech.example.com': person('陈', '明', 'chen.ming@initech.example.com', '运营总监'),
  'emily.d@starkmed.example.com': person('李', '娜', 'li.na@starkmed.example.com', '合作伙伴关系负责人'),
  'rwilson@wayne.example.com': person('刘', '强', 'liu.qiang@wayne.example.com', '首席技术官'),
  'olivia.chen@northwind.example.com': person('陈', '晓雯', 'chen.xiaowen@northwind.example.com', '数字化运营副总裁'),
  'ethan.brooks@vertex.example.com': person('赵', '磊', 'zhao.lei@vertex.example.com', '首席营收官'),
  'priya.shah@lattice.example.com': person('孙', '悦', 'sun.yue@lattice.example.com', '学生成功副总裁'),
  'marcus.reed@apexlogistics.example.com': person('周', '涛', 'zhou.tao@apexlogistics.example.com', '商务系统总监'),
};

/** The Chinese email of the contact an English row names. */
export const zhContactEmail = zhKey('contact', CONTACTS_ZH, 'email');

/** The Chinese full name of an English contact, as a signature reads it (family name first). */
export const zhContactName = (englishEmail: string): string => {
  const words = CONTACTS_ZH[englishEmail];
  if (!words) throw new Error(`Seed error: no zh-CN contact for ${JSON.stringify(englishEmail)}`);
  return `${String(words.last_name)}${String(words.first_name)}`;
};

export const contactsZhCN = zhCNTwin(contacts, {
  key: (r) => String(r.email),
  words: CONTACTS_ZH,
  text: ['first_name', 'last_name', 'email', 'title'],
  refs: { crm_account: zhAccountName },
});

// ─── Leads ────────────────────────────────────────────────────────────

const lead = (
  last_name: string, first_name: string, company: string, email: string,
  extra: Record<string, unknown> = {},
) => ({ last_name, first_name, company, email, ...extra });

const TITLE = {
  vpOps: '运营副总裁',
  headIt: 'IT 负责人',
  salesDir: '销售总监',
  coo: '首席运营官',
  procurement: '采购负责人',
} as const;

const evaluating = (channel: string, operation: string) =>
  `${channel}进来的线索。正在评估 CRM，想用它替代${operation}业务里的电子表格。`;

const LEADS_ZH: Record<string, Record<string, unknown>> = {
  'alice@nextgenretail.example.com': lead('马', '丽华', '新世代零售', 'ma.lihua@nextgenretail.example.com'),
  'dkim@edutechlabs.example.com': lead('金', '志远', '智学科技实验室', 'jin.zhiyuan@edutechlabs.example.com'),
  'lisa.t@cloudfirst.example.com': lead('唐', '莉', '云先科技有限公司', 'tang.li@cloudfirst.example.com'),
  'noah.patel@vertexanalytics.example.com': lead('潘', '浩', '维特分析', 'pan.hao@vertexanalytics.example.com', {
    title: TITLE.vpOps, description: evaluating('官网咨询', '技术运营'),
  }),
  'maya.singh@bluepeaklogistics.example.com': lead('宋', '美雅', '蓝峰物流', 'song.meiya@bluepeaklogistics.example.com', {
    title: TITLE.headIt, description: evaluating('客户转介绍', '物流'),
  }),
  'owen.becker@northwindenergy.example.com': lead('白', '文博', '北风能源', 'bai.wenbo@northwindenergy.example.com', {
    title: TITLE.salesDir, description: evaluating('线下活动', '能源'),
  }),
  'sara.lopez@heliossolar.example.com': lead('罗', '莎', '曦阳光伏', 'luo.sha@heliossolar.example.com', {
    title: TITLE.coo, description: evaluating('合作伙伴推荐', '能源'),
    notes: '本财年没有批准的预算，下个规划周期再跟进。',
  }),
  'leo.vance@cleancart.example.com': lead('范', '立', '净购商城', 'fan.li@cleancart.example.com', {
    title: TITLE.procurement, description: evaluating('官网咨询', '零售'),
  }),
  'iris.okafor@pulsehealth.example.com': lead('欧阳', '慧', '脉动健康', 'ouyang.hui@pulsehealth.example.com', {
    title: TITLE.vpOps, description: evaluating('电话陌拜', '医疗'),
  }),
  'ravi.mehta@foundryrobotics.example.com': lead('梅', '睿', '铸造机器人', 'mei.rui@foundryrobotics.example.com', {
    title: TITLE.headIt, description: evaluating('线下活动', '制造'),
  }),
  'tess.brown@latticeeducation.example.com': lead('谭', '婷', '格致教育', 'tan.ting@latticeeducation.example.com', {
    title: TITLE.salesDir, description: evaluating('客户转介绍', '教育'),
    notes: '需求超出了产品目前覆盖的范围。',
  }),
  'marco.ricci@auroratravel.example.com': lead('黎', '明轩', '极光旅行', 'li.mingxuan@auroratravel.example.com', {
    title: TITLE.coo, description: evaluating('广告投放', '酒店旅游'),
  }),
  'pia.anand@citrinefinance.example.com': lead('安', '琪', '黄晶金融', 'an.qi@citrinefinance.example.com', {
    title: TITLE.procurement, description: evaluating('合作伙伴推荐', '金融'),
  }),
  'jonas.holt@polarcargo.example.com': lead('何', '俊', '极地货运', 'he.jun@polarcargo.example.com', {
    title: TITLE.vpOps, description: evaluating('官网咨询', '物流'),
  }),
  'anya.volkov@redoakrealty.example.com': lead('魏', '安雅', '红橡地产', 'wei.anya@redoakrealty.example.com', {
    title: TITLE.headIt, description: evaluating('电话陌拜', '房地产'),
    notes: '对接人对采购决策没有话语权，也找不到能拍板的人。',
  }),
  'theo.park@skylinemedia.example.com': lead('方', '天宇', '天际传媒', 'fang.tianyu@skylinemedia.example.com', {
    title: TITLE.salesDir, description: evaluating('广告投放', '传媒'),
  }),
  'wren.garcia@maplebakerygroup.example.com': lead('高', '雯', '枫叶烘焙集团', 'gao.wen@maplebakerygroup.example.com', {
    title: TITLE.coo, description: evaluating('线下活动', '零售'),
  }),
  'hugo.dubois@nimbusaerospace.example.com': lead('杜', '宇', '云霄航空航天', 'du.yu@nimbusaerospace.example.com', {
    title: TITLE.procurement, description: evaluating('客户转介绍', '制造'),
  }),
  'lena.fischer@graniteinsurance.example.com': lead('费', '琳', '磐石保险', 'fei.lin@graniteinsurance.example.com', {
    title: TITLE.vpOps, description: evaluating('合作伙伴推荐', '金融'),
    notes: '四周内通过邮件和电话联系了六次，一直没有回复。',
  }),
  'kai.watanabe@coralreefhotels.example.com': lead('吴', '凯', '珊瑚礁酒店', 'wu.kai@coralreefhotels.example.com', {
    title: TITLE.headIt, description: evaluating('官网咨询', '酒店旅游'),
  }),
  'mira.costa@atlasconstruction.example.com': lead('柯', '敏', '擎天建设', 'ke.min@atlasconstruction.example.com', {
    title: TITLE.salesDir, description: evaluating('电话陌拜', '工程建设'),
  }),
};

/** The Chinese email of the lead an English row names. */
export const zhLeadEmail = zhKey('lead', LEADS_ZH, 'email');

export const leadsZhCN = zhCNTwin(leads, {
  key: (r) => String(r.email),
  words: LEADS_ZH,
  text: ['first_name', 'last_name', 'company', 'email', 'title', 'description', 'notes'],
});

// ─── Campaign names and case subjects other packages' rows point at ───

const CAMPAIGN_NAMES_ZH: Record<string, string> = {
  'Q3 Enterprise Email Nurture': '第三季度企业客户邮件培育',
  'Executive AI Governance Roundtable': '高管 AI 治理圆桌会',
  'Cloud Migration Webinar': '云迁移网络研讨会',
  'Operations Platform Launch': '运营平台发布活动',
  'Partner Operations Roadshow': '合作伙伴运营巡回路演',
  'SaaSCon 2026 Trade Show': 'SaaSCon 2026 行业展会',
  'Developer Content Marketing Push': '开发者内容营销推广',
};

/** The Chinese name of the campaign an English row names (the marketing twin's names too). */
export const zhCampaignName = zhLookup('campaign', CAMPAIGN_NAMES_ZH);

const CASE_SUBJECTS_ZH: Record<string, string> = {
  'Login issues after platform upgrade': '平台升级后无法登录',
  'Request: bulk import via CSV': '需求：支持通过 CSV 批量导入',
};

/**
 * The Chinese subject of a case a SALES row points at (tasks and events). Only
 * those cases are here; the service twin reads its subjects for them from this
 * map, so the two cannot drift apart.
 */
export const zhCaseSubject = zhLookup('case subject', CASE_SUBJECTS_ZH);

// ─── Opportunities ────────────────────────────────────────────────────

const OPPORTUNITIES_ZH: Record<string, Record<string, unknown>> = {
  'Acme Platform Upgrade': {
    name: '艾克美平台升级',
    description: '北美和欧洲中东非洲团队从标准版升级到企业版。驱动因素：（1）客户内部合规审查后，'
      + 'AI 智能体治理成为硬性要求；（2）运营部门需要高级分析席位；（3）需要优先支持 SLA。',
    next_step: '本周五前把修订后的方案（企业版、18 个月期限、多年期 12% 折扣）发给彭嘉华。'
      + '与对方合规团队的 AI 治理研讨会已经约好，邀请也已发出。',
  },
  'Globex Manufacturing Suite': { name: '环球工业制造套件' },
  'Wayne Enterprise License': { name: '韦恩企业级许可' },
  'Initech Cloud Migration': { name: '英泰科技云迁移' },
  'Acme Annual Renewal 2025': {
    name: '艾克美 2025 年度续约',
    description: '艾克美标准版订阅的年度续约，比续约日提前两周签署。欧洲中东非洲新团队带来席位扩容，'
      + '同比增长 22%。这一轮没有选多年期方案，他们想先看平台升级的效果。',
  },
  'Stark Medical Pilot': { name: '斯塔克医疗试点' },
  'Wayne Q1 Expansion': { name: '韦恩企业第一季度扩容' },
  'Globex Training Package': { name: '环球工业培训套餐' },
  'Initech Phase 1': { name: '英泰科技一期' },
  'Lattice Analytics Expansion': {
    name: '格致教育分析扩展',
    description: '面向招生和校友互动的分析套餐，来自企业客户培育线索。',
  },
  'Wayne Operations Module Rollout': {
    name: '韦恩企业运营模块推广',
    description: '为两个制造事业部上线运营模块，在运营平台发布活动后签单。',
  },
  'Vertex Developer Platform Adoption': {
    name: '维特分析开发者平台采用',
    description: '技术内容系列推出后，三个产品团队采用了开发者平台。',
  },
  'Acme Add-on (Lost)': {
    name: '艾克美增购模块（输单）',
    description: '想通过陌生外呼加购营销云模块。丢单原因：艾克美的市场部已经签了两年的 HubSpot 合同。'
      + '等那份合同续约时再跟进，那才是采购窗口。',
    loss_details: '市场部被两年的 HubSpot 合同锁定，合同续约时才有采购窗口。',
  },
  'Stark Expansion (Lost)': {
    name: '斯塔克医疗扩容（输单）',
    loss_details: '本财年剩余时间内，非临床系统的资本支出全部冻结。',
  },
  'Globex Line Expansion (Lost)': {
    name: '环球工业产线扩展（输单）',
    description: '扩展到另外两条产线，因捆绑销售输给了现有的 MES 供应商。',
    loss_details: '现有 MES 供应商把新增的两条产线并入了已有的框架协议。',
  },
  'Northwind Field Service Pilot (Lost)': {
    name: '北风能源现场服务试点（输单）',
    description: '面向抄表班组的现场服务试点，在价格上输给了更便宜的单点方案。',
    loss_details: '按技术人员计价比运营总监批准的预算高出约 30%。',
  },
  'Apex Compliance Reporting (Lost)': {
    name: '顶点物流合规报表（输单）',
    description: '面向车队合规团队的监管报表包，因缺少审计追踪能力而丢单。',
    loss_details: '没有原生的工时审计追踪，合规团队无法签字确认。',
  },
  'Northwind Grid Modernization': {
    name: '北风能源电网现代化',
    description: '一场高管网络研讨会之后，北风能源正在评估统一的电网现代化项目。',
    next_step: '确认需求调研的参与人员，并就运营数据评估的范围达成一致。',
  },
  'Lattice Student Success Platform': {
    name: '格致教育学生成功平台',
    description: '一个新的学生成功项目，来自高等教育内容系列。',
    next_step: '邀请运营方面的发起人参加需求调研研讨会。',
  },
  'Vertex Analytics Expansion': {
    name: '维特分析扩展',
    description: '维特分析想把平台从数据团队扩展到整个营收部门。',
    next_step: '确认采购委员会成员、预算负责人和扩展时间表。',
  },
  'Apex Logistics Data Hub': {
    name: '顶点物流数据中台',
    description: '顶点物流在启动数据中台项目之前，正在梳理分散的商务系统。',
    next_step: '完成架构研讨会，并量化待集成的工作量。',
  },
  'Lattice Education Renewal': {
    name: '格致教育续约',
    description: '续约方案增加了学生成功自动化和扩展版分析套餐。',
    next_step: '在与高管发起人开会之前，先和采购一起过一遍两年期方案。',
  },
  'Vertex Enterprise Rollout': {
    name: '维特分析企业级部署',
    description: '企业级部署的第一阶段，围绕分阶段上线和数据驻留要求进行谈判。',
    next_step: '敲定最后的安全附录，并确认采购签字日期。',
  },
};

/** The Chinese name of the opportunity an English row names. */
export const zhOpportunityName = zhKey('opportunity', OPPORTUNITIES_ZH, 'name');

export const opportunitiesZhCN = zhCNTwin(opportunities, {
  words: OPPORTUNITIES_ZH,
  text: ['name', 'description', 'next_step', 'loss_details'],
  refs: { crm_account: zhAccountName, primary_contact: zhContactEmail, crm_campaign: zhCampaignName },
});
