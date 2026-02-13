import { describe, it, expect } from 'vitest';
import { MCPToolSchema, MCPResourceSchema } from '@objectstack/spec/ai';
import {
  SearchAccountsTool,
  GetOpportunityTool,
  UpdateDealStageTool,
  CreateActivityTool,
} from '../../../src/crm_mcp_tools.mcp';
import {
  AccountListResource,
  PipelineSummaryResource,
  ForecastDataResource,
  TerritoryMapResource,
} from '../../../src/crm_mcp_resources.mcp';

describe('CRM MCP Tools Metadata Compliance', () => {
  const tools = [
    { name: 'SearchAccountsTool', tool: SearchAccountsTool },
    { name: 'GetOpportunityTool', tool: GetOpportunityTool },
    { name: 'UpdateDealStageTool', tool: UpdateDealStageTool },
    { name: 'CreateActivityTool', tool: CreateActivityTool },
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

describe('CRM MCP Resources Metadata Compliance', () => {
  const resources = [
    { name: 'AccountListResource', resource: AccountListResource },
    { name: 'PipelineSummaryResource', resource: PipelineSummaryResource },
    { name: 'ForecastDataResource', resource: ForecastDataResource },
    { name: 'TerritoryMapResource', resource: TerritoryMapResource },
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
