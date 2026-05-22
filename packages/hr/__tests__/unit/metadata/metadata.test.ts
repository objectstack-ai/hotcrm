import { describe, it, expect } from 'vitest';
import { MCPToolSchema } from '@objectstack/spec/ai';
import { FlowSchema } from '@objectstack/spec/automation';
import { RowLevelSecurityPolicySchema } from '@objectstack/spec/security';
import { EmailTemplateSchema } from '@objectstack/spec/system';
import { WidgetManifestSchema } from '@objectstack/spec/ui';
import {
  SearchEmployeesTool,
  GetOrgChartTool,
  CheckPtoBalanceTool,
  SubmitRequestTool,
} from '../../../src/hr_mcp_tools.mcp';
import { OnboardingFlow } from '../../../src/onboarding.flow';
import {
  HrEmployeeAccess,
  HrManagerAccess,
  HrAdminAccess,
} from '../../../src/hr_rls.security';
import {
  offerLetter,
  onboardingWelcome,
  ptoApproved,
  performanceReviewReminder,
} from '../../../src/hr_email_templates.notification';
import { HeadcountWidget } from '../../../src/headcount_widget.widget';

// ---------------------------------------------------------------------------
// MCP Tools
// ---------------------------------------------------------------------------

describe('HR MCP Tools Metadata Compliance', () => {
  const tools = [
    { name: 'SearchEmployeesTool', tool: SearchEmployeesTool },
    { name: 'GetOrgChartTool', tool: GetOrgChartTool },
    { name: 'CheckPtoBalanceTool', tool: CheckPtoBalanceTool },
    { name: 'SubmitRequestTool', tool: SubmitRequestTool },
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
// Flow
// ---------------------------------------------------------------------------

describe('HR Flow Metadata Compliance', () => {
  const flows = [
    { name: 'OnboardingFlow', flow: OnboardingFlow },
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

describe('HR RLS Policies Metadata Compliance', () => {
  const policies = [
    { name: 'HrEmployeeAccess', policy: HrEmployeeAccess },
    { name: 'HrManagerAccess', policy: HrManagerAccess },
    { name: 'HrAdminAccess', policy: HrAdminAccess },
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

describe('HR Email Templates Metadata Compliance', () => {
  const templates = [
    { name: 'offerLetter', template: offerLetter },
    { name: 'onboardingWelcome', template: onboardingWelcome },
    { name: 'ptoApproved', template: ptoApproved },
    { name: 'performanceReviewReminder', template: performanceReviewReminder },
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
// Widget
// ---------------------------------------------------------------------------

describe('HR Widget Metadata Compliance', () => {
  describe('HeadcountWidget', () => {
    it('should be defined', () => {
      expect(HeadcountWidget).toBeDefined();
    });

    it('should validate against WidgetManifestSchema', () => {
      expect(() => WidgetManifestSchema.parse(HeadcountWidget)).not.toThrow();
    });

    it('should have properties array', () => {
      expect(Array.isArray(HeadcountWidget.properties)).toBe(true);
      expect(HeadcountWidget.properties.length).toBeGreaterThan(0);
    });
  });
});
