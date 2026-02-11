import { describe, it, expect } from 'vitest';

import { hotcrmMCPServerConfig } from '../../src/mcp_server.config';
import { MCPServerConfigSchema } from '@objectstack/spec/ai';

describe('hotcrmMCPServerConfig', () => {
  describe('top-level properties', () => {
    it('should have correct name and version', () => {
      expect(hotcrmMCPServerConfig.name).toBe('hotcrm_ai_server');
      expect(hotcrmMCPServerConfig.version).toBe('1.0.0');
    });

    it('should have a label and description', () => {
      expect(hotcrmMCPServerConfig.label).toBe('HotCRM AI Server');
      expect(hotcrmMCPServerConfig.description).toContain('Model Context Protocol');
    });

    it('should have status active', () => {
      expect(hotcrmMCPServerConfig.status).toBe('active');
    });

    it('should have autoStart and restartOnFailure enabled', () => {
      expect(hotcrmMCPServerConfig.autoStart).toBe(true);
      expect(hotcrmMCPServerConfig.restartOnFailure).toBe(true);
    });

    it('should have tags', () => {
      expect(hotcrmMCPServerConfig.tags).toEqual(['hotcrm', 'ai', 'mcp']);
    });
  });

  describe('transport', () => {
    it('should use stdio transport type', () => {
      expect(hotcrmMCPServerConfig.transport.type).toBe('stdio');
    });

    it('should configure node command with correct args', () => {
      expect(hotcrmMCPServerConfig.transport.command).toBe('node');
      expect(hotcrmMCPServerConfig.transport.args).toEqual(['dist/mcp-server.js']);
    });

    it('should have timeout and retry settings', () => {
      expect(hotcrmMCPServerConfig.transport.timeout).toBe(30000);
      expect(hotcrmMCPServerConfig.transport.retryAttempts).toBe(3);
      expect(hotcrmMCPServerConfig.transport.retryDelay).toBe(1000);
    });
  });

  describe('serverInfo', () => {
    it('should have correct server name and version', () => {
      expect(hotcrmMCPServerConfig.serverInfo.name).toBe('hotcrm_ai_server');
      expect(hotcrmMCPServerConfig.serverInfo.version).toBe('1.0.0');
    });

    it('should have vendor and protocol version', () => {
      expect(hotcrmMCPServerConfig.serverInfo.vendor).toBe('HotCRM');
      expect(hotcrmMCPServerConfig.serverInfo.protocolVersion).toBe('2024-11-05');
    });

    it('should have description', () => {
      expect(hotcrmMCPServerConfig.serverInfo.description).toBe('HotCRM unified AI server');
    });
  });

  describe('capabilities', () => {
    const caps = hotcrmMCPServerConfig.serverInfo.capabilities;

    it('should enable tools capability', () => {
      expect(caps.tools).toBe(true);
    });

    it('should enable resources capability', () => {
      expect(caps.resources).toBe(true);
    });

    it('should enable prompts capability', () => {
      expect(caps.prompts).toBe(true);
    });

    it('should enable logging capability', () => {
      expect(caps.logging).toBe(true);
    });

    it('should disable sampling and resourceTemplates', () => {
      expect(caps.sampling).toBe(false);
      expect(caps.resourceTemplates).toBe(false);
    });
  });

  describe('tools', () => {
    const { tools } = hotcrmMCPServerConfig;

    it('should define exactly 8 tools', () => {
      expect(tools).toHaveLength(8);
    });

    const expectedTools = [
      {
        name: 'lead_scoring',
        description: 'Score leads based on engagement signals and demographic fit',
        paramCount: 3,
        requiredParams: ['lead_id'],
      },
      {
        name: 'opportunity_forecast',
        description: 'Forecast opportunity close probability using historical win/loss patterns',
        paramCount: 3,
        requiredParams: ['opportunity_id'],
      },
      {
        name: 'case_classification',
        description: 'AI-classify support cases by category, priority, and sentiment',
        paramCount: 2,
        requiredParams: ['case_id'],
      },
      {
        name: 'knowledge_search',
        description: 'Semantic search across the knowledge base using vector embeddings',
        paramCount: 4,
        requiredParams: ['query'],
      },
      {
        name: 'candidate_screening',
        description: 'AI screening for candidates against job requirements and culture fit',
        paramCount: 3,
        requiredParams: ['candidate_id', 'job_id'],
      },
      {
        name: 'revenue_forecast',
        description: 'Revenue forecasting using pipeline data and historical trends',
        paramCount: 3,
        requiredParams: ['period'],
      },
      {
        name: 'campaign_optimization',
        description: 'Optimize campaign ROI through channel mix and audience targeting recommendations',
        paramCount: 3,
        requiredParams: ['campaign_id'],
      },
      {
        name: 'pricing_recommendation',
        description: 'Generate product pricing recommendations based on market data and margins',
        paramCount: 4,
        requiredParams: ['product_id'],
      },
    ];

    it.each(expectedTools)(
      'should define tool "$name" with correct description and parameters',
      ({ name, description, paramCount, requiredParams }) => {
        const tool = tools.find((t) => t.name === name);
        expect(tool).toBeDefined();
        expect(tool!.description).toBe(description);
        expect(tool!.parameters).toHaveLength(paramCount);

        // Verify required parameters
        const required = tool!.parameters.filter((p) => p.required).map((p) => p.name);
        expect(required).toEqual(expect.arrayContaining(requiredParams));
        expect(required).toHaveLength(requiredParams.length);
      },
    );

    it('should have all tools with sideEffects set to read', () => {
      for (const tool of tools) {
        expect(tool.sideEffects).toBe('read');
      }
    });

    it('should have unique tool names', () => {
      const names = tools.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('resources', () => {
    const { resources } = hotcrmMCPServerConfig;

    it('should define exactly 4 resources', () => {
      expect(resources).toHaveLength(4);
    });

    const expectedResources = [
      { uri: 'hotcrm://crm/account_context', name: 'account_context', resourceType: 'json' },
      { uri: 'hotcrm://crm/pipeline_summary', name: 'pipeline_summary', resourceType: 'json' },
      { uri: 'hotcrm://support/case_metrics', name: 'case_metrics', resourceType: 'json' },
      { uri: 'hotcrm://hr/hr_dashboard', name: 'hr_dashboard', resourceType: 'json' },
    ];

    it.each(expectedResources)(
      'should define resource "$name" with URI "$uri" and type "$resourceType"',
      ({ uri, name, resourceType }) => {
        const resource = resources.find((r) => r.name === name);
        expect(resource).toBeDefined();
        expect(resource!.uri).toBe(uri);
        expect(resource!.resourceType).toBe(resourceType);
        expect(resource!.mimeType).toBe('application/json');
        expect(resource!.cacheable).toBe(true);
      },
    );

    it('should have unique resource URIs', () => {
      const uris = resources.map((r) => r.uri);
      expect(new Set(uris).size).toBe(uris.length);
    });
  });

  describe('prompts', () => {
    const { prompts } = hotcrmMCPServerConfig;

    it('should define exactly 3 prompts', () => {
      expect(prompts).toHaveLength(3);
    });

    const expectedPrompts = [
      {
        name: 'sales_briefing',
        argCount: 4,
        requiredArgs: ['account_id', 'contact_name', 'meeting_date'],
      },
      {
        name: 'case_resolution',
        argCount: 3,
        requiredArgs: ['case_id'],
      },
      {
        name: 'candidate_evaluation',
        argCount: 3,
        requiredArgs: ['candidate_id', 'job_id'],
      },
    ];

    it.each(expectedPrompts)(
      'should define prompt "$name" with correct arguments',
      ({ name, argCount, requiredArgs }) => {
        const prompt = prompts.find((p) => p.name === name);
        expect(prompt).toBeDefined();
        expect(prompt!.arguments).toHaveLength(argCount);

        const required = prompt!.arguments.filter((a) => a.required).map((a) => a.name);
        expect(required).toEqual(expect.arrayContaining(requiredArgs));
        expect(required).toHaveLength(requiredArgs.length);
      },
    );

    it('should have messages with system and user roles for each prompt', () => {
      for (const prompt of prompts) {
        expect(prompt.messages.length).toBeGreaterThanOrEqual(2);
        expect(prompt.messages[0].role).toBe('system');
        expect(prompt.messages[1].role).toBe('user');
      }
    });

    it('should have unique prompt names', () => {
      const names = prompts.map((p) => p.name);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('healthCheck', () => {
    it('should have health check enabled', () => {
      expect(hotcrmMCPServerConfig.healthCheck.enabled).toBe(true);
    });

    it('should have interval and timeout configured', () => {
      expect(hotcrmMCPServerConfig.healthCheck.interval).toBe(30);
      expect(hotcrmMCPServerConfig.healthCheck.timeout).toBe(5);
    });
  });

  describe('schema validation', () => {
    it('should pass MCPServerConfigSchema validation', () => {
      // The config is already parsed through MCPServerConfigSchema.parse() at export,
      // so re-validating confirms it matches the schema.
      const result = MCPServerConfigSchema.safeParse(hotcrmMCPServerConfig);
      expect(result.success).toBe(true);
    });

    it('should produce the same config when re-parsed', () => {
      const reparsed = MCPServerConfigSchema.parse(hotcrmMCPServerConfig);
      expect(reparsed).toEqual(hotcrmMCPServerConfig);
    });
  });
});
