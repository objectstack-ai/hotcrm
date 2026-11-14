// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

/**
 * The Simplified Chinese twins of the campaigns and their members (#2411). How
 * a twin is built: `src/sales/data/_locale.ts`.
 *
 * A campaign's Chinese NAME lives in `src/sales/data/sales.zh-CN.seed.ts`,
 * because the sales opportunities point at campaigns by name and sales may not
 * import from this package. The descriptions are authored here.
 */
import { campaigns, campaignMembersFromLeads, campaignMembersFromContacts } from './marketing.seed';
import { zhCNTwin } from '../../sales/data/_locale';
import { zhCampaignName, zhContactEmail, zhLeadEmail } from '../../sales/data/sales.zh-CN.seed';

const CAMPAIGN_DESCRIPTIONS_ZH: Record<string, string> = {
  'Q3 Enterprise Email Nurture': '面向正在评估 AI 治理和分析能力的企业 IT 决策者，开展多轮邮件培育。',
  'Executive AI Governance Roundtable': '一场线下高管圆桌会，主题是在治理、可审计和可信的前提下运营 AI 智能体。',
  'Cloud Migration Webinar': '一场技术网络研讨会，讲如何把客户运营和数据工作流迁到云上并完成现代化改造。',
  'Operations Platform Launch': '运营平台的发布活动，把产品内容和客户案例结合起来推广。',
  'Partner Operations Roadshow': '与战略合作伙伴联合举办的区域巡回活动，面向运营和 IT 负责人。',
  'SaaSCon 2026 Trade Show': '在 SaaSCon 行业大会上的重点展位、高管晚宴和客户故事分享。',
  'Developer Content Marketing Push': '技术博客、视频教程和开发者社区运营，已于上个月完成。',
};

export const campaignsZhCN = zhCNTwin(campaigns, {
  words: Object.fromEntries(Object.entries(CAMPAIGN_DESCRIPTIONS_ZH).map(([name, description]) => [
    name, { name: zhCampaignName(name), description },
  ])),
  text: ['name', 'description'],
});

export const campaignMembersFromLeadsZhCN = zhCNTwin(campaignMembersFromLeads, {
  refs: { crm_campaign: zhCampaignName, crm_lead: zhLeadEmail },
});

export const campaignMembersFromContactsZhCN = zhCNTwin(campaignMembersFromContacts, {
  refs: { crm_campaign: zhCampaignName, crm_contact: zhContactEmail },
});
