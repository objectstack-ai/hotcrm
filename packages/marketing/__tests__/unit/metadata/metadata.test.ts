import { describe, it, expect } from 'vitest';
import { MCPToolSchema } from '@objectstack/spec/ai';
import { FlowSchema, ConnectorSchema } from '@objectstack/spec/automation';
import { JobSchema } from '@objectstack/spec/system';
import {
  GetCampaignMetricsTool,
  SearchLeadsTool,
  GetEngagementDataTool,
  CreateCampaignTool,
} from '../../../src/marketing_mcp_tools.mcp';
import { LeadNurtureFlow } from '../../../src/lead_nurture.flow';
import { SocialConnector } from '../../../src/social_connector.connector';
import {
  dailyLeadScoring,
  weeklyCampaignReport,
  hourlyEmailQueue,
} from '../../../src/marketing_jobs.schedule';

// ---------------------------------------------------------------------------
// MCP Tools
// ---------------------------------------------------------------------------

describe('Marketing MCP Tools Metadata Compliance', () => {
  const tools = [
    { name: 'GetCampaignMetricsTool', tool: GetCampaignMetricsTool },
    { name: 'SearchLeadsTool', tool: SearchLeadsTool },
    { name: 'GetEngagementDataTool', tool: GetEngagementDataTool },
    { name: 'CreateCampaignTool', tool: CreateCampaignTool },
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

describe('Marketing Flow Metadata Compliance', () => {
  const flows = [
    { name: 'LeadNurtureFlow', flow: LeadNurtureFlow },
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
// Connector
// ---------------------------------------------------------------------------

describe('Marketing Connector Metadata Compliance', () => {
  describe('SocialConnector', () => {
    it('should be defined', () => {
      expect(SocialConnector).toBeDefined();
    });

    it('should validate against ConnectorSchema', () => {
      expect(() => ConnectorSchema.parse(SocialConnector)).not.toThrow();
    });

    it('should have operations array', () => {
      expect(Array.isArray(SocialConnector.operations)).toBe(true);
      expect(SocialConnector.operations.length).toBeGreaterThan(0);
    });

    it('should have authentication config', () => {
      expect(SocialConnector.authentication).toBeDefined();
      expect(SocialConnector.authentication.type).toBe('oauth2');
    });

    it('should have triggers array', () => {
      expect(Array.isArray(SocialConnector.triggers)).toBe(true);
      expect(SocialConnector.triggers!.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Scheduled Jobs
// ---------------------------------------------------------------------------

describe('Marketing Scheduled Jobs Metadata Compliance', () => {
  const jobs = [
    { name: 'dailyLeadScoring', job: dailyLeadScoring },
    { name: 'weeklyCampaignReport', job: weeklyCampaignReport },
    { name: 'hourlyEmailQueue', job: hourlyEmailQueue },
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
