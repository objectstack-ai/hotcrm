import { describe, it, expect } from 'vitest';
import { MCPToolSchema, MCPResourceSchema } from '@objectstack/spec/ai';
import { FlowSchema, ConnectorSchema } from '@objectstack/spec/automation';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';
import { EmailTemplateSchema, JobSchema } from '@objectstack/spec/system';
import { ActionSchema } from '@objectstack/spec/ui';
import {
  GetInvoiceTool,
  RecordPaymentTool,
  CalculateRevenueTool,
  GetArAgingTool,
} from '../../../src/finance_mcp_tools.mcp';
import {
  InvoiceAgingSummaryResource,
} from '../../../src/finance_mcp_resources.mcp';
import { InvoiceCollectionFlow } from '../../../src/invoice_collection.flow';
import {
  FinanceAccountantAccess,
  FinanceControllerAccess,
  FinanceAuditorAccess,
} from '../../../src/finance_rls.security';
import { PaymentConnector } from '../../../src/payment_connector.connector';
import {
  invoiceSent,
  paymentReceived,
  paymentOverdueReminder,
  monthlyStatement,
} from '../../../src/finance_email_templates.notification';
import {
  dailyRevenueRecognition,
  weeklyArAgingUpdate,
  monthlyCloseTasks,
} from '../../../src/finance_jobs.schedule';
import {
  CreateInvoiceAction,
  RecordPaymentAction,
  SendReminderAction,
} from '../../../src/finance_actions.action_ui';

// ---------------------------------------------------------------------------
// MCP Tools
// ---------------------------------------------------------------------------

describe('Finance MCP Tools Metadata Compliance', () => {
  const tools = [
    { name: 'GetInvoiceTool', tool: GetInvoiceTool },
    { name: 'RecordPaymentTool', tool: RecordPaymentTool },
    { name: 'CalculateRevenueTool', tool: CalculateRevenueTool },
    { name: 'GetArAgingTool', tool: GetArAgingTool },
  ];

  it('should export a collection of tools', () => {
    expect(tools.length).toBeGreaterThan(0);
  });

  describe.each(tools)('$name', ({ tool }) => {
    it('should be defined', () => {
      expect(tool).toBeDefined();
    });

    it('should validate against MCPToolSchema', () => {
      expect(() => MCPToolSchema.parse(tool)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// MCP Resources
// ---------------------------------------------------------------------------

describe('Finance MCP Resources Metadata Compliance', () => {
  const resources = [
    { name: 'InvoiceAgingSummaryResource', resource: InvoiceAgingSummaryResource },
  ];

  it('should export a collection of resources', () => {
    expect(resources.length).toBeGreaterThan(0);
  });

  describe.each(resources)('$name', ({ resource }) => {
    it('should be defined', () => {
      expect(resource).toBeDefined();
    });

    it('should validate against MCPResourceSchema', () => {
      expect(() => MCPResourceSchema.parse(resource)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

describe('Finance Flow Metadata Compliance', () => {
  const flows = [
    { name: 'InvoiceCollectionFlow', flow: InvoiceCollectionFlow },
  ];

  describe.each(flows)('$name', ({ flow }) => {
    it('should be defined', () => {
      expect(flow).toBeDefined();
    });

    it('should validate against FlowSchema', () => {
      expect(() => FlowSchema.parse(flow)).not.toThrow();
    });

    it('should have nodes array', () => {
      expect(Array.isArray(flow.nodes)).toBe(true);
      expect(flow.nodes.length).toBeGreaterThan(0);
    });

    it('should have edges array', () => {
      expect(Array.isArray(flow.edges)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// RLS Policies
// ---------------------------------------------------------------------------

describe('Finance RLS Policies Metadata Compliance', () => {
  const policies = [
    { name: 'FinanceAccountantAccess', policy: FinanceAccountantAccess },
    { name: 'FinanceControllerAccess', policy: FinanceControllerAccess },
    { name: 'FinanceAuditorAccess', policy: FinanceAuditorAccess },
  ];

  describe.each(policies)('$name', ({ policy }) => {
    it('should be defined', () => {
      expect(policy).toBeDefined();
    });

    it('should validate against RowLevelSecurityPolicySchema', () => {
      expect(() => RowLevelSecurityPolicySchema.parse(policy)).not.toThrow();
    });

    it('should have a snake_case name', () => {
      expect(policy.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should have roles array', () => {
      expect(Array.isArray(policy.roles)).toBe(true);
      expect(policy.roles.length).toBeGreaterThan(0);
    });

    it('should be enabled', () => {
      expect(policy.enabled).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Connector
// ---------------------------------------------------------------------------

describe('Finance Connector Metadata Compliance', () => {
  describe('PaymentConnector', () => {
    it('should be defined', () => {
      expect(PaymentConnector).toBeDefined();
    });

    it('should validate against ConnectorSchema', () => {
      expect(() => ConnectorSchema.parse(PaymentConnector)).not.toThrow();
    });

    it('should have operations array', () => {
      expect(Array.isArray(PaymentConnector.operations)).toBe(true);
      expect(PaymentConnector.operations.length).toBeGreaterThan(0);
    });

    it('should have authentication config', () => {
      expect(PaymentConnector.authentication).toBeDefined();
      expect(PaymentConnector.authentication.type).toBe('apiKey');
    });

    it('should have triggers array', () => {
      expect(Array.isArray(PaymentConnector.triggers)).toBe(true);
      expect(PaymentConnector.triggers!.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

describe('Finance Email Templates Metadata Compliance', () => {
  const templates = [
    { name: 'invoiceSent', template: invoiceSent },
    { name: 'paymentReceived', template: paymentReceived },
    { name: 'paymentOverdueReminder', template: paymentOverdueReminder },
    { name: 'monthlyStatement', template: monthlyStatement },
  ];

  describe.each(templates)('$name', ({ template }) => {
    it('should be defined', () => {
      expect(template).toBeDefined();
    });

    it('should validate against EmailTemplateSchema', () => {
      expect(() => EmailTemplateSchema.parse(template)).not.toThrow();
    });

    it('should have a subject', () => {
      const subj = typeof template.subject === 'string' ? template.subject : (template.subject as any).source;
      expect(typeof subj).toBe('string');
      expect(subj.length).toBeGreaterThan(0);
    });

    it('should have a body', () => {
      const bd = typeof template.body === 'string' ? template.body : (template.body as any).source;
      expect(typeof bd).toBe('string');
      expect(bd.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Scheduled Jobs
// ---------------------------------------------------------------------------

describe('Finance Scheduled Jobs Metadata Compliance', () => {
  const jobs = [
    { name: 'dailyRevenueRecognition', job: dailyRevenueRecognition },
    { name: 'weeklyArAgingUpdate', job: weeklyArAgingUpdate },
    { name: 'monthlyCloseTasks', job: monthlyCloseTasks },
  ];

  describe.each(jobs)('$name', ({ job }) => {
    it('should be defined', () => {
      expect(job).toBeDefined();
    });

    it('should validate against JobSchema', () => {
      expect(() => JobSchema.parse(job)).not.toThrow();
    });

    it('should have a snake_case name', () => {
      expect(job.name).toMatch(/^[a-z][a-z0-9_]*$/);
    });

    it('should be enabled', () => {
      expect(job.enabled).toBe(true);
    });

    it('should have a valid schedule', () => {
      expect(job.schedule).toBeDefined();
      expect(['cron', 'interval']).toContain(job.schedule.type);
      if (job.schedule.type === 'cron') {
        const exprVal = typeof job.schedule.expression === 'string' ? job.schedule.expression : (job.schedule.expression as any).source;
        expect(typeof exprVal).toBe('string');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

describe('Finance Actions Metadata Compliance', () => {
  const actions = [
    { name: 'CreateInvoiceAction', action: CreateInvoiceAction },
    { name: 'RecordPaymentAction', action: RecordPaymentAction },
    { name: 'SendReminderAction', action: SendReminderAction },
  ];

  it('should export a collection of actions', () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  describe.each(actions)('$name', ({ action }) => {
    it('should be defined', () => {
      expect(action).toBeDefined();
    });

    it('should validate against ActionSchema', () => {
      expect(() => ActionSchema.parse(action)).not.toThrow();
    });
  });
});
