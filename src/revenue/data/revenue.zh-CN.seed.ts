// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the opportunity line items, the quotes and
 * their lines (#2411). How a twin is built: `src/sales/data/_locale.ts`.
 *
 * A line's description is shared by an opportunity's lines and the quote that
 * prices the same deal, so the Chinese descriptions are one map, keyed by the
 * English description itself.
 */
import { opportunityLineItems } from './opportunity-line-item.seed';
import { quotes, quoteLineItems } from './revenue.seed';
import { zhCNTwin, zhKey, zhLookup } from '../../sales/data/_locale';
import { zhAccountName, zhContactEmail, zhOpportunityName } from '../../sales/data/sales.zh-CN.seed';
import { zhProductName } from './catalog.zh-CN.seed';

const LINE_DESCRIPTIONS_ZH: Record<string, string> = {
  'Enterprise edition — NA + EMEA production tenants (multi-year discount).': '企业版：北美和欧洲中东非洲的生产租户（多年期折扣）。',
  '24×7 premium support with a named TAM.': '7×24 小时高级支持，配专属技术客户经理。',
  'Agent seats for the Ops organization.': '运营部门的智能体席位。',
  'Enterprise edition — one shared tenant serving all six manufacturing sites.': '企业版：一个共享租户服务全部六个生产基地。',
  'Four workshop days, one per regional plant cluster.': '四天工作坊，每个区域工厂群一天。',
  'Business-hours support for the first year.': '第一年的工作时间支持。',
  'Agent seats for the plant operations leads.': '工厂运营负责人的智能体席位。',
  'Enterprise-wide license, volume discount at 20 tenants.': '全企业许可，20 个租户享批量折扣。',
  'Premium support across four business units.': '覆盖四个事业部的高级支持。',
  'Agent seats for the global revenue organization.': '全球营收部门的智能体席位。',
  'Migration off the legacy on-premise CRM.': '从本地部署的旧 CRM 迁出。',
  'Managed hosting, primary + DR region.': '托管部署，含主区域和灾备区域。',
  'Agent seats for the service desk.': '服务台的智能体席位。',
  'Renewal of the three production tenants.': '三个生产租户的续约。',
  'Premium support renewal.': '高级支持续约。',
  'Seat expansion driven by the new EMEA team.': '欧洲中东非洲新团队带来的席位扩容。',
  'Pilot tenants for two clinical service lines.': '两条临床服务线的试点租户。',
  'Standard support during the pilot.': '试点期间的标准支持。',
  'Six workshop days for the clinical operations admins.': '为临床运营管理员安排六天工作坊。',
  'Expansion into six additional subsidiaries.': '扩展到另外六家子公司。',
  'Premium support for the expanded footprint.': '扩展范围内的高级支持。',
  'Agent seats for the expansion teams.': '扩展团队的智能体席位。',
  'Ten workshop days across the plant admin community.': '面向各工厂管理员的十天工作坊。',
  'Agent seats for the training sandbox.': '培训沙箱的智能体席位。',
  'Phase 1 implementation: accounts, contacts, pipeline.': '一期实施：客户、联系人、销售管道。',
  'Standard support for phase 1.': '一期的标准支持。',
  'Agent seats for the phase-1 pilot group.': '一期试点小组的智能体席位。',
  'Marketing analytics for two business units.': '两个事业部的营销分析。',
  'Marketing-automation connector pack.': '营销自动化连接器包。',
  'Two sandboxes for the marketing build-out.': '营销系统搭建用的两个沙箱。',
  'Two additional clinical tenants.': '新增两个临床租户。',
  'Field service mobile for the device-servicing team.': '设备维修团队的现场服务移动端。',
  'Agent seats for the service coordinators.': '服务协调员的智能体席位。',
  'Two further production-line tenants.': '再增加两个产线租户。',
  'Connector pack for the line-control systems.': '对接产线控制系统的连接器包。',
  'Agent seats for the line supervisors.': '产线主管的智能体席位。',
  'Field-service mobile for the metering crews.': '抄表班组的现场服务移动端。',
  'Business-hours support during the pilot.': '试点期间的工作时间支持。',
  'Agent seats for the dispatch desk.': '调度台的智能体席位。',
  'Regulatory reporting pack for fleet compliance.': '车队合规的监管报表包。',
  'Sandbox for the compliance rule build-out.': '搭建合规规则用的沙箱。',
  'Agent seats for the compliance analysts.': '合规分析师的智能体席位。',
  'Enterprise edition for grid, field and customer operations.': '覆盖电网、现场和客户运营的企业版。',
  'Field-service mobile for the grid maintenance crews.': '电网检修班组的现场服务移动端。',
  'Sandbox for the operational-data assessment.': '运营数据评估用的沙箱。',
  'Agent seats for the control-room pilot.': '调度中心试点的智能体席位。',
  'Student-success tenants for the two pilot colleges.': '两所试点学院的学生成功租户。',
  'Two workshop days for the student-success advisers.': '为学生成功顾问安排两天工作坊。',
  'Agent seats for the advising team.': '辅导团队的智能体席位。',
  'Analytics for the sales and marketing teams.': '销售和市场团队的分析功能。',
  'Agent seats for the revenue operations team.': '营收运营团队的智能体席位。',
  'Data-hub tenant shared by commercial, operations and finance.': '商务、运营和财务共用的数据中台租户。',
  'Consolidation of four fragmented commercial systems.': '整合四套分散的商务系统。',
  'Agent seats for the commercial operations team.': '商务运营团队的智能体席位。',
  'Renewal of the institution-wide tenant.': '全校级租户的续约。',
  'Expanded analytics package for the renewal term.': '续约期内的扩展版分析套餐。',
  'Student-success automation seats.': '学生成功自动化席位。',
  'Phase-one tenant for the first region, with data-residency controls (multi-phase commitment discount).': '第一个区域的一期租户，含数据驻留控制（分阶段承诺折扣）。',
  'Phase-one migration of the regional revenue data.': '一期迁移该区域的营收数据。',
  'Business-hours support for phase one.': '一期的工作时间支持。',
  'Agent seats for the first rollout wave.': '第一批上线人员的智能体席位。',
  'Analytics for admissions and alumni engagement.': '招生和校友互动的分析功能。',
  'Analytics enablement day for the institutional-research team.': '为院校研究团队安排一天分析赋能。',
  'Agent seats for the admissions team.': '招生团队的智能体席位。',
  'Operations tenants for two manufacturing divisions.': '两个制造事业部的运营租户。',
  'Standard support for the operations rollout.': '运营模块推广期间的标准支持。',
  'Agent seats for the operations planners.': '运营计划员的智能体席位。',
  'Developer platform tenants for three product teams.': '三个产品团队的开发者平台租户。',
  'Connector pack for the internal data warehouse.': '对接内部数据仓库的连接器包。',
  'Product-usage analytics for the platform team.': '平台团队的产品使用分析。',
  'Agent seats for the developer-experience team.': '开发者体验团队的智能体席位。',
  'Five workshop days for the pilot clinical teams.': '为试点临床团队安排五天工作坊。',
  'Standard support for the pilot term.': '试点期内的标准支持。',
  'Agent seats for the pilot coordinators.': '试点协调员的智能体席位。',
};

const zhLineDescription = zhLookup('line description', LINE_DESCRIPTIONS_ZH);

export const opportunityLineItemsZhCN = zhCNTwin(opportunityLineItems, {
  refs: { crm_opportunity: zhOpportunityName, crm_product: zhProductName, description: zhLineDescription },
});

const QUOTES_ZH: Record<string, Record<string, unknown>> = {
  'Acme Platform Upgrade Quote': {
    name: '艾克美平台升级报价',
    description: '平台升级，已享 10% 老客户折扣。',
  },
  'Acme Annual Renewal 2025 Quote': {
    name: '艾克美 2025 年度续约报价',
    description: '年度续约：三个生产租户、高级支持，以及欧洲中东非洲团队的席位扩容。',
  },
  'Globex Manufacturing Suite Proposal': {
    name: '环球工业制造套件方案',
    description: '制造套件许可，含工厂管理员培训。',
  },
  'Wayne Enterprise License Quote': {
    name: '韦恩企业级许可报价',
    description: '多年期企业级许可，享批量折扣。',
  },
  'Initech Cloud Migration Estimate': {
    name: '英泰科技云迁移估价',
    description: '云迁移服务，等待对方内部评审。',
  },
  'Stark Medical Pilot Quote': {
    name: '斯塔克医疗试点报价',
    description: '试点项目报价，因预算限制被拒。',
    internal_notes: '客户要求缩小范围后重新报价。',
  },
};

export const quotesZhCN = zhCNTwin(quotes, {
  words: QUOTES_ZH,
  text: ['name', 'description', 'internal_notes'],
  refs: { crm_account: zhAccountName, crm_contact: zhContactEmail, crm_opportunity: zhOpportunityName },
});

export const quoteLineItemsZhCN = zhCNTwin(quoteLineItems, {
  refs: {
    crm_quote: zhKey('quote', QUOTES_ZH, 'name'),
    crm_product: zhProductName,
    description: zhLineDescription,
  },
});
