import { describe, it, expect } from 'vitest';
import { MCPToolSchema, MCPResourceSchema } from '@objectstack/spec/ai';
import { FlowSchema } from '@objectstack/spec/automation';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';
import { EmailTemplateSchema, JobSchema } from '@objectstack/spec/system';
import { ActionSchema, WidgetManifestSchema } from '@objectstack/spec/ui';
import {
  SearchCasesTool,
  EscalateCaseTool,
  GetKnowledgeArticleTool,
  SuggestResolutionTool,
} from '../../../src/support_mcp_tools.mcp';
import {
  KnowledgeBaseResource,
  CaseQueueResource,
  SlaDashboardResource,
} from '../../../src/support_mcp_resources.mcp';
import { CaseEscalationFlow } from '../../../src/case_escalation.flow';
import {
  SupportAgentAccess,
  SupportSupervisorAccess,
  SupportAdminAccess,
} from '../../../src/support_rls.security';
import {
  caseCreatedConfirmation,
  caseResolved,
  csatSurvey,
  slaWarning,
} from '../../../src/support_email_templates.notification';
import {
  hourlySlaCheck,
  dailyCaseRebalance,
  weeklyCsatDigest,
} from '../../../src/support_jobs.schedule';
import {
  EscalateCaseAction,
  MergeCasesAction,
  CreateKnowledgeArticleAction,
} from '../../../src/support_actions.action_ui';
import { SlaWidget } from '../../../src/sla_widget.widget';

// ---------------------------------------------------------------------------
// MCP Tools
// ---------------------------------------------------------------------------

describe('Support MCP Tools Metadata Compliance', () => {
  const tools = [
    { name: 'SearchCasesTool', tool: SearchCasesTool },
    { name: 'EscalateCaseTool', tool: EscalateCaseTool },
    { name: 'GetKnowledgeArticleTool', tool: GetKnowledgeArticleTool },
    { name: 'SuggestResolutionTool', tool: SuggestResolutionTool },
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

describe('Support MCP Resources Metadata Compliance', () => {
  const resources = [
    { name: 'KnowledgeBaseResource', resource: KnowledgeBaseResource },
    { name: 'CaseQueueResource', resource: CaseQueueResource },
    { name: 'SlaDashboardResource', resource: SlaDashboardResource },
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

describe('Support Flow Metadata Compliance', () => {
  const flows = [
    { name: 'CaseEscalationFlow', flow: CaseEscalationFlow },
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

describe('Support RLS Policies Metadata Compliance', () => {
  const policies = [
    { name: 'SupportAgentAccess', policy: SupportAgentAccess },
    { name: 'SupportSupervisorAccess', policy: SupportSupervisorAccess },
    { name: 'SupportAdminAccess', policy: SupportAdminAccess },
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
// Email Templates
// ---------------------------------------------------------------------------

describe('Support Email Templates Metadata Compliance', () => {
  const templates = [
    { name: 'caseCreatedConfirmation', template: caseCreatedConfirmation },
    { name: 'caseResolved', template: caseResolved },
    { name: 'csatSurvey', template: csatSurvey },
    { name: 'slaWarning', template: slaWarning },
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

describe('Support Scheduled Jobs Metadata Compliance', () => {
  const jobs = [
    { name: 'hourlySlaCheck', job: hourlySlaCheck },
    { name: 'dailyCaseRebalance', job: dailyCaseRebalance },
    { name: 'weeklyCsatDigest', job: weeklyCsatDigest },
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
// UI Actions
// ---------------------------------------------------------------------------

describe('Support Actions Metadata Compliance', () => {
  const actions = [
    { name: 'EscalateCaseAction', action: EscalateCaseAction },
    { name: 'MergeCasesAction', action: MergeCasesAction },
    { name: 'CreateKnowledgeArticleAction', action: CreateKnowledgeArticleAction },
  ];

  describe.each(actions)('$name', ({ action }) => {
    it('should be defined', () => {
      expect(action).toBeDefined();
    });

    it('should validate against ActionSchema', () => {
      expect(() => ActionSchema.parse(action)).not.toThrow();
    });
  });
});

// ---------------------------------------------------------------------------
// Widget
// ---------------------------------------------------------------------------

describe('Support Widget Metadata Compliance', () => {
  describe('SlaWidget', () => {
    it('should be defined', () => {
      expect(SlaWidget).toBeDefined();
    });

    it('should validate against WidgetManifestSchema', () => {
      expect(() => WidgetManifestSchema.parse(SlaWidget)).not.toThrow();
    });
  });
});
