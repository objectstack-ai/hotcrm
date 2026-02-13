import { describe, it, expect } from 'vitest';
import { ReportSchema } from '@objectstack/spec/ui';
import { FlowSchema } from '@objectstack/spec/automation';
import { MCPToolSchema } from '@objectstack/spec/ai';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';
import { EmailTemplateSchema, JobSchema } from '@objectstack/spec/system';

// -- Reports --
import { PipelineReport } from '../../src/pipeline_report.report';
import { RevenueReport } from '../../../finance/src/revenue_report.report';

// -- Flows --
import { DealCloseFlow } from '../../src/deal_close.flow';
import { CaseEscalationFlow } from '../../../support/src/case_escalation.flow';
import { InvoiceCollectionFlow } from '../../../finance/src/invoice_collection.flow';

// -- MCP Tools --
import {
  SearchAccountsTool,
  GetOpportunityTool,
  UpdateDealStageTool,
  CreateActivityTool,
} from '../../src/crm_mcp_tools.mcp';
import {
  GetInvoiceTool,
  RecordPaymentTool,
  CalculateRevenueTool,
  GetArAgingTool,
} from '../../../finance/src/finance_mcp_tools.mcp';
import {
  SearchCasesTool,
  EscalateCaseTool,
  GetKnowledgeArticleTool,
  SuggestResolutionTool,
} from '../../../support/src/support_mcp_tools.mcp';

// -- RLS Policies --
import { CrmRepAccess, CrmManagerAccess, CrmExecAccess } from '../../src/crm_rls.security';
import { FinanceAccountantAccess, FinanceControllerAccess, FinanceAuditorAccess } from '../../../finance/src/finance_rls.security';
import { SupportAgentAccess, SupportSupervisorAccess, SupportAdminAccess } from '../../../support/src/support_rls.security';
import { HrEmployeeAccess, HrManagerAccess, HrAdminAccess } from '../../../hr/src/hr_rls.security';

// -- Email Templates --
import { welcomeEmail, dealWonNotification, quoteApprovalRequest, meetingReminder } from '../../src/crm_email_templates.notification';
import { invoiceSent, paymentReceived, paymentOverdueReminder, monthlyStatement } from '../../../finance/src/finance_email_templates.notification';
import { caseCreatedConfirmation, caseResolved, csatSurvey, slaWarning } from '../../../support/src/support_email_templates.notification';
import { offerLetter, onboardingWelcome, ptoApproved, performanceReviewReminder } from '../../../hr/src/hr_email_templates.notification';

// -- Scheduled Jobs --
import { dailyForecastRecalc, weeklyPipelineDigest, monthlyTerritoryRebalance } from '../../src/crm_jobs.schedule';
import { dailyRevenueRecognition, weeklyArAgingUpdate, monthlyCloseTasks } from '../../../finance/src/finance_jobs.schedule';
import { hourlySlaCheck, dailyCaseRebalance, weeklyCsatDigest } from '../../../support/src/support_jobs.schedule';
import { dailyLeadScoring, weeklyCampaignReport, hourlyEmailQueue } from '../../../marketing/src/marketing_jobs.schedule';

// ===================================================================
// 1. Cross-Cloud Report Columns
// ===================================================================
describe('Cross-Cloud Report Columns', () => {
  const reports = [
    { name: 'PipelineReport', report: PipelineReport },
    { name: 'RevenueReport', report: RevenueReport },
  ];

  it.each(reports)('$name has a valid objectName', ({ report }) => {
    expect(report.objectName).toBeDefined();
    expect(typeof report.objectName).toBe('string');
    expect(report.objectName.length).toBeGreaterThan(0);
  });

  it.each(reports)('$name passes ReportSchema validation', ({ report }) => {
    expect(() => ReportSchema.parse(report)).not.toThrow();
  });

  it.each(reports)('$name has column fields defined', ({ report }) => {
    expect(report.columns).toBeDefined();
    expect(report.columns.length).toBeGreaterThan(0);
    for (const col of report.columns) {
      expect(col.field).toBeDefined();
      expect(typeof col.field).toBe('string');
    }
  });
});

// ===================================================================
// 2. Cross-Cloud Flow References
// ===================================================================
describe('Cross-Cloud Flow References', () => {
  const flows = [
    { name: 'DealCloseFlow', flow: DealCloseFlow },
    { name: 'CaseEscalationFlow', flow: CaseEscalationFlow },
    { name: 'InvoiceCollectionFlow', flow: InvoiceCollectionFlow },
  ];

  it.each(flows)('$name validates against FlowSchema', ({ flow }) => {
    expect(() => FlowSchema.parse(flow)).not.toThrow();
  });

  it.each(flows)('$name has proper node types including start and end', ({ flow }) => {
    const nodeTypes = flow.nodes.map((n) => n.type);
    expect(nodeTypes).toContain('start');
    expect(nodeTypes).toContain('end');
  });

  it.each(flows)('$name has at least one decision or action node', ({ flow }) => {
    const actionTypes = flow.nodes.filter(
      (n) => n.type !== 'start' && n.type !== 'end',
    );
    expect(actionTypes.length).toBeGreaterThan(0);
  });
});

// ===================================================================
// 3. Cross-Cloud MCP Tools
// ===================================================================
describe('Cross-Cloud MCP Tools', () => {
  const allTools = [
    SearchAccountsTool,
    GetOpportunityTool,
    UpdateDealStageTool,
    CreateActivityTool,
    GetInvoiceTool,
    RecordPaymentTool,
    CalculateRevenueTool,
    GetArAgingTool,
    SearchCasesTool,
    EscalateCaseTool,
    GetKnowledgeArticleTool,
    SuggestResolutionTool,
  ];

  it.each(allTools.map((t) => ({ name: t.name, tool: t })))(
    '$name validates against MCPToolSchema',
    ({ tool }) => {
      expect(() => MCPToolSchema.parse(tool)).not.toThrow();
    },
  );

  it('tool names are unique across clouds', () => {
    const names = allTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

// ===================================================================
// 4. Cross-Cloud RLS Policies
// ===================================================================
describe('Cross-Cloud RLS Policies', () => {
  const allPolicies = [
    CrmRepAccess,
    CrmManagerAccess,
    CrmExecAccess,
    FinanceAccountantAccess,
    FinanceControllerAccess,
    FinanceAuditorAccess,
    SupportAgentAccess,
    SupportSupervisorAccess,
    SupportAdminAccess,
    HrEmployeeAccess,
    HrManagerAccess,
    HrAdminAccess,
  ];

  it.each(allPolicies.map((p) => ({ name: p.name, policy: p })))(
    '$name validates against RowLevelSecurityPolicySchema',
    ({ policy }) => {
      expect(() => RowLevelSecurityPolicySchema.parse(policy)).not.toThrow();
    },
  );

  const cloudGroups = {
    crm: [CrmRepAccess, CrmManagerAccess, CrmExecAccess],
    finance: [FinanceAccountantAccess, FinanceControllerAccess, FinanceAuditorAccess],
    support: [SupportAgentAccess, SupportSupervisorAccess, SupportAdminAccess],
    hr: [HrEmployeeAccess, HrManagerAccess, HrAdminAccess],
  };

  it.each(Object.entries(cloudGroups))(
    '%s cloud has at least one admin-level and one user-level policy',
    (_cloud, policies) => {
      const adminLevel = policies.some(
        (p) => p.using === '1=1' || p.roles.some((r) => r.includes('admin') || r.includes('controller') || r.includes('exec')),
      );
      const userLevel = policies.some(
        (p) => p.using.includes('current_user_id()') && p.using !== '1=1',
      );
      expect(adminLevel).toBe(true);
      expect(userLevel).toBe(true);
    },
  );
});

// ===================================================================
// 5. Cross-Cloud Email Templates
// ===================================================================
describe('Cross-Cloud Email Templates', () => {
  const allTemplates = [
    welcomeEmail,
    dealWonNotification,
    quoteApprovalRequest,
    meetingReminder,
    invoiceSent,
    paymentReceived,
    paymentOverdueReminder,
    monthlyStatement,
    caseCreatedConfirmation,
    caseResolved,
    csatSurvey,
    slaWarning,
    offerLetter,
    onboardingWelcome,
    ptoApproved,
    performanceReviewReminder,
  ];

  it.each(allTemplates.map((t) => ({ id: t.id, template: t })))(
    '$id validates against EmailTemplateSchema',
    ({ template }) => {
      expect(() => EmailTemplateSchema.parse(template)).not.toThrow();
    },
  );

  it('template IDs are unique across clouds', () => {
    const ids = allTemplates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ===================================================================
// 6. Cross-Cloud Scheduled Jobs
// ===================================================================
describe('Cross-Cloud Scheduled Jobs', () => {
  const allJobs = [
    dailyForecastRecalc,
    weeklyPipelineDigest,
    monthlyTerritoryRebalance,
    dailyRevenueRecognition,
    weeklyArAgingUpdate,
    monthlyCloseTasks,
    hourlySlaCheck,
    dailyCaseRebalance,
    weeklyCsatDigest,
    dailyLeadScoring,
    weeklyCampaignReport,
    hourlyEmailQueue,
  ];

  it.each(allJobs.map((j) => ({ id: j.id, job: j })))(
    '$id validates against JobSchema',
    ({ job }) => {
      expect(() => JobSchema.parse(job)).not.toThrow();
    },
  );

  it('job IDs are unique across clouds', () => {
    const ids = allJobs.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
